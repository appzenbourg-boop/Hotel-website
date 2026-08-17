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
            return NextResponse.json({ 
                monthlyData: [], 
                ytdRevenue: 0, 
                projectedRevenue: 0 
            })
        }

        // Just aggregate recent LedgerTransactions as a simple example
        // In reality, this would aggregate Bookings and ServiceRequests over months
        
        const transactions = await prisma.ledgerTransaction.findMany({
            where: { propertyId, status: 'COMPLETED' },
            select: { amount: true, type: true, timestamp: true }
        })

        // Group by month
        const monthlyRevenue: Record<string, { income: number, expense: number }> = {}
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        
        months.forEach(m => monthlyRevenue[m] = { income: 0, expense: 0 })

        transactions.forEach(t => {
            const m = months[t.timestamp.getMonth()]
            if (t.type === 'CREDIT') {
                monthlyRevenue[m].income += t.amount
            } else {
                monthlyRevenue[m].expense += Math.abs(t.amount)
            }
        })

        const monthlyData = months.map(m => ({
            name: m,
            Revenue: monthlyRevenue[m].income,
            Expenses: monthlyRevenue[m].expense
        }))

        const ytdRevenue = transactions
            .filter(t => t.type === 'CREDIT')
            .reduce((sum, t) => sum + t.amount, 0)
            
        const projectedRevenue = ytdRevenue * 1.15 // simple mock projection

        const property = await prisma.property.findUnique({
            where: { id: propertyId },
            select: { policies: true }
        })

        const scheduledAudits = (property?.policies as any)?.auditSchedules || [
            { title: 'Monthly Closing Reconciliation', nextRun: 'Oct 31, 23:59', recipient: 'Board', status: 'Active', progress: 85 },
            { title: 'OTA Commission Integrity', nextRun: 'Nov 01, 08:00', recipient: 'Regional Manager', status: 'Pending', progress: 0 },
            { title: 'Nightly Void Exceptions', nextRun: 'Oct 25, 03:00', recipient: 'Audit Team', status: 'Delayed', progress: 0 }
        ]

        return NextResponse.json({
            monthlyData,
            ytdRevenue,
            projectedRevenue,
            scheduledAudits
        })
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
