import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, phone, password, email } = body;

        if (!name || !phone || !password) {
            return NextResponse.json(
                { error: 'Name, phone, and password are required' },
                { status: 400 }
            );
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { phone },
        });

        if (existingUser) {
            return NextResponse.json(
                { error: 'User with this phone number already exists' },
                { status: 409 }
            );
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user and guest profile
        const user = await prisma.user.create({
            data: {
                name,
                phone,
                email: email || null,
                password: hashedPassword,
                role: 'GUEST',
                status: 'ACTIVE',
            },
        });

        // Create guest profile
        await prisma.guest.create({
            data: {
                name,
                phone,
                email: email || null,
            },
        });

        // Return user data without password
        const { password: _, ...userWithoutPassword } = user;

        return NextResponse.json({
            success: true,
            user: userWithoutPassword,
            message: 'Account created successfully',
        });
    } catch (error) {
        console.error('Signup error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
