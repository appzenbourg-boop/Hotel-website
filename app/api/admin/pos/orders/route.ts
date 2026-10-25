import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/options'
import { performAutoAssignment } from '@/lib/service-utils'

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
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

    const orders = await prisma.pOSOrder.findMany({
      where: propertyId ? { propertyId } : {},
      include: {
        items: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(orders)
  } catch (error) {
    console.error('Error fetching POS orders:', error)
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await req.json()
    const { table, guestName, serverName, status, tags, kitchenNotes, items, subtotal, tax, total } = body

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

    const orderNumber = '#' + Math.floor(1000 + Math.random() * 9000)

    const order = await prisma.pOSOrder.create({
      data: {
        orderNumber,
        propertyId,
        table,
        serverName: serverName || session.user.name || 'Julian A.',
        guestName: guestName || 'Walk-in',
        status: status || 'PREPARING',
        tags: tags || [],
        kitchenNotes,
        subtotal: parseFloat(subtotal) || 0,
        tax: parseFloat(tax) || 0,
        total: parseFloat(total) || 0,
        items: {
          create: items.map((item: any) => ({
            course: item.course || 'COURSE 1: STARTERS',
            name: item.name,
            description: item.description || '',
            allergy: item.allergy || null,
            quantity: parseInt(item.quantity) || 1,
            price: parseFloat(item.price) || 0,
            image: item.image || null
          }))
        }
      },
      include: {
        items: true
      }
    })

    // Raise ServiceRequest for staff panel & kitchen operations
    try {
      const roomMatch = table ? table.trim().match(/^(?:room[\s-]*)?(\d+[a-z]?)$/i) : null
      let linkedRoom: any = null
      let activeBooking: any = null

      if (roomMatch) {
        linkedRoom = await prisma.room.findFirst({
          where: {
            propertyId,
            roomNumber: { equals: roomMatch[1], mode: 'insensitive' }
          }
        })
        if (linkedRoom) {
          activeBooking = await prisma.booking.findFirst({
            where: {
              propertyId,
              roomId: linkedRoom.id,
              status: 'CHECKED_IN'
            },
            include: { guest: true }
          })
        }
      }

      const itemsSummary = (items || []).map((i: any) => `${i.name} (x${i.quantity || 1})`).join(', ')
      const descriptionLines = [
        `POS Order: ${orderNumber}`,
        `Location: ${table || 'Dine-In'}`,
        activeBooking ? `Guest: ${activeBooking.guest?.name || guestName || 'Resident Guest'} (Room ${linkedRoom?.roomNumber})` : (guestName ? `Guest: ${guestName}` : null),
        `Items: ${itemsSummary}`,
        kitchenNotes ? `Kitchen Notes: ${kitchenNotes}` : null,
        `Amount: ₹${parseFloat(total) || 0}`
      ].filter(Boolean).join('\n')

      await prisma.serviceRequest.create({
        data: {
          propertyId,
          roomId: linkedRoom?.id || null,
          guestId: activeBooking?.guestId || null,
          type: linkedRoom ? 'ROOM_SERVICE' : 'FOOD_ORDER',
          title: `Kitchen Order ${orderNumber} - ${table || 'Dine-In'}`,
          description: descriptionLines,
          priority: 'URGENT',
          status: 'PENDING',
          amount: parseFloat(total) || 0,
          paymentStatus: 'PENDING',
          slaMinutes: 30,
          assignedToId: null,
        }
      })

      // Asynchronously assign on-duty / active staff and notify them
      performAutoAssignment(propertyId, 0).catch(err => {
        console.error('[POS_ORDER_AUTO_ASSIGN_ERR]', err)
      })
    } catch (srErr) {
      console.error('[POS_SERVICE_REQUEST_CREATE_ERR]', srErr)
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error('Error creating POS order:', error)
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }
}
