import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth/middleware'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/settings/retention
 * Fetch data retention settings for a property
 */
export async function GET(req: NextRequest) {
    try {
        const authResult = await requireAuth(req, ['SUPER_ADMIN', 'HOTEL_ADMIN'])
        if (authResult instanceof NextResponse) return authResult

        const { searchParams } = new URL(req.url)
        const propertyId = searchParams.get('propertyId') || authResult.user.propertyId

        if (!propertyId || propertyId === 'ALL') {
            return NextResponse.json({ success: true, retentionSettings: {} })
        }

        const property = await prisma.property.findUnique({
            where: { id: propertyId },
            select: { policies: true }
        })

        if (!property) {
            return NextResponse.json({ error: 'Property not found' }, { status: 404 })
        }

        const policies: any = property.policies || {}
        const retentionSettings = policies.retentionSettings || {
            legalHoldMode: false,
            guestProfiles: '3_YEARS',
            scans: '30_DAYS',
            financials: '7_YEARS',
            serviceLogs: '1_YEAR'
        }

        return NextResponse.json({ success: true, retentionSettings })

    } catch (error: any) {
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
    }
}

/**
 * POST /api/admin/settings/retention
 * Update retention settings
 */
export async function POST(req: NextRequest) {
    try {
        const authResult = await requireAuth(req, ['SUPER_ADMIN', 'HOTEL_ADMIN'])
        if (authResult instanceof NextResponse) return authResult

        const body = await req.json()
        const { propertyId, retentionSettings } = body

        if (!propertyId || !retentionSettings) {
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
            retentionSettings: {
                ...(currentPolicies.retentionSettings || {}),
                ...retentionSettings
            }
        }

        const updated = await prisma.property.update({
            where: { id: propertyId },
            data: { policies: updatedPolicies }
        })

        return NextResponse.json({ success: true, retentionSettings: updatedPolicies.retentionSettings })

    } catch (error: any) {
        console.error('[RETENTION_UPDATE_ERROR]', error)
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
    }
}
