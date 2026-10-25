import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/options'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const urlPropertyId = searchParams.get('propertyId')
    const roomNumber = searchParams.get('roomNumber')

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

    if (!propertyId) {
      return NextResponse.json({ error: 'Property ID is required' }, { status: 400 })
    }

    const checkedInBookings = await prisma.booking.findMany({
      where: {
        propertyId,
        status: 'CHECKED_IN',
        ...(roomNumber ? { room: { roomNumber: { equals: roomNumber.trim(), mode: 'insensitive' } } } : {})
      },
      include: {
        room: {
          select: { id: true, roomNumber: true, type: true, category: true, floor: true }
        },
        guest: {
          select: { id: true, name: true, phone: true, email: true }
        }
      },
      orderBy: { checkIn: 'desc' }
    })

    const formatted = checkedInBookings.map(b => ({
      bookingId: b.id,
      roomId: b.room.id,
      roomNumber: b.room.roomNumber,
      roomType: b.room.type || b.room.category,
      floor: b.room.floor,
      guestId: b.guest.id,
      guestName: b.guest.name,
      guestPhone: b.guest.phone || '',
      guestEmail: b.guest.email || '',
      checkIn: b.checkIn,
      checkOut: b.checkOut,
    }))

    if (roomNumber) {
      if (formatted.length > 0) {
        return NextResponse.json({
          valid: true,
          booking: formatted[0]
        })
      } else {
        return NextResponse.json({
          valid: false,
          error: `Room ${roomNumber} has no active checked-in guest.`
        })
      }
    }

    return NextResponse.json({
      success: true,
      count: formatted.length,
      rooms: formatted
    })
  } catch (error) {
    console.error('Error fetching active checked-in rooms:', error)
    return NextResponse.json({ error: 'Failed to fetch active rooms' }, { status: 500 })
  }
}
