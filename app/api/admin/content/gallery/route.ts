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

        const property = await prisma.property.findUnique({
            where: { id: propertyId },
            select: { images: true }
        })

        return NextResponse.json(property?.images || [])
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
        const { propertyId, images } = body

        if (!propertyId) {
            return new NextResponse('Property ID required', { status: 400 })
        }

        const updated = await prisma.property.update({
            where: { id: propertyId },
            data: { images }
        })

        return NextResponse.json(updated.images)
    } catch (error) {
        return new NextResponse('Internal Error', { status: 500 })
    }
}
