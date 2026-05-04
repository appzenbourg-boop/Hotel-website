import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// PATCH: Update guest fields (used by Check-in Manager to update checkInStatus)
export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions)
    const allowed = ['SUPER_ADMIN', 'HOTEL_ADMIN', 'MANAGER', 'RECEPTIONIST']
    if (!session || !allowed.includes(session.user.role)) {
        return new NextResponse('Unauthorized', { status: 401 })
    }

    try {
        const body = await request.json()
        const { 
            checkInStatus, idType, idNumber, idDocumentFront, idDocumentBack,
            name, email, phone, address, dateOfBirth 
        } = body

        const guest = await prisma.guest.update({
            where: { id: params.id },
            data: {
                ...(name && { name }),
                ...(email && { email }),
                ...(phone && { phone }),
                ...(address && { address }),
                ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
                ...(checkInStatus && { checkInStatus }),
                ...(idType && { idType }),
                ...(idNumber && { idNumber }),
                ...(idDocumentFront && { idDocumentFront }),
                ...(idDocumentBack && { idDocumentBack }),
                ...(checkInStatus === 'COMPLETED' || checkInStatus === 'VERIFIED'
                    ? { checkInCompletedAt: new Date() }
                    : {}
                ),
            }
        })

        return NextResponse.json(guest)
    } catch (error) {
        console.error('[GUEST_PATCH]', error)
        return new NextResponse('Internal Error', { status: 500 })
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'HOTEL_ADMIN')) {
        return new NextResponse('Unauthorized', { status: 401 })
    }

    try {
        const activeBookings = await prisma.booking.count({
            where: {
                guestId: params.id,
                status: { in: ['RESERVED', 'CHECKED_IN'] }
            }
        })

        if (activeBookings > 0) {
            return new NextResponse('Cannot delete guest with active reservations', { status: 400 })
        }

        await prisma.guest.delete({ where: { id: params.id } })
        return new NextResponse(null, { status: 204 })
    } catch (error) {
        console.error('[GUEST_DELETE]', error)
        return new NextResponse('Internal Error', { status: 500 })
    }
}
