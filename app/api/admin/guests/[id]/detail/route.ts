import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET: full guest detail — profile + bookings + service requests
export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse('Unauthorized', { status: 401 })

    try {
        const guest = await prisma.guest.findUnique({
            where: { id: params.id },
        })

        if (!guest) return new NextResponse('Guest not found', { status: 404 })

        // Bookings with room info
        const bookings = await prisma.booking.findMany({
            where: { guestId: params.id },
            include: {
                room: { select: { roomNumber: true, type: true } },
            },
            orderBy: { checkIn: 'desc' },
        })

        // Service requests for this guest
        const services = await prisma.serviceRequest.findMany({
            where: { guestId: params.id },
            include: {
                room: { select: { roomNumber: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
        })

        return NextResponse.json({
            guest,
            bookings: bookings.map(b => ({
                id: b.id,
                roomNumber: b.room?.roomNumber,
                roomType: b.room?.type,
                checkIn: b.checkIn,
                checkOut: b.checkOut,
                status: b.status,
                source: b.source,
                totalAmount: b.totalAmount,
                paidAmount: b.paidAmount,
                paymentStatus: b.paymentStatus,
            })),
            services: services.map(s => ({
                id: s.id,
                type: s.type,
                title: s.title,
                description: s.description,
                status: s.status,
                priority: s.priority,
                createdAt: s.createdAt,
                roomNumber: s.room?.roomNumber,
            })),
            notes: [], // In a real system, you'd have a Notes model
        })
    } catch (error) {
        console.error('[GUEST_DETAIL]', error)
        return new NextResponse('Internal Error', { status: 500 })
    }
}
