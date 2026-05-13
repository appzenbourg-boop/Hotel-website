import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🔄 Running clean sweep to fix the property email as well in MongoDB...')
    
    const wrongEmail = 'harshfinaltestharsh@gmail..com'
    const fixedEmail = 'harshfinaltestharsh@gmail.com'

    const res = await prisma.property.updateMany({
        where: { email: wrongEmail },
        data: { email: fixedEmail }
    })

    console.log(`✅ Successfully fixed the property table email! Patched ${res.count} rows.`)
}

main().finally(() => prisma.$disconnect())
