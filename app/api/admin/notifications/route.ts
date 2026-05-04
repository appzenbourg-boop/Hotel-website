/**
 * GET  /api/admin/notifications  — fetch unread in-app notifications for the logged-in admin
 * POST /api/admin/notifications/read — mark all as read
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse('Unauthorized', { status: 401 })

    try {
        const notifications = await prisma.inAppNotification.findMany({
            where: { userId: session.user.id },
            orderBy: { createdAt: 'desc' },
            take: 50,
        })

        const unreadCount = notifications.filter(n => !n.isRead).length

        return NextResponse.json({ success: true, notifications, unreadCount })
    } catch (error) {
        console.error('Notifications GET error:', error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}

export async function PATCH(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse('Unauthorized', { status: 401 })

    try {
        const { ids } = await req.json().catch(() => ({ ids: null }))

        if (ids && Array.isArray(ids)) {
            // Mark specific notifications as read
            await prisma.inAppNotification.updateMany({
                where: { id: { in: ids }, userId: session.user.id },
                data: { isRead: true },
            })
        } else {
            // Mark all as read
            await prisma.inAppNotification.updateMany({
                where: { userId: session.user.id, isRead: false },
                data: { isRead: true },
            })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Notifications PATCH error:', error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}
