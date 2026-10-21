import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { prisma } from '@/lib/db'
import { unauthorized, ok, serverError } from '@/lib/api-response'
import { autoHealCleaningRooms, invalidateRoomAndDashboardCaches } from '@/lib/room-status'

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

        // Auto-heal any rooms stuck in CLEANING where housekeeping is completed or absent
        const healedIds = await autoHealCleaningRooms(whereProperty)
        if (healedIds.length > 0) {
            const healedSet = new Set(healedIds)
            rooms.forEach(r => {
                if (healedSet.has(r.id)) r.status = 'AVAILABLE'
            })
        }

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

export async function PATCH(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) return unauthorized()

        const body = await request.json()
        const { roomId, status, bookingId, checkOutEarly } = body

        if (!roomId) {
            return NextResponse.json({ error: 'Room ID is required' }, { status: 400 })
        }

        // If checkout requested for active booking
        if (checkOutEarly && bookingId) {
            await prisma.booking.update({
                where: { id: bookingId },
                data: {
                    status: 'CHECKED_OUT',
                    actualCheckOut: new Date()
                }
            })
        }

        // Status options: 'AVAILABLE', 'CLEANING', 'MAINTENANCE', 'BLOCKED', 'OCCUPIED'
        if (status) {
            const updatedRoom = await prisma.room.update({
                where: { id: roomId },
                data: { status }
            })

            // If room is marked AVAILABLE/Ready, complete any pending/in-progress housekeeping tasks
            if (status === 'AVAILABLE') {
                await prisma.serviceRequest.updateMany({
                    where: {
                        roomId,
                        type: { in: ['HOUSEKEEPING', 'MAINTENANCE'] },
                        status: { in: ['PENDING', 'IN_PROGRESS', 'ACCEPTED'] }
                    },
                    data: {
                        status: 'COMPLETED',
                        completedAt: new Date()
                    }
                })
            }

            await invalidateRoomAndDashboardCaches(updatedRoom.propertyId)
        }

        return ok({ success: true, message: 'Room updated successfully' })
    } catch (error) {
        return serverError(error, 'OCCUPANCY_PATCH')
    }
}

