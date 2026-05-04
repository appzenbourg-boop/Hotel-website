const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function resetAndCheck() {
    try {
        const email = 'rahul@gmail.com';
        const password = '123456';
        const hashed = await bcrypt.hash(password, 10);

        const updated = await prisma.user.updateMany({
            where: { email: email },
            data: {
                password: hashed,
                status: 'ACTIVE'
            }
        });

        console.log('Update result:', updated);

        const user = await prisma.user.findFirst({
            where: { email: email }
        });

        if (user) {
            const isValid = await bcrypt.compare(password, user.password);
            console.log('Password test for 123456:', isValid);
            console.log('User Role:', user.role);
            console.log('User Status:', user.status);
        } else {
            console.log('User not found!');
        }

        // Also check Harish
        const harishEmail = 'harish@zenbourg.com';
        await prisma.user.updateMany({
            where: { email: harishEmail },
            data: {
                password: hashed,
                status: 'ACTIVE'
            }
        });
        console.log('Harish password also reset to 123456');

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

resetAndCheck();
