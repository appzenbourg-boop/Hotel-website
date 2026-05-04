import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse('Unauthorized', { status: 401 })

    try {
        const staff = await prisma.staff.findUnique({
            where: { userId: session.user.id },
            select: { id: true },
        })

        const messages = await prisma.message.findMany({
            where: {
                OR: [
                    { senderId: session.user.id },
                    { receiverId: session.user.id },
                    { serviceRequest: { assignedToId: staff?.id || 'NO-ID' } },
                ],
            },
            include: {
                serviceRequest: {
                    select: { title: true, room: { select: { roomNumber: true } } },
                },
            },
            orderBy: { createdAt: 'desc' },
        })

        // Attach sender names
        const senderIds = [...new Set(messages.map(m => m.senderId))]
        const senders = await prisma.user.findMany({
            where: { id: { in: senderIds } },
            select: { id: true, name: true },
        })
        const senderMap = Object.fromEntries(senders.map(s => [s.id, s.name]))

        const enriched = messages.map(m => ({
            ...m,
            senderName: senderMap[m.senderId] ?? 'Unknown',
        }))

        return NextResponse.json(enriched)
    } catch (error) {
        console.error('Messages GET Error:', error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}

export async function PATCH(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse('Unauthorized', { status: 401 })

    try {
        const body = await request.json()
        const { senderId, category, serviceRequestId } = body

        const where: any = {
            receiverId: session.user.id,
            isRead: false,
        }
        if (senderId) where.senderId = senderId
        if (category) where.category = category
        if (serviceRequestId) where.serviceRequestId = serviceRequestId

        await prisma.message.updateMany({ where, data: { isRead: true } })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Messages PATCH Error:', error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse('Unauthorized', { status: 401 })

    try {
        const body = await request.json()
        const { receiverId, content, category, type, serviceRequestId } = body

        const newMessage = await prisma.message.create({
            data: {
                senderId: session.user.id,
                receiverId,
                serviceRequestId,
                content,
                category: category || 'CHAT',
                type: type || 'TEXT',
            },
            include: {
                serviceRequest: {
                    include: { property: { select: { ownerIds: true } } },
                },
            },
        })

        // Notify property owners if it's a service request message
        if (newMessage.serviceRequest?.property?.ownerIds?.length) {
            try {
                await prisma.inAppNotification.createMany({
                    data: newMessage.serviceRequest.property.ownerIds.map(ownerId => ({
                        userId: ownerId,
                        title: 'New Service Message',
                        description: `Staff update on "${newMessage.serviceRequest?.title}": ${content.slice(0, 50)}`,
                        type: 'INFO',
                    })),
                })
            } catch (noteErr) {
                console.error('Owner notification error:', noteErr)
            }
        }

        return NextResponse.json(newMessage)
    } catch (error) {
        console.error('Messages POST Error:', error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}
