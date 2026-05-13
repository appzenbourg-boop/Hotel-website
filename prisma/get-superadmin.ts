import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🔍 Querying administrative accounts from database...')
    
    const superAdmins = await prisma.user.findMany({
        where: {
            role: 'SUPER_ADMIN'
        },
        select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            status: true,
            role: true
        }
    })

    console.log('\n👑 [SUPER_ADMINS]')
    if (superAdmins.length === 0) {
        console.log('❌ No Super Admins found in the database!')
    } else {
        superAdmins.forEach((admin, i) => {
            console.log(`${i + 1}. Name: ${admin.name} | Email: ${admin.email} | Phone: ${admin.phone} | Status: ${admin.status}`)
        })
    }

    const hotelAdmins = await prisma.user.findMany({
        where: {
            role: 'HOTEL_ADMIN'
        },
        select: {
            name: true,
            email: true,
            phone: true
        }
    })

    console.log('\n🏨 [HOTEL_ADMINS]')
    if (hotelAdmins.length === 0) {
        console.log('❌ No Hotel Admins found!')
    } else {
        hotelAdmins.forEach((admin, i) => {
            console.log(`${i + 1}. Name: ${admin.name} | Email: ${admin.email} | Phone: ${admin.phone}`)
        })
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect()
    })
