import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { performAutoAssignment } from '@/lib/service-utils'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { category, item, description, priority, amount, roomId, type } = body

        // In real app, we get guestId from session or token
        // For MVP demo, we attach to first guest found or just log
        const guest = await prisma.guest.findFirst()
        const guestId = guest?.id

        const property = await prisma.property.findFirst()
        if (!property) return new NextResponse('No property found', { status: 404 })

        const requestType = type || 'ROOM_SERVICE'

        const serviceReq = await prisma.serviceRequest.create({
            data: {
                title: item || 'Service Request',
                description,
                type: requestType,
                priority: (priority as any) || 'NORMAL',
                amount: amount || 0,
                guestId: guestId as string,
                propertyId: property.id,
                status: 'PENDING',
                assignedToId: null
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
        await performAutoAssignment(property.id, 0)

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error(error)
        return new NextResponse('Error', { status: 500 })
    }
}
