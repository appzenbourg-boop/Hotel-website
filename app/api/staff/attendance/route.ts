import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { prisma } from '@/lib/db'
import { redis } from '@/lib/redis'
import { format } from 'date-fns'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
    const session = await getServerSession(authOptions)
    const allowedRoles = ['STAFF', 'MANAGER', 'RECEPTIONIST', 'HOTEL_ADMIN', 'SUPER_ADMIN']
    if (!session || !allowedRoles.includes(session.user.role)) {
        return new NextResponse('Unauthorized', { status: 401 })
    }

    try {
        const staff = await prisma.staff.findUnique({
            where: { userId: session.user.id }
        })

        if (!staff) return new NextResponse('Staff Profile Not Found', { status: 404 })

        const now = new Date()
        const timeStr = format(now, 'hh:mm a')

        // Check for latest attendance
        const existing = await prisma.attendance.findFirst({
            where: {
                staffId: staff.id
            },
            orderBy: { punchIn: 'desc' }
        })

        let message = ''
        let data = null

        if (!existing || existing.punchOut) {
            // Punch In
            data = await prisma.attendance.create({
                data: {
                    staffId: staff.id,
                    date: now,
                    punchIn: now,
                    punchOut: null,
                    status: 'PRESENT',
                    punchInLocation: 'On-Site'
                }
            })
            message = `Attendance Recorded: Punched In at ${timeStr}`
        } else {
            // Punch Out
            const punchOutTime = new Date()
            const punchInTime = new Date(existing.punchIn!)
            const hoursWorked = (punchOutTime.getTime() - punchInTime.getTime()) / (1000 * 60 * 60)

            data = await prisma.attendance.update({
                where: { id: existing!.id },
                data: {
                    punchOut: punchOutTime,
                    punchOutLocation: 'On-Site',
                    hoursWorked: parseFloat(hoursWorked.toFixed(2))
                }
            })
            message = `Shift Completed: Punched Out at ${timeStr}`
        }

        // Invalidate Cache
        await redis.del(`staff_me:${session.user.id}`)
        if (staff.propertyId) {
            await redis.del(`dashboard:${staff.propertyId}`)
        }

        return NextResponse.json({ message, data })

    } catch (error) {
        console.error(error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}

export async function GET(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse('Unauthorized', { status: 401 })

    try {
        const staff = await prisma.staff.findUnique({
            where: { userId: session.user.id }
        })

        if (!staff) return new NextResponse('Staff Profile Not Found', { status: 404 })

        const history = await prisma.attendance.findMany({
            where: { staffId: staff.id },
            orderBy: { date: 'desc' },
            take: 31
        })

        // Map internal status to display status if needed
        const mapped = history.map(h => ({
            id: h.id,
            date: h.date,
            checkIn: h.punchIn,
            checkOut: h.punchOut,
            status: h.status,
            hours: h.punchIn && h.punchOut
                ? `${((new Date(h.punchOut).getTime() - new Date(h.punchIn).getTime()) / (1000 * 60 * 60)).toFixed(1)}h`
                : '-',
            location: h.punchInLocation || 'On-Site'
        }))

        return NextResponse.json(mapped)
    } catch (error) {
        console.error(error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}
