import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import bcrypt from 'bcryptjs'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { badRequest, tooManyRequests, serverError } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
    // Rate limit: 5 attempts per 15 minutes per IP
    const ip = getClientIp(request)
    const rl = await rateLimit(`reset-pw:${ip}`, { limit: 5, windowSec: 900 })
    if (!rl.success) return tooManyRequests(rl.resetAt)

    try {
        const { phone, password, verified } = await request.json()

        if (!phone || !password || !verified) {
            return badRequest('phone, password and verified flag are required')
        }

        if (password.length < 8) {
            return badRequest('Password must be at least 8 characters')
        }

        // `verified` should be a boolean true sent only after successful OTP check
        // In a production hardened flow, replace this with a signed short-lived token
        if (verified !== true) {
            return badRequest('OTP verification required before resetting password')
        }

        const hashedPassword = await bcrypt.hash(password, 12)

        const user = await prisma.user.update({
            where: { phone },
            data: { password: hashedPassword },
            select: { id: true, name: true, email: true },
        })

        return NextResponse.json({ success: true, message: 'Password reset successfully' })
    } catch (error: any) {
        if (error?.code === 'P2025') {
            return badRequest('No account found with this phone number')
        }
        return serverError(error, 'RESET_PASSWORD')
    }
}
