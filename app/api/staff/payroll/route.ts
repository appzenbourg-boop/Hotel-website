import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse('Unauthorized', { status: 401 })

    try {
        const staff = await prisma.staff.findUnique({
            where: { userId: session.user.id }
        })

        if (!staff) return new NextResponse('Staff Profile Not Found', { status: 404 })

        const rolls = await prisma.payroll.findMany({
            where: { staffId: staff.id },
            orderBy: [{ year: 'desc' }, { month: 'desc' }]
        })

        return NextResponse.json(rolls)
    } catch (error) {
        console.error("Payroll API Error:", error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}
