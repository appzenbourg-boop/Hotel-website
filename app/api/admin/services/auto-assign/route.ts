import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth/middleware'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { performAutoAssignment } from '@/lib/service-utils'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/services/auto-assign
 * Automatically assign unassigned service requests to staff based on domain/department
 */
export async function POST(req: NextRequest) {
    try {
        const authResult = await requireAuth(req, ['SUPER_ADMIN', 'HOTEL_ADMIN', 'MANAGER'])
        if (authResult instanceof NextResponse) return authResult

        const session = await getServerSession(authOptions)
        const { searchParams } = new URL(req.url)
        const queryPropertyId = searchParams.get('propertyId')

        const propertyId = session?.user?.propertyId || queryPropertyId
        if (!propertyId || propertyId === 'ALL') {
            return NextResponse.json({ error: 'Please select a specific property for auto-assignment' }, { status: 400 })
        }

        const result = await performAutoAssignment(propertyId)

        if (result.totalProcessed === 0) {
            return NextResponse.json({ message: 'No unassigned requests found' })
        }

        return NextResponse.json({
            message: `Successfully auto-assigned ${result.assignedCount} requests`,
            summary: {
                total: result.totalProcessed,
                assigned: result.assignedCount,
                unassigned: result.totalProcessed - result.assignedCount
            },
            assignments: result.assignments
        })

    } catch (error: any) {
        console.error('[SERVICE_AUTO_ASSIGN_ERROR]', error)
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
    }
}
