import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import jwt from 'jsonwebtoken';
import { performAutoAssignment } from '@/lib/service-utils';

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

export async function GET(request: NextRequest) {
    try {
        const user = getUserFromToken(request);
        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // HYDRATION FALLBACK: Fix token missing 'phone' field from cloud to prevent Prisma explosions
        if (!user.phone && user.id) {
            const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { phone: true } });
            if (dbUser) user.phone = dbUser.phone;
        }

        // Find guest by user phone
        const guest = await prisma.guest.findUnique({
            where: { phone: user.phone },
        });

        if (!guest) {
            return NextResponse.json({
                success: true,
                serviceRequests: [],
                count: 0,
            });
        }

        const serviceRequests = await prisma.serviceRequest.findMany({
            where: {
                guestId: guest.id,
            },
            include: {
                room: {
                    select: {
                        roomNumber: true,
                        floor: true,
                    },
                },
                assignedTo: {
                    select: {
                        user: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        return NextResponse.json({
            success: true,
            serviceRequests,
            count: serviceRequests.length,
        });
    } catch (error) {
        console.error('Get service requests error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = getUserFromToken(request);
        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // HYDRATION FALLBACK: Fix token missing 'phone' field from cloud to prevent Prisma explosions
        if (!user.phone && user.id) {
            const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { phone: true } });
            if (dbUser) user.phone = dbUser.phone;
        }

        const body = await request.json();
        const {
            type,
            title,
            description,
            roomId,
            priority,
            amount,
            scheduledAt,
        } = body;

        if (!type || !title) {
            return NextResponse.json(
                { error: 'Type and title are required' },
                { status: 400 }
            );
        }

        // Find guest by user phone
        const guest = await prisma.guest.findUnique({
            where: { phone: user.phone },
        });

        if (!guest) {
            return NextResponse.json(
                { error: 'Guest profile not found' },
                { status: 404 }
            );
        }

        // Find room to get propertyId
        let propertyId = body.propertyId; // Optional fallback from body
        if (roomId) {
            const room = await prisma.room.findUnique({
                where: { id: roomId },
                select: { propertyId: true }
            });
            if (room) {
                propertyId = room.propertyId;
            }
        }

        if (!propertyId) {
            return NextResponse.json(
                { error: 'Could not determine property for this request' },
                { status: 400 }
            );
        }

        const serviceRequest = await prisma.serviceRequest.create({
            data: {
                type,
                title,
                description: description || null,
                guestId: guest.id,
                roomId: roomId || null,
                propertyId: propertyId, // Added missing propertyId
                priority: priority || 'NORMAL',
                status: 'PENDING',
                amount: amount || null,
                paymentStatus: amount ? 'PENDING' : null,
                slaMinutes: body.slaMinutes || 30, // Get SLA from body or default
                assignedToId: null,
                scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
            },
            include: {
                room: {
                    select: {
                        roomNumber: true,
                        floor: true,
                    },
                },
            },
        });

        // NEW: Send SMS Confirmation to Guest
        try {
            const { sendSMS } = require('@/lib/twilio');
            const message = `Hi ${guest.name || 'Guest'}, we've received your request for "${title}" (Room ${serviceRequest.room?.roomNumber}). Priority: ${priority || 'NORMAL'}. Our team will assist you shortly.`;
            
            if (guest.phone) {
                const targetPhone = guest.phone.startsWith('+') ? guest.phone : `+91${guest.phone}`;
                await sendSMS(targetPhone, message);
            }
        } catch (smsErr) {
            console.error('Failed to send request confirmation SMS:', smsErr);
        }

        // AUTO-ASSIGN immediately (Guarded in try/catch to prevent internal crashes)
        try {
            await performAutoAssignment(propertyId, 0);
        } catch (autoAssignErr) {
            console.error('[AUTO-ASSIGN CRASH]', autoAssignErr);
        }

        // 🚀 BROADCAST TO ADMIN PANEL (Triggers active alert dashboard logic & Sound)
        try {
            const property = await prisma.property.findUnique({
                where: { id: propertyId },
                select: { ownerIds: true }
            });
            const admins = await prisma.user.findMany({
                where: {
                    OR: [
                        { id: { in: property?.ownerIds || [] } },
                        { role: { in: ['SUPER_ADMIN', 'HOTEL_ADMIN', 'MANAGER'] }, workplaceId: propertyId }
                    ]
                },
                select: { id: true }
            });
            if (admins.length > 0) {
                await prisma.inAppNotification.createMany({
                    data: admins.map(admin => ({
                        userId: admin.id,
                        title: `New Service Request`,
                        description: `${title} from Room ${serviceRequest.room?.roomNumber || 'N/A'}`,
                        type: 'TASK',
                        isRead: false
                    }))
                });
            }
        } catch(broadcastErr) {
            console.error('Failed to broadcast admin alerts:', broadcastErr);
        }

        return NextResponse.json({
            success: true,
            serviceRequest,
            message: 'Service request created successfully',
        });
    } catch (error: any) {
        console.error('Create service request error FATAL:', error);
        // Return the REAL exception to the user screen for debugging!
        return NextResponse.json(
            { 
                error: 'Internal server error (DEBUG)', 
                details: error?.message || 'Unknown error',
                stack: error?.stack?.split('\n').slice(0, 3)
            },
            { status: 500 }
        );
    }
}
