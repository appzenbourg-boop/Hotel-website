import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    const hashedPassword = await bcrypt.hash('password123', 10)

    // 1. Upgrade all properties to ENTERPRISE subscription plan with max features
    await (prisma as any).property.updateMany({
        data: {
            plan: 'ENTERPRISE',
            features: ['BASIC_OPS', 'STAFF_MANAGEMENT', 'ADVANCED_ANALYTICS', 'MULTI_PROPERTY', 'CUSTOM_DOMAIN', 'INFRASTRUCTURE', 'RESTAURANT', 'LOYALTY']
        }
    })

    // 2. Setup Hotel Admin Account
    let adminUser = await prisma.user.findFirst({
        where: { email: 'admin@zenbourg.com' }
    })

    if (adminUser) {
        await prisma.user.update({
            where: { id: adminUser.id },
            data: { password: hashedPassword, role: 'HOTEL_ADMIN', status: 'ACTIVE' }
        })
    } else {
        adminUser = await prisma.user.create({
            data: {
                name: 'Zenbourg Admin',
                email: 'admin@zenbourg.com',
                phone: '9876543210',
                password: hashedPassword,
                role: 'HOTEL_ADMIN',
                status: 'ACTIVE'
            }
        })
    }

    let prop = await prisma.property.findFirst({
        where: { ownerIds: { has: adminUser.id } }
    })

    if (!prop) {
        prop = await prisma.property.create({
            data: {
                name: 'Grand Zenbourg Palace',
                address: '100 Luxury Avenue, Suite 1',
                phone: '9876543210',
                email: 'admin@zenbourg.com',
                ownerIds: [adminUser.id],
                plan: 'ENTERPRISE',
                features: ['BASIC_OPS', 'STAFF_MANAGEMENT', 'ADVANCED_ANALYTICS', 'MULTI_PROPERTY', 'CUSTOM_DOMAIN', 'INFRASTRUCTURE', 'RESTAURANT', 'LOYALTY']
            }
        })
        await prisma.user.update({
            where: { id: adminUser.id },
            data: { ownedPropertyIds: [prop.id] } as any
        })
    } else {
        await prisma.property.update({
            where: { id: prop.id },
            data: {
                plan: 'ENTERPRISE',
                features: ['BASIC_OPS', 'STAFF_MANAGEMENT', 'ADVANCED_ANALYTICS', 'MULTI_PROPERTY', 'CUSTOM_DOMAIN', 'INFRASTRUCTURE', 'RESTAURANT', 'LOYALTY']
            }
        })
    }

    // 3. Setup Super Admin Account
    let superUser = await prisma.user.findFirst({
        where: { role: 'SUPER_ADMIN' }
    })

    if (superUser) {
        await prisma.user.update({
            where: { id: superUser.id },
            data: { password: hashedPassword, status: 'ACTIVE' }
        })
    } else {
        superUser = await prisma.user.create({
            data: {
                name: 'Platform SuperAdmin',
                email: 'superadmin@zenbourg.com',
                phone: '9999900000',
                password: hashedPassword,
                role: 'SUPER_ADMIN',
                status: 'ACTIVE'
            }
        })
    }

    console.log('✅ Accounts configured!')
    console.log(`HOTEL ADMIN: admin@zenbourg.com | Password: password123`)
    console.log(`SUPER ADMIN: ${superUser.email} | Password: password123`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
