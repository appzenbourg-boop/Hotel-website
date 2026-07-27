import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { prisma } from '@/lib/db'
import { ok, unauthorized, badRequest, serverError, conflict } from '@/lib/api-response'
import { calculatePricing } from '@/lib/pricing'
import { differenceInCalendarDays } from 'date-fns'

export const dynamic = 'force-dynamic'

const SUPPORTED_ENUMS = new Set([
  'AIRBNB',
  'BOOKING_COM',
  'MAKE_MY_TRIP',
  'AGODA',
  'EXPEDIA',
  'DIRECT',
  'WALK_IN'
])

/**
 * POST /api/admin/settings/integrations/simulate
 * Generates a mock OTA booking to test calendar synchronization.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return unauthorized()

    const body = await req.json()
    const { otaName, roomId, guestName, checkIn, checkOut } = body

    if (!otaName || !roomId || !checkIn || !checkOut) {
      return badRequest('otaName, roomId, checkIn, and checkOut are required')
    }

    const { searchParams } = new URL(req.url)
    const queryPropertyId = searchParams.get('propertyId')
    let propertyId = session.user.propertyId

    if (session.user.role === 'SUPER_ADMIN') {
      propertyId = queryPropertyId || propertyId
    }

    if (!propertyId || propertyId === 'ALL') {
      return badRequest('Property context is required')
    }

    const checkInDate = new Date(checkIn)
    const checkOutDate = new Date(checkOut)

    // 1. Check room availability
    const conflicting = await prisma.booking.findFirst({
      where: {
        roomId,
        status: { in: ['RESERVED', 'CHECKED_IN'] },
        checkIn: { lt: checkOutDate },
        checkOut: { gt: checkInDate },
      },
    })

    if (conflicting) {
      return conflict('This room is already booked for the selected dates')
    }

    // 2. Fetch room details
    const room = await prisma.room.findUnique({
      where: { id: roomId },
    })
    if (!room) return badRequest('Room not found')

    // 3. Create a unique simulated Guest profile
    const uniquePhone = `SIM-${otaName}-${Date.now().toString().slice(-6)}`
    const guest = await prisma.guest.create({
      data: {
        name: guestName || `Mock ${otaName} Guest`,
        phone: uniquePhone,
        email: `${uniquePhone.toLowerCase()}@example.com`,
        createdByPropertyId: propertyId,
      },
    })

    // 4. Calculate prices
    const nights = Math.max(1, differenceInCalendarDays(checkOutDate, checkInDate))
    const baseAmount = room.basePrice * nights
    
    // Standard GST settings
    const pricingSettings = {
      gstPercent: 12.0,
      serviceChargePercent: 0.0,
      luxuryTaxPercent: 0.0,
      defaultDiscountPercent: 0.0,
    }
    const pricing = calculatePricing(baseAmount, pricingSettings)

    // 5. Determine source enum and tags for backward compatibility
    const upperOta = otaName.toUpperCase().replace('-', '_')
    const useEnum = SUPPORTED_ENUMS.has(upperOta)
    
    const dbSource = useEnum ? (upperOta as any) : 'OTHER'
    const notesTag = useEnum ? `Simulated ${otaName} Reservation` : `[OTA_SOURCE: ${upperOta}]\nSimulated ${otaName} Reservation`

    // 6. Create simulated booking
    const booking = await prisma.booking.create({
      data: {
        propertyId,
        guestId: guest.id,
        roomId,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        numberOfGuests: 2,
        totalAmount: pricing.totalAmount,
        baseAmount: pricing.baseAmount,
        gstPercent: pricing.gstPercent,
        gstAmount: pricing.gstAmount,
        finalAmount: pricing.finalAmount,
        status: 'RESERVED',
        source: dbSource,
        specialRequests: `Simulated OTA Channel Booking`,
        notes: `${notesTag}\nBooking Ref: ${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      },
      include: {
        guest: { select: { name: true, phone: true } },
        room: { select: { roomNumber: true, type: true } },
      },
    })

    return ok({
      message: `Mock booking from ${otaName} successfully simulated!`,
      booking,
    })
  } catch (error) {
    return serverError(error, 'SETTINGS_INTEGRATIONS_SIMULATE_POST')
  }
}
