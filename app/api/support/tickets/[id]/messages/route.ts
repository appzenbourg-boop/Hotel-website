import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getServerSession } from 'next-auth';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'dev-secret-123';

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        let userId = '';
        let userRole = '';

        // 1. Try Session Auth (Admin Panel)
        const session = await getServerSession() as any;
        if (session?.user) {
            userId = (session.user as any).id || session.user.email;
            userRole = session.user.role || 'ADMIN';
        } else {
            // 2. Try JWT Auth (Mobile App)
            const authHeader = request.headers.get('authorization');
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.substring(7);
                try {
                    const decoded = jwt.verify(token, JWT_SECRET) as any;
                    userId = decoded.userId;
                    userRole = decoded.role;

                    // Fallback to finding guest ID if it's a guest
                    if (userRole === 'GUEST') {
                        const guest = await (prisma as any).guest.findUnique({
                            where: { phone: decoded.phone }
                        });
                        if (guest) userId = guest.id;
                    }
                } catch (err) {
                    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
                }
            }
        }

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { content } = body;

        if (!content) {
            return NextResponse.json({ error: 'Content is required' }, { status: 400 });
        }

        // Add message to ticket
        const message = await (prisma as any).ticketMessage.create({
            data: {
                ticketId: params.id,
                senderId: userId,
                senderRole: userRole === 'SUPER_ADMIN' || userRole === 'PROPERTY_ADMIN' ? 'ADMIN' : 'GUEST',
                content,
            }
        });

        // Update ticket status
        if (userRole === 'GUEST') {
             await (prisma as any).supportTicket.update({
                where: { id: params.id },
                data: { status: 'OPEN' } // Re-open if guest replies
            });
        } else {
            await (prisma as any).supportTicket.update({
                where: { id: params.id },
                data: { status: 'IN_PROGRESS' } // Set to in progress if admin replies
            });
        }

        return NextResponse.json({
            success: true,
            message: 'Message sent successfully',
            data: message
        });
    } catch (error: any) {
        console.error('Send ticket message error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

