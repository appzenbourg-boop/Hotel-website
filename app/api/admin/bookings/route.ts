import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { prisma } from '@/lib/db'
import { sendBookingConfirmation } from '@/lib/email'
import { sendSMS } from '@/lib/twilio'
import { badRequest, unauthorized, serverError } from '@/lib/api-response'
import { calculatePricing } from '@/lib/pricing'
import { format, differenceInCalendarDays } from 'date-fns'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return unauthorized()

    const { searchParams } = new URL(request.url)
    const start = searchParams.get('start')
    const end = searchParams.get('end')
    const queryPropertyId = searchParams.get('propertyId')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') ?? '1')
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200)

    const where: any = {}

    if (session.user.role === 'SUPER_ADMIN') {
        if (queryPropertyId && queryPropertyId !== 'ALL') {
            where.propertyId = queryPropertyId
        }
    } else {
        const propertyId = session.user.propertyId
        if (propertyId) where.propertyId = propertyId
    }

    if (status && status !== 'ALL') where.status = status

    // Overlap filter for calendar view
    if (start && end) {
        where.checkIn = { lte: new Date(end) }
        where.checkOut = { gte: new Date(start) }
    }

    try {
        const [bookings, total] = await Promise.all([
            prisma.booking.findMany({
                where,
                include: {
                    guest: { select: { name: true, phone: true, email: true } },
                    room: { select: { roomNumber: true, type: true, category: true } },
                },
                orderBy: { checkIn: 'asc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.booking.count({ where }),
        ])

        return NextResponse.json({
            data: bookings,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        })
    } catch (error) {
        return serverError(error, 'BOOKINGS_GET')
    }
}

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return unauthorized()

    try {
        const body = await request.json()
        const { searchParams } = new URL(request.url)
        const queryPropertyId = searchParams.get('propertyId')

        let propertyId = session.user.propertyId
        if (session.user.role === 'SUPER_ADMIN') {
            propertyId = body.propertyId || queryPropertyId
        }

        if (!propertyId || propertyId === 'ALL') {
            return badRequest('Missing property ID context')
        }

        const { guestId, roomId, checkIn, checkOut, numberOfGuests, totalAmount, source, discountPercent: manualDiscount } = body

        if (!guestId || !roomId || !checkIn || !checkOut) {
            return badRequest('guestId, roomId, checkIn and checkOut are required')
        }

        // Check room availability
        const conflicting = await prisma.booking.findFirst({
            where: {
                roomId,
                status: { in: ['RESERVED', 'CHECKED_IN'] },
                checkIn: { lt: new Date(checkOut) },
                checkOut: { gt: new Date(checkIn) },
            },
        })
        if (conflicting) {
            return NextResponse.json(
                { success: false, error: 'Room is not available for the selected dates' },
                { status: 409 }
            )
        }

        // Fetch room base price
        const room = await prisma.room.findUnique({
            where: { id: roomId },
            select: { basePrice: true, roomNumber: true, type: true },
        })
        if (!room) return badRequest('Room not found')

        // Fetch property financial settings for tax calculation
        let pricingSettings = {
            gstPercent: 18.0,
            serviceChargePercent: 0.0,
            luxuryTaxPercent: 0.0,
            defaultDiscountPercent: 0.0,
        }
        try {
            const propSettings = await (prisma as any).propertySettings.findUnique({
                where: { propertyId },
            })
            if (propSettings) pricingSettings = propSettings
        } catch { /* PropertySettings table may not exist yet */ }

        // Calculate nights
        const nights = Math.max(1, differenceInCalendarDays(new Date(checkOut), new Date(checkIn)))
        const baseAmount = totalAmount ?? (room.basePrice * nights)

        // Apply pricing
        const pricing = calculatePricing(baseAmount, pricingSettings, manualDiscount)

        const booking = await prisma.booking.create({
            data: {
                propertyId,
                guestId,
                roomId,
                checkIn: new Date(checkIn),
                checkOut: new Date(checkOut),
                numberOfGuests: numberOfGuests ?? 1,
                totalAmount: pricing.totalAmount,
                // Tax breakdown
                baseAmount: pricing.baseAmount,
                gstPercent: pricing.gstPercent,
                gstAmount: pricing.gstAmount,
                serviceChargePercent: pricing.serviceChargePercent,
                serviceChargeAmount: pricing.serviceChargeAmount,
                luxuryTaxPercent: pricing.luxuryTaxPercent,
                luxuryTaxAmount: pricing.luxuryTaxAmount,
                discountPercent: pricing.discountPercent,
                discountAmount: pricing.discountAmount,
                finalAmount: pricing.finalAmount,
                status: 'RESERVED',
                source: source ?? 'DIRECT',
            },
            include: {
                guest: { select: { name: true, phone: true, email: true } },
                room: { select: { roomNumber: true, type: true } },
                property: { select: { name: true } },
            },
        })

        // Send confirmation notifications (non-blocking)
        const checkInStr = format(new Date(checkIn), 'MMM dd, yyyy')
        const checkOutStr = format(new Date(checkOut), 'MMM dd, yyyy')

        if (booking.guest.email) {
            sendBookingConfirmation({
                to: booking.guest.email,
                guestName: booking.guest.name,
                roomNumber: booking.room.roomNumber,
                checkIn: checkInStr,
                checkOut: checkOutStr,
                totalAmount: `₹${totalAmount ?? 0}`,
                hotelName: (booking as any).property?.name ?? 'Zenbourg',
            }).catch(() => {})
        }

        if (booking.guest.phone) {
            sendSMS(
                booking.guest.phone,
                `Booking confirmed at ${(booking as any).property?.name ?? 'Zenbourg'}! Room ${booking.room.roomNumber}, Check-in: ${checkInStr}. Ref: ${booking.id.slice(-6).toUpperCase()}`
            ).catch(() => {})
        }

        return NextResponse.json({ success: true, data: booking }, { status: 201 })
    } catch (error) {
        return serverError(error, 'BOOKINGS_POST')
    }
}
