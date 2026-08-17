const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log("Starting Audit System Seed...")

  // Get the first property
  const property = await prisma.property.findFirst()
  if (!property) {
    console.error("No property found. Please run main seed first.")
    return
  }

  // Get a user to act as auditor
  const user = await prisma.user.findFirst({ where: { role: 'MANAGER' } })
  if (!user) {
    console.error("No manager user found.")
    return
  }

  // Get some rooms
  const rooms = await prisma.room.findMany({ where: { propertyId: property.id }, take: 10 })
  if (rooms.length === 0) {
    console.error("No rooms found.")
    return
  }

  // Generate 30 days of historical data
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  console.log("Cleaning up old audit data...")
  await prisma.auditException.deleteMany({ where: { propertyId: property.id } })
  await prisma.auditRun.deleteMany({ where: { propertyId: property.id } })
  await prisma.ledgerTransaction.deleteMany({ where: { propertyId: property.id, description: { contains: "Auto-Seeded" } } })
  await prisma.eRPSyncLog.deleteMany({ where: { propertyId: property.id } })

  console.log("Generating 30 days of transactions...")
  for (let i = 30; i >= 0; i--) {
    const targetDate = new Date(today)
    targetDate.setDate(targetDate.getDate() - i)
    
    // Generate Room Revenue
    await prisma.ledgerTransaction.create({
      data: {
        propertyId: property.id,
        amount: 5000 + Math.random() * 2000, // Random amount
        type: 'CREDIT',
        category: 'ROOM_REVENUE',
        description: `Auto-Seeded Daily Room Charges`,
        status: 'COMPLETED',
        timestamp: targetDate,
        terminal: 'SYSTEM'
      }
    })

    // Generate F&B Revenue
    await prisma.ledgerTransaction.create({
      data: {
        propertyId: property.id,
        amount: 1500 + Math.random() * 1000,
        type: 'CREDIT',
        category: 'FOOD_AND_BEVERAGE',
        description: `Auto-Seeded F&B Charges`,
        status: 'COMPLETED',
        timestamp: targetDate,
        terminal: 'REST_POS'
      }
    })

    // Random unauthorized void (Anomaly!)
    if (Math.random() > 0.8) {
      await prisma.ledgerTransaction.create({
        data: {
          propertyId: property.id,
          amount: 500,
          type: 'DEBIT',
          category: 'ADJUSTMENT',
          description: `Auto-Seeded UNAUTHORIZED VOID`,
          status: 'VOIDED',
          timestamp: targetDate,
          postedById: user.id,
          terminal: 'FRONT_DESK'
        }
      })
    }

    // Run a night audit for past days
    if (i > 0) { // Don't run it for today
      await prisma.auditRun.create({
        data: {
          propertyId: property.id,
          auditDate: targetDate,
          status: 'COMPLETED',
          startedById: user.id,
          closedAt: new Date(targetDate.getTime() + 2 * 60 * 60 * 1000), // closed 2 hours later
          exceptionsFound: 0 // Mocked
        }
      })
      
      // Generate ERP Sync Log for past days
      await prisma.eRPSyncLog.create({
        data: {
          propertyId: property.id,
          batchId: `SYNC-${targetDate.toISOString().split('T')[0]}`,
          destination: 'TALLY_PRIME',
          recordCount: Math.floor(Math.random() * 50) + 10,
          status: Math.random() > 0.9 ? 'FAILED' : 'SUCCESS',
          errorLog: Math.random() > 0.9 ? { error: "Network timeout to Tally ERP Server" } : null,
          createdAt: targetDate
        }
      })
    }
  }

  // Create some current active bookings to trigger anomalies for today
  console.log("Generating current active bookings with discrepancies...")
  
  // 1. Booking missing room charge posting
  const guest1 = await prisma.guest.findFirst()
  if (guest1) {
    const booking1 = await prisma.booking.create({
      data: {
        propertyId: property.id,
        guestId: guest1.id,
        roomId: rooms[0].id,
        checkIn: new Date(today.getTime() - 24 * 60 * 60 * 1000), // Checked in yesterday
        checkOut: new Date(today.getTime() + 24 * 60 * 60 * 1000), // Checking out tomorrow
        numberOfGuests: 2,
        status: 'CHECKED_IN',
        source: 'DIRECT',
        totalAmount: 12000,
        paidAmount: 5000,
        paymentStatus: 'PARTIAL',
        baseAmount: 10000,
        gstAmount: 2000
      }
    })
    
    // 2. Booking checking out today with PENDING payment
    const booking2 = await prisma.booking.create({
      data: {
        propertyId: property.id,
        guestId: guest1.id, // Using same guest for ease
        roomId: rooms[1].id,
        checkIn: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000), 
        checkOut: today, 
        numberOfGuests: 1,
        status: 'CHECKED_IN',
        source: 'BOOKING_COM',
        totalAmount: 8000,
        paidAmount: 0,
        paymentStatus: 'PENDING',
        baseAmount: 7000,
        gstAmount: 1000
      }
    })
    console.log(`Created test bookings: ${booking1.id}, ${booking2.id}`)
  }

  console.log("Audit Seed Data Generation Complete!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
