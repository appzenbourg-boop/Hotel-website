import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { prisma } from '@/lib/db'
import { ok, unauthorized, badRequest, serverError } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

function normalizeOtaName(slug: string): string {
  return slug.toUpperCase().replace('-', '_')
}

/**
 * GET /api/admin/settings/integrations/[ota]
 * Fetches connection status and room mappings for a specific OTA.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { ota: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return unauthorized()

    const otaName = normalizeOtaName(params.ota)
    const { searchParams } = new URL(req.url)
    const queryPropertyId = searchParams.get('propertyId')
    let propertyId = session.user.propertyId

    if (session.user.role === 'SUPER_ADMIN') {
      propertyId = queryPropertyId || propertyId
    }

    if (!propertyId || propertyId === 'ALL') {
      return badRequest('Property context is required')
    }

    // 1. Fetch OTA Connection
    const connection = await prisma.otaConnection.findUnique({
      where: {
        propertyId_otaName: {
          propertyId,
          otaName,
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
    return serverError(error, `SETTINGS_INTEGRATIONS_OTA_GET_${params.ota}`)
  }
}

/**
 * POST /api/admin/settings/integrations/[ota]
 * Creates or updates connection credentials and mappings for an OTA.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { ota: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return unauthorized()

    const otaName = normalizeOtaName(params.ota)
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
    const { credentials, mappings } = body

    if (!Array.isArray(mappings)) {
      return badRequest('Mappings array is required')
    }

    // 1. Upsert connection
    const connection = await prisma.otaConnection.upsert({
      where: {
        propertyId_otaName: {
          propertyId,
          otaName,
        },
      },
      update: {
        status: 'CONNECTED',
        credentials: credentials || {},
      },
      create: {
        propertyId,
        otaName,
        status: 'CONNECTED',
        credentials: credentials || {},
      },
    })

    // 2. Clear old mappings
    await prisma.roomOtaMapping.deleteMany({
      where: {
        propertyId,
        otaConnectionId: connection.id,
      },
    })

    // Write new mappings
    const createdMappings = []
    for (const m of mappings) {
      if (!m.roomId || !m.otaRoomId) continue
      const created = await prisma.roomOtaMapping.create({
        data: {
          propertyId,
          roomId: m.roomId,
          otaConnectionId: connection.id,
          otaRoomId: m.otaRoomId.trim(),
          ratePlanCode: m.ratePlanCode || 'BAR',
        },
      })
      createdMappings.push(created)
    }

    // Sync to PropertySettings if otaName is RAZORPAY
    if (otaName === 'RAZORPAY' && credentials) {
      const keyId = credentials.keyId || credentials.key_id || credentials.razorpayKeyId
      const keySecret = credentials.keySecret || credentials.key_secret || credentials.razorpayKeySecret
      if (keyId && keySecret) {
        try {
          await prisma.propertySettings.upsert({
            where: { propertyId },
            update: { razorpayKeyId: keyId.trim(), razorpayKeySecret: keySecret.trim() },
            create: { propertyId, razorpayKeyId: keyId.trim(), razorpayKeySecret: keySecret.trim() },
          })
        } catch (e) {
          console.error('Failed to sync Razorpay keys to PropertySettings:', e)
        }
      }
    }

    return ok({
      message: `${otaName} integration status updated`,
      connection,
      mappings: createdMappings,
    })
  } catch (error) {
    return serverError(error, `SETTINGS_INTEGRATIONS_OTA_POST_${params.ota}`)
  }
}

/**
 * DELETE /api/admin/settings/integrations/[ota]
 * Disconnects an OTA and removes mappings.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { ota: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return unauthorized()

    const otaName = normalizeOtaName(params.ota)
    const { searchParams } = new URL(req.url)
    const queryPropertyId = searchParams.get('propertyId')
    let propertyId = session.user.propertyId

    if (session.user.role === 'SUPER_ADMIN') {
      propertyId = queryPropertyId || propertyId
    }

    if (!propertyId || propertyId === 'ALL') {
      return badRequest('Property context is required')
    }

    const connection = await prisma.otaConnection.findUnique({
      where: {
        propertyId_otaName: {
          propertyId,
          otaName,
        },
      },
    })

    if (!connection) return ok({ message: 'OTA is not connected' })

    // Delete mappings & connection
    await prisma.roomOtaMapping.deleteMany({
      where: {
        propertyId,
        otaConnectionId: connection.id,
      },
    })

    await prisma.otaConnection.delete({
      where: { id: connection.id },
    })

    return ok({ message: `${otaName} disconnected successfully` })
  } catch (error) {
    return serverError(error, `SETTINGS_INTEGRATIONS_OTA_DELETE_${params.ota}`)
  }
}
