import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { prisma } from '@/lib/db'
import { syncAllStayInRoomsToChannex } from '@/lib/channex'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    let propertyId = body.propertyId || (session.user as any).propertyId

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

    const syncResult = await syncAllStayInRoomsToChannex(propertyId)

    return NextResponse.json({
      success: true,
      message: 'Successfully synchronized all StayIn room types with Channex!',
      data: syncResult
    })
  } catch (error: any) {
    console.error('[CHANNEX_SYNC_API_ERROR]', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to sync with Channex'
    }, { status: 500 })
  }
}

