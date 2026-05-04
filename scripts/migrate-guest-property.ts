/**
 * One-time migration: set createdByPropertyId on ALL existing guests
 * by looking at their most recent booking's propertyId.
 *
 * Run with: npx tsx scripts/migrate-guest-property.ts
 */
import { PrismaClient } from '../prisma/generated/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Starting guest property migration...')

    // Get ALL guests (not filtering by null since old docs may not have the field)
    const guests = await prisma.guest.findMany({
        select: {
            id: true,
            name: true,
            createdByPropertyId: true,
            bookings: {
                select: { propertyId: true },
                orderBy: { createdAt: 'desc' },
                take: 1,
            },
        },
    })

    console.log(`Total guests: ${guests.length}`)

    let updated = 0
    let skipped = 0

    for (const guest of guests) {
        // Skip if already has a property link
        if (guest.createdByPropertyId) { skipped++; continue }

        const propertyId = guest.bookings[0]?.propertyId
        if (propertyId) {
            await prisma.guest.update({
                where: { id: guest.id },
                data: { createdByPropertyId: propertyId },
            })
            updated++
            console.log(`  Linked "${guest.name}" → property ${propertyId}`)
        } else {
            skipped++
        }
    }

    console.log(`\nDone: ${updated} guests linked, ${skipped} skipped (no bookings or already linked)`)
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
