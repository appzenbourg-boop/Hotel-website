import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { prisma } from '@/lib/db'
import { redis } from '@/lib/redis'

export const dynamic = 'force-dynamic'

// POST - Create a leave request for a staff member
export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions)
    if (!session || !['SUPER_ADMIN', 'HOTEL_ADMIN', 'MANAGER', 'RECEPTIONIST', 'STAFF'].includes(session.user.role)) {
        return new NextResponse('Unauthorized', { status: 401 })
    }

    try {
        const body = await request.json()
        const { leaveType, startDate, endDate, totalDays, reason } = body

        if (!leaveType || !startDate || !endDate || !reason) {
            return new NextResponse('Missing required fields', { status: 400 })
        }

        // Verify staff exists
        const staff = await prisma.staff.findUnique({
            where: { id: params.id }
        })

        if (!staff) {
            return new NextResponse('Staff not found', { status: 404 })
        }

        const leaveRequest = await prisma.leaveRequest.create({
            data: {
                staffId: params.id,
                leaveType: leaveType,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                totalDays: totalDays || 1,
                reason: reason,
                status: 'PENDING'
            }
        })

        // Invalidate staff detail cache
        await redis.del(`admin:staff:detail:${params.id}`)

        return NextResponse.json(leaveRequest)
    } catch (error) {
        console.error('[LEAVE_CREATE]', error)
        return new NextResponse('Internal Error', { status: 500 })
    }
}

// GET - Get all leave requests for a staff member
export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions)
    if (!session) {
        return new NextResponse('Unauthorized', { status: 401 })
    }

    try {
        const leaveRequests = await prisma.leaveRequest.findMany({
            where: { staffId: params.id },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json(leaveRequests)
    } catch (error) {
        console.error('[LEAVE_GET]', error)
        return new NextResponse('Internal Error', { status: 500 })
    }
}
