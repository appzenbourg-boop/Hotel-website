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
            return NextResponse.json(null)
        }

        const property = await prisma.property.findUnique({
            where: { id: propertyId },
            select: {
                id: true,
                name: true,
                description: true,
                address: true,
                phone: true,
                email: true,
                logo: true,
                coverImage: true,
                checkInTime: true,
                checkOutTime: true
            }
        })

        return NextResponse.json(property)
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
        const { propertyId, name, description, address, phone, email, checkInTime, checkOutTime } = body

        if (!propertyId) {
            return new NextResponse('Property ID required', { status: 400 })
        }

        const updated = await prisma.property.update({
            where: { id: propertyId },
            data: {
                name,
                description,
                address,
                phone,
                email,
                checkInTime,
                checkOutTime
            }
        })

        return NextResponse.json(updated)
    } catch (error) {
        console.error('[GENERAL_CONTENT_POST]', error)
        return new NextResponse('Internal Error', { status: 500 })
    }
}
