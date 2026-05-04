import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) return new NextResponse('Unauthorized', { status: 401 })

        const body = await req.json()
        const { guests } = body

        if (!Array.isArray(guests)) {
            return new NextResponse('Invalid data format', { status: 400 })
        }

        const propertyId = session.user.role === 'SUPER_ADMIN'
            ? (body.propertyId ?? session.user.propertyId)
            : session.user.propertyId

        const results = await prisma.$transaction(
            guests.map((g: any) =>
                prisma.guest.upsert({
                    where: { phone: g.phone },
                    update: {
                        name: g.name,
                        email: g.email || undefined,
                        checkInStatus: 'PENDING',
                        ...(propertyId ? { createdByPropertyId: propertyId } : {}),
                    },
                    create: {
                        name: g.name,
                        phone: g.phone,
                        email: g.email || undefined,
                        checkInStatus: 'PENDING',
                        createdByPropertyId: propertyId ?? null,
                    }
                })
            )
        )

        return NextResponse.json({
            success: true,
            count: results.length
        })
    } catch (error) {
        console.error('[GUESTS_BULK_POST]', error)
        return new NextResponse('Internal Error', { status: 500 })
    }
}
