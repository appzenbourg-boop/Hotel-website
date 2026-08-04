import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { prisma } from '@/lib/db'
import { unauthorized, badRequest, serverError } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

// Default meal plan templates
const DEFAULT_PLANS = [
    { type: 'EP', name: 'European Plan', description: 'Room only — no meals included', pricePerDay: 0, includesBreakfast: false, includesLunch: false, includesDinner: false, isActive: true },
    { type: 'CP', name: 'Continental Plan', description: 'Room + Breakfast included', pricePerDay: 500, includesBreakfast: true, includesLunch: false, includesDinner: false, isActive: true },
    { type: 'MAP', name: 'Modified American Plan', description: 'Room + Breakfast + Dinner included', pricePerDay: 1200, includesBreakfast: true, includesLunch: false, includesDinner: true, isActive: true },
    { type: 'AP', name: 'American Plan', description: 'Room + All 3 Meals (Breakfast, Lunch, Dinner)', pricePerDay: 1800, includesBreakfast: true, includesLunch: true, includesDinner: true, isActive: true },
]

/**
 * GET — Fetch all meal plans for a property.
 * Seeds defaults on first access.
 */
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) return unauthorized()

        const { searchParams } = new URL(req.url)
        const queryPropertyId = searchParams.get('propertyId')

        let propertyId: string | null = null
        if (session.user.role === 'SUPER_ADMIN') {
            propertyId = queryPropertyId || session.user.propertyId || null
        } else {
            propertyId = session.user.propertyId || null
        }

        if (!propertyId) return badRequest('Missing property context')

        // Fetch existing plans
        let plans = await prisma.mealPlan.findMany({
            where: { propertyId },
            orderBy: { createdAt: 'asc' },
        })

        // Seed defaults if none exist
        if (plans.length === 0) {
            await Promise.all(
                DEFAULT_PLANS.map(plan =>
                    prisma.mealPlan.create({
                        data: {
                            propertyId,
                            ...plan,
                        },
                    })
                )
            )
            plans = await prisma.mealPlan.findMany({
                where: { propertyId },
                orderBy: { createdAt: 'asc' },
            })
        }

        return NextResponse.json({ success: true, data: plans })
    } catch (error) {
        return serverError(error, 'MEAL_PLANS_GET')
    }
}

/**
 * PUT — Upsert meal plans for a property.
 * Body: { plans: [{ type, name, description, pricePerDay, includesBreakfast, includesLunch, includesDinner, isActive }] }
 */
export async function PUT(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) return unauthorized()

        const body = await req.json()
        const { plans } = body

        if (!Array.isArray(plans)) return badRequest('plans array is required')

        const { searchParams } = new URL(req.url)
        const queryPropertyId = searchParams.get('propertyId')

        let propertyId: string | null = null
        if (session.user.role === 'SUPER_ADMIN') {
            propertyId = queryPropertyId || session.user.propertyId || null
        } else {
            propertyId = session.user.propertyId || null
        }

        if (!propertyId) return badRequest('Missing property context')

        // Upsert each plan
        const results = await Promise.all(
            plans.map((plan: any) =>
                prisma.mealPlan.upsert({
                    where: {
                        propertyId_type: {
                            propertyId,
                            type: plan.type,
                        },
                    },
                    update: {
                        name: plan.name,
                        description: plan.description ?? null,
                        pricePerDay: parseFloat(plan.pricePerDay) || 0,
                        includesBreakfast: plan.includesBreakfast ?? false,
                        includesLunch: plan.includesLunch ?? false,
                        includesDinner: plan.includesDinner ?? false,
                        isActive: plan.isActive ?? true,
                    },
                    create: {
                        propertyId,
                        type: plan.type,
                        name: plan.name,
                        description: plan.description ?? null,
                        pricePerDay: parseFloat(plan.pricePerDay) || 0,
                        includesBreakfast: plan.includesBreakfast ?? false,
                        includesLunch: plan.includesLunch ?? false,
                        includesDinner: plan.includesDinner ?? false,
                        isActive: plan.isActive ?? true,
                    },
                })
            )
        )

        return NextResponse.json({ success: true, data: results })
    } catch (error) {
        return serverError(error, 'MEAL_PLANS_PUT')
    }
}
