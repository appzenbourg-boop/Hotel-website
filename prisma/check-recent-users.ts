import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🔍 Inspecting recent registrations...')
    
    const recentUsers = await prisma.user.findMany({
        orderBy: {
            createdAt: 'desc'
        },
        take: 10,
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true
        }
    })

    recentUsers.forEach((u, i) => {
        console.log(`${i+1}. Name: ${u.name} | Email: ${u.email} | Role: ${u.role} | Created: ${u.createdAt}`)
    })
}

main().finally(() => prisma.$disconnect())
