import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { prisma } from '@/lib/db'
import { ok, unauthorized, badRequest, serverError } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/settings/integrations/airbnb
 * Retrieves the current Airbnb connection state and room mappings.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return unauthorized()

    const { searchParams } = new URL(req.url)
    const queryPropertyId = searchParams.get('propertyId')
    let propertyId = (queryPropertyId && queryPropertyId !== 'ALL') 
      ? queryPropertyId 
      : (session.user.propertyId || (session.user as any).ownedPropertyIds?.[0])

    if (!propertyId || propertyId === 'ALL') {
      const userProp = await prisma.property.findFirst({
        where: { ownerIds: { has: session.user.id } },
        select: { id: true }
      })
      if (userProp) propertyId = userProp.id
    }

    if (!propertyId || propertyId === 'ALL') {
      return badRequest('Property context is required')
    }

    // 1. Fetch OTA Connection for Airbnb
    const connection = await prisma.otaConnection.findUnique({
      where: {
        propertyId_otaName: {
          propertyId,
          otaName: 'AIRBNB',
        },
      },
    })

    // 2. Fetch Mappings
    const mappings = connection
      ? await prisma.roomOtaMapping.findMany({
          where: {
            propertyId,
            otaConnectionId: connection.id,
          },
        })
      : []

    // 3. Fetch rooms list to map
    const rooms = await prisma.room.findMany({
      where: { propertyId },
      select: { id: true, roomNumber: true, type: true, category: true },
      orderBy: { roomNumber: 'asc' },
    })

    return ok({
      connected: !!connection && connection.status === 'CONNECTED',
      connection,
      mappings,
      rooms,
    })
  } catch (error) {
    return serverError(error, 'SETTINGS_INTEGRATIONS_AIRBNB_GET')
  }
}

/**
 * POST /api/admin/settings/integrations/airbnb
 * Connects or updates room mappings for Airbnb.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return unauthorized()

    const { searchParams } = new URL(req.url)
    const queryPropertyId = searchParams.get('propertyId')
    let propertyId = session.user.propertyId

    if (session.user.role === 'SUPER_ADMIN') {
      propertyId = queryPropertyId || propertyId
    }

    if (!propertyId || propertyId === 'ALL') {
      return badRequest('Property context is required')
    }

    const body = await req.json()
    const { mappings } = body // Expects Array of { roomId: string, otaRoomId: string } (where otaRoomId is the Airbnb iCal Import URL)

    if (!Array.isArray(mappings)) {
      return badRequest('Mappings array is required')
    }

    // 1. Create or Update OtaConnection
    const connection = await prisma.otaConnection.upsert({
      where: {
        propertyId_otaName: {
          propertyId,
          otaName: 'AIRBNB',
        },
      },
      update: {
        status: 'CONNECTED',
        credentials: { icalUrl: '' }, // Direct mapping stores links on a per-room basis instead
      },
      create: {
        propertyId,
        otaName: 'AIRBNB',
        status: 'CONNECTED',
        credentials: { icalUrl: '' },
      },
    })

    // 2. Refresh Room Mappings
    // Delete existing mappings for this connection first
    await prisma.roomOtaMapping.deleteMany({
      where: {
        propertyId,
        otaConnectionId: connection.id,
      },
    })

    // Write new mappings
    const createdMappings = []
    for (const m of mappings) {
      if (!m.roomId || !m.otaRoomId) continue // Skip empty rows
      const created = await prisma.roomOtaMapping.create({
        data: {
          propertyId,
          roomId: m.roomId,
          otaConnectionId: connection.id,
          otaRoomId: m.otaRoomId.trim(), // Pasteur URL
        },
      })
      createdMappings.push(created)
    }

    return ok({
      message: 'Airbnb integration settings updated successfully',
      connection,
      mappings: createdMappings,
    })
  } catch (error) {
    return serverError(error, 'SETTINGS_INTEGRATIONS_AIRBNB_POST')
  }
}

/**
 * DELETE /api/admin/settings/integrations/airbnb
 * Disconnects Airbnb integration and removes mappings.
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return unauthorized()

    const { searchParams } = new URL(req.url)
    const queryPropertyId = searchParams.get('propertyId')
    let propertyId = session.user.propertyId

    if (session.user.role === 'SUPER_ADMIN') {
      propertyId = queryPropertyId || propertyId
    }

    if (!propertyId || propertyId === 'ALL') {
      return badRequest('Property context is required')
    }

    // Fetch connection to obtain ID
    const connection = await prisma.otaConnection.findUnique({
      where: {
        propertyId_otaName: {
          propertyId,
          otaName: 'AIRBNB',
        },
      },
    })

    if (!connection) return ok({ message: 'Airbnb not connected' })

    // Delete mappings and connection
    await prisma.roomOtaMapping.deleteMany({
      where: {
        propertyId,
        otaConnectionId: connection.id,
      },
    })

    await prisma.otaConnection.delete({
      where: { id: connection.id },
    })

    return ok({ message: 'Airbnb disconnected successfully' })
  } catch (error) {
    return serverError(error, 'SETTINGS_INTEGRATIONS_AIRBNB_DELETE')
  }
}
