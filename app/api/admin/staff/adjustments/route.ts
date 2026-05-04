import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { unauthorized, forbidden, badRequest, serverError } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/staff/adjustments
 * List financial adjustments for staff
 */
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return unauthorized()
    if (!['SUPER_ADMIN', 'HOTEL_ADMIN', 'MANAGER'].includes(session.user.role) && session.user.department !== 'ACCOUNTS') {
        return forbidden()
    }

    try {
        const { searchParams } = new URL(req.url)
        const staffId = searchParams.get('staffId')
        const month = searchParams.get('month')
        const year = searchParams.get('year')
        const queryPropertyId = searchParams.get('propertyId')

        let propertyId: string | null = null
        if (session.user.role === 'SUPER_ADMIN') {
            if (queryPropertyId && queryPropertyId !== 'ALL') propertyId = queryPropertyId
        } else {
            propertyId = session.user.propertyId ?? null
        }

        const where: any = {}
        if (staffId) where.staffId = staffId
        if (month) where.month = month
        if (year) where.year = parseInt(year)
        
        if (propertyId) {
            where.staff = { propertyId }
        }

        const adjustments = await prisma.staffFinancialAdjustment.findMany({
            where,
            include: {
                staff: {
                    include: {
                        user: { select: { name: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json({ success: true, data: adjustments })
    } catch (error) {
        return serverError(error, 'STAFF_ADJUSTMENTS_GET')
    }
}

/**
 * POST /api/admin/staff/adjustments
 * Create a new financial adjustment
 */
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return unauthorized()
    if (!['SUPER_ADMIN', 'HOTEL_ADMIN', 'MANAGER'].includes(session.user.role) && session.user.department !== 'ACCOUNTS') {
        return forbidden()
    }

    try {
        const body = await req.json()
        const { staffId, type, amount, reason, month, year } = body

        if (!staffId || !type || !amount || !month || !year) {
            return badRequest('Missing required fields')
        }

        const adjustment = await prisma.staffFinancialAdjustment.create({
            data: {
                staffId,
                type,
                amount: parseFloat(amount),
                reason,
                month,
                year: parseInt(year)
            }
        })

        return NextResponse.json({ success: true, data: adjustment }, { status: 201 })
    } catch (error) {
        return serverError(error, 'STAFF_ADJUSTMENTS_POST')
    }
}

/**
 * DELETE /api/admin/staff/adjustments
 * Delete a financial adjustment
 */
export async function DELETE(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return unauthorized()
    
    try {
        const { searchParams } = new URL(req.url)
        const id = searchParams.get('id')
        if (!id) return badRequest('ID required')

        await prisma.staffFinancialAdjustment.delete({
            where: { id }
        })

        return NextResponse.json({ success: true, message: 'Adjustment deleted' })
    } catch (error) {
        return serverError(error, 'STAFF_ADJUSTMENTS_DELETE')
    }
}
