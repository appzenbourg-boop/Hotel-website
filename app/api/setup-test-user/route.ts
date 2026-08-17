import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function GET() {
    try {
        const hashedPassword = await bcrypt.hash('password123', 10)

        const testEmail = 'hotel@test.com'
        
        let user = await prisma.user.findUnique({
            where: { email: testEmail }
        })

        if (!user) {
            user = await prisma.user.create({
                data: {
                    name: 'Test Hotel Admin',
                    email: testEmail,
                    phone: '1112223333',
                    password: hashedPassword,
                    role: 'HOTEL_ADMIN',
                    status: 'ACTIVE',
                },
            })
        }

        const propName = 'Test Hotel Standard'
        let property = await prisma.property.findFirst({
            where: { name: propName }
        })

        if (!property) {
            property = await prisma.property.create({
                data: {
                    name: propName,
                    address: '123 Standard Way',
                    phone: '1112223333',
                    email: testEmail,
                    ownerIds: [user.id],
                    plan: 'STANDARD',
                }
            })
            
            await prisma.user.update({
                where: { id: user.id },
                data: { ownedPropertyIds: [property.id] } as any
            })
        }

        return NextResponse.json({
            message: 'Test user created successfully!',
            email: testEmail,
            password: 'password123',
            plan: 'STANDARD'
        })
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
