import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth/middleware'

export const dynamic = 'force-dynamic'

export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const authResult = await requireAuth(req, ['SUPER_ADMIN', 'HOTEL_ADMIN'])
        if (authResult instanceof NextResponse) return authResult

        const body = await req.json()
        const { status } = body

        if (!status) {
            return NextResponse.json({ error: 'Status is required' }, { status: 400 })
        }

        const updatedPayroll = await prisma.payroll.update({
            where: { id: params.id },
            data: {
                status: status as any,
                paidAt: status === 'PAID' ? new Date() : undefined
            }
        })

        return NextResponse.json({
            success: true,
            payroll: updatedPayroll
        })

    } catch (error: any) {
        console.error('[PAYROLL_ITEM_PATCH_ERROR]', error)
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
    }
}

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const authResult = await requireAuth(req)
        if (authResult instanceof NextResponse) return authResult

        const payroll = await prisma.payroll.findUnique({
            where: { id: params.id },
            include: {
                staff: {
                    include: {
                        user: { select: { name: true, email: true } },
                        property: { select: { name: true, address: true } }
                    }
                }
            }
        })

        if (!payroll) {
            return NextResponse.json({ error: 'Payroll record not found' }, { status: 404 })
        }

        return NextResponse.json({
            success: true,
            payroll
        })

    } catch (error: any) {
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
    }
}
