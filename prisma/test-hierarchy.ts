import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🔍 Printing FULL properties object to detect type mismatches...')
    const properties = await prisma.property.findMany({
        include: {
            owners: {
                select: { id: true, name: true, email: true, role: true, status: true }
            },
            staff: {
                include: {
                    user: {
                        select: { id: true, name: true, email: true, role: true, status: true }
                    }
                }
            }
        },
        orderBy: { createdAt: 'desc' },
        take: 1
    })

    console.log(JSON.stringify(properties, null, 2))
}

main().finally(() => prisma.$disconnect())
