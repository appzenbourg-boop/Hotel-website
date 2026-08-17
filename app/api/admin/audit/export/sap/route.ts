import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const propertyId = (session.user as any).propertyId
        if (!propertyId) {
            return NextResponse.json({ error: 'No property selected' }, { status: 400 })
        }

        const today = new Date()
        const startOfDay = new Date(today.setHours(0, 0, 0, 0))
        const endOfDay = new Date(today.setHours(23, 59, 59, 999))
        const dateStr = today.toISOString().split('T')[0]

        // Get all transactions for export (in a real system, this might be filtered by date range, but we want to ensure data shows up)
        const transactions = await prisma.ledgerTransaction.findMany({
            where: {
                propertyId
            },
            orderBy: { timestamp: 'asc' }
        })

        // Generate CSV
        let csv = `Date,TransactionID,Category,Type,Amount,Description\n`
        
        for (const t of transactions) {
            // Escape quotes and commas in description
            const desc = `"${(t.description || '').replace(/"/g, '""')}"`
            csv += `${t.timestamp.toISOString()},${t.id},${t.category},${t.type},${t.amount},${desc}\n`
        }

        return new NextResponse(csv, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="SAP_Ledger_${dateStr}.csv"`
            }
        })
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
