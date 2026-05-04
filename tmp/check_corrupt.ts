import { prisma } from '../lib/db'

async function main() {
  const allCount = await prisma.booking.count()
  // Check for invalid bookings (missing propertyId)
  // Use raw query or findMany with limited select
  const bookings = await prisma.booking.findMany()
  const invalidBookings = bookings.filter(b => !b.propertyId)
  
  console.log(`Total Bookings: ${allCount}`)
  console.log(`Invalid Bookings (no propertyId): ${invalidBookings.length}`)
  
  if (invalidBookings.length > 0) {
    console.log('--- INVALID BOOKINGS ---')
    console.log(JSON.stringify(invalidBookings.map(b => ({
      id: b.id,
      guestId: b.guestId,
      status: b.status,
      roomNumber: b.roomId
    })), null, 2))
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
