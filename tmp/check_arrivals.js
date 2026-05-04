const { PrismaClient } = require('../prisma/generated/client')
const prisma = new PrismaClient()
const { startOfDay, endOfDay } = require('date-fns')

async function check() {
  const today = new Date()
  const start = startOfDay(today)
  const end = endOfDay(today)
  
  console.log('Search Range:', start, 'to', end)
  
  const allArrivals = await prisma.booking.findMany({
    where: {
      checkIn: { gte: start, lte: end }
    },
    include: {
      guest: true,
      room: true
    }
  })
  
  console.log('Total arrivals found by findMany:', allArrivals.length)
  allArrivals.forEach(b => {
    console.log(`- Guest: ${b.guest.name}, Status: ${b.status}, checkIn: ${b.checkIn}`)
  })
  
  const reservedArrivals = await prisma.booking.count({
    where: {
      checkIn: { gte: start, lte: end },
      status: 'RESERVED'
    }
  })
  
  console.log('Count of RESERVED arrivals:', reservedArrivals)
  
  const allBookings = await prisma.booking.findMany({
    include: { guest: true, room: true }
  })
  
  console.log('Total valid bookings found:', allBookings.length)
  allBookings.forEach(b => {
    if (b.propertyId) {
      console.log(`- Guest: ${b.guest?.name}, Status: ${b.status}, checkIn: ${b.checkIn}, date: ${new Date(b.checkIn).toLocaleDateString()}`)
    }
  })
}

check().then(() => process.exit())
