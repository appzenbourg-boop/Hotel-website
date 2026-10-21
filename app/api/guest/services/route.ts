import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { performAutoAssignment } from '@/lib/service-utils'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { category, item, description, priority, amount, roomId, type, guestId, notes } = body

        if (!guestId) {
            return new NextResponse('Guest ID is required', { status: 400 })
        }

        // Determine accurate propertyId from room or booking
        let targetPropertyId: string | null = null
        if (roomId) {
            const room = await prisma.room.findUnique({ where: { id: roomId }, select: { propertyId: true } })
            if (room) targetPropertyId = room.propertyId
        }
        if (!targetPropertyId) {
            const activeBooking = await prisma.booking.findFirst({
                where: { guestId },
                select: { propertyId: true },
                orderBy: { createdAt: 'desc' }
            })
            if (activeBooking?.propertyId) targetPropertyId = activeBooking.propertyId
        }
        if (!targetPropertyId) {
            const property = await prisma.property.findFirst({ select: { id: true } })
            if (property) targetPropertyId = property.id
        }

        if (!targetPropertyId) return new NextResponse('No property found', { status: 404 })

        // Map request category to valid ServiceType enum
        let requestType: any = category || type || 'ROOM_SERVICE'
        if (requestType === 'DINING' || requestType === 'FOOD') requestType = 'FOOD_ORDER'
        if (!['HOUSEKEEPING', 'FOOD_ORDER', 'ROOM_SERVICE', 'LAUNDRY', 'MAINTENANCE', 'CONCIERGE', 'SPA'].includes(requestType)) {
            requestType = 'ROOM_SERVICE'
        }

        const serviceReq = await prisma.serviceRequest.create({
            data: {
                title: item || 'Service Request',
                description,
                type: requestType,
                priority: (priority as any) || 'NORMAL',
                amount: amount || 0,
                guestId: guestId as string,
                roomId: roomId || null,
                propertyId: targetPropertyId,
                status: 'PENDING',
                assignedToId: null,
                notes: typeof notes === 'string' ? notes : notes ? JSON.stringify(notes) : null
            }
        })

        // If there's an amount, add it to the final bill of the active booking for this room
        if (amount && amount > 0 && roomId) {
            const activeBooking = await prisma.booking.findFirst({
                where: { roomId, status: { in: ['CHECKED_IN', 'RESERVED'] } },
                orderBy: { createdAt: 'desc' }
            })
            if (activeBooking) {
                await prisma.booking.update({
                    where: { id: activeBooking.id },
                    data: {
                        totalAmount: { increment: amount }
                    }
                })
            }
        }
        
        // Auto-assign immediately
        await performAutoAssignment(targetPropertyId, 0)

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error(error)
        return new NextResponse('Error', { status: 500 })
    }
}
