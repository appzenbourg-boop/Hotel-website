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
    const { status, paymentMethod, roomNumber, kitchenNotes, table, discountAmt, discountReason } = body

    const existingOrder = await prisma.pOSOrder.findUnique({
      where: { id: params.id },
      include: { items: true }
    })
    
    if (!existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    let verifiedBooking: any = null
    let verifiedRoom: any = null

    if (paymentMethod === 'Room Charge') {
      if (!roomNumber || !roomNumber.trim()) {
        return NextResponse.json({ error: 'Room number is required for Room Charge payment.' }, { status: 400 })
      }

      verifiedRoom = await prisma.room.findFirst({
        where: {
          propertyId: existingOrder.propertyId,
          roomNumber: { equals: roomNumber.trim(), mode: 'insensitive' }
        }
      })

      if (!verifiedRoom) {
        return NextResponse.json({ error: `Room "${roomNumber}" does not exist in this property.` }, { status: 400 })
      }

      verifiedBooking = await prisma.booking.findFirst({
        where: {
          propertyId: existingOrder.propertyId,
          roomId: verifiedRoom.id,
          status: 'CHECKED_IN'
        },
        include: { guest: true }
      })

      if (!verifiedBooking) {
        return NextResponse.json({
          error: `Room ${verifiedRoom.roomNumber} has no active checked-in guest. Room Charge cannot be posted.`
        }, { status: 400 })
      }
    }

    const newTags = [...(existingOrder.tags || [])]
    if (paymentMethod) newTags.push(`Paid: ${paymentMethod}`)
    if (verifiedRoom) {
      newTags.push(`Room: ${verifiedRoom.roomNumber}`)
      if (verifiedBooking) {
        newTags.push(`BookingId: ${verifiedBooking.id}`)
        if (verifiedBooking.guest?.name) {
          newTags.push(`Guest: ${verifiedBooking.guest.name}`)
        }
      }
    } else if (roomNumber) {
      newTags.push(`Room: ${roomNumber}`)
    }
    if (discountAmt && discountAmt > 0) newTags.push(`Discount: ₹${discountAmt} (${discountReason || 'Manual'})`)

    const updateData: any = {}
    if (status) updateData.status = status
    if (paymentMethod || roomNumber || discountAmt) updateData.tags = newTags
    if (kitchenNotes !== undefined) updateData.kitchenNotes = kitchenNotes
    if (table) updateData.table = table
    if (verifiedBooking?.guest?.name) updateData.guestName = verifiedBooking.guest.name
    if (verifiedRoom && existingOrder.table && !existingOrder.table.toLowerCase().includes(verifiedRoom.roomNumber.toLowerCase())) {
      updateData.table = `${existingOrder.table} (Room ${verifiedRoom.roomNumber})`
    }
    
    if (discountAmt && discountAmt > 0) {
      const newSubtotal = Math.max(0, existingOrder.subtotal - discountAmt)
      const newTax = newSubtotal * 0.17 // 10% service + 7% vat
      updateData.total = newSubtotal + newTax
    }

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
