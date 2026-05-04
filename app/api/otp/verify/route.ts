import { NextRequest, NextResponse } from 'next/server'
import { verifyOTP } from '@/lib/twilio'
import prisma from '@/lib/db'
import jwt from 'jsonwebtoken'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { badRequest, tooManyRequests, serverError } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
    // Rate limit: 10 attempts per 10 minutes per IP
    const ip = getClientIp(request)
    const rl = await rateLimit(`otp-verify:${ip}`, { limit: 10, windowSec: 600 })
    if (!rl.success) return tooManyRequests(rl.resetAt)

    try {
        const { phone, code } = await request.json()
        if (!phone || !code) return badRequest('Phone and OTP code are required')

        const verification = await verifyOTP(phone, code)
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
            process.env.NEXTAUTH_SECRET!,
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
    } catch (error: any) {
        return serverError(error, 'OTP_VERIFY')
    }
}
