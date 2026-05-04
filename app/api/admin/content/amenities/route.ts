import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        const { searchParams } = new URL(req.url)
        let propertyId = searchParams.get('propertyId')

        // Allow mobile app (no session) to fetch content if propertyId is provided
        if (!session && (!propertyId || propertyId === 'ALL')) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN'
        
        let where: any = { isActive: true }
        if (propertyId && propertyId !== 'ALL') {
            where.propertyId = propertyId
        } else if (!isSuperAdmin && session) {
            if (!session.user.propertyId) return NextResponse.json([])
            where.propertyId = session.user.propertyId
        }

        const amenities = await prisma.amenity.findMany({ where })
        return NextResponse.json(amenities)
    } catch (error) {
        console.error('[AMENITIES_GET]', error)
        return new NextResponse('Internal Error', { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || session.user.role === 'GUEST') {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const body = await req.json()
        const { id, propertyId, name, icon, description, category, isActive, options } = body

        if (!propertyId) return new NextResponse('Missing propertyId', { status: 400 })

        if (id) {
            const updated = await prisma.amenity.update({
                where: { id },
                data: { name, icon, description, category, isActive, options }
            })
            return NextResponse.json(updated)
        } else {
            const amenity = await prisma.amenity.create({
                data: { name, icon, description, category, propertyId, isActive: isActive ?? true, options }
            })
            return NextResponse.json(amenity)
        }
    } catch (error) {
        console.error('[AMENITIES_POST]', error)
        return new NextResponse('Internal Error', { status: 500 })
    }
}

export async function PATCH(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || session.user.role === 'GUEST') {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const id = searchParams.get('id')
        if (!id) return new NextResponse('Missing id', { status: 400 })

        const body = await req.json()
        const { name, icon, description, category, isActive, options } = body

        const updated = await prisma.amenity.update({
            where: { id },
            data: {
                ...(name !== undefined && { name }),
                ...(icon !== undefined && { icon }),
                ...(description !== undefined && { description }),
                ...(category !== undefined && { category }),
                ...(isActive !== undefined && { isActive }),
                ...(options !== undefined && { options }),
            }
        })

        return NextResponse.json({ success: true, data: updated })
    } catch (error) {
        console.error('[AMENITY_PATCH]', error)
        return new NextResponse('Internal Error', { status: 500 })
    }
}

export async function DELETE(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || session.user.role === 'GUEST') return new NextResponse('Unauthorized', { status: 401 })

        const { searchParams } = new URL(req.url)
        const id = searchParams.get('id')
        if (!id) return new NextResponse('Missing id', { status: 400 })

        await prisma.amenity.delete({ where: { id } })
        return NextResponse.json({ success: true })
    } catch (error) {
        return new NextResponse('Error', { status: 500 })
    }
}
