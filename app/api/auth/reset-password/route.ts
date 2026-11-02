import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { badRequest, tooManyRequests, serverError } from '@/lib/api-response'
import { redis } from '@/lib/redis'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
    const ip = getClientIp(request)
    const rl = await rateLimit(`reset-pw:${ip}`, { limit: 10, windowSec: 900 })
    if (!rl.success) return tooManyRequests(rl.resetAt)

    try {
        const body = await request.json()
        const { email, phone, password, verified, resetToken } = body

        if (!password) {
            return badRequest('Password is required')
        }

        if (password.length < 8) {
            return badRequest('Password must be at least 8 characters')
        }

        if (!email && !phone) {
            return badRequest('Email or phone number is required')
        }

        // ── RESET BY EMAIL ────────────────────────────────────────────
        if (email) {
            const cleanEmail = String(email).trim().toLowerCase()

            let isAuthorized = verified === true

            if (resetToken) {
                try {
                    const decoded: any = jwt.verify(resetToken, process.env.NEXTAUTH_SECRET || 'dev-secret-123')
                    if (decoded?.email === cleanEmail && decoded?.purpose === 'reset-password') {
                        isAuthorized = true
                    }
                } catch {
                    isAuthorized = false
                }
            } else {
                const redisVerified = await redis.get(`verified:email:${cleanEmail}`)
                if (redisVerified === 'true') {
                    isAuthorized = true
                }
            }

            if (!isAuthorized) {
                return badRequest('Security verification required before resetting password')
            }

            const hashedPassword = await bcrypt.hash(password, 12)

            const user = await prisma.user.findFirst({
                where: { email: { equals: cleanEmail, mode: 'insensitive' } },
            })

            if (!user) {
                return badRequest('No account found with this email address')
            }

            await prisma.user.update({
                where: { id: user.id },
                data: { password: hashedPassword },
            })

            // Clean up verification state in Redis
            await redis.del(`verified:email:${cleanEmail}`)

            return NextResponse.json({
                success: true,
                message: 'Password reset successfully. You can now log in.',
            })
        }

        // ── RESET BY PHONE ────────────────────────────────────────────
        if (phone) {
            if (verified !== true) {
                return badRequest('OTP verification required before resetting password')
            }

            const hashedPassword = await bcrypt.hash(password, 12)

            await prisma.user.update({
                where: { phone },
                data: { password: hashedPassword },
            })

            return NextResponse.json({
                success: true,
                message: 'Password reset successfully',
            })
        }

        return badRequest('Invalid request')
    } catch (error: any) {
        console.error('[RESET_PASSWORD EXCEPTION]:', error)
        if (error?.code === 'P2025') {
            return badRequest('Account not found')
        }
        return serverError(error, 'RESET_PASSWORD')
    }
}
