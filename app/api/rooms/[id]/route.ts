import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const room = await prisma.room.findUnique({
            where: { id: params.id },
            include: {
                property: true,
                bookings: {
                    where: {
                        status: { in: ['RESERVED', 'CHECKED_IN'] }
                    },
                    select: {
                        checkIn: true,
                        checkOut: true
                    }
                }
            }
        })

        if (!room) {
            return NextResponse.json({ success: false, error: 'Room not found' }, { status: 404 })
        }

        return NextResponse.json({ success: true, room })
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
    }
}
