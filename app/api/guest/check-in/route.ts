import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        let { name, phone, idProof, bookingId } = body

        if (!name || !phone) {
            return new NextResponse('Name and Phone are required', { status: 400 })
        }

        // Standardize phone (take last 10 digits to match)
        const cleanPhone = phone.replace(/\D/g, '').slice(-10)

        let guestId = null

        // Get the booking's propertyId so we can link the guest to the right hotel
        let bookingPropertyId: string | null = null
        let validBooking = false

        if (bookingId && bookingId !== 'null' && bookingId !== 'undefined') {
            try {
                const booking = await prisma.booking.findUnique({
                    where: { id: bookingId },
                    include: { guest: true }
                })
                if (booking) {
                    guestId = booking.guestId
                    bookingPropertyId = booking.propertyId
                    validBooking = true
                } else {
                    // If no booking found, the ID might actually be a guestId (e.g. a walk-in guest without an active booking)
                    const directGuest = await prisma.guest.findUnique({
                        where: { id: bookingId }
                    })
                    if (directGuest) {
                        guestId = directGuest.id
                    }
                }
            } catch (e) {
                console.warn('Invalid ID format or not found:', bookingId)
            }
        }

        // Robust resolution strategy:
        // 1. If we have a guestId (from booking or direct URL parameter), that is the absolute source of truth
        let resolvedGuest = null
        if (guestId) {
            resolvedGuest = await prisma.guest.findUnique({ where: { id: guestId } })
        }

        // 2. If we STILL don't have a guest, try to find them by phone
        if (!resolvedGuest) {
            resolvedGuest = await prisma.guest.findUnique({ where: { phone: cleanPhone } })
        }

        // 3. Let's see if they have an active booking if they just walked in (no valid booking from URL)
        if (!validBooking && resolvedGuest) {
            const activeBooking = await prisma.booking.findFirst({
                where: { guestId: resolvedGuest.id, status: 'RESERVED' },
                orderBy: { createdAt: 'desc' }
            })
            if (activeBooking) {
                bookingId = activeBooking.id
                bookingPropertyId = activeBooking.propertyId
                guestId = resolvedGuest.id
                validBooking = true
            }
        }

        let guest
        if (resolvedGuest) {
            // Prevent unique constraint errors if cleanPhone belongs to another legacy duplicate guest
            const phoneOwner = await prisma.guest.findUnique({ where: { phone: cleanPhone } })
            const phoneToUpdate = (phoneOwner && phoneOwner.id !== resolvedGuest.id) ? undefined : cleanPhone

            guest = await prisma.guest.update({
                where: { id: resolvedGuest.id },
                data: {
                    name,
                    ...(phoneToUpdate && { phone: phoneToUpdate }),
                    idDocumentFront: idProof,
                    checkInStatus: 'COMPLETED',
                    checkInCompletedAt: new Date(),
                    // Link to property if not already set
                    ...(bookingPropertyId && !resolvedGuest.createdByPropertyId
                        ? { createdByPropertyId: bookingPropertyId }
                        : {}),
                }
            })
        } else {
            guest = await prisma.guest.create({
                data: {
                    name,
                    phone: cleanPhone,
                    idDocumentFront: idProof,
                    checkInStatus: 'COMPLETED',
                    checkInCompletedAt: new Date(),
                    createdByPropertyId: bookingPropertyId ?? null,
                }
            })
        }

        // 3. Critically: Ensure the booking points to this resolved guest
        // This handles cases where the booking was originally linked to a guest with a different phone
        if (validBooking && bookingId) {
            await prisma.booking.update({
                where: { id: bookingId },
                data: {
                    guestId: guest.id,
                    updatedAt: new Date()
                }
            })
        }

        return NextResponse.json({
            success: true,
            guestId: guest.id,
            bookingRef: 'ZB-' + guest.id.slice(-4).toUpperCase()
        })

    } catch (error) {
        console.error('Check-in error:', error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}
