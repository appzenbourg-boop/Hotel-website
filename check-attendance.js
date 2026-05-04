async function test() {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const atts = await prisma.attendance.findMany({
        orderBy: { punchIn: 'desc' },
        take: 5,
        include: { staff: { select: { user: { select: { name: true } } } } }
    });
    console.log(JSON.stringify(atts, null, 2));
}
test().catch(console.error);
