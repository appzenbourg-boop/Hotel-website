import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth/middleware'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/settings/ops
 * Fetch operations settings for a property
 */
export async function GET(req: NextRequest) {
    try {
        const authResult = await requireAuth(req, ['SUPER_ADMIN', 'HOTEL_ADMIN'])
        if (authResult instanceof NextResponse) return authResult

        const { searchParams } = new URL(req.url)
        const propertyId = searchParams.get('propertyId') || authResult.user.propertyId

        if (!propertyId || propertyId === 'ALL') {
            return NextResponse.json({ success: true, opsSettings: {} })
        }

        const property = await prisma.property.findUnique({
            where: { id: propertyId },
            select: { policies: true }
        })

        if (!property) {
            return NextResponse.json({ error: 'Property not found' }, { status: 404 })
        }

        const policies: any = property.policies || {}
        const opsSettings = policies.opsSettings || {
            emailTemplates: {
                welcome: true,
                checkout: true,
                reminder: false
            },
            notifications: {
                smsAlerts: false,
                pushNotifications: true,
                slackLogs: false
            },
            housekeeping: {
                autoSchedule: true,
                dailyChange: false,
                inspectionRequired: true
            }
        }

        return NextResponse.json({ success: true, opsSettings })

    } catch (error: any) {
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
    }
}

/**
 * POST /api/admin/settings/ops
 * Update operations settings
 */
export async function POST(req: NextRequest) {
    try {
        const authResult = await requireAuth(req, ['SUPER_ADMIN', 'HOTEL_ADMIN'])
        if (authResult instanceof NextResponse) return authResult

        const body = await req.json()
        const { propertyId, opsSettings } = body

        if (!propertyId || !opsSettings) {
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
            opsSettings: {
                ...(currentPolicies.opsSettings || {}),
                ...opsSettings
            }
        }

        const updated = await prisma.property.update({
            where: { id: propertyId },
            data: { policies: updatedPolicies }
        })

        return NextResponse.json({ success: true, opsSettings: updatedPolicies.opsSettings })

    } catch (error: any) {
        console.error('[OPS_UPDATE_ERROR]', error)
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
    }
}
