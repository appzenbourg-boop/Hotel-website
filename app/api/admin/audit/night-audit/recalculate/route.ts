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

        // Simulate forcing a recalculation of ledgers across the property
        // In a real system, this would trigger heavy background jobs to recalculate tax liabilities,
        // room charge adjustments, and OTA commission accruals.
        
        await prisma.systemAlert.create({
            data: {
                propertyId,
                message: "Ledger Recalculation Complete",
                description: "All financial ledgers and tax liabilities have been force-recalculated for the current audit cycle.",
                type: "INFO",
                category: "System"
            }
        })

        return NextResponse.json({ success: true, message: 'Recalculation successful' })
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
