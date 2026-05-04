import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('Testing Menu Item access...')
    const count = await prisma.menuItem.count()
    console.log(`Total Menu Items in DB: ${count}`)

    if (count > 0) {
      const first = await prisma.menuItem.findFirst()
      console.log('First Menu Item:', JSON.stringify(first, null, 2))
    }
  } catch (e: any) {
    console.error('ERROR accessing MenuItem:', e.message)
    console.error(e)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
