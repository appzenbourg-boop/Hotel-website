const { PrismaClient } = require('@prisma/client')

async function main() {
    const prisma = new PrismaClient()
    
    try {
        const allAtt = await prisma.attendance.findMany({
            orderBy: { punchIn: 'desc' },
            take: 10,
            select: { id: true, punchIn: true, punchOut: true, staffId: true, status: true }
        })
        console.log('LAST 10 ATTENDANCE:')
        console.log(JSON.stringify(allAtt, null, 2))

        const onDuty = await prisma.attendance.findMany({
            where: { punchOut: null },
            select: { id: true, punchIn: true, punchOut: true, staffId: true }
        })
        console.log('ON DUTY (punchOut=null):')
        console.log(JSON.stringify(onDuty, null, 2))
    } catch (e) {
        console.error(e.message)
    } finally {
        await prisma.$disconnect()
    }
}
main()
