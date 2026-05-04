const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    console.log('UNASSIGNED PENDING REQUESTS DATA:');
    const requests = await prisma.serviceRequest.findMany({
        where: { status: 'PENDING', assignedToId: null },
        include: { property: { select: { name: true } } }
    });

    if (requests.length === 0) {
        console.log('None found with assignedToId: null. Checking for missing field...');
        const all = await prisma.serviceRequest.findMany({ where: { status: 'PENDING' } });
        const missing = all.filter(r => !r.assignedToId);
        console.log(`Found ${missing.length} records where assignedToId is missing/null in memory.`);
        missing.forEach(r => console.log(` - ID: ${r.id}, Property: ${r.propertyId}, Title: ${r.title}`));
    } else {
        requests.forEach(r => console.log(` - ID: ${r.id}, Property: ${r.propertyId}, Title: ${r.title}`));
    }
}

check().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
