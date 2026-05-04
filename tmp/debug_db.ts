import { prisma } from '../lib/db'

async function main() {
  const rooms = await prisma.room.findMany({
    select: {
      id: true,
      roomNumber: true,
      status: true,
    }
  })

  // Group bookings by room and status for clarity
  const bookings = await prisma.booking.findMany({
    where: {
      status: { in: ['RESERVED', 'CHECKED_IN'] }
    },
    include: {
      guest: { select: { name: true } },
      room: { select: { roomNumber: true } }
    }
  })

  console.log('--- ROOMS ---')
  console.table(rooms)

  console.log('\n--- ACTIVE BOOKINGS ---')
  console.log(JSON.stringify(bookings.map(b => ({
    room: b.room.roomNumber,
    guest: b.guest.name,
    status: b.status,
    checkIn: b.checkIn,
    checkOut: b.checkOut
  })), null, 2))
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
