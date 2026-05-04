import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth/middleware'

export const dynamic = 'force-dynamic'

/**
 * GET /api/services/[id]
 */
export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const authResult = await requireAuth(req)
        if (authResult instanceof NextResponse) return authResult

        const service = await prisma.serviceRequest.findUnique({
            where: { id: params.id },
            include: {
                guest: true,
                room: true,
                assignedTo: {
                    include: { user: { select: { name: true } } }
                }
            }
        })

        if (!service) {
            return NextResponse.json({ error: 'Service request not found' }, { status: 404 })
        }

        // Access check: only owner guest or staff/admin
        if (authResult.user.role === 'GUEST') {
            const user = await prisma.user.findUnique({ where: { id: authResult.user.id } })
            const guest = await prisma.guest.findUnique({ where: { phone: user?.phone } })
            if (service.guestId !== guest?.id) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
            }
        }

        return NextResponse.json({ success: true, service })

    } catch (error: any) {
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
    }
}

/**
 * PATCH /api/services/[id]
 * Update status or assignment
 */
export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const authResult = await requireAuth(req, ['SUPER_ADMIN', 'HOTEL_ADMIN', 'STAFF'])
        if (authResult instanceof NextResponse) return authResult

        const body = await req.json()
        const { status, assignedToId, notes } = body

        const updateData: any = {}
        if (status) {
            updateData.status = status
            if (status === 'ACCEPTED') updateData.acceptedAt = new Date()
            if (status === 'IN_PROGRESS') updateData.startedAt = new Date()
            if (status === 'COMPLETED') updateData.completedAt = new Date()
        }
        if (assignedToId) updateData.assignedToId = assignedToId
        if (notes) updateData.notes = notes

        const service = await prisma.serviceRequest.update({
            where: { id: params.id },
            data: updateData,
            include: {
                assignedTo: {
                    include: { user: { select: { name: true } } }
                }
            }
        })

        return NextResponse.json({
            success: true,
            service,
            message: 'Service request updated'
        })

    } catch (error: any) {
        console.error('[SERVICE_PATCH_ERROR]', error)
        return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
    }
}
