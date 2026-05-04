import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth/middleware'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/settings/payments
 * Fetch payment settings for a property
 */
export async function GET(req: NextRequest) {
    try {
        const authResult = await requireAuth(req, ['SUPER_ADMIN', 'HOTEL_ADMIN'])
        if (authResult instanceof NextResponse) return authResult

        const { searchParams } = new URL(req.url)
        const propertyId = searchParams.get('propertyId') || authResult.user.propertyId

        if (!propertyId || propertyId === 'ALL') {
            return NextResponse.json({ success: true, paymentSettings: {} })
        }

        const property = await prisma.property.findUnique({
            where: { id: propertyId },
            select: { policies: true }
        })

        if (!property) {
            return NextResponse.json({ error: 'Property not found' }, { status: 404 })
        }

        const policies: any = property.policies || {}
        const paymentSettings = policies.paymentSettings || {
            baseCurrency: 'USD',
            taxRate: 10.0,
            allowPartial: true,
            invoiceAutoGenerate: false,
            gateways: [
                { id: 'stripe', status: 'NOT_CONNECTED' },
                { id: 'paypal', status: 'NOT_CONNECTED' }
            ]
        }

        return NextResponse.json({ success: true, paymentSettings })

    } catch (error: any) {
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
    }
}

/**
 * POST /api/admin/settings/payments
 * Update payment settings
 */
export async function POST(req: NextRequest) {
    try {
        const authResult = await requireAuth(req, ['SUPER_ADMIN', 'HOTEL_ADMIN'])
        if (authResult instanceof NextResponse) return authResult

        const body = await req.json()
        const { propertyId, paymentSettings } = body

        if (!propertyId || !paymentSettings) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Verify propertyId is authorized for the user
        if (authResult.user.role !== 'SUPER_ADMIN' && authResult.user.propertyId !== propertyId) {
            return NextResponse.json({ error: 'Unauthorized to manage this property' }, { status: 403 })
        }

        const property = await prisma.property.findUnique({
            where: { id: propertyId },
            select: { policies: true }
        })

        const currentPolicies: any = property?.policies || {}
        const updatedPolicies = {
            ...currentPolicies,
            paymentSettings: {
                ...(currentPolicies.paymentSettings || {}),
                ...paymentSettings
            }
        }

        const updated = await prisma.property.update({
            where: { id: propertyId },
            data: { policies: updatedPolicies }
        })

        return NextResponse.json({ success: true, paymentSettings: updatedPolicies.paymentSettings })

    } catch (error: any) {
        console.error('[PAYMENT_UPDATE_ERROR]', error)
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
    }
}
