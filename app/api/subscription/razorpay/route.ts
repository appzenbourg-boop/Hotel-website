import { NextRequest, NextResponse } from 'next/server'
import { razorpay } from '@/lib/razorpay'
import { requireAuth } from '@/lib/auth/middleware'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Updated plan prices matching the new tier system
const PLAN_PRICES: Record<string, number> = {
    'BASE':       9999,
    'STARTER':    15999,
    'STANDARD':   29999,
    'ENTERPRISE': 0,
    // Legacy names kept for backward compat
    'GOLD':       9999,
    'PLATINUM':   15999,
    'DIAMOND':    29999,
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { plan, propertyId, userId, trialPeriod } = body

        if (!plan) {
            return NextResponse.json({ error: 'Plan is required' }, { status: 400 })
        }

        // 1. Authorization: resolve propertyId first (either from body or active session)
        let targetPropertyId = propertyId

        if (!targetPropertyId) {
            const authResult = await requireAuth(req, ['HOTEL_ADMIN', 'SUPER_ADMIN'])
            if (authResult instanceof NextResponse) return authResult
            targetPropertyId = authResult.user.propertyId
        }

        if (!targetPropertyId) {
            return NextResponse.json({ error: 'Property ID required' }, { status: 400 })
        }

        // 2. Authenticate ownership / existence
        if (userId) {
            const property = await prisma.property.findUnique({
                where: { id: targetPropertyId },
                select: { ownerIds: true }
            })
            if (!property?.ownerIds?.includes(userId)) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
            }
        } else {
            const property = await prisma.property.findUnique({ where: { id: targetPropertyId } })
            if (!property) {
                return NextResponse.json({ error: 'Property not found' }, { status: 404 })
            }
        }

        // 3. Dynamically calculate pricing
        let activePrice = 0

        if (trialPeriod) {
            activePrice = 2 // Standard verification fee for UPI Autopay Mandates
        } else if (plan === 'ENTERPRISE') {
            // Custom Enterprise pricing desk resolution
            const prop = await prisma.property.findUnique({
                where: { id: targetPropertyId },
                select: { customQuoteAmount: true, customQuoteStatus: true }
            })
            
            if (!prop?.customQuoteAmount) {
                return NextResponse.json({ 
                    error: 'No active custom pricing amount found. Your workspace requires manual pricing approval from the Super Admin.' 
                }, { status: 400 })
            }
            if (prop.customQuoteStatus !== 'APPROVED') {
                return NextResponse.json({ 
                    error: 'Your bespoke enterprise quotation is still awaiting Super Admin authorization.' 
                }, { status: 400 })
            }
            activePrice = prop.customQuoteAmount
        } else {
            // Standard plan resolution
            const standardPrice = PLAN_PRICES[plan]
            if (standardPrice === undefined) {
                return NextResponse.json({ error: 'Invalid subscription plan selected' }, { status: 400 })
            }
            if (standardPrice === 0) {
                return NextResponse.json({ error: 'Standard plan cannot be initialized with zero fee.' }, { status: 400 })
            }
            activePrice = standardPrice
        }

        const orderPayload: any = {
            amount: trialPeriod ? 0 : Math.round(activePrice * 100), // paise
            currency: 'INR',
            receipt: `sub_${targetPropertyId.slice(-10)}_${Date.now()}`,
            notes: { propertyId: targetPropertyId, plan, type: 'SUBSCRIPTION_UPGRADE' }
        }

        if (trialPeriod) {
            orderPayload.amount = 200; // UPI Autopay requires a nominal charge (>= INR 1) for mandate registration
            orderPayload.method = 'upi'; // Use 'upi' method to trigger UPI Autopay flow
            orderPayload.payment_capture = 1;
            // Need a Razorpay Customer for mandates
            let resolvedUserId = userId
            if (!resolvedUserId) {
                const authResult = await requireAuth(req, ['HOTEL_ADMIN', 'SUPER_ADMIN'])
                if (!(authResult instanceof NextResponse)) {
                    resolvedUserId = authResult.user.id
                }
            }

            if (resolvedUserId) {
                const user = await prisma.user.findUnique({ where: { id: resolvedUserId } })
                if (user) {
                    const customer = await razorpay.customers.create({
                        name: user.name,
                        email: user.email,
                        contact: user.phone
                    })
                    
                    orderPayload.method = 'upi'; // MUST be 'upi' for UPI Autopay
                    orderPayload.customer_id = customer.id
                    orderPayload.token = {
                        max_amount: 5000000, // 50,000 INR max auto-debit capability
                        expire_at: Math.floor(Date.now() / 1000) + (10 * 365 * 24 * 60 * 60), // 10 years
                        frequency: 'as_presented'
                    }
                } else {
                    throw new Error('User not found in DB - cannot create mandate token')
                }
            } else {
                throw new Error('resolvedUserId is missing - cannot create mandate token')
            }
        }

        console.log('[RAZORPAY_ORDER_PAYLOAD]', JSON.stringify(orderPayload, null, 2))
        const order = await razorpay.orders.create(orderPayload)

        return NextResponse.json({
            success: true,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            key: process.env.RAZORPAY_KEY_ID?.trim()
        })

    } catch (error: any) {
        console.error('[SUBSCRIPTION_ORDER_ERROR]', error)
        return NextResponse.json({ error: error.message || 'Internal Error' }, { status: 500 })
    }
}
