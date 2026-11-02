import { NextRequest, NextResponse } from 'next/server'
import { verifyOTP } from '@/lib/twilio'
import prisma from '@/lib/db'
import jwt from 'jsonwebtoken'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { badRequest, tooManyRequests, serverError } from '@/lib/api-response'
import { redis } from '@/lib/redis'
import { otpMemoryStore } from '@/lib/otp-store'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
    // Rate limit: 15 verification attempts per 10 minutes per IP
    const ip = getClientIp(request)
    const rl = await rateLimit(`otp-verify:${ip}`, { limit: 15, windowSec: 600 })
    if (!rl.success) return tooManyRequests(rl.resetAt)

    try {
        const body = await request.json()
        const { email, phone, code } = body

        if (!code) {
            return badRequest('Verification code is required')
        }

        const cleanCode = String(code).trim()

        // ── EMAIL VERIFICATION ────────────────────────────────────────
        if (email) {
            const cleanEmail = String(email).trim().toLowerCase()

            // 1. Check Redis
            const redisCode = await redis.get(`otp:email:${cleanEmail}`)

            // 2. Check In-Memory fallback
            const memEntry = otpMemoryStore.get(cleanEmail)
            const memValid = memEntry && memEntry.expiresAt > Date.now() && memEntry.code === cleanCode

            // 3. Fallback dev code
            const isMatch = (redisCode && String(redisCode).trim() === cleanCode) || memValid || cleanCode === '123456'

            if (!isMatch) {
                return NextResponse.json(
                    { success: false, error: 'Invalid or expired verification code' },
                    { status: 400 }
                )
            }

            // Invalidate the used OTP
            await redis.del(`otp:email:${cleanEmail}`)
            otpMemoryStore.delete(cleanEmail)

            // Mark as verified for 15 minutes
            await redis.set(`verified:email:${cleanEmail}`, 'true', { ex: 900 })

            // Sign a secure short-lived reset token
            const resetToken = jwt.sign(
                { email: cleanEmail, purpose: 'reset-password' },
                process.env.NEXTAUTH_SECRET || 'dev-secret-123',
                { expiresIn: '15m' }
            )

            return NextResponse.json({
                success: true,
                verified: true,
                resetToken,
                message: 'Identity verified successfully',
            })
        }

        // ── PHONE VERIFICATION ────────────────────────────────────────
        if (phone) {
            const verification = await verifyOTP(phone, cleanCode)
            if (verification.status !== 'approved') {
                return NextResponse.json(
                    { success: false, error: 'Invalid or expired OTP' },
                    { status: 400 }
                )
            }

            const user = await prisma.user.findUnique({ where: { phone } })

            if (!user) {
                return NextResponse.json({
                    success: true,
                    verified: true,
                    isNewUser: true,
                    message: 'Phone verified. Please complete signup.',
                })
            }

            const token = jwt.sign(
                { id: user.id, email: user.email, role: user.role },
                process.env.NEXTAUTH_SECRET || 'dev-secret-123',
                { expiresIn: '30d' }
            )

            const { password: _pw, ...safeUser } = user

            return NextResponse.json({
                success: true,
                verified: true,
                isNewUser: false,
                token,
                user: safeUser,
            })
        }

        return badRequest('Email or phone number is required')
    } catch (error: any) {
        console.error('[OTP_VERIFY EXCEPTION]:', error)
        return serverError(error, 'OTP_VERIFY')
    }
}
