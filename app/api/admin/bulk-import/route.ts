/**
 * POST /api/admin/bulk-import
 * Imports guests + bookings from parsed CSV rows.
 * For each valid row:
 *   1. Upsert guest by phone
 *   2. Find room by roomNumber (if provided)
 *   3. Create booking
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { prisma } from '@/lib/db'
import { unauthorized, badRequest, serverError } from '@/lib/api-response'
import { calculatePricing } from '@/lib/pricing'

export const dynamic = 'force-dynamic'

const VALID_SOURCES = ['DIRECT', 'BOOKING_COM', 'MAKE_MY_TRIP', 'AGODA', 'EXPEDIA', 'AIRBNB', 'WALK_IN', 'OTHER']

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return unauthorized()
    if (!['SUPER_ADMIN', 'HOTEL_ADMIN', 'MANAGER'].includes(session.user.role)) {
        return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 })
    }

    try {
        const body = await req.json()
        const { rows, propertyId } = body

        if (!propertyId || propertyId === 'ALL') return badRequest('propertyId is required')
        if (!Array.isArray(rows) || rows.length === 0) return badRequest('No rows provided')

        // Fetch property financial settings for pricing
        let pricingSettings = { gstPercent: 18, serviceChargePercent: 0, luxuryTaxPercent: 0, defaultDiscountPercent: 0 }
        try {
            const ps = await (prisma as any).propertySettings.findUnique({ where: { propertyId } })
            if (ps) pricingSettings = ps
        } catch { /* use defaults */ }

        let created = 0
        let skipped = 0
        let guestsCreated = 0
        let guestsUpdated = 0
        const errors: string[] = []

        for (const row of rows) {
            try {
                // 1. Upsert guest
                const phone = row.guestPhone.replace(/\D/g, '')
                const normalizedPhone = phone.length === 10 ? phone : phone.slice(-10)

                const existingGuest = await prisma.guest.findUnique({ where: { phone: normalizedPhone } })

                let guest
                if (existingGuest) {
                    guest = await prisma.guest.update({
                        where: { id: existingGuest.id },
                        data: {
                            name: row.guestName,
                            email: row.guestEmail || undefined,
                            createdByPropertyId: existingGuest.createdByPropertyId ?? propertyId,
                        },
                    })
                    guestsUpdated++
                } else {
                    guest = await prisma.guest.create({
                        data: {
                            name: row.guestName,
                            phone: normalizedPhone,
                            email: row.guestEmail || null,
                            checkInStatus: 'PENDING',
                            createdByPropertyId: propertyId,
                        },
                    })
                    guestsCreated++
                }

                // 2. Find room by number (optional)
                let roomId: string | null = null
                if (row.roomNumber) {
                    const room = await prisma.room.findFirst({
                        where: { propertyId, roomNumber: String(row.roomNumber) },
                    })
                    if (room) roomId = room.id
                }

                // If no room found and roomNumber was specified, skip
                if (row.roomNumber && !roomId) {
                    errors.push(`Row ${row.rowNum}: Room "${row.roomNumber}" not found — skipped`)
                    skipped++
                    continue
                }

                // If no room at all, find any available room
                if (!roomId) {
                    const anyRoom = await prisma.room.findFirst({
                        where: { propertyId, status: 'AVAILABLE' },
                    })
                    if (anyRoom) roomId = anyRoom.id
                }

                if (!roomId) {
                    errors.push(`Row ${row.rowNum}: No available room found — skipped`)
                    skipped++
                    continue
                }

                // 3. Check for conflicting booking
                const conflict = await prisma.booking.findFirst({
                    where: {
                        roomId,
                        status: { in: ['RESERVED', 'CHECKED_IN'] },
                        checkIn: { lt: new Date(row.checkOut) },
                        checkOut: { gt: new Date(row.checkIn) },
                    },
                })
                if (conflict) {
                    errors.push(`Row ${row.rowNum}: Room ${row.roomNumber} has a conflicting booking — skipped`)
                    skipped++
                    continue
                }

                // 4. Calculate pricing
                const nights = Math.max(1, Math.ceil(
                    (new Date(row.checkOut).getTime() - new Date(row.checkIn).getTime()) / (1000 * 60 * 60 * 24)
                ))
                const baseAmount = row.totalAmount > 0 ? row.totalAmount : 0
                const pricing = calculatePricing(baseAmount, pricingSettings)

                // 5. Normalize source
                const source = VALID_SOURCES.includes(row.source) ? row.source : 'DIRECT'

                // 6. Create booking
                await prisma.booking.create({
                    data: {
                        propertyId,
                        guestId: guest.id,
                        roomId,
                        checkIn: new Date(row.checkIn),
                        checkOut: new Date(row.checkOut),
                        numberOfGuests: row.guestsCount || 1,
                        totalAmount: pricing.totalAmount,
                        baseAmount: pricing.baseAmount,
                        gstPercent: pricing.gstPercent,
                        gstAmount: pricing.gstAmount,
                        serviceChargePercent: pricing.serviceChargePercent,
                        serviceChargeAmount: pricing.serviceChargeAmount,
                        discountPercent: pricing.discountPercent,
                        discountAmount: pricing.discountAmount,
                        finalAmount: pricing.finalAmount,
                        status: 'RESERVED',
                        source: source as any,
                        notes: row.notes || null,
                    },
                })
                created++
            } catch (err: any) {
                errors.push(`Row ${row.rowNum}: ${err?.message ?? 'Unknown error'}`)
                skipped++
            }
        }

        return NextResponse.json({
            success: true,
            created,
            skipped,
            guestsCreated,
            guestsUpdated,
            errors: errors.slice(0, 20), // cap error list
        })
    } catch (error) {
        return serverError(error, 'BULK_IMPORT')
    }
}
