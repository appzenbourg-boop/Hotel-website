import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { startOfDay, startOfMonth, startOfYear, endOfDay } from 'date-fns'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) return new NextResponse('Unauthorized', { status: 401 })

        const { searchParams } = new URL(req.url)
        const dateStr = searchParams.get('date') || new Date().toISOString()
        const reportType = searchParams.get('type') || 'business_source'
        const propertyId = searchParams.get('propertyId')

        const targetDate = new Date(dateStr)
        const todayStart = startOfDay(targetDate)
        const todayEnd = endOfDay(targetDate)
        const mtdStart = startOfMonth(targetDate)
        const ytdStart = startOfYear(targetDate)

        const bookings = await prisma.booking.findMany({
            where: {
                checkIn: { gte: ytdStart, lte: todayEnd },
                status: { in: ['CHECKED_IN', 'CHECKED_OUT', 'RESERVED'] }
            },
            include: {
                room: true
            }
        })

        const aggregate = (getCategory: (b: any) => string) => {
            const result: Record<string, any> = {}

            bookings.forEach(b => {
                const category = getCategory(b) || 'Unknown'
                if (!result[category]) {
                    result[category] = {
                        name: category,
                        today: { pax: 0, occ: 0, rev: 0, rate: 0, pct: 0 },
                        mtd: { pax: 0, occ: 0, rev: 0, rate: 0, arr: 0, arp: 0, rpp: 0 },
                        ytd: { pax: 0, occ: 0, rev: 0, rate: 0, pct: 0 }
                    }
                }

                const isToday = b.checkIn >= todayStart && b.checkIn <= todayEnd
                const isMTD = b.checkIn >= mtdStart && b.checkIn <= todayEnd
                const isYTD = b.checkIn >= ytdStart && b.checkIn <= todayEnd

                const addStats = (period: string) => {
                    result[category][period].pax += b.numberOfGuests || 1
                    result[category][period].occ += 1
                    const rawRev = Number(b.totalAmount) || 0
                    // Sanity check: ensure valid finite number and cap at 10 Crore per booking to prevent corrupted inputs
                    const safeRev = !isFinite(rawRev) || isNaN(rawRev) ? 0 : Math.min(Math.max(rawRev, 0), 100_000_000)
                    result[category][period].rev += safeRev
                }

                if (isToday) addStats('today')
                if (isMTD) addStats('mtd')
                if (isYTD) addStats('ytd')
            })

            const totalYtdOcc = Object.values(result).reduce((sum, r) => sum + r.ytd.occ, 0)
            const totalMtdOcc = Object.values(result).reduce((sum, r) => sum + r.mtd.occ, 0)
            const totalTodayOcc = Object.values(result).reduce((sum, r) => sum + r.today.occ, 0)

            return Object.values(result).map(r => {
                r.today.rate = r.today.occ ? r.today.rev / r.today.occ : 0
                r.today.pct = totalTodayOcc ? (r.today.occ / totalTodayOcc) * 100 : 0

                r.mtd.rate = r.mtd.occ ? r.mtd.rev / r.mtd.occ : 0
                r.mtd.arr = r.mtd.rate
                r.mtd.arp = r.mtd.pax ? r.mtd.rev / r.mtd.pax : 0
                r.mtd.rpp = r.mtd.pax ? r.mtd.rev / r.mtd.pax * 0.9 : 0 // mockup

                r.ytd.rate = r.ytd.occ ? r.ytd.rev / r.ytd.occ : 0
                r.ytd.pct = totalYtdOcc ? (r.ytd.occ / totalYtdOcc) * 100 : 0

                return r
            })
        }

        let data: any[] = []

        if (reportType === 'business_source') {
            data = aggregate(b => b.source)
        } else if (reportType === 'market_segment') {
            data = aggregate(b => b.marketSegment || 'Standard')
        } else if (reportType === 'corporate') {
            data = aggregate(b => b.billTo === 'COMPANY' ? 'Corporate' : 'Non-Corporate')
        } else if (reportType === 'booker') {
            data = aggregate(b => 'Direct Booker') 
        } else if (reportType === 'room_type') {
            data = aggregate(b => b.room?.type || 'Standard')
        }

        return NextResponse.json({ data })

    } catch (error) {
        console.error(error)
        return new NextResponse('Internal Error', { status: 500 })
    }
}
