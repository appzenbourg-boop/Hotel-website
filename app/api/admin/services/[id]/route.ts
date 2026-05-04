import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse('Unauthorized', { status: 401 })

    try {
        const service = await prisma.serviceRequest.findUnique({
            where: { id: params.id },
            include: {
                room: {
                    select: {
                        roomNumber: true,
                        floor: true
                    }
                },
                guest: {
                    include: {
                        bookings: {
                            where: { status: 'CHECKED_IN' },
                            take: 1
                        }
                    }
                },
                assignedTo: {
                    include: {
                        user: { 
                            select: { 
                                name: true, 
                                role: true,
                                email: true,
                                phone: true
                            } 
                        }
                    }
                },
                property: true,
                messages: {
                    orderBy: { createdAt: 'asc' }
                }
            }
        })

        if (!service) return new NextResponse('Not Found', { status: 404 })

        return NextResponse.json(service)
    } catch (error) {
        console.error('[SERVICE_DETAIL_GET]', error)
        return new NextResponse('Internal Error', { status: 500 })
    }
}
export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse('Unauthorized', { status: 401 })

    try {
        const body = await request.json()
        const updated = await prisma.serviceRequest.update({
            where: { id: params.id },
            data: body
        })

        return NextResponse.json(updated)
    } catch (error) {
        console.error('[SERVICE_DETAIL_PATCH]', error)
        return new NextResponse('Internal Error', { status: 500 })
    }
}
