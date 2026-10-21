import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { hash } from 'bcryptjs'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || session.user.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const {
            name, address, phone, email, description, latitude, longitude,
            chainName, plan, features, trialPeriod, upiId,
            ownerName, ownerEmail, ownerPhone, ownerPassword
        } = body

        if (!name || !address || !phone || !email) {
            return NextResponse.json({ error: 'Missing required property fields (name, address, phone, email)' }, { status: 400 })
        }

        const planExpiresAt = trialPeriod ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) : null

        // 1. Create Property
        const property = await prisma.property.create({
            data: {
                name: name.trim(),
                chainName: chainName ? chainName.trim() : null,
                address: address.trim(),
                phone: phone.trim(),
                email: email.trim().toLowerCase(),
                description: description?.trim() || null,
                latitude: latitude ? parseFloat(latitude) : null,
                longitude: longitude ? parseFloat(longitude) : null,
                checkInTime: '14:00',
                checkOutTime: '11:00',
                plan: plan || 'BASE',
                features: Array.isArray(features) && features.length > 0 ? features : ['bookings', 'checkin', 'rooms', 'guests', 'settings'],
                planExpiresAt: planExpiresAt,
                isTrialActive: !!trialPeriod,
            }
        })

        // 2. Provision Hotel Owner Account if details provided
        let createdOwnerId: string | null = null
        if (ownerEmail && ownerPassword) {
            const cleanEmail = ownerEmail.trim().toLowerCase()
            const existingUser = await prisma.user.findFirst({
                where: { email: cleanEmail }
            })

            if (existingUser) {
                // Link existing user as owner
                await prisma.property.update({
                    where: { id: property.id },
                    data: {
                        ownerIds: { push: existingUser.id }
                    }
                })
                createdOwnerId = existingUser.id
            } else {
                const hashedPassword = await hash(ownerPassword, 12)
                const newOwner = await prisma.user.create({
                    data: {
                        name: ownerName?.trim() || `${name} Owner`,
                        email: cleanEmail,
                        phone: ownerPhone?.trim() || phone.trim(),
                        password: hashedPassword,
                        role: 'HOTEL_ADMIN',
                        status: 'ACTIVE',
                        workplaceId: property.id,
                        ownedPropertyIds: [property.id]
                    }
                })

                await prisma.property.update({
                    where: { id: property.id },
                    data: {
                        ownerIds: [newOwner.id]
                    }
                })
                createdOwnerId = newOwner.id
            }
        }

        // 3. Create default property settings with UPI ID
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

        // 4. Auto-seed default dashboard services
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

        // Fetch refreshed property with relations
        const fullProperty = await prisma.property.findUnique({
            where: { id: property.id },
            include: {
                owners: {
                    select: { id: true, name: true, email: true, phone: true, role: true, status: true }
                }
            }
        })

        return NextResponse.json({ success: true, property: fullProperty }, { status: 201 })
    } catch (error: any) {
        console.error('Error creating property:', error)
        return NextResponse.json({ error: error.message || 'Failed to onboard property' }, { status: 500 })
    }
}

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || session.user.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const chain = searchParams.get('chain')
        const search = searchParams.get('search')?.trim().toLowerCase()

        const where: any = {}
        if (chain && chain !== 'ALL') {
            where.chainName = chain === 'INDEPENDENT' ? null : chain
        }

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { address: { contains: search, mode: 'insensitive' } },
                { chainName: { contains: search, mode: 'insensitive' } },
            ]
        }

        const properties = await prisma.property.findMany({
            where,
            include: {
                owners: {
                    select: { id: true, name: true, email: true, phone: true, role: true, status: true }
                },
                staff: {
                    select: { id: true, designation: true }
                },
                _count: {
                    select: { rooms: true, staff: true, bookings: true }
                }
            },
            orderBy: { createdAt: 'desc' },
        })

        return NextResponse.json(properties)
    } catch (error) {
        console.error('Error fetching properties:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
