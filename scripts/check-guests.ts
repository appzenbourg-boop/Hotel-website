import { PrismaClient } from '../prisma/generated/client'
const p = new PrismaClient()
p.guest.findMany({
    take: 10,
    select: {
        id: true, name: true, phone: true, createdByPropertyId: true,
        bookings: { select: { propertyId: true, status: true }, take: 2 }
    }
}).then(g => {
    console.log('Total guests found:', g.length)
    g.forEach(guest => console.log(JSON.stringify(guest)))
    p.$disconnect()
}).catch(e => { console.error(e.message); p.$disconnect() })
