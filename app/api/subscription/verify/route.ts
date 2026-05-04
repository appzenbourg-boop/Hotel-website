import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { prisma } from '@/lib/db'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

// Features unlocked per plan tier
const PLAN_FEATURES: Record<string, string[]> = {
    BASE:       ['BASIC_OPS', 'DIGITAL_CHECKIN', 'FRONT_DESK'],
    STARTER:    ['BASIC_OPS', 'DIGITAL_CHECKIN', 'FRONT_DESK', 'STAFF_MANAGEMENT', 'HOUSEKEEPING_DISPATCH', 'MARKETING', 'LOYALTY'],
    STANDARD:   ['BASIC_OPS', 'DIGITAL_CHECKIN', 'FRONT_DESK', 'STAFF_MANAGEMENT', 'HOUSEKEEPING_DISPATCH', 'MARKETING', 'LOYALTY', 'ANALYTICS', 'FB_SPA'],
    ENTERPRISE: ['BASIC_OPS', 'DIGITAL_CHECKIN', 'FRONT_DESK', 'STAFF_MANAGEMENT', 'HOUSEKEEPING_DISPATCH', 'MARKETING', 'LOYALTY', 'ANALYTICS', 'FB_SPA', 'MULTI_PROPERTY', 'WHITE_LABEL'],
    // Legacy
    GOLD:       ['BASIC_OPS', 'DIGITAL_CHECKIN', 'FRONT_DESK'],
    PLATINUM:   ['BASIC_OPS', 'DIGITAL_CHECKIN', 'FRONT_DESK', 'STAFF_MANAGEMENT', 'HOUSEKEEPING_DISPATCH', 'MARKETING', 'LOYALTY'],
    DIAMOND:    ['BASIC_OPS', 'DIGITAL_CHECKIN', 'FRONT_DESK', 'STAFF_MANAGEMENT', 'HOUSEKEEPING_DISPATCH', 'MARKETING', 'LOYALTY', 'ANALYTICS', 'FB_SPA'],
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            plan,
            propertyId,
            userId,
        } = body

        // Verify Razorpay signature
        const secret = process.env.RAZORPAY_KEY_SECRET?.trim()
        if (!secret) {
            return NextResponse.json({ error: 'Razorpay secret not configured' }, { status: 500 })
        }

        const generated_signature = crypto
            .createHmac('sha256', secret)
            .update(razorpay_order_id + '|' + razorpay_payment_id)
            .digest('hex')

        if (generated_signature !== razorpay_signature) {
            return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 })
        }

        // Resolve propertyId — from body (registration flow) or session
        let targetPropertyId = propertyId

        if (!targetPropertyId) {
            const authResult = await requireAuth(req, ['HOTEL_ADMIN', 'SUPER_ADMIN'])
            if (authResult instanceof NextResponse) return authResult
            targetPropertyId = authResult.user.propertyId
        }

        if (!targetPropertyId) {
            return NextResponse.json({ error: 'Property ID required' }, { status: 400 })
        }

        // If registration flow, verify ownership
        if (userId) {
            const property = await prisma.property.findUnique({
                where: { id: targetPropertyId },
                select: { ownerIds: true }
            })
            if (!property?.ownerIds?.includes(userId)) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
            }
        }

        const features = PLAN_FEATURES[plan] ?? PLAN_FEATURES['BASE']

        // Set expiry to 1 year from now
        const expiresAt = new Date()
        expiresAt.setFullYear(expiresAt.getFullYear() + 1)

        await prisma.property.update({
            where: { id: targetPropertyId },
            data: {
                plan: plan as any,
                features,
                planExpiresAt: expiresAt,
            }
        })

        return NextResponse.json({
            success: true,
            message: `Successfully upgraded to ${plan} plan`,
        })

    } catch (error: any) {
        console.error('[SUBSCRIPTION_VERIFY_ERROR]', error)
        return NextResponse.json({ error: error.message || 'Internal Error' }, { status: 500 })
    }
}
