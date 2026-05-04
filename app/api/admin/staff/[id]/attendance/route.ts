import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { prisma } from '@/lib/db'
import { redis } from '@/lib/redis'
import { unauthorized, forbidden, badRequest, serverError } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

const ALLOWED_ROLES = ['SUPER_ADMIN', 'HOTEL_ADMIN', 'MANAGER', 'RECEPTIONIST']

/**
 * PATCH /api/admin/staff/[id]/attendance
 * Edit an attendance record — correct punch in/out times, status, notes.
 * Used by front desk / managers when staff forget to punch out.
 */
export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions)
    if (!session) return unauthorized()
    if (!ALLOWED_ROLES.includes(session.user.role)) return forbidden()

    try {
        const body = await req.json()
        const { attendanceId, punchIn, punchOut, hoursWorked, status, notes } = body

        if (!attendanceId) return badRequest('attendanceId is required')

        // Verify the attendance record belongs to this staff member
        const existing = await prisma.attendance.findFirst({
            where: { id: attendanceId, staffId: params.id },
        })
        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Attendance record not found for this staff member' },
                { status: 404 }
            )
        }

        const updateData: any = {}
        if (punchIn !== undefined)     updateData.punchIn     = punchIn ? new Date(punchIn) : null
        if (punchOut !== undefined)    updateData.punchOut    = punchOut ? new Date(punchOut) : null
        if (hoursWorked !== undefined) updateData.hoursWorked = hoursWorked
        if (status !== undefined)      updateData.status      = status
        if (notes !== undefined)       updateData.notes       = notes

        const updated = await prisma.attendance.update({
            where: { id: attendanceId },
            data: updateData,
        })

        // Invalidate staff detail cache
        await redis.del(`admin:staff:detail:${params.id}`)

        return NextResponse.json({ success: true, data: updated })
    } catch (error) {
        return serverError(error, 'ATTENDANCE_PATCH')
    }
}
