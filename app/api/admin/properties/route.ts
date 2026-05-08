import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || session.user.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { name, address, phone, email, description, latitude, longitude, trialPeriod, upiId } = body

        if (!name || !address || !phone || !email) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const planExpiresAt = trialPeriod ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) : null

        const property = await prisma.property.create({
            data: {
                name,
                address,
                phone,
                email,
                description,
                latitude: latitude ? parseFloat(latitude) : null,
                longitude: longitude ? parseFloat(longitude) : null,
                checkInTime: '14:00',
                checkOutTime: '11:00',
                plan: 'BASE',
                planExpiresAt: planExpiresAt,
            }
        })

        // Create default property settings with UPI ID for auto-deduction
        await prisma.propertySettings.create({
            data: {
                propertyId: property.id,
                upiId: upiId || null,
                gstPercent: 18.0,
                serviceChargePercent: 0.0,
                luxuryTaxPercent: 0.0,
                defaultDiscountPercent: 0.0,
                invoicePrefix: 'INV',
                currency: 'INR',
                currencySymbol: '₹',
                checkInTime: '14:00',
                checkOutTime: '11:00',
            }
        })

        // Auto-seed default dashboard services
        await prisma.dashboardService.createMany({
            data: [
                { name: 'Open Door', iconName: 'key-outline', route: '/(services)/door', order: 0, propertyId: property.id },
                { name: 'House Keeping', iconName: 'sparkles-outline', route: '/(services)/housekeeping', order: 1, propertyId: property.id },
                { name: 'Wake-up Call', iconName: 'alarm-outline', route: '/(services)/wakeup', order: 2, propertyId: property.id },
                { name: 'Toiletries', iconName: 'flask-outline', route: '/(services)/toiletries', order: 3, propertyId: property.id },
                { name: 'Food', iconName: 'fast-food-outline', route: '/(services)/food', order: 4, propertyId: property.id },
                { name: 'Spa Service', iconName: 'leaf-outline', route: '/(services)/spa', order: 5, propertyId: property.id },
            ]
        })

        return NextResponse.json(property, { status: 201 })
    } catch (error) {
        console.error('Error creating property:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session || session.user.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const properties = await prisma.property.findMany({
            select: { id: true, name: true, plan: true },
            orderBy: { createdAt: 'desc' },
        })
        return NextResponse.json(properties)
    } catch (error) {
        console.error('Error fetching properties:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
