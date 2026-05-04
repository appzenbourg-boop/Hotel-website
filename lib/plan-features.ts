/**
 * Canonical map of which admin routes/features are available per subscription plan.
 * Used by middleware, sidebar, and FeatureGate component.
 */

export type PlanTier = 'BASE' | 'STARTER' | 'STANDARD' | 'ENTERPRISE' | 'GOLD' | 'PLATINUM' | 'DIAMOND'

export interface FeatureDef {
    key: string
    label: string
    minPlan: PlanTier
    route?: string // admin route prefix this feature maps to
}

// Plan hierarchy — higher index = more features
export const PLAN_ORDER: PlanTier[] = ['BASE', 'STARTER', 'STANDARD', 'ENTERPRISE']

// Legacy plan mapping
export const LEGACY_PLAN_MAP: Record<string, PlanTier> = {
    GOLD:     'BASE',
    PLATINUM: 'STARTER',
    DIAMOND:  'STANDARD',
}

/** Normalize any plan string to a canonical tier */
export function normalizePlan(plan: string): PlanTier {
    const upper = plan?.toUpperCase() as PlanTier
    return LEGACY_PLAN_MAP[upper] ?? upper ?? 'BASE'
}

/** Returns true if `currentPlan` meets or exceeds `requiredPlan` */
export function planMeetsRequirement(currentPlan: string, requiredPlan: PlanTier): boolean {
    const current = normalizePlan(currentPlan)
    // ENTERPRISE always passes
    if (current === 'ENTERPRISE') return true
    const currentIdx = PLAN_ORDER.indexOf(current)
    const requiredIdx = PLAN_ORDER.indexOf(requiredPlan)
    if (currentIdx === -1 || requiredIdx === -1) return false
    return currentIdx >= requiredIdx
}

/**
 * All gated features with their minimum plan requirement.
 * BASE features are available to everyone.
 */
export const FEATURES: FeatureDef[] = [
    // ── BASE (everyone) ──────────────────────────────────────────────────────
    { key: 'dashboard',     label: 'Dashboard',          minPlan: 'BASE',       route: '/admin/dashboard' },
    { key: 'bookings',      label: 'Bookings',           minPlan: 'BASE',       route: '/admin/bookings' },
    { key: 'rooms',         label: 'Rooms',              minPlan: 'BASE',       route: '/admin/rooms' },
    { key: 'guests',        label: 'Guests',             minPlan: 'BASE',       route: '/admin/guests' },
    { key: 'checkin',       label: 'Check-in',           minPlan: 'BASE',       route: '/admin/checkin' },
    { key: 'settings',      label: 'Settings',           minPlan: 'BASE',       route: '/admin/settings' },
    { key: 'content',       label: 'Content',            minPlan: 'BASE',       route: '/admin/content' },
    { key: 'lost_found',    label: 'Lost & Found',       minPlan: 'BASE',       route: '/admin/lost-found' },
    { key: 'support',       label: 'Support',            minPlan: 'BASE',       route: '/admin/support' },

    // ── STARTER ───────────────────────────────────────────────────────────────
    { key: 'staff',         label: 'Staff Management',   minPlan: 'STARTER',    route: '/admin/staff' },
    { key: 'attendance',    label: 'Attendance',         minPlan: 'STARTER',    route: '/admin/attendance' },
    { key: 'leaves',        label: 'Leave Approvals',    minPlan: 'STARTER',    route: '/admin/leaves' },
    { key: 'payroll',       label: 'Payroll',            minPlan: 'STARTER',    route: '/admin/payroll' },
    { key: 'services',      label: 'Services',           minPlan: 'STARTER',    route: '/admin/services' },
    { key: 'marketing',     label: 'Marketing',          minPlan: 'STARTER',    route: '/admin/marketing' },
    { key: 'bulk_import',   label: 'Bulk Import',        minPlan: 'STARTER',    route: '/admin/bulk-import' },
    { key: 'reports',       label: 'Reports',            minPlan: 'STARTER',    route: '/admin/reports' },

    // ── STANDARD ──────────────────────────────────────────────────────────────
    { key: 'infrastructure',      label: 'Infrastructure',       minPlan: 'STANDARD', route: '/admin/infrastructure' },
    { key: 'restaurant_analysis', label: 'Restaurant Analysis',  minPlan: 'STANDARD', route: '/admin/restaurant-analysis' },
    { key: 'loyalty_analysis',    label: 'Loyalty Analysis',     minPlan: 'STANDARD', route: '/admin/loyalty-analysis' },

    // ── ENTERPRISE ────────────────────────────────────────────────────────────
    { key: 'properties',          label: 'Multi-property',       minPlan: 'ENTERPRISE', route: '/admin/properties' },
    { key: 'subscription_plans',  label: 'Subscription Plans',   minPlan: 'ENTERPRISE', route: '/admin/subscription-plans' },
]

/** Get the feature def for a given route prefix */
export function getFeatureForRoute(route: string): FeatureDef | undefined {
    return FEATURES.find(f => f.route && route.startsWith(f.route))
}

/** Check if a plan has access to a feature key */
export function planHasFeature(plan: string, featureKey: string): boolean {
    const feature = FEATURES.find(f => f.key === featureKey)
    if (!feature) return true // unknown feature = allow
    return planMeetsRequirement(plan, feature.minPlan)
}
