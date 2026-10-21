import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const bookingId = searchParams.get('bookingId')
        const guestId = searchParams.get('guestId')

        if (!bookingId) {
            return NextResponse.json({ success: false, error: 'Booking ID is required' }, { status: 400 })
        }

        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            include: {
                room: true,
                guest: true
            }
        })

        if (!booking || !booking.room) {
            return NextResponse.json({ success: false, error: 'Booking or Room not found' }, { status: 404 })
        }

        // Verify guest ownership if guestId provided
        if (guestId && booking.guestId !== guestId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 })
        }

        const currentPrice = booking.room.basePrice || 0
        const currentCategory = booking.room.category
        const currentType = booking.room.type

        // Fetch other rooms in the same property
        const candidateRooms = await prisma.room.findMany({
            where: {
                propertyId: booking.propertyId || booking.room.propertyId,
                id: { not: booking.roomId }
            },
            orderBy: { basePrice: 'asc' }
        })

        // Pick distinct room types, prioritizing higher basePrice or higher tiers
        const seenTypes = new Set<string>()
        const upgradeOptions = []

        for (const r of candidateRooms) {
            if (seenTypes.has(r.type)) continue
            seenTypes.add(r.type)

            const priceDiff = Math.max(0, r.basePrice - currentPrice)
            upgradeOptions.push({
                id: r.id,
                roomNumber: r.roomNumber,
                type: r.type,
                category: r.category,
                basePrice: r.basePrice,
                priceDifference: priceDiff,
                amenities: r.amenities || [],
                images: r.images && r.images.length > 0 ? r.images : [
                    'https://images.unsplash.com/photo-1591088398332-8a7791972843?w=500&auto=format&fit=crop&q=60'
                ],
                description: r.description || `${r.type} with luxury amenities and extra space.`,
                maxOccupancy: r.maxOccupancy || 2
            })
        }

        // If no rooms in DB yet, provide realistic mock upgrade tiers for preview/demo
        if (upgradeOptions.length === 0) {
            upgradeOptions.push(
                {
                    id: 'mock-deluxe',
                    roomNumber: '302',
                    type: 'Deluxe Suite',
                    category: 'DELUXE',
                    basePrice: currentPrice + 1200,
                    priceDifference: 1200,
                    amenities: ['King Bed', 'Balcony View', 'Jacuzzi', 'Minibar', 'Smart TV'],
                    images: ['https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=500&auto=format&fit=crop&q=60'],
                    description: 'Spacious suite with private balcony, plush king bed, and jacuzzi tub.',
                    maxOccupancy: 3
                },
                {
                    id: 'mock-presidential',
                    roomNumber: '501',
                    type: 'Presidential Penthouse',
                    category: 'PENTHOUSE',
                    basePrice: currentPrice + 3500,
                    priceDifference: 3500,
                    amenities: ['Panoramic Skyline View', 'Private Butler', 'Walk-in Closet', 'Complimentary Champagne', 'Spa Access'],
                    images: ['https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=500&auto=format&fit=crop&q=60'],
                    description: 'Ultimate luxury penthouse suite on top floor with complimentary champagne and butler service.',
                    maxOccupancy: 4
                }
            )
        }

        return NextResponse.json({
            success: true,
            currentRoom: {
                id: booking.room.id,
                roomNumber: booking.room.roomNumber,
                type: currentType,
                category: currentCategory,
                basePrice: currentPrice
            },
            availableUpgrades: upgradeOptions
        })

    } catch (error: any) {
        console.error('[ROOM_UPGRADES_GET_ERROR]', error)
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
    }
}
