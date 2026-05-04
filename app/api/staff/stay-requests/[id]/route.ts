import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db';

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions);
    const allowedRoles = ['STAFF', 'MANAGER', 'RECEPTIONIST', 'HOTEL_ADMIN', 'SUPER_ADMIN'];
    
    if (!session || !allowedRoles.includes(session.user.role)) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const body = await request.json();
        const { status } = body; // APPROVED or REJECTED

        const serviceRequest = await prisma.serviceRequest.findUnique({
            where: { id: params.id }
        });

        if (!serviceRequest) {
            return NextResponse.json({ error: 'Request not found' }, { status: 404 });
        }

        const details = JSON.parse(serviceRequest.notes || '{}');
        const bookingId = details.bookingId;

        if (status === 'APPROVED') {
            // APPLY THE CHANGE TO THE ACTUAL BOOKING
            if (details.requestType === 'EXTEND' && details.newCheckOut) {
                await prisma.booking.update({
                    where: { id: bookingId },
                    data: { checkOut: new Date(details.newCheckOut) }
                });
            } else if (details.requestType === 'UPGRADE' && details.newRoomId) {
                await prisma.booking.update({
                    where: { id: bookingId },
                    data: { roomId: details.newRoomId }
                });
                
                // If it's an upgrade and they are already checked in, update room status
                const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
                if (booking?.status === 'CHECKED_IN') {
                    // Make old room available
                    await prisma.room.update({
                        where: { id: serviceRequest.roomId! },
                        data: { status: 'AVAILABLE' }
                    });
                    // Make new room occupied
                    await prisma.room.update({
                        where: { id: details.newRoomId },
                        data: { status: 'OCCUPIED' }
                    });
                }
            }

            // Update service request
            await prisma.serviceRequest.update({
                where: { id: params.id },
                data: { status: 'COMPLETED' }
            });
        } else {
            // REJECTED
            await prisma.serviceRequest.update({
                where: { id: params.id },
                data: { status: 'CANCELLED' }
            });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Staff Stay Requests PATCH Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
