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
    const { searchParams } = new URL(req.url)
    const urlPropertyId = searchParams.get('propertyId')
    let propertyId = (session.user as any)?.propertyId
    if (session.user.role === 'SUPER_ADMIN') {
      if (urlPropertyId && urlPropertyId !== 'ALL') propertyId = urlPropertyId
    } else {
      if (!propertyId && urlPropertyId && urlPropertyId !== 'ALL') propertyId = urlPropertyId
    }
    if (!propertyId) return NextResponse.json([])

    let tables = await prisma.pOSTable.findMany({
      where: { propertyId },
      orderBy: { tableId: 'asc' }
    })

    // Seed default configuration if empty
    if (tables.length === 0) {
      const defaults = [
        { tableId: 'T-01', size: 4, status: 'READY', isBooth: false, propertyId },
        { tableId: 'T-02', size: 2, status: 'READY', isBooth: false, propertyId },
        { tableId: 'T-03', size: 4, status: 'CLEANING', isBooth: false, propertyId },
        { tableId: 'T-04', size: 6, status: 'READY', isBooth: false, propertyId },
        { tableId: 'T-05', size: 8, status: 'READY', isBooth: true, propertyId },
        { tableId: 'T-06', size: 4, status: 'READY', isBooth: false, propertyId },
        { tableId: 'T-07', size: 2, status: 'CLEANING', isBooth: false, propertyId },
        { tableId: 'T-08', size: 2, status: 'READY', isBooth: false, propertyId }
      ]
      
      await prisma.pOSTable.createMany({
        data: defaults
      })

      tables = await prisma.pOSTable.findMany({
        where: { propertyId },
        orderBy: { tableId: 'asc' }
      })
    }

    return NextResponse.json(tables)
  } catch (error) {
    console.error('Error fetching POS tables:', error)
    return NextResponse.json({ error: 'Failed to fetch tables' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const body = await req.json()
    const { tableId, size, status, isBooth } = body

    let propertyId = (session.user as any)?.propertyId
    if (session.user.role === 'SUPER_ADMIN') {
      if (body.propertyId && body.propertyId !== 'ALL') propertyId = body.propertyId
    } else {
      if (!propertyId && body.propertyId && body.propertyId !== 'ALL') propertyId = body.propertyId
    }

    if (!propertyId) {
      return NextResponse.json({ error: 'Property ID is required' }, { status: 400 })
    }

    if (!tableId) {
      return NextResponse.json({ error: 'Table ID is required' }, { status: 400 })
    }

    // Check uniqueness
    const exists = await prisma.pOSTable.findFirst({
      where: { tableId, propertyId }
    })
    if (exists) {
      return NextResponse.json({ error: `Table ${tableId} already exists` }, { status: 400 })
    }

    const table = await prisma.pOSTable.create({
      data: {
        tableId,
        size: parseInt(size) || 4,
        status: status || 'READY',
        isBooth: !!isBooth,
        propertyId
      }
    })

    return NextResponse.json(table)
  } catch (error) {
    console.error('Error creating table:', error)
    return NextResponse.json({ error: 'Failed to create table' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { id, status, size, isBooth, reservationTime, reservationName } = body

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const dataToUpdate: any = {}
    if (status) dataToUpdate.status = status
    if (size !== undefined) dataToUpdate.size = parseInt(size)
    if (isBooth !== undefined) dataToUpdate.isBooth = !!isBooth
    if (reservationTime !== undefined) dataToUpdate.reservationTime = reservationTime
    if (reservationName !== undefined) dataToUpdate.reservationName = reservationName

    // If status is no longer RESERVED, maybe we want to clear out reservation info?
    // User can manually clear it or we can auto-clear it. We'll allow the frontend to pass null to clear it.

    const table = await prisma.pOSTable.update({
      where: { id },
      data: dataToUpdate
    })

    return NextResponse.json(table)
  } catch (error) {
    console.error('Error updating table:', error)
    return NextResponse.json({ error: 'Failed to update table' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    await prisma.pOSTable.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting table:', error)
    return NextResponse.json({ error: 'Failed to delete table' }, { status: 500 })
  }
}
