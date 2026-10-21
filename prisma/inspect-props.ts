import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🔍 Scanning property database for exact records...')
    const { format, addDays, parseISO, isSameDay } = await import('date-fns')
    const events = await (prisma as any).banquetEvent.findMany({ include: { booking: true } })
    console.log('Total events in database:', events.length)
    for (const e of events) {
        console.log(`Event ID: ${e.id} | Booking: ${e.booking?.bookingNumber} | Name: ${e.booking?.firstName} ${e.booking?.lastName} | Hall: ${e.hallName} | EventDate: ${e.eventDate}`)
    }
}

main().finally(() => prisma.$disconnect())
