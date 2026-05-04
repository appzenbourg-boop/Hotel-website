import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'

export const dynamic = 'force-dynamic'

/**
 * GET /api/receptionist/staff
 * List all staff (Receptionist/Admin only)
 */
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || !['RECEPTIONIST', 'SUPER_ADMIN', 'HOTEL_ADMIN'].includes(session.user.role)) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const propertyId = session.user.propertyId
        if (!propertyId) return NextResponse.json({ success: true, staff: [] })

        const staffList = await prisma.staff.findMany({
            where: {
                propertyId: propertyId
            },
            include: {
                user: {
                    select: {
                        name: true,
                        email: true,
                        phone: true,
                        status: true,
                        role: true
                    }
                }
            },
            orderBy: {
                user: { name: 'asc' }
            }
        })

        return NextResponse.json({
            success: true,
            staff: staffList
        })

    } catch (error: any) {
        console.error('[RECEPTIONIST_STAFF_GET_ERROR]', error)
        return NextResponse.json({ error: 'Failed' }, { status: 500 })
    }
}
