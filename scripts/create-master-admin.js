const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createSuperAdmin() {
    const email = 'master@zenbourg.com';
    const password = 'masterpassword123';
    const name = 'Zenbourg Master Admin';

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.upsert({
            where: { email: email },
            update: {
                role: 'SUPER_ADMIN',
                status: 'ACTIVE'
            },
            create: {
                name: name,
                email: email,
                password: hashedPassword,
                phone: '0000000000', // Dummy phone for unique constraint
                role: 'SUPER_ADMIN',
                status: 'ACTIVE'
            }
        });

        console.log('✅ Super Admin Created/Updated successfully!');
        console.log('-------------------------------------------');
        console.log(`Email: ${email}`);
        console.log(`Password: ${password}`);
        console.log('-------------------------------------------');
    } catch (error) {
        console.error('❌ Error creating Super Admin:', error);
    } finally {
        await prisma.$disconnect();
    }
}

createSuperAdmin();
