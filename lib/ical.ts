/**
 * Custom iCal parser and generator utility.
 * Designed for 2-way Airbnb calendar integrations.
 */

export interface ICalEvent {
  uid: string
  startDate: Date
  endDate: Date
  summary: string
}

/**
 * Parses iCal (.ics) content into structured events.
 */
export function parseICal(content: string): ICalEvent[] {
  const events: ICalEvent[] = []
  const lines = content.split(/\r?\n/)
  
  let currentEvent: Partial<ICalEvent> | null = null

  for (let line of lines) {
    line = line.trim()
    if (!line) continue

    if (line === 'BEGIN:VEVENT') {
      currentEvent = {}
    } else if (line === 'END:VEVENT') {
      if (currentEvent && currentEvent.uid && currentEvent.startDate && currentEvent.endDate) {
        events.push({
          uid: currentEvent.uid,
          startDate: currentEvent.startDate,
          endDate: currentEvent.endDate,
          summary: currentEvent.summary || 'Reserved (Airbnb)',
        })
      }
      currentEvent = null
    } else if (currentEvent) {
      const match = line.match(/^([^:;]+)(?:;[^:]*)?:(.*)$/)
      if (!match) continue
      
      const key = match[1]
      const val = match[2]

      if (key === 'UID') {
        currentEvent.uid = val
      } else if (key === 'SUMMARY') {
        currentEvent.summary = val
      } else if (key === 'DTSTART') {
        currentEvent.startDate = parseICalDate(val)
      } else if (key === 'DTEND') {
        currentEvent.endDate = parseICalDate(val)
      }
    }
  }

  return events
}

/**
 * Parses raw iCal date strings like:
 * - "20260718"
 * - "20260718T120000Z"
 * - "20260718T120000"
 */
function parseICalDate(dateStr: string): Date {
  const cleanStr = dateStr.replace(/[^0-9T]/g, '') // Keep numbers and 'T'
  const year = parseInt(cleanStr.slice(0, 4))
  const month = parseInt(cleanStr.slice(4, 6)) - 1 // 0-indexed
  const day = parseInt(cleanStr.slice(6, 8))

  if (cleanStr.includes('T')) {
    const hours = parseInt(cleanStr.slice(9, 11)) || 0
    const minutes = parseInt(cleanStr.slice(11, 13)) || 0
    const seconds = parseInt(cleanStr.slice(13, 15)) || 0
    return new Date(Date.UTC(year, month, day, hours, minutes, seconds))
  }
  
  // Date-only value represents midnight local/UTC
  return new Date(Date.UTC(year, month, day, 0, 0, 0))
}

/**
 * Generates an iCal (.ics) feed file for a list of bookings.
 */
export function generateICal(roomNumber: string, bookings: { id: string; checkIn: Date; checkOut: Date; guestName?: string }[]): string {
  const lines: string[] = []
  
  lines.push('BEGIN:VCALENDAR')
  lines.push('VERSION:2.0')
  lines.push('PRODID:-//Zenbourg PMS//Calendar Sync 1.0//EN')
  lines.push('CALSCALE:GREGORIAN')
  lines.push(`X-WR-CALNAME:Room ${roomNumber} - Zenbourg`)

  for (const b of bookings) {
    const uid = `booking-${b.id}@zenbourg.com`
    const createdStr = formatToICalDateTime(new Date())
    const startStr = formatToICalDateOnly(new Date(b.checkIn))
    const endStr = formatToICalDateOnly(new Date(b.checkOut))

    lines.push('BEGIN:VEVENT')
    lines.push(`UID:${uid}`)
    lines.push(`DTSTAMP:${createdStr}`)
    lines.push(`DTSTART;VALUE=DATE:${startStr}`)
    lines.push(`DTEND;VALUE=DATE:${endStr}`)
    lines.push(`SUMMARY:Zenbourg Blocked - ${b.guestName || 'Guest'}`)
    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

function formatToICalDateTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    date.getUTCFullYear() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    'T' +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    'Z'
  )
}

function formatToICalDateOnly(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return date.getFullYear() + pad(date.getMonth() + 1) + pad(date.getDate())
}
