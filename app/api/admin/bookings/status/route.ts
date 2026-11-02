import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { prisma } from '@/lib/db'
import { performAutoAssignment } from '@/lib/service-utils'
import { unauthorized, forbidden, badRequest, notFound, serverError } from '@/lib/api-response'
import { invalidateRoomAndDashboardCaches } from '@/lib/room-status'

export const dynamic = 'force-dynamic'

const ALLOWED_ROLES = ['SUPER_ADMIN', 'HOTEL_ADMIN', 'MANAGER', 'RECEPTIONIST']

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return unauthorized()
    if (!ALLOWED_ROLES.includes(session.user.role)) return forbidden()

    try {
        const body = await request.json()
        const { 
            bookingId, action, paymentMethod, paidAmount, paymentNotes, 
            posCharges, extraCharges, extraDiscount, 
            guestGstNumber, guestCompanyName, guestCompanyAddress,
            lateCheckoutCharge, lateCheckoutReason 
        } = body

        if (!bookingId || !action) return badRequest('bookingId and action are required')
        if (!['CHECK_IN', 'CHECK_OUT', 'CANCEL', 'NO_SHOW'].includes(action)) {
            return badRequest('action must be CHECK_IN, CHECK_OUT, CANCEL or NO_SHOW')
        }

        const existing = await prisma.booking.findUnique({
            where: { id: bookingId },
            include: { room: { select: { roomNumber: true, id: true } } },
        })
        if (!existing) return notFound('Booking')

        // Validate state transitions
        if (action === 'CHECK_IN' && existing.status !== 'RESERVED') {
            return badRequest('Only RESERVED bookings can be checked in')
        }
        if (action === 'CHECK_OUT' && existing.status !== 'CHECKED_IN') {
            return badRequest('Only CHECKED_IN bookings can be checked out')
        }
        if (action === 'CANCEL' && ['CHECKED_OUT', 'CANCELLED'].includes(existing.status)) {
            return badRequest('Booking is already completed or cancelled')
        }

        const statusMap: Record<string, string> = {
            CHECK_IN: 'CHECKED_IN',
            CHECK_OUT: 'CHECKED_OUT',
            CANCEL: 'CANCELLED',
            NO_SHOW: 'NO_SHOW',
        }
        const roomStatusMap: Record<string, string> = {
            CHECK_IN: 'OCCUPIED',
            CHECK_OUT: 'CLEANING',
            CANCEL: 'AVAILABLE',
            NO_SHOW: 'AVAILABLE',
        }

        const updateData: any = { status: statusMap[action] }
        if (action === 'CHECK_IN') updateData.actualCheckIn = new Date()
        if (action === 'CHECK_OUT') {
            updateData.actualCheckOut = new Date()
            if (paymentMethod) {
                updateData.paymentMethod = paymentMethod
            }

            const pC = posCharges ? parseFloat(posCharges) : 0
            const eC = extraCharges ? parseFloat(extraCharges) : 0
            const eD = extraDiscount ? parseFloat(extraDiscount) : 0
            const lC = lateCheckoutCharge ? parseFloat(lateCheckoutCharge) : 0

            // If half-day late check-out applied, record it explicitly in extraAddons list
            if (lC > 0) {
                const currentAddons = Array.isArray(existing.extraAddons) ? (existing.extraAddons as any[]) : []
                const lateItem = {
                    id: `late_checkout_${Date.now()}`,
                    name: `Late Check-Out (Standard 11:00 AM Departure - ${lateCheckoutReason || 'Half Day Tariff'})`,
                    price: lC,
                    qty: 1
                }
                updateData.extraAddons = [...currentAddons, lateItem]
            }

            if (pC > 0 || eC > 0 || eD > 0 || lC > 0) {
                const totalAdditional = pC + eC + lC
                updateData.extraAddonsAmount = (existing.extraAddonsAmount || 0) + totalAdditional
                updateData.discountAmount = (existing.discountAmount || 0) + eD
                const oldFinal = existing.finalAmount ?? existing.totalAmount ?? 0
                updateData.finalAmount = Math.max(0, oldFinal + totalAdditional - eD)
                updateData.totalAmount = (existing.totalAmount || 0) + totalAdditional
            }

            const currentFinalTotal = updateData.finalAmount !== undefined ? updateData.finalAmount : (existing.finalAmount ?? existing.totalAmount ?? 0)
            const newPaidAmount = paidAmount !== undefined ? parseFloat(paidAmount) : currentFinalTotal
            updateData.paidAmount = newPaidAmount
            updateData.paymentStatus = newPaidAmount >= currentFinalTotal ? 'PAID' : newPaidAmount > 0 ? 'PARTIAL' : existing.paymentStatus

            const notesList: string[] = []
            if (lC > 0) {
                notesList.push(`[Late Check-Out] Departure after 11:00 AM. Half-day surcharge applied: ₹${lC.toLocaleString('en-IN')}`)
            }
            if (paymentNotes && paymentNotes.trim() !== '') {
                const notePrefix = paymentMethod === 'CORPORATE_CLEARANCE' ? '[Corporate Clearance]' : `[${paymentMethod || 'Payment'}]`
                notesList.push(`${notePrefix} ${paymentNotes.trim()}`)
            }
            if (notesList.length > 0) {
                const newNoteText = notesList.join(' | ')
                updateData.notes = existing.notes ? `${existing.notes} | ${newNoteText}` : newNoteText
            }

            let formattedGst: string | null = null
            if (guestGstNumber !== undefined) {
                formattedGst = typeof guestGstNumber === 'string' ? guestGstNumber.trim().toUpperCase() : null
                updateData.guestGstNumber = formattedGst || null
            }
            if (guestCompanyName !== undefined) {
                updateData.guestCompanyName = guestCompanyName ? String(guestCompanyName).trim() : null
            }
            if (guestCompanyAddress !== undefined) {
                updateData.guestCompanyAddress = guestCompanyAddress ? String(guestCompanyAddress).trim() : null
            }

            if (existing.guestId && (formattedGst || guestCompanyName || guestCompanyAddress)) {
                await prisma.guest.update({
                    where: { id: existing.guestId },
                    data: {
                        ...(formattedGst ? { gstNumber: formattedGst } : {}),
                        ...(guestCompanyName ? { companyName: String(guestCompanyName).trim() } : {}),
                        ...(guestCompanyAddress ? { companyAddress: String(guestCompanyAddress).trim() } : {}),
                    }
                }).catch(() => {})
            }
        }

        const [booking] = await prisma.$transaction([
            prisma.booking.update({
                where: { id: bookingId },
                data: updateData,
                include: { room: { select: { roomNumber: true } }, guest: { select: { name: true } } },
            }),
            prisma.room.update({
                where: { id: existing.roomId },
                data: { status: roomStatusMap[action] as any },
            }),
        ])

        if (action === 'CHECK_OUT' && existing.propertyId) {
            const housekeepingTask = await prisma.serviceRequest.create({
                data: {
                    propertyId: existing.propertyId,
                    roomId: existing.roomId,
                    guestId: existing.guestId,
                    type: 'HOUSEKEEPING',
                    title: `Clean Room ${existing.room.roomNumber}`,
                    description: `Guest checked out at ${new Date().toLocaleTimeString()}. Standard turnover required.`,
                    priority: 'URGENT',
                    status: 'PENDING',
                    slaMinutes: 30,
                    assignedToId: null,
                },
            })

            const hkStaff = await prisma.staff.findMany({
                where: { propertyId: existing.propertyId, department: 'HOUSEKEEPING' },
                select: { userId: true },
            })

            if (hkStaff.length > 0) {
                await prisma.inAppNotification.createMany({
                    data: hkStaff.map((s) => ({
                        userId: s.userId,
                        title: 'Housekeeping Required',
                        description: `Room ${existing.room.roomNumber} needs cleaning after checkout.`,
                        type: 'TASK',
                        isRead: false,
                    })),
                })
            }

            performAutoAssignment(existing.propertyId, 0).catch(() => {})
        }

        await invalidateRoomAndDashboardCaches(existing.propertyId)

        return NextResponse.json({ success: true, data: booking })
    } catch (error) {
        return serverError(error, 'BOOKING_STATUS')
    }
}
