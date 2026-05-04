import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth/middleware'
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    try {
        console.log('[RESTAURANT_ANALYTICS] Starting optimized request...')
        const authResult = await requireAuth(req, ['SUPER_ADMIN', 'HOTEL_ADMIN', 'MANAGER', 'RECEPTIONIST'])
        if (authResult instanceof NextResponse) return authResult

        const { searchParams } = new URL(req.url)
        const tab = searchParams.get('tab') || 'All Day'
        const range = searchParams.get('range') || 'month'
        const propertyId = authResult.user.propertyId

        if (!propertyId && authResult.user.role !== 'SUPER_ADMIN') {
             return NextResponse.json({ error: 'Property context required' }, { status: 400 })
        }

        const now = new Date()
        let start = startOfMonth(now)
        let end = endOfMonth(now)

        if (range === 'lastMonth') {
            const last = subMonths(now, 1)
            start = startOfMonth(last)
            end = endOfMonth(last)
        } else if (range === 'quarter') {
            start = subMonths(now, 3)
        } else if (range === 'year') {
            start = new Date(now.getFullYear(), 0, 1)
        }

        // 1. Parallel Fetch - Exactly like Loyalty but for Restaurant
        console.log('[RESTAURANT_ANALYTICS] Fetching data...')
        const [menuItemsRaw, ordersRaw] = await Promise.all([
            prisma.menuItem.findMany({
                where: propertyId ? { propertyId } : {},
                select: {
                    id: true,
                    name: true,
                    category: true,
                    price: true,
                    margin: true
                }
            }),
            prisma.serviceRequest.findMany({
                where: {
                    type: 'FOOD_ORDER',
                    createdAt: { gte: start, lte: end },
                    ...(propertyId ? { propertyId } : {})
                },
                select: {
                    id: true,
                    title: true,
                    amount: true,
                    createdAt: true,
                    ratings: {
                        select: { rating: true }
                    }
                }
            })
        ])

        console.log(`[RESTAURANT_ANALYTICS] Processing ${ordersRaw.length} orders and ${menuItemsRaw.length} items`)

        // 2. Map Menu Items for O(1) lookup (The "Loyalty Method")
        const menuMap = new Map<string, typeof menuItemsRaw[0]>()
        menuItemsRaw.forEach(item => {
            const key = item.name.toLowerCase().trim()
            if (!menuMap.has(key)) {
                menuMap.set(key, item)
            }
        })

        // 3. Single Pass Aggregation
        const itemStats = new Map<string, { 
            units: number; 
            revenue: number; 
            totalRating: number; 
            ratingCount: number 
        }>()

        let totalRevenue = 0
        let totalCovers = 0

        ordersRaw.forEach(order => {
            const title = (order.title || 'Unknown').toLowerCase().trim()
            
            // If tab is selected, only process items in that category
            const menuItem = menuMap.get(title)
            if (tab !== 'All Day' && menuItem?.category !== tab) return

            totalRevenue += order.amount || 0
            totalCovers++

            if (!itemStats.has(title)) {
                itemStats.set(title, { units: 0, revenue: 0, totalRating: 0, ratingCount: 0 })
            }

            const stats = itemStats.get(title)!
            stats.units++
            stats.revenue += order.amount || 0
            
            if (order.ratings?.length > 0) {
                stats.totalRating += order.ratings[0].rating
                stats.ratingCount++
            }
        })

        // 4. Transform to Performance Matrix
        const itemPerformance = Array.from(menuMap.values()).map(item => {
            const key = item.name.toLowerCase().trim()
            const stats = itemStats.get(key) || { units: 0, revenue: 0, totalRating: 0, ratingCount: 0 }
            
            return {
                id: item.id,
                name: item.name,
                category: item.category,
                price: item.price,
                margin: item.margin || (item.price * 0.3), // Fallback margin 30%
                units: stats.units,
                revenue: stats.revenue,
                avgRating: stats.ratingCount > 0 ? stats.totalRating / stats.ratingCount : 0
            }
        })

        // Only include items that were either sold or belong to the current tab
        const filteredPerformance = itemPerformance.filter(i => {
            if (tab === 'All Day') return i.units > 0 || i.revenue > 0
            return i.category === tab
        })

        // If still empty (e.g. All Day but no sales), show top 10 items anyway to keep the UI alive
        const displayPerformance = filteredPerformance.length > 0 
            ? filteredPerformance 
            : itemPerformance.slice(0, 10)

        // 5. Classification Metrics
        const avgUnits = filteredPerformance.length > 0 
            ? filteredPerformance.reduce((s, i) => s + i.units, 0) / filteredPerformance.length 
            : 0
        const avgMargin = filteredPerformance.length > 0 
            ? filteredPerformance.reduce((s, i) => s + i.margin, 0) / filteredPerformance.length 
            : 0

        const stars = displayPerformance.filter(i => i.units >= avgUnits && i.margin >= avgMargin).sort((a, b) => b.units - a.units).slice(0, 5)
        const plowhorses = displayPerformance.filter(i => i.units >= avgUnits && i.margin < avgMargin).sort((a, b) => b.units - a.units).slice(0, 5)
        const puzzles = displayPerformance.filter(i => i.units < avgUnits && i.margin >= avgMargin).sort((a, b) => b.margin - a.margin).slice(0, 5)
        const dogs = displayPerformance.filter(i => i.units < avgUnits && i.margin < avgMargin).sort((a, b) => a.units - b.units).slice(0, 5)

        // 6. Final Category Aggregation
        const catMap = new Map<string, number>()
        displayPerformance.forEach(i => {
            catMap.set(i.category, (catMap.get(i.category) || 0) + i.revenue)
        })

        const categories = Array.from(catMap.entries())
            .map(([label, revenue]) => ({
                label,
                revenue,
                value: totalRevenue > 0 ? Math.round((revenue / totalRevenue) * 100) : 0
            }))
            .sort((a, b) => b.revenue - a.revenue)

        const topSelling = displayPerformance
            .sort((a, b) => b.units - a.units)
            .slice(0, 10)
            .map(i => ({
                name: i.name,
                units: i.units,
                progress: 0 // Will be calculated on frontend or here
            }))

        if (topSelling.length > 0) {
            const maxUnits = topSelling[0].units
            topSelling.forEach(i => i.progress = maxUnits > 0 ? Math.round((i.units / maxUnits) * 100) : 0)
        }

        const poorPerforming = displayPerformance
            .filter(item => item.units < avgUnits || item.avgRating < 3)
            .sort((a, b) => a.avgRating - b.avgRating)
            .slice(0, 5)
            .map(item => ({
                id: item.id.substring(0, 8).toUpperCase(),
                name: item.name,
                category: item.category,
                sales: item.units,
                trend: item.units < avgUnits / 2 ? 'down' : 'stable',
                sentiment: item.avgRating,
                status: item.avgRating < 2.5 ? 'REVIEW REQ.' : 'PROMOTION NEEDED'
            }))

        console.log('[RESTAURANT_ANALYTICS] Success. Response ready.')

        return NextResponse.json({
            stats: {
                totalRevenue,
                avgCheck: totalCovers > 0 ? totalRevenue / totalCovers : 0,
                totalCovers,
                peakHours: 'Typically 19:30 - 21:00'
            },
            categories,
            matrix: { stars, plowhorses, puzzles, dogs },
            topSelling,
            poorPerforming
        })

    } catch (error: any) {
        console.error('[RESTAURANT_ANALYTICS_ERROR]', error)
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
    }
}
