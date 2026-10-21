import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'

export const dynamic = 'force-dynamic'

async function resolvePropertyId(req: Request, sessionUser: any, bodyPropertyId?: string): Promise<string | null> {
  const { searchParams } = new URL(req.url)
  let propertyId = bodyPropertyId || searchParams.get('propertyId')

  if (!propertyId || propertyId === 'ALL') {
    propertyId = sessionUser?.propertyId
  }

  if (!propertyId || propertyId === 'ALL') {
    const dbUser = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { workplaceId: true, ownedPropertyIds: true }
    })
    propertyId = dbUser?.workplaceId || dbUser?.ownedPropertyIds?.[0] || null
  }

  if (!propertyId || propertyId === 'ALL') {
    const firstProp = await prisma.property.findFirst({ select: { id: true } })
    propertyId = firstProp?.id || null
  }

  return propertyId
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const propertyId = await resolvePropertyId(req, session.user)
    if (!propertyId) {
      return NextResponse.json({ error: 'Property ID is required' }, { status: 400 })
    }

    const connections = await prisma.otaConnection.findMany({
      where: { propertyId },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(connections)
  } catch (error) {
    console.error('Error fetching OTA connections:', error)
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
    const { otaName, status, credentials } = body

    const propertyId = await resolvePropertyId(req, session.user, body.propertyId)
    if (!propertyId || !otaName) {
      return NextResponse.json({ error: 'Property ID and OTA Name are required' }, { status: 400 })
    }

    // Upsert the connection
    const connection = await prisma.otaConnection.upsert({
      where: {
        propertyId_otaName: {
          propertyId,
          otaName
        }
      },
      update: {
        ...(status && { status }),
        ...(credentials && { credentials }),
        lastSync: new Date(),
        updatedAt: new Date()
      },
      create: {
        propertyId,
        otaName,
        status: status || 'CONNECTED',
        credentials: credentials || {},
        lastSync: new Date()
      }
    })

    return NextResponse.json(connection)
  } catch (error) {
    console.error('Error updating OTA connection:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
