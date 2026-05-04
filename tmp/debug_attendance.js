// Use ESM-compatible dynamic import for Prisma
async function main() {
    const { PrismaClient } = require('./node_modules/.prisma/client')
    const prisma = new PrismaClient()
    
    try {
        // Get all attendance records
        const allAtt = await prisma.attendance.findMany({
            orderBy: { punchIn: 'desc' },
            take: 10
        })
        console.log('=== LAST 10 ATTENDANCE RECORDS ===')
        allAtt.forEach(a => {
            console.log(`ID: ${a.id}, staffId: ${a.staffId}, punchIn: ${a.punchIn}, punchOut: ${a.punchOut}, status: ${a.status}`)
        })

        // Now test the exact dashboard query
        console.log('\n=== RECORDS WITH punchOut: null ===')
        const onDuty = await prisma.attendance.findMany({
            where: { punchOut: null },
            include: {
                staff: { include: { user: { select: { name: true } } } }
            }
        })
        console.log(`Found ${onDuty.length} on-duty records`)
        onDuty.forEach(a => {
            console.log(`  Staff: ${a.staff?.user?.name}, punchIn: ${a.punchIn}, punchOut: ${a.punchOut}`)
        })

        // Now test with staff filter
        console.log('\n=== RECORDS WITH punchOut: null AND staff filter ===')
        const onDutyFiltered = await prisma.attendance.findMany({
            where: { 
                punchOut: null,
                staff: {}  // empty filter like whereProperty when SUPER_ADMIN with no property selected
            },
            include: {
                staff: { include: { user: { select: { name: true } } } }
            }
        })
        console.log(`Found ${onDutyFiltered.length} on-duty records (with staff:{})`)

    } catch (e) {
        console.error('ERROR:', e.message)
    } finally {
        await prisma.$disconnect()
    }
}
main()
