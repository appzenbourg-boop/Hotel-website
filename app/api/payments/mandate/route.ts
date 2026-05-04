import { NextRequest, NextResponse } from 'next/server';
import { razorpay } from '@/lib/razorpay';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/db';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'dev-secret-123';

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET) as any;

        // Fetch user from DB to get email/phone
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const body = await req.json();
        const { amount = 0, currency = 'INR' } = body; 

        // 1. Create Customer in Razorpay if needed
        // For simplicity, we create a new one or you can store razorpay_customer_id in user model
        const customer = await razorpay.customers.create({
            name: user.name || 'Valued Guest',
            email: user.email || `${user.phone}@zenbourg.com`,
            contact: user.phone
        });

        // 2. Create Order for Mandate (auth only or small amount for registration)
        const options = {
            amount: amount * 100 || 0, // 0 for mandate registration in some flows, or small amount
            currency: currency,
            payment_capture: 1,
            method: 'emandate', // This tells Razorpay it's a mandate
            customer_id: customer.id,
            receipt: `mandate_${Date.now()}`,
            token: {
                auth_type: 'pin', // or 'otp'
                max_amount: 500000, // Max allowed for future deductions (5k INR in paisa?) No, 5L paisa = 5k. 
                expire_at: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60), // 1 year
                frequency: 'as_and_when'
            },
            notes: {
                userId: user.id,
                type: 'EMANDATE_REGISTRATION'
            }
        };

        const order = await razorpay.orders.create(options as any);

        return NextResponse.json({
            success: true,
            orderId: order.id,
            customer_id: customer.id,
            key: process.env.RAZORPAY_KEY_ID?.trim()
        });

    } catch (error: any) {
        console.error('[MANDATE_ERROR]', error);
        return NextResponse.json({ error: error.message || 'Internal Error' }, { status: 500 });
    }
}
