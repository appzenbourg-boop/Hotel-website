import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/options'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const order = await prisma.pOSOrder.findUnique({
      where: { id: params.id },
      include: { items: true }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error('Error fetching POS order:', error)
    return NextResponse.json({ error: 'Failed to get order' }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { status, paymentMethod, roomNumber, kitchenNotes } = body

    const existingTags = (await prisma.pOSOrder.findUnique({
      where: { id: params.id },
      select: { tags: true }
    }))?.tags || []

    const newTags = [...existingTags]
    if (paymentMethod) newTags.push(`Paid: ${paymentMethod}`)
    if (roomNumber) newTags.push(`Room: ${roomNumber}`)

    const updateData: any = {}
    if (status) updateData.status = status
    if (paymentMethod) updateData.tags = newTags
    if (kitchenNotes !== undefined) updateData.kitchenNotes = kitchenNotes

    const order = await prisma.pOSOrder.update({
      where: { id: params.id },
      data: updateData,
      include: {
        items: true
      }
    })

    return NextResponse.json(order)
  } catch (error) {
    console.error('Error updating POS order:', error)
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }
}
