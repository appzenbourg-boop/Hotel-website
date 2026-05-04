import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import jwt from 'jsonwebtoken';
import { redis } from '@/lib/redis';

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

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');

        const cacheKey = `bookings:guest:${user.phone}:${status || 'ALL'}`;
        const cachedData = await redis.get(cacheKey);

        if (cachedData) {
            return NextResponse.json(cachedData);
        }

        // Find guest by user phone
        const guest = await prisma.guest.findUnique({
            where: { phone: user.phone },
        });

        if (!guest) {
            const emptyResult = {
                success: true,
                bookings: [],
                count: 0,
            };
            return NextResponse.json(emptyResult);
        }

        const where: any = {
            guestId: guest.id,
        };

        if (status) {
            where.status = status;
        }

        const bookings = await prisma.booking.findMany({
            where,
            include: {
                room: {
                    include: {
                        property: {
                            select: {
                                name: true,
                                address: true,
                                phone: true,
                                checkInTime: true,
                                checkOutTime: true,
                            },
                        },
                    },
                },
                guest: {
                    select: {
                        name: true,
                        phone: true,
                        email: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        const result = {
            success: true,
            bookings,
            count: bookings.length,
        };

        // Cache for 30 seconds
        await redis.set(cacheKey, result, { ex: 30 });

        return NextResponse.json(result);
    } catch (error) {
        console.error('Get bookings error:', error);
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

        const body = await request.json();
        const {
            roomId,
            checkIn,
            checkOut,
            numberOfGuests,
            specialRequests,
            totalAmount,
        } = body;

        if (!roomId || !checkIn || !checkOut || !numberOfGuests) {
            return NextResponse.json(
                { error: 'Missing required fields' },
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

        // Check if room exists and fetch details
        const room = await prisma.room.findUnique({
            where: { id: roomId },
        });

        if (!room) {
            return NextResponse.json(
                { error: 'Room not found' },
                { status: 404 }
            );
        }

        // Check for overlapping bookings
        const overlappingBookings = await prisma.booking.findFirst({
            where: {
                roomId,
                status: { in: ['RESERVED', 'CHECKED_IN'] },
                OR: [
                    {
                        checkIn: { lte: new Date(checkIn) },
                        checkOut: { gt: new Date(checkIn) }
                    },
                    {
                        checkIn: { lt: new Date(checkOut) },
                        checkOut: { gte: new Date(checkOut) }
                    },
                    {
                        checkIn: { gte: new Date(checkIn) },
                        checkOut: { lte: new Date(checkOut) }
                    }
                ]
            }
        });

        if (overlappingBookings) {
            return NextResponse.json(
                { error: 'Room is already booked for these dates' },
                { status: 400 }
            );
        }

        // Create booking
        const booking = await prisma.booking.create({
            data: {
                guestId: guest.id,
                roomId,
                propertyId: room.propertyId,
                checkIn: new Date(checkIn),
                checkOut: new Date(checkOut),
                numberOfGuests,
                specialRequests: specialRequests || null,
                totalAmount: totalAmount || (room.basePrice * (Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)) || 1)),
                paidAmount: 0,
                status: 'RESERVED',
                source: 'DIRECT',
                paymentStatus: 'PENDING',
            },
            include: {
                room: {
                    include: {
                        property: true,
                    },
                },
                guest: {
                    select: {
                        name: true,
                        phone: true,
                        email: true,
                    },
                },
            },
        });

        // Room status should only be OCCUPIED if the booking is currently active (CHECKED_IN)
        // For RESERVED, we keep it AVAILABLE in the general list, but it's blocked by the overlap check above.

        return NextResponse.json({
            success: true,
            booking,
            message: 'Booking created successfully',
        });
    } catch (error) {
        console.error('Create booking error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const user = getUserFromToken(request);
        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { bookingId, status } = body;

        if (!bookingId || !status) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Find guest by user phone to ensure ownership
        const guest = await prisma.guest.findUnique({
            where: { phone: user.phone },
        });

        if (!guest) {
            return NextResponse.json(
                { error: 'Guest profile not found' },
                { status: 404 }
            );
        }

        // Update booking
        const booking = await prisma.booking.update({
            where: {
                id: bookingId,
                guestId: guest.id // Ensure guest owns the booking
            },
            data: { status },
        });

        // Update room status based on booking status
        if (status === 'CHECKED_IN') {
            await prisma.room.update({
                where: { id: booking.roomId },
                data: { status: 'OCCUPIED' }
            });
        } else if (status === 'CHECKED_OUT') {
            await prisma.room.update({
                where: { id: booking.roomId },
                data: { status: 'AVAILABLE' }
            });
        }

        return NextResponse.json({
            success: true,
            booking,
            message: `Booking status updated to ${status}`,
        });
    } catch (error: any) {
        console.error('Update booking status error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
