import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth/middleware'
import { startOfMonth, endOfMonth, format } from 'date-fns'

export const dynamic = 'force-dynamic'

/**
 * GET /api/payroll
 * List payroll records (Super Admin only for all, Staff for own)
 */
export async function GET(req: NextRequest) {
    try {
        const authResult = await requireAuth(req)
        if (authResult instanceof NextResponse) return authResult

        const { searchParams } = new URL(req.url)
        const id = searchParams.get('id')
        const month = searchParams.get('month')
        const year = searchParams.get('year')
        const staffId = searchParams.get('staffId')
        const queryPropertyId = searchParams.get('propertyId')

        const where: any = {}
        if (id) where.id = id

        if (month) {
            // If month is a number (e.g. "03"), convert to name (e.g. "March")
            if (!isNaN(parseInt(month))) {
                const date = new Date(parseInt(year || "2024"), parseInt(month) - 1, 1);
                where.month = format(date, 'MMMM');
            } else {
                where.month = month;
            }
        }

        if (year) where.year = parseInt(year)

        // RBAC: ALLOW SUPER_ADMIN, HOTEL_ADMIN, MANAGER, OR ANYONE in ACCOUNTS department
        const isAuthorized = ['SUPER_ADMIN', 'HOTEL_ADMIN', 'MANAGER'].includes(authResult.user.role) || authResult.user.department === 'ACCOUNTS'

        if (authResult.user.role === 'STAFF' && authResult.user.department !== 'ACCOUNTS') {
            const staff = await prisma.staff.findUnique({ where: { userId: authResult.user.id } })
            if (!staff) return NextResponse.json({ error: 'Staff not found' }, { status: 404 })
            where.staffId = staff.id
        } else if (isAuthorized) {
            if (staffId) {
                where.staffId = staffId
            } else {
                // Property-based filtering
                let targetPropertyId = authResult.user.propertyId
                if (authResult.user.role === 'SUPER_ADMIN') {
                    targetPropertyId = (queryPropertyId && queryPropertyId !== 'ALL') ? queryPropertyId : null
                }

                if (targetPropertyId) {
                    where.staff = { propertyId: targetPropertyId }
                }
            }
        } else {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const payrolls = await prisma.payroll.findMany({
            where,
            include: {
                staff: {
                    include: {
                        user: { select: { name: true, email: true, phone: true } }
                    }
                }
            },
            orderBy: {
                year: 'desc'
            }
        })

        // Calculate Stats
        const stats = {
            totalPayroll: payrolls.reduce((sum, p) => sum + p.netSalary, 0),
            paidCount: payrolls.filter(p => p.status === 'PAID').length,
            pendingCount: payrolls.filter(p => p.status === 'PENDING').length,
        }

        return NextResponse.json({
            success: true,
            count: payrolls.length,
            payroll: payrolls.map(p => ({
                ...p,
                staff: {
                    ...p.staff,
                    name: p.staff.user?.name,
                    email: p.staff.user?.email,
                    phone: p.staff.user?.phone
                }
            })),
            stats
        })

    } catch (error: any) {
        console.error('[PAYROLL_GET_ERROR]', error)
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
    }
}

/**
 * POST /api/payroll/calculate (using /api/payroll with a calculate action)
 * Calculate payroll for all staff for a given month
 */
export async function POST(req: NextRequest) {
    try {
        const authResult = await requireAuth(req)
        if (authResult instanceof NextResponse) return authResult

        // Custom check for POST: Role or Department
        const isAuthorizedForPayroll = ['SUPER_ADMIN', 'HOTEL_ADMIN', 'MANAGER'].includes(authResult.user.role) || authResult.user.department === 'ACCOUNTS'
        if (!isAuthorizedForPayroll) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const body = await req.json()
        const { month, year } = body // Expecting numbers: e.g. month: 2, year: 2026

        if (!month || !year) {
            return NextResponse.json({ error: 'Month and Year are required' }, { status: 400 })
        }

        const calculationDate = new Date(year, month - 1, 1)
        const monthStr = format(calculationDate, 'MMMM')

        // 1. Check if ANY payroll for this month has already been PAID
        const disbursedCheck = await prisma.payroll.findFirst({
            where: {
                month: monthStr,
                year: parseInt(year),
                status: 'PAID',
                staff: authResult.user.role !== 'SUPER_ADMIN' ? { propertyId: authResult.user.propertyId } : undefined
            }
        })

        if (disbursedCheck) {
            return NextResponse.json({ 
                error: 'Payroll cannot be recalculated once payments have been disbursed for this cycle. Re-running is blocked to maintain financial integrity.' 
            }, { status: 400 })
        }

        // Get staff belonging to the current hotel context
        let staffFilter: any = {}
        if (authResult.user.role !== 'SUPER_ADMIN') {
            staffFilter = { propertyId: authResult.user.propertyId }
        }

        const staffList = await prisma.staff.findMany({
            where: staffFilter,
            include: { user: true }
        })
        const results = []

        for (const staff of staffList) {
            // Get attendance for the month
            const attendance = await prisma.attendance.findMany({
                where: {
                    staffId: staff.id,
                    date: {
                        gte: startOfMonth(calculationDate),
                        lte: endOfMonth(calculationDate)
                    }
                }
            })

            const totalOvertimeHours = attendance.reduce((sum, a) => sum + (a.overtimeHours || 0), 0)
            const hourlyRate = staff.baseSalary / 160 // Assume 160h work month
            const overtimePay = totalOvertimeHours * hourlyRate * 1.5 // 1.5x hourly rate

            // Fetch Financial Adjustments
            const adjustments = await prisma.staffFinancialAdjustment.findMany({
                where: {
                    staffId: staff.id,
                    month: monthStr,
                    year: parseInt(year)
                }
            })

            const incentives = adjustments.filter(a => a.type === 'INCENTIVE').reduce((s, a) => s + a.amount, 0)
            const bonuses = adjustments.filter(a => a.type === 'BONUS').reduce((s, a) => s + a.amount, 0)
            const allowances = adjustments.filter(a => a.type === 'ALLOWANCE').reduce((s, a) => s + a.amount, 0)
            const deductions = adjustments.filter(a => a.type === 'DEDUCTION').reduce((s, a) => s + a.amount, 0)

            const totalAdjustments = incentives + bonuses + allowances - deductions
            const netSalary = staff.baseSalary + overtimePay + totalAdjustments

            const payroll = await prisma.payroll.upsert({
                where: {
                    staffId_month_year: {
                        staffId: staff.id,
                        month: monthStr,
                        year: parseInt(year)
                    }
                },
                update: {
                    baseSalary: staff.baseSalary,
                    overtimePay,
                    incentives: incentives + allowances, // Grouping allowances into incentives for simplicity in main model
                    bonuses,
                    deductions,
                    netSalary,
                    status: 'PENDING'
                },
                create: {
                    staffId: staff.id,
                    month: monthStr,
                    year: parseInt(year),
                    baseSalary: staff.baseSalary,
                    overtimePay,
                    incentives: incentives + allowances,
                    bonuses,
                    deductions,
                    netSalary,
                    status: 'PENDING'
                }
            })
            results.push(payroll)
        }

        return NextResponse.json({
            success: true,
            count: results.length,
            message: `Payroll calculated for ${results.length} staff members for ${monthStr} ${year}`
        })

    } catch (error: any) {
        console.error('[PAYROLL_CALC_ERROR]', error)
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
    }
}

/**
 * PATCH /api/payroll
 * Update payroll status (e.g., mark as PAID)
 */
export async function PATCH(req: NextRequest) {
    try {
        const authResult = await requireAuth(req)
        if (authResult instanceof NextResponse) return authResult

        // Custom check for PATCH: Role or Department
        const isAuthorizedForPayrollOps = ['SUPER_ADMIN', 'HOTEL_ADMIN', 'MANAGER'].includes(authResult.user.role) || authResult.user.department === 'ACCOUNTS'
        if (!isAuthorizedForPayrollOps) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const body = await req.json()
        const { id, status } = body

        if (!id || !status) {
            return NextResponse.json({ error: 'ID and Status are required' }, { status: 400 })
        }

        const updatedPayroll = await prisma.payroll.update({
            where: { id },
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
        console.error('[PAYROLL_PATCH_ERROR]', error)
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
    }
}
