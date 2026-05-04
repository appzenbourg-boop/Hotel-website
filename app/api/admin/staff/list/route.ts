import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'HOTEL_ADMIN')) {
        return new NextResponse('Unauthorized', { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const department = searchParams.get('department')

    try {
        const staff = await prisma.staff.findMany({
            where: department ? { department: department as any } : {},
            include: {
                user: {
                    select: {
                        name: true,
                        email: true,
                        status: true
                    }
                }
            }
        })

        return NextResponse.json(staff.map(s => ({
            id: s.id,
            name: s.user.name,
            department: s.department,
            status: s.user.status,
            active: true // Could check attendance here
        })))
    } catch (error) {
        return new NextResponse('Internal Error', { status: 500 })
    }
}
