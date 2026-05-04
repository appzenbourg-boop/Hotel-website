import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

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

        const services = await prisma.dashboardService.findMany({ 
            where,
            orderBy: { order: 'asc' }
        })
        
        return NextResponse.json(services)
    } catch (error) {
        console.error('[DASHBOARD_SERVICES_GET]', error)
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
        const { name, iconUrl, iconName, route, propertyId, isActive, order, options } = body

        if (!propertyId) return new NextResponse('Missing propertyId', { status: 400 })

        const service = await prisma.dashboardService.create({
            data: { 
                name, 
                iconUrl, 
                iconName, 
                route, 
                propertyId, 
                isActive: isActive ?? true,
                order: order ?? 0,
                options: options || []
            }
        })

        return NextResponse.json(service)
    } catch (error) {
        console.error('[DASHBOARD_SERVICE_POST]', error)
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
        const { name, iconUrl, iconName, route, isActive, order, options } = body

        const updated = await prisma.dashboardService.update({
            where: { id },
            data: {
                ...(name !== undefined && { name }),
                ...(iconUrl !== undefined && { iconUrl }),
                ...(iconName !== undefined && { iconName }),
                ...(route !== undefined && { route }),
                ...(isActive !== undefined && { isActive }),
                ...(order !== undefined && { order }),
                ...(options !== undefined && { options }),
            }
        })

        return NextResponse.json({ success: true, data: updated })
    } catch (error) {
        console.error('[DASHBOARD_SERVICE_PATCH]', error)
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

        await prisma.dashboardService.delete({ where: { id } })
        return NextResponse.json({ success: true })
    } catch (error) {
        return new NextResponse('Error', { status: 500 })
    }
}
