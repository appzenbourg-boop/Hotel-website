const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAllTestUsers() {
    try {
        const hashedPassword = await bcrypt.hash('password@123', 10);

        // Get or create a property to assign users to
        let property = await prisma.property.findFirst();
        if (!property) {
            property = await prisma.property.create({
                data: {
                    name: 'Harsh Hotel',
                    description: 'A luxurious hotel experience',
                    address: '123 Main Street, City',
                    phone: '+91-9800000000',
                    email: 'info@harshhotel.com',
                    checkInTime: '14:00',
                    checkOutTime: '11:00',
                }
            });
            console.log(`✅ Created property: ${property.name}`);
        } else {
            console.log(`ℹ️  Using existing property: ${property.name}`);
        }

        const users = [
            {
                name: 'Super Admin',
                email: 'superadmin@zenbourg.com',
                phone: '9000000001',
                role: 'SUPER_ADMIN',
                label: '🔑 SUPER ADMIN',
            },
            {
                name: 'Hotel Owner',
                email: 'owner@zenbourg.com',
                phone: '9000000002',
                role: 'HOTEL_ADMIN',
                propertyId: property.id,
                label: '🏨 HOTEL OWNER (HOTEL_ADMIN)',
            },
            {
                name: 'Hotel Manager',
                email: 'manager@zenbourg.com',
                phone: '9000000003',
                role: 'MANAGER',
                propertyId: property.id,
                label: '📋 MANAGER',
            },
            {
                name: 'Staff Member',
                email: 'staff@zenbourg.com',
                phone: '9000000004',
                role: 'STAFF',
                propertyId: property.id,
                label: '👷 STAFF',
            },
        ];

        console.log('\n🚀 Creating/Updating test users...\n');

        for (const u of users) {
            const user = await prisma.user.upsert({
                where: { email: u.email },
                update: {
                    password: hashedPassword,
                    role: u.role,
                    status: 'ACTIVE',
                    workplaceId: u.propertyId || null,
                },
                create: {
                    name: u.name,
                    email: u.email,
                    phone: u.phone,
                    password: hashedPassword,
                    role: u.role,
                    status: 'ACTIVE',
                    workplaceId: u.propertyId || null,
                }
            });

            // If STAFF role, ensure a Staff profile exists
            if (u.role === 'STAFF') {
                const existing = await prisma.staff.findUnique({ where: { userId: user.id } });
                if (!existing) {
                    await prisma.staff.create({
                        data: {
                            userId: user.id,
                            propertyId: property.id,
                            employeeId: `EMP-TEST-${Date.now()}`,
                            department: 'FRONT_DESK',
                            designation: 'Receptionist',
                            baseSalary: 25000,
                            dateOfJoining: new Date(),
                        }
                    });
                }
            }

            console.log(`${u.label}`);
            console.log(`   Email:    ${u.email}`);
            console.log(`   Password: password@123`);
            console.log(`   Role:     ${u.role}`);
            if (u.propertyId) console.log(`   Property: ${property.name}`);
            console.log('');
        }

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ All test users created/updated successfully!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🌐 Login URL: http://localhost:3000/admin/login');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    } catch (error) {
        console.error('❌ Error creating users:', error);
    } finally {
        await prisma.$disconnect();
    }
}

createAllTestUsers();
