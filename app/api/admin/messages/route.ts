/**
 * Internal messaging between staff/admin
 * GET  /api/admin/messages?withUserId=  — get conversation with a user
 * POST /api/admin/messages              — send a message
 * GET  /api/admin/messages/contacts     — list all staff/admin to message
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { prisma } from '@/lib/db'
import { unauthorized, serverError } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return unauthorized()

    const { searchParams } = new URL(req.url)
    const withUserId = searchParams.get('withUserId')

    try {
        if (withUserId) {
            // Get conversation between current user and another user
            const messages = await prisma.message.findMany({
                where: {
                    OR: [
                        { senderId: session.user.id, receiverId: withUserId },
                        { senderId: withUserId, receiverId: session.user.id },
                    ],
                    category: 'TEAM',
                },
                orderBy: { createdAt: 'asc' },
                take: 100,
            })

            // Mark messages as read
            await prisma.message.updateMany({
                where: {
                    senderId: withUserId,
                    receiverId: session.user.id,
                    isRead: false,
                    category: 'TEAM',
                },
                data: { isRead: true },
            })

            return NextResponse.json({ success: true, messages })
        }

        // Get all contacts (staff + admins in same property) with last message + unread count
        const propertyId = session.user.propertyId

        const contacts = await prisma.user.findMany({
            where: {
                id: { not: session.user.id },
                status: 'ACTIVE',
                role: { in: ['SUPER_ADMIN', 'HOTEL_ADMIN', 'MANAGER', 'RECEPTIONIST', 'STAFF'] },
                ...(propertyId ? {
                    OR: [
                        { role: 'SUPER_ADMIN' },
                        { workplaceId: propertyId },
                    ]
                } : {}),
            },
            select: { id: true, name: true, email: true, role: true },
            orderBy: { name: 'asc' },
        })

        // Get unread counts and last messages for each contact
        const contactsWithMeta = await Promise.all(
            contacts.map(async (contact) => {
                const [lastMsg, unreadCount] = await Promise.all([
                    prisma.message.findFirst({
                        where: {
                            OR: [
                                { senderId: session.user.id, receiverId: contact.id },
                                { senderId: contact.id, receiverId: session.user.id },
                            ],
                            category: 'TEAM',
                        },
                        orderBy: { createdAt: 'desc' },
                    }),
                    prisma.message.count({
                        where: {
                            senderId: contact.id,
                            receiverId: session.user.id,
                            isRead: false,
                            category: 'TEAM',
                        },
                    }),
                ])
                return { ...contact, lastMessage: lastMsg, unreadCount }
            })
        )

        // Sort: contacts with messages first, then by last message time
        contactsWithMeta.sort((a, b) => {
            if (!a.lastMessage && !b.lastMessage) return 0
            if (!a.lastMessage) return 1
            if (!b.lastMessage) return -1
            return new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime()
        })

        return NextResponse.json({ success: true, contacts: contactsWithMeta })
    } catch (error) {
        return serverError(error, 'MESSAGES_GET')
    }
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return unauthorized()

    try {
        const { receiverId, content, category = 'TEAM' } = await req.json()
        if (!receiverId || !content?.trim()) {
            return NextResponse.json({ success: false, error: 'receiverId and content required' }, { status: 400 })
        }

        const message = await prisma.message.create({
            data: {
                senderId: session.user.id,
                receiverId,
                content: content.trim(),
                category: category as any,
                type: 'TEXT',
                isRead: false,
            },
        })

        // Create in-app notification for receiver
        await prisma.inAppNotification.create({
            data: {
                userId: receiverId,
                title: `Message from ${session.user.name ?? 'Staff'}`,
                description: content.trim().slice(0, 80),
                type: 'INFO',
                isRead: false,
            },
        }).catch(() => {}) // non-critical

        return NextResponse.json({ success: true, message })
    } catch (error) {
        return serverError(error, 'MESSAGES_POST')
    }
}
