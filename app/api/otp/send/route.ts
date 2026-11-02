import { NextRequest, NextResponse } from 'next/server'
import { sendOTP } from '@/lib/twilio'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { badRequest, tooManyRequests, serverError } from '@/lib/api-response'
import prisma from '@/lib/db'
import { redis } from '@/lib/redis'
import { sendPasswordResetOTP } from '@/lib/email'

export const dynamic = 'force-dynamic'

import { otpMemoryStore } from '@/lib/otp-store'

export async function POST(request: NextRequest) {
    // Rate limit: 10 OTP requests per 10 minutes per IP
    const ip = getClientIp(request)
    const rl = await rateLimit(`otp-send:${ip}`, { limit: 10, windowSec: 600 })
    if (!rl.success) return tooManyRequests(rl.resetAt)

    try {
        const body = await request.json()
        const { email, phone } = body

        if (!email && !phone) {
            return badRequest('Email address or phone number is required')
        }

        // ── EMAIL OTP FLOW (Primary) ──────────────────────────────────
        if (email) {
            const cleanEmail = String(email).trim().toLowerCase()
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            if (!emailRegex.test(cleanEmail)) {
                return badRequest('Please enter a valid email address')
            }

            // Verify user exists in the database
            const user = await prisma.user.findFirst({
                where: { email: { equals: cleanEmail, mode: 'insensitive' } },
                select: { id: true, name: true, email: true },
            })

            if (!user) {
                return NextResponse.json(
                    { success: false, error: 'No account found with this email address' },
                    { status: 404 }
                )
            }

            // Generate secure 6-digit numeric OTP
            const code = Math.floor(100000 + Math.random() * 900000).toString()

            // Save OTP in Redis (10 minutes expiry)
            await redis.set(`otp:email:${cleanEmail}`, code, { ex: 600 })
            // Also save in in-memory store as backup
            otpMemoryStore.set(cleanEmail, { code, expiresAt: Date.now() + 600000 })

            console.log(`[EMAIL OTP GENERATED] For ${cleanEmail}: ${code}`)

            // Attempt delivery via Gmail SMTP / Resend
            let emailSent = false
            try {
                emailSent = await sendPasswordResetOTP({
                    to: cleanEmail,
                    name: user.name,
                    code,
                })
            } catch (err) {
                console.error('[EMAIL OTP SEND ERROR]:', err)
            }

            if (!emailSent) {
                return NextResponse.json({
                    success: false,
                    error: 'Failed to send verification email. Please verify your Gmail SMTP credentials in .env.'
                }, { status: 500 })
            }

            return NextResponse.json({
                success: true,
                message: `Verification code sent to ${cleanEmail}`
            })
        }

        // ── PHONE / SMS OTP FLOW (Fallback) ───────────────────────────
        if (phone) {
            const result = await sendOTP(phone)
            return NextResponse.json({ success: true, message: 'OTP sent successfully', sid: result.sid })
        }

        return badRequest('Invalid request parameters')
    } catch (error: any) {
        console.error('[OTP_SEND EXCEPTION]:', error)
        return NextResponse.json({ success: false, error: 'Failed to send verification code. Please try again.' }, { status: 500 })
    }
}
