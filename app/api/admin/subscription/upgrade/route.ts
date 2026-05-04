import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth/middleware'
import { razorpay } from '@/lib/razorpay'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/subscription/upgrade
 * 1. Action: 'CREATE_ORDER' -> Creates Razorpay Order
 * 2. Action: 'VERIFY_PAYMENT' -> Verifies signature and updates property plan
 */
export async function POST(req: NextRequest) {
    try {
        const authResult = await requireAuth(req, ['SUPER_ADMIN', 'HOTEL_ADMIN', 'MANAGER'])
        if (authResult instanceof NextResponse) return authResult

        const body = await req.json()
        const { action, planId, propertyId, razorpayData } = body

        if (!propertyId) return NextResponse.json({ error: 'Property ID required' }, { status: 400 })

        // 1. Create Order
        if (action === 'CREATE_ORDER') {
            const plan = await (prisma as any).planDefinition.findUnique({
                where: { plan: planId }
            })

            if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

            const options = {
                amount: Math.round((plan.discountedPrice ?? plan.price ?? 0) * 100), // paisa
                currency: 'INR',
                receipt: `sub_${Date.now()}`,
                notes: {
                    propertyId,
                    planId,
                    type: 'SUBSCRIPTION_UPGRADE',
                    userId: authResult.user.id
                }
            }

            const order = await razorpay.orders.create(options)
            
            return NextResponse.json({
                success: true,
                orderId: order.id,
                amount: order.amount,
                currency: order.currency,
                key: process.env.RAZORPAY_KEY_ID?.trim()
            })
        }

        // 2. Verify and Upgrade
        if (action === 'VERIFY_PAYMENT') {
            const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = razorpayData

            const secret = process.env.RAZORPAY_KEY_SECRET?.trim()
            if (!secret) return NextResponse.json({ error: 'Razorpay secret missing' }, { status: 500 })

            const generated_signature = crypto
                .createHmac('sha256', secret)
                .update(razorpay_order_id + "|" + razorpay_payment_id)
                .digest('hex')

            if (generated_signature !== razorpay_signature) {
                return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
            }

            // Get plan data again to be sure
            const plan = await (prisma as any).planDefinition.findUnique({
                where: { plan: planId }
            })

            if (!plan) return NextResponse.json({ error: 'Plan lost in space' }, { status: 404 })

            // UPGRADE THE PROPERTY
            const updatedProperty = await prisma.property.update({
                where: { id: propertyId },
                data: {
                    plan: plan.plan,
                    features: plan.features,
                    // Optionally set an expiry date (e.g., 1 year from now)
                    planExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                }
            })

            return NextResponse.json({ 
                success: true, 
                property: updatedProperty,
                message: `Upgrade to ${plan.plan} protocol complete.` 
            })
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

    } catch (error: any) {
        console.error('[SUBSCRIPTION_UPGRADE_ERROR]', error)
        return NextResponse.json({ error: 'Internal server error during provisioning' }, { status: 500 })
    }
}
