import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { prisma } from '@/lib/db'
import { ok, unauthorized, badRequest, serverError } from '@/lib/api-response'
import { syncPropertyAirbnb } from '@/lib/airbnb-sync'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/settings/integrations/airbnb/sync
 * Triggers manual import synchronization of Airbnb calendars.
 */
export async function POST(req: NextRequest) {
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

    // Call the shared sync function
    const syncResult = await syncPropertyAirbnb(propertyId)

    if (syncResult.errors.length > 0 && syncResult.created === 0 && syncResult.updated === 0 && syncResult.canceled === 0) {
      return badRequest('Sync failed', { errors: syncResult.errors })
    }

    return ok({
      message: 'Sync completed',
      summary: {
        created: syncResult.created,
        updated: syncResult.updated,
        canceled: syncResult.canceled,
      },
      errors: syncResult.errors,
    })
  } catch (error) {
    return serverError(error, 'SETTINGS_INTEGRATIONS_AIRBNB_SYNC_POST')
  }
}
