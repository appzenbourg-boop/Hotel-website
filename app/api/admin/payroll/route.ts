import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { unauthorized, forbidden, serverError } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

const ALLOWED_ROLES = ['SUPER_ADMIN', 'HOTEL_ADMIN', 'MANAGER']

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) return unauthorized()
        if (!ALLOWED_ROLES.includes(session.user.role)) return forbidden()

        const { searchParams } = new URL(request.url)
        const queryPropertyId = searchParams.get('propertyId')
        const monthParam = searchParams.get('month') // YYYY-MM
        const page = parseInt(searchParams.get('page') ?? '1')
        const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200)

        // Resolve property filter
        let propertyFilter: any = {}
        if (session.user.role === 'SUPER_ADMIN') {
            if (queryPropertyId && queryPropertyId !== 'ALL') {
                propertyFilter = { staff: { propertyId: queryPropertyId } }
            }
        } else {
            const propertyId = session.user.propertyId
            if (!propertyId) return forbidden('No property associated with account')
            propertyFilter = { staff: { propertyId } }
        }

        // Month filter
        let dateFilter: any = {}
        if (monthParam) {
            dateFilter = { month: monthParam } // YYYY-MM string match
        }

        const where = { ...propertyFilter, ...dateFilter }

        const [payrolls, total] = await Promise.all([
            prisma.payroll.findMany({
                where,
                include: {
                    staff: {
                        include: {
                            user: {
                                select: { name: true, email: true, phone: true },
                            },
                        },
                    },
                },
                orderBy: { month: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.payroll.count({ where }),
        ])

        const totalPayout = payrolls.reduce((acc, p) => acc + p.netSalary, 0)
        const totalIncentives = payrolls.reduce((acc, p) => acc + p.incentives, 0)
        const pendingCount = payrolls.filter((p) => p.status === 'PENDING').length

        return NextResponse.json({
            success: true,
            data: {
                payrolls,
                summary: { totalPayout, totalIncentives, pendingCount },
                pagination: { page, limit, total, pages: Math.ceil(total / limit) },
            },
        })
    } catch (error) {
        return serverError(error, 'PAYROLL_GET')
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) return unauthorized()
        if (!ALLOWED_ROLES.includes(session.user.role)) return forbidden()

        const body = await request.json()
        const { staffId, month, year, baseSalary, incentives = 0, deductions = 0, notes } = body

        if (!staffId || !month || !year || baseSalary === undefined) {
            return NextResponse.json(
                { success: false, error: 'staffId, month, year and baseSalary are required' },
                { status: 400 }
            )
        }

        const netSalary = baseSalary + incentives - deductions

        const payroll = await prisma.payroll.create({
            data: {
                staffId,
                month: String(month), // YYYY-MM format
                year: parseInt(String(year)),
                baseSalary,
                incentives,
                deductions,
                netSalary,
                status: 'PENDING',
            },
            include: {
                staff: {
                    include: { user: { select: { name: true, email: true } } },
                },
            },
        })

        return NextResponse.json({ success: true, data: payroll }, { status: 201 })
    } catch (error) {
        return serverError(error, 'PAYROLL_POST')
    }
}
