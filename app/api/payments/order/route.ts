import { NextRequest, NextResponse } from 'next/server';
import { razorpay } from '@/lib/razorpay';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'dev-secret-123';

export async function POST(req: NextRequest) {
    try {
        // Simple auth check for Guest app
        const authHeader = req.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET) as any;

        const body = await req.json();
        const { amount, currency = 'INR', receipt, notes } = body;

        if (!amount) {
            return NextResponse.json({ error: 'Amount is required' }, { status: 400 });
        }

        const options = {
            amount: Math.round(amount * 100), // convert to paisa
            currency,
            receipt: receipt || `rcpt_${Date.now()}`,
            notes: {
                ...notes,
                userId: decoded.userId,
            }
        };

        const order = await razorpay.orders.create(options);

        return NextResponse.json({
            success: true,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            key: process.env.RAZORPAY_KEY_ID?.trim()
        });

    } catch (error: any) {
        console.error('[PAYMENT_ORDER_ERROR]', error);
        return NextResponse.json({ error: error.message || 'Internal Error' }, { status: 500 });
    }
}
