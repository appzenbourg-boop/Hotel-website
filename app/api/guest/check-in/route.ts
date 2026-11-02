import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        let { name, phone, idProof, bookingId, idType, aadharNumber, additionalGuests } = body

        if (!name || !phone) {
            return new NextResponse('Name and Phone are required', { status: 400 })
        }

        // Standardize phone (take last 10 digits to match)
        const cleanPhone = phone.replace(/\D/g, '').slice(-10)

        let guestId = null

        // Get the booking's propertyId so we can link the guest to the right hotel
        let bookingPropertyId: string | null = null
        let validBooking = false
        let existingBookingNotes = ''

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
                    existingBookingNotes = booking.notes || ''
                } else {
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

        // 3. Check for active reserved booking if not passed
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
                existingBookingNotes = activeBooking.notes || ''
            }
        }

        // Prepare Accompanying Guests Data
        const validAdditionalGuests = Array.isArray(additionalGuests)
            ? additionalGuests.filter(g => g && g.name && g.name.trim().length > 0)
            : []

        let coGuestsNote = ''
        if (validAdditionalGuests.length > 0) {
            const summary = validAdditionalGuests.map((g, i) => 
                `Guest ${i + 2}: ${g.name}${g.age ? ` (${g.age} yrs)` : ''}${g.aadharNumber ? ` - ID: ${g.aadharNumber}` : ''}`
            ).join('\n')
            coGuestsNote = `\n\n[ACCOMPANYING_GUESTS: ${JSON.stringify(validAdditionalGuests)}]\nAccompanying Guests (${validAdditionalGuests.length}):\n${summary}`
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
                    idType: idType || resolvedGuest.idType || 'Aadhaar Card',
                    idNumber: aadharNumber || resolvedGuest.idNumber || undefined,
                    idDocumentFront: idProof || resolvedGuest.idDocumentFront,
                    checkInStatus: 'COMPLETED',
                    checkInCompletedAt: new Date(),
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
                    idType: idType || 'Aadhaar Card',
                    idNumber: aadharNumber || undefined,
                    idDocumentFront: idProof,
                    checkInStatus: 'COMPLETED',
                    checkInCompletedAt: new Date(),
                    createdByPropertyId: bookingPropertyId ?? null,
                }
            })
        }

        // Ensure the booking points to this resolved guest and updates accompanying guests in notes
        if (validBooking && bookingId) {
            // Clean out old accompanying guests tag if re-submitting
            const cleanedNotes = existingBookingNotes.replace(/\[ACCOMPANYING_GUESTS:[\s\S]*?\][\s\S]*?(?=\n\n|$)/g, '').trim()
            const finalNotes = (cleanedNotes + coGuestsNote).trim()

            await prisma.booking.update({
                where: { id: bookingId },
                data: {
                    guestId: guest.id,
                    notes: finalNotes || undefined,
                    numberOfGuests: 1 + validAdditionalGuests.length,
                    updatedAt: new Date()
                }
            })
        }

        return NextResponse.json({
            success: true,
            guestId: guest.id,
            bookingRef: 'ZB-' + guest.id.slice(-4).toUpperCase(),
            additionalGuestsCount: validAdditionalGuests.length
        })

    } catch (error) {
        console.error('Check-in error:', error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}
