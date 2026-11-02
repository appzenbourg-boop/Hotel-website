import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { prisma } from '@/lib/db'
import { unauthorized, badRequest, serverError } from '@/lib/api-response'
import { parseICal } from '@/lib/ical'
import { syncPropertyOta } from '@/lib/airbnb-sync'

export const dynamic = 'force-dynamic'

/**
 * Normalizes an Airbnb or Booking.com URL or extracts iCal URL / Listing metadata
 */
function parseOtaUrl(inputUrl: string, requestedOta?: string) {
    // Strip all internal, leading, and trailing whitespace so accidental copy-paste spaces don't break the URL
    const trimmed = inputUrl.replace(/\s+/g, '')
    let isIcal = false
    let icalUrl = ''
    let listingId = ''
    let otaName = (requestedOta || '').toUpperCase()

    if (trimmed.includes('booking.com') || otaName === 'BOOKING_COM') {
        otaName = 'BOOKING_COM'
        if (trimmed.includes('/ical') || trimmed.includes('.ics')) {
            isIcal = true
            icalUrl = trimmed
        } else {
            const match = trimmed.match(/hotel\/[^\/]+\/([^\/\?]+)/) || trimmed.match(/([0-9]+)/)
            if (match) listingId = match[1]
            icalUrl = trimmed
        }
    } else if (trimmed.includes('agoda.com') || otaName === 'AGODA') {
        otaName = 'AGODA'
        isIcal = trimmed.includes('/ical') || trimmed.includes('.ics') || trimmed.includes('calendar')
        icalUrl = trimmed
        const match = trimmed.match(/hotel\/[^\/]+\/([^\/\?]+)/) || trimmed.match(/([0-9]+)/)
        if (match) listingId = match[1]
    } else {
        otaName = 'AIRBNB'
        // Supports airbnb.com, airbnb.co.in, airbnb.co.uk etc. and handles ?t= or ?s= query params
        if (trimmed.includes('airbnb') && (trimmed.includes('/calendar/ical/') || trimmed.includes('.ics'))) {
            isIcal = true
            icalUrl = trimmed
            const match = trimmed.match(/ical\/(\d+)/)
            if (match) listingId = match[1]
        } else if (trimmed.includes('airbnb') && trimmed.includes('/rooms/')) {
            const match = trimmed.match(/rooms\/(\d+)/)
            if (match) {
                listingId = match[1]
                icalUrl = `https://www.airbnb.com/calendar/ical/${listingId}.ics`
            }
        } else if (/^\d+$/.test(trimmed)) {
            listingId = trimmed
            icalUrl = `https://www.airbnb.com/calendar/ical/${listingId}.ics`
        } else if (trimmed.includes('.ics')) {
            isIcal = true
            icalUrl = trimmed
            const match = trimmed.match(/(\d{6,})/)
            if (match) listingId = match[1]
        }
    }

    return { isIcal, icalUrl: icalUrl || trimmed, listingId, otaName }
}

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return unauthorized()

    try {
        const body = await request.json()
        const { url, roomNumber, floor, basePrice, category, type, description, otaChannel } = body

        if (!url) return badRequest('Listing URL or iCal feed URL is required')

        const parsed = parseOtaUrl(url, otaChannel)
        const propertyId = session.user.propertyId

        if (!propertyId && session.user.role !== 'SUPER_ADMIN') {
            return badRequest('Property context missing')
        }

        const targetPropertyId = propertyId || body.propertyId
        if (!targetPropertyId) return badRequest('Target property ID required')

        const channelLabel = parsed.otaName === 'BOOKING_COM' ? 'Booking.com' : parsed.otaName === 'AGODA' ? 'Agoda' : 'Airbnb'

        // 1. Fetch iCal feed to validate and extract metadata if available
        let detectedName = `${channelLabel} Listing ${parsed.listingId || ''}`.trim()
        let fetchedEventsCount = 0

        if (parsed.icalUrl && parsed.icalUrl.startsWith('http')) {
            try {
                const icalRes = await fetch(parsed.icalUrl, {
                    headers: { 'User-Agent': 'ZenbourgSyncEngine/1.0' },
                    next: { revalidate: 0 },
                })
                if (icalRes.ok) {
                    const text = await icalRes.text()
                    const calNameMatch = text.match(/X-WR-CALNAME:(.*)/i)
                    if (calNameMatch && calNameMatch[1]) {
                        detectedName = calNameMatch[1].replace('\r', '').trim()
                    }
                    const events = parseICal(text)
                    fetchedEventsCount = events.length
                }
            } catch (err) {
                console.warn('Could not pre-fetch iCal feed:', err)
            }
        }

        // 2. Stock photo presets by category/type
        const stockPhotos = parsed.otaName === 'BOOKING_COM' ? [
            'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80',
            'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1200&q=80',
            'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=1200&q=80'
        ] : [
            'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=1200&q=80',
            'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=1200&q=80',
            'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1200&q=80'
        ]

        let targetRoom: any = null

        // If user selected an existing room, link directly to it
        if (body.roomId && body.roomId !== 'NEW') {
            targetRoom = await prisma.room.findFirst({
                where: { id: body.roomId, propertyId: targetPropertyId }
            })
            if (!targetRoom) {
                return badRequest('Selected hotel room not found in this property')
            }
        } else {
            // 3. Determine final values for creating a new room
            const prefix = parsed.otaName === 'BOOKING_COM' ? 'BK' : parsed.otaName === 'AGODA' ? 'AG' : 'AB'
            const finalRoomNumber = roomNumber || (parsed.listingId ? `${prefix}-${parsed.listingId.slice(-4)}` : `${prefix}-${Math.floor(100 + Math.random() * 900)}`)
            const finalFloor = parseInt(floor ?? '1') || 1
            const finalBasePrice = parseFloat(basePrice ?? '3500') || 3500
            const finalCategory = (category || 'DELUXE').toUpperCase()
            const finalType = type || (detectedName !== `${channelLabel} Listing ${parsed.listingId || ''}` ? detectedName : `${channelLabel} Deluxe Suite`)
            const finalDescription = description || `Automatically imported ${channelLabel} Listing (${parsed.listingId || 'Sync Connection'})`

            // Check if room number already exists
            const existingRoom = await prisma.room.findUnique({
                where: {
                    propertyId_roomNumber: {
                        propertyId: targetPropertyId,
                        roomNumber: finalRoomNumber
                    }
                }
            })

            if (existingRoom) {
                targetRoom = existingRoom
            } else {
                targetRoom = await prisma.room.create({
                    data: {
                        propertyId: targetPropertyId,
                        roomNumber: finalRoomNumber,
                        floor: finalFloor,
                        category: finalCategory as any,
                        type: finalType,
                        maxOccupancy: 2,
                        basePrice: finalBasePrice,
                        amenities: ['Wifi', 'Air Conditioning', `${channelLabel} Sync`, 'Self Check-in', 'Desk'],
                        images: stockPhotos,
                        description: finalDescription,
                        status: 'AVAILABLE',
                        visibleOnline: true
                    }
                })
            }
        }

        // 5. Ensure OTA Connection exists for this property
        const connection = await prisma.otaConnection.upsert({
            where: {
                propertyId_otaName: {
                    propertyId: targetPropertyId,
                    otaName: parsed.otaName
                }
            },
            create: {
                propertyId: targetPropertyId,
                otaName: parsed.otaName,
                status: 'CONNECTED',
                credentials: { autoImported: true, defaultIcal: parsed.icalUrl }
            },
            update: {
                status: 'CONNECTED'
            }
        })

        // 6. Upsert RoomOtaMapping for this room
        await prisma.roomOtaMapping.deleteMany({
            where: {
                propertyId: targetPropertyId,
                roomId: targetRoom.id,
                otaConnectionId: connection.id
            }
        })

        const mapping = await prisma.roomOtaMapping.create({
            data: {
                propertyId: targetPropertyId,
                roomId: targetRoom.id,
                otaConnectionId: connection.id,
                otaRoomId: parsed.icalUrl,
                ratePlanCode: 'STANDARD'
            }
        })

        // 7. Execute immediate calendar synchronization
        let syncReport = { created: 0, updated: 0, errors: [] as string[] }
        try {
            const result = await syncPropertyOta(targetPropertyId, parsed.otaName)
            syncReport = {
                created: result.created,
                updated: result.updated,
                errors: result.errors
            }
        } catch (syncErr: any) {
            console.error(`Initial ${channelLabel} sync failed:`, syncErr)
        }

        return NextResponse.json({
            success: true,
            data: {
                room: targetRoom,
                mapping,
                syncReport,
                channel: parsed.otaName,
                channelLabel,
                detectedEventsCount: fetchedEventsCount
            }
        })

    } catch (err: any) {
        console.error('OTA Room Import API Error:', err)
        return serverError(err.message || 'Failed to import OTA room listing')
    }
}
