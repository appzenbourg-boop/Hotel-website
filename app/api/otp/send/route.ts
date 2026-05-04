import { NextRequest, NextResponse } from 'next/server'
import { sendOTP } from '@/lib/twilio'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { badRequest, tooManyRequests, serverError } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
    // Rate limit: 5 OTPs per 10 minutes per IP
    const ip = getClientIp(request)
    const rl = await rateLimit(`otp-send:${ip}`, { limit: 5, windowSec: 600 })
    if (!rl.success) return tooManyRequests(rl.resetAt)

    try {
        const { phone } = await request.json()
        if (!phone) return badRequest('Phone number is required')

        const result = await sendOTP(phone)
        return NextResponse.json({ success: true, message: 'OTP sent successfully', sid: result.sid })
    } catch (error: any) {
        return serverError(error, 'OTP_SEND')
    }
}
