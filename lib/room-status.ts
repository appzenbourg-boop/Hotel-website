import { prisma } from '@/lib/db'
import { redis } from '@/lib/redis'

/**
 * Invalidates all Redis caches associated with room occupancy, room listings, and dashboards
 */
export async function invalidateRoomAndDashboardCaches(propertyId?: string | null) {
    try {
        const patterns = [
            'admin:dashboard:*',
            'rooms:*',
            'dashboard:*'
        ]
        if (propertyId) {
            patterns.push(`rooms:${propertyId}:*`)
            patterns.push(`admin:dashboard:${propertyId}:*`)
            patterns.push(`dashboard:${propertyId}`)
        }

        const keysToDelete = new Set<string>()
        for (const pattern of patterns) {
            try {
                const keys = await redis.keys(pattern)
                if (Array.isArray(keys)) {
                    keys.forEach((k: string) => keysToDelete.add(k))
                }
            } catch (err) {
                console.error(`[Redis keys error] ${pattern}:`, err)
            }
        }

        if (keysToDelete.size > 0) {
            await redis.del(...Array.from(keysToDelete))
        }
    } catch (err) {
        console.error('[CACHE_INVALIDATION_ERROR]', err)
    }
}

/**
 * Synchronizes and updates a room's status based on real-time booking and task states.
 * - If room has an active CHECKED_IN booking -> OCCUPIED
 * - Else if room has active (PENDING/IN_PROGRESS/ACCEPTED) HOUSEKEEPING tasks -> CLEANING
 * - Else if room has active (PENDING/IN_PROGRESS/ACCEPTED) MAINTENANCE tasks -> MAINTENANCE
 * - Else if room was CLEANING or has no active blockers -> AVAILABLE
 */
export async function reconcileRoomStatus(roomId: string): Promise<string> {
    if (!roomId) return 'UNKNOWN'

    try {
        const room = await prisma.room.findUnique({
            where: { id: roomId },
            select: { id: true, propertyId: true, status: true }
        })
        if (!room) return 'UNKNOWN'

        // 1. Check for active checked-in booking
        const activeBooking = await prisma.booking.findFirst({
            where: { roomId, status: 'CHECKED_IN' },
            select: { id: true }
        })
        if (activeBooking) {
            if (room.status !== 'OCCUPIED') {
                await prisma.room.update({
                    where: { id: roomId },
                    data: { status: 'OCCUPIED' }
                })
                await invalidateRoomAndDashboardCaches(room.propertyId)
            }
            return 'OCCUPIED'
        }

        // 2. Check for active housekeeping tasks
        const activeHousekeeping = await prisma.serviceRequest.findFirst({
            where: {
                roomId,
                type: 'HOUSEKEEPING',
                status: { in: ['PENDING', 'IN_PROGRESS', 'ACCEPTED'] }
            },
            select: { id: true }
        })

        if (activeHousekeeping) {
            if (room.status !== 'CLEANING') {
                await prisma.room.update({
                    where: { id: roomId },
                    data: { status: 'CLEANING' }
                })
                await invalidateRoomAndDashboardCaches(room.propertyId)
            }
            return 'CLEANING'
        }

        // 3. Check for active maintenance tasks
        const activeMaintenance = await prisma.serviceRequest.findFirst({
            where: {
                roomId,
                type: 'MAINTENANCE',
                status: { in: ['PENDING', 'IN_PROGRESS', 'ACCEPTED'] }
            },
            select: { id: true }
        })

        if (activeMaintenance) {
            if (room.status !== 'MAINTENANCE') {
                await prisma.room.update({
                    where: { id: roomId },
                    data: { status: 'MAINTENANCE' }
                })
                await invalidateRoomAndDashboardCaches(room.propertyId)
            }
            return 'MAINTENANCE'
        }

        // 4. If room was in CLEANING or MAINTENANCE, but tasks are completed and no guest -> mark AVAILABLE
        if (room.status === 'CLEANING' || (room.status === 'MAINTENANCE' && !activeMaintenance)) {
            await prisma.room.update({
                where: { id: roomId },
                data: { status: 'AVAILABLE' }
            })
            await invalidateRoomAndDashboardCaches(room.propertyId)
            return 'AVAILABLE'
        }

        return room.status
    } catch (err) {
        console.error(`[reconcileRoomStatus error for ${roomId}]:`, err)
        return 'UNKNOWN'
    }
}

/**
 * Self-healing routine to detect any rooms currently stuck in CLEANING where
 * the housekeeping tasks have already been completed (or none exist) and no guest is checked in.
 */
export async function autoHealCleaningRooms(whereProperty: any = {}): Promise<string[]> {
    try {
        const cleaningRooms = await prisma.room.findMany({
            where: { ...whereProperty, status: 'CLEANING' },
            select: { id: true, propertyId: true }
        })

        if (cleaningRooms.length === 0) return []

        const roomIds = cleaningRooms.map(r => r.id)

        // Find active housekeeping tasks for these rooms
        const activeTasks = await prisma.serviceRequest.findMany({
            where: {
                roomId: { in: roomIds },
                type: 'HOUSEKEEPING',
                status: { in: ['PENDING', 'IN_PROGRESS', 'ACCEPTED'] }
            },
            select: { roomId: true }
        })
        const activeRoomIds = new Set(activeTasks.map(t => t.roomId).filter(Boolean))

        // Find active checked-in bookings for these rooms
        const activeBookings = await prisma.booking.findMany({
            where: {
                roomId: { in: roomIds },
                status: 'CHECKED_IN'
            },
            select: { roomId: true }
        })
        const bookedRoomIds = new Set(activeBookings.map(b => b.roomId).filter(Boolean))

        // Rooms that have no active tasks and no checked-in bookings
        const healedIds = roomIds.filter(id => !activeRoomIds.has(id) && !bookedRoomIds.has(id))

        if (healedIds.length > 0) {
            await prisma.room.updateMany({
                where: { id: { in: healedIds } },
                data: { status: 'AVAILABLE' }
            })
            await invalidateRoomAndDashboardCaches(cleaningRooms[0]?.propertyId)
        }

        return healedIds
    } catch (err) {
        console.error('[autoHealCleaningRooms error]:', err)
        return []
    }
}
