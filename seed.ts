import { prisma } from './lib/db'

async function seed() {
    let property = await prisma.property.findFirst({
        where: { name: 'Zenbourg Grand Hotel' }
    })

    if (!property) {
        property = await prisma.property.create({
            data: {
                name: 'Zenbourg Grand Hotel',
                description: 'The ultimate luxury experience.',
                address: '123 Luxury Ave, Zenbourg',
                phone: '+1234567890',
                email: 'contact@zenbourg.com',
                images: ['https://images.unsplash.com/photo-1566073771259-6a8506099945'],
                checkInTime: "14:00",
                checkOutTime: "11:00"
            }
        })
        console.log('Property created:', property.name)
    } else {
        console.log('Property already exists:', property.name)
    }
}

seed()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
