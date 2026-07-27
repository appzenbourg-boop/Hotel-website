import { prisma } from '@/lib/db'
import { parseICal } from '@/lib/ical'

export interface SyncResult {
  propertyId: string
  created: number
  updated: number
  canceled: number
  errors: string[]
}

/**
 * Synchronizes OTA (Airbnb or Booking.com) reservations for a single property by fetching,
 * parsing, and reconciling iCal feeds for all mapped rooms.
 */
export async function syncPropertyOta(propertyId: string, otaName: string = 'AIRBNB'): Promise<SyncResult> {
  const normalizedOta = otaName.toUpperCase().includes('BOOKING') ? 'BOOKING_COM' : 'AIRBNB'
  const displayName = normalizedOta === 'BOOKING_COM' ? 'Booking.com' : 'Airbnb'

  const result: SyncResult = {
    propertyId,
    created: 0,
    updated: 0,
    canceled: 0,
    errors: [],
  }

  try {
    // 1. Fetch OTA connection
    const connection = await prisma.otaConnection.findUnique({
      where: {
        propertyId_otaName: {
          propertyId,
          otaName: normalizedOta,
        },
      },
    })

    if (!connection || connection.status !== 'CONNECTED') {
      result.errors.push(`${displayName} connection is inactive or disconnected`)
      return result
    }

    // 2. Fetch room mappings
    const mappings = await prisma.roomOtaMapping.findMany({
      where: {
        propertyId,
        otaConnectionId: connection.id,
      },
      include: {
        room: { select: { roomNumber: true, basePrice: true } },
      },
    })

    if (mappings.length === 0) {
      return result
    }

    // 3. Ensure generic OTA Guest profile exists for this tenant
    const guestPhone = `${normalizedOta}-GUEST`
    let guest = await prisma.guest.findUnique({
      where: { phone: guestPhone },
    })
    if (!guest) {
      guest = await prisma.guest.create({
        data: {
          name: `${displayName} Guest`,
          phone: guestPhone,
          email: `${normalizedOta.toLowerCase()}-guest@zenbourg.com`,
          createdByPropertyId: propertyId,
        },
      })
    }

    // 4. Synchronize each room mapping
    for (const mapping of mappings) {
      const icalUrl = mapping.otaRoomId
      if (!icalUrl || !icalUrl.startsWith('http')) {
        result.errors.push(`Room ${mapping.room.roomNumber}: iCal URL is not set or invalid`)
        continue
      }

      try {
        const res = await fetch(icalUrl, {
          headers: { 'User-Agent': 'ZenbourgSyncEngine/1.0' },
          next: { revalidate: 0 },
        })

        if (!res.ok) {
          result.errors.push(`Room ${mapping.room.roomNumber}: HTTP error ${res.status} fetching feed`)
          continue
        }

        const icalText = await res.text()
        const parsedEvents = parseICal(icalText)

        // Fetch existing OTA bookings in Zenbourg for this room
        const existingBookings = await prisma.booking.findMany({
          where: {
            roomId: mapping.roomId,
            source: normalizedOta,
            status: { in: ['RESERVED', 'CHECKED_IN', 'CANCELLED'] },
          },
        })

        const activeUids = new Set(parsedEvents.map((e) => e.uid))

        // Reconcile: Mark bookings as CANCELLED if deleted from OTA calendar
        for (const existing of existingBookings) {
          const matchUid = getUidFromNotes(existing.notes)
          if (matchUid && !activeUids.has(matchUid) && existing.status !== 'CANCELLED') {
            await prisma.booking.update({
              where: { id: existing.id },
              data: { status: 'CANCELLED' },
            })
            result.canceled++
          }
        }

        // Reconcile: Add new or update existing dates
        for (const event of parsedEvents) {
          const limitDate = new Date()
          limitDate.setDate(limitDate.getDate() - 30) // Sync recent checkouts and future arrivals
          if (event.endDate < limitDate) continue

          const existingMatch = existingBookings.find((b) => getUidFromNotes(b.notes) === event.uid)

          if (existingMatch) {
            const datesChanged =
              existingMatch.checkIn.getTime() !== event.startDate.getTime() ||
              existingMatch.checkOut.getTime() !== event.endDate.getTime()

            if (datesChanged && existingMatch.status !== 'CHECKED_OUT') {
              await prisma.booking.update({
                where: { id: existingMatch.id },
                data: {
                  checkIn: event.startDate,
                  checkOut: event.endDate,
                  status: existingMatch.status === 'CANCELLED' ? 'RESERVED' : existingMatch.status,
                },
              })
              result.updated++
            }
          } else {
            const nights = Math.max(
              1,
              Math.ceil((event.endDate.getTime() - event.startDate.getTime()) / (1000 * 60 * 60 * 24))
            )
            const baseAmount = mapping.room.basePrice * nights

            await prisma.booking.create({
              data: {
                propertyId,
                guestId: guest.id,
                roomId: mapping.roomId,
                checkIn: event.startDate,
                checkOut: event.endDate,
                numberOfGuests: 2,
                totalAmount: baseAmount,
                paidAmount: 0,
                paymentStatus: 'PENDING',
                status: 'RESERVED',
                source: normalizedOta,
                specialRequests: `${displayName} Imported Booking`,
                notes: `${displayName} Sync UID: ${event.uid}\nEvent Summary: ${event.summary}`,
              },
            })
            result.created++
          }
        }
      } catch (err: any) {
        console.error(`Sync error on room ${mapping.room.roomNumber}:`, err)
        result.errors.push(`Room ${mapping.room.roomNumber}: ${err.message}`)
      }
    }

    // Update Connection lastSync timestamp
    await prisma.otaConnection.update({
      where: { id: connection.id },
      data: {
        lastSync: new Date(),
        status: result.errors.length === mappings.length ? 'SYNC_ERROR' : 'CONNECTED',
      },
    })
  } catch (error: any) {
    result.errors.push(`Global sync error: ${error.message}`)
  }

  return result
}

export async function syncPropertyAirbnb(propertyId: string): Promise<SyncResult> {
  return syncPropertyOta(propertyId, 'AIRBNB')
}

function getUidFromNotes(notes: string | null): string | null {
  if (!notes) return null
  const match = notes.match(/(?:Airbnb|Booking\.com|OTA)\s*Sync UID:\s*([^\n\r]+)/i)
  return match ? match[1].trim() : null
}
