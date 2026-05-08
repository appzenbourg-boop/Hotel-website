import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth/middleware'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/subscription/cancel
 * Cancels UPI Autopay and Free Trial immediately, downgrading to BASE plan.
 */
export async function POST(req: NextRequest) {
    try {
        const authResult = await requireAuth(req, ['SUPER_ADMIN', 'HOTEL_ADMIN'])
        if (authResult instanceof NextResponse) return authResult

        const body = await req.json()
        const { propertyId } = body

        if (!propertyId) {
            return NextResponse.json({ error: 'Property ID is required' }, { status: 400 })
        }

        // Verify authorization
        if (authResult.user.role !== 'SUPER_ADMIN' && authResult.user.propertyId !== propertyId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        // Downgrade property to BASE plan and disable trial/autopay
        await prisma.property.update({
            where: { id: propertyId },
            data: {
                plan: 'BASE',
                planExpiresAt: null,
                isTrialActive: false,
                isAutopayActive: false,
            } as any
        })

        // Terminate autopay by removing UPI ID from settings
        await prisma.propertySettings.updateMany({
            where: { propertyId },
            data: {
                upiId: null
            }
        })

        return NextResponse.json({
            success: true,
            message: 'Autopay and Trial cancelled successfully. Downgraded to Base plan.'
        })

    } catch (error: any) {
        console.error('[CANCEL_AUTOPAY_ERROR]', error)
        return NextResponse.json({ error: error.message || 'Internal Error' }, { status: 500 })
    }
}
