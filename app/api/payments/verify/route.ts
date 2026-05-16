import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { razorpay } from '@/lib/razorpay';

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
            console.error('[PAYMENT_VERIFY] Razorpay secret missing');
            return NextResponse.json({ error: 'Razorpay secret not configured' }, { status: 500 });
        }

        // Verify the signature
        const generated_signature = crypto
            .createHmac('sha256', secret)
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest('hex');

        if (generated_signature !== razorpay_signature) {
            console.error('[PAYMENT_VERIFY] Signature mismatch');
            return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });
        }

        // ── Post-Payment Database Synchronization ────────────────────────────
        // Fetch the order from Razorpay to get metadata and amount
        const order = (await razorpay.orders.fetch(razorpay_order_id)) as any;
        const { bookingId, requestId } = order.notes || {};
        
        // Use order.amount (paisa) as the source of truth
        const paidAmount = Number(order.amount) / 100;

        console.log(`[PAYMENT_VERIFY] Processing successful payment: Order ${razorpay_order_id}, Amount ₹${paidAmount}`);

        if (bookingId) {
            const updatedBooking = await prisma.booking.update({
                where: { id: bookingId },
                data: {
                    paidAmount: { increment: paidAmount },
                    paymentStatus: 'PAID', // Or 'PARTIAL' if you want to support that logic
                    updatedAt: new Date()
                }
            });
            console.log(`[PAYMENT_VERIFY] Synchronized Booking ID: ${bookingId}. New total paid: ₹${updatedBooking.paidAmount}`);
        } else if (requestId) {
            await prisma.serviceRequest.update({
                where: { id: requestId },
                data: {
                    paymentStatus: 'PAID',
                    updatedAt: new Date()
                }
            });
            console.log(`[PAYMENT_VERIFY] Synchronized Service Request ID: ${requestId}`);
        } else {
            console.warn(`[PAYMENT_VERIFY] Payment verified but no bookingId or requestId found in order notes.`);
        }

        return NextResponse.json({ 
            success: true, 
            message: 'Payment verified and database synchronized' 
        });

    } catch (error: any) {
        console.error('[PAYMENT_VERIFY_ERROR]', error);
        return NextResponse.json({ error: error.message || 'Internal Error' }, { status: 500 });
    }
}
