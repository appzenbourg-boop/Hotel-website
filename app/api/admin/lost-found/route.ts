import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { searchParams } = new URL(request.url)
        const status   = searchParams.get('status')
        const category = searchParams.get('category')
        const query    = searchParams.get('query')
        const qPropertyId = searchParams.get('propertyId')

        // Resolve property scope
        let propertyId: string | null = null
        if (session.user.role === 'SUPER_ADMIN') {
            propertyId = qPropertyId && qPropertyId !== 'ALL' ? qPropertyId : null
        } else {
            propertyId = session.user.propertyId ?? null
        }

        const where: any = {}

        // Always scope to property unless SUPER_ADMIN in global view
        if (propertyId) where.propertyId = propertyId

        if (status && status !== 'All')    where.status   = status
        if (category && category !== 'All') where.category = category
        if (query) {
            where.OR = [
                { name:        { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } },
                { location:    { contains: query, mode: 'insensitive' } },
            ]
        }

        const items = await prisma.lostItem.findMany({
            where,
            include: {
                room: true,
                reportedBy: { include: { user: { select: { name: true } } } },
                guest: true,
                booking: true,
            },
            orderBy: { createdAt: 'desc' },
        })

        return NextResponse.json(items)
    } catch (error) {
        console.error('Error fetching lost items:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const body = await request.json()
        const { name, category, location, description, roomId, image } = body

        if (!name) {
            return NextResponse.json({ error: 'Item name is required' }, { status: 400 })
        }

        // Always use session propertyId — never trust client-supplied propertyId
        const propertyId = session.user.propertyId
        if (!propertyId) {
            return NextResponse.json({ error: 'No property associated with your account' }, { status: 400 })
        }

        let guestId = null
        let bookingId = null

        if (roomId) {
            const recentBooking = await prisma.booking.findFirst({
                where: { roomId, status: { in: ['CHECKED_IN', 'CHECKED_OUT'] } },
                orderBy: { checkOut: 'desc' },
            })
            if (recentBooking) {
                guestId = recentBooking.guestId
                bookingId = recentBooking.id
            }
        }

        const staffProfile = await prisma.staff.findUnique({
            where: { userId: session.user.id },
        })

        const item = await prisma.lostItem.create({
            data: {
                name,
                category: category || 'PERSONAL',
                location: location || '',
                description: description || '',
                status: 'FOUND',
                roomId: roomId || null,
                propertyId,
                reportedById: staffProfile?.id || null,
                guestId,
                bookingId,
                image: image || null,
            },
            include: { room: true, guest: true },
        })

        return NextResponse.json(item, { status: 201 })
    } catch (error) {
        console.error('Error creating lost item:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
