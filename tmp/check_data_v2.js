require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const roomsCount = await prisma.room.count()
  const occupiedCount = await prisma.room.count({ where: { status: 'OCCUPIED' } })
  const today = new Date()
  today.setHours(0,0,0,0)
  
  const bookingsToday = await prisma.booking.findMany({
    where: { 
      updatedAt: { gte: today },
      status: 'CHECKED_OUT'
    }
  })
  
  console.log('--- SYSTEM DATA REPORT ---')
  console.log('Current Occupied Rooms:', occupiedCount)
  console.log('Total Rooms in Inventory:', roomsCount)
  console.log('Check-outs recorded today:', bookingsToday.length)
  console.log('Today revenue from check-outs:', bookingsToday.reduce((sum, b) => sum + (b.totalAmount || 0), 0))
  
  const allBookings = await prisma.booking.findMany({ select: { id: true, status: true, totalAmount: true, updatedAt: true } })
  console.log('All Bookings statuses:', allBookings.map(b => `${b.status} (${b.totalAmount || 0})`).join(', '))
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect())
