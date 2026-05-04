const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const onDuty = await prisma.attendance.findMany({
        where: {
            punchOut: null,
            staff: {}
        },
        include: {
            staff: { include: { user: { select: { name: true } } } }
        }
    })
    console.dir(onDuty, { depth: null })
}
main()
