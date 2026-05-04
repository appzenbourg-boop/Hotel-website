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

        const userProfile = await prisma.user.findUnique({
            where: { phone: user.phone },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true,
                status: true,
            },
        });

        if (!userProfile) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Get guest profile
        const guestProfile = await prisma.guest.findUnique({
            where: { phone: user.phone },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                address: true,
                idType: true,
                idNumber: true,
                checkInStatus: true,
                language: true,
            },
        });

        return NextResponse.json({
            success: true,
            user: userProfile,
            guest: guestProfile,
        });
    } catch (error) {
        console.error('Get profile error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    try {
        const user = getUserFromToken(request);
        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { name, email, address, language } = body;

        // Update user
        const updatedUser = await prisma.user.update({
            where: { phone: user.phone },
            data: {
                name: name || undefined,
                email: email || undefined,
            },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true,
                status: true,
            },
        });

        // Update guest profile
        const updatedGuest = await prisma.guest.update({
            where: { phone: user.phone },
            data: {
                name: name || undefined,
                email: email || undefined,
                address: address || undefined,
                language: language || undefined,
            },
        });

        return NextResponse.json({
            success: true,
            user: updatedUser,
            guest: updatedGuest,
            message: 'Profile updated successfully',
        });
    } catch (error) {
        console.error('Update profile error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
