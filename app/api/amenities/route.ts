import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const propertyId = searchParams.get('propertyId');

        const where: any = { isActive: true };
        if (propertyId) {
            where.propertyId = propertyId;
        }

        const amenities = await prisma.amenity.findMany({
            where,
            include: {
                property: {
                    select: {
                        name: true,
                    },
                },
            },
            orderBy: {
                category: 'asc',
            },
        });

        return NextResponse.json({
            success: true,
            amenities,
            count: amenities.length,
        });
    } catch (error) {
        console.error('Get amenities error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
