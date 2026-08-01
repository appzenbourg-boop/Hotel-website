import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { prisma } from '@/lib/db'
import { unauthorized, forbidden, badRequest, serverError } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

const ALLOWED_ROLES = ['SUPER_ADMIN', 'HOTEL_ADMIN', 'MANAGER', 'RECEPTIONIST', 'STAFF']

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return unauthorized()
    if (!ALLOWED_ROLES.includes(session.user.role)) return forbidden()

    try {
        const { searchParams } = new URL(request.url)
        const propertyId = searchParams.get('propertyId') || session.user.propertyId

        let whereProp: any = {}
        if (session.user.role !== 'SUPER_ADMIN' || (propertyId && propertyId !== 'ALL')) {
            if (propertyId) whereProp = { propertyId }
        }

        // 1. Fetch Cafe Menu Items
        const menu = await prisma.cafeItem.findMany({
            where: whereProp,
            orderBy: { createdAt: 'desc' }
        })

        // 2. Fetch Buffet Packages
        const buffetPackages = await prisma.buffetPackage.findMany({
            where: whereProp,
            orderBy: { createdAt: 'desc' }
        })

        // 3. Fetch Orders
        const orders = await prisma.cafeOrder.findMany({
            where: whereProp,
            orderBy: { createdAt: 'desc' },
            take: 100
        })

        // 4. Fetch Hotel F&B Menu (for Import Feature)
        const hotelMenu = await prisma.menuItem.findMany({
            where: whereProp,
            select: {
                id: true,
                name: true,
                category: true,
                price: true,
                isVeg: true,
                description: true,
                images: true,
                prepTime: true
            }
        })

        // 5. Fetch Active Staff (for Order Assignment)
        const staffList = await prisma.staff.findMany({
            where: whereProp,
            select: {
                id: true,
                employeeId: true,
                designation: true,
                department: true,
                user: { select: { name: true, phone: true } }
            }
        })

        // 6. Compute Real Sales Analytics
        let todaySales = 0
        let todayOrdersCount = 0
        let cashSales = 0
        let cardSales = 0
        let onlineSales = 0
        let roomBillSales = 0

        const now = new Date()
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())

        orders.forEach(o => {
            const isToday = new Date(o.createdAt) >= startOfToday
            if (isToday && o.status !== 'CANCELLED') {
                todaySales += o.totalAmount
                todayOrdersCount++
            }

            if (o.status !== 'CANCELLED') {
                const method = (o.paymentMethod || '').toUpperCase()
                if (method === 'CASH') cashSales += o.totalAmount
                else if (method === 'CARD') cardSales += o.totalAmount
                else if (method === 'ONLINE' || method === 'UPI') onlineSales += o.totalAmount
                else if (method === 'ROOM_BILL' || method === 'ROOM') roomBillSales += o.totalAmount
                else cashSales += o.totalAmount
            }
        })

        const totalCategoryPay = cashSales + cardSales + onlineSales + roomBillSales
        const paymentBreakdown = [
            { name: 'Cash Payment', value: Math.round(cashSales), percentage: totalCategoryPay > 0 ? Math.round((cashSales / totalCategoryPay) * 100) : 0, color: '#10b981' },
            { name: 'Credit / Debit Card', value: Math.round(cardSales), percentage: totalCategoryPay > 0 ? Math.round((cardSales / totalCategoryPay) * 100) : 0, color: '#3b82f6' },
            { name: 'Online / UPI', value: Math.round(onlineSales), percentage: totalCategoryPay > 0 ? Math.round((onlineSales / totalCategoryPay) * 100) : 0, color: '#8b5cf6' },
            { name: 'Room Bill / Charge', value: Math.round(roomBillSales), percentage: totalCategoryPay > 0 ? Math.round((roomBillSales / totalCategoryPay) * 100) : 0, color: '#f59e0b' },
        ]

        return NextResponse.json({
            success: true,
            data: {
                menu,
                buffetPackages,
                orders,
                hotelMenu,
                staffList,
                analytics: {
                    todaySales: Math.round(todaySales),
                    todayOrdersCount,
                    avgOrderValue: todayOrdersCount > 0 ? Math.round(todaySales / todayOrdersCount) : 0,
                    paymentBreakdown
                }
            }
        })
    } catch (err) {
        console.error('[CAFE_API_GET_ERROR]', err)
        return serverError(err instanceof Error ? err.message : 'Internal Server Error')
    }
}

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return unauthorized()
    if (!ALLOWED_ROLES.includes(session.user.role)) return forbidden()

    try {
        const body = await request.json()
        const { action } = body
        const propertyId = body.propertyId || session.user.propertyId

        if (!propertyId) return badRequest('propertyId is required')

        // 1. CREATE_MENU_ITEM
        if (action === 'CREATE_MENU_ITEM') {
            const { name, category, price, isVeg, prepTime, description, image } = body
            if (!name || price === undefined) return badRequest('Name and Price are required')

            const item = await prisma.cafeItem.create({
                data: {
                    propertyId,
                    name: name.trim(),
                    category: category || 'Coffee & Tea',
                    price: parseFloat(price),
                    isVeg: isVeg !== undefined ? Boolean(isVeg) : true,
                    prepTime: parseInt(prepTime) || 15,
                    description: description || null,
                    image: image || null,
                    isAvailable: true
                }
            })
            return NextResponse.json({ success: true, data: item })
        }

        // 2. IMPORT_HOTEL_MENU
        if (action === 'IMPORT_HOTEL_MENU') {
            const { itemIds } = body // optional array of menuItem ids; if empty, import all
            let whereImport: any = { propertyId }
            if (Array.isArray(itemIds) && itemIds.length > 0) {
                whereImport.id = { in: itemIds }
            }

            const hotelItems = await prisma.menuItem.findMany({ where: whereImport })
            if (hotelItems.length === 0) return badRequest('No hotel menu items found to import')

            const importedItems = await Promise.all(
                hotelItems.map(item =>
                    prisma.cafeItem.create({
                        data: {
                            propertyId,
                            name: item.name,
                            category: item.category || 'Coffee & Tea',
                            price: item.price,
                            isVeg: item.isVeg,
                            prepTime: item.prepTime || 15,
                            description: item.description,
                            image: item.images?.[0] || null,
                            isAvailable: item.isAvailable
                        }
                    })
                )
            )

            return NextResponse.json({ success: true, count: importedItems.length, data: importedItems })
        }

        // 3. CREATE_BUFFET_PACKAGE
        if (action === 'CREATE_BUFFET_PACKAGE') {
            const { name, price, description, dishes } = body
            if (!name || price === undefined) return badRequest('Buffet name and price are required')

            const pkg = await prisma.buffetPackage.create({
                data: {
                    propertyId,
                    name: name.trim(),
                    price: parseFloat(price),
                    description: description || null,
                    dishes: Array.isArray(dishes) ? dishes : [],
                    isActive: true
                }
            })
            return NextResponse.json({ success: true, data: pkg })
        }

        // 4. TOGGLE_ITEM_STATUS
        if (action === 'TOGGLE_ITEM_STATUS') {
            const { itemId, isAvailable } = body
            if (!itemId) return badRequest('itemId is required')
            const updated = await prisma.cafeItem.update({
                where: { id: itemId },
                data: { isAvailable: Boolean(isAvailable) }
            })
            return NextResponse.json({ success: true, data: updated })
        }

        // 5. TOGGLE_BUFFET_STATUS
        if (action === 'TOGGLE_BUFFET_STATUS') {
            const { packageId, isActive } = body
            if (!packageId) return badRequest('packageId is required')
            const updated = await prisma.buffetPackage.update({
                where: { id: packageId },
                data: { isActive: Boolean(isActive) }
            })
            return NextResponse.json({ success: true, data: updated })
        }

        // 6. CREATE_ORDER (Cafe POS Order placement + Auto Service Request & Staff Assignment)
        if (action === 'CREATE_ORDER') {
            const { type, roomNumber, guestName, items, totalAmount, paymentMethod, assignedStaffId, assignedStaffName, notes } = body
            if (!guestName || !items || !Array.isArray(items) || items.length === 0) {
                return badRequest('Guest name and at least one item are required')
            }

            const orderNum = `CF-${Math.floor(100000 + Math.random() * 900000)}`
            const finalTotal = parseFloat(totalAmount) || items.reduce((acc: number, i: any) => acc + (i.price * i.quantity), 0)

            const order = await prisma.cafeOrder.create({
                data: {
                    propertyId,
                    orderNumber: orderNum,
                    type: type || 'ROOM_GUEST',
                    roomNumber: roomNumber || null,
                    guestName: guestName.trim(),
                    items,
                    totalAmount: finalTotal,
                    status: 'PENDING',
                    paymentMethod: paymentMethod || 'CASH',
                    paymentStatus: 'PAID',
                    assignedStaffId: assignedStaffId || null,
                    assignedStaffName: assignedStaffName || null,
                    notes: notes || null
                }
            })

            // Generate corresponding Service Request for Staff Operations Panel with [CAFE_ORDER] tag
            const itemsSummary = items.map((i: any) => `${i.quantity}x ${i.name}`).join(', ')
            let targetRoomId: string | null = null
            if (roomNumber) {
                const foundRoom = await prisma.room.findFirst({
                    where: { propertyId, roomNumber: roomNumber.trim() },
                    select: { id: true }
                })
                if (foundRoom) targetRoomId = foundRoom.id
            }

            await prisma.serviceRequest.create({
                data: {
                    propertyId,
                    roomId: targetRoomId,
                    type: 'FOOD_ORDER',
                    title: `[Cafe Order] ${itemsSummary}`,
                    description: `[CAFE_ORDER] Order #${orderNum} | Guest: ${guestName} | Room: ${roomNumber || 'Walk-in'} | Items: ${itemsSummary} | Pay: ${paymentMethod}`,
                    priority: 'HIGH',
                    status: 'PENDING',
                    slaMinutes: 20,
                    assignedToId: assignedStaffId || null,
                    amount: finalTotal,
                    paymentStatus: 'PAID'
                }
            })

            return NextResponse.json({ success: true, data: order })
        }

        // 7. UPDATE_ORDER_STATUS
        if (action === 'UPDATE_ORDER_STATUS') {
            const { orderId, status } = body
            if (!orderId || !status) return badRequest('orderId and status are required')

            const updated = await prisma.cafeOrder.update({
                where: { id: orderId },
                data: { status }
            })
            return NextResponse.json({ success: true, data: updated })
        }

        return badRequest('Invalid action')
    } catch (err) {
        console.error('[CAFE_API_POST_ERROR]', err)
        return serverError(err instanceof Error ? err.message : 'Internal Server Error')
    }
}
