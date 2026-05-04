import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting database seeding...');

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await prisma.serviceRequest.deleteMany();
    await (prisma as any).campaign.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.rating.deleteMany();
    await prisma.menuItem.deleteMany();
    await prisma.amenity.deleteMany();
    await prisma.spaService.deleteMany();
    await prisma.room.deleteMany();
    await prisma.property.deleteMany();
    await prisma.guest.deleteMany();
    await prisma.performanceScore.deleteMany();
    await prisma.payroll.deleteMany();
    await prisma.leaveRequest.deleteMany();
    await prisma.attendance.deleteMany();
    await prisma.staff.deleteMany();
    await prisma.user.deleteMany();

    // Create Property
    console.log('🏨 Creating property...');
    const property = await prisma.property.create({
        data: {
            name: 'Zenbourg Grand Hotel',
            description: 'A luxurious 5-star hotel experience in the heart of the city',
            address: '123 Main Street, Downtown, City 560001',
            phone: '+91-9876543210',
            email: 'info@zenbourg.com',
            checkInTime: '14:00',
            checkOutTime: '11:00',
            cancellationPolicy: 'Free cancellation up to 24 hours before check-in',
            images: [
                'https://images.unsplash.com/photo-1566073771259-6a8506099945',
                'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb',
            ],
        },
    });

    // Create Rooms
    console.log('🛏️  Creating rooms...');
    const rooms = await Promise.all([
        prisma.room.create({
            data: {
                propertyId: property.id,
                roomNumber: '101',
                floor: 1,
                category: 'STANDARD',
                type: 'Standard King',
                maxOccupancy: 2,
                basePrice: 3500,
                amenities: ['WiFi', 'TV', 'AC', 'Mini Bar'],
                images: ['https://images.unsplash.com/photo-1611892440504-42a792e24d32'],
                description: 'Comfortable standard room with king-size bed',
                status: 'AVAILABLE',
            },
        }),
        prisma.room.create({
            data: {
                propertyId: property.id,
                roomNumber: '102',
                floor: 1,
                category: 'STANDARD',
                type: 'Standard Twin',
                maxOccupancy: 2,
                basePrice: 3200,
                amenities: ['WiFi', 'TV', 'AC'],
                images: ['https://images.unsplash.com/photo-1590490360182-c33d57733427'],
                description: 'Standard room with twin beds',
                status: 'AVAILABLE',
            },
        }),
        prisma.room.create({
            data: {
                propertyId: property.id,
                roomNumber: '201',
                floor: 2,
                category: 'DELUXE',
                type: 'Deluxe King',
                maxOccupancy: 3,
                basePrice: 5500,
                amenities: ['WiFi', 'Smart TV', 'AC', 'Mini Bar', 'Balcony', 'Coffee Maker'],
                images: ['https://images.unsplash.com/photo-1582719478250-c89cae4dc85b'],
                description: 'Spacious deluxe room with city view',
                status: 'AVAILABLE',
            },
        }),
        prisma.room.create({
            data: {
                propertyId: property.id,
                roomNumber: '301',
                floor: 3,
                category: 'SUITE',
                type: 'Executive Suite',
                maxOccupancy: 4,
                basePrice: 8500,
                amenities: ['WiFi', 'Smart TV', 'AC', 'Mini Bar', 'Balcony', 'Coffee Maker', 'Jacuzzi', 'Living Room'],
                images: ['https://images.unsplash.com/photo-1578683010236-d716f9a3f461'],
                description: 'Luxurious suite with separate living area',
                status: 'AVAILABLE',
            },
        }),
        prisma.room.create({
            data: {
                propertyId: property.id,
                roomNumber: '401',
                floor: 4,
                category: 'PENTHOUSE',
                type: 'Presidential Suite',
                maxOccupancy: 6,
                basePrice: 15000,
                amenities: ['WiFi', 'Smart TV', 'AC', 'Mini Bar', 'Balcony', 'Coffee Maker', 'Jacuzzi', 'Living Room', 'Dining Area', 'Kitchen'],
                images: ['https://images.unsplash.com/photo-1631049307264-da0ec9d70304'],
                description: 'Ultimate luxury penthouse suite',
                status: 'AVAILABLE',
            },
        }),
    ]);

    // Create Amenities
    console.log('✨ Creating amenities...');
    await Promise.all([
        prisma.amenity.create({
            data: {
                propertyId: property.id,
                name: 'Swimming Pool',
                description: '25m outdoor pool with poolside bar',
                category: 'Recreation',
                icon: 'pool',
                isActive: true,
            },
        }),
        prisma.amenity.create({
            data: {
                propertyId: property.id,
                name: 'Fitness Center',
                description: '24/7 gym with modern equipment',
                category: 'Fitness',
                icon: 'gym',
                isActive: true,
            },
        }),
        prisma.amenity.create({
            data: {
                propertyId: property.id,
                name: 'Spa & Wellness',
                description: 'Full-service spa with massage and treatments',
                category: 'Wellness',
                icon: 'spa',
                isActive: true,
            },
        }),
        prisma.amenity.create({
            data: {
                propertyId: property.id,
                name: 'Restaurant',
                description: 'Multi-cuisine restaurant serving breakfast, lunch, and dinner',
                category: 'Dining',
                icon: 'restaurant',
                isActive: true,
            },
        }),
        prisma.amenity.create({
            data: {
                propertyId: property.id,
                name: 'Free WiFi',
                description: 'High-speed internet throughout the property',
                category: 'Technology',
                icon: 'wifi',
                isActive: true,
            },
        }),
        prisma.amenity.create({
            data: {
                propertyId: property.id,
                name: 'Parking',
                description: 'Free valet parking for guests',
                category: 'Convenience',
                icon: 'parking',
                isActive: true,
            },
        }),
    ]);

    // Create Menu Items
    console.log('🍽️  Creating menu items...');
    await Promise.all([
        // Breakfast
        prisma.menuItem.create({
            data: {
                propertyId: property.id,
                name: 'Continental Breakfast',
                description: 'Toast, eggs, bacon, juice, coffee',
                category: 'Breakfast',
                cuisine: 'Continental',
                price: 450,
                isVeg: false,
                isAvailable: true,
                prepTime: 15,
                image: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666',
            },
        }),
        prisma.menuItem.create({
            data: {
                propertyId: property.id,
                name: 'Indian Breakfast',
                description: 'Idli, dosa, vada with sambar and chutney',
                category: 'Breakfast',
                cuisine: 'Indian',
                price: 350,
                isVeg: true,
                isAvailable: true,
                prepTime: 20,
                image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc',
            },
        }),
        // Lunch/Dinner
        prisma.menuItem.create({
            data: {
                propertyId: property.id,
                name: 'Butter Chicken',
                description: 'Creamy tomato-based curry with tender chicken',
                category: 'Main Course',
                cuisine: 'Indian',
                price: 550,
                isVeg: false,
                isAvailable: true,
                prepTime: 25,
                image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398',
            },
        }),
        prisma.menuItem.create({
            data: {
                propertyId: property.id,
                name: 'Paneer Tikka Masala',
                description: 'Cottage cheese in rich tomato gravy',
                category: 'Main Course',
                cuisine: 'Indian',
                price: 450,
                isVeg: true,
                isAvailable: true,
                prepTime: 20,
                image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7',
            },
        }),
        prisma.menuItem.create({
            data: {
                propertyId: property.id,
                name: 'Margherita Pizza',
                description: 'Classic pizza with tomato, mozzarella, and basil',
                category: 'Main Course',
                cuisine: 'Italian',
                price: 500,
                isVeg: true,
                isAvailable: true,
                prepTime: 18,
                image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002',
            },
        }),
        // Beverages
        prisma.menuItem.create({
            data: {
                propertyId: property.id,
                name: 'Fresh Juice',
                description: 'Orange, apple, or mixed fruit',
                category: 'Beverages',
                cuisine: 'Beverages',
                price: 150,
                isVeg: true,
                isAvailable: true,
                prepTime: 5,
                image: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba',
            },
        }),
        prisma.menuItem.create({
            data: {
                propertyId: property.id,
                name: 'Coffee',
                description: 'Espresso, cappuccino, or latte',
                category: 'Beverages',
                cuisine: 'Beverages',
                price: 120,
                isVeg: true,
                isAvailable: true,
                prepTime: 5,
                image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93',
            },
        }),
    ]);

    // Create Spa Services
    console.log('💆 Creating spa services...');
    await Promise.all([
        prisma.spaService.create({
            data: {
                propertyId: property.id,
                name: 'Swedish Massage',
                description: 'Full body relaxation massage',
                duration: 60,
                price: 2500,
                isAvailable: true,
                image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874',
            },
        }),
        prisma.spaService.create({
            data: {
                propertyId: property.id,
                name: 'Aromatherapy',
                description: 'Therapeutic massage with essential oils',
                duration: 90,
                price: 3500,
                isAvailable: true,
                image: 'https://images.unsplash.com/photo-1600334129128-685c5582fd35',
            },
        }),
        prisma.spaService.create({
            data: {
                propertyId: property.id,
                name: 'Facial Treatment',
                description: 'Deep cleansing and rejuvenation facial',
                duration: 45,
                price: 1800,
                isAvailable: true,
                image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881',
            },
        }),
    ]);

    // Create Test Users and Guests
    console.log('👤 Creating test users...');
    const hashedPassword = await bcrypt.hash('password123', 10);

    const testUser = await prisma.user.create({
        data: {
            name: 'Test Guest',
            email: 'guest@test.com',
            phone: '9999999999',
            password: hashedPassword,
            role: 'GUEST',
            status: 'ACTIVE',
        },
    });

    const testGuest = await prisma.guest.create({
        data: {
            name: 'Test Guest',
            email: 'guest@test.com',
            phone: '9999999999',
            address: '456 Test Street, Test City',
            checkInStatus: 'PENDING',
        },
    });

    // Create Admin User
    const adminUser = await prisma.user.create({
        data: {
            name: 'Admin User',
            email: 'admin@zenbourg.com',
            phone: '8888888888',
            password: hashedPassword,
            role: 'HOTEL_ADMIN',
            status: 'ACTIVE',
        },
    });

    // Create Sample Booking
    console.log('📅 Creating sample booking...');
    const sampleBooking = await prisma.booking.create({
        data: {
            guestId: testGuest.id,
            roomId: rooms[0].id,
            propertyId: property.id,
            checkIn: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
            checkOut: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
            numberOfGuests: 2,
            totalAmount: 10500, // 3 nights * 3500
            paidAmount: 0,
            status: 'RESERVED',
            source: 'DIRECT',
            paymentStatus: 'PENDING',
            specialRequests: 'Early check-in if possible',
        },
    });

    console.log('📢 Creating marketing campaigns...');
    await (prisma as any).campaign.createMany({
        data: [
            {
                name: 'Exclusive Summer Suites',
                startedAt: new Date('2024-05-12'),
                segment: 'Diamond Only',
                performance: 74,
                status: 'ACTIVE',
                channel: 'EMAIL',
                propertyId: property.id
            },
            {
                name: 'Early Bird Winter Gold',
                startedAt: new Date('2024-05-05'),
                segment: 'Gold Tier',
                performance: 42,
                status: 'ACTIVE',
                channel: 'PUSH',
                propertyId: property.id
            }
        ]
    });

    console.log('✅ Database seeding completed!');
    console.log('\n📊 Summary:');
    console.log(`   - Property: ${property.name}`);
    console.log(`   - Rooms: ${rooms.length}`);
    console.log(`   - Amenities: 6`);
    console.log(`   - Menu Items: 7`);
    console.log(`   - Spa Services: 3`);
    console.log(`   - Test User: phone: 9999999999, password: password123`);
    console.log(`   - Admin User: phone: 8888888888, password: password123`);
    console.log(`   - Sample Booking: ${sampleBooking.id}`);
    console.log('\n🚀 You can now start using the API!');
}

main()
    .catch((e) => {
        console.error('❌ Error seeding database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
