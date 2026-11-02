/**
 * GET  /api/admin/subscription-plans  — list all plan definitions
 * POST /api/admin/subscription-plans  — super admin creates/updates a plan definition
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth/middleware'
import { badRequest, serverError } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

// Real-world plan definitions
const DEFAULT_PLANS = [
    {
        plan: 'BASE',
        displayName: 'Base',
        tagline: 'For independent properties getting started',
        description: 'Core PMS, reservations, front desk terminal. Digital check-in and check-out. Up to 30 rooms.',
        originalPrice: 15000,
        discountedPrice: 9999,
        discountPercent: 33,
        maxRooms: 30,
        maxStaff: 15,
        features: [
            'BASIC_OPS',
            'DIGITAL_CHECKIN',
            'FRONT_DESK',
            'Core PMS & Reservations',
            'Front Desk Terminal',
            'Digital Check-in & Check-out',
            'Up to 30 rooms',
        ],
    },
    {
        plan: 'STARTER',
        displayName: 'Starter',
        tagline: 'Ideal for Growth-stage hotels and boutique resorts',
        description: 'Everything in Base, plus: Staff app, housekeeping and maintenance dispatch. Marketing tools and loyalty module. Up to 75 rooms.',
        originalPrice: 30000,
        discountedPrice: 14999,
        discountPercent: 46,
        maxRooms: 75,
        maxStaff: 40,
        features: [
            'BASIC_OPS',
            'DIGITAL_CHECKIN',
            'FRONT_DESK',
            'STAFF_MANAGEMENT',
            'HOUSEKEEPING_DISPATCH',
            'MARKETING',
            'LOYALTY',
            'Staff app, housekeeping & maintenance dispatch',
            'Marketing tools & loyalty module',
            'Up to 75 rooms',
        ],
    },
    {
        plan: 'STANDARD',
        displayName: 'Standard',
        tagline: 'Full-service hotels seeking maximum performance',
        description: 'Everything in Starter, plus: IoT room controls and advanced analytics. F&B and spa integration, upsell engine. Multi-language Guest Portal. Up to 150 rooms.',
        originalPrice: 55000,
        discountedPrice: 29999,
        discountPercent: 45,
        maxRooms: 150,
        maxStaff: 100,
        features: [
            'BASIC_OPS',
            'DIGITAL_CHECKIN',
            'FRONT_DESK',
            'STAFF_MANAGEMENT',
            'HOUSEKEEPING_DISPATCH',
            'MARKETING',
            'LOYALTY',
            'IOT_CONTROLS',
            'ANALYTICS',
            'FB_SPA',
            'UPSELL_ENGINE',
            'MULTILANG_PORTAL',
            'IoT room controls & advanced analytics',
            'F&B and spa integration, upsell engine',
            'Multi-language Guest Portal',
            'Up to 150 rooms',
        ],
    },
    {
        plan: 'ENTERPRISE',
        displayName: 'Enterprise',
        tagline: 'Multi-property groups and luxury brands',
        description: 'Everything in Standard, plus: Multi-property super admin and custom integrations. Dedicated success manager, white-label Guest Portal. SLA-backed uptime, unlimited rooms.',
        originalPrice: 0,
        discountedPrice: 0,
        discountPercent: 0,
        maxRooms: 0,
        maxStaff: 0,
        features: [
            'BASIC_OPS',
            'DIGITAL_CHECKIN',
            'FRONT_DESK',
            'STAFF_MANAGEMENT',
            'HOUSEKEEPING_DISPATCH',
            'MARKETING',
            'LOYALTY',
            'IOT_CONTROLS',
            'ANALYTICS',
            'FB_SPA',
            'UPSELL_ENGINE',
            'MULTILANG_PORTAL',
            'MULTI_PROPERTY',
            'CUSTOM_INTEGRATIONS',
            'WHITE_LABEL',
            'DEDICATED_SUPPORT',
            'SLA_UPTIME',
            'Multi-property super admin & custom integrations',
            'Dedicated success manager',
            'White-label Guest Portal',
            'SLA-backed uptime, unlimited rooms',
            'Custom pricing',
        ],
    },
]

export async function GET(req: NextRequest) {
    try {
        let rawPlans: any[] = []
        try {
            if ((prisma as any).planDefinition) {
                rawPlans = await (prisma as any).planDefinition.findMany({
                    orderBy: { discountedPrice: 'asc' },
                })
                if (!rawPlans || rawPlans.length === 0) {
                    await migrateOldPlans()
                    rawPlans = await (prisma as any).planDefinition.findMany({
                        orderBy: { discountedPrice: 'asc' },
                    })
                }
            }
        } catch (dbErr) {
            console.warn('[PLANS_GET] Database lookup failed, falling back to DEFAULT_PLANS:', dbErr)
            return NextResponse.json({ success: true, data: DEFAULT_PLANS })
        }

        if (!rawPlans || rawPlans.length === 0) {
            return NextResponse.json({ success: true, data: DEFAULT_PLANS })
        }

        const plans = rawPlans.map(normalizePlan)
        return NextResponse.json({ success: true, data: plans })
    } catch (error) {
        console.error('[PLANS_GET]', error)
        return NextResponse.json({ success: true, data: DEFAULT_PLANS })
    }
}

/** Upsert all 4 plan definitions with latest data AND delete legacy plans */
async function migrateOldPlans() {
    try {
        if (!(prisma as any).planDefinition) return

        // Delete legacy plan names that no longer exist
        try {
            await (prisma as any).planDefinition.deleteMany({
                where: { plan: { in: ['GOLD', 'PLATINUM', 'DIAMOND'] } }
            })
        } catch { /* ignore if already gone */ }

        // Upsert the 4 correct plans
        for (const def of DEFAULT_PLANS) {
            try {
                await (prisma as any).planDefinition.upsert({
                    where: { plan: def.plan },
                    update: {
                        displayName:     def.displayName,
                        tagline:         def.tagline,
                        description:     def.description,
                        originalPrice:   def.originalPrice,
                        discountedPrice: def.discountedPrice,
                        discountPercent: def.discountPercent,
                        maxRooms:        def.maxRooms,
                        maxStaff:        def.maxStaff,
                        features:        def.features,
                    },
                    create: def,
                })
            } catch { /* skip individual failures */ }
        }
    } catch { /* ignore migration failures */ }
}

/** Normalize a plan record — fill nulls with safe defaults */
function normalizePlan(p: any) {
    const def = DEFAULT_PLANS.find(d => d.plan === p.plan)
    return {
        ...p,
        displayName:     p.displayName     ?? def?.displayName     ?? p.plan,
        tagline:         p.tagline         ?? def?.tagline         ?? null,
        description:     p.description     ?? def?.description     ?? null,
        originalPrice:   typeof p.originalPrice === 'number' ? p.originalPrice : (def?.originalPrice ?? 0),
        discountedPrice: typeof p.discountedPrice === 'number' ? p.discountedPrice : (p.price ?? def?.discountedPrice ?? 0),
        discountPercent: typeof p.discountPercent === 'number' ? p.discountPercent : (def?.discountPercent ?? 0),
        maxRooms:        typeof p.maxRooms === 'number' ? p.maxRooms : (def?.maxRooms ?? 30),
        maxStaff:        typeof p.maxStaff === 'number' ? p.maxStaff : (def?.maxStaff ?? 10),
        features:        Array.isArray(p.features) ? p.features : (def?.features ?? []),
    }
}

export async function POST(req: NextRequest) {
    try {
        const authResult = await requireAuth(req, ['SUPER_ADMIN', 'HOTEL_ADMIN'])
        if (authResult instanceof NextResponse) return authResult

        const body = await req.json()
        const {
            plan,
            displayName,
            tagline,
            description,
            originalPrice,
            discountedPrice,
            discountPercent,
            maxRooms,
            maxStaff,
            features,
        } = body

        if (!plan) return badRequest('plan is required')

        // Validate discount percent
        if (discountPercent !== undefined && (discountPercent < 0 || discountPercent > 100)) {
            return badRequest('discountPercent must be between 0 and 100')
        }

        const updated = await (prisma as any).planDefinition.upsert({
            where: { plan },
            update: {
                displayName: displayName ?? undefined,
                tagline: tagline ?? undefined,
                description: description ?? undefined,
                originalPrice: originalPrice !== undefined ? parseFloat(originalPrice) : undefined,
                discountedPrice: discountedPrice !== undefined ? parseFloat(discountedPrice) : undefined,
                discountPercent: discountPercent !== undefined ? parseFloat(discountPercent) : undefined,
                maxRooms: maxRooms !== undefined ? parseInt(maxRooms) : undefined,
                maxStaff: maxStaff !== undefined ? parseInt(maxStaff) : undefined,
                features: Array.isArray(features) ? features : undefined,
            },
            create: {
                plan,
                displayName: displayName ?? plan,
                tagline: tagline ?? null,
                description: description ?? null,
                originalPrice: parseFloat(originalPrice ?? 0),
                discountedPrice: parseFloat(discountedPrice ?? 0),
                discountPercent: parseFloat(discountPercent ?? 0),
                maxRooms: parseInt(maxRooms ?? 30),
                maxStaff: parseInt(maxStaff ?? 10),
                features: Array.isArray(features) ? features : [],
            },
        })

        return NextResponse.json({ success: true, data: updated })
    } catch (error) {
        return serverError(error, 'PLANS_POST')
    }
}
