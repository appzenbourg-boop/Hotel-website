import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { prisma } from '@/lib/db'
import { unauthorized, ok, serverError } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) return unauthorized()

        const { searchParams } = new URL(request.url)
        const queryPropertyId = searchParams.get('propertyId')

        let propertyId = (queryPropertyId && queryPropertyId !== 'ALL') 
            ? queryPropertyId 
            : (session.user.propertyId || (session.user as any).ownedPropertyIds?.[0])

        if (!propertyId || propertyId === 'ALL') {
            const userProp = await prisma.property.findFirst({
                where: { ownerIds: { has: session.user.id } },
                select: { id: true }
            })
            if (userProp) propertyId = userProp.id
        }

        const whereProperty = propertyId && propertyId !== 'ALL' ? { propertyId } : {}

        // Fetch all rooms for this property
        const rooms = await prisma.room.findMany({
            where: whereProperty,
            orderBy: { roomNumber: 'asc' },
            select: {
                id: true,
                roomNumber: true,
                type: true,
                category: true,
                status: true,
                basePrice: true,
            }
        })

        const roomIds = rooms.map(r => r.id)

        // Fetch active bookings (Checked In or Active Reservation)
        const now = new Date()
        const activeBookings = await prisma.booking.findMany({
            where: {
                roomId: { in: roomIds },
                status: { in: ['CHECKED_IN', 'RESERVED'] },
                checkIn: { lte: now },
                checkOut: { gte: now }
            },
            select: {
                id: true,
                roomId: true,
                status: true,
                checkIn: true,
                checkOut: true,
                numberOfGuests: true,
                source: true,
                guestId: true,
            }
        })

        // Fetch guest details for active bookings
        const guestIds = [...new Set(activeBookings.map(b => b.guestId))]
        const guests = await prisma.guest.findMany({
            where: { id: { in: guestIds } },
            select: { id: true, name: true, phone: true, email: true }
        })
        const guestMap = new Map(guests.map(g => [g.id, g]))

        const activeBookingMap = new Map()
        activeBookings.forEach(b => {
            const guest = guestMap.get(b.guestId)
            activeBookingMap.set(b.roomId, {
                id: b.id,
                status: b.status,
                checkIn: b.checkIn,
                checkOut: b.checkOut,
                numberOfGuests: b.numberOfGuests,
                source: b.source,
                guestName: guest?.name ?? 'Guest',
                guestPhone: guest?.phone ?? '',
                guestEmail: guest?.email ?? ''
            })
        })

        // Map room occupancy status — 4 categories: Occupied, Ready, Service, Out of Order
        let occupiedCount = 0
        let readyCount = 0
        let serviceCount = 0
        let outOfOrderCount = 0

        const occupancyRooms = rooms.map(room => {
            const currentBooking = activeBookingMap.get(room.id)
            const isOccupied = !!currentBooking || room.status === 'OCCUPIED' || room.status === 'BOOKED'
            const isService = room.status === 'CLEANING'
            const isOutOfOrder = room.status === 'MAINTENANCE' || room.status === 'BLOCKED'
            const isReady = !isOccupied && !isService && !isOutOfOrder

            if (isOccupied) occupiedCount++
            else if (isService) serviceCount++
            else if (isOutOfOrder) outOfOrderCount++
            else readyCount++

            return {
                ...room,
                isOccupied,
                isService,
                isOutOfOrder,
                isReady,
                // Legacy compat
                isMaintenance: isService || isOutOfOrder,
                currentBooking: currentBooking ?? null
            }
        })

        const totalRooms = rooms.length
        const occupancyRate = totalRooms > 0 ? Math.round((occupiedCount / totalRooms) * 100) : 0

        return ok({
            summary: {
                totalRooms,
                occupiedCount,
                readyCount,
                serviceCount,
                outOfOrderCount,
                occupancyRate,
                // Legacy compat
                availableCount: readyCount,
                maintenanceCount: serviceCount + outOfOrderCount
            },
            rooms: occupancyRooms
        })
    } catch (error) {
        return serverError(error, 'OCCUPANCY_GET')
    }
}
