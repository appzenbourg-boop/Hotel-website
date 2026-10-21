import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    let propertyId: string | null | undefined = searchParams.get('propertyId')

    if (!propertyId || propertyId === 'ALL') {
      propertyId = (session.user as any).propertyId
    }

    if (!propertyId || propertyId === 'ALL') {
      const dbUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { workplaceId: true, ownedPropertyIds: true }
      })
      propertyId = dbUser?.workplaceId || dbUser?.ownedPropertyIds?.[0]
    }

    if (!propertyId || propertyId === 'ALL') {
      const firstProp = await prisma.property.findFirst({ select: { id: true } })
      propertyId = firstProp?.id
    }

    if (!propertyId) {
      return NextResponse.json({ error: 'Valid Property ID is required' }, { status: 400 })
    }

    const otaName = searchParams.get('otaName')

    // Fetch all OTA connections for this property
    const connections = await prisma.otaConnection.findMany({
      where: { propertyId }
    })

    const rooms = await prisma.room.findMany({
      where: { propertyId },
      include: {
        otaMappings: true
      },
      orderBy: { roomNumber: 'asc' }
    })

    // Compute occupancy metrics
    const totalRooms = rooms.length
    const occupiedRooms = rooms.filter(r => r.status === 'OCCUPIED').length
    const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0

    return NextResponse.json({
      success: true,
      rooms,
      connections,
      stats: {
        totalRooms,
        occupiedRooms,
        availableRooms: totalRooms - occupiedRooms,
        occupancyRate
      }
    })
  } catch (error) {
    console.error('Error fetching room mappings:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    let propertyId: string | null | undefined = body.propertyId || (session.user as any).propertyId

    if (!propertyId || propertyId === 'ALL') {
      propertyId = (session.user as any).propertyId
    }

    if (!propertyId || propertyId === 'ALL') {
      const dbUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { workplaceId: true, ownedPropertyIds: true }
      })
      propertyId = dbUser?.workplaceId || dbUser?.ownedPropertyIds?.[0]
    }

    if (!propertyId || propertyId === 'ALL') {
      const firstProp = await prisma.property.findFirst({ select: { id: true } })
      propertyId = firstProp?.id
    }

    if (!propertyId) {
      return NextResponse.json({ error: 'Valid Property ID is required' }, { status: 400 })
    }

    // Helper to get or create connection
    const getOrCreateConnection = async (otaName: string) => {
      return await prisma.otaConnection.upsert({
        where: { propertyId_otaName: { propertyId, otaName } },
        update: {},
        create: {
          propertyId,
          otaName,
          status: 'CONNECTED',
          credentials: {}
        }
      })
    }

    // Handle Publish Rates trigger
    if (body.publish) {
      await prisma.otaConnection.updateMany({
        where: { propertyId },
        data: {
          lastSync: new Date(),
          status: 'CONNECTED'
        }
      })
    }

    // Handle Batch Updates
    if (Array.isArray(body.batch) && body.batch.length > 0) {
      const results = []
      for (const item of body.batch) {
        const { otaName, roomId, isActive, customRate, ratePlanCode, otaRoomId } = item
        if (!otaName || !roomId) continue

        const conn = await getOrCreateConnection(otaName)
        const mapping = await prisma.roomOtaMapping.upsert({
          where: {
            roomId_otaConnectionId: {
              roomId,
              otaConnectionId: conn.id
            }
          },
          update: {
            ...(isActive !== undefined && { isActive }),
            ...(customRate !== undefined && { customRate: customRate !== null && !isNaN(Number(customRate)) ? Number(customRate) : null }),
            ...(ratePlanCode !== undefined && { ratePlanCode }),
            ...(otaRoomId !== undefined && { otaRoomId })
          } as any,
          create: {
            propertyId,
            roomId,
            otaConnectionId: conn.id,
            otaRoomId: otaRoomId || '',
            ratePlanCode: ratePlanCode || 'EP',
            isActive: isActive !== undefined ? isActive : true,
            customRate: customRate !== null && !isNaN(Number(customRate)) ? Number(customRate) : null
          } as any
        })
        results.push(mapping)
      }
      return NextResponse.json({ success: true, count: results.length, data: results })
    }

    // Handle Single Update
    const { otaName, roomId, otaRoomId, ratePlanCode, isActive, customRate } = body

    if (!otaName || !roomId) {
      return NextResponse.json({ error: 'otaName and roomId are required' }, { status: 400 })
    }

    const otaConnection = await getOrCreateConnection(otaName)

    // Upsert mapping
    const mapping = await prisma.roomOtaMapping.upsert({
      where: {
        roomId_otaConnectionId: {
          roomId,
          otaConnectionId: otaConnection.id
        }
      },
      update: {
        ...(otaRoomId !== undefined && { otaRoomId }),
        ...(ratePlanCode !== undefined && { ratePlanCode }),
        ...(isActive !== undefined && { isActive }),
        ...(customRate !== undefined && { customRate: customRate !== null && !isNaN(Number(customRate)) ? Number(customRate) : null })
      } as any,
      create: {
        propertyId,
        roomId,
        otaConnectionId: otaConnection.id,
        otaRoomId: otaRoomId || '',
        ratePlanCode: ratePlanCode || 'EP',
        isActive: isActive !== undefined ? isActive : true,
        customRate: customRate !== null && !isNaN(Number(customRate)) ? Number(customRate) : null
      } as any
    })

    return NextResponse.json({ success: true, mapping })
  } catch (error) {
    console.error('Error saving room mapping:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
