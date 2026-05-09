import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { prisma } from '@/lib/db'
import { redis } from '@/lib/redis'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse('Unauthorized', { status: 401 })


    try {
        const notifications = await prisma.inAppNotification.findMany({
            where: { userId: session.user.id },
            orderBy: { createdAt: 'desc' },
            take: 50
        })

        return NextResponse.json(notifications)
    } catch (error) {
        console.error("Notifications API Error:", error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}

export async function PATCH(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse('Unauthorized', { status: 401 })

    try {
        const body = await request.json()
        const { id, isRead } = body

        if (id) {
            const updated = await prisma.inAppNotification.update({
                where: { id },
                data: { isRead }
            })
            return NextResponse.json(updated)
        } else {
            // Mark all as read
            await prisma.inAppNotification.updateMany({
                where: { userId: session.user.id },
                data: { isRead: true }
            })
            return NextResponse.json({ success: true })
        }
    } catch (error) {
        console.error("Notifications PATCH Error:", error)
        return new NextResponse('Internal Server Error', { status: 500 })
    } finally {
        await Promise.all([
            redis.del(`staff_me:${session.user.id}`),
            redis.del(`staff_notifications:${session.user.id}`)
        ])
    }
}
export async function DELETE(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse('Unauthorized', { status: 401 })

    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (id) {
            // Delete single notification
            await prisma.inAppNotification.delete({
                where: { id, userId: session.user.id }
            })
        } else {
            // Delete all notifications
            await prisma.inAppNotification.deleteMany({
                where: { userId: session.user.id }
            })
        }
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Notifications DELETE Error:", error)
        return new NextResponse('Internal Server Error', { status: 500 })
    } finally {
        await Promise.all([
            redis.del(`staff_me:${session.user.id}`),
            redis.del(`staff_notifications:${session.user.id}`)
        ])
    }
}
