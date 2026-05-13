import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🔍 Scanning property database for exact records...')
    const recentProps = await prisma.property.findMany({
        orderBy: {
            createdAt: 'desc'
        },
        take: 5,
        select: {
            id: true,
            name: true,
            plan: true,
            customQuoteStatus: true,
            customQuoteAmount: true,
            email: true,
            createdAt: true
        }
    })

    recentProps.forEach((p, i) => {
        console.log(`${i+1}. Name: ${p.name} | Plan: ${p.plan} | QuoteStatus: ${p.customQuoteStatus} | QuoteAmount: ${p.customQuoteAmount} | Email: ${p.email}`)
    })
}

main().finally(() => prisma.$disconnect())
