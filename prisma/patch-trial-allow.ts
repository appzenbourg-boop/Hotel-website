import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('⚡ Retroactively activating Enterprise Trial Authorization for harshfinaltest in MongoDB...')
    
    const res = await prisma.property.updateMany({
        where: { name: { contains: 'harshfinaltest', mode: 'insensitive' } },
        data: {
            customQuoteAllowsTrial: true
        }
    })

    console.log(`✅ Patched ${res.count} properties successfully!`)
}

main().finally(() => prisma.$disconnect())
