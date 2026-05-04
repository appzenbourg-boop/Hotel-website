import { prisma } from '../lib/db'

async function main() {
  const propertyId = '698f40f2c1d818598d5213bc'
  console.log('--- STARTING CLEANUP ---')
  
  // 1. Assign all orphan bookings to property
  // Since Prisma won't let us use where: { propertyId: null }, we use skip/take or similar if needed.
  // Or just update all bookings that don't match.
  // Actually, simpler to find all bookings and check.
  const allBookings = await prisma.booking.findMany()
  let fixCount = 0
  for (const b of allBookings) {
    if (!b.propertyId) {
      await prisma.booking.update({
        where: { id: b.id },
        data: { propertyId }
      })
      fixCount++
    }
  }
  console.log(`Fixed ${fixCount} orphan bookings.`)

  // 2. Clear old CHECKED_IN bookings that should have checked out
  // (Optional, maybe user wants to keep them for testing?)
  // User seen 5 in Image 2. Let's see how many are "active today".
  const today = new Date()
  const activeCount = await prisma.booking.count({ 
    where: { 
      status: 'CHECKED_IN',
      checkIn: { lte: today },
      checkOut: { gte: today }
    }
  })
  console.log(`Active check-ins today: ${activeCount}`)
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
