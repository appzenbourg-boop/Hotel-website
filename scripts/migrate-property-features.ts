import { prisma } from '../lib/db'
import { normalizePropertyFeatures, MASTER_FEATURES } from '../lib/master-features'

async function migrate() {
  console.log('--- STARTING PROPERTY FEATURES MIGRATION ---')
  const properties = await prisma.property.findMany()
  console.log(`Found ${properties.length} properties.`)

  let updatedCount = 0
  for (const prop of properties) {
    const currentFeatures = prop.features || []
    // If enterprise or empty, give all master features
    let targetFeatures: string[]
    if (prop.plan?.toUpperCase() === 'ENTERPRISE') {
      targetFeatures = MASTER_FEATURES.map(f => f.id)
    } else {
      targetFeatures = normalizePropertyFeatures(currentFeatures, prop.plan)
    }

    // Check if targetFeatures differs
    const currentSet = new Set(currentFeatures)
    const targetSet = new Set(targetFeatures)
    const isDifferent = currentFeatures.length !== targetFeatures.length || targetFeatures.some(f => !currentSet.has(f))

    if (isDifferent) {
      await prisma.property.update({
        where: { id: prop.id },
        data: { features: targetFeatures }
      })
      console.log(`Updated "${prop.name}" (${prop.id}) with ${targetFeatures.length} granular features.`)
      updatedCount++
    } else {
      console.log(`Property "${prop.name}" already up to date.`)
    }
  }

  console.log(`--- MIGRATION COMPLETE: ${updatedCount} properties updated. ---`)
}

migrate()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
