import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/options'

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const propertyId = (session.user as any)?.propertyId

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
    const propertyId = (session.user as any)?.propertyId || '6a7c467e80ab868749620999'

    const body = await req.json()
    const { table, guestName, serverName, status, tags, kitchenNotes, items, subtotal, tax, total } = body

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

    return NextResponse.json(order)
  } catch (error) {
    console.error('Error creating POS order:', error)
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }
}
