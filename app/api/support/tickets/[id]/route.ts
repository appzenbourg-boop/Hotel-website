import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getServerSession } from 'next-auth';

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession() as any;
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { status, priority } = body;

        const updateData: any = {};
        if (status) updateData.status = status;
        if (priority) updateData.priority = priority;

        const ticket = await (prisma as any).supportTicket.update({
            where: { id: params.id },
            data: updateData
        });

        return NextResponse.json({
            success: true,
            ticket
        });
    } catch (error) {
        console.error('Update ticket error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const ticket = await (prisma as any).supportTicket.findUnique({
            where: { id: params.id },
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' }
                },
                guest: {
                    select: { name: true, phone: true, email: true }
                },
                property: {
                    select: { name: true }
                }
            }
        });

        if (!ticket) {
            return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            ticket
        });
    } catch (error) {
        console.error('Get ticket error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
