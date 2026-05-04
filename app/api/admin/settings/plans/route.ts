import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth/middleware'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/settings/plans
 * Get all plan definitions (Super Admin Only)
 */
export async function GET(req: NextRequest) {
    try {
        const authResult = await requireAuth(req, ['SUPER_ADMIN', 'HOTEL_ADMIN', 'MANAGER'])
        if (authResult instanceof NextResponse) return authResult

        const plans = await (prisma as any).planDefinition.findMany({
            orderBy: { plan: 'asc' }
        })

        // Seed if none exist
        if (plans.length === 0) {
            await (prisma as any).planDefinition.createMany({
                data: [
                    { plan: 'GOLD', price: 7999, features: ['BASIC_OPS', 'STAFF_MANAGEMENT'], description: 'Essential tools for small to mid-sized hotels.' },
                    { plan: 'PLATINUM', price: 15999, features: ['BASIC_OPS', 'STAFF_MANAGEMENT', 'ADVANCED_PAYROLL', 'MARKETING_TOOLS'], description: 'Advanced operations and full staff automation.' },
                    { plan: 'DIAMOND', price: 31999, features: ['BASIC_OPS', 'STAFF_MANAGEMENT', 'ADVANCED_PAYROLL', 'MARKETING_TOOLS', 'ANALYTICS_REPORTING', 'IOT_INTEGRATION'], description: 'Full enterprise suite with IoT and multi-property oversight.' },
                ]
            })
            const newPlans = await (prisma as any).planDefinition.findMany({ orderBy: { plan: 'asc' } })
            return NextResponse.json({ success: true, plans: newPlans })
        }

        return NextResponse.json({ success: true, plans })

    } catch (error: any) {
        console.error('[PLANS_GET_ERROR]', error)
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
    }
}

/**
 * POST /api/admin/settings/plans
 * Update a plan definition (Super Admin Only)
 */
export async function POST(req: NextRequest) {
    try {
        const authResult = await requireAuth(req, ['SUPER_ADMIN'])
        if (authResult instanceof NextResponse) return authResult

        const body = await req.json()
        const { plan, features, price, description } = body

        if (!plan || !features) {
            return NextResponse.json({ error: 'Plan and features are required' }, { status: 400 })
        }

        const updatedPlan = await (prisma as any).planDefinition.upsert({
            where: { plan },
            update: { features, price, description },
            create: { plan, features, price, description }
        })

        return NextResponse.json({ success: true, plan: updatedPlan })

    } catch (error: any) {
        console.error('[PLANS_POST_ERROR]', error)
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
    }
}
