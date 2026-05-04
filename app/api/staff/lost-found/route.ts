import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) return new NextResponse('Unauthorized', { status: 401 })

        const staff = await prisma.staff.findUnique({
            where: { userId: session.user.id }
        })
        if (!staff) return new NextResponse('Staff Profile Not Found', { status: 404 })

        const items = await prisma.lostItem.findMany({
            where: { reportedById: staff.id },
            include: { room: true },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json(items)
    } catch (error) {
        console.error("Staff Lost-Found GET Error:", error)
        return new NextResponse('Internal Error', { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) return new NextResponse('Unauthorized', { status: 401 })

        const staff = await prisma.staff.findUnique({
            where: { userId: session.user.id },
            include: { user: { select: { name: true } } }
        })
        if (!staff) return new NextResponse('Staff Profile Not Found', { status: 404 })

        const body = await req.json()
        const { name, category, location, roomId, description, image } = body

        const item = await prisma.lostItem.create({
            data: {
                name,
                category: category || 'PERSONAL',
                location: location || '',
                description: description || '',
                image: image || null,
                status: 'FOUND',
                reportedById: staff.id,
                propertyId: staff.propertyId,
                roomId: roomId || null
            },
            include: { room: true }
        })

        // Notify all admins/managers of this property
        if (staff.propertyId) {
            try {
                const property = await prisma.property.findUnique({
                    where: { id: staff.propertyId },
                    select: { ownerIds: true }
                })

                // Also get managers/receptionists linked to this property
                const managerUsers = await prisma.user.findMany({
                    where: {
                        workplaceId: staff.propertyId,
                        role: { in: ['MANAGER', 'RECEPTIONIST', 'HOTEL_ADMIN'] },
                        status: 'ACTIVE',
                    },
                    select: { id: true }
                })

                const recipientIds = [
                    ...(property?.ownerIds ?? []),
                    ...managerUsers.map(u => u.id),
                ]
                // Deduplicate
                const uniqueIds = [...new Set(recipientIds)]

                if (uniqueIds.length > 0) {
                    const locationStr = item.room
                        ? `Room ${item.room.roomNumber}`
                        : location || 'Common area'

                    await prisma.inAppNotification.createMany({
                        data: uniqueIds.map(userId => ({
                            userId,
                            title: 'Lost & Found — New Item Reported',
                            description: `${staff.user?.name || 'Staff'} found "${name}" at ${locationStr}`,
                            type: 'INFO',
                            isRead: false,
                        })),
                    })
                }
            } catch (notifErr) {
                // Non-critical — don't fail the request
                console.error('Lost-found notification error:', notifErr)
            }
        }

        return NextResponse.json(item)
    } catch (error) {
        console.error("Staff Lost-Found POST Error:", error)
        return new NextResponse('Internal Error', { status: 500 })
    }
}
