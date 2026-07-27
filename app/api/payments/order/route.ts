import { NextRequest, NextResponse } from 'next/server';
import { getRazorpayForProperty } from '@/lib/razorpay';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'dev-secret-123';

export async function POST(req: NextRequest) {
    try {
        // Auth check for Guest app
        const authHeader = req.headers.get('authorization');
        let userId = 'guest';
        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const token = authHeader.split(' ')[1];
                const decoded = jwt.verify(token, JWT_SECRET) as any;
                userId = decoded.userId || decoded.id || 'guest';
            } catch { /* optional token verification fallback */ }
        }

        const body = await req.json();
        const { amount, currency = 'INR', receipt, notes, propertyId } = body;

        if (!amount) {
            return NextResponse.json({ error: 'Amount is required' }, { status: 400 });
        }

        const targetPropertyId = propertyId || notes?.propertyId;
        const rz = await getRazorpayForProperty(targetPropertyId);

        const options = {
            amount: Math.round(amount * 100), // convert to paisa
            currency,
            receipt: receipt || `rcpt_${Date.now()}`,
            notes: {
                ...notes,
                userId,
                propertyId: targetPropertyId || '',
            }
        };

        const order = await rz.client.orders.create(options);

        return NextResponse.json({
            success: true,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            key: rz.keyId
        });

    } catch (error: any) {
        console.error('[PAYMENT_ORDER_ERROR]', error);
        return NextResponse.json({ error: error.message || 'Internal Error' }, { status: 500 });
    }
}
