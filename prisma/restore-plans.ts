import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const DEFAULT_PLANS = [
    {
        plan: 'BASE',
        displayName: 'Base',
        tagline: 'For independent properties getting started',
        description: 'Core PMS, reservations, front desk terminal. Digital check-in and check-out. Up to 30 rooms.',
        originalPrice: 15000,
        discountedPrice: 9999,
        discountPercent: 33,
        maxRooms: 30,
        maxStaff: 15,
        features: [
            'Core PMS & Reservations',
            'Front Desk Terminal',
            'Digital Check-in & Check-out',
            'Up to 30 rooms',
        ],
    },
    {
        plan: 'STARTER',
        displayName: 'Starter',
        tagline: 'Ideal for Growth-stage hotels and boutique resorts',
        description: 'Everything in Base, plus: Staff app, housekeeping and maintenance dispatch. Marketing tools and loyalty module. Up to 75 rooms.',
        originalPrice: 30000,
        discountedPrice: 15999,
        discountPercent: 46,
        maxRooms: 75,
        maxStaff: 40,
        features: [
            'Everything in Base',
            'Staff app, housekeeping & maintenance dispatch',
            'Marketing tools & loyalty module',
            'Up to 75 rooms',
        ],
    },
    {
        plan: 'STANDARD',
        displayName: 'Standard',
        tagline: 'Full-service hotels seeking maximum performance',
        description: 'Everything in Starter, plus: IoT room controls and advanced analytics. F&B and spa integration, upsell engine. Multi-language Guest Portal. Up to 150 rooms.',
        originalPrice: 55000,
        discountedPrice: 29999,
        discountPercent: 45,
        maxRooms: 150,
        maxStaff: 100,
        features: [
            'Everything in Starter',
            'IoT room controls & advanced analytics',
            'F&B and spa integration, upsell engine',
            'Multi-language Guest Portal',
            'Up to 150 rooms',
        ],
    },
    {
        plan: 'ENTERPRISE',
        displayName: 'Enterprise',
        tagline: 'Multi-property groups and luxury brands',
        description: 'Everything in Standard, plus: Multi-property super admin and custom integrations. Dedicated success manager, white-label Guest Portal. SLA-backed uptime, unlimited rooms.',
        originalPrice: 0,
        discountedPrice: 0,
        discountPercent: 0,
        maxRooms: 0,
        maxStaff: 0,
        features: [
            'Everything in Standard',
            'Multi-property super admin & custom integrations',
            'Dedicated success manager',
            'White-label Guest Portal',
            'SLA-backed uptime, unlimited rooms',
            'Custom pricing',
        ],
    },
]

async function main() {
    console.log('⚡ Restoring correct plan definitions to DB...')
    for (const def of DEFAULT_PLANS) {
        await prisma.planDefinition.upsert({
            where: { plan: def.plan as any },
            update: {
                displayName:     def.displayName,
                tagline:         def.tagline,
                description:     def.description,
                originalPrice:   def.originalPrice,
                discountedPrice: def.discountedPrice,
                discountPercent: def.discountPercent,
                maxRooms:        def.maxRooms,
                maxStaff:        def.maxStaff,
                features:        def.features,
            },
            create: def as any,
        })
    }
    console.log('✅ Plans restored successfully!')
}

main().finally(() => prisma.$disconnect())
