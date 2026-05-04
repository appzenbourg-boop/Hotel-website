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
        const { plan, propertyId, userId } = body

        if (!plan) {
            return NextResponse.json({ error: 'Plan is required' }, { status: 400 })
        }

        const price = PLAN_PRICES[plan]
        if (price === undefined) {
            return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 })
        }

        // ENTERPRISE is free / custom — no payment needed
        if (price === 0) {
            return NextResponse.json({ error: 'Enterprise plan requires manual setup. Contact us.' }, { status: 400 })
        }

        // Auth: either a valid session OR a just-registered userId+propertyId pair
        let targetPropertyId = propertyId

        if (!targetPropertyId) {
            // Try session-based auth
            const authResult = await requireAuth(req, ['HOTEL_ADMIN', 'SUPER_ADMIN'])
            if (authResult instanceof NextResponse) return authResult
            targetPropertyId = authResult.user.propertyId
        }

        if (!targetPropertyId) {
            return NextResponse.json({ error: 'Property ID required' }, { status: 400 })
        }

        // If userId provided (registration flow), verify the user owns this property
        if (userId) {
            const property = await prisma.property.findUnique({
                where: { id: targetPropertyId },
                select: { ownerIds: true }
            })
            if (!property?.ownerIds?.includes(userId)) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
            }
        } else {
            // Session flow — verify property exists
            const property = await prisma.property.findUnique({ where: { id: targetPropertyId } })
            if (!property) {
                return NextResponse.json({ error: 'Property not found' }, { status: 404 })
            }
        }

        const order = await razorpay.orders.create({
            amount: price * 100, // paise
            currency: 'INR',
            receipt: `sub_${targetPropertyId.slice(-10)}_${Date.now()}`,
            notes: { propertyId: targetPropertyId, plan, type: 'SUBSCRIPTION_UPGRADE' }
        })

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
