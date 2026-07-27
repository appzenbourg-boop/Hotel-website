import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { getRazorpayForProperty } from '@/lib/razorpay';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { 
            razorpay_order_id, 
            razorpay_payment_id, 
            razorpay_signature,
            propertyId 
        } = body;

        const rz = await getRazorpayForProperty(propertyId);
        const secret = rz.keySecret;

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
            // Fallback check against default global secret if property-specific key mismatched
            const globalSecret = (process.env.RAZORPAY_KEY_SECRET || '').trim();
            const globalSignature = crypto
                .createHmac('sha256', globalSecret)
                .update(razorpay_order_id + "|" + razorpay_payment_id)
                .digest('hex');

            if (globalSignature !== razorpay_signature) {
                console.error('[PAYMENT_VERIFY] Signature mismatch');
                return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });
            }
        }

        // ── Post-Payment Database Synchronization ────────────────────────────
        // Fetch the order from Razorpay to get metadata and amount
        const order = (await rz.client.orders.fetch(razorpay_order_id)) as any;
        const { bookingId, requestId } = order.notes || {};
        
        // Use order.amount (paisa) as the source of truth
        const paidAmount = Number(order.amount) / 100;

        console.log(`[PAYMENT_VERIFY] Processing successful payment: Order ${razorpay_order_id}, Amount ₹${paidAmount}`);

        if (bookingId) {
            const updatedBooking = await prisma.booking.update({
                where: { id: bookingId },
                data: {
                    paidAmount: { increment: paidAmount },
                    paymentStatus: 'PAID',
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
        }

        return NextResponse.json({
            success: true,
            message: 'Payment verified and status updated successfully',
            orderId: razorpay_order_id,
            paymentId: razorpay_payment_id
        });

    } catch (error: any) {
        console.error('[PAYMENT_VERIFY_ERROR]', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
