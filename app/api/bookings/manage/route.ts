import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'dev-secret-123';

function getUserFromToken(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.substring(7);
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        return decoded;
    } catch (error) {
        return null;
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = getUserFromToken(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { bookingId, type, newCheckOut, newRoomId } = body;

        if (!bookingId || !type) {
            return NextResponse.json({ error: 'Booking ID and Type are required' }, { status: 400 });
        }

        // Find the booking
        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            include: { guest: true, room: true }
        });

        if (!booking) {
            return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
        }

        // Create a ServiceRequest (Concierge type) to act as the "Approval Request"
        const title = type === 'EXTEND' ? `Stay Extension Request` : `Room Upgrade Request`;
        const description = type === 'EXTEND' 
            ? `Guest wants to extend stay until ${new Date(newCheckOut).toLocaleDateString()}`
            : `Guest wants to upgrade from ${booking.room.type} to a premium room`;

        const serviceRequest = await prisma.serviceRequest.create({
            data: {
                type: 'CONCIERGE',
                title,
                description,
                guestId: booking.guestId,
                roomId: booking.roomId,
                propertyId: booking.propertyId!,
                priority: 'HIGH',
                status: 'PENDING',
                notes: JSON.stringify({
                    requestId: `SR-${Date.now()}`,
                    bookingId,
                    requestType: type,
                    newCheckOut: newCheckOut || null,
                    newRoomId: newRoomId || null,
                    isStayAdjustment: true
                })
            }
        });

        // Notify Staff (Optional: can add prisma.inAppNotification create here)
        // For now, we'll return success so the guest sees the pending state

        return NextResponse.json({
            success: true,
            requestId: serviceRequest.id,
            message: 'Your request has been submitted for approval.'
        });

    } catch (error: any) {
        console.error('Booking Manage Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
