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
            return NextResponse.json({ transactions: [], stats: { totalVolume: 0, flaggedItems: 0, verifiedRate: 100 } })
        }

        const { searchParams } = new URL(req.url)
        const type = searchParams.get('type') || 'all'
        const category = searchParams.get('category') || 'all'
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '20')
        const query = searchParams.get('query') || ''

        let filter: any = { propertyId }
        if (type !== 'all') {
            filter.type = type.toUpperCase()
        }
        if (category !== 'all') {
            filter.category = category.toUpperCase()
        }
        if (query) {
            filter.OR = [
                { description: { contains: query, mode: 'insensitive' } },
                { referenceId: { contains: query, mode: 'insensitive' } }
            ]
        }

        const skip = (page - 1) * limit
        
        const [transactions, totalItems] = await prisma.$transaction([
            prisma.ledgerTransaction.findMany({
                where: filter,
                orderBy: { timestamp: 'desc' },
                skip,
                take: limit,
                include: { booking: true, postedBy: { select: { name: true } } }
            }),
            prisma.ledgerTransaction.count({ where: filter })
        ])

        // Stats (simplified based on current page for brevity, or we can just omit if not needed)
        const totalVolume = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0)
        const flaggedItems = 0
        const verifiedRate = 100

        return NextResponse.json({
            transactions,
            pagination: {
                page,
                limit,
                totalItems,
                totalPages: Math.ceil(totalItems / limit)
            },
            stats: {
                totalVolume,
                flaggedItems,
                verifiedRate
            }
        })
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
