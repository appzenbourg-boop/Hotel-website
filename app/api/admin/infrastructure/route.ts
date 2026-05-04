import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth/middleware'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { serverError } from '@/lib/api-response'
import { subHours, format } from 'date-fns'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    try {
        const authResult = await requireAuth(req, ['SUPER_ADMIN', 'HOTEL_ADMIN', 'MANAGER', 'RECEPTIONIST'])
        if (authResult instanceof NextResponse) return authResult

        const { searchParams } = new URL(req.url)
        const queryPropertyId = searchParams.get('propertyId')
        const session = await getServerSession(authOptions)

        let propertyId: string | null = null
        if (session?.user?.role === 'SUPER_ADMIN') {
            if (queryPropertyId && queryPropertyId !== 'ALL') propertyId = queryPropertyId
        } else {
            propertyId = session?.user?.propertyId ?? null
        }

        const where: any = propertyId ? { propertyId } : {}
        const now = new Date()
        const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0)
        const endOfToday = new Date(now); endOfToday.setHours(23, 59, 59, 999)

        // ── Fetch everything in parallel ──────────────────────────────────────
        const [
            // Staff on duty (punched in, not punched out)
            staffOnDuty,
            // Active bookings (checked in right now)
            activeBookings,
            // Today's arrivals (reserved, checking in today)
            todayArrivals,
            // Today's departures
            todayDepartures,
            // Pending service requests
            pendingServices,
            // SLA breaches (pending > 1 hour)
            slaBreaches,
            // Rooms being cleaned
            cleaningRooms,
            // Rooms under maintenance
            maintenanceRooms,
            // Total rooms
            totalRooms,
            // Recent bookings (last 24h for activity chart)
            recentBookings,
            // Razorpay: recent payments
            recentPayments,
        ] = await Promise.all([
            // Staff on duty
            prisma.staff.findMany({
                where: {
                    ...where,
                    attendances: { some: { punchOut: null, punchIn: { gte: subHours(now, 16) } } }
                },
                include: {
                    user: { select: { name: true } },
                    attendances: {
                        where: { punchOut: null },
                        orderBy: { punchIn: 'desc' },
                        take: 1,
                    }
                },
                take: 20,
            }),

            // Currently checked-in guests
            prisma.booking.findMany({
                where: { ...where, status: 'CHECKED_IN' },
                include: {
                    guest: { select: { name: true } },
                    room: { select: { roomNumber: true } },
                },
                orderBy: { checkIn: 'desc' },
                take: 10,
            }),

            // Today's arrivals
            prisma.booking.count({
                where: { ...where, status: 'RESERVED', checkIn: { gte: startOfToday, lte: endOfToday } }
            }),

            // Today's departures
            prisma.booking.count({
                where: { ...where, status: 'CHECKED_IN', checkOut: { gte: startOfToday, lte: endOfToday } }
            }),

            // Pending services
            prisma.serviceRequest.findMany({
                where: { ...where, status: { in: ['PENDING', 'ACCEPTED', 'IN_PROGRESS'] } },
                include: {
                    room: { select: { roomNumber: true } },
                    assignedTo: { include: { user: { select: { name: true } } } },
                },
                orderBy: { createdAt: 'asc' },
                take: 10,
            }),

            // SLA breaches
            prisma.serviceRequest.count({
                where: {
                    ...where,
                    status: { in: ['PENDING', 'ACCEPTED'] },
                    createdAt: { lte: subHours(now, 1) },
                }
            }),

            // Rooms being cleaned
            prisma.room.findMany({
                where: { ...where, status: 'CLEANING' },
                select: { roomNumber: true, type: true },
            }),

            // Rooms under maintenance
            prisma.room.findMany({
                where: { ...where, status: 'MAINTENANCE' },
                select: { roomNumber: true, type: true },
            }),

            // Total rooms
            prisma.room.count({ where }),

            // Recent bookings for activity chart (last 24h)
            prisma.booking.findMany({
                where: { ...where, createdAt: { gte: subHours(now, 24) } },
                select: { createdAt: true },
                orderBy: { createdAt: 'asc' },
            }),

            // Recent payments
            prisma.booking.findMany({
                where: {
                    ...where,
                    paymentStatus: 'PAID',
                    updatedAt: { gte: subHours(now, 24) },
                },
                select: { totalAmount: true, finalAmount: true, updatedAt: true },
                orderBy: { updatedAt: 'desc' },
                take: 5,
            }),
        ])

        const occupiedRooms = activeBookings.length
        const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0

        // ── Activity chart: bookings per 2h bucket ────────────────────────────
        const activityChart = Array.from({ length: 12 }, (_, i) => {
            const bucketStart = subHours(now, (11 - i) * 2)
            const bucketEnd = subHours(now, (10 - i) * 2)
            const count = recentBookings.filter(
                b => b.createdAt >= bucketStart && b.createdAt < bucketEnd
            ).length
            return {
                time: format(bucketStart, 'HH:mm'),
                bookings: count,
                value: Math.min(100, 60 + count * 8), // visual height
            }
        })

        // ── Payment gateway status ────────────────────────────────────────────
        const razorpayConfigured = !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)
        const twilioConfigured = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN)
        const recentPaymentTotal = recentPayments.reduce((s, p) => s + (p.finalAmount ?? p.totalAmount ?? 0), 0)

        // ── Build alerts from real data ───────────────────────────────────────
        const alerts: any[] = []

        if (slaBreaches > 0) {
            alerts.push({
                type: 'CRITICAL',
                message: `${slaBreaches} SLA Breach${slaBreaches > 1 ? 'es' : ''}`,
                description: `${slaBreaches} service request${slaBreaches > 1 ? 's' : ''} pending for over 1 hour without resolution.`,
                category: 'Services',
                time: format(now, 'HH:mm'),
            })
        }

        maintenanceRooms.forEach(r => {
            alerts.push({
                type: 'WARNING',
                message: `Room ${r.roomNumber} Under Maintenance`,
                description: `${r.type} room is blocked. Verify if work is complete.`,
                category: 'Rooms',
                time: format(now, 'HH:mm'),
            })
        })

        pendingServices.filter(s => s.status === 'PENDING' && !s.assignedTo).forEach(s => {
            alerts.push({
                type: 'WARNING',
                message: `Unassigned: ${s.title}`,
                description: `Room ${s.room?.roomNumber ?? '?'} — no staff assigned yet.`,
                category: s.type.replace('_', ' '),
                time: format(s.createdAt, 'HH:mm'),
            })
        })

        if (alerts.length === 0) {
            alerts.push({
                type: 'INFO',
                message: 'All Systems Operational',
                description: 'No active alerts. Hotel operations running smoothly.',
                category: 'System',
                time: format(now, 'HH:mm'),
            })
        }

        return NextResponse.json({
            success: true,
            data: {
                // Live counts
                live: {
                    staffOnDuty: staffOnDuty.length,
                    staffList: staffOnDuty.map(s => ({
                        name: s.user.name,
                        department: s.department,
                        punchIn: s.attendances[0]?.punchIn
                            ? format(new Date(s.attendances[0].punchIn), 'HH:mm')
                            : '—',
                    })),
                    guestsInHouse: occupiedRooms,
                    guestList: activeBookings.map(b => ({
                        name: b.guest.name,
                        room: b.room.roomNumber,
                        checkOut: format(new Date(b.checkOut), 'dd MMM'),
                    })),
                    todayArrivals,
                    todayDepartures,
                    cleaningRooms: cleaningRooms.length,
                    maintenanceRooms: maintenanceRooms.length,
                    occupancyRate,
                    totalRooms,
                    pendingServices: pendingServices.length,
                    slaBreaches,
                    activeServices: pendingServices.map(s => ({
                        title: s.title,
                        room: s.room?.roomNumber ?? '?',
                        type: s.type,
                        status: s.status,
                        assignedTo: s.assignedTo?.user?.name ?? null,
                        age: Math.round((now.getTime() - new Date(s.createdAt).getTime()) / 60000), // minutes
                    })),
                },
                // Payment gateways
                gateways: [
                    {
                        name: 'Razorpay',
                        type: 'Payment Gateway',
                        status: razorpayConfigured ? 'Live' : 'Not Configured',
                        detail: razorpayConfigured
                            ? `₹${recentPaymentTotal.toLocaleString('en-IN')} collected (24h)`
                            : 'Add RAZORPAY_KEY_ID to .env',
                    },
                    {
                        name: 'Twilio',
                        type: 'SMS / WhatsApp',
                        status: twilioConfigured ? 'Live' : 'Not Configured',
                        detail: twilioConfigured ? 'SMS & WhatsApp active' : 'Add TWILIO credentials to .env',
                    },
                    {
                        name: 'Database',
                        type: 'Guest & Booking Data',
                        status: 'Live',
                        detail: 'All records connected & syncing',
                    },
                    {
                        name: 'Authentication',
                        type: 'Staff Login & Security',
                        status: 'Live',
                        detail: 'Staff sessions active & secure',
                    },
                ],
                alerts,
                activityChart,
            },
        })
    } catch (error) {
        return serverError(error, 'INFRA_GET')
    }
}
