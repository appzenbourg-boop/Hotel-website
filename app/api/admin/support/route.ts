/**
 * GET  /api/admin/support  — list all support tickets for this property
 * PATCH /api/admin/support  — update ticket status
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { prisma } from '@/lib/db'
import { unauthorized, forbidden, badRequest, serverError } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return unauthorized()
    if (!['SUPER_ADMIN', 'HOTEL_ADMIN', 'MANAGER', 'RECEPTIONIST'].includes(session.user.role)) return forbidden()

    const { searchParams } = new URL(req.url)
    const queryPropertyId = searchParams.get('propertyId')
    const status = searchParams.get('status')

    let propertyId: string | null = null
    if (session.user.role === 'SUPER_ADMIN') {
        if (queryPropertyId && queryPropertyId !== 'ALL') propertyId = queryPropertyId
    } else {
        propertyId = session.user.propertyId ?? null
    }

    const where: any = {}
    if (propertyId) where.propertyId = propertyId
    if (status && status !== 'ALL') where.status = status

    try {
        const tickets = await prisma.supportTicket.findMany({
            where,
            include: {
                guest: { select: { id: true, name: true, email: true, phone: true } },
                property: { select: { name: true } },
                messages: {
                    orderBy: { createdAt: 'asc' },
                },
            },
            orderBy: { createdAt: 'desc' },
        })

        return NextResponse.json({ success: true, tickets })
    } catch (error) {
        return serverError(error, 'ADMIN_SUPPORT_GET')
    }
}

export async function PATCH(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return unauthorized()
    if (!['SUPER_ADMIN', 'HOTEL_ADMIN', 'MANAGER', 'RECEPTIONIST'].includes(session.user.role)) return forbidden()

    try {
        const body = await req.json()
        const { ticketId, status } = body

        if (!ticketId) return badRequest('ticketId is required')

        const updated = await prisma.supportTicket.update({
            where: { id: ticketId },
            data: { status: status as any },
            include: {
                guest: { select: { id: true, name: true, email: true, phone: true } },
                messages: { orderBy: { createdAt: 'asc' } },
            },
        })

        return NextResponse.json({ success: true, ticket: updated })
    } catch (error) {
        return serverError(error, 'ADMIN_SUPPORT_PATCH')
    }
}
