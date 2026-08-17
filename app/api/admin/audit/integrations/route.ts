import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const propertyId = (session.user as any).propertyId

        if (!propertyId) {
            return NextResponse.json({ integrations: [], lastSync: null })
        }

        const integrations = await prisma.eRPIntegration.findMany({
            where: { propertyId },
            orderBy: { lastSyncAt: 'desc' }
        })

        const lastSync = integrations.length > 0 ? integrations[0].lastSyncAt : null

        return NextResponse.json({
            integrations,
            lastSync
        })
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}

export async function PATCH(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        const propertyId = (session.user as any).propertyId
        if (!propertyId) return NextResponse.json({ error: 'No property' }, { status: 400 })

        const { id, status, config } = await req.json()
        
        const updated = await prisma.eRPIntegration.update({
            where: { id, propertyId },
            data: { status, config }
        })

        return NextResponse.json(updated)
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        const propertyId = (session.user as any).propertyId
        if (!propertyId) return NextResponse.json({ error: 'No property' }, { status: 400 })

        const { provider } = await req.json()

        const existing = await prisma.eRPIntegration.findUnique({
            where: { propertyId_provider: { propertyId, provider } }
        })

        if (existing) {
            return NextResponse.json({ error: 'Integration already exists' }, { status: 400 })
        }

        const newIntegration = await prisma.eRPIntegration.create({
            data: {
                propertyId,
                provider,
                status: 'ACTIVE',
                config: { autoSync: true, endpoint: 'https://api.example.com' }
            }
        })

        return NextResponse.json(newIntegration)
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}

