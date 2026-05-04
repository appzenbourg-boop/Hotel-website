import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const propertyId = searchParams.get('propertyId')

        if (!propertyId || propertyId === 'ALL') {
            return NextResponse.json([])
        }

        const wellness = await prisma.spaService.findMany({
            where: { propertyId }
        })

        return NextResponse.json(wellness)
    } catch (error) {
        return new NextResponse('Internal Error', { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || !['SUPER_ADMIN', 'HOTEL_ADMIN', 'MANAGER'].includes(session.user.role)) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const body = await req.json()
        const { id, propertyId, name, description, duration, price, isAvailable, image } = body

        if (!propertyId) {
            return new NextResponse('Property ID required', { status: 400 })
        }

        if (id) {
            const updated = await prisma.spaService.update({
                where: { id },
                data: { name, description, duration, price, isAvailable, image }
            })
            return NextResponse.json(updated)
        } else {
            const created = await prisma.spaService.create({
                data: { propertyId, name, description, duration, price, isAvailable, image }
            })
            return NextResponse.json(created)
        }
    } catch (error) {
        return new NextResponse('Internal Error', { status: 500 })
    }
}
