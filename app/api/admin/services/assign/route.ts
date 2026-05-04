import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { prisma } from '@/lib/db'
import { redis } from '@/lib/redis'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session || !['SUPER_ADMIN', 'HOTEL_ADMIN', 'MANAGER', 'RECEPTIONIST', 'STAFF'].includes(session.user.role)) {
        return new NextResponse('Unauthorized', { status: 401 })
    }

    try {
        const body = await request.json()
        // Accept both requestId and serviceId for compatibility
        const requestId = body.requestId || body.serviceId
        const { assignedToId, priority, status } = body

        if (!requestId) {
            return new NextResponse('requestId is required', { status: 400 })
        }

        const updateData: any = {}
        if (assignedToId) updateData.assignedToId = assignedToId
        // priority must be: LOW, NORMAL, HIGH, URGENT — 'MEDIUM' is NOT valid
        if (priority) {
            const ValidP = ['LOW', 'NORMAL', 'HIGH', 'URGENT']
            const normalizedP = priority === 'MEDIUM' ? 'NORMAL' : priority
            if (ValidP.includes(normalizedP)) {
                updateData.priority = normalizedP
            }
        }
        if (status) {
            updateData.status = status
            if (status === 'ACCEPTED') updateData.acceptedAt = new Date()
            if (status === 'IN_PROGRESS') updateData.startedAt = new Date()
            if (status === 'COMPLETED') updateData.completedAt = new Date()
        } else if (assignedToId) {
            // Auto-set ACCEPTED when assigning without explicit status
            updateData.status = 'ACCEPTED'
            updateData.acceptedAt = new Date()
        }

        const updated = await prisma.serviceRequest.update({
            where: { id: requestId },
            data: updateData,
            include: {
                assignedTo: {
                    select: { userId: true, user: { select: { name: true } } }
                },
                guest: { select: { phone: true, name: true } },
                room: { select: { roomNumber: true } }
            }
        })

        // NEW: Send SMS Notification to Guest
        try {
            const { sendSMS } = require('@/lib/twilio');
            let message = '';
            if (status === 'COMPLETED') {
                message = `Hi ${updated.guest?.name || 'Guest'}, your request "${updated.title}" for Room ${updated.room?.roomNumber} has been COMPLETED. We hope it meets your satisfaction!`;
            } else if (status === 'IN_PROGRESS') {
                message = `Hi ${updated.guest?.name || 'Guest'}, your request "${updated.title}" is now IN PROGRESS. Our staff is working on it.`;
            } else if (updated.assignedToId && (status === 'ACCEPTED' || !status)) {
                message = `Hi ${updated.guest?.name || 'Guest'}, your request "${updated.title}" has been ASSIGNED to ${updated.assignedTo?.user?.name || 'staff'}. Expected completion within ${updated.slaMinutes || 30} mins.`;
            }

            if (message && updated.guest?.phone) {
                const targetPhone = updated.guest.phone.startsWith('+') ? updated.guest.phone : `+91${updated.guest.phone}`;
                await sendSMS(targetPhone, message);
            }
        } catch (smsErr) {
            console.error('Failed to send SMS notification:', smsErr);
        }

        // NEW: Create In-App Notification for Staff
        if (assignedToId && (status === 'ACCEPTED' || !status)) {
            try {
                await prisma.inAppNotification.create({
                    data: {
                        userId: updated.assignedTo!.userId,
                        title: 'New Task Dispatch',
                        description: `You have been assigned: ${updated.title} for Room ${updated.room?.roomNumber || 'Gen-Ops'}`,
                        type: 'TASK'
                    }
                })
            } catch (noteErr) {
                console.error('Failed to create staff notification:', noteErr)
            }
        }

        // NEW: Invalidate Staff Cache
        if (updated.assignedToId && updated.assignedTo?.userId) {
            await redis.del(`staff_me:${updated.assignedTo.userId}`).catch(() => {})
        }

        return NextResponse.json(updated)
    } catch (error) {
        console.error(error)
        return new NextResponse('Internal Error', { status: 500 })
    }
}
