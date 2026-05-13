import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🛠️ Patching harshfinaltest property data in MongoDB...')
    const res = await prisma.property.updateMany({
        where: {
            name: { contains: 'harshfinaltest', mode: 'insensitive' }
        },
        data: {
            description: '🏢 Enterprise Intake: 12 Hotel(s) · 🔑 Scale: 100+ Custom Scale rooms/property · 📍 Region: Global Expansion Hub',
            customQuoteStatus: 'PENDING'
        }
    })

    console.log(`✅ Patched ${res.count} properties!`)
}

main().finally(() => prisma.$disconnect())
