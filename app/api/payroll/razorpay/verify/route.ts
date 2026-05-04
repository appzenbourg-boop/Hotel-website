import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { prisma } from '@/lib/db'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
    try {
        const authResult = await requireAuth(req)
        if (authResult instanceof NextResponse) return authResult

        const isAuthorized = ['SUPER_ADMIN', 'HOTEL_ADMIN', 'MANAGER'].includes(authResult.user.role) || authResult.user.department === 'ACCOUNTS'
        if (!isAuthorized) {
            return NextResponse.json({ error: 'Forbidden. Insufficient permissions.' }, { status: 403 })
        }

        const body = await req.json()
        const { 
            razorpay_order_id, 
            razorpay_payment_id, 
            razorpay_signature,
            payrollId
        } = body

        // 1. Verify Signature
        const secret = process.env.RAZORPAY_KEY_SECRET?.trim()
        if (!secret) {
            return NextResponse.json({ error: 'Razorpay secret not configured' }, { status: 500 })
        }

        const generated_signature = crypto
            .createHmac('sha256', secret)
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest('hex')

        if (generated_signature !== razorpay_signature) {
            return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 })
        }

        // 2. Update Payroll Record
        await prisma.payroll.update({
            where: { id: payrollId },
            data: {
                status: 'PAID',
                paidAt: new Date(),
                paymentId: razorpay_payment_id
            } as any
        })

        return NextResponse.json({ 
            success: true, 
            message: 'Salary payment verified and recorded' 
        })

    } catch (error: any) {
        console.error('[PAYROLL_VERIFY_ERROR]', error)
        return NextResponse.json({ error: error.message || 'Internal Error' }, { status: 500 })
    }
}
