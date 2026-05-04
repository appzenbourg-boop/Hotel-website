const { PrismaClient } = require('./generated/client')
const prisma = new PrismaClient()

async function main() {
    console.log('Seeding subscription plan definitions...')

    const plans = [
        {
            plan: 'GOLD',
            features: ['BASIC_OPS', 'STAFF_MANAGEMENT'],
            price: 99,
            description: 'Essential toolkit for small properties'
        },
        {
            plan: 'PLATINUM',
            features: ['BASIC_OPS', 'STAFF_MANAGEMENT', 'MARKETING', 'ANALYTICS'],
            price: 199,
            description: 'Advanced features for growing hotels'
        },
        {
            plan: 'DIAMOND',
            features: ['BASIC_OPS', 'STAFF_MANAGEMENT', 'MARKETING', 'ANALYTICS', 'AI_INSIGHTS', 'PRIORITY_SUPPORT'],
            price: 399,
            description: 'The ultimate enterprise hospitality suite'
        }
    ]

    for (const p of plans) {
        await prisma.planDefinition.upsert({
            where: { plan: p.plan },
            update: {},
            create: p
        })
    }

    console.log('Seeding complete!')
}

main()
    .catch((e) => {
        console.error(error)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
