import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const guestId = searchParams.get('guestId')

        if (!guestId) {
            return NextResponse.json({ success: false, error: 'Guest ID required' }, { status: 400 })
        }

        const bookings = await prisma.booking.findMany({
            where: { guestId },
            include: {
                room: {
                    include: {
                        property: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json({ success: true, bookings })
    } catch (error) {
        console.error('[GUEST_BOOKINGS_GET]', error)
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
    }
}
