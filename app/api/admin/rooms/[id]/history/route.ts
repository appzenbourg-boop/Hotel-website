import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const roomId = params.id

        const bookings = await prisma.booking.findMany({
            where: {
                roomId,
                status: { in: ['CHECKED_IN', 'CHECKED_OUT'] }
            },
            include: {
                guest: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        email: true
                    }
                }
            },
            orderBy: { checkOut: 'desc' },
            take: 5
        })

        return NextResponse.json(bookings)
    } catch (error) {
        console.error('Error fetching room guest history:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
