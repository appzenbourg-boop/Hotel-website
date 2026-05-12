import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse('Unauthorized', { status: 401 })

    try {
        const service = await prisma.serviceRequest.findUnique({
            where: { id: params.id },
            include: {
                room: {
                    select: {
                        roomNumber: true,
                        floor: true
                    }
                },
                guest: {
                    include: {
                        bookings: {
                            where: { status: 'CHECKED_IN' },
                            take: 1
                        }
                    }
                },
                assignedTo: {
                    include: {
                        user: { 
                            select: { 
                                name: true, 
                                role: true,
                                email: true,
                                phone: true
                            } 
                        }
                    }
                },
                property: true,
                messages: {
                    orderBy: { createdAt: 'asc' }
                }
            }
        })

        if (!service) return new NextResponse('Not Found', { status: 404 })

        return NextResponse.json(service)
    } catch (error) {
        console.error('[SERVICE_DETAIL_GET]', error)
        return new NextResponse('Internal Error', { status: 500 })
    }
}
export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse('Unauthorized', { status: 401 })

    try {
        const body = await request.json()
        const updated = await prisma.serviceRequest.update({
            where: { id: params.id },
            data: body,
            include: { guest: { select: { phone: true } } }
        })

        // 🚀 Notify Guest automatically when administration updates request status
        if (body.status) {
            try {
                let targetPhone = updated.guest?.phone;
                
                // 🛡️ Fallback: If Guest relation is null, lookup active checkout linked by room
                if (!targetPhone && updated.roomId) {
                   const activeBooking = await prisma.booking.findFirst({
                       where: { roomId: updated.roomId, status: 'CHECKED_IN' },
                       include: { guest: { select: { phone: true } } }
                   });
                   if (activeBooking?.guest?.phone) {
                       targetPhone = activeBooking.guest.phone;
                   }
                }

                if (targetPhone) {
                    const cleanPhone = targetPhone.replace('+91', '');
                    const possiblePhones = [
                        targetPhone,
                        cleanPhone,
                        `+91${cleanPhone}`
                    ];

                    const guestUser = await prisma.user.findFirst({
                        where: { 
                            role: 'GUEST',
                            phone: { in: possiblePhones } 
                        },
                        select: { id: true }
                    });

                    if (guestUser) {
                        let verb = 'updated';
                        if (body.status === 'ACCEPTED') verb = 'accepted and is scheduled';
                        if (body.status === 'IN_PROGRESS') verb = 'started by our staff';
                        if (body.status === 'COMPLETED') verb = 'successfully completed';
                        if (body.status === 'CANCELLED') verb = 'cancelled';

                        await prisma.inAppNotification.create({
                            data: {
                                userId: guestUser.id,
                                title: body.status === 'COMPLETED' ? '✓ Request Complete' : 'Service Update',
                                description: `Your request for "${updated.title}" has been ${verb}.`,
                                type: 'SYSTEM',
                                isRead: false
                            }
                        });
                    }
                }
            } catch (notifyErr) {
                console.error('[NOTIFICATION_ERR]', notifyErr);
            }
        }

        return NextResponse.json(updated)
    } catch (error) {
        console.error('[SERVICE_DETAIL_PATCH]', error)
        return new NextResponse('Internal Error', { status: 500 })
    }
}
