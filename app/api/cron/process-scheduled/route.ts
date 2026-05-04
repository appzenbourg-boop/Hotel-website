import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { sendSMS } from '@/lib/twilio';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const now = new Date();
        
        // 1. Find scheduled wake-up calls that are due and not yet completed
        const wakeupCalls = await prisma.serviceRequest.findMany({
            where: {
                type: 'WAKEUP',
                status: { in: ['PENDING', 'ACCEPTED'] },
                scheduledAt: {
                    lte: now,
                    not: null
                }
            },
            include: {
                guest: true,
                room: true
            }
        });

        console.log(`[CRON] Found ${wakeupCalls.length} wake-up calls to process`);

        const results = [];

        for (const call of wakeupCalls) {
            try {
                if (call.guest?.phone) {
                    const message = `Good morning ${call.guest.name || 'Guest'}! This is your scheduled wake-up call for Room ${call.room?.roomNumber || 'your room'}. We hope you have a wonderful day ahead!`;
                    const targetPhone = call.guest.phone.startsWith('+') ? call.guest.phone : `+91${call.guest.phone}`;
                    
                    await sendSMS(targetPhone, message);
                    
                    // Mark as completed
                    await prisma.serviceRequest.update({
                        where: { id: call.id },
                        data: {
                            status: 'COMPLETED',
                            completedAt: now,
                            notes: (call.notes || '') + '\n[System] Wake-up SMS sent successfully.'
                        }
                    });

                    results.push({ id: call.id, status: 'SUCCESS' });
                } else {
                    results.push({ id: call.id, status: 'MISSING_PHONE' });
                }
            } catch (err: any) {
                console.error(`[CRON] Failed to process wakeup call ${call.id}:`, err.message);
                results.push({ id: call.id, status: 'ERROR', error: err.message });
            }
        }

        return NextResponse.json({
            success: true,
            processedCount: wakeupCalls.length,
            results
        });
    } catch (error: any) {
        console.error('[CRON_ERROR]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
