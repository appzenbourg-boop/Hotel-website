import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { unauthorized, badRequest, serverError } from '@/lib/api-response'
import { redis } from '@/lib/redis'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) return unauthorized()

        const { searchParams } = new URL(req.url)
        const status = searchParams.get('status')
        const search = searchParams.get('search')?.trim()
        const queryPropertyId = searchParams.get('propertyId')
        const page = parseInt(searchParams.get('page') ?? '1')
        const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200)

        // Resolve which property to scope to
        let propertyId: string | null = null
        if (session.user.role === 'SUPER_ADMIN') {
            if (queryPropertyId && queryPropertyId !== 'ALL') propertyId = queryPropertyId
        } else {
            propertyId = session.user.propertyId ?? null
        }

        const cacheKey = `guests:${propertyId || 'ALL'}:${status || 'ALL'}:${search || 'none'}:${page}:${limit}`
        const cached = await redis.get(cacheKey)
        if (cached) {
            return NextResponse.json({ ...cached, fromCache: true })
        }

        const where: any = {}

        if (status && status !== 'ALL') where.checkInStatus = status

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search } },
            ]
        }

        if (propertyId) {
            // A guest belongs to this hotel if:
            // 1. They were directly created by this property (createdByPropertyId)
            // 2. They have at least one booking at this property
            const propertyFilter = {
                OR: [
                    { createdByPropertyId: propertyId },
                    { bookings: { some: { propertyId } } },
                ],
            }

            // Merge with existing search OR if present
            if (where.OR) {
                where.AND = [{ OR: where.OR }, propertyFilter]
                delete where.OR
            } else {
                Object.assign(where, propertyFilter)
            }
        }

        const [guests, total] = await Promise.all([
            prisma.guest.findMany({
                where,
                include: {
                    bookings: {
                        where: propertyId ? { propertyId } : {},
                        select: {
                            id: true,
                            room: { select: { roomNumber: true } },
                            status: true,
                            source: true,
                            numberOfGuests: true,
                            checkIn: true,
                            checkOut: true,
                            totalAmount: true,
                        },
                        orderBy: { checkIn: 'desc' },
                        take: 5,
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.guest.count({ where }),
        ])

        const formatted = guests.map((g) => {
            const activeBooking = g.bookings.find(
                (b) => b.status === 'CHECKED_IN' || b.status === 'RESERVED'
            ) ?? g.bookings[0]

            return {
                id: g.id,
                name: g.name,
                email: g.email,
                phone: g.phone,
                address: g.address ?? null,
                dateOfBirth: g.dateOfBirth ?? null,
                idType: g.idType ?? null,
                idNumber: g.idNumber ?? null,
                language: g.language ?? 'English',
                roomNumber: activeBooking?.room?.roomNumber ?? 'N/A',
                checkIn: activeBooking?.checkIn ?? null,
                checkOut: activeBooking?.checkOut ?? null,
                guestCount: activeBooking?.numberOfGuests ?? 1,
                idVerified: g.checkInStatus === 'VERIFIED',
                checkInStatus: g.checkInStatus,
                source: activeBooking?.source ?? 'DIRECT',
                status: activeBooking?.status ?? null,
                totalStays: g.bookings.length,
                bookings: g.bookings,
            }
        })

        const responseData = {
            success: true,
            data: formatted,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        }

        // Cache for 5 minutes
        await redis.set(cacheKey, responseData, { ex: 300 })

        return NextResponse.json(responseData)
    } catch (error) {
        return serverError(error, 'GUESTS_GET')
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) return unauthorized()

        const body = await req.json()
        const { name, email, phone, idType, idNumber, address, dateOfBirth } = body

        if (!name || !phone) return badRequest('Name and phone are required')

        // Resolve property — this is who "owns" this guest
        const propertyId = session.user.role === 'SUPER_ADMIN'
            ? (body.propertyId ?? session.user.propertyId)
            : session.user.propertyId

        const guest = await prisma.guest.upsert({
            where: { phone },
            update: {
                name,
                email: email ?? undefined,
                idType: idType ?? undefined,
                idNumber: idNumber ?? undefined,
                address: address ?? undefined,
                dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
                // Update property link if not already set
                ...(propertyId ? { createdByPropertyId: propertyId } : {}),
            },
            create: {
                name,
                email: email ?? null,
                phone,
                idType: idType ?? null,
                idNumber: idNumber ?? null,
                address: address ?? null,
                dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
                checkInStatus: 'PENDING',
                // Link to the property that created this guest
                createdByPropertyId: propertyId ?? null,
            },
        })

        // Invalidate common caches (simplified)
        await redis.del(`guests:${propertyId || 'ALL'}:*`)

        return NextResponse.json({ success: true, data: guest }, { status: 201 })
    } catch (error) {
        return serverError(error, 'GUESTS_POST')
    }
}
