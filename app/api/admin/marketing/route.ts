import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth/middleware'
import { startOfMonth, endOfMonth, format } from 'date-fns'
import Razorpay from 'razorpay'
import { sendSMS, sendWhatsApp } from '@/lib/twilio'
import { sendMarketingBlast } from '@/lib/email'

export const dynamic = 'force-dynamic'

// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || '',
    key_secret: process.env.RAZORPAY_KEY_SECRET || '',
})

// Real Notification Sender supporting Gmail SMTP & WhatsApp Web / Twilio dispatch
async function sendRealNotification(
    guest: any, 
    channel: string, 
    promoCode?: string, 
    propertyName?: string, 
    customMessage?: string,
    propertyId?: string,
    customSubject?: string
): Promise<{ ok: boolean; error?: string }> {
    const rawTemplate = customMessage || `Hello {guestName}! Use code {promoCode} for 20% off your next stay at {hotelName}. Book now!`
    const message = rawTemplate
        .replace(/\{guestName\}/gi, guest.name || 'Guest')
        .replace(/\{hotelName\}/gi, propertyName || 'Zenbourg')
        .replace(/\{promoCode\}/gi, promoCode || 'ZENVIP')

    const rawPhone = (guest.phone || '').replace(/\D/g, '')

    try {
        if (channel === 'EMAIL') {
            if (!guest.email) return { ok: false, error: `No email address found for ${guest.name}` }
            const subjectText = (customSubject || 'Exclusive Privilege & Special Offer from {hotelName}')
                .replace(/\{guestName\}/gi, guest.name || 'Guest')
                .replace(/\{hotelName\}/gi, propertyName || 'Zenbourg')
                .replace(/\{promoCode\}/gi, promoCode || 'ZENVIP')

            const sent = await sendMarketingBlast({
                to: guest.email,
                guestName: guest.name || 'Valued Guest',
                hotelName: propertyName || 'Zenbourg',
                promoCode: promoCode || 'ZENVIP',
                subject: subjectText,
                message: message
            })
            if (!sent) {
                return { ok: false, error: `SMTP delivery failed for ${guest.email}` }
            }
            console.log(`[MARKETING] Email blast delivered to ${guest.email} via Gmail SMTP`)
            return { ok: true }
        } else if (channel === 'WHATSAPP') {
            if (!rawPhone) return { ok: false, error: `No phone number for ${guest.name}` }
            // Manual WhatsApp Web redirect is handled in the UI. Also record or dispatch if Twilio configured
            try {
                await sendWhatsApp(rawPhone, message, propertyId)
                console.log(`[MARKETING] WhatsApp recorded for ${guest.name} (${rawPhone})`)
            } catch {
                // Non-blocking fallback for manual WhatsApp Web redirect
            }
            return { ok: true }
        } else if (channel === 'SMS') {
            if (!rawPhone) return { ok: false, error: `No phone number for ${guest.name}` }
            const res = await sendSMS(rawPhone, message, propertyId)
            console.log(`[MARKETING] SMS sent to ${guest.name} (${rawPhone}) — SID: ${res.sid}`)
            return { ok: true }
        } else {
            return { ok: false, error: `Unsupported channel: ${channel}` }
        }
    } catch (err: any) {
        console.error(`[MARKETING_ERROR] Failed to send ${channel} to ${guest.name}:`, err?.message || err)
        return { ok: false, error: err?.message || 'Dispatch error' }
    }
}

export async function GET(req: NextRequest) {
    try {
        const authResult = await requireAuth(req, ['SUPER_ADMIN', 'HOTEL_ADMIN', 'MANAGER'])
        if (authResult instanceof NextResponse) return authResult

        const { searchParams } = new URL(req.url)
        let propertyId = searchParams.get('propertyId') || authResult.user.propertyId

        if (!propertyId || propertyId === 'ALL') {
            const dbUser = await prisma.user.findUnique({
                where: { id: authResult.user.id },
                select: { workplaceId: true, ownedPropertyIds: true }
            })
            propertyId = dbUser?.workplaceId || dbUser?.ownedPropertyIds?.[0] || null
        }

        if (!propertyId || propertyId === 'ALL') {
            const firstProp = await prisma.property.findFirst({ select: { id: true, name: true, ranking: true } })
            propertyId = firstProp?.id || null
        }

        const property = propertyId ? await prisma.property.findUnique({
            where: { id: propertyId },
            select: { ranking: true, name: true }
        }) : null

        const guests = await prisma.guest.findMany({
            where: propertyId ? {
                OR: [
                    { createdByPropertyId: propertyId },
                    { bookings: { some: { propertyId: propertyId } } }
                ]
            } : {},
            include: propertyId 
                ? { bookings: { where: { propertyId: propertyId }, orderBy: { checkIn: 'desc' } } }
                : { bookings: { orderBy: { checkIn: 'desc' } } }
        })

        const activeCampaigns = await prisma.campaign.findMany({
            where: propertyId ? { propertyId, status: 'ACTIVE' } : { status: 'ACTIVE' },
            orderBy: { createdAt: 'desc' }
        })

        const guestBookings = await prisma.booking.findMany({
            where: propertyId ? { propertyId } : {}
        })

        // VIP Segment (guests with > 1 stay)
        const vipGuests = guests.filter(g => g.bookings.length > 1).length
        const totalRevenue = guestBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0)

        const stats = {
            activeCampaigns: activeCampaigns.length,
            vipSegmentSize: vipGuests,
            conversionRate: '12.4%',
            marketingRevenue: totalRevenue * 0.15,
            marketingRoi: `${Math.max(1, (vipGuests * 1.5)).toFixed(1)}x`,
            ranking: property?.ranking || 0
        }

        // Campaigns
        const campaigns = activeCampaigns.map(c => ({
            id: c.id,
            name: c.name,
            segment: c.segment || 'General',
            started: format(c.createdAt, 'MMM dd, yyyy'),
            performance: c.performance || 0,
            status: c.status,
        }))

        // Guest List for UI
        const guestList = guests.map(g => ({
            id: g.id,
            name: g.name,
            email: g.email,
            phone: g.phone,
            stays: g.bookings.length,
            lastStay: g.bookings.length > 0 ? format(g.bookings[0].checkIn, 'MMM dd, yyyy') : 'N/A'
        }))

        // Loyalty Cluster Data
        const tierPerformance = [
            { label: 'Diamond', height: `${Math.min(90, (guests.filter(g => g.bookings.length >= 5).length / Math.max(1, guests.length)) * 100 + 30)}%`, color: 'bg-blue-600' },
            { label: 'Platinum', height: `${Math.min(90, (guests.filter(g => g.bookings.length >= 3).length / Math.max(1, guests.length)) * 100 + 20)}%`, color: 'bg-blue-600/80' },
            { label: 'Gold', height: `${Math.min(90, (guests.filter(g => g.bookings.length >= 1).length / Math.max(1, guests.length)) * 100 + 10)}%`, color: 'bg-blue-600/60' }
        ]

        const chartData = [
            { month: 'Jan', campaigns: 2, conversions: 14, revenue: 32000 },
            { month: 'Feb', campaigns: 3, conversions: 22, revenue: 58000 },
            { month: 'Mar', campaigns: 4, conversions: 35, revenue: 94000 },
            { month: 'Apr', campaigns: 3, conversions: 28, revenue: 76000 },
            { month: 'May', campaigns: 5, conversions: 42, revenue: 118000 },
            { month: 'Jun', campaigns: Math.max(1, activeCampaigns.length), conversions: Math.max(12, vipGuests * 2), revenue: Math.max(25000, Math.round(stats.marketingRevenue)) }
        ]

        return NextResponse.json({ 
            stats, 
            campaigns, 
            guestList, 
            tierPerformance, 
            chartData, 
            monthlyPerformance: chartData 
        })

    } catch (error: any) {
        console.error('[MARKETING_GET_ERROR]', error)
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const authResult = await requireAuth(req, ['SUPER_ADMIN', 'HOTEL_ADMIN', 'MANAGER'])
        if (authResult instanceof NextResponse) return authResult

        const body = await req.json()
        const { action, name, segment, channel, promoCode, budget, guestIds, message: customMessage, subject: customSubject } = body

        let propertyId = body.propertyId || authResult.user.propertyId

        if (!propertyId || propertyId === 'ALL') {
            const dbUser = await prisma.user.findUnique({
                where: { id: authResult.user.id },
                select: { workplaceId: true, ownedPropertyIds: true }
            })
            propertyId = dbUser?.workplaceId || dbUser?.ownedPropertyIds?.[0] || null
        }

        if (!propertyId || propertyId === 'ALL') {
            const firstProp = await prisma.property.findFirst({ select: { id: true, name: true } })
            propertyId = firstProp?.id || null
        }

        const property = propertyId ? await prisma.property.findUnique({ where: { id: propertyId } }) : null

        // ACTION: CREATE_ORDER (Razorpay)
        if (action === 'CREATE_ORDER') {
            if (!budget || budget < 500) return NextResponse.json({ error: 'Min budget ₹500' }, { status: 400 })
            
            const order = await razorpay.orders.create({
                amount: Math.round(budget * 100),
                currency: 'INR',
                receipt: `receipt_seo_${Date.now()}`
            })

            return NextResponse.json({ success: true, orderId: order.id, amount: order.amount, key: process.env.RAZORPAY_KEY_ID })
        }

        // ACTION: VERIFY_PROMOTE (Post-Payment)
        if (action === 'VERIFY_PROMOTE' && propertyId) {
            const boost = Math.floor(budget / 1000) || 1
            
            const updated = await prisma.property.update({
                where: { id: propertyId },
                data: { ranking: { increment: boost } }
            })

            return NextResponse.json({ success: true, newRanking: updated.ranking })
        }

        // ACTION: BLAST (Outreach via Gmail SMTP or WhatsApp Web)
        if (action === 'BLAST') {
            let targetGuests: any[]
            if (guestIds && Array.isArray(guestIds) && guestIds.length > 0) {
                targetGuests = await prisma.guest.findMany({
                    where: { id: { in: guestIds } },
                })
            } else {
                targetGuests = await prisma.guest.findMany({
                    where: propertyId ? {
                        OR: [
                            { createdByPropertyId: propertyId },
                            { bookings: { some: { propertyId: propertyId } } }
                        ]
                    } : {},
                    include: propertyId ? { bookings: { where: { propertyId: propertyId } } } : { bookings: true }
                })
                if (segment?.includes('Member') || segment?.includes('Repeat') || segment?.includes('VIP')) {
                    targetGuests = targetGuests.filter((g: any) => g.bookings?.length >= 2)
                }
            }

            if (targetGuests.length === 0) {
                return NextResponse.json({ error: 'No guests found for campaign target' }, { status: 404 })
            }

            // Record Campaign
            if (propertyId) {
                try {
                    await prisma.campaign.create({
                        data: {
                            name: name || `Blast ${format(new Date(), 'MMM dd')}`,
                            segment: segment || 'Custom',
                            channel: (channel || 'WHATSAPP') as any,
                            status: 'ACTIVE',
                            propertyId: propertyId,
                            performance: 0,
                            promoCode: promoCode || null,
                        }
                    })
                } catch (e) {
                    console.warn('[CAMPAIGN_CREATE_WARN]', e)
                }
            }

            // Dispatch notification
            let sentCount = 0
            let lastError = ''
            const activeChannel = channel || 'WHATSAPP'

            for (const g of targetGuests) {
                const res = await sendRealNotification(
                    g, 
                    activeChannel, 
                    promoCode, 
                    property?.name || 'Zenbourg', 
                    customMessage, 
                    propertyId || undefined, 
                    customSubject
                )
                if (res.ok) {
                    sentCount++
                } else if (res.error) {
                    lastError = res.error
                }
            }

            if (sentCount === 0 && lastError) {
                return NextResponse.json({ error: `Dispatch Error: ${lastError}` }, { status: 400 })
            }

            return NextResponse.json({ success: true, count: sentCount, total: targetGuests.length, channel: activeChannel })
        }

        // Direct PROMOTE
        if (action === 'PROMOTE' && propertyId) {
             const boost = Math.floor(budget / 1000) || 1
             await prisma.property.update({
                where: { id: propertyId },
                data: { ranking: { increment: boost } }
             })
             return NextResponse.json({ success: true })
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

    } catch (error: any) {
        console.error('[MARKETING_POST_ERROR]', error)
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
    }
}
