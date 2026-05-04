'use client'

import { useState, useEffect, useCallback } from 'react'
import {
    Building2, Zap, Star, Crown, Infinity,
    CheckCircle2, Edit3, Save, X, Loader2,
    Users, BedDouble, Percent, IndianRupee,
    ChevronDown, ChevronUp,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn, formatCurrency } from '@/lib/utils'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

// ─── Plan metadata ────────────────────────────────────────────────────────────
const PLAN_META: Record<string, {
    icon: React.ElementType
    color: string
    bg: string
    border: string
    badge?: string
}> = {
    BASE:       { icon: Building2, color: 'text-slate-400',  bg: 'bg-slate-500/10',  border: 'border-slate-500/20' },
    STARTER:    { icon: Zap,       color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20',  badge: 'Popular' },
    STANDARD:   { icon: Star,      color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20', badge: 'Best Value' },
    ENTERPRISE: { icon: Crown,     color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
}

const ALL_FEATURES = [
    { id: 'BASIC_OPS', label: 'Core PMS & Reservations' },
    { id: 'DIGITAL_CHECKIN', label: 'Digital Check-in / Check-out' },
    { id: 'FRONT_DESK', label: 'Front Desk Terminal' },
    { id: 'STAFF_MANAGEMENT', label: 'Staff App & Management' },
    { id: 'HOUSEKEEPING_DISPATCH', label: 'Housekeeping & Maintenance Dispatch' },
    { id: 'MARKETING', label: 'Marketing Tools' },
    { id: 'LOYALTY', label: 'Loyalty Module' },
    { id: 'IOT_CONTROLS', label: 'IoT Room Controls' },
    { id: 'ANALYTICS', label: 'Advanced Analytics' },
    { id: 'FB_SPA', label: 'F&B and Spa Integration' },
    { id: 'UPSELL_ENGINE', label: 'Upsell Engine' },
    { id: 'MULTILANG_PORTAL', label: 'Multi-language Guest Portal' },
    { id: 'MULTI_PROPERTY', label: 'Multi-property Super Admin' },
    { id: 'CUSTOM_INTEGRATIONS', label: 'Custom Integrations' },
    { id: 'WHITE_LABEL', label: 'White-label Guest Portal' },
    { id: 'DEDICATED_SUPPORT', label: 'Dedicated Success Manager' },
    { id: 'SLA_UPTIME', label: 'SLA-backed Uptime' },
]

interface Plan {
    id?: string
    plan: string
    displayName: string
    tagline?: string
    description?: string
    originalPrice: number
    discountedPrice: number
    discountPercent: number
    maxRooms: number
    maxStaff: number
    features: string[]
}

export default function SubscriptionPlansPage() {
    const [plans, setPlans] = useState<Plan[]>([])
    const [loading, setLoading] = useState(true)
    const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
    const [saving, setSaving] = useState(false)
    const [expandedFeatures, setExpandedFeatures] = useState<string | null>(null)

    const fetchPlans = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/subscription-plans')
            const json = await res.json()
            if (json.success) setPlans(json.data)
        } catch {
            toast.error('Failed to load plans')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchPlans() }, [fetchPlans])

    const handleSave = async () => {
        if (!editingPlan) return
        setSaving(true)
        try {
            const res = await fetch('/api/admin/subscription-plans', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingPlan),
            })
            const json = await res.json()
            if (json.success) {
                toast.success(`${editingPlan.displayName} plan updated`)
                setEditingPlan(null)
                fetchPlans()
            } else {
                toast.error(json.error ?? 'Failed to save')
            }
        } catch {
            toast.error('Connection error')
        } finally {
            setSaving(false)
        }
    }

    const toggleFeature = (featureId: string) => {
        if (!editingPlan) return
        const has = editingPlan.features.includes(featureId)
        setEditingPlan({
            ...editingPlan,
            features: has
                ? editingPlan.features.filter(f => f !== featureId)
                : [...editingPlan.features, featureId],
        })
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-white">Subscription Plans</h1>
                <p className="text-text-secondary mt-1">
                    Configure pricing, discount percentages, room limits, and features for each plan tier.
                    Changes apply to new sign-ups immediately.
                </p>
            </div>

            {/* Plans Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {plans.map((plan) => {
                    const meta = PLAN_META[plan.plan] ?? PLAN_META.BASE
                    const Icon = meta.icon
                    const isEditing = editingPlan?.plan === plan.plan
                    const current = isEditing ? editingPlan! : plan
                    const savings = current.originalPrice - current.discountedPrice

                    return (
                        <div
                            key={plan.plan}
                            className={cn(
                                'relative bg-[#0d1117] border rounded-2xl overflow-hidden transition-all',
                                isEditing ? 'border-primary/50 ring-1 ring-primary/20' : 'border-white/[0.07] hover:border-white/[0.12]'
                            )}
                        >
                            {/* Badge */}
                            {meta.badge && (
                                <div className="absolute top-3 right-3 px-2 py-0.5 bg-primary text-white text-[9px] font-black uppercase tracking-widest rounded-full">
                                    {meta.badge}
                                </div>
                            )}

                            {/* Plan Header */}
                            <div className={cn('p-6 border-b border-white/[0.06]', meta.bg)}>
                                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', meta.bg, 'border', meta.border)}>
                                    <Icon className={cn('w-5 h-5', meta.color)} />
                                </div>
                                <h3 className="text-lg font-bold text-white">{current.displayName}</h3>
                                <p className="text-[11px] text-text-secondary mt-1 leading-relaxed">{current.tagline}</p>
                            </div>

                            {/* Pricing */}
                            <div className="p-6 border-b border-white/[0.06] space-y-4">
                                {plan.plan === 'ENTERPRISE' ? (
                                    <div className="flex items-center gap-2">
                                        <Infinity className="w-6 h-6 text-purple-400" />
                                        <span className="text-xl font-bold text-white">Custom Pricing</span>
                                    </div>
                                ) : (
                                    <>
                                        <div>
                                            {isEditing ? (
                                                <div className="space-y-3">
                                                    <div>
                                                        <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider block mb-1">
                                                            Original Price (₹/month)
                                                        </label>
                                                        <input
                                                            type="number"
                                                            value={current.originalPrice}
                                                            onChange={e => setEditingPlan({ ...current, originalPrice: parseFloat(e.target.value) || 0 })}
                                                            className="w-full bg-surface-light border border-border rounded-lg px-3 py-2 text-white text-sm focus:ring-1 focus:ring-primary outline-none"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider block mb-1">
                                                            Discounted Price (₹/month)
                                                        </label>
                                                        <input
                                                            type="number"
                                                            value={current.discountedPrice}
                                                            onChange={e => {
                                                                const dp = parseFloat(e.target.value) || 0
                                                                const pct = current.originalPrice > 0
                                                                    ? Math.round(((current.originalPrice - dp) / current.originalPrice) * 100)
                                                                    : 0
                                                                setEditingPlan({ ...current, discountedPrice: dp, discountPercent: pct })
                                                            }}
                                                            className="w-full bg-surface-light border border-border rounded-lg px-3 py-2 text-white text-sm focus:ring-1 focus:ring-primary outline-none"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider block mb-1 flex items-center gap-1">
                                                            <Percent className="w-3 h-3" /> Discount %
                                                        </label>
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            max={100}
                                                            value={current.discountPercent}
                                                            onChange={e => {
                                                                const pct = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0))
                                                                const dp = Math.round(current.originalPrice * (1 - pct / 100))
                                                                setEditingPlan({ ...current, discountPercent: pct, discountedPrice: dp })
                                                            }}
                                                            className="w-full bg-surface-light border border-border rounded-lg px-3 py-2 text-white text-sm focus:ring-1 focus:ring-primary outline-none"
                                                        />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div>
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="text-2xl font-bold text-white">
                                                            ₹{current.discountedPrice.toLocaleString('en-IN')}
                                                        </span>
                                                        <span className="text-xs text-text-tertiary">/month</span>
                                                    </div>
                                                    {current.originalPrice > current.discountedPrice && (
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-sm text-text-tertiary line-through">
                                                                ₹{current.originalPrice.toLocaleString('en-IN')}
                                                            </span>
                                                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded">
                                                                {current.discountPercent}% OFF
                                                            </span>
                                                        </div>
                                                    )}
                                                    {savings > 0 && (
                                                        <p className="text-[10px] text-emerald-400 mt-1">
                                                            Save ₹{savings.toLocaleString('en-IN')}/month
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}

                                {/* Limits */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-surface-light rounded-xl p-3">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <BedDouble className="w-3.5 h-3.5 text-text-tertiary" />
                                            <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">Rooms</span>
                                        </div>
                                        {isEditing ? (
                                            <input
                                                type="number"
                                                min={0}
                                                value={current.maxRooms}
                                                onChange={e => setEditingPlan({ ...current, maxRooms: parseInt(e.target.value) || 0 })}
                                                className="w-full bg-transparent text-white text-sm font-bold outline-none"
                                                placeholder="0 = unlimited"
                                            />
                                        ) : (
                                            <span className="text-sm font-bold text-white">
                                                {current.maxRooms === 0 ? 'Unlimited' : `Up to ${current.maxRooms}`}
                                            </span>
                                        )}
                                    </div>
                                    <div className="bg-surface-light rounded-xl p-3">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <Users className="w-3.5 h-3.5 text-text-tertiary" />
                                            <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">Staff</span>
                                        </div>
                                        {isEditing ? (
                                            <input
                                                type="number"
                                                min={0}
                                                value={current.maxStaff}
                                                onChange={e => setEditingPlan({ ...current, maxStaff: parseInt(e.target.value) || 0 })}
                                                className="w-full bg-transparent text-white text-sm font-bold outline-none"
                                                placeholder="0 = unlimited"
                                            />
                                        ) : (
                                            <span className="text-sm font-bold text-white">
                                                {current.maxStaff === 0 ? 'Unlimited' : `Up to ${current.maxStaff}`}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Features */}
                            <div className="p-6 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">
                                        Features ({current.features.length})
                                    </span>
                                    <button
                                        onClick={() => setExpandedFeatures(expandedFeatures === plan.plan ? null : plan.plan)}
                                        className="text-text-tertiary hover:text-white transition-colors"
                                    >
                                        {expandedFeatures === plan.plan
                                            ? <ChevronUp className="w-4 h-4" />
                                            : <ChevronDown className="w-4 h-4" />}
                                    </button>
                                </div>

                                {isEditing ? (
                                    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                                        {ALL_FEATURES.map(f => (
                                            <label key={f.id} className="flex items-center gap-2.5 cursor-pointer group">
                                                <div
                                                    onClick={() => toggleFeature(f.id)}
                                                    className={cn(
                                                        'w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0',
                                                        current.features.includes(f.id)
                                                            ? 'bg-primary border-primary'
                                                            : 'border-border group-hover:border-primary/50'
                                                    )}
                                                >
                                                    {current.features.includes(f.id) && (
                                                        <CheckCircle2 className="w-3 h-3 text-white" />
                                                    )}
                                                </div>
                                                <span className="text-[11px] text-text-secondary group-hover:text-white transition-colors">
                                                    {f.label}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="space-y-1.5">
                                        {(expandedFeatures === plan.plan ? current.features : current.features.slice(0, 4)).map(fId => {
                                            const feat = ALL_FEATURES.find(f => f.id === fId)
                                            return (
                                                <div key={fId} className="flex items-center gap-2">
                                                    <CheckCircle2 className={cn('w-3.5 h-3.5 shrink-0', meta.color)} />
                                                    <span className="text-[11px] text-text-secondary">
                                                        {feat?.label ?? fId}
                                                    </span>
                                                </div>
                                            )
                                        })}
                                        {current.features.length > 4 && expandedFeatures !== plan.plan && (
                                            <button
                                                onClick={() => setExpandedFeatures(plan.plan)}
                                                className="text-[10px] text-primary hover:text-primary/80 font-bold mt-1"
                                            >
                                                +{current.features.length - 4} more features
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="px-6 pb-6">
                                {isEditing ? (
                                    <div className="flex gap-2">
                                        <Button
                                            variant="primary"
                                            className="flex-1 text-xs"
                                            loading={saving}
                                            onClick={handleSave}
                                        >
                                            <Save className="w-3.5 h-3.5 mr-1.5" /> Save
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            className="px-3"
                                            onClick={() => setEditingPlan(null)}
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                ) : (
                                    <Button
                                        variant="secondary"
                                        className="w-full text-xs"
                                        onClick={() => setEditingPlan({ ...plan })}
                                    >
                                        <Edit3 className="w-3.5 h-3.5 mr-1.5" /> Edit Plan
                                    </Button>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Info box */}
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 flex gap-4">
                <IndianRupee className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                    <h4 className="text-sm font-bold text-white mb-1">How pricing works</h4>
                    <p className="text-[12px] text-text-secondary leading-relaxed">
                        The <strong className="text-white">Discount %</strong> field controls the strikethrough savings shown to hotel admins.
                        Changing the discounted price auto-calculates the percentage, and vice versa.
                        <br />
                        <strong className="text-white">Room/Staff limits</strong> set to <code className="text-primary">0</code> mean unlimited.
                        <br />
                        Per-hotel <strong className="text-white">GST %, service charge %, and booking discounts</strong> are configured in each hotel&apos;s
                        Settings → Financial section.
                    </p>
                </div>
            </div>
        </div>
    )
}
