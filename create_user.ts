import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    try {
        const hashedPassword = await bcrypt.hash('password123', 10)
        const testEmail = 'owner@zenbourg.com'
        
        let user = await prisma.user.upsert({
            where: { email: testEmail },
            update: {
                password: hashedPassword,
                role: 'HOTEL_ADMIN',
                status: 'ACTIVE'
            },
            create: {
                name: 'Hotel Owner',
                email: testEmail,
                phone: '5556667777',
                password: hashedPassword,
                role: 'HOTEL_ADMIN',
                status: 'ACTIVE',
            },
        })
        console.log('Upserted user')

        const propName = 'Zenbourg Grand Resort'
        let property = await prisma.property.findFirst({
            where: { name: propName }
        })

        if (!property) {
            property = await prisma.property.create({
                data: {
                    name: propName,
                    address: '100 Resort Blvd',
                    phone: '5556667777',
                    email: testEmail,
                    ownerIds: [user.id],
                    plan: 'ENTERPRISE',
                }
            })
            
            await prisma.user.update({
                where: { id: user.id },
                data: { ownedPropertyIds: [property.id] } as any
            })
            console.log('Created property')
        } else {
             // Ensure user is owner of the property
             await prisma.user.update({
                where: { id: user.id },
                data: { ownedPropertyIds: [property.id] } as any
            })
        }

        console.log('Test user ready: owner@zenbourg.com / password123 / HOTEL_ADMIN / ENTERPRISE plan')
    } catch (e) {
        console.error(e)
    } finally {
        await prisma.$disconnect()
    }
}

main()
