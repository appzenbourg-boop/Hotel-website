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
        const { id } = params
        
        // Find the task
        const task = await prisma.serviceRequest.findUnique({
            where: { id },
            include: {
                room: true,
                property: true,
                messages: {
                    orderBy: { createdAt: 'asc' }
                },
                assignedTo: {
                    include: { user: true }
                }
            }
        })

        if (!task) return new NextResponse('Not Found', { status: 404 })

        return NextResponse.json(task)

    } catch (error) {
        console.error('[STAFF_TASK_DETAIL_GET]', error)
        return new NextResponse('Internal Error', { status: 500 })
    }
}
