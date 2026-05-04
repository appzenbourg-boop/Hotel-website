import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { 
            razorpay_order_id, 
            razorpay_payment_id, 
            razorpay_signature 
        } = body;

        const secret = process.env.RAZORPAY_KEY_SECRET?.trim();
        if (!secret) {
            return NextResponse.json({ error: 'Razorpay secret not configured' }, { status: 500 });
        }

        const generated_signature = crypto
            .createHmac('sha256', secret)
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest('hex');

        if (generated_signature !== razorpay_signature) {
            return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });
        }

        // Handle post-payment logic here (e.g., updating booking status)
        // For generic verification, we just return success
        return NextResponse.json({ 
            success: true, 
            message: 'Payment verified successfully' 
        });

    } catch (error: any) {
        console.error('[PAYMENT_VERIFY_ERROR]', error);
        return NextResponse.json({ error: error.message || 'Internal Error' }, { status: 500 });
    }
}
