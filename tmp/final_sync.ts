import { prisma } from '../lib/db'
import { startOfDay, endOfDay } from 'date-fns'

async function main() {
  const today = new Date()
  console.log('--- RE-SYNCING ROOM STATUSES TO ACTIVE BOOKINGS ---')
  
  const activeBookings = await prisma.booking.findMany({
    where: {
      status: { in: ['CHECKED_IN', 'RESERVED'] },
      checkIn: { lte: endOfDay(today) },
      checkOut: { gte: startOfDay(today) }
    }
  })
  
  const activeRoomIds = new Set(activeBookings.map(b => b.roomId))
  const allRooms = await prisma.room.findMany()
  
  let fixCount = 0
  for (const room of allRooms) {
    const isActive = activeRoomIds.has(room.id)
    const expectedStatus = isActive ? 'OCCUPIED' : 'AVAILABLE'
    
    if (room.status !== expectedStatus) {
      await prisma.room.update({
        where: { id: room.id },
        data: { status: expectedStatus }
      })
      console.log(`Updated Room ${room.roomNumber}: ${room.status} -> ${expectedStatus}`)
      fixCount++
    }
  }
  
  console.log(`--- SYNC COMPLETE. FIXED ${fixCount} ROOMS ---`)
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
