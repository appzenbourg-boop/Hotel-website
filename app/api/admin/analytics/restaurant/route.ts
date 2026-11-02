import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth/middleware'
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    try {
        console.log('[RESTAURANT_ANALYTICS] Starting comprehensive POS & restaurant analysis...')
        const authResult = await requireAuth(req, ['SUPER_ADMIN', 'HOTEL_ADMIN', 'MANAGER', 'RECEPTIONIST'])
        if (authResult instanceof NextResponse) return authResult

        const { searchParams } = new URL(req.url)
        const tab = searchParams.get('tab') || 'All Day'
        const range = searchParams.get('range') || 'month'

        // 1. Resolve active property context robustly
        let propertyId = searchParams.get('propertyId') || authResult.user.propertyId

        if (!propertyId || propertyId === 'ALL') {
            const dbUser = await prisma.user.findUnique({
                where: { id: authResult.user.id },
                select: { workplaceId: true, ownedPropertyIds: true }
            })
            propertyId = dbUser?.workplaceId || dbUser?.ownedPropertyIds?.[0] || null
        }

        if (!propertyId || propertyId === 'ALL') {
            const firstProp = await prisma.property.findFirst({ select: { id: true } })
            propertyId = firstProp?.id || null
        }

        // 2. Date Range Boundaries
        const now = new Date()
        let start: Date | null = startOfMonth(now)
        let end: Date | null = endOfMonth(now)

        if (range === 'lastMonth') {
            const last = subMonths(now, 1)
            start = startOfMonth(last)
            end = endOfMonth(last)
        } else if (range === 'quarter') {
            start = subMonths(now, 3)
            end = now
        } else if (range === 'year') {
            start = new Date(now.getFullYear(), 0, 1)
            end = now
        } else if (range === 'all') {
            start = null
            end = null
        }

        const dateFilter = start && end 
            ? { createdAt: { gte: start, lte: end } } 
            : (start ? { createdAt: { gte: start } } : {})
        const propertyFilter = propertyId ? { propertyId } : {}

        // 3. Parallel Query: Configured Menu Items, Real POS Orders with Items, and Room Service Requests
        const [menuItemsRaw, posOrdersRaw, serviceOrdersRaw] = await Promise.all([
            prisma.menuItem.findMany({
                where: propertyFilter,
                select: {
                    id: true,
                    name: true,
                    category: true,
                    price: true,
                    margin: true,
                    cuisine: true
                }
            }),
            prisma.pOSOrder.findMany({
                where: {
                    ...propertyFilter,
                    ...dateFilter,
                    status: { not: 'CANCELLED' }
                },
                include: {
                    items: true
                },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.serviceRequest.findMany({
                where: {
                    type: 'FOOD_ORDER',
                    ...dateFilter,
                    ...propertyFilter
                },
                select: {
                    id: true,
                    title: true,
                    description: true,
                    amount: true,
                    createdAt: true,
                    ratings: {
                        select: { rating: true }
                    }
                },
                orderBy: { createdAt: 'desc' }
            })
        ])

        console.log(`[RESTAURANT_ANALYTICS] Processing ${posOrdersRaw.length} POS orders, ${serviceOrdersRaw.length} service orders, and ${menuItemsRaw.length} menu items`)

        // 4. Map Menu Items for fast lookup
        const menuMap = new Map<string, typeof menuItemsRaw[0]>()
        menuItemsRaw.forEach(item => {
            const key = item.name.toLowerCase().trim()
            if (!menuMap.has(key)) {
                menuMap.set(key, item)
            }
        })

        // 5. Aggregation structures
        const itemStats = new Map<string, {
            id?: string
            name: string
            category: string
            price: number
            margin: number
            units: number
            revenue: number
            totalRating: number
            ratingCount: number
        }>()

        // Populate catalog items into itemStats with default margins
        menuItemsRaw.forEach(m => {
            const key = m.name.toLowerCase().trim()
            const estMargin = (m.margin && m.margin > 0) ? m.margin : (m.price * 0.35)
            itemStats.set(key, {
                id: m.id,
                name: m.name,
                category: m.category || 'Mains',
                price: m.price || 0,
                margin: estMargin,
                units: 0,
                revenue: 0,
                totalRating: 0,
                ratingCount: 0
            })
        })

        let totalRevenue = 0
        let totalCovers = 0
        let dineInCount = 0
        let takeawayCount = 0
        let roomDeliveryCount = 0
        const hourlyDistribution = new Array(24).fill(0)

        // Helper to infer Category from Course or Name
        const inferCategory = (courseName?: string | null, fallback = 'Mains'): string => {
            const c = (courseName || '').toUpperCase()
            if (c.includes('STARTER') || c.includes('APPETIZ') || c.includes('SOUP') || c.includes('SALAD')) return 'Starters'
            if (c.includes('DESSERT') || c.includes('SWEET') || c.includes('ICE CREAM')) return 'Desserts'
            if (c.includes('BEVERAGE') || c.includes('DRINK') || c.includes('BAR') || c.includes('COFFEE') || c.includes('TEA') || c.includes('JUICE')) return 'Beverages'
            if (c.includes('BREAKFAST')) return 'Breakfast'
            return fallback
        }

        // 6. Aggregate All POS Orders (Dine-In, Takeaway, Room POS)
        posOrdersRaw.forEach(order => {
            const orderTotal = (order.total && order.total > 0) ? order.total : (order.subtotal || 0)
            totalRevenue += orderTotal
            totalCovers++

            // Traffic channel categorization
            const tableStr = (order.table || '').toLowerCase()
            const tags = (order.tags || []).map(t => String(t).toUpperCase())
            if (tags.includes('TAKEAWAY') || tableStr.includes('takeaway')) {
                takeawayCount++
            } else if (tableStr.includes('room') || tags.includes('ROOM_SERVICE')) {
                roomDeliveryCount++
            } else {
                dineInCount++
            }

            // Track hourly peak traffic
            if (order.createdAt) {
                const hour = new Date(order.createdAt).getHours()
                hourlyDistribution[hour]++
            }

            // Aggregate items sold inside this POS order
            order.items.forEach(item => {
                const key = item.name.toLowerCase().trim()
                const qty = item.quantity || 1
                const price = item.price || 0
                const lineRevenue = price * qty

                let existing = itemStats.get(key)
                if (!existing) {
                    const menuItem = menuMap.get(key)
                    const category = menuItem?.category || inferCategory(item.course, 'Mains')
                    const margin = menuItem?.margin || (price * 0.35)
                    existing = {
                        id: menuItem?.id,
                        name: item.name,
                        category,
                        price,
                        margin,
                        units: 0,
                        revenue: 0,
                        totalRating: 0,
                        ratingCount: 0
                    }
                    itemStats.set(key, existing)
                }

                existing.units += qty
                existing.revenue += lineRevenue
            })
        })

        // 7. Aggregate Room Service / Food Service Requests
        serviceOrdersRaw.forEach(order => {
            const orderAmount = order.amount || 0
            totalRevenue += orderAmount
            totalCovers++
            roomDeliveryCount++

            if (order.createdAt) {
                const hour = new Date(order.createdAt).getHours()
                hourlyDistribution[hour]++
            }

            const textToParse = (order.description || order.title || '').toLowerCase()
            let items: string[] = []

            if (textToParse.includes('order:')) {
                const afterOrder = textToParse.split('order:')[1]
                items = afterOrder.split(',').map(i => i.trim()).filter(Boolean)
            } else if (textToParse.includes(',')) {
                items = textToParse.split(',').map(i => i.trim()).filter(Boolean)
            } else {
                items = [textToParse.trim()].filter(Boolean)
            }

            if (items.length === 0) items = ['Chef Special']

            items.forEach(rawItemStr => {
                const matchQty = rawItemStr.match(/\(x(\d+)\)/)
                const qty = matchQty ? parseInt(matchQty[1]) : 1
                const cleanName = rawItemStr.replace(/\(x\d+\)/, '').trim()
                const key = cleanName.toLowerCase()

                let existing = itemStats.get(key)
                if (!existing) {
                    const menuItem = menuMap.get(key)
                    existing = {
                        id: menuItem?.id,
                        name: cleanName || 'Chef Special',
                        category: menuItem?.category || 'Mains',
                        price: menuItem?.price || (orderAmount / Math.max(1, items.length)),
                        margin: menuItem?.margin || (menuItem?.price ? menuItem.price * 0.35 : 50),
                        units: 0,
                        revenue: 0,
                        totalRating: 0,
                        ratingCount: 0
                    }
                    itemStats.set(key, existing)
                }

                existing.units += qty
                const itemRev = existing.price ? (existing.price * qty) : (orderAmount / items.length)
                existing.revenue += itemRev

                if (order.ratings && order.ratings.length > 0) {
                    existing.totalRating += order.ratings[0].rating
                    existing.ratingCount++
                }
            })
        })

        // 8. Calculate dynamic Peak Ordering Hours
        let maxOrdersInWindow = 0
        let peakStartHour = 19
        for (let h = 0; h < 22; h++) {
            const ordersInWindow = hourlyDistribution[h] + hourlyDistribution[h + 1] + hourlyDistribution[h + 2]
            if (ordersInWindow > maxOrdersInWindow) {
                maxOrdersInWindow = ordersInWindow
                peakStartHour = h
            }
        }
        const peakHours = maxOrdersInWindow > 0
            ? `${String(peakStartHour).padStart(2, '0')}:00 - ${String(peakStartHour + 2).padStart(2, '0')}:00`
            : 'Typically 19:30 - 21:00'

        // 9. Filter items based on selected Tab (All Day, Breakfast, Lunch, Dinner)
        const allItemsList = Array.from(itemStats.values())
        const filteredItems = allItemsList.filter(item => {
            if (tab === 'All Day') return true
            const cat = (item.category || '').toLowerCase()
            if (tab === 'Breakfast') {
                return cat.includes('breakfast') || cat.includes('bakery') || cat.includes('beverage') || cat.includes('coffee')
            }
            if (tab === 'Lunch') {
                return cat.includes('lunch') || cat.includes('mains') || cat.includes('starter') || cat.includes('thali')
            }
            if (tab === 'Dinner') {
                return cat.includes('dinner') || cat.includes('mains') || cat.includes('starter') || cat.includes('dessert')
            }
            return true
        })

        const displayItems = filteredItems.length > 0 ? filteredItems : allItemsList

        // 10. Performance Matrix Classification
        const soldItems = displayItems.filter(i => i.units > 0)
        const activePool = soldItems.length > 0 ? soldItems : displayItems

        const avgUnits = activePool.length > 0 
            ? activePool.reduce((s, i) => s + i.units, 0) / activePool.length 
            : 0
        const avgMargin = activePool.length > 0 
            ? activePool.reduce((s, i) => s + i.margin, 0) / activePool.length 
            : 0

        const stars = displayItems
            .filter(i => i.units >= avgUnits && i.margin >= avgMargin)
            .sort((a, b) => b.units - a.units)
            .slice(0, 6)

        const plowhorses = displayItems
            .filter(i => i.units >= avgUnits && i.margin < avgMargin)
            .sort((a, b) => b.units - a.units)
            .slice(0, 6)

        const puzzles = displayItems
            .filter(i => i.units < avgUnits && i.margin >= avgMargin)
            .sort((a, b) => b.margin - a.margin)
            .slice(0, 6)

        const dogs = displayItems
            .filter(i => i.units < avgUnits && i.margin < avgMargin)
            .sort((a, b) => a.units - b.units)
            .slice(0, 6)

        // 11. Revenue by Category (Pie Chart Data)
        const catMap = new Map<string, number>()
        allItemsList.forEach(i => {
            const cat = i.category || 'Mains'
            catMap.set(cat, (catMap.get(cat) || 0) + i.revenue)
        })

        let categories = Array.from(catMap.entries())
            .map(([label, revenue]) => ({
                label,
                revenue,
                value: totalRevenue > 0 ? Math.round((revenue / totalRevenue) * 100) : 0
            }))
            .filter(c => c.revenue > 0)
            .sort((a, b) => b.revenue - a.revenue)

        // Fallback: If no revenue yet, show catalog categories with uniform share
        if (categories.length === 0 && menuItemsRaw.length > 0) {
            const menuCatCount = new Map<string, number>()
            menuItemsRaw.forEach(m => {
                const c = m.category || 'Mains'
                menuCatCount.set(c, (menuCatCount.get(c) || 0) + 1)
            })
            menuCatCount.forEach((count, label) => {
                categories.push({
                    label,
                    revenue: 0,
                    value: Math.round((count / menuItemsRaw.length) * 100)
                })
            })
        }

        // 12. Top Selling Items (Bar Chart Data)
        let topSelling = allItemsList
            .filter(i => i.units > 0)
            .sort((a, b) => b.units - a.units)
            .slice(0, 10)
            .map(i => ({
                name: i.name,
                units: i.units,
                revenue: i.revenue,
                progress: 0
            }))

        if (topSelling.length > 0) {
            const maxUnits = topSelling[0].units
            topSelling.forEach(i => i.progress = maxUnits > 0 ? Math.round((i.units / maxUnits) * 100) : 0)
        } else if (menuItemsRaw.length > 0) {
            // Show catalog preview so the chart is clean and never shows empty gray screen
            topSelling = menuItemsRaw.slice(0, 8).map(m => ({
                name: m.name,
                units: 0,
                revenue: 0,
                progress: 0
            }))
        }

        // 13. Underperforming Items Table
        const poorPerforming = displayItems
            .filter(item => item.units < avgUnits || (item.ratingCount > 0 && item.totalRating / item.ratingCount < 3))
            .sort((a, b) => a.units - b.units)
            .slice(0, 8)
            .map(item => ({
                id: (item.id || 'ITEM').substring(0, 8).toUpperCase(),
                name: item.name,
                category: item.category,
                sales: item.units,
                trend: item.units < avgUnits / 2 ? 'down' : 'stable',
                sentiment: item.ratingCount > 0 ? (item.totalRating / item.ratingCount) : 4.0,
                status: (item.ratingCount > 0 && item.totalRating / item.ratingCount < 2.5) ? 'REVIEW REQ.' : 'PROMOTION NEEDED'
            }))

        // 14. Live POS Sales Log / Recent Orders
        const recentPOSOrders = posOrdersRaw.slice(0, 10).map(o => ({
            id: o.id,
            orderNumber: o.orderNumber,
            table: o.table || 'Takeaway',
            guestName: o.guestName || 'Walk-in Guest',
            serverName: o.serverName || 'Staff',
            itemsCount: o.items.reduce((s, it) => s + (it.quantity || 1), 0),
            itemsList: o.items.map(it => `${it.name} (x${it.quantity || 1})`).join(', '),
            total: (o.total && o.total > 0) ? o.total : (o.subtotal || 0),
            status: o.status,
            time: format(new Date(o.createdAt), 'hh:mm a, dd MMM')
        }))

        const avgCheck = totalCovers > 0 ? Math.round(totalRevenue / totalCovers) : 0

        const responsePayload = {
            stats: {
                totalRevenue,
                avgCheck,
                totalCovers,
                peakHours,
                dineInCount,
                takeawayCount,
                roomDeliveryCount,
                posOrdersCount: posOrdersRaw.length
            },
            categories,
            matrix: { stars, plowhorses, puzzles, dogs },
            topSelling,
            poorPerforming,
            recentPOSOrders
        }

        console.log('[RESTAURANT_ANALYTICS] Success. Analyzed POS and restaurant metrics ready.')

        return NextResponse.json(responsePayload)

    } catch (error: any) {
        console.error('[RESTAURANT_ANALYTICS_ERROR]', error)
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
    }
}
