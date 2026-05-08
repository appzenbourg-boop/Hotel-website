import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth/middleware'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/custom-pricing
 * Retrieves custom pricing and portfolio expansion requests.
 */
export async function GET(req: NextRequest) {
    try {
        const authResult = await requireAuth(req, ['SUPER_ADMIN', 'HOTEL_ADMIN', 'MANAGER'])
        if (authResult instanceof NextResponse) return authResult

        const userId = authResult.user.id
        const isSuper = authResult.user.role === 'SUPER_ADMIN'

        let customRequests: any[] = []
        let addHotelRequests: any[] = []

        if (isSuper) {
            // Fetch all requests across all users for Super Admin review
            const rawCustom = await prisma.customPricingRequest.findMany({
                orderBy: { createdAt: 'desc' }
            })
            customRequests = await Promise.all(rawCustom.map(async (r) => {
                const user = await prisma.user.findUnique({
                    where: { id: r.userId },
                    select: { name: true, email: true }
                })
                return { ...r, userName: user?.name, userEmail: user?.email }
            }))

            const rawAddHotel = await prisma.addHotelRequest.findMany({
                orderBy: { createdAt: 'desc' }
            })
            addHotelRequests = await Promise.all(rawAddHotel.map(async (r) => {
                const user = await prisma.user.findUnique({
                    where: { id: r.userId },
                    select: { name: true, email: true }
                })
                return { ...r, userName: user?.name, userEmail: user?.email }
            }))
        } else {
            // Fetch only current user's requests
            customRequests = await prisma.customPricingRequest.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' }
            })
            addHotelRequests = await prisma.addHotelRequest.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' }
            })
        }

        return NextResponse.json({
            success: true,
            customRequests,
            addHotelRequests
        })

    } catch (error: any) {
        console.error('[CUSTOM_PRICING_GET_ERROR]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

/**
 * POST /api/admin/custom-pricing
 * Submits requests, provides pricing quotes, and executes the simulated "Pay First" transactions.
 */
export async function POST(req: NextRequest) {
    try {
        const authResult = await requireAuth(req, ['SUPER_ADMIN', 'HOTEL_ADMIN', 'MANAGER'])
        if (authResult instanceof NextResponse) return authResult

        const body = await req.json()
        const { action, numHotels, roomDetails, hotelName, hotelAddress, numRooms, requestId, type, customPrice } = body
        const userId = authResult.user.id

        // 1. Submit Custom Pricing Request (Hotel Owner)
        if (action === 'CREATE_CUSTOM_PRICE_REQUEST') {
            const hotels = parseInt(numHotels)
            if (isNaN(hotels) || hotels <= 0) {
                return NextResponse.json({ error: 'Please enter a valid number of hotels' }, { status: 400 })
            }

            const newReq = await prisma.customPricingRequest.create({
                data: {
                    userId,
                    numHotels: hotels,
                    roomDetails: roomDetails ?? 'Not specified',
                    status: 'PENDING'
                }
            })

            return NextResponse.json({ success: true, request: newReq })
        }

        // 2. Submit Add Hotel Request (Hotel Owner)
        if (action === 'CREATE_ADD_HOTEL_REQUEST') {
            if (!hotelName?.trim() || !hotelAddress?.trim()) {
                return NextResponse.json({ error: 'Hotel name and address are required' }, { status: 400 })
            }

            const rooms = parseInt(numRooms)
            if (isNaN(rooms) || rooms <= 0) {
                return NextResponse.json({ error: 'Please enter a valid number of rooms' }, { status: 400 })
            }

            const newReq = await prisma.addHotelRequest.create({
                data: {
                    userId,
                    hotelName,
                    hotelAddress,
                    numRooms: rooms,
                    status: 'PENDING'
                }
            })

            return NextResponse.json({ success: true, request: newReq })
        }

        // 3. Super Admin: Set custom Price quote
        if (action === 'SET_PRICE_QUOTE') {
            if (authResult.user.role !== 'SUPER_ADMIN') {
                return NextResponse.json({ error: 'Unauthorized. Super Admin only.' }, { status: 403 })
            }

            const price = parseFloat(customPrice)
            if (isNaN(price) || price < 0) {
                return NextResponse.json({ error: 'Please set a valid pricing quote' }, { status: 400 })
            }

            if (type === 'CUSTOM_PRICE') {
                await prisma.customPricingRequest.update({
                    where: { id: requestId },
                    data: {
                        status: 'PRICED',
                        customPrice: price,
                        processedAt: new Date()
                    }
                })
            } else if (type === 'ADD_HOTEL') {
                await prisma.addHotelRequest.update({
                    where: { id: requestId },
                    data: {
                        status: 'PRICED',
                        customPrice: price,
                        processedAt: new Date()
                    }
                })
            } else {
                return NextResponse.json({ error: 'Invalid request type' }, { status: 400 })
            }

            return NextResponse.json({ success: true })
        }

        // 4. Hotel Owner: Secure Pay First (Razorpay simulation to Super Admin account)
        if (action === 'PAY_FIRST') {
            if (type === 'CUSTOM_PRICE') {
                const req = await prisma.customPricingRequest.findUnique({ where: { id: requestId } })
                if (!req || req.status !== 'PRICED') {
                    return NextResponse.json({ error: 'Request not ready for payment' }, { status: 400 })
                }

                await prisma.customPricingRequest.update({
                    where: { id: requestId },
                    data: { status: 'PAID' }
                })

                // Auto-upgrade user's active subscription property to the Custom Multi-Hotel plan!
                if (authResult.user.propertyId) {
                    await prisma.property.update({
                        where: { id: authResult.user.propertyId },
                        data: {
                            plan: 'ENTERPRISE', // Upgraded to enterprise plan
                            features: ['BASIC_OPS', 'STAFF_MANAGEMENT', 'MULTI_HOTEL_MANAGEMENT', 'ADVANCED_ANALYTICS'],
                            planExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 Days activation
                        }
                    })
                }

            } else if (type === 'ADD_HOTEL') {
                const req = await prisma.addHotelRequest.findUnique({ where: { id: requestId } })
                if (!req || req.status !== 'PRICED') {
                    return NextResponse.json({ error: 'Request not ready for payment' }, { status: 400 })
                }

                await prisma.addHotelRequest.update({
                    where: { id: requestId },
                    data: { status: 'PAID' }
                })

                // Create the newly paid hotel in the MongoDB collection automatically!
                const newProperty = await prisma.property.create({
                    data: {
                        name: req.hotelName,
                        address: req.hotelAddress,
                        phone: authResult.user.phone ?? 'Not specified',
                        email: authResult.user.email ?? 'admin@hotel.com',
                        plan: 'BASE',
                        features: ['BASIC_OPS', 'STAFF_MANAGEMENT'],
                        ownerIds: [userId]
                    }
                })

                // Append this newly created property ID to the owner's `ownedPropertyIds` array so they can toggle switch it!
                await prisma.user.update({
                    where: { id: userId },
                    data: {
                        ownedPropertyIds: {
                            push: newProperty.id
                        }
                    }
                })

            } else {
                return NextResponse.json({ error: 'Invalid request type' }, { status: 400 })
            }

            return NextResponse.json({ success: true })
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

    } catch (error: any) {
        console.error('[CUSTOM_PRICING_POST_ERROR]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
