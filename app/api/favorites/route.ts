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

export async function GET(request: NextRequest) {
    try {
        const user = getUserFromToken(request);
        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const guest = await prisma.guest.findUnique({
            where: { phone: user.phone },
        });

        if (!guest) {
            return NextResponse.json(
                { error: 'Guest profile not found' },
                { status: 404 }
            );
        }

        const favorites = await prisma.favorite.findMany({
            where: {
                guestId: guest.id,
            },
            include: {
                room: {
                    include: {
                        property: {
                            select: {
                                name: true,
                                address: true,
                            }
                        }
                    }
                },
            },
        });

        return NextResponse.json({
            success: true,
            favorites: favorites.map(f => f.room),
        });
    } catch (error) {
        console.error('Get favorites error:', error);
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

        const { roomId } = await request.json();

        if (!roomId) {
            return NextResponse.json(
                { error: 'Room ID is required' },
                { status: 400 }
            );
        }

        const guest = await prisma.guest.findUnique({
            where: { phone: user.phone },
        });

        if (!guest) {
            return NextResponse.json(
                { error: 'Guest profile not found' },
                { status: 404 }
            );
        }

        // Check if favorite already exists
        const existing = await prisma.favorite.findUnique({
            where: {
                guestId_roomId: {
                    guestId: guest.id,
                    roomId,
                },
            },
        });

        if (existing) {
            // Already a favorite, do nothing or remove? 
            // POST is usually create. Let's make it idempotent - if exists, return success.
            return NextResponse.json({
                success: true,
                message: 'Room already in favorites',
            });
        }

        await prisma.favorite.create({
            data: {
                guestId: guest.id,
                roomId,
            },
        });

        return NextResponse.json({
            success: true,
            message: 'Room added to favorites',
        });
    } catch (error) {
        console.error('Add favorite error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const user = getUserFromToken(request);
        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const roomId = searchParams.get('roomId');

        if (!roomId) {
            return NextResponse.json(
                { error: 'Room ID is required' },
                { status: 400 }
            );
        }

        const guest = await prisma.guest.findUnique({
            where: { phone: user.phone },
        });

        if (!guest) {
            return NextResponse.json(
                { error: 'Guest profile not found' },
                { status: 404 }
            );
        }

        try {
            await prisma.favorite.delete({
                where: {
                    guestId_roomId: {
                        guestId: guest.id,
                        roomId,
                    },
                },
            });
        } catch (e) {
            // Ignore if not found
        }

        return NextResponse.json({
            success: true,
            message: 'Room removed from favorites',
        });
    } catch (error) {
        console.error('Remove favorite error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
