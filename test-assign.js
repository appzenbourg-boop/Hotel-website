// require('dotenv').config(); // Removed since tsx/prisma handles this
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { performAutoAssignment } = require('./lib/service-utils');

async function test() {
    console.log('--- AUTO-ASSIGN TEST RUN ---');
    const propertyId = '69ce6ffc260b6ac20a096513';
    
    // Check pending unassigned
    const pending = await prisma.serviceRequest.findMany({
        where: { propertyId, status: 'PENDING', assignedToId: null }
    });
    console.log(`Initial Pending: ${pending.length}`);

    // Force explicit null fix for this property (just in case)
    const fixResult = await prisma.serviceRequest.updateMany({
        where: { 
            propertyId, 
            status: 'PENDING',
            assignedToId: { not: { not: null } }
        },
        data: { assignedToId: null }
    });
    console.log(`Fix Result: ${fixResult.count} records updated to explicit null`);

    const result = await performAutoAssignment(propertyId, 0);
    console.log('Assignment Result:', JSON.stringify(result, null, 2));

    // Check remaining
    const remaining = await prisma.serviceRequest.findMany({
        where: { propertyId, status: 'PENDING', assignedToId: null }
    });
    console.log(`Remaining Unassigned: ${remaining.length}`);
}

test()
    .then(() => process.exit(0))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
