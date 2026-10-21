import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

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
  }

  try {
    const halls = await (prisma as any).banquetHall.findMany({
      where: propertyId ? { propertyId, isActive: true } : { isActive: true },
      orderBy: { name: 'asc' }
    })
    return NextResponse.json(halls)
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch halls' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
  }

  if (!propertyId) {
    return NextResponse.json({ error: 'Property ID is required' }, { status: 400 })
  }
  try {
    const hall = await (prisma as any).banquetHall.create({
      data: {
        propertyId,
        name: body.name,
        capacity: body.capacity || 100,
        rentPerDay: body.rentPerDay || 0,
        description: body.description,
        amenities: body.amenities || [],
      }
    })
    return NextResponse.json(hall)
  } catch (e) {
    return NextResponse.json({ error: 'Failed to create hall' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  try {
    const hall = await (prisma as any).banquetHall.update({
      where: { id: body.id },
      data: {
        name: body.name,
        capacity: body.capacity,
        rentPerDay: body.rentPerDay,
        description: body.description,
        amenities: body.amenities,
        isActive: body.isActive,
      }
    })
    return NextResponse.json(hall)
  } catch (e) {
    return NextResponse.json({ error: 'Failed to update hall' }, { status: 500 })
  }
}
