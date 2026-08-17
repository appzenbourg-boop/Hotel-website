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

        // If no property selected, return empty structure
        if (!propertyId) {
            return NextResponse.json({
                occupancyRate: 0,
                adr: 0,
                revPar: 0,
                totalRooms: 0,
                soldRooms: 0,
                roomRevenue: 0,
                fbRevenue: 0,
                discrepancies: []
            })
        }

        // Get total rooms
        const rooms = await prisma.room.findMany({
            where: { propertyId, status: { not: 'MAINTENANCE' } }
        })
        const totalRooms = rooms.length

        // Get today's bookings
        const today = new Date()
        const startOfDay = new Date(today.setHours(0, 0, 0, 0))
        const endOfDay = new Date(today.setHours(23, 59, 59, 999))

        const activeBookings = await prisma.booking.findMany({
            where: {
                propertyId,
                status: 'CHECKED_IN',
                checkIn: { lte: endOfDay },
                checkOut: { gte: startOfDay }
            }
        })

        const soldRooms = activeBookings.length
        const occupancyRate = totalRooms > 0 ? (soldRooms / totalRooms) * 100 : 0

        // Calculate Revenue (MTD for now, or just active bookings)
        const roomRevenue = activeBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0)
        const adr = soldRooms > 0 ? roomRevenue / soldRooms : 0
        const revPar = totalRooms > 0 ? roomRevenue / totalRooms : 0

        // Dynamic F&B (from ServiceRequests type FOOD_ORDER, ROOM_SERVICE)
        const fbOrders = await prisma.serviceRequest.findMany({
            where: {
                propertyId,
                type: { in: ['FOOD_ORDER', 'ROOM_SERVICE'] },
                createdAt: { gte: startOfDay, lte: endOfDay }
            }
        })
        const fbRevenue = fbOrders.reduce((sum, o) => sum + (o.amount || 0), 0)

        // Dynamic Spa & Wellness
        const spaTransactions = await prisma.ledgerTransaction.findMany({
            where: {
                propertyId,
                category: 'SPA_AND_WELLNESS',
                timestamp: { gte: startOfDay, lte: endOfDay },
                type: 'CREDIT'
            }
        })
        const spaServiceOrders = await prisma.serviceRequest.findMany({
            where: {
                propertyId,
                type: 'SPA',
                createdAt: { gte: startOfDay, lte: endOfDay }
            }
        })
        const spaRevenue = spaTransactions.reduce((sum, t) => sum + (t.amount || 0), 0) + 
                           spaServiceOrders.reduce((sum, o) => sum + (o.amount || 0), 0)

        // Dynamic Misc & Retail
        const miscTransactions = await prisma.ledgerTransaction.findMany({
            where: {
                propertyId,
                category: 'MISC_RETAIL',
                timestamp: { gte: startOfDay, lte: endOfDay },
                type: 'CREDIT'
            }
        })
        const miscRevenue = miscTransactions.reduce((sum, t) => sum + (t.amount || 0), 0)

        // Get the latest Audit Run
        const activeAudit = await prisma.auditRun.findFirst({
            where: { propertyId },
            orderBy: { createdAt: 'desc' }
        })

        // Find real discrepancies from AuditException
        let realDiscrepancies: any[] = []
        if (activeAudit) {
            const exceptions = await prisma.auditException.findMany({
                where: { auditRunId: activeAudit.id },
                include: { booking: { include: { guest: true } } }
            })

            realDiscrepancies = exceptions.map(ex => ({
                id: ex.id,
                description: ex.type,
                subtext: ex.booking ? `Guest: ${ex.booking.guest.name}` : ex.resolutionNotes || 'Needs review',
                amount: ex.severity, // just hijacking amount field for UI simplicity for now
                department: 'Audit Engine',
                status: ex.status === 'PENDING' ? 'Unresolved' : 'Resolved',
                rawException: ex
            }))
        }

        return NextResponse.json({
            occupancyRate,
            adr,
            revPar,
            totalRooms,
            soldRooms,
            roomRevenue,
            fbRevenue,
            spaRevenue,
            miscRevenue,
            discrepancies: realDiscrepancies,
            activeAudit
        })
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
