import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

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

  const status = searchParams.get('status')
  const start = searchParams.get('start')
  const end = searchParams.get('end')
  const id = searchParams.get('id')

  try {
    if (id) {
      const booking = await (prisma as any).banquetBooking.findUnique({
        where: { id },
        include: { events: true }
      })
      const enriched = await attachPropertyData(booking)
      return NextResponse.json(enriched)
    }

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

    // Generate booking number
    const count = await (prisma as any).banquetBooking.count({ where: { propertyId } })
    const bookingNumber = `BQ-${String(count + 1).padStart(4, '0')}`

    // Calculate total
    const totalAmount = (body.events || []).reduce((s: number, e: any) => s + (e.amount || 0), 0)

    const booking = await (prisma as any).banquetBooking.create({
      data: {
        propertyId,
        bookingNumber,
        status: body.status || 'ENQUIRY',
        salutation: body.salutation || 'Mr.',
        firstName: body.firstName,
        lastName: body.lastName,
        mobile: body.mobile,
        email: body.email,
        address: body.address,
        address2: body.address2,
        country: body.country || 'India',
        nationality: body.nationality || 'Indian',
        state: body.state,
        city: body.city,
        zipCode: body.zipCode,
        guestGstin: body.guestGstin,
        aadhaarNo: body.aadhaarNo,
        panNo: body.panNo,
        reference: body.reference,
        partyName1: body.partyName1,
        contactNo1: body.contactNo1,
        partyName2: body.partyName2,
        contactNo2: body.contactNo2,
        eventName: body.eventName,
        specialInstructions: body.specialInstructions,
        payMode: body.payMode || 'Cash',
        currency: body.currency || 'INR',
        billingInstruction: body.billingInstruction || 'Direct',
        marketSegment: body.marketSegment || 'Walk In',
        businessSource: body.businessSource || 'Walk-in',
        reservationMode: body.reservationMode || 'Phone Call',
        corporate: body.corporate,
        gstin: body.gstin,
        totalAmount,
        paidAmount: body.paidAmount || 0,
        balanceDue: totalAmount - (body.paidAmount || 0),
        notes: body.notes,
        events: {
          create: (body.events || []).map((e: any) => ({
            hallId: e.hallId || null,
            hallName: e.hallName || 'Main Hall',
            eventType: e.eventType || 'Event',
            eventDate: new Date(e.eventDate),
            startTime: e.startTime || '09:00',
            endTime: e.endTime || '17:00',
            menuCard: e.menuCard,
            guaranteedPax: parseInt(e.guaranteedPax) || 0,
            childPax: parseInt(e.childPax) || 0,
            hallOnRent: e.hallOnRent || false,
            rateType: e.rateType || 'Season',
            hallRent: parseFloat(e.hallRent) || 0,
            perPlateRate: parseFloat(e.perPlateRate) || 0,
            inclusive: e.inclusive || false,
            amount: parseFloat(e.amount) || 0,
            fpNumber: e.fpNumber
          }))
        }
      },
      include: { events: true }
    })
    const enriched = await attachPropertyData(booking)
    return NextResponse.json({ success: true, data: enriched })
  } catch (e: any) {
    console.error('Banquet POST error:', e)
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { id, events, ...data } = body

    const totalAmount = (events || []).reduce((s: number, e: any) => s + (e.amount || 0), 0)

    // Delete old events and recreate
    await (prisma as any).banquetEvent.deleteMany({ where: { bookingId: id } })

    const booking = await (prisma as any).banquetBooking.update({
      where: { id },
      data: {
        ...data,
        totalAmount,
        balanceDue: totalAmount - (data.paidAmount || 0),
        events: {
          create: (events || []).map((e: any) => ({
            hallId: e.hallId || null,
            hallName: e.hallName || 'Main Hall',
            eventType: e.eventType || 'Event',
            eventDate: new Date(e.eventDate),
            startTime: e.startTime || '09:00',
            endTime: e.endTime || '17:00',
            menuCard: e.menuCard,
            guaranteedPax: parseInt(e.guaranteedPax) || 0,
            childPax: parseInt(e.childPax) || 0,
            hallOnRent: e.hallOnRent || false,
            rateType: e.rateType || 'Season',
            hallRent: parseFloat(e.hallRent) || 0,
            perPlateRate: parseFloat(e.perPlateRate) || 0,
            inclusive: e.inclusive || false,
            amount: parseFloat(e.amount) || 0,
            fpNumber: e.fpNumber
          }))
        }
      },
      include: { events: true }
    })
    const enriched = await attachPropertyData(booking)
    return NextResponse.json({ success: true, data: enriched })
  } catch (e: any) {
    console.error('Banquet PUT error:', e)
    return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 })
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
  } catch (e) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
