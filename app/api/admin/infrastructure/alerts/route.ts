import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth/middleware'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/infrastructure/alerts
 * Create a new system alert (e.g. from IoT sensors or simulated diagnostics)
 */
export async function POST(req: NextRequest) {
    try {
        const authResult = await requireAuth(req, ['SUPER_ADMIN', 'HOTEL_ADMIN', 'MANAGER'])
        if (authResult instanceof NextResponse) return authResult

        const session = await getServerSession(authOptions)
        const body = await req.json()
        const { message, description, type, category, propertyId } = body

        if (!message || !type || !category) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Determine propertyId
        const finalPropertyId = propertyId || session?.user?.propertyId
        if (!finalPropertyId && session?.user?.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Property ID required' }, { status: 400 })
        }

        const alert = await (prisma as any).systemAlert.create({
            data: {
                message,
                description,
                type,
                category,
                propertyId: finalPropertyId,
                timestamp: new Date()
            }
        })

        return NextResponse.json({
            success: true,
            alert
        })

    } catch (error: any) {
        console.error('[INFRA_ALERT_POST_ERROR]', error)
        return NextResponse.json({ error: 'Internal Error', details: error.message }, { status: 500 })
    }
}
