import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/options'

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    let bodyPropertyId: string | null = null
    try {
      const body = await req.json()
      bodyPropertyId = body?.propertyId
    } catch {}

    const urlPropertyId = searchParams.get('propertyId') || bodyPropertyId
    let propertyId = (session.user as any)?.propertyId
    if (session.user.role === 'SUPER_ADMIN') {
      if (urlPropertyId && urlPropertyId !== 'ALL') propertyId = urlPropertyId
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

    // Clear existing for this property only
    const existingOrders = await prisma.pOSOrder.findMany({
      where: { propertyId },
      select: { id: true }
    })
    const orderIds = existingOrders.map(o => o.id)
    if (orderIds.length > 0) {
      await prisma.pOSOrderItem.deleteMany({
        where: { posOrderId: { in: orderIds } }
      })
      await prisma.pOSOrder.deleteMany({
        where: { propertyId }
      })
    }

    // Order 1 (T-14)
    const order1 = await prisma.pOSOrder.create({
      data: {
        orderNumber: '#9842',
        propertyId,
        table: 'T-14',
        serverName: 'Julian A.',
        guestName: 'Mark R.',
        status: 'PREPARING',
        tags: ['RUSH ORDER', 'ALLERGY ALERT'],
        kitchenNotes: '"Celebrating Anniversary"',
        subtotal: 74.00,
        tax: 6.24,
        total: 80.24,
        items: {
          create: [
            {
              course: 'COURSE 1: STARTERS',
              name: 'Heirloom Burrata',
              description: 'Extra Virgin Olive Oil, Sea Salt',
              quantity: 1,
              price: 18.00,
              image: 'https://images.unsplash.com/photo-1608897013039-887f21d8c804?w=100&q=80'
            },
            {
              course: 'COURSE 1: STARTERS',
              name: 'Truffle Parm Fries',
              description: '',
              allergy: 'NO GARLIC (Allergy)',
              quantity: 2,
              price: 24.00,
              image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=100&q=80'
            },
            {
              course: 'COURSE 2: MAINS',
              name: 'Atlantic Salmon',
              description: 'Medium Rare, Asparagus side',
              quantity: 1,
              price: 32.00,
              image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=100&q=80'
            }
          ]
        }
      }
    })

    // Order 2 (T-08)
    const order2 = await prisma.pOSOrder.create({
      data: {
        orderNumber: '#9843',
        propertyId,
        table: 'T-08',
        serverName: 'Sarah J.',
        guestName: 'Sarah J.',
        status: 'READY',
        tags: [],
        subtotal: 45.00,
        tax: 4.50,
        total: 49.50
      }
    })

    // Order 3 (T-22)
    const order3 = await prisma.pOSOrder.create({
      data: {
        orderNumber: '#9830',
        propertyId,
        table: 'T-22',
        serverName: 'Mike T.',
        guestName: 'Table 22',
        status: 'SERVED',
        tags: [],
        subtotal: 120.00,
        tax: 12.00,
        total: 132.00
      }
    })

    // Order 4 (T-03)
    const order4 = await prisma.pOSOrder.create({
      data: {
        orderNumber: '#9845',
        propertyId,
        table: 'T-03',
        serverName: 'Julian A.',
        guestName: 'Walk-in',
        status: 'PREPARING',
        tags: [],
        subtotal: 15.00,
        tax: 1.50,
        total: 16.50
      }
    })

    return NextResponse.json({ success: true, seeded: 4 })
  } catch (error) {
    console.error('Error seeding POS orders:', error)
    return NextResponse.json({ error: 'Failed to seed orders' }, { status: 500 })
  }
}
