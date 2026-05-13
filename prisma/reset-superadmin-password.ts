import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    console.log('🔄 Resetting Super Admin passwords to a standard temporary password...')
    
    const newPassword = 'password123' // Same default as seed.ts
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // 1. Reset master@zenbourg.com
    await prisma.user.updateMany({
        where: { email: 'master@zenbourg.com' },
        data: { password: hashedPassword }
    })
    console.log('✅ Updated master@zenbourg.com')

    // 2. Reset superadmin@zenbourg.com
    await prisma.user.updateMany({
        where: { email: 'superadmin@zenbourg.com' },
        data: { password: hashedPassword }
    })
    console.log('✅ Updated superadmin@zenbourg.com')

    console.log(`\n🎉 Both Super Admin passwords have been successfully reset to: ${newPassword}`)
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect()
    })
