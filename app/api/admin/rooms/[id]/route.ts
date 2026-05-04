import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { prisma } from '@/lib/db'
import { unauthorized, forbidden, badRequest, notFound, noContent, serverError } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

export async function GET(
    _request: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions)
    if (!session) return unauthorized()

    try {
        const room = await prisma.room.findUnique({
            where: { id: params.id },
            include: {
                bookings: {
                    where: { status: { in: ['RESERVED', 'CHECKED_IN'] } },
                    include: { guest: { select: { name: true, phone: true } } },
                    orderBy: { checkIn: 'asc' },
                    take: 10,
                },
            },
        })

        if (!room) return notFound('Room')
        return NextResponse.json({ success: true, data: room })
    } catch (error) {
        return serverError(error, 'ROOM_GET')
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions)
    if (!session) return unauthorized()
    if (!['SUPER_ADMIN', 'HOTEL_ADMIN', 'MANAGER', 'RECEPTIONIST', 'STAFF'].includes(session.user.role)) {
        return forbidden()
    }

    try {
        const body = await request.json()

        // Staff can only update status (housekeeping)
        const isStaff = session.user.role === 'STAFF' || session.user.role === 'RECEPTIONIST'
        const updateData: any = {}

        if (body.status !== undefined) updateData.status = body.status

        if (!isStaff) {
            if (body.basePrice !== undefined) updateData.basePrice = parseFloat(String(body.basePrice))
            if (body.type !== undefined) updateData.type = body.type
            if (body.category !== undefined) updateData.category = body.category
            if (body.images !== undefined) updateData.images = body.images
            if (body.maxOccupancy !== undefined) updateData.maxOccupancy = parseInt(String(body.maxOccupancy))
            if (body.floor !== undefined) updateData.floor = parseInt(String(body.floor))
            if (body.roomNumber !== undefined) updateData.roomNumber = body.roomNumber
            if (body.description !== undefined) updateData.description = body.description
            if (body.amenities !== undefined) updateData.amenities = body.amenities
            if (body.weekendSurcharge !== undefined) updateData.weekendSurcharge = parseFloat(String(body.weekendSurcharge))
            if (body.visibleOnline !== undefined) updateData.visibleOnline = body.visibleOnline
            if (body.petFriendly !== undefined) updateData.petFriendly = body.petFriendly
            if (body.smokingAllowed !== undefined) updateData.smokingAllowed = body.smokingAllowed
            if (body.adaCompliant !== undefined) updateData.adaCompliant = body.adaCompliant
        }

        if (Object.keys(updateData).length === 0) return badRequest('No valid fields to update')

        const room = await prisma.room.update({
            where: { id: params.id },
            data: updateData,
        })

        return NextResponse.json({ success: true, data: room })
    } catch (error: any) {
        if (error?.code === 'P2025') return notFound('Room')
        return serverError(error, 'ROOM_PATCH')
    }
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions)
    if (!session) return unauthorized()
    if (!['SUPER_ADMIN', 'HOTEL_ADMIN'].includes(session.user.role)) return forbidden()

    try {
        const activeBookings = await prisma.booking.count({
            where: { roomId: params.id, status: { in: ['RESERVED', 'CHECKED_IN'] } },
        })

        if (activeBookings > 0) {
            return badRequest('Cannot delete room with active bookings')
        }

        await prisma.room.delete({ where: { id: params.id } })
        return noContent()
    } catch (error: any) {
        if (error?.code === 'P2025') return notFound('Room')
        return serverError(error, 'ROOM_DELETE')
    }
}
