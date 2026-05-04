import { NextRequest, NextResponse } from 'next/server'
import { razorpay } from '@/lib/razorpay'
import { requireAuth } from '@/lib/auth/middleware'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
    try {
        const authResult = await requireAuth(req)
        if (authResult instanceof NextResponse) return authResult

        // Permissive check for Payroll operations
        const isAuthorized = ['SUPER_ADMIN', 'HOTEL_ADMIN', 'MANAGER'].includes(authResult.user.role) || authResult.user.department === 'ACCOUNTS'
        if (!isAuthorized) {
            return NextResponse.json({ error: 'Forbidden. Insufficient permissions.' }, { status: 403 })
        }

        const body = await req.json()
        const { payrollId } = body

        if (!payrollId) {
            return NextResponse.json({ error: 'Payroll ID is required' }, { status: 400 })
        }

        const payroll = await prisma.payroll.findUnique({
            where: { id: payrollId },
            include: {
                staff: {
                    include: {
                        user: true
                    }
                }
            }
        })

        if (!payroll) {
            return NextResponse.json({ error: 'Payroll record not found' }, { status: 404 })
        }

        // Razorpay expects amount in paisa (INR * 100)
        // Note: If you are using another currency, adjust accordingly. 
        // Assuming USD for now based on earlier code, but Razorpay is primarily INR.
        // For demonstration, we'll use INR as Razorpay's primary currency.
        const amountInPaisa = Math.round(payroll.netSalary * 100)

        const options = {
            amount: amountInPaisa,
            currency: 'INR',
            receipt: `rcpt_${payroll.id.slice(-10)}`,
            notes: {
                payrollId: payroll.id,
                staffName: payroll.staff.user.name,
                month: payroll.month,
                year: payroll.year.toString()
            }
        }

        const order = await razorpay.orders.create(options)

        return NextResponse.json({
            success: true,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            key: process.env.RAZORPAY_KEY_ID
        })

    } catch (error: any) {
        console.error('[RAZORPAY_ORDER_ERROR]', error)
        return NextResponse.json({ error: error.message || 'Internal Error' }, { status: 500 })
    }
}
