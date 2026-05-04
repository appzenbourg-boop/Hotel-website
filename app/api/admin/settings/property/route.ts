import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth/middleware'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/settings/property
 * Fetch property details (General Info & Branding)
 */
export async function GET(req: NextRequest) {
    try {
        const authResult = await requireAuth(req, ['SUPER_ADMIN', 'HOTEL_ADMIN'])
        if (authResult instanceof NextResponse) return authResult

        const { searchParams } = new URL(req.url)
        const propertyId = searchParams.get('propertyId') || authResult.user.propertyId

        if (!propertyId || propertyId === 'ALL') {
            return NextResponse.json({ success: true, property: null })
        }

        const property = await prisma.property.findUnique({
            where: { id: propertyId }
        })

        if (!property) {
            return NextResponse.json({ error: 'Property not found' }, { status: 404 })
        }

        return NextResponse.json({ success: true, property })

    } catch (error: any) {
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
    }
}

/**
 * POST /api/admin/settings/property
 * Update property details — handles plan, features, and general info
 */
export async function POST(req: NextRequest) {
    try {
        const authResult = await requireAuth(req, ['SUPER_ADMIN', 'HOTEL_ADMIN'])
        if (authResult instanceof NextResponse) return authResult

        const body = await req.json()
        const { propertyId, plan, features, ...rest } = body

        if (!propertyId) {
            return NextResponse.json({ error: 'Property ID is required' }, { status: 400 })
        }

        // Only SUPER_ADMIN can change plan or features
        if ((plan !== undefined || features !== undefined) && authResult.user.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Only Super Admin can change plan or features' }, { status: 403 })
        }

        // HOTEL_ADMIN can only update their own property
        if (authResult.user.role !== 'SUPER_ADMIN' && authResult.user.propertyId !== propertyId) {
            return NextResponse.json({ error: 'Unauthorized to manage this property' }, { status: 403 })
        }

        const updateData: any = { ...rest }
        if (plan !== undefined) updateData.plan = plan
        if (features !== undefined) updateData.features = features

        const updated = await prisma.property.update({
            where: { id: propertyId },
            data: updateData,
        })

        return NextResponse.json({ success: true, data: updated })
    } catch (error: any) {
        console.error('[PROPERTY_UPDATE_ERROR]', error)
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
    }
}
