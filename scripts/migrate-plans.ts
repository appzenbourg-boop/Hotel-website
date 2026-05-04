/**
 * One-time migration: update properties with legacy plan names to new ones.
 * GOLD → BASE, PLATINUM → STARTER, DIAMOND → STANDARD
 *
 * Run: npx tsx scripts/migrate-plans.ts
 */
import { PrismaClient } from '../prisma/generated/client'

const prisma = new PrismaClient()

const PLAN_MAP: Record<string, string> = {
    GOLD:     'BASE',
    PLATINUM: 'STARTER',
    DIAMOND:  'STANDARD',
}

async function main() {
    console.log('Migrating legacy plan names...')

    for (const [oldPlan, newPlan] of Object.entries(PLAN_MAP)) {
        const result = await prisma.property.updateMany({
            where: { plan: oldPlan as any },
            data:  { plan: newPlan as any },
        })
        if (result.count > 0) {
            console.log(`  ${oldPlan} → ${newPlan}: updated ${result.count} properties`)
        }
    }

    console.log('Done.')
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
