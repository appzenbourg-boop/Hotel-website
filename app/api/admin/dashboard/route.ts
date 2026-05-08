import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth/middleware'
import { startOfDay, endOfDay, subDays } from 'date-fns'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { redis } from '@/lib/redis'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/dashboard
 * Get high-level stats for the dashboard
 */
export async function GET(req: NextRequest) {
    try {
        const authResult = await requireAuth(req, ['SUPER_ADMIN', 'HOTEL_ADMIN', 'MANAGER', 'RECEPTIONIST'])
        if (authResult instanceof NextResponse) return authResult

        const { searchParams } = new URL(req.url)
        const queryPropertyId = searchParams.get('propertyId')
        const session = await getServerSession(authOptions)

        let whereProperty: any = {}
        if (session?.user?.role === 'SUPER_ADMIN') {
            if (queryPropertyId && queryPropertyId !== 'ALL') {
                whereProperty = { propertyId: queryPropertyId }
            }
        } else {
            const propertyId = session?.user?.propertyId || (queryPropertyId && queryPropertyId !== 'ALL' ? queryPropertyId : null)
            if (propertyId) whereProperty = { propertyId }
        }

        const propertyKey = queryPropertyId || session?.user?.propertyId || 'ALL'
        const cacheKey = `dashboard:${propertyKey}`
        const cached = await redis.get(cacheKey)
        if (cached) {
            return NextResponse.json({ ...cached, fromCache: true })
        }

        const today = new Date()

        // Parallelize ALL queries for maximum performance
        const [
            totalRooms,
            occupiedRooms,
            todayArrivals,
            todayDepartures,
            pendingServices,
            activeServices,
            monthlyRevenue,
            todayRevenue,
            recentArrivals,
            recentDepartures,
            dirtyRooms,
            maintenanceRooms,
            cleanRooms,
            priorityCleaning,
            onDutyStaffFull,
            recentActivity,
            recentBookingActivity,
            availableRoomsByCategory
        ] = await Promise.all([
            // 1. Occupancy Stats
            prisma.room.count({ where: whereProperty }),
            prisma.room.count({ where: { ...whereProperty, status: 'OCCUPIED' } }),

            // 2. Today's Arrivals & Departures
            prisma.booking.count({
                where: {
                    ...whereProperty,
                    OR: [
                        { checkIn: { lte: endOfDay(today) }, status: 'RESERVED' },
                        { checkIn: { gte: startOfDay(today), lte: endOfDay(today) }, status: 'CHECKED_IN' }
                    ]
                }
            }),
            prisma.booking.count({
                where: {
                    ...whereProperty,
                    checkOut: { gte: startOfDay(today), lte: endOfDay(today) },
                    status: { in: ['CHECKED_IN', 'CHECKED_OUT'] }
                }
            }),

            // 3. Service Request Status
            prisma.serviceRequest.count({
                where: { ...whereProperty, status: 'PENDING' }
            }),
            prisma.serviceRequest.count({
                where: { ...whereProperty, status: { in: ['ACCEPTED', 'IN_PROGRESS'] } }
            }),

            // 4. Revenue (Monthly & Today)
            prisma.booking.aggregate({
                where: {
                    ...whereProperty,
                    status: 'CHECKED_OUT',
                    updatedAt: { gte: new Date(today.getFullYear(), today.getMonth(), 1) }
                },
                _sum: { totalAmount: true }
            }),
            prisma.booking.aggregate({
                where: {
                    ...whereProperty,
                    status: 'CHECKED_OUT',
                    updatedAt: { gte: startOfDay(today), lte: endOfDay(today) }
                },
                _sum: { totalAmount: true }
            }),

            // 6. Recent Arrivals
            prisma.booking.findMany({
                where: {
                    ...whereProperty,
                    OR: [
                        { checkIn: { lte: endOfDay(today) }, status: 'RESERVED' },
                        { checkIn: { gte: startOfDay(today), lte: endOfDay(today) }, status: 'CHECKED_IN' }
                    ]
                },
                include: {
                    guest: { select: { name: true, phone: true } },
                    room: { select: { roomNumber: true, type: true } }
                },
                take: 10,
                orderBy: { checkIn: 'asc' }
            }),

            // 7. Recent Departures
            prisma.booking.findMany({
                where: {
                    ...whereProperty,
                    checkOut: { gte: startOfDay(today), lte: endOfDay(today) }
                },
                include: {
                    guest: { select: { name: true, phone: true } },
                    room: { select: { roomNumber: true, type: true } }
                },
                take: 5,
                orderBy: { checkOut: 'asc' }
            }),

            // 8. Housekeeping Status Counts
            prisma.room.count({ where: { ...whereProperty, status: 'CLEANING' } }),
            prisma.room.count({ where: { ...whereProperty, status: 'MAINTENANCE' } }),
            prisma.room.count({ where: { ...whereProperty, status: 'AVAILABLE' } }),

            // Priority cleaning
            prisma.serviceRequest.findMany({
                where: { ...whereProperty, type: 'HOUSEKEEPING', status: { in: ['PENDING', 'IN_PROGRESS'] } },
                include: {
                    room: { select: { roomNumber: true } },
                    assignedTo: { include: { user: { select: { name: true } } } }
                },
                take: 3,
                orderBy: { createdAt: 'desc' }
            }),

            // 9. On-duty staff (anyone currently punched in)
            // Query from Staff side so propertyId filter works directly
            prisma.staff.findMany({
                where: {
                    ...whereProperty,
                    attendances: {
                        some: {
                            punchOut: null
                        }
                    }
                },
                include: {
                    user: { select: { name: true } }
                }
            }),

            // 10. Activity logs
            prisma.serviceRequest.findMany({
                where: { ...whereProperty, updatedAt: { gte: startOfDay(today) }, status: { in: ['COMPLETED', 'IN_PROGRESS'] } },
                include: { room: { select: { roomNumber: true } }, guest: { select: { name: true } } },
                take: 5, orderBy: { updatedAt: 'desc' }
            }),
            prisma.booking.findMany({
                where: { ...whereProperty, updatedAt: { gte: startOfDay(today) } },
                include: { guest: { select: { name: true } }, room: { select: { roomNumber: true } } },
                take: 5, orderBy: { updatedAt: 'desc' }
            }),

            // Available room categories
            prisma.room.groupBy({
                by: ['category'],
                where: { ...whereProperty, status: 'AVAILABLE' },
                _count: true
            }),

            // SLA Breaches: completed requests that took longer than their SLA
            prisma.serviceRequest.count({
                where: {
                    ...whereProperty,
                    status: 'COMPLETED',
                    updatedAt: { gte: startOfDay(today) },
                    // acceptedAt is set when assigned; if completedAt - createdAt > slaMinutes it's a breach
                    // We approximate: updatedAt - createdAt > slaMinutes * 60000
                }
            })
        ])

        // Strictly count ONLY checked-in bookings for LIVE occupancy
        const activeBookingsToday = await prisma.booking.findMany({
            where: {
                ...whereProperty,
                status: 'CHECKED_IN', // Only people who are actually THERE
                checkIn: { lte: endOfDay(today) },
                checkOut: { gte: startOfDay(today) }
            },
            include: { 
                guest: { select: { name: true, phone: true } }, 
                room: { select: { id: true, roomNumber: true, type: true } } 
            }
        })
        
        // Merge manual RoomStatus.OCCUPIED with active CHECKED_IN bookings
        const manuallyOccupiedRooms = await prisma.room.findMany({
            where: { ...whereProperty, status: 'OCCUPIED' },
            select: { id: true }
        })

        const occupiedRoomIds = new Set([
            ...manuallyOccupiedRooms.map(r => r.id),
            ...activeBookingsToday.map(b => b.roomId)
        ])

        const occupiedRoomsCount = occupiedRoomIds.size
        const currentOccupancyRate = totalRooms > 0 ? Math.round((occupiedRoomsCount / totalRooms) * 100) : 0

        // Calculate Average Monthly Occupancy
        const startOfMonthDate = new Date(today.getFullYear(), today.getMonth(), 1)
        const daysInMonthSoFar = today.getDate()
        
        const monthBookings = await prisma.booking.findMany({
            where: {
                ...whereProperty,
                status: { in: ['CHECKED_IN', 'CHECKED_OUT'] },
                OR: [
                    { checkIn: { gte: startOfMonthDate, lte: endOfDay(today) } },
                    { checkOut: { gte: startOfMonthDate, lte: endOfDay(today) } },
                    { AND: [{ checkIn: { lte: startOfMonthDate } }, { checkOut: { gte: endOfDay(today) } }] }
                ]
            }
        })

        let totalNightsThisMonth = 0
        monthBookings.forEach(b => {
            const start = b.checkIn < startOfMonthDate ? startOfMonthDate : b.checkIn
            const end = b.checkOut > today ? today : b.checkOut
            const diffTime = Math.max(0, end.getTime() - start.getTime())
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
            totalNightsThisMonth += diffDays
        })

        const totalCapacityThisMonth = totalRooms * daysInMonthSoFar
        const avgMonthlyOccupancy = totalCapacityThisMonth > 0 
            ? Math.round((totalNightsThisMonth / totalCapacityThisMonth) * 100) 
            : 0
        // Process and sort activity logs
        const allActivity = [
            ...recentActivity.map((a: any) => ({
                time: new Date(a.updatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
                action: a.status === 'COMPLETED'
                    ? `Room ${a.room?.roomNumber || '?'} marked as Clean.`
                    : `${a.type.replace('_', ' ')} in progress for Room ${a.room?.roomNumber || '?'}.`,
                timestamp: a.updatedAt
            })),
            ...recentBookingActivity.map((b: any) => ({
                time: new Date(b.updatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
                action: b.status === 'CHECKED_IN'
                    ? `${b.guest.name} checked in to Room ${b.room?.roomNumber || '?'}.`
                    : b.status === 'RESERVED'
                        ? `Booking confirmed for ${b.guest.name}.`
                        : `${b.guest.name} checked out from Room ${b.room?.roomNumber || '?'}.`,
                timestamp: b.updatedAt
            }))
        ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 6)

        // Calculate real SLA breaches: completed requests where time taken > slaMinutes
        const completedToday = await prisma.serviceRequest.findMany({
            where: {
                ...whereProperty,
                status: 'COMPLETED',
                updatedAt: { gte: startOfDay(today) },
                acceptedAt: { not: null },
            },
            select: { createdAt: true, updatedAt: true, slaMinutes: true },
        })
        const slaBreaches = completedToday.filter(r => {
            const takenMs = new Date(r.updatedAt).getTime() - new Date(r.createdAt).getTime()
            const takenMin = takenMs / 60000
            return takenMin > (r.slaMinutes ?? 30)
        }).length

        // Active food orders
        const activeFoodOrders = await prisma.serviceRequest.count({
            where: {
                ...whereProperty,
                type: 'FOOD_ORDER',
                status: { in: ['PENDING', 'ACCEPTED', 'IN_PROGRESS'] },
            },
        })

        const pendingArrivals = await prisma.booking.count({
            where: {
                ...whereProperty,
                checkIn: { lte: endOfDay(today) },
                status: 'RESERVED'
            }
        })
        const remainingDepartures = await prisma.booking.count({
            where: {
                ...whereProperty,
                checkOut: { gte: startOfDay(today), lte: endOfDay(today) },
                status: 'CHECKED_IN'
            }
        })

        const categoryLabels = availableRoomsByCategory.map((c: any) =>
            c.category.charAt(0) + c.category.slice(1).toLowerCase()
        ).join(' & ')

        const responseData = {
            todayCheckIns: todayArrivals,
            todayCheckOuts: todayDepartures,
            occupancyRate: currentOccupancyRate,
            avgMonthlyOccupancy: avgMonthlyOccupancy,
            availableRooms: totalRooms - occupiedRoomsCount,
            pendingHousekeeping: pendingServices,
            activeFoodOrders,
            slaBreaches,
            onDutyStaff: onDutyStaffFull.length,
            onDutyStaffNames: onDutyStaffFull.map((s: any) => s.user.name),
            onDutyStaffDetails: onDutyStaffFull.map((s: any) => ({
                userId: s.userId,
                name: s.user.name,
                department: s.department?.replace('_', ' ') || 'Staff'
            })),
            todayRevenue: todayRevenue._sum.totalAmount || 0,
            monthRevenue: monthlyRevenue._sum.totalAmount || 0,
            pendingArrivals,
            remainingDepartures,
            categoryLabels: categoryLabels || 'Standard & Deluxe',
            recentCheckIns: recentArrivals.map((b: any) => ({
                id: b.id,
                guest: b.guest.name,
                room: b.room.roomNumber,
                roomType: `${b.room.type} (${b.room.roomNumber})`,
                eta: new Date(b.actualCheckIn || b.checkIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
                status: b.status,
                phone: b.guest.phone || 'N/A'
            })),
            recentDepartures: recentDepartures.map((b: any) => ({
                id: b.id,
                guest: b.guest.name,
                room: b.room.roomNumber,
                roomType: `${b.room.type} (${b.room.roomNumber})`,
                status: b.status,
                phone: b.guest.phone || 'N/A',
                time: new Date(b.actualCheckOut || b.checkOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
            })),
            occupancyGuests: activeBookingsToday.map(b => ({
                id: b.id,
                guest: b.guest.name,
                room: b.room.roomNumber,
                roomType: b.room.type,
                phone: b.guest.phone || 'N/A',
                status: b.status 
            })),
            housekeeping: {
                dirty: dirtyRooms + maintenanceRooms,
                inProgress: activeServices,
                clean: cleanRooms,
                priority: priorityCleaning.map((t: any) => ({
                    id: t.id,
                    room: t.room?.roomNumber || '?',
                    status: t.status,
                    assignedTo: t.assignedTo?.user?.name || 'Unassigned'
                }))
            },
            activityLog: allActivity
        }

        // Cache for 2 minutes
        await redis.set(cacheKey, responseData, { ex: 120 })

        return NextResponse.json(responseData)

    } catch (error: any) {
        console.error('[DASHBOARD_STATS_ERROR]', error)
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
    }
}
