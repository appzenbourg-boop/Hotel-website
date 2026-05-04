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
            where: { userId: session.user.id },
            include: {
                leaveRequests: {
                    orderBy: { createdAt: 'desc' },
                    take: 10
                }
            }
        })

        if (!staff) return new NextResponse('Staff Profile Not Found', { status: 404 })

        return NextResponse.json({
            balances: {
                annual: staff.annualLeaveBalance,
                sick: staff.sickLeaveBalance,
                casual: staff.casualLeaveBalance
            },
            history: staff.leaveRequests
        })
    } catch (error) {
        console.error("Leave GET API Error:", error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse('Unauthorized', { status: 401 })

    try {
        const staff = await prisma.staff.findUnique({
            where: { userId: session.user.id }
        })

        if (!staff) return new NextResponse('Staff Profile Not Found', { status: 404 })

        const body = await request.json()
        const { leaveType, startDate, endDate, totalDays, reason, evidence } = body
        const newRequest = await prisma.leaveRequest.create({
            data: {
                staffId: staff.id,
                leaveType: leaveType,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                totalDays: totalDays,
                reason: reason,
                evidence: evidence,
                status: 'PENDING'
            }
        })

        return NextResponse.json(newRequest)

    } catch (error) {
        console.error("Leave POST API Error:", error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}
