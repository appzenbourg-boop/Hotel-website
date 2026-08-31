import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import prisma from '@/lib/db'

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

        const { searchParams } = new URL(req.url)
        const propertyId = searchParams.get('propertyId')
        
        if (!propertyId) {
            return NextResponse.json({ success: false, error: 'Property ID required' }, { status: 400 })
        }

        const purchaseOrders = await prisma.purchaseOrder.findMany({
            where: { propertyId },
            include: {
                vendor: true,
                items: true,
                booking: {
                    include: { guest: true, room: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        // Generate basic dashboard analytics
        const totalSpend = purchaseOrders.reduce((sum, po) => sum + (po.status !== 'CANCELLED' ? po.totalAmount : 0), 0)
        
        let totalOrderedUnits = 0
        purchaseOrders.forEach(po => {
            if (po.status !== 'CANCELLED') {
                po.items.forEach((item: any) => {
                    totalOrderedUnits += item.quantity || 0
                })
            }
        })

        return NextResponse.json({ 
            success: true, 
            data: {
                purchaseOrders,
                analytics: {
                    totalSpend,
                    totalOrderedUnits
                }
            } 
        })
    } catch (error) {
        console.error('Fetch POs Error:', error)
        return NextResponse.json({ success: false, error: 'Failed to fetch purchase orders' }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

        const body = await req.json()
        const { vendorId, items, shipping, notes, bookingId, status } = body

        const { searchParams } = new URL(req.url)
        const queryPropertyId = searchParams.get('propertyId')
        const propertyId = body.propertyId || queryPropertyId || (session.user as any)?.propertyId || '6a7c467e80ab868749620999'

        if (!propertyId || !vendorId || !items || !items.length) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
        }

        // Calculate totals
        let subtotal = 0
        let tax = 0
        const formattedItems = items.map((item: any) => {
            const itemTotal = item.quantity * item.unitPrice
            const itemTax = itemTotal * ((item.taxPercent || 0) / 100)
            subtotal += itemTotal
            tax += itemTax
            return {
                description: item.description,
                quantity: parseInt(item.quantity),
                unitPrice: parseFloat(item.unitPrice),
                taxPercent: parseFloat(item.taxPercent || 0),
                total: itemTotal + itemTax
            }
        })

        const shippingCost = parseFloat(shipping || 0)
        const totalAmount = subtotal + tax + shippingCost

        // Generate PO Number
        const poNumber = `PO-${Math.floor(1000 + Math.random() * 9000)}-X`

        // 1. Create Purchase Order and Items
        const newPO = await prisma.purchaseOrder.create({
            data: {
                propertyId,
                vendorId,
                poNumber,
                status: status || 'PENDING_APPROVAL',
                subtotal,
                tax,
                shipping: shippingCost,
                totalAmount,
                notes,
                bookingId: bookingId || null,
                items: {
                    create: formattedItems
                }
            },
            include: { items: true, vendor: true }
        })

        // 2. If bookingId is provided, Bill to Guest Folio
        if (bookingId) {
            const booking = await prisma.booking.findUnique({ where: { id: bookingId } })
            
            if (booking) {
                const currentAddons = booking.extraAddons ? (booking.extraAddons as any[]) : []
                
                // Add this PO as an addon charge
                currentAddons.push({
                    id: newPO.id,
                    name: `Concierge Order (${poNumber}) - ${newPO.vendor?.name}`,
                    price: totalAmount,
                    qty: 1
                })

                const newAddonsAmount = (booking.extraAddonsAmount || 0) + totalAmount
                const newTotalAmount = (booking.totalAmount || 0) + totalAmount
                
                await prisma.booking.update({
                    where: { id: bookingId },
                    data: {
                        extraAddons: currentAddons,
                        extraAddonsAmount: newAddonsAmount,
                        totalAmount: newTotalAmount,
                        finalAmount: (booking.finalAmount || booking.totalAmount || 0) + totalAmount
                    }
                })
            }
        }

        return NextResponse.json({ success: true, data: newPO })
    } catch (error) {
        console.error('Create PO Error:', error)
        return NextResponse.json({ success: false, error: 'Failed to create purchase order' }, { status: 500 })
    }
}
