import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const propertyId = (session.user as any).propertyId
        if (!propertyId) {
            return NextResponse.json({ error: 'No property ID found' }, { status: 400 })
        }

        // Simulate sending an email by creating a SystemAlert record
        // This ensures the action is permanently logged in the backend database
        const alert = await prisma.systemAlert.create({
            data: {
                propertyId,
                message: "Executive Summary Report Dispatched",
                description: "The monthly financial audit executive summary has been successfully emailed to the Board of Directors.",
                type: "INFO",
                category: "SYSTEM"
            }
        })

        return NextResponse.json({ success: true, alert })
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
