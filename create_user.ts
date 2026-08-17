import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    try {
        const hashedPassword = await bcrypt.hash('password123', 10)
        const testEmail = 'hotel@test.com'
        
        let user = await prisma.user.findUnique({
            where: { email: testEmail }
        })

        if (!user) {
            user = await prisma.user.create({
                data: {
                    name: 'Test Hotel Admin',
                    email: testEmail,
                    phone: '1112223333',
                    password: hashedPassword,
                    role: 'HOTEL_ADMIN',
                    status: 'ACTIVE',
                },
            })
            console.log('Created user')
        }

        const propName = 'Test Hotel Standard'
        let property = await prisma.property.findFirst({
            where: { name: propName }
        })

        if (!property) {
            property = await prisma.property.create({
                data: {
                    name: propName,
                    address: '123 Standard Way',
                    phone: '1112223333',
                    email: testEmail,
                    ownerIds: [user.id],
                    plan: 'STANDARD',
                }
            })
            
            await prisma.user.update({
                where: { id: user.id },
                data: { ownedPropertyIds: [property.id] } as any
            })
            console.log('Created property')
        }

        console.log('Test user ready: hotel@test.com / password123 / STANDARD plan')
    } catch (e) {
        console.error(e)
    } finally {
        await prisma.$disconnect()
    }
}

main()
