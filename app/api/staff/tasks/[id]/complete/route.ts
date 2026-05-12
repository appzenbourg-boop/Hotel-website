import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { prisma } from '@/lib/db'
import { redis } from '@/lib/redis'

export const dynamic = 'force-dynamic'

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions)
    const allowedRoles = ['STAFF', 'MANAGER', 'RECEPTIONIST', 'HOTEL_ADMIN', 'SUPER_ADMIN']
    if (!session || !allowedRoles.includes(session.user.role)) {
        return new NextResponse('Unauthorized', { status: 401 })
    }

    try {
        const { id } = params

        // Verify task belongs to staff
        const task = await prisma.serviceRequest.findUnique({
            where: { id },
            include: { assignedTo: true }
        })

        if (!task) return new NextResponse('Task not found', { status: 404 })

        // Check if assigned to current user's staff profile
        const staff = await prisma.staff.findUnique({
            where: { userId: session.user.id }
        })

        if (task.assignedToId !== staff?.id) {
            return new NextResponse('Not assigned to you', { status: 403 })
        }

        const body = await request.json().catch(() => ({}))
        const { notes, attachments } = body

        // Update Status
        const updated = await prisma.serviceRequest.update({
            where: { id },
            data: {
                status: 'COMPLETED',
                completedAt: new Date(),
                notes: notes || undefined,
                attachments: attachments || undefined
            },
            include: {
                property: {
                    select: { ownerIds: true, name: true }
                },
                room: { select: { roomNumber: true } },
                assignedTo: { include: { user: { select: { name: true } } } },
                guest: { select: { phone: true } }
            }
        })

        // Notify Admins/Owners
        if (updated.property?.ownerIds) {
            try {
                const notifications = updated.property.ownerIds.map(ownerId => ({
                    userId: ownerId,
                    title: '✓ Operational Task Completed',
                    description: `Professional update: ${updated.assignedTo?.user?.name || 'Staff'} has successfully completed "${updated.title}" for Room ${updated.room?.roomNumber || 'General Area'}.`,
                    type: 'SYSTEM'
                }))

                await prisma.inAppNotification.createMany({
                    data: notifications
                })
            } catch (noteErr) {
                console.error('Failed to notify admins:', noteErr)
            }
        }

        // 🚀 NEW: Notify the Guest too via in-app notification!
        if (updated.guest?.phone) {
            try {
                const guestUser = await prisma.user.findUnique({ where: { phone: updated.guest.phone }, select: { id: true } });
                if (guestUser) {
                    await prisma.inAppNotification.create({
                        data: {
                            userId: guestUser.id,
                            title: '✓ Request Completed',
                            description: `Good news! Your request for "${updated.title}" has been completed. Enjoy your stay!`,
                            type: 'SYSTEM',
                            isRead: false
                        }
                    });
                }
            } catch (gNoteErr) {
                console.error('Failed to notify guest on task completion:', gNoteErr);
            }
        }

        // Invalidate Caches
        await redis.del(`staff_me:${session.user.id}`)
        if (updated.propertyId) {
            await redis.del(`dashboard:${updated.propertyId}`)
        }

        return NextResponse.json(updated)

    } catch (error) {
        console.error(error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}
