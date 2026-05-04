import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const propertyId = searchParams.get('propertyId');

        if (!propertyId) {
            return NextResponse.json({ error: 'propertyId is required' }, { status: 400 });
        }

        const configs = await prisma.serviceConfig.findMany({
            where: { propertyId },
            include: { steps: { orderBy: { order: 'asc' } } }
        });

        return NextResponse.json({
            success: true,
            configs,
            count: configs.length
        });
    } catch (error: any) {
        console.error('Get service configs error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
