const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    try {
        const onDuty = await prisma.attendance.findMany({
            where: {
                punchOut: null,
            },
            include: {
                staff: { include: { user: { select: { name: true } } } }
            }
        })
        console.log(JSON.stringify(onDuty, null, 2))
    } catch (e) {
        console.error(e.message)
    } finally {
        await prisma.$disconnect()
    }
}
main()
