import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { prisma } from '@/lib/db'
import { startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns'
import { redis } from '@/lib/redis'

export const dynamic = 'force-dynamic'

export async function GET() {
    const session = await getServerSession(authOptions)

    if (!session) {
        return new NextResponse('Unauthorized', { status: 401 })
    }

    try {
        // Try to get cached stats first
        const cacheKey = 'dashboard:stats'
        const cachedStats = await redis.get(cacheKey)

        if (cachedStats) {
            return NextResponse.json(cachedStats)
        }

        const today = new Date()
        const startOfToday = startOfDay(today)
        const endOfToday = endOfDay(today)
        const startOfCurrentMonth = startOfMonth(today)

        // Parallelize queries for performance
        const [
            checkIns,
            checkOuts,
            totalRooms,
            occupiedRooms,
            revenueToday,
            revenueMonth,
            pendingService,
            activeStaff
        ] = await Promise.all([
            // Check-ins today
            prisma.booking.count({
                where: {
                    checkIn: {
                        gte: startOfToday,
                        lte: endOfToday,
                    },
                    status: {
                        not: 'CANCELLED',
                    },
                },
            }),

            // Check-outs today
            prisma.booking.count({
                where: {
                    checkOut: {
                        gte: startOfToday,
                        lte: endOfToday,
                    },
                },
            }),

            // Total Rooms
            prisma.room.count(),

            // Occupied Rooms (based on room status or active bookings)
            prisma.room.count({
                where: {
                    status: 'OCCUPIED',
                },
            }),

            // Revenue Today
            prisma.booking.aggregate({
                _sum: {
                    totalAmount: true,
                },
                where: {
                    createdAt: {
                        gte: startOfToday,
                        lte: endOfToday,
                    },
                },
            }),

            // Revenue Month
            prisma.booking.aggregate({
                _sum: {
                    totalAmount: true,
                },
                where: {
                    createdAt: {
                        gte: startOfCurrentMonth,
                    },
                },
            }),

            // Pending Service Requests
            prisma.serviceRequest.count({
                where: {
                    status: { in: ['PENDING', 'IN_PROGRESS'] }
                }
            }),

            // Active Staff
            prisma.staff.count({
                where: {
                    user: {
                        status: 'ACTIVE'
                    }
                }
            })
        ])

        const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0

        const result = {
            todayCheckIns: checkIns || 0,
            todayCheckOuts: checkOuts || 0,
            occupancyRate,
            availableRooms: totalRooms - occupiedRooms,
            pendingHousekeeping: pendingService || 0, // Using service requests as proxy
            activeFoodOrders: 0, // Placeholder
            slaBreaches: 0, // Placeholder
            onDutyStaff: activeStaff || 0,
            todayRevenue: revenueToday._sum.totalAmount || 0,
            monthRevenue: revenueMonth._sum.totalAmount || 0,
        }

        // Cache the result for 60 seconds
        await redis.set(cacheKey, result, { ex: 60 })

        return NextResponse.json(result)

    } catch (error) {
        console.error('Dashboard Stats Error:', error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}
