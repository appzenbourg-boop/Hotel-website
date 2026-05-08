import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth/middleware'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/payouts
 * Returns payout stats (revenue, balance, paid out) & request history
 */
export async function GET(req: NextRequest) {
    try {
        const authResult = await requireAuth(req, ['SUPER_ADMIN', 'HOTEL_ADMIN', 'MANAGER'])
        if (authResult instanceof NextResponse) return authResult

        const { searchParams } = new URL(req.url)
        let propertyId = searchParams.get('propertyId')

        // If not Super Admin, strictly enforce their own propertyId
        if (authResult.user.role !== 'SUPER_ADMIN') {
            propertyId = authResult.user.propertyId ?? null
        }

        if (!propertyId) {
            return NextResponse.json({ error: 'Property ID required' }, { status: 400 })
        }

        // 1. Calculate Total Revenue from actual booking payments (sum of paidAmount)
        const bookings = await prisma.booking.findMany({
            where: { propertyId },
            select: { paidAmount: true }
        })
        const totalRevenue = bookings.reduce((sum, b) => sum + (b.paidAmount || 0), 0)

        // 2. Fetch Payout Requests
        const payoutRequests = await prisma.payoutRequest.findMany({
            where: { propertyId },
            orderBy: { requestedAt: 'desc' }
        })

        const totalPaidOut = payoutRequests
            .filter(r => r.status === 'SUCCESS')
            .reduce((sum, r) => sum + r.amount, 0)

        const pendingPayout = payoutRequests
            .filter(r => r.status === 'PENDING')
            .reduce((sum, r) => sum + r.amount, 0)

        const currentBalance = Math.max(0, totalRevenue - totalPaidOut - pendingPayout)

        // 3. If SUPER_ADMIN, fetch ALL pending requests for the ledger view
        let allRequests: any[] = []
        if (authResult.user.role === 'SUPER_ADMIN') {
            const rawRequests = await prisma.payoutRequest.findMany({
                orderBy: { requestedAt: 'desc' }
            })
            // Attach property names
            allRequests = await Promise.all(rawRequests.map(async (r) => {
                const prop = await prisma.property.findUnique({
                    where: { id: r.propertyId },
                    select: { name: true }
                })
                return {
                    ...r,
                    propertyName: prop?.name ?? 'Unknown Hotel'
                }
            }))
        }

        return NextResponse.json({
            success: true,
            stats: {
                totalRevenue,
                totalPaidOut,
                pendingPayout,
                currentBalance
            },
            payoutRequests,
            allRequests: authResult.user.role === 'SUPER_ADMIN' ? allRequests : undefined
        })

    } catch (error: any) {
        console.error('[PAYOUTS_GET_ERROR]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

/**
 * POST /api/admin/payouts
 * 1. Create Request (Hotel Admin / Manager)
 * 2. Process Request (Super Admin)
 */
export async function POST(req: NextRequest) {
    try {
        const authResult = await requireAuth(req, ['SUPER_ADMIN', 'HOTEL_ADMIN', 'MANAGER'])
        if (authResult instanceof NextResponse) return authResult

        const body = await req.json()
        const { action, amount, requestId, transactionId, notes } = body

        // Flow A: Create Payout Request (Hotel Admin / Manager)
        if (action === 'CREATE_REQUEST') {
            if (authResult.user.role === 'SUPER_ADMIN') {
                return NextResponse.json({ error: 'Super Admin cannot request a payout' }, { status: 403 })
            }

            const propertyId = authResult.user.propertyId
            if (!propertyId) {
                return NextResponse.json({ error: 'No associated property found' }, { status: 400 })
            }

            const requestAmount = parseFloat(amount)
            if (isNaN(requestAmount) || requestAmount <= 0) {
                return NextResponse.json({ error: 'Invalid payout amount' }, { status: 400 })
            }

            // 1. Verify Balance
            const bookings = await prisma.booking.findMany({
                where: { propertyId },
                select: { paidAmount: true }
            })
            const totalRevenue = bookings.reduce((sum, b) => sum + (b.paidAmount || 0), 0)

            const previousRequests = await prisma.payoutRequest.findMany({
                where: { propertyId }
            })
            const totalPaidOut = previousRequests
                .filter(r => r.status === 'SUCCESS')
                .reduce((sum, r) => sum + r.amount, 0)

            const pendingPayout = previousRequests
                .filter(r => r.status === 'PENDING')
                .reduce((sum, r) => sum + r.amount, 0)

            const currentBalance = totalRevenue - totalPaidOut - pendingPayout

            if (requestAmount > currentBalance) {
                return NextResponse.json({ error: `Insufficient balance. Maximum requestable is ₹${currentBalance}` }, { status: 400 })
            }

            // 2. Fetch current Bank Details from PropertySettings
            const settings = await prisma.propertySettings.findUnique({
                where: { propertyId }
            })

            const bankDetails = {
                bankAccountName: settings?.bankAccountName ?? null,
                bankAccountNumber: settings?.bankAccountNumber ?? null,
                bankIfscCode: settings?.bankIfscCode ?? null,
                bankName: settings?.bankName ?? null,
                bankBranch: settings?.bankBranch ?? null,
                upiId: settings?.upiId ?? null
            }

            if (!bankDetails.bankAccountNumber && !bankDetails.upiId) {
                return NextResponse.json({ error: 'Please set up your Bank Account or UPI ID in Settings -> Financial & Tax first.' }, { status: 400 })
            }

            // 3. Create Request
            const newRequest = await prisma.payoutRequest.create({
                data: {
                    propertyId,
                    amount: requestAmount,
                    status: 'PENDING',
                    bankDetails
                }
            })

            return NextResponse.json({ success: true, payoutRequest: newRequest })
        }

        // Flow B: Process Payout Request (Super Admin Only)
        if (action === 'PROCESS_REQUEST') {
            if (authResult.user.role !== 'SUPER_ADMIN') {
                return NextResponse.json({ error: 'Unauthorized. Super Admin only.' }, { status: 403 })
            }

            if (!requestId) {
                return NextResponse.json({ error: 'Request ID is required' }, { status: 400 })
            }

            const request = await prisma.payoutRequest.findUnique({
                where: { id: requestId }
            })

            if (!request) {
                return NextResponse.json({ error: 'Payout request not found' }, { status: 404 })
            }

            if (request.status !== 'PENDING') {
                return NextResponse.json({ error: 'This request has already been processed.' }, { status: 400 })
            }

            const processAction = body.processAction // 'APPROVE' or 'REJECT'
            if (processAction === 'APPROVE') {
                if (!transactionId || transactionId.trim() === '') {
                    return NextResponse.json({ error: 'Transaction ID / UTR is required to mark as Paid' }, { status: 400 })
                }

                const updated = await prisma.payoutRequest.update({
                    where: { id: requestId },
                    data: {
                        status: 'SUCCESS',
                        transactionId,
                        processedAt: new Date(),
                        notes: notes ?? 'Manually processed by Super Admin'
                    }
                })

                return NextResponse.json({ success: true, payoutRequest: updated })
            } else if (processAction === 'REJECT') {
                const updated = await prisma.payoutRequest.update({
                    where: { id: requestId },
                    data: {
                        status: 'REJECTED',
                        processedAt: new Date(),
                        notes: notes ?? 'Rejected by Super Admin'
                    }
                })

                return NextResponse.json({ success: true, payoutRequest: updated })
            }

            return NextResponse.json({ error: 'Invalid process action' }, { status: 400 })
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

    } catch (error: any) {
        console.error('[PAYOUTS_POST_ERROR]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
