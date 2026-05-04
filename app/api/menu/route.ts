import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category');
        const isVeg = searchParams.get('isVeg');
        const search = searchParams.get('search');
        const propertyId = searchParams.get('propertyId');

        const where: any = {
            isAvailable: true,
        };

        if (propertyId) {
            where.propertyId = propertyId;
        }

        if (category) {
            where.category = category;
        }

        if (isVeg !== null) {
            where.isVeg = isVeg === 'true';
        }

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { category: { contains: search, mode: 'insensitive' } },
            ];
        }

        const menuItems = await prisma.menuItem.findMany({
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
            menuItems,
            count: menuItems.length,
        });
    } catch (error) {
        console.error('Get menu items error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
