import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth/middleware'
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    try {
        const authResult = await requireAuth(req, ['SUPER_ADMIN', 'HOTEL_ADMIN', 'MANAGER', 'RECEPTIONIST'])
        if (authResult instanceof NextResponse) return authResult

        const propertyId = authResult.user.propertyId
        if (!propertyId && authResult.user.role !== 'SUPER_ADMIN') {
             return NextResponse.json({ error: 'Property context required' }, { status: 400 })
        }

        // 1. Fetch all bookings for the property to analyze guest loyalty
        const bookings = await prisma.booking.findMany({
            where: propertyId ? { propertyId } : {},
            include: {
                guest: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                    }
                }
            }
        })

        // 2. Group by Guest
        const guestStats: Record<string, { 
            name: string; 
            email: string; 
            stays: number; 
            spent: number; 
            lastVisit: Date;
            sources: Set<string>;
        }> = {}

        let totalRevenue = 0
        bookings.forEach(b => {
            if (!b.guest) return
            const gid = b.guestId
            if (!guestStats[gid]) {
                guestStats[gid] = { 
                    name: b.guest.name, 
                    email: b.guest.email || 'N/A', 
                    stays: 0, 
                    spent: 0, 
                    lastVisit: b.checkIn,
                    sources: new Set()
                }
            }
            guestStats[gid].stays += 1
            guestStats[gid].spent += b.totalAmount
            if (b.checkIn > guestStats[gid].lastVisit) {
                guestStats[gid].lastVisit = b.checkIn
            }
            guestStats[gid].sources.add(b.source)
            totalRevenue += b.totalAmount
        })

        const guests = Object.values(guestStats)
        const totalGuests = guests.length
        const repeatGuests = guests.filter(g => g.stays > 1)
        const repeatGuestCount = repeatGuests.length
        const repeatRate = totalGuests > 0 ? Math.round((repeatGuestCount / totalGuests) * 100) : 0
        
        const loyaltyRevenue = repeatGuests.reduce((sum, g) => sum + g.spent, 0)
        const loyaltyRevenuePercent = totalRevenue > 0 ? Math.round((loyaltyRevenue / totalRevenue) * 100) : 0
        const avgLTV = totalGuests > 0 ? totalRevenue / totalGuests : 0

        // 3. Top Guests Ranking
        const topGuests = guests
            .sort((a, b) => b.spent - a.spent)
            .slice(0, 10)
            .map(g => {
                let tier = 'BRONZE'
                let color = 'text-orange-400'
                let bg = 'bg-orange-400/10'
                let border = 'border-orange-400/20'

                if (g.spent > 50000 || g.stays > 10) {
                    tier = 'PLATINUM'
                    color = 'text-cyan-400'
                    bg = 'bg-cyan-400/10'
                    border = 'border-cyan-400/20'
                } else if (g.spent > 20000 || g.stays > 5) {
                    tier = 'GOLD'
                    color = 'text-amber-400'
                    bg = 'bg-amber-400/10'
                    border = 'border-amber-400/20'
                } else if (g.spent > 10000 || g.stays > 2) {
                    tier = 'SILVER'
                    color = 'text-slate-400'
                    bg = 'bg-slate-400/10'
                    border = 'border-slate-400/20'
                }

                return {
                    ...g,
                    tier,
                    color,
                    bg,
                    border
                }
            })

        // 4. Chart Data (Last 6 Months) - Optimized
        const chartData = []
        // Pre-map guest's first visit date for efficient repeat visitor checking
        const guestFirstVisitMap = new Map<string, number>()
        bookings.forEach(b => {
            const time = b.createdAt.getTime()
            if (!guestFirstVisitMap.has(b.guestId) || time < guestFirstVisitMap.get(b.guestId)!) {
                guestFirstVisitMap.set(b.guestId, time)
            }
        })

        for (let i = 5; i >= 0; i--) {
            const mDate = subMonths(new Date(), i)
            const mStart = startOfMonth(mDate)
            const mEnd = endOfMonth(mDate)
            
            const monthBookings = bookings.filter(b => b.createdAt >= mStart && b.createdAt <= mEnd)
            let repeatCount = 0
            monthBookings.forEach(b => {
                const firstVisit = guestFirstVisitMap.get(b.guestId)
                if (firstVisit && firstVisit < b.createdAt.getTime()) {
                    repeatCount++
                }
            })

            chartData.push({
                month: format(mDate, 'MMM'),
                repeat: repeatCount,
                firstTime: monthBookings.length - repeatCount
            })
        }

        // 5. Booking Source breakdown (real data)
        const sourceCount: Record<string, number> = {}
        bookings.forEach(b => {
            const src = b.source || 'DIRECT'
            sourceCount[src] = (sourceCount[src] || 0) + 1
        })
        const totalBookings = bookings.length || 1
        const bookingSources = Object.entries(sourceCount)
            .map(([source, count]) => ({
                label: source.replace(/_/g, ' '),
                value: Math.round((count / totalBookings) * 100),
                count,
            }))
            .sort((a, b) => b.count - a.count)

        // 6. Tier distribution
        const tierCounts = { BRONZE: 0, SILVER: 0, GOLD: 0, PLATINUM: 0 }
        topGuests.forEach(g => {
            tierCounts[g.tier as keyof typeof tierCounts] = (tierCounts[g.tier as keyof typeof tierCounts] || 0) + 1
        })

        return NextResponse.json({
            stats: {
                repeatRate,
                repeatGuestCount,
                loyaltyRevenue,
                loyaltyRevenuePercent,
                avgLTV,
                totalGuests
            },
            topGuests,
            chartData,
            bookingSources,
            tierCounts,
        })

    } catch (error: any) {
        console.error('[LOYALTY_ANALYTICS_ERROR]', error)
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
    }
}
