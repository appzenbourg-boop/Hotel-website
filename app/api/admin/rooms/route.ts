import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { prisma } from '@/lib/db'
import { unauthorized, forbidden, badRequest, conflict, serverError } from '@/lib/api-response'
import { redis } from '@/lib/redis'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return unauthorized()

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const queryPropertyId = searchParams.get('propertyId')
    const start = searchParams.get('start')
    const end = searchParams.get('end')
    const roomType = searchParams.get('type')
    const page = parseInt(searchParams.get('page') ?? '1')
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '100'), 500)

    const where: any = {}

    if (session.user.role === 'SUPER_ADMIN') {
        if (queryPropertyId && queryPropertyId !== 'ALL') where.propertyId = queryPropertyId
    } else {
        // Dynamically fetch live user details to support real-time property creation and switching
        const dbUser = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { workplaceId: true, ownedPropertyIds: true }
        })
        
        let propertyId = session.user.propertyId
        if (dbUser) {
            if (queryPropertyId && dbUser.ownedPropertyIds.includes(queryPropertyId)) {
                propertyId = queryPropertyId
            } else if (dbUser.workplaceId) {
                propertyId = dbUser.workplaceId
            } else if (dbUser.ownedPropertyIds.length > 0) {
                propertyId = dbUser.ownedPropertyIds[0]
            }
        }
        if (propertyId) where.propertyId = propertyId
    }

    if (status && status !== 'ALL') where.status = status
    if (roomType && roomType !== 'ALL') where.type = roomType

    const propertyKey = where.propertyId || 'ALL'
    const cacheKey = `rooms:${propertyKey}:${status || 'ALL'}:${roomType || 'ALL'}:${start || 'none'}:${end || 'none'}:${page}`
    
    try {
        const cached = await redis.get(cacheKey)
        if (cached) {
            return NextResponse.json({ ...cached, fromCache: true })
        }
        const rooms = await prisma.room.findMany({
            where,
            include: {
                bookings: {
                    where: {
                        status: { in: ['CHECKED_IN', 'RESERVED'] },
                        ...(start && end
                            ? { checkIn: { lte: new Date(end) }, checkOut: { gte: new Date(start) } }
                            : {}),
                    },
                    select: {
                        id: true,
                        status: true,
                        checkIn: true,
                        checkOut: true,
                        guest: { select: { name: true, phone: true } },
                    },
                },
            },
            orderBy: { roomNumber: 'asc' },
            skip: (page - 1) * limit,
            take: limit,
        })

        // For availability queries, filter out rooms with overlapping bookings
        let result = rooms
        if (start && end && status === 'AVAILABLE') {
            result = rooms.filter((r) => r.bookings.length === 0 && r.status !== 'MAINTENANCE')
        }

        const responseData = { success: true, data: result }
        
        // Cache for 5 minutes
        await redis.set(cacheKey, responseData, { ex: 300 })

        return NextResponse.json(responseData)
    } catch (error) {
        return serverError(error, 'ROOMS_GET')
    }
}

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return unauthorized()
    if (!['SUPER_ADMIN', 'HOTEL_ADMIN', 'MANAGER'].includes(session.user.role)) return forbidden()

    try {
        const body = await request.json()
        const { roomNumber, floor, category, type, basePrice, maxOccupancy, propertyId: bodyPropertyId, images, description } = body
        console.log(`[ADMIN_ROOMS] Creating new room "${roomNumber}". Description included: "${description || 'NULL'}"`)

        if (!roomNumber || !category || !type || basePrice === undefined) {
            return badRequest('roomNumber, category, type and basePrice are required')
        }

        let propertyId = session.user.propertyId
        if (session.user.role === 'SUPER_ADMIN' && bodyPropertyId) propertyId = bodyPropertyId
        if (!propertyId) return badRequest('No property associated with account')

        const room = await prisma.room.create({
            data: {
                propertyId,
                roomNumber,
                floor: parseInt(floor) || 1,
                category,
                type,
                basePrice: parseFloat(String(basePrice)),
                maxOccupancy: parseInt(String(maxOccupancy)) || 2,
                description: description || null,
                status: 'AVAILABLE',
                images: images ?? [],
            },
        })

        // Invalidate common caches
        try {
            const keys = await redis.keys(`rooms:${propertyId}:*`)
            if (keys && keys.length > 0) {
                await redis.del(...keys)
            }
        } catch (err) {
            console.error('Failed to invalidate rooms cache:', err)
        }

        return NextResponse.json({ success: true, data: room }, { status: 201 })
    } catch (error: any) {
        if (error?.code === 'P2002') return conflict('Room number already exists in this property')
        return serverError(error, 'ROOMS_POST')
    }
}
