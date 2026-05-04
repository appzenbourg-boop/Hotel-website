import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const url = new URL(request.url);
        const { searchParams } = url;
        const category = searchParams.get('category');
        const status = searchParams.get('status');
        const available = searchParams.get('available');
        const search = searchParams.get('search');
        const propertyId = searchParams.get('propertyId');

        // Check cache first
        const cacheKey = `rooms:${url.search}`;
        const cachedRooms = await redis.get(cacheKey);

        if (cachedRooms) {
            return NextResponse.json(cachedRooms);
        }

        const where: any = {};

        if (propertyId) {
            where.propertyId = propertyId;
        }

        if (category) {
            where.category = category;
        }

        if (status) {
            where.status = status;
        }

        if (available === 'true') {
            where.status = 'AVAILABLE';
        }

        if (search) {
            where.OR = [
                { property: { name: { contains: search, mode: 'insensitive' } } },
                { type: { contains: search, mode: 'insensitive' } },
            ];
        }

        const rooms = await prisma.room.findMany({
            where,
            include: {
                property: {
                    select: {
                        name: true,
                        address: true,
                        checkInTime: true,
                        checkOutTime: true,
                    },
                },
                bookings: {
                    where: {
                        status: {
                            in: ['RESERVED', 'CHECKED_IN'],
                        },
                    },
                    select: {
                        checkIn: true,
                        checkOut: true,
                        status: true,
                    },
                },
            },
            orderBy: {
                roomNumber: 'asc',
            },
        });

        const result = {
            success: true,
            rooms,
            count: rooms.length,
        };

        // Cache for 30 seconds to balance freshness and speed
        await redis.set(cacheKey, result, { ex: 30 });

        return NextResponse.json(result);
    } catch (error) {
        console.error('Get rooms error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
