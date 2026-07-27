import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    const newHash = await bcrypt.hash('password123', 10)
    
    const emailsToUpdate = [
        'admin@zenbourg.com',
        'master@zenbourg.com',
        'brocool5863@gmail.com',
        'brocool5983@gmail.com'
    ]
    
    for (const email of emailsToUpdate) {
        let user = await prisma.user.findFirst({
            where: { email: { equals: email, mode: 'insensitive' } }
        })
        if (user) {
            await prisma.user.update({
                where: { id: user.id },
                data: { password: newHash, status: 'ACTIVE' }
            })
            console.log(`✅ Updated password for ${user.email} (${user.role})`)
        } else if (email === 'admin@zenbourg.com' || email === 'master@zenbourg.com') {
            const role = email.startsWith('master') ? 'SUPER_ADMIN' : 'HOTEL_ADMIN'
            const newUser = await prisma.user.create({
                data: {
                    name: role === 'SUPER_ADMIN' ? 'Master Admin' : 'Hotel Admin',
                    email: email,
                    phone: `phone_${Date.now()}_${Math.floor(Math.random()*1000)}`,
                    password: newHash,
                    role: role as any,
                    status: 'ACTIVE'
                }
            })
            console.log(`✅ Created account for ${newUser.email} (${newUser.role})`)
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect())
