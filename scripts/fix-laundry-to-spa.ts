import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Updating Laundry services to Spa Service...')

  const result = await prisma.dashboardService.updateMany({
    where: {
      name: 'Laundry'
    },
    data: {
      name: 'Spa Service',
      iconName: 'leaf-outline',
      route: '/(services)/spa'
    }
  })

  console.log(`Updated ${result.count} services.`)
  console.log('Update complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
