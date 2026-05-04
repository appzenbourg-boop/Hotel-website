import { prisma } from '../lib/db'

async function main() {
  console.log('--- STARTING SYNC ---')
  
  // 1. Reset all rooms to AVAILABLE if they don't have an active CHECKED_IN booking
  const allRooms = await prisma.room.findMany()
  const activeBookings = await prisma.booking.findMany({
    where: { status: 'CHECKED_IN' }
  })
  
  const occupiedRoomIds = new Set(activeBookings.map(b => b.roomId))
  
  let updatedCount = 0
  for (const room of allRooms) {
    const shouldBeOccupied = occupiedRoomIds.has(room.id)
    
    if (shouldBeOccupied && room.status !== 'OCCUPIED') {
      await prisma.room.update({
        where: { id: room.id },
        data: { status: 'OCCUPIED' }
      })
      console.log(`Updated Room ${room.roomNumber} to OCCUPIED`)
      updatedCount++
    } else if (!shouldBeOccupied && room.status === 'OCCUPIED') {
      await prisma.room.update({
        where: { id: room.id },
        data: { status: 'AVAILABLE' }
      })
      console.log(`Updated Room ${room.roomNumber} to AVAILABLE`)
      updatedCount++
    }
  }
  
  console.log(`--- SYNC COMPLETE. UPDATED ${updatedCount} ROOMS ---`)
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
