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
            'Core PMS & Reservations',
            'Front Desk Terminal',
            'Digital Check-in & Check-out',
            'Room Status Management',
            'Guest Profiles',
            'Basic Reporting',
        ],
    },
    {
        plan: 'STARTER',
        displayName: 'Starter',
        tagline: 'Ideal for growth-stage hotels and boutique resorts',
        description: 'Everything in Base, plus staff app, housekeeping & maintenance dispatch, marketing tools and loyalty module. Up to 75 rooms.',
        originalPrice: 30000,
        discountedPrice: 15999,
        discountPercent: 47,
        maxRooms: 75,
        maxStaff: 40,
        features: [
            'Everything in Base',
            'Staff App & Management',
            'Housekeeping & Maintenance Dispatch',
            'Marketing Tools',
            'Loyalty Module',
            'Attendance & Payroll',
            'Leave Management',
            'Advanced Reports',
        ],
    },
    {
        plan: 'STANDARD',
        displayName: 'Standard',
        tagline: 'Full-service hotels seeking maximum performance',
        description: 'Everything in Starter, plus IoT room controls, advanced analytics, F&B and spa integration, upsell engine, multi-language Guest Portal. Up to 150 rooms.',
        originalPrice: 55000,
        discountedPrice: 29999,
        discountPercent: 45,
        maxRooms: 150,
        maxStaff: 100,
        features: [
            'Everything in Starter',
            'IoT Room Controls',
            'Advanced Analytics',
            'F&B and Spa Integration',
            'Upsell Engine',
            'Multi-language Guest Portal',
            'Channel Manager (OTA Sync)',
            'Revenue Management',
        ],
    },
    {
        plan: 'ENTERPRISE',
        displayName: 'Enterprise',
        tagline: 'Multi-property groups and luxury brands',
        description: 'Everything in Standard, plus multi-property super admin, custom integrations, dedicated success manager, white-label Guest Portal, SLA-backed uptime. Unlimited rooms.',
        originalPrice: 0,
        discountedPrice: 0,
        discountPercent: 0,
        maxRooms: 0,
        maxStaff: 0,
        features: [
            'Everything in Standard',
            'Multi-property Super Admin',
            'Custom Integrations',
            'Dedicated Success Manager',
            'White-label Guest Portal',
            'SLA-backed Uptime',
            'Unlimited Rooms & Staff',
            'Priority 24/7 Support',
        ],
    },
]

export async function GET(req: NextRequest) {
    try {
        // Always migrate first to ensure DB has latest plan definitions
        await migrateOldPlans()

        const rawPlans = await (prisma as any).planDefinition.findMany({
            orderBy: { discountedPrice: 'asc' },
        })

        // If still empty after migration, something is wrong
        if (rawPlans.length === 0) {
            return NextResponse.json({ success: true, data: DEFAULT_PLANS })
        }

        const plans = rawPlans.map(normalizePlan)
        return NextResponse.json({ success: true, data: plans })
    } catch (error) {
        // If DB read fails entirely, return hardcoded defaults so UI never breaks
        console.error('[PLANS_GET]', error)
        return NextResponse.json({ success: true, data: DEFAULT_PLANS })
    }
}

/** Upsert all 4 plan definitions with latest data AND delete legacy plans */
async function migrateOldPlans() {
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
}

/** Normalize a plan record — fill nulls with safe defaults */
function normalizePlan(p: any) {
    const def = DEFAULT_PLANS.find(d => d.plan === p.plan)
    return {
        ...p,
        displayName:     p.displayName     ?? def?.displayName     ?? p.plan,
        tagline:         p.tagline         ?? def?.tagline         ?? null,
        description:     p.description     ?? def?.description     ?? null,
        originalPrice:   p.originalPrice   ?? def?.originalPrice   ?? 0,
        discountedPrice: p.discountedPrice ?? def?.discountedPrice ?? p.price ?? 0,
        discountPercent: p.discountPercent ?? def?.discountPercent ?? 0,
        maxRooms:        p.maxRooms        ?? def?.maxRooms        ?? 30,
        maxStaff:        p.maxStaff        ?? def?.maxStaff        ?? 10,
        features:        p.features        ?? def?.features        ?? [],
    }
}

export async function POST(req: NextRequest) {
    try {
        const authResult = await requireAuth(req, ['SUPER_ADMIN'])
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
                features: features ?? undefined,
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
                features: features ?? [],
            },
        })

        return NextResponse.json({ success: true, data: updated })
    } catch (error) {
        return serverError(error, 'PLANS_POST')
    }
}
