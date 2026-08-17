import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'

export async function POST(req: Request) {
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

        const { destination } = await req.json()

        // Fetch pending LedgerTransactions that haven't been synced (we mock this by just taking latest 50 for now)
        const transactions = await prisma.ledgerTransaction.findMany({
            where: { propertyId: property.id },
            take: 50,
            orderBy: { timestamp: 'desc' }
        })

        // Create ERPSyncLog
        const isSuccess = Math.random() > 0.1 // 90% success rate mock

        const syncLog = await prisma.eRPSyncLog.create({
            data: {
                propertyId: property.id,
                batchId: `SYNC-${new Date().getTime()}`,
                destination: destination || 'TALLY_PRIME',
                recordCount: transactions.length,
                status: isSuccess ? 'SUCCESS' : 'FAILED',
                errorLog: isSuccess ? null : { error: "Network Timeout to ERP Server" }
            }
        })

        return NextResponse.json({ message: "Sync executed", syncLog })

    } catch (error) {
        console.error('Failed to sync ERP:', error)
        return NextResponse.json({ error: "Failed to sync ERP" }, { status: 500 })
    }
}
