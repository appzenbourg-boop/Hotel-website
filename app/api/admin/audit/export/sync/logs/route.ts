import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const property = await prisma.property.findFirst({
            where: { ownerIds: { has: session.user.id } }
        })

        if (!property) {
            return NextResponse.json({ error: "Property not found" }, { status: 404 })
        }

        const logs = await prisma.eRPSyncLog.findMany({
            where: { propertyId: property.id },
            orderBy: { createdAt: 'desc' },
            take: 20
        })

        return NextResponse.json(logs)

    } catch (error) {
        console.error('Failed to fetch sync logs:', error)
        return NextResponse.json({ error: "Failed to fetch sync logs" }, { status: 500 })
    }
}
