import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/checkin
 *
 * Shows ALL guests belonging to this hotel:
 *   - Guests with any booking at this property (any status)
 *   - Guests created by this property (createdByPropertyId)
 *
 * filter=all       → everyone
 * filter=pending   → RESERVED (not yet checked in)
 * filter=completed → CHECKED_IN (currently in-house)
 */
export async function GET(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse('Unauthorized', { status: 401 })

    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter') || 'all'
    const queryPropertyId = searchParams.get('propertyId')

    const propertyId = session.user.role === 'SUPER_ADMIN'
        ? (queryPropertyId && queryPropertyId !== 'ALL' ? queryPropertyId : null)
        : session.user.propertyId

    if (!propertyId) {
        return NextResponse.json({
            stats: { expected: 0, completed: 0, pending: 0, verificationPending: 0 },
            monthlyAverage: 0, monthlyChange: 0, bookings: []
        })
    }

    const today = new Date()
    const startOfDay = new Date(today); startOfDay.setHours(0, 0, 0, 0)
    const endOfDay   = new Date(today); endOfDay.setHours(23, 59, 59, 999)

    try {
        // ── 1. Get all guests of this hotel ──────────────────────────────────
        // A guest belongs to this hotel if:
        //   a) They were created by this property
        //   b) They have at least one booking at this property
        const allGuests = await prisma.guest.findMany({
            where: {
                OR: [
                    { createdByPropertyId: propertyId },
                    { bookings: { some: { propertyId } } },
                ],
            },
            include: {
                bookings: {
                    where: { propertyId },
                    include: {
                        room: { select: { roomNumber: true, type: true, category: true } },
                    },
                    orderBy: { checkIn: 'desc' },
                    take: 5,
                },
            },
            orderBy: { createdAt: 'desc' },
        })

        // ── 2. Build a flat list of "guest + their latest booking" ───────────
        const rows: any[] = []

        for (const guest of allGuests) {
            // Pick the most relevant booking
            const activeBooking =
                guest.bookings.find(b => b.status === 'CHECKED_IN') ??
                guest.bookings.find(b => b.status === 'RESERVED') ??
                guest.bookings[0] ??
                null

            // Apply tab filter
            if (filter === 'pending' && activeBooking?.status !== 'RESERVED') continue
            if (filter === 'completed' && activeBooking?.status !== 'CHECKED_IN') continue

            rows.push({
                // Use booking id if available, else guest id as key
                id: activeBooking?.id ?? guest.id,
                guestId: guest.id,
                guestName: guest.name,
                guestPhone: guest.phone,
                guestEmail: guest.email,
                resId: activeBooking
                    ? `#RES-${activeBooking.id.slice(-4).toUpperCase()}`
                    : '#WALK-IN',
                roomNumber: activeBooking?.room?.roomNumber ?? '—',
                roomType: activeBooking?.room?.type ?? '—',
                checkIn: activeBooking?.checkIn ?? null,
                checkOut: activeBooking?.checkOut ?? null,
                status: activeBooking?.status ?? 'NO_BOOKING',
                source: activeBooking?.source ?? 'DIRECT',
                idType: guest.idType,
                idNumber: guest.idNumber,
                idDocumentFront: guest.idDocumentFront,
                idDocumentBack: guest.idDocumentBack,
                checkInStatus: guest.checkInStatus,
                checkInCompletedAt: guest.checkInCompletedAt,
            })
        }

        // ── 3. Stats ─────────────────────────────────────────────────────────
        const [todayArrivals, currentlyCheckedIn, lastMonthCount] = await Promise.all([
            prisma.booking.count({
                where: { propertyId, status: 'RESERVED', checkIn: { gte: startOfDay, lte: endOfDay } }
            }),
            prisma.booking.count({
                where: { propertyId, status: 'CHECKED_IN' }
            }),
            prisma.booking.count({
                where: {
                    propertyId,
                    status: { in: ['RESERVED', 'CHECKED_IN'] },
                    checkIn: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), lte: endOfDay }
                }
            }),
        ])

        const monthlyAverage = lastMonthCount / 30
        const monthlyChange = monthlyAverage > 0
            ? ((currentlyCheckedIn / monthlyAverage) - 1) * 100
            : 0

        const verificationPending = rows.filter(r =>
            r.checkInStatus !== 'VERIFIED' && r.checkInStatus !== 'COMPLETED'
        ).length

        return NextResponse.json({
            stats: {
                expected: todayArrivals,
                completed: currentlyCheckedIn,
                pending: rows.filter(r => r.status === 'RESERVED').length,
                verificationPending,
            },
            monthlyAverage,
            monthlyChange,
            bookings: rows,
        })

    } catch (error) {
        console.error('[CHECKIN_GET]', error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}
