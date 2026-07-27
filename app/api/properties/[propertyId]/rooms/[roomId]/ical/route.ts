import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateICal } from '@/lib/ical'

export const dynamic = 'force-dynamic'

/**
 * GET /api/properties/[propertyId]/rooms/[roomId]/ical
 * Public unauthenticated endpoint generating iCal (.ics) format of room reservations.
 * Airbnb polls this URL periodically to block bookings in Airbnb calendar.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { propertyId: string; roomId: string } }
) {
  try {
    const { propertyId, roomId } = params

    if (!propertyId || !roomId) {
      return new NextResponse('Missing parameters', { status: 400 })
    }

    // 1. Verify property & room exist
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: { roomNumber: true, propertyId: true },
    })

    if (!room || room.propertyId !== propertyId) {
      return new NextResponse('Room not found', { status: 404 })
    }

    // 2. Fetch all upcoming active reservations for this room
    // Statuses that block calendar: RESERVED, CHECKED_IN
    const bookings = await prisma.booking.findMany({
      where: {
        roomId,
        status: { in: ['RESERVED', 'CHECKED_IN'] },
      },
      include: {
        guest: { select: { name: true } },
      },
    })

    // Format bookings for iCal generator helper
    const formatted = bookings.map((b) => ({
      id: b.id,
      checkIn: b.checkIn,
      checkOut: b.checkOut,
      guestName: b.guest?.name || 'Guest',
    }))

    // 3. Generate standard iCal content
    const icalData = generateICal(room.roomNumber, formatted)

    // 4. Return as text/calendar content type
    return new NextResponse(icalData, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="room-${room.roomNumber}-calendar.ics"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    })
  } catch (error) {
    console.error('[ICAL_EXPORT_FEED_ERROR]', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
