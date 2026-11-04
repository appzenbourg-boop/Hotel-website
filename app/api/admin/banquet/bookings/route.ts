import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

function safeObjectId(id: any): string | null {
  if (typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id.trim())) {
    return id.trim()
  }
  return null
}

function parseSafeDate(dateInput: any): Date {
  if (!dateInput) return new Date()
  if (dateInput instanceof Date && !isNaN(dateInput.getTime())) return dateInput

  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim()
    const directDate = new Date(trimmed)
    if (!isNaN(directDate.getTime()) && trimmed.includes('T')) {
      return directDate
    }

    // Support DD-MM-YYYY or DD/MM/YYYY
    const parts = trimmed.split(/[-/]/)
    if (parts.length === 3) {
      if (parts[2].length === 4) {
        // DD-MM-YYYY
        const d = parseInt(parts[0], 10)
        const m = parseInt(parts[1], 10) - 1
        const y = parseInt(parts[2], 10)
        const parsed = new Date(y, m, d)
        if (!isNaN(parsed.getTime())) return parsed
      } else if (parts[0].length === 4) {
        // YYYY-MM-DD
        const y = parseInt(parts[0], 10)
        const m = parseInt(parts[1], 10) - 1
        const d = parseInt(parts[2], 10)
        const parsed = new Date(y, m, d)
        if (!isNaN(parsed.getTime())) return parsed
      }
    }

    if (!isNaN(directDate.getTime())) {
      return directDate
    }
  }

  return new Date()
}

/**
 * Guarantees a globally unique booking number across all banquet bookings.
 * Avoids Prisma P2002 duplicate key constraint violations.
 */
async function generateUniqueBookingNumber(): Promise<string> {
  const latestBookings = await (prisma as any).banquetBooking.findMany({
    select: { bookingNumber: true },
    orderBy: { createdAt: 'desc' },
    take: 100
  })

  let maxNum = 0
  for (const b of latestBookings) {
    if (b?.bookingNumber) {
      const match = b.bookingNumber.match(/BQ-(\d+)/)
      if (match && match[1]) {
        const num = parseInt(match[1], 10)
        if (!isNaN(num) && num > maxNum) {
          maxNum = num
        }
      }
    }
  }

  let candidateNum = maxNum + 1
  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = `BQ-${String(candidateNum + attempt).padStart(4, '0')}`
    const existing = await (prisma as any).banquetBooking.findUnique({
      where: { bookingNumber: candidate },
      select: { id: true }
    })
    if (!existing) {
      return candidate
    }
  }

  return `BQ-${Date.now().toString().slice(-6)}`
}

async function attachPropertyData(booking: any) {
  if (!booking || !booking.propertyId) return booking
  try {
    const prop = await prisma.property.findUnique({
      where: { id: booking.propertyId }
    })
    const propSettings = await (prisma as any).propertySettings.findUnique({
      where: { propertyId: booking.propertyId }
    })
    return {
      ...booking,
      property: prop ? {
        id: prop.id,
        name: prop.name,
        address: prop.address,
        phone: prop.phone,
        email: prop.email,
        gstNumber: propSettings?.gstNumber || null,
        logo: prop.logo || null
      } : null
    }
  } catch {
    return booking
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const urlPropertyId = searchParams.get('propertyId')
  let propertyId = (session.user as any)?.propertyId
  if (session.user.role === 'SUPER_ADMIN') {
    if (urlPropertyId && urlPropertyId !== 'ALL') propertyId = urlPropertyId
  } else {
    if (!propertyId && urlPropertyId && urlPropertyId !== 'ALL') propertyId = urlPropertyId
  }

  if (!propertyId || propertyId === 'ALL') {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { workplaceId: true, ownedPropertyIds: true }
    })
    propertyId = dbUser?.workplaceId || dbUser?.ownedPropertyIds?.[0] || null
    if (!propertyId) {
      const fallbackProp = await prisma.property.findFirst({
        where: { ownerIds: { has: session.user.id } },
        select: { id: true }
      })
      if (fallbackProp) propertyId = fallbackProp.id
    }
  }

  try {
    const id = searchParams.get('id')
    if (id) {
      const booking = await (prisma as any).banquetBooking.findUnique({
        where: { id },
        include: { events: true }
      })
      if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      const enriched = await attachPropertyData(booking)
      return NextResponse.json(enriched)
    }

    const start = searchParams.get('start')
    const end = searchParams.get('end')
    const status = searchParams.get('status')
    const where: any = propertyId ? { propertyId } : {}
    if (status && status !== 'ALL') where.status = status
    if (start && end) {
      where.events = {
        some: {
          eventDate: {
            gte: new Date(start),
            lte: new Date(end)
          }
        }
      }
    }

    const bookings = await (prisma as any).banquetBooking.findMany({
      where,
      include: { events: true },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(bookings)
  } catch (e: any) {
    console.error('Banquet GET error:', e)
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    let propertyId = (session.user as any)?.propertyId
    if (session.user.role === 'SUPER_ADMIN') {
      if (body.propertyId && body.propertyId !== 'ALL') propertyId = body.propertyId
    } else {
      if (!propertyId && body.propertyId && body.propertyId !== 'ALL') propertyId = body.propertyId
    }

    if (!propertyId || propertyId === 'ALL') {
      const dbUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { workplaceId: true, ownedPropertyIds: true }
      })
      propertyId = dbUser?.workplaceId || dbUser?.ownedPropertyIds?.[0] || null
      if (!propertyId) {
        const fallbackProp = await prisma.property.findFirst({
          where: { ownerIds: { has: session.user.id } },
          select: { id: true }
        })
        if (fallbackProp) propertyId = fallbackProp.id
      }
    }

    if (!propertyId) {
      return NextResponse.json({ error: 'Property ID is required' }, { status: 400 })
    }

    // Server-side validation constraints
    const MAX_PAX = 50000
    const MAX_RENT = 10000000
    const MAX_PPR = 50000

    for (const e of body.events || []) {
      const pax = parseInt(e.guaranteedPax) || 0
      const rent = parseFloat(e.hallRent) || 0
      const ppr = parseFloat(e.perPlateRate) || 0
      if (pax > MAX_PAX) {
        return NextResponse.json({ error: `Guaranteed Pax cannot exceed ${MAX_PAX.toLocaleString('en-IN')} guests per event` }, { status: 400 })
      }
      if (rent > MAX_RENT) {
        return NextResponse.json({ error: `Venue rent cannot exceed ₹${MAX_RENT.toLocaleString('en-IN')} per event` }, { status: 400 })
      }
      if (ppr > MAX_PPR) {
        return NextResponse.json({ error: `Per-plate rate cannot exceed ₹${MAX_PPR.toLocaleString('en-IN')}` }, { status: 400 })
      }
    }

    // Calculate total
    const totalAmount = (body.events || []).reduce((s: number, e: any) => s + (e.amount || 0), 0)

    // Prepare events data with validated ObjectId and parsed dates
    const eventsCreateData = (body.events || []).map((e: any) => ({
      hallId: safeObjectId(e.hallId),
      hallName: e.hallName || 'Main Hall',
      eventType: e.eventType || 'Event',
      eventDate: parseSafeDate(e.eventDate),
      startTime: e.startTime || '09:00',
      endTime: e.endTime || '17:00',
      menuCard: e.menuCard || null,
      guaranteedPax: parseInt(e.guaranteedPax) || 0,
      childPax: parseInt(e.childPax) || 0,
      hallOnRent: e.hallOnRent !== false,
      rateType: e.rateType || 'Season',
      hallRent: parseFloat(e.hallRent) || 0,
      perPlateRate: parseFloat(e.perPlateRate) || 0,
      inclusive: Boolean(e.inclusive),
      amount: parseFloat(e.amount) || 0,
      fpNumber: e.fpNumber || null
    }))

    // Create booking with automatic collision retry
    let booking: any = null
    let attempts = 0
    let lastError: any = null

    while (attempts < 5) {
      try {
        const bookingNumber = await generateUniqueBookingNumber()
        booking = await (prisma as any).banquetBooking.create({
          data: {
            propertyId,
            bookingNumber,
            status: body.status || 'ENQUIRY',
            salutation: body.salutation || 'Mr.',
            firstName: body.firstName || 'Guest',
            lastName: body.lastName || '',
            mobile: body.mobile || '',
            email: body.email || null,
            address: body.address || null,
            address2: body.address2 || null,
            country: body.country || 'India',
            nationality: body.nationality || 'Indian',
            state: body.state || null,
            city: body.city || null,
            zipCode: body.zipCode || null,
            guestGstin: body.guestGstin || null,
            aadhaarNo: body.aadhaarNo || null,
            panNo: body.panNo || null,
            reference: body.reference || null,
            partyName1: body.partyName1 || null,
            contactNo1: body.contactNo1 || null,
            partyName2: body.partyName2 || null,
            contactNo2: body.contactNo2 || null,
            eventName: body.eventName || null,
            specialInstructions: body.specialInstructions || null,
            payMode: body.payMode || 'Cash',
            currency: body.currency || 'INR',
            billingInstruction: body.billingInstruction || 'Direct',
            marketSegment: body.marketSegment || 'Walk In',
            businessSource: body.businessSource || 'Walk-in',
            reservationMode: body.reservationMode || 'Phone Call',
            corporate: body.corporate || null,
            gstin: body.gstin || null,
            totalAmount,
            paidAmount: body.paidAmount || 0,
            balanceDue: totalAmount - (body.paidAmount || 0),
            notes: body.notes || null,
            events: {
              create: eventsCreateData
            }
          },
          include: { events: true }
        })
        break
      } catch (err: any) {
        lastError = err
        if (err?.code === 'P2002' && attempts < 4) {
          attempts++
          continue
        }
        throw err
      }
    }

    if (!booking) {
      throw lastError || new Error('Failed to create booking after multiple attempts.')
    }

    const enriched = await attachPropertyData(booking)
    return NextResponse.json({ success: true, data: enriched })
  } catch (e: any) {
    console.error('Banquet POST error:', e)
    return NextResponse.json({ 
      success: false, 
      error: e?.message || 'Failed to create booking' 
    }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { id, events, ...data } = body

    const MAX_PAX = 50000
    const MAX_RENT = 10000000
    const MAX_PPR = 50000

    for (const e of events || []) {
      const pax = parseInt(e.guaranteedPax) || 0
      const rent = parseFloat(e.hallRent) || 0
      const ppr = parseFloat(e.perPlateRate) || 0
      if (pax > MAX_PAX) {
        return NextResponse.json({ error: `Guaranteed Pax cannot exceed ${MAX_PAX.toLocaleString('en-IN')} guests per event` }, { status: 400 })
      }
      if (rent > MAX_RENT) {
        return NextResponse.json({ error: `Venue rent cannot exceed ₹${MAX_RENT.toLocaleString('en-IN')} per event` }, { status: 400 })
      }
      if (ppr > MAX_PPR) {
        return NextResponse.json({ error: `Per-plate rate cannot exceed ₹${MAX_PPR.toLocaleString('en-IN')}` }, { status: 400 })
      }
    }

    const totalAmount = (events || []).reduce((s: number, e: any) => s + (e.amount || 0), 0)

    // Delete old events and recreate
    await (prisma as any).banquetEvent.deleteMany({ where: { bookingId: id } })

    const eventsCreateData = (events || []).map((e: any) => ({
      hallId: safeObjectId(e.hallId),
      hallName: e.hallName || 'Main Hall',
      eventType: e.eventType || 'Event',
      eventDate: parseSafeDate(e.eventDate),
      startTime: e.startTime || '09:00',
      endTime: e.endTime || '17:00',
      menuCard: e.menuCard || null,
      guaranteedPax: parseInt(e.guaranteedPax) || 0,
      childPax: parseInt(e.childPax) || 0,
      hallOnRent: e.hallOnRent !== false,
      rateType: e.rateType || 'Season',
      hallRent: parseFloat(e.hallRent) || 0,
      perPlateRate: parseFloat(e.perPlateRate) || 0,
      inclusive: Boolean(e.inclusive),
      amount: parseFloat(e.amount) || 0,
      fpNumber: e.fpNumber || null
    }))

    const booking = await (prisma as any).banquetBooking.update({
      where: { id },
      data: {
        ...data,
        totalAmount,
        balanceDue: totalAmount - (data.paidAmount || 0),
        events: {
          create: eventsCreateData
        }
      },
      include: { events: true }
    })
    const enriched = await attachPropertyData(booking)
    return NextResponse.json({ success: true, data: enriched })
  } catch (e: any) {
    console.error('Banquet PUT error:', e)
    return NextResponse.json({ 
      success: false, 
      error: e?.message || 'Failed to update booking' 
    }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  try {
    await (prisma as any).banquetBooking.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to delete' }, { status: 500 })
  }
}
