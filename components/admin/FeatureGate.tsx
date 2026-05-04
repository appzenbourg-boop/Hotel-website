'use client'

import { useRouter } from 'next/navigation'
import { Lock } from 'lucide-react'
import { usePermissions } from '@/lib/hooks/usePermissions'
import type { PlanTier } from '@/lib/plan-features'
import { PLAN_ORDER } from '@/lib/plan-features'

interface FeatureGateProps {
    /** Feature key from FEATURES list, OR a minPlan directly */
    feature?: string
    minPlan?: PlanTier
    /** If true, renders a locked overlay instead of hiding */
    showLocked?: boolean
    children: React.ReactNode
}

const PLAN_LABELS: Record<string, string> = {
    BASE: 'Base', STARTER: 'Starter', STANDARD: 'Standard', ENTERPRISE: 'Enterprise',
}
const PLAN_COLORS: Record<string, string> = {
    BASE: 'text-slate-400', STARTER: 'text-blue-400',
    STANDARD: 'text-amber-400', ENTERPRISE: 'text-purple-400',
}

export default function FeatureGate({ feature, minPlan, showLocked = true, children }: FeatureGateProps) {
    const { hasFeature, planMeets, plan, loading } = usePermissions()
    const router = useRouter()

    if (loading) return <>{children}</>

    const allowed = feature ? hasFeature(feature) : minPlan ? planMeets(minPlan) : true

    if (allowed) return <>{children}</>

    // Determine which plan is required
    const requiredPlan = minPlan ?? 'STARTER'

    if (!showLocked) return null

    return (
        <div className="relative">
            {/* Blurred content behind */}
            <div className="pointer-events-none select-none opacity-30 blur-[2px]">
                {children}
            </div>

            {/* Lock overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0d1117]/80 backdrop-blur-sm rounded-2xl border border-white/[0.06] z-10">
                <div className="flex flex-col items-center gap-3 p-6 text-center max-w-xs">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                        <Lock className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-white">
                            {PLAN_LABELS[requiredPlan] ?? requiredPlan} Plan Required
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                            Your current plan doesn&apos;t include this feature.
                            Upgrade to unlock it.
                        </p>
                    </div>
                    <button
                        onClick={() => router.push('/admin/settings?tab=subscription')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all hover:opacity-90 active:scale-95 ${
                            requiredPlan === 'ENTERPRISE'
                                ? 'bg-purple-500/10 border-purple-500/20 text-purple-400 hover:bg-purple-500/20'
                                : requiredPlan === 'STANDARD'
                                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20'
                                : 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20'
                        }`}
                    >
                        Upgrade to {PLAN_LABELS[requiredPlan]}
                    </button>
                </div>
            </div>
        </div>
    )
}
