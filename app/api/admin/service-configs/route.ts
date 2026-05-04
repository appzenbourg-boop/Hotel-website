import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse('Unauthorized', { status: 401 })

    try {
        const propertyId = session.user.propertyId
        if (!propertyId) return new NextResponse('Unauthorized', { status: 401 })

        const configs = await prisma.serviceConfig.findMany({
            where: { propertyId },
            include: { steps: { orderBy: { order: 'asc' } } }
        })

        return NextResponse.json(configs)
    } catch (error: any) {
        console.error('[SERVICE_CONFIG_GET_ERROR]', error?.message || error)
        return new NextResponse(error?.message || 'Internal Server Error', { status: 500 })
    }
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse('Unauthorized', { status: 401 })

    try {
        const body = await request.json()
        const { type, steps, options } = body
        const propertyId = session.user.propertyId
        if (!propertyId) return new NextResponse('Unauthorized', { status: 401 })

        // Calculate total SLA
        const totalSla = steps.reduce((acc: number, step: any) => acc + (parseInt(step.duration) || 0), 0)

        // Upsert service configuration
        const config = await prisma.serviceConfig.upsert({
            where: {
                propertyId_type: {
                    propertyId: propertyId,
                    type: type
                }
            },
            create: {
                propertyId,
                type,
                totalSla,
                options,
                steps: {
                    create: steps.map((s: any, i: number) => ({
                        name: s.name,
                        duration: parseInt(s.duration) || 0,
                        order: i
                    }))
                }
            },
            update: {
                totalSla,
                options,
                steps: {
                    deleteMany: {},
                    create: steps.map((s: any, i: number) => ({
                        name: s.name,
                        duration: parseInt(s.duration) || 0,
                        order: i
                    }))
                }
            },
            include: { steps: { orderBy: { order: 'asc' } } }
        })

        return NextResponse.json(config)
    } catch (error: any) {
        console.error('[SERVICE_CONFIG_POST_ERROR]', error?.message || error)
        return new NextResponse(error?.message || 'Internal Server Error', { status: 500 })
    }
}
