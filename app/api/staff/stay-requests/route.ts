import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);
    const allowedRoles = ['STAFF', 'MANAGER', 'RECEPTIONIST', 'HOTEL_ADMIN', 'SUPER_ADMIN'];
    
    if (!session || !allowedRoles.includes(session.user.role)) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        // Fetch service requests that are stay adjustments
        const rawRequests = await prisma.serviceRequest.findMany({
            where: {
                type: 'CONCIERGE',
                status: 'PENDING',
                notes: { contains: '"isStayAdjustment":true' }
            },
            include: {
                guest: {
                    select: { name: true, phone: true }
                },
                room: {
                    select: { roomNumber: true, type: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Parse notes to get structured data
        const requests = rawRequests.map(req => {
            let details = {};
            try {
                details = JSON.parse(req.notes || '{}');
            } catch (e) {}

            return {
                id: req.id,
                type: (details as any).requestType || 'EXTEND',
                createdAt: req.createdAt,
                newCheckOut: (details as any).newCheckOut,
                newRoomId: (details as any).newRoomId,
                booking: {
                    id: (details as any).bookingId,
                    guest: req.guest,
                    room: req.room,
                    checkOut: req.room ? '---' : '---' // In a real app we'd fetch the booking separately
                }
            };
        });

        return NextResponse.json({ success: true, requests });
    } catch (error) {
        console.error('Staff Stay Requests GET Error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
