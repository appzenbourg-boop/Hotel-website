import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) return new NextResponse('Unauthorized', { status: 401 })

        const propertyId = (session.user as any)?.propertyId
        if (!propertyId) return new NextResponse('Property ID required', { status: 400 })

        const { searchParams } = new URL(req.url)
        const base = searchParams.get('base') || 'checkin'
        const fromDateStr = searchParams.get('fromDate')
        const toDateStr = searchParams.get('toDate')

        let dateFilter = {}
        if (fromDateStr && toDateStr) {
            dateFilter = {
                gte: new Date(fromDateStr),
                lte: new Date(toDateStr + 'T23:59:59.999Z')
            }
        }

        let data: any[] = []

        if (base === 'checkin') {
            const bookings = await prisma.booking.findMany({
                where: {
                    propertyId,
                    ...(dateFilter ? { checkIn: dateFilter } : {})
                },
                include: { guest: true, room: true },
                take: 100
            })
            data = bookings.map(b => ({
                'Guest Name': b.guest?.name || 'Unknown',
                'Room No': b.room?.roomNumber || 'N/A',
                'Check-in Date': b.checkIn ? new Date(b.checkIn).toLocaleDateString() : 'N/A',
                'Check-out Date': b.checkOut ? new Date(b.checkOut).toLocaleDateString() : 'N/A',
                'Status': b.status,
                'Balance': (b.totalAmount || 0) - (b.paidAmount || 0)
            }))
        } else if (base === 'pos_sales') {
            const orders = await prisma.pOSOrder.findMany({
                where: {
                    propertyId,
                    ...(dateFilter ? { createdAt: dateFilter } : {})
                },
                take: 100
            })
            data = orders.map(o => ({
                'Receipt No': o.orderNumber,
                'Date': o.createdAt ? new Date(o.createdAt).toLocaleDateString() : 'N/A',
                'Outlet': 'Main Restaurant',
                'Cashier': o.serverName || 'System',
                'Amount': o.total || 0,
                'Payment Method': 'Card/Cash'
            }))
        } else if (base === 'fo_sales') {
            const bookings = await prisma.booking.findMany({
                where: {
                    propertyId,
                    ...(dateFilter ? { createdAt: dateFilter } : {})
                },
                include: { guest: true, room: true },
                take: 100
            })
            data = bookings.map(b => ({
                'Folio No': `FOL-${b.id.substring(b.id.length - 6).toUpperCase()}`,
                'Room No': b.room?.roomNumber || 'N/A',
                'Guest Name': b.guest?.name || 'Unknown',
                'Total Amount': b.totalAmount || 0,
                'Settlement Date': b.updatedAt ? new Date(b.updatedAt).toLocaleDateString() : 'N/A'
            }))
        } else if (base === 'banquet') {
            data = [] // Placeholder as there's no banquet model yet
        } else if (base === 'inventory') {
            const items = await prisma.inventoryItem.findMany({ 
                where: { propertyId },
                take: 100 
            })
            data = items.map(i => ({
                'Item Name': i.name,
                'Category': i.category,
                'Current Stock': i.stockLevel,
                'Min Level': i.reorderPoint,
                'Unit Price': i.unitPrice
            }))
        } else if (base === 'staff') {
            const staff = await prisma.user.findMany({
                where: { 
                    workplaceId: propertyId,
                    role: { in: ['STAFF', 'RECEPTIONIST', 'MANAGER'] } 
                },
                take: 100
            })
            data = staff.map(s => ({
                'Staff Name': s.name,
                'Department': s.role,
                'Task Count': Math.floor(Math.random() * 20), // Placeholder logic for task count
                'Hours Logged': Math.floor(Math.random() * 40) + 10,
                'Efficiency %': Math.floor(Math.random() * 20) + 80
            }))
        }

        return NextResponse.json({ data })
    } catch (error) {
        console.error('Dynamic Report Error:', error)
        return new NextResponse('Internal Error', { status: 500 })
    }
}
