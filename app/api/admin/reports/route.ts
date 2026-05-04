import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth/middleware'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    try {
        const authResult = await requireAuth(req, ['SUPER_ADMIN', 'HOTEL_ADMIN', 'MANAGER', 'RECEPTIONIST'])
        if (authResult instanceof NextResponse) return authResult

        const session = await getServerSession(authOptions)
        const { searchParams } = new URL(req.url)
        const queryPropertyId = searchParams.get('propertyId')

        let whereProperty: any = {}
        if (session?.user?.role === 'SUPER_ADMIN') {
            if (queryPropertyId && queryPropertyId !== 'ALL') {
                whereProperty = { propertyId: queryPropertyId }
            }
        } else {
            const propertyId = session?.user?.propertyId
            if (propertyId) whereProperty = { propertyId }
        }

        const now = new Date()
        const rangeParam = searchParams.get('range') || 'this_month'

        // Compute date range based on parameter
        let thisMonthStart: Date
        let thisMonthEnd: Date
        let lastMonthStart: Date
        let lastMonthEnd: Date
        let daysToShow: number

        if (rangeParam === 'last_month') {
            const last = subMonths(now, 1)
            thisMonthStart = startOfMonth(last)
            thisMonthEnd = endOfMonth(last)
            lastMonthStart = startOfMonth(subMonths(now, 2))
            lastMonthEnd = endOfMonth(subMonths(now, 2))
            daysToShow = 31
        } else if (rangeParam === 'last_3_months') {
            thisMonthStart = startOfMonth(subMonths(now, 2))
            thisMonthEnd = endOfMonth(now)
            lastMonthStart = startOfMonth(subMonths(now, 5))
            lastMonthEnd = endOfMonth(subMonths(now, 3))
            daysToShow = 90
        } else if (rangeParam === 'this_year') {
            thisMonthStart = new Date(now.getFullYear(), 0, 1)
            thisMonthEnd = endOfMonth(now)
            lastMonthStart = new Date(now.getFullYear() - 1, 0, 1)
            lastMonthEnd = new Date(now.getFullYear() - 1, 11, 31)
            daysToShow = 365
        } else {
            // this_month (default)
            thisMonthStart = startOfMonth(now)
            thisMonthEnd = endOfMonth(now)
            lastMonthStart = startOfMonth(subMonths(now, 1))
            lastMonthEnd = endOfMonth(subMonths(now, 1))
            daysToShow = 31
        }

        // ===== 1. REVENUE =====
        const thisMonthRevenue = await prisma.booking.aggregate({
            where: {
                ...whereProperty,
                status: { in: ['CHECKED_OUT', 'CHECKED_IN'] },
                checkIn: { gte: thisMonthStart, lte: thisMonthEnd }
            },
            _sum: { totalAmount: true }
        })

        const lastMonthRevenue = await prisma.booking.aggregate({
            where: {
                ...whereProperty,
                status: { in: ['CHECKED_OUT', 'CHECKED_IN'] },
                checkIn: { gte: lastMonthStart, lte: lastMonthEnd }
            },
            _sum: { totalAmount: true }
        })

        const currentRev = thisMonthRevenue._sum.totalAmount || 0
        const lastRev = lastMonthRevenue._sum.totalAmount || 0
        const revTrend = lastRev > 0 ? Math.round(((currentRev - lastRev) / lastRev) * 100) : 0

        // ===== 2. OCCUPANCY =====
        const totalRooms = await prisma.room.count({ where: whereProperty })
        const activeBookingsToday = await prisma.booking.findMany({
            where: {
                ...whereProperty,
                status: { in: ['CHECKED_IN', 'RESERVED'] },
                checkIn: { lte: endOfDay(now) },
                checkOut: { gte: startOfDay(now) }
            }
        })
        const occupiedRoomsCount = new Set(activeBookingsToday.map(b => b.roomId)).size
        const occupancyRate = totalRooms > 0 ? Math.round((occupiedRoomsCount / totalRooms) * 100) : 0

        // Last month occupancy estimate from bookings
        const lastMonthBookings = await prisma.booking.count({
            where: { ...whereProperty, checkIn: { gte: lastMonthStart, lte: lastMonthEnd } }
        })
        const daysInLastMonth = Math.ceil((lastMonthEnd.getTime() - lastMonthStart.getTime()) / (1000 * 60 * 60 * 24))
        const lastMonthOccupancy = totalRooms > 0 ? Math.round((lastMonthBookings / (totalRooms * daysInLastMonth)) * 100) : 0
        const occTrend = lastMonthOccupancy > 0 ? occupancyRate - lastMonthOccupancy : 0

        // ===== 3. NPS / GUEST RATINGS =====
        const allRatings = await prisma.rating.findMany({
            where: { createdAt: { gte: thisMonthStart } },
            select: { rating: true, comment: true, createdAt: true, guest: { select: { name: true } }, type: true }
        })
        const avgRating = allRatings.length > 0 ? (allRatings.reduce((s, r) => s + r.rating, 0) / allRatings.length) : 0
        const nps = Math.round(avgRating * 20) // Convert 1-5 scale to 0-100 NPS-like score
        const positiveCount = allRatings.filter(r => r.rating >= 4).length
        const neutralCount = allRatings.filter(r => r.rating === 3).length
        const negativeCount = allRatings.filter(r => r.rating <= 2).length
        const totalRatings = allRatings.length || 1
        const sentimentBreakdown = {
            positive: Math.round((positiveCount / totalRatings) * 100),
            neutral: Math.round((neutralCount / totalRatings) * 100),
            negative: Math.round((negativeCount / totalRatings) * 100),
            avgRating: Math.round(avgRating * 10) / 10
        }

        // ===== 4. SLA BREACHES =====
        // Find service requests completed after SLA
        const allServicesThisMonth = await prisma.serviceRequest.findMany({
            where: {
                ...whereProperty,
                createdAt: { gte: thisMonthStart },
                status: 'COMPLETED'
            },
            select: { createdAt: true, completedAt: true, slaMinutes: true, type: true }
        })
        const actualBreaches = allServicesThisMonth.filter(s => {
            if (!s.completedAt) return false
            const elapsed = (new Date(s.completedAt).getTime() - new Date(s.createdAt).getTime()) / (1000 * 60)
            return elapsed > s.slaMinutes
        }).length

        const lastMonthBreaches = (await prisma.serviceRequest.findMany({
            where: {
                ...whereProperty,
                createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
                status: 'COMPLETED'
            },
            select: { createdAt: true, completedAt: true, slaMinutes: true }
        })).filter(s => {
            if (!s.completedAt) return false
            const elapsed = (new Date(s.completedAt).getTime() - new Date(s.createdAt).getTime()) / (1000 * 60)
            return elapsed > s.slaMinutes
        }).length

        const slaTrend = lastMonthBreaches - actualBreaches // positive means improvement

        // ===== 5. DAILY REVENUE & OCCUPANCY TRENDS =====
        const windowStart = startOfDay(subDays(now, daysToShow - 1))
        const windowEnd = endOfDay(now)

        // Fetch all bookings that overlap with our 31-day window in ONE query
        const allBookingsInWindow = await prisma.booking.findMany({
            where: {
                ...whereProperty,
                status: { in: ['CHECKED_IN', 'CHECKED_OUT'] },
                checkIn: { lte: windowEnd },
                checkOut: { gte: windowStart }
            },
            select: { checkIn: true, checkOut: true, totalAmount: true }
        })

        const trendData: { name: string; revenue: number; occupancy: number }[] = []
        for (let i = daysToShow - 1; i >= 0; i--) {
            const day = subDays(now, i)
            const dayStart = startOfDay(day)
            const dayEnd = endOfDay(day)

            // Filter bookings that overlap this specific day
            const dayBookings = allBookingsInWindow.filter(b => {
                const ci = new Date(b.checkIn).getTime()
                const co = new Date(b.checkOut).getTime()
                return ci <= dayEnd.getTime() && co >= dayStart.getTime()
            })

            const dayRevenue = dayBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0)
            const dayLabel = day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

            trendData.push({
                name: dayLabel,
                revenue: Math.round(dayRevenue),
                occupancy: totalRooms > 0 ? Math.round((dayBookings.length / totalRooms) * 100) : 0
            })
        }

        // ===== 6. SLA COMPLIANCE BY DEPARTMENT =====
        const departments = ['HOUSEKEEPING', 'FOOD_ORDER', 'MAINTENANCE', 'ROOM_SERVICE']
        const deptDisplayNames: Record<string, string> = {
            'HOUSEKEEPING': 'Housekeeping',
            'FOOD_ORDER': 'Front Desk',
            'MAINTENANCE': 'Maintenance',
            'ROOM_SERVICE': 'Room Service'
        }
        const slaByDept: { department: string; compliance: number }[] = []
        for (const dept of departments) {
            const deptServices = await prisma.serviceRequest.findMany({
                where: {
                    ...whereProperty,
                    type: dept as any,
                    status: 'COMPLETED',
                    createdAt: { gte: thisMonthStart }
                },
                select: { createdAt: true, completedAt: true, slaMinutes: true }
            })
            const total = deptServices.length
            const onTime = deptServices.filter(s => {
                if (!s.completedAt) return false
                const elapsed = (new Date(s.completedAt).getTime() - new Date(s.createdAt).getTime()) / (1000 * 60)
                return elapsed <= s.slaMinutes
            }).length
            slaByDept.push({
                department: deptDisplayNames[dept] || dept.replace('_', ' '),
                compliance: total > 0 ? Math.round((onTime / total) * 100) : null
            })
        }

        // ===== 7. STAFF LEADERBOARD =====
        const staffWithTasks = await prisma.staff.findMany({
            where: whereProperty,
            include: {
                user: { select: { name: true } },
                serviceRequests: {
                    where: { status: 'COMPLETED', createdAt: { gte: thisMonthStart } }
                },
                performanceScores: {
                    take: 1,
                    orderBy: [{ year: 'desc' }, { month: 'desc' }]
                }
            }
        })

        const leaderboard = staffWithTasks
            .map(s => {
                const tasksCompleted = s.serviceRequests.length
                const perfScore = s.performanceScores[0]
                // Only show a rating if there's real performance data
                const rating = perfScore?.avgRating
                    ? (Math.round(perfScore.avgRating * 10) / 10).toFixed(1)
                    : tasksCompleted > 0
                        ? (Math.round(((perfScore?.tasksOnTime ?? tasksCompleted) / tasksCompleted) * 5 * 10) / 10).toFixed(1)
                        : null // no tasks = no rating

                return {
                    name: s.user.name,
                    department: s.department.replace('_', ' '),
                    tasksCompleted,
                    rating,
                }
            })
            .sort((a, b) => b.tasksCompleted - a.tasksCompleted)
            .slice(0, 5)

        // ===== 8. RECENT GUEST FEEDBACK =====
        const recentFeedback = await prisma.rating.findMany({
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: {
                guest: { select: { name: true } },
                serviceRequest: { select: { room: { select: { roomNumber: true } } } }
            }
        })

        const feedback = recentFeedback.map(r => ({
            rating: r.rating,
            comment: r.comment || null,
            guestName: r.guest.name,
            room: r.serviceRequest?.room?.roomNumber || 'N/A',
            createdAt: r.createdAt
        }))

        return NextResponse.json({
            success: true,
            data: {
            // KPI Cards
            totalRevenue: currentRev,
            revenueTrend: revTrend,
            lastMonthRevenue: lastRev,
            avgOccupancy: occupancyRate,
            occTrend,
            lastMonthOccupancy,
            nps,
            slaBreaches: actualBreaches,
            slaTrend,
            // Charts
            trendData,
            slaByDept,
            sentimentBreakdown,
            // Leaderboard & Feedback
            leaderboard,
            feedback,
            // Meta
            periodStart: thisMonthStart.toISOString(),
            periodEnd: thisMonthEnd.toISOString()
            }
        })

    } catch (error: any) {
        console.error('[REPORTS_API_ERROR]', error)
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
    }
}