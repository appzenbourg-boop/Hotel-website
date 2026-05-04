import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const DEFAULT_SERVICES = [
  { name: 'Open Door', iconName: 'key-outline', route: '/(services)/door', order: 0 },
  { name: 'House Keeping', iconName: 'sparkles-outline', route: '/(services)/housekeeping', order: 1 },
  { name: 'Wake-up Call', iconName: 'alarm-outline', route: '/(services)/wakeup', order: 2 },
  { name: 'Toiletries', iconName: 'flask-outline', route: '/(services)/toiletries', order: 3 },
  { name: 'Food', iconName: 'fast-food-outline', route: '/(services)/food', order: 4 },
  { name: 'Spa Service', iconName: 'leaf-outline', route: '/(services)/spa', order: 5 },
]

async function main() {
  const properties = await prisma.property.findMany()
  console.log(`Found ${properties.length} properties. Seeding default services...`)

  for (const property of properties) {
    console.log(`Processing property: ${property.name} (${property.id})`)
    
    // Check if services already exist for this property
    const existingCount = await prisma.dashboardService.count({
      where: { propertyId: property.id }
    })

    if (existingCount === 0) {
      await prisma.dashboardService.createMany({
        data: DEFAULT_SERVICES.map(s => ({
          ...s,
          propertyId: property.id,
          isActive: true
        }))
      })
      console.log(`  Added 6 default services to ${property.name}`)
    } else {
      console.log(`  Property ${property.name} already has services. Skipping.`)
    }
  }

  console.log('Seeding complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
