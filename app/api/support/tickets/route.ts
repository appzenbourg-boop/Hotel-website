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
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { type, subject, message, propertyId, priority } = body;

        if (!type || !subject || !message) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Find guest by user phone
        const guest = await (prisma as any).guest.findUnique({
            where: { phone: user.phone },
        });

        if (!guest) {
            return NextResponse.json(
                { error: 'Guest profile not found' },
                { status: 404 }
            );
        }

        // Create support ticket
        const ticket = await (prisma as any).supportTicket.create({
            data: {
                guestId: guest.id,
                propertyId: propertyId || null,
                type,
                subject,
                message,
                status: 'OPEN',
                priority: priority || 'NORMAL',
            }
        });

        // Add the initial message
        await (prisma as any).ticketMessage.create({
            data: {
                ticketId: ticket.id,
                senderId: guest.id,
                senderRole: 'GUEST',
                content: message,
            }
        });

        // Create notifications for admins and owners
        try {
            // 1. Notify Super Admin
            const superAdmins = await prisma.user.findMany({
                where: { role: 'SUPER_ADMIN' }
            });

            const notifications = superAdmins.map(admin => ({
                userId: admin.id,
                title: `New Support Ticket`,
                description: `Ticket #${ticket.id.toString().slice(-6)} from ${guest.name}: ${subject}`,
                type: 'ALERT' as const,
            }));

            // 2. Notify Property Owners if propertyId is provided
            if (propertyId) {
                const property = await (prisma as any).property.findUnique({
                    where: { id: propertyId },
                    select: { ownerIds: true, name: true }
                });

                if (property && property.ownerIds) {
                    property.ownerIds.forEach((ownerId: string) => {
                        // Avoid duplicate if owner is also a super admin (unlikely but safe)
                        if (!superAdmins.find(a => a.id === ownerId)) {
                            notifications.push({
                                userId: ownerId,
                                title: `New Support Ticket - ${property.name}`,
                                description: `Guest ${guest.name} raised a ticket: ${subject}`,
                                type: 'ALERT' as const,
                            });
                        }
                    });
                }
            }

            // Create all notifications
            if (notifications.length > 0) {
                await (prisma as any).inAppNotification.createMany({
                    data: notifications
                });
            }
        } catch (notifErr) {
            console.error('Notification error:', notifErr);
        }

        return NextResponse.json({
            success: true,
            ticket,
            message: 'Support ticket created successfully',
        });
    } catch (error: any) {
        console.error('POST tickets error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
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

        if (!user.phone) {
             return NextResponse.json({ success: true, tickets: [] });
        }

        const guest = await (prisma as any).guest.findUnique({
            where: { phone: user.phone },
        });

        if (!guest) {
            return NextResponse.json({ success: true, tickets: [] });
        }

        const tickets = await (prisma as any).supportTicket.findMany({
            where: { guestId: guest.id },
            include: {
                messages: true,
                property: {
                    select: { name: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({
            success: true,
            tickets
        });
    } catch (error: any) {
        console.error('GET tickets error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
