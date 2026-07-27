import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { prisma } from '@/lib/db'
import { ok, unauthorized, badRequest, serverError } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/settings/integrations
 * Returns active connections list for all OTAs for the active property.
 */
export async function GET(req: NextRequest) {
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

    // Fetch all active OTA connections
    const connections = await prisma.otaConnection.findMany({
      where: {
        propertyId,
      },
      select: {
        id: true,
        otaName: true,
        status: true,
        lastSync: true,
      },
    })

    return ok({
      connections,
    })
  } catch (error) {
    return serverError(error, 'SETTINGS_INTEGRATIONS_ALL_GET')
  }
}
