import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { prisma } from '@/lib/db'
import { unauthorized, forbidden, badRequest, notFound, serverError } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

const ALLOWED_ROLES = ['SUPER_ADMIN', 'HOTEL_ADMIN', 'MANAGER', 'RECEPTIONIST']

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return unauthorized()
    if (!ALLOWED_ROLES.includes(session.user.role)) return forbidden()

    try {
        const body = await request.json()
        const { bookingId, type, details } = body

        if (!bookingId || !type || !details) return badRequest('bookingId, type, and details are required')
        if (!['UPGRADE', 'EXTENSION'].includes(type)) return badRequest('Invalid request type')

        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            include: { property: { select: { ownerIds: true } } }
        })

        if (!booking) return notFound('Booking')

        const newRequest = await prisma.bookingRequest.create({
            data: {
                bookingId,
                type,
                details,
                requestedById: session.user.id,
                status: 'PENDING'
            }
        })

        // Notify owners/admins
        if (booking.propertyId) {
            const admins = await prisma.user.findMany({
                where: {
                    OR: [
                        { id: { in: booking.property?.ownerIds || [] } },
                        { role: { in: ['HOTEL_ADMIN', 'MANAGER'] }, workplaceId: booking.propertyId }
                    ]
                },
                select: { id: true }
            })

            if (admins.length > 0) {
                await prisma.inAppNotification.createMany({
                    data: admins.map(admin => ({
                        userId: admin.id,
                        title: `New ${type} Request`,
                        description: `A new ${type.toLowerCase()} request for booking #${bookingId.slice(-6)} requires your approval.`,
                        type: 'ALERT',
                        isRead: false
                    }))
                })
            }
        }

        return NextResponse.json({ success: true, data: newRequest })
    } catch (error) {
        return serverError(error, 'BOOKING_REQUEST_CREATE')
    }
}

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return unauthorized()
    if (!ALLOWED_ROLES.includes(session.user.role)) return forbidden()

    const { searchParams } = new URL(request.url)
    const propertyId = searchParams.get('propertyId')
    const status = searchParams.get('status') as any

    try {
        const where: any = {}
        if (propertyId) where.booking = { propertyId }
        if (status) where.status = status

        const requests = await prisma.bookingRequest.findMany({
            where,
            include: {
                booking: {
                    include: {
                        guest: { select: { name: true } },
                        room: { select: { roomNumber: true, type: true } }
                    }
                },
                requestedBy: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json({ success: true, data: requests })
    } catch (error) {
        return serverError(error, 'BOOKING_REQUEST_LIST')
    }
}

export async function PATCH(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return unauthorized()
    // Only admins/managers can approve
    if (!['SUPER_ADMIN', 'HOTEL_ADMIN', 'MANAGER'].includes(session.user.role)) return forbidden()

    try {
        const body = await request.json()
        const { requestId, action, rejectionReason } = body

        if (!requestId || !action) return badRequest('requestId and action are required')
        if (!['APPROVE', 'REJECT'].includes(action)) return badRequest('Invalid action')

        const existing = await prisma.bookingRequest.findUnique({
            where: { id: requestId },
            include: { booking: true }
        })

        if (!existing) return notFound('Booking Request')
        if (existing.status !== 'PENDING') return badRequest('Request is already processed')

        if (action === 'APPROVE') {
            const details = existing.details as any
            
            // Execute the change in a transaction
            await prisma.$transaction(async (tx) => {
                if (existing.type === 'UPGRADE') {
                    // Update booking room and total amount
                    await tx.booking.update({
                        where: { id: existing.bookingId },
                        data: {
                            roomId: details.newRoomId,
                            totalAmount: { increment: details.extraCharge || 0 }
                        }
                    })
                } else if (existing.type === 'EXTENSION') {
                    // Update booking check-out and total amount
                    await tx.booking.update({
                        where: { id: existing.bookingId },
                        data: {
                            checkOut: new Date(details.newCheckOut),
                            totalAmount: { increment: details.extraCharge || 0 }
                        }
                    })
                }

                await tx.bookingRequest.update({
                    where: { id: requestId },
                    data: {
                        status: 'APPROVED',
                        approvedById: session.user.id
                    }
                })

                // 📱 Notify the Requesting Guest that it was APPROVED!
                await tx.inAppNotification.create({
                    data: {
                        userId: existing.requestedById,
                        title: `✅ ${existing.type} Approved!`,
                        description: `Your request for ${existing.type === 'UPGRADE' ? 'a room upgrade' : 'an extended stay'} has been accepted and finalized.`,
                        type: 'INFO',
                        isRead: false
                    }
                })
            })

            return NextResponse.json({ success: true, message: 'Request approved and booking updated' })
        } else {
            await prisma.bookingRequest.update({
                where: { id: requestId },
                data: {
                    status: 'REJECTED',
                    rejectedById: session.user.id,
                    rejectionReason: rejectionReason || 'No reason provided'
                }
            })

            // 📱 Notify the Requesting Guest that it was REJECTED!
            await prisma.inAppNotification.create({
                data: {
                    userId: existing.requestedById,
                    title: `❌ ${existing.type} Declined`,
                    description: `Your request for ${existing.type.toLowerCase()} could not be approved at this time. Reason: ${rejectionReason || 'Standard policy'}`,
                    type: 'ALERT',
                    isRead: false
                }
            })

            return NextResponse.json({ success: true, message: 'Request rejected' })
        }
    } catch (error) {
        return serverError(error, 'BOOKING_REQUEST_PROCESS')
    }
}
