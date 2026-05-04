const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    try {
        const staff = await prisma.staff.findMany({
            include: { 
                user: { select: { name: true, status: true } },
                attendances: { 
                    where: { punchOut: null },
                    select: { punchIn: true }
                }
            }
        })
        console.log('--- STAFF LIST (DEBUG) ---')
        staff.forEach(s => {
            console.log(`Name: ${s.user?.name}, Dept: ${s.department}, Status: ${s.user?.status}, PunchedIn: ${s.attendances.length > 0}`)
        })

        const requests = await prisma.serviceRequest.findMany({
            where: { status: 'PENDING', assignedToId: null }
        })
        console.log('\n--- UNASSIGNED PENDING REQUESTS ---')
        requests.forEach(r => {
            console.log(`ID: ${r.id}, Type: ${r.type}, Title: ${r.title}`)
        })
    } catch (e) {
        console.error(e)
    } finally {
        await prisma.$disconnect()
    }
}
main()
