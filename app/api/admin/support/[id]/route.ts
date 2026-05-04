/**
 * POST /api/admin/support/[id]  — send a message on a ticket (admin reply)
 * PATCH /api/admin/support/[id] — update ticket status
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { prisma } from '@/lib/db'
import { unauthorized, forbidden, badRequest, serverError } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions)
    if (!session) return unauthorized()
    if (!['SUPER_ADMIN', 'HOTEL_ADMIN', 'MANAGER', 'RECEPTIONIST'].includes(session.user.role)) return forbidden()

    try {
        const { content } = await req.json()
        if (!content?.trim()) return badRequest('Message content is required')

        const message = await prisma.ticketMessage.create({
            data: {
                ticketId: params.id,
                senderId: session.user.id,
                senderRole: 'ADMIN',
                content: content.trim(),
            },
        })

        // Auto-set ticket to IN_PROGRESS when admin replies
        await prisma.supportTicket.update({
            where: { id: params.id },
            data: { status: 'IN_PROGRESS' },
        })

        return NextResponse.json({ success: true, message })
    } catch (error) {
        return serverError(error, 'ADMIN_SUPPORT_MESSAGE')
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions)
    if (!session) return unauthorized()
    if (!['SUPER_ADMIN', 'HOTEL_ADMIN', 'MANAGER', 'RECEPTIONIST'].includes(session.user.role)) return forbidden()

    try {
        const { status } = await req.json()
        if (!status) return badRequest('status is required')

        const updated = await prisma.supportTicket.update({
            where: { id: params.id },
            data: { status: status as any },
            include: {
                guest: { select: { id: true, name: true, email: true, phone: true } },
                messages: { orderBy: { createdAt: 'asc' } },
            },
        })

        return NextResponse.json({ success: true, ticket: updated })
    } catch (error) {
        return serverError(error, 'ADMIN_SUPPORT_STATUS')
    }
}
