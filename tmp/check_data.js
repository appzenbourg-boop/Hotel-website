const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const rooms = await prisma.room.count()
  const occupied = await prisma.room.count({ where: { status: 'OCCUPIED' } })
  const bookings = await prisma.booking.findMany()
  const checkedOutToday = await prisma.booking.count({ 
    where: { 
      status: 'CHECKED_OUT',
      updatedAt: { gte: new Date(new Date().setHours(0,0,0,0)) }
    } 
  })
  const totalRevToday = await prisma.booking.aggregate({
    where: { 
      status: 'CHECKED_OUT',
      updatedAt: { gte: new Date(new Date().setHours(0,0,0,0)) }
    },
    _sum: { totalAmount: true }
  })

  console.log('--- DB SUMMARY ---')
  console.log('Total Rooms:', rooms)
  console.log('Occupied Rooms:', occupied)
  console.log('Total Bookings:', bookings.length)
  console.log('Checked Out Today:', checkedOutToday)
  console.log('Total Revenue Today:', totalRevToday._sum.totalAmount)
  console.log('--- BOOKINGS ---')
  bookings.forEach(b => {
    console.log(`ID: ${b.id}, Status: ${b.status}, Amount: ${b.totalAmount}, CI: ${b.checkIn}, CO: ${b.checkOut}`)
  })
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
