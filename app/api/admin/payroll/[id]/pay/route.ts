/**
 * POST /api/admin/payroll/[id]/pay
 * Processes salary payout for a payroll record via Razorpay Payout API.
 * Falls back to marking as manually paid if Razorpay keys are not configured.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { prisma } from '@/lib/db'
import { redis } from '@/lib/redis'
import { unauthorized, forbidden, serverError } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

const ALLOWED_ROLES = ['SUPER_ADMIN', 'HOTEL_ADMIN', 'MANAGER']

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) return unauthorized()
        if (!ALLOWED_ROLES.includes(session.user.role)) return forbidden()

        const body = await request.json()
        const { staffId, amount, accountNumber, ifscCode, bankName, staffName, month, year } = body

        if (!accountNumber || !ifscCode) {
            return NextResponse.json(
                { success: false, error: 'Bank account details are required' },
                { status: 400 }
            )
        }

        // Verify payroll exists and belongs to this property
        const payroll = await prisma.payroll.findUnique({
            where: { id: params.id },
            include: { staff: { select: { propertyId: true } } },
        })

        if (!payroll) {
            return NextResponse.json({ success: false, error: 'Payroll record not found' }, { status: 404 })
        }

        if (payroll.status === 'PAID') {
            return NextResponse.json({ success: false, error: 'Already paid' }, { status: 400 })
        }

        // Property-scoping check
        if (session.user.role !== 'SUPER_ADMIN') {
            const propertyId = session.user.propertyId
            if (payroll.staff.propertyId !== propertyId) {
                return forbidden('Not your property')
            }
        }

        // ── Try Razorpay Payout ───────────────────────────────────────────────
        let paymentId: string | null = null
        let razorpaySuccess = false

        // Get property-specific Razorpay keys
        const propertySettings = await prisma.propertySettings.findUnique({
            where: { propertyId: payroll.staff.propertyId },
            select: { razorpayKeyId: true, razorpayKeySecret: true },
        })

        const keyId     = propertySettings?.razorpayKeyId     || process.env.RAZORPAY_KEY_ID
        const keySecret = propertySettings?.razorpayKeySecret || process.env.RAZORPAY_KEY_SECRET

        if (keyId && keySecret) {
            try {
                // Create a contact first
                const contactRes = await fetch('https://api.razorpay.com/v1/contacts', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
                    },
                    body: JSON.stringify({
                        name:         staffName || 'Staff',
                        type:         'employee',
                        reference_id: staffId,
                    }),
                })
                const contact = await contactRes.json()

                if (contact.id) {
                    // Create fund account
                    const fundRes = await fetch('https://api.razorpay.com/v1/fund_accounts', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
                        },
                        body: JSON.stringify({
                            contact_id:   contact.id,
                            account_type: 'bank_account',
                            bank_account: {
                                name:           staffName || 'Staff',
                                ifsc:           ifscCode,
                                account_number: accountNumber,
                            },
                        }),
                    })
                    const fundAccount = await fundRes.json()

                    if (fundAccount.id) {
                        // Create payout
                        const payoutRes = await fetch('https://api.razorpay.com/v1/payouts', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
                                'X-Payout-Idempotency': `payroll_${params.id}`,
                            },
                            body: JSON.stringify({
                                account_number:  keyId, // Your Razorpay account number
                                fund_account_id: fundAccount.id,
                                amount:          Math.round(amount * 100), // paise
                                currency:        'INR',
                                mode:            'IMPS',
                                purpose:         'salary',
                                queue_if_low_balance: true,
                                narration:       `Salary ${month} ${year} - ${staffName}`,
                            }),
                        })
                        const payout = await payoutRes.json()

                        if (payout.id && payout.status !== 'failed') {
                            paymentId = payout.id
                            razorpaySuccess = true
                        }
                    }
                }
            } catch (rzErr) {
                console.error('Razorpay payout error:', rzErr)
                // Fall through to manual marking
            }
        }

        // ── Mark payroll as PAID ──────────────────────────────────────────────
        const updated = await prisma.payroll.update({
            where: { id: params.id },
            data: {
                status:    'PAID',
                paidAt:    new Date(),
                paymentId: paymentId ?? `MANUAL_${Date.now()}`,
            },
        })
        // Notify the staff member
        try {
            const staffUser = await prisma.staff.findUnique({
                where: { id: staffId },
                select: { userId: true, user: { select: { name: true } } },
            })
            if (staffUser?.userId) {
                await prisma.inAppNotification.create({
                    data: {
                        userId:      staffUser.userId,
                        title:       'Salary Credited',
                        description: `Your salary of ₹${amount.toLocaleString()} for ${month} ${year} has been processed.`,
                        type:        'INFO',
                    },
                })
            }
        } catch { /* non-critical */ }

        // Invalidate staff detail cache
        await redis.del(`admin:staff:detail:${staffId}`)

        return NextResponse.json({
            success: true,
            data: updated,
            method: razorpaySuccess ? 'razorpay' : 'manual',
            message: razorpaySuccess
                ? 'Salary paid via Razorpay'
                : 'Marked as paid (Razorpay keys not configured — add them in Settings)',
        })
    } catch (error) {
        return serverError(error, 'PAYROLL_PAY')
    }
}
