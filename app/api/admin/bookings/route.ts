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
        const total = await prisma.booking.count({ where })
        
        const rawBookings = await prisma.booking.findMany({
            where,
            orderBy: { checkIn: 'asc' },
            skip: (page - 1) * limit,
            take: limit,
        })

        // Resolve referenced guests and rooms to prevent "Inconsistent query result" exceptions
        const guestIds = [...new Set(rawBookings.map(b => b.guestId))]
        const roomIds = [...new Set(rawBookings.map(b => b.roomId))]

        const [guests, rooms] = await Promise.all([
            prisma.guest.findMany({
                where: { id: { in: guestIds } },
                select: { id: true, name: true, phone: true, email: true, address: true, idType: true, idNumber: true }
            }),
            prisma.room.findMany({
                where: { id: { in: roomIds } },
                select: { id: true, roomNumber: true, type: true, category: true }
            })
        ])

        const guestMap = new Map(guests.map(g => [g.id, g]))
        const roomMap = new Map(rooms.map(r => [r.id, r]))

        const bookings = rawBookings.map(b => {
            const guest = guestMap.get(b.guestId)
            const room = roomMap.get(b.roomId)
            return {
                ...b,
                guest: guest ? { name: guest.name, phone: guest.phone, email: guest.email, address: guest.address, idType: guest.idType, idNumber: guest.idNumber } : { name: 'Unknown Guest', phone: 'N/A', email: '', address: '', idType: 'Aadhar', idNumber: '' },
                room: room ? { roomNumber: room.roomNumber, type: room.type, category: room.category } : { roomNumber: 'N/A', type: 'N/A', category: 'STANDARD' }
            }
        })

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

        const { 
            guestId, roomId, checkIn, checkOut, numberOfGuests, totalAmount, source, 
            discountPercent: manualDiscount, mealPlan: mealPlanType, mealPlanPricePerDay: customMealPlanRate,
            extraAddons: inputExtraAddons
        } = body

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

        // Calculate meal plan amount
        let mealPlanAmount = 0
        let resolvedMealPlan: string | null = null
        let mealPlanPricePerDay: number | null = null

        if (mealPlanType && mealPlanType !== 'EP') {
            resolvedMealPlan = mealPlanType
            if (typeof customMealPlanRate === 'number') {
                mealPlanPricePerDay = customMealPlanRate
                mealPlanAmount = customMealPlanRate * nights * (numberOfGuests ?? 1)
            } else {
                try {
                    const mealPlan = await prisma.mealPlan.findUnique({
                        where: {
                            propertyId_type: {
                                propertyId: propertyId!,
                                type: mealPlanType,
                            },
                        },
                    })
                    if (mealPlan && mealPlan.isActive) {
                        mealPlanPricePerDay = mealPlan.pricePerDay
                        mealPlanAmount = mealPlan.pricePerDay * nights * (numberOfGuests ?? 1)
                    }
                } catch { /* MealPlan may not exist yet */ }
            }
        } else if (mealPlanType === 'EP') {
            resolvedMealPlan = 'EP'
            mealPlanPricePerDay = 0
        }

        // Extra add-ons calculation
        let extraAddonsAmount = 0
        let extraAddonsJson: any = null
        if (Array.isArray(inputExtraAddons) && inputExtraAddons.length > 0) {
            extraAddonsJson = inputExtraAddons
            extraAddonsAmount = inputExtraAddons.reduce((sum: number, item: any) => sum + ((Number(item.price) || 0) * (Number(item.qty) || 1)), 0)
        }

        // Apply pricing (on room cost only — meal plan & extra add-ons added separately)
        const pricing = calculatePricing(baseAmount, pricingSettings, manualDiscount)

        const booking = await prisma.booking.create({
            data: {
                propertyId,
                guestId,
                roomId,
                checkIn: new Date(checkIn),
                checkOut: new Date(checkOut),
                numberOfGuests: numberOfGuests ?? 1,
                totalAmount: pricing.totalAmount + mealPlanAmount + extraAddonsAmount,
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
                finalAmount: pricing.finalAmount + mealPlanAmount + extraAddonsAmount,
                // Meal plan
                mealPlan: resolvedMealPlan,
                mealPlanPricePerDay: mealPlanPricePerDay,
                mealPlanAmount: mealPlanAmount > 0 ? mealPlanAmount : null,
                // Extra add-ons
                extraAddons: extraAddonsJson,
                extraAddonsAmount: extraAddonsAmount > 0 ? extraAddonsAmount : null,
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
                totalAmount: `₹${booking.finalAmount ?? booking.totalAmount ?? 0}`,
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

export async function PUT(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return unauthorized()

    try {
        const body = await request.json()
        const { bookingId, mealPlan: mealPlanType, mealPlanPricePerDay: customMealPlanRate, extraAddons: inputExtraAddons } = body

        if (!bookingId) return badRequest('bookingId is required')

        const existing = await prisma.booking.findUnique({
            where: { id: bookingId }
        })
        if (!existing) return badRequest('Booking not found')

        const nights = Math.max(1, differenceInCalendarDays(new Date(existing.checkOut), new Date(existing.checkIn)))
        const guests = existing.numberOfGuests || 1

        let mealPlanAmount = 0
        let resolvedMealPlan: string | null = existing.mealPlan
        let mealPlanPricePerDay: number | null = existing.mealPlanPricePerDay

        if (mealPlanType !== undefined) {
            resolvedMealPlan = mealPlanType
            if (mealPlanType === 'EP') {
                mealPlanAmount = 0
                mealPlanPricePerDay = 0
            } else if (typeof customMealPlanRate === 'number') {
                mealPlanPricePerDay = customMealPlanRate
                mealPlanAmount = customMealPlanRate * nights * guests
            } else {
                try {
                    const mealPlan = await prisma.mealPlan.findUnique({
                        where: { propertyId_type: { propertyId: existing.propertyId!, type: mealPlanType } },
                    })
                    if (mealPlan) {
                        mealPlanPricePerDay = mealPlan.pricePerDay
                        mealPlanAmount = mealPlan.pricePerDay * nights * guests
                    }
                } catch {}
            }
        } else {
            mealPlanAmount = existing.mealPlanAmount || 0
        }

        let extraAddonsAmount = existing.extraAddonsAmount || 0
        let extraAddonsJson: any = existing.extraAddons
        if (inputExtraAddons !== undefined) {
            if (Array.isArray(inputExtraAddons)) {
                extraAddonsJson = inputExtraAddons
                extraAddonsAmount = inputExtraAddons.reduce((sum: number, item: any) => sum + ((Number(item.price) || 0) * (Number(item.qty) || 1)), 0)
            } else {
                extraAddonsJson = null
                extraAddonsAmount = 0
            }
        }

        const baseTotal = existing.baseAmount || existing.totalAmount || 0
        const pricingSettings = {
            gstPercent: existing.gstPercent || 0,
            serviceChargePercent: existing.serviceChargePercent || 0,
            luxuryTaxPercent: existing.luxuryTaxPercent || 0,
            defaultDiscountPercent: existing.discountPercent || 0,
        }
        const pricing = calculatePricing(baseTotal, pricingSettings, existing.discountPercent || 0)
        
        const newTotalAmount = pricing.totalAmount + mealPlanAmount + extraAddonsAmount
        const newFinalAmount = pricing.finalAmount + mealPlanAmount + extraAddonsAmount

        const updated = await prisma.booking.update({
            where: { id: bookingId },
            data: {
                mealPlan: resolvedMealPlan,
                mealPlanPricePerDay,
                mealPlanAmount: mealPlanAmount > 0 ? mealPlanAmount : null,
                extraAddons: extraAddonsJson,
                extraAddonsAmount: extraAddonsAmount > 0 ? extraAddonsAmount : null,
                totalAmount: newTotalAmount,
                finalAmount: newFinalAmount,
            },
            include: {
                guest: { select: { name: true, phone: true, email: true } },
                room: { select: { roomNumber: true, type: true } },
            }
        })

        return NextResponse.json({ success: true, data: updated })
    } catch (error) {
        return serverError(error, 'BOOKINGS_PUT')
    }
}
