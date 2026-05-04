import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { prisma } from '@/lib/db'
import { performAutoAssignment } from '@/lib/service-utils'
import { unauthorized, badRequest, notFound, serverError } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return unauthorized()

    try {
        const { searchParams } = new URL(request.url)
        const queryPropertyId = searchParams.get('propertyId')
        const statusFilter = searchParams.get('status')
        const typeFilter = searchParams.get('type')
        const page = parseInt(searchParams.get('page') ?? '1')
        const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200)

        let propertyId: string | null = null
        if (session.user.role === 'SUPER_ADMIN') {
            if (queryPropertyId && queryPropertyId !== 'ALL') propertyId = queryPropertyId
        } else {
            propertyId = session.user.propertyId ?? null
        }

        // Trigger auto-assignment for unassigned requests (5s threshold to avoid re-assigning fresh ones)
        if (propertyId) {
            performAutoAssignment(propertyId, 5).catch(() => {})
        }

        const where: any = {}

        if (statusFilter && statusFilter !== 'ALL') {
            where.status = statusFilter
        } else {
            where.status = { not: 'COMPLETED' }
        }

        if (typeFilter && typeFilter !== 'ALL') where.type = typeFilter
        if (propertyId) where.propertyId = propertyId

        // Staff only see their assigned tasks
        if (session.user.role === 'STAFF') {
            const staff = await prisma.staff.findUnique({
                where: { userId: session.user.id },
                select: { id: true },
            })
            if (staff) where.assignedToId = staff.id
        }

        const [services, total] = await Promise.all([
            prisma.serviceRequest.findMany({
                where,
                include: {
                    room: { select: { roomNumber: true } },
                    guest: { select: { name: true, phone: true } },
                    assignedTo: {
                        select: {
                            id: true,
                            profilePhoto: true,
                            user: { select: { name: true } },
                        },
                    },
                },
                orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.serviceRequest.count({ where }),
        ])

        const formatted = services.map((s) => ({
            id: s.id,
            room: s.room?.roomNumber ?? 'N/A',
            guest: s.guest?.name ?? 'Unknown',
            type: s.type,
            title: s.title,
            description: s.description,
            priority: s.priority,
            status: s.status,
            assignedTo: s.assignedTo
                ? { id: s.assignedTo.id, name: s.assignedTo.user?.name ?? 'Unknown', photo: s.assignedTo.profilePhoto }
                : null,
            requestTime: s.createdAt,
            acceptedAt: s.acceptedAt,
            slaLimit: s.slaMinutes,
        }))

        return NextResponse.json({
            success: true,
            data: formatted,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        })
    } catch (error) {
        return serverError(error, 'SERVICES_GET')
    }
}

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return unauthorized()

    try {
        const body = await request.json()
        const { roomId, type, title, description, priority = 'NORMAL' } = body

        if (!roomId) return badRequest('roomId is required')
        if (!title) return badRequest('title is required')

        const room = await prisma.room.findUnique({
            where: { id: roomId },
            include: {
                bookings: { where: { status: 'CHECKED_IN' }, take: 1 },
            },
        })
        if (!room) return notFound('Room')

        const propertyId = session.user.propertyId ?? room.propertyId
        if (!propertyId) return badRequest('Cannot determine property')

        const guestId = room.bookings[0]?.guestId ?? null

        // Fetch custom SLA config
        const customConfig = await prisma.serviceConfig.findUnique({
            where: { propertyId_type: { propertyId, type: type as any } },
        })
        const slaMinutes = customConfig?.totalSla ?? (type === 'MAINTENANCE' ? 60 : 30)

        const serviceRequest = await prisma.serviceRequest.create({
            data: {
                propertyId,
                roomId,
                guestId,
                type,
                title,
                description: description ?? null,
                status: 'PENDING',
                priority,
                slaMinutes,
                assignedToId: null,
            },
        })

        // Trigger auto-assignment asynchronously
        performAutoAssignment(propertyId, 0).catch(() => {})

        return NextResponse.json({ success: true, data: serviceRequest }, { status: 201 })
    } catch (error) {
        return serverError(error, 'SERVICES_POST')
    }
}
