'use client'

import { useState } from 'react'
import useSWR from 'swr'
import {
    Plus, ChevronDown, ChevronRight, Building2, UserCircle, Users,
    Mail, MapPin, Sparkles, CheckCircle2, Zap, Star, Crown, Lock,
    Phone, Edit2, Save, X, Loader2
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import { toast } from 'sonner'
import Avatar from '@/components/common/Avatar'
import { cn } from '@/lib/utils'
import { PLAN_ORDER, normalizePlan, type PlanTier } from '@/lib/plan-features'

interface StaffMember {
    id: string
    user: { id: string; name: string; email: string; role: string; status: string }
}
interface Owner {
    id: string; name: string; email: string; role: string; status: string
}
interface PropertyData {
    id: string; name: string; address: string; email: string; phone: string
    description?: string; owners: Owner[]; staff: StaffMember[]
    plan: string; features: string[]
    planExpiresAt?: string | null
}

const PLAN_META: Record<string, { icon: React.ElementType; color: string; bg: string; border: string; label: string }> = {
    BASE:       { icon: Building2, color: 'text-slate-400',  bg: 'bg-slate-500/10',  border: 'border-slate-500/20',  label: 'Base' },
    STARTER:    { icon: Zap,       color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20',   label: 'Starter' },
    STANDARD:   { icon: Star,      color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20',  label: 'Standard' },
    ENTERPRISE: { icon: Crown,     color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', label: 'Enterprise' },
}

// Features that can be individually toggled per property (overrides)
const FEATURE_FLAGS = [
    { id: 'BASIC_OPS',             label: 'Core PMS & Reservations',       minPlan: 'BASE' as PlanTier },
    { id: 'DIGITAL_CHECKIN',       label: 'Digital Check-in / Check-out',  minPlan: 'BASE' as PlanTier },
    { id: 'STAFF_MANAGEMENT',      label: 'Staff App & Management',        minPlan: 'STARTER' as PlanTier },
    { id: 'HOUSEKEEPING_DISPATCH', label: 'Housekeeping Dispatch',         minPlan: 'STARTER' as PlanTier },
    { id: 'MARKETING',             label: 'Marketing Tools',               minPlan: 'STARTER' as PlanTier },
    { id: 'LOYALTY',               label: 'Loyalty Module',                minPlan: 'STARTER' as PlanTier },
    { id: 'ANALYTICS',             label: 'Advanced Analytics',            minPlan: 'STANDARD' as PlanTier },
    { id: 'FB_SPA',                label: 'F&B and Spa Integration',       minPlan: 'STANDARD' as PlanTier },
    { id: 'MULTI_PROPERTY',        label: 'Multi-property Admin',          minPlan: 'ENTERPRISE' as PlanTier },
    { id: 'WHITE_LABEL',           label: 'White-label Guest Portal',      minPlan: 'ENTERPRISE' as PlanTier },
]

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function PropertiesPage() {
    const [expandedProperties, setExpandedProperties] = useState<string[]>([])
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [updatingPlan, setUpdatingPlan] = useState<string | null>(null)
    const [formData, setFormData] = useState({
        name: '', email: '', phone: '', address: '', description: '', latitude: '', longitude: ''
    })

    const { data: properties = [], mutate, isValidating: loading } = useSWR<PropertyData[]>(
        '/api/admin/properties/hierarchy', fetcher,
        { revalidateOnFocus: true, dedupingInterval: 5000 }
    )

    const handleAddProperty = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        try {
            const res = await fetch('/api/admin/properties', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            })
            if (res.ok) {
                toast.success('Property added successfully')
                setIsModalOpen(false)
                setFormData({ name: '', email: '', phone: '', address: '', description: '', latitude: '', longitude: '' })
                mutate()
            } else {
                const d = await res.json()
                toast.error(d.error || 'Failed to add property')
            }
        } catch { toast.error('An error occurred') }
        finally { setIsSubmitting(false) }
    }

    const handlePlanChange = async (propertyId: string, plan: string) => {
        setUpdatingPlan(propertyId + plan)
        try {
            const res = await fetch('/api/admin/settings/property', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ propertyId, plan }),
            })
            if (res.ok) {
                toast.success(`Plan updated to ${PLAN_META[plan]?.label ?? plan}`)
                mutate()
            } else {
                toast.error('Failed to update plan')
            }
        } catch { toast.error('Connection error') }
        finally { setUpdatingPlan(null) }
    }

    const handleFeatureToggle = async (property: PropertyData, featureId: string) => {
        const isActive = property.features.includes(featureId)
        const newFeatures = isActive
            ? property.features.filter(f => f !== featureId)
            : [...property.features, featureId]

        try {
            const res = await fetch('/api/admin/settings/property', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ propertyId: property.id, features: newFeatures }),
            })
            if (res.ok) {
                toast.success(`Feature ${isActive ? 'disabled' : 'enabled'}`)
                mutate()
            } else {
                toast.error('Failed to update feature')
            }
        } catch { toast.error('Connection error') }
    }

    if (loading && properties.length === 0) return (
        <div className="space-y-4 animate-pulse">
            <div className="flex justify-between items-center">
                <div className="h-8 w-48 bg-white/5 rounded-lg" />
                <div className="h-10 w-32 bg-white/5 rounded-lg" />
            </div>
            {[1, 2, 3].map(i => <div key={i} className="h-16 w-full bg-white/5 rounded-2xl" />)}
        </div>
    )

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white">Property Portfolio</h1>
                    <p className="text-text-secondary text-sm mt-0.5">
                        {properties.length} hotel{properties.length !== 1 ? 's' : ''} registered
                    </p>
                </div>
                <Button onClick={() => setIsModalOpen(true)} className="gap-2">
                    <Plus className="w-4 h-4" /> Add Hotel
                </Button>
            </div>

            {/* Properties List */}
            <div className="space-y-3">
                {properties.map(property => {
                    const isExpanded = expandedProperties.includes(property.id)
                    const plan = normalizePlan(property.plan ?? 'BASE')
                    const planMeta = PLAN_META[plan] ?? PLAN_META.BASE
                    const PlanIcon = planMeta.icon

                    return (
                        <Card key={property.id} className="overflow-hidden border-border bg-surface p-0">
                            {/* Row header */}
                            <div
                                className="p-4 flex items-center gap-4 cursor-pointer hover:bg-surface-light transition-colors"
                                onClick={() => setExpandedProperties(prev =>
                                    prev.includes(property.id) ? prev.filter(p => p !== property.id) : [...prev, property.id]
                                )}
                            >
                                <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                                    {isExpanded
                                        ? <ChevronDown className="w-4 h-4 text-primary" />
                                        : <ChevronRight className="w-4 h-4 text-primary" />
                                    }
                                </div>
                                <Building2 className="w-5 h-5 text-primary shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-white truncate">{property.name}</h3>
                                    <div className="flex items-center gap-3 text-xs text-text-secondary mt-0.5">
                                        <span className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3 shrink-0" />{property.address}</span>
                                        <span className="flex items-center gap-1 shrink-0"><Mail className="w-3 h-3" />{property.email}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {/* Plan badge */}
                                    <span className={cn('flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border', planMeta.bg, planMeta.color, planMeta.border)}>
                                        <PlanIcon className="w-3 h-3" />{planMeta.label}
                                    </span>
                                    <Badge variant="secondary" className="gap-1 text-xs">
                                        <Users className="w-3 h-3" />{property.staff.length}
                                    </Badge>
                                </div>
                            </div>

                            {/* Expanded content */}
                            {isExpanded && (
                                <div className="border-t border-border bg-surface-light/20 p-6 space-y-8 animate-in fade-in slide-in-from-top-2 duration-200">

                                    {/* Contact info */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                        {[
                                            { icon: Mail,  label: 'Email',   value: property.email },
                                            { icon: Phone, label: 'Phone',   value: property.phone },
                                            { icon: MapPin, label: 'Address', value: property.address },
                                        ].map(({ icon: Icon, label, value }) => (
                                            <div key={label}>
                                                <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-1">{label}</p>
                                                <p className="text-white text-xs truncate">{value || '—'}</p>
                                            </div>
                                        ))}
                                        <div>
                                            <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-1">Staff Count</p>
                                            <p className="text-white text-xs">{property.staff.length} members</p>
                                        </div>
                                    </div>

                                    {/* Owners */}
                                    <div>
                                        <h4 className="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <UserCircle className="w-3.5 h-3.5" /> Owners & Admins ({property.owners.length})
                                        </h4>
                                        {property.owners.length === 0 ? (
                                            <p className="text-sm text-text-tertiary">No owners assigned yet.</p>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                {property.owners.map(owner => (
                                                    <div key={owner.id} className="flex items-center gap-3 p-3 bg-surface rounded-xl border border-border">
                                                        <Avatar name={owner.name} size="sm" />
                                                        <div className="min-w-0">
                                                            <p className="font-medium text-sm text-white truncate">{owner.name}</p>
                                                            <p className="text-xs text-text-secondary truncate">{owner.email}</p>
                                                            <Badge variant="secondary" className="mt-1 text-[9px] h-4">{owner.role}</Badge>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Staff */}
                                    <div>
                                        <h4 className="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <Users className="w-3.5 h-3.5" /> Staff Roster ({property.staff.length})
                                        </h4>
                                        {property.staff.length === 0 ? (
                                            <p className="text-sm text-text-tertiary">No staff mapped yet.</p>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                {property.staff.slice(0, 9).map(member => (
                                                    <div key={member.id} className="flex items-center gap-3 p-3 bg-surface rounded-xl border border-border">
                                                        <Avatar name={member.user.name} size="sm" />
                                                        <div className="min-w-0">
                                                            <p className="font-medium text-sm text-white truncate">{member.user.name}</p>
                                                            <p className="text-xs text-text-secondary truncate">{member.user.email}</p>
                                                            <Badge variant="secondary" className="mt-1 text-[9px] h-4">{member.user.role}</Badge>
                                                        </div>
                                                    </div>
                                                ))}
                                                {property.staff.length > 9 && (
                                                    <div className="flex items-center justify-center p-3 bg-surface rounded-xl border border-dashed border-border text-sm text-text-tertiary">
                                                        +{property.staff.length - 9} more
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Subscription Plan */}
                                    <div className="border-t border-border pt-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <h4 className="text-xs font-bold text-text-tertiary uppercase tracking-wider flex items-center gap-2">
                                                    <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Subscription Plan
                                                </h4>
                                                <p className="text-xs text-text-tertiary mt-0.5">
                                                    Current: <span className={cn('font-bold', planMeta.color)}>{planMeta.label}</span>
                                                    {property.planExpiresAt && (
                                                        <span className="ml-2 text-text-tertiary">
                                                            · Expires {new Date(property.planExpiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            {(['BASE', 'STARTER', 'STANDARD', 'ENTERPRISE'] as PlanTier[]).map(p => {
                                                const meta = PLAN_META[p]
                                                const Icon = meta.icon
                                                const isCurrent = normalizePlan(property.plan) === p
                                                const isUpdating = updatingPlan === property.id + p

                                                return (
                                                    <button
                                                        key={p}
                                                        onClick={() => !isCurrent && handlePlanChange(property.id, p)}
                                                        disabled={isCurrent || !!updatingPlan}
                                                        className={cn(
                                                            'flex flex-col items-center gap-2 p-4 rounded-2xl border text-center transition-all',
                                                            isCurrent
                                                                ? cn('border-2', meta.border, meta.bg)
                                                                : 'border-border bg-surface hover:bg-surface-light cursor-pointer disabled:cursor-default'
                                                        )}
                                                    >
                                                        {isUpdating
                                                            ? <Loader2 className="w-5 h-5 animate-spin text-primary" />
                                                            : <Icon className={cn('w-5 h-5', isCurrent ? meta.color : 'text-text-tertiary')} />
                                                        }
                                                        <span className={cn('text-xs font-bold', isCurrent ? meta.color : 'text-text-secondary')}>
                                                            {meta.label}
                                                        </span>
                                                        {isCurrent && (
                                                            <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">Active</span>
                                                        )}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>

                                    {/* Feature Flags */}
                                    <div>
                                        <h4 className="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <Sparkles className="w-3.5 h-3.5" /> Feature Flags
                                            <span className="text-[9px] font-normal normal-case text-text-tertiary ml-1">
                                                (Override individual features regardless of plan)
                                            </span>
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {FEATURE_FLAGS.map(feat => {
                                                const isActive = property.features.includes(feat.id)
                                                const planIdx = PLAN_ORDER.indexOf(normalizePlan(property.plan))
                                                const reqIdx = PLAN_ORDER.indexOf(feat.minPlan)
                                                const includedInPlan = planIdx >= reqIdx

                                                return (
                                                    <div
                                                        key={feat.id}
                                                        onClick={() => handleFeatureToggle(property, feat.id)}
                                                        className={cn(
                                                            'p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-3',
                                                            isActive
                                                                ? 'bg-primary/10 border-primary/30'
                                                                : 'bg-surface border-border hover:border-white/20 opacity-60 hover:opacity-100'
                                                        )}
                                                    >
                                                        <div className={cn(
                                                            'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                                                            isActive ? 'bg-primary/20' : 'bg-white/5'
                                                        )}>
                                                            {includedInPlan
                                                                ? <CheckCircle2 className={cn('w-4 h-4', isActive ? 'text-primary' : 'text-text-tertiary')} />
                                                                : <Lock className="w-4 h-4 text-text-tertiary" />
                                                            }
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs font-semibold text-white truncate">{feat.label}</p>
                                                            <p className={cn('text-[10px]', includedInPlan ? 'text-text-tertiary' : 'text-amber-500/70')}>
                                                                {includedInPlan ? (isActive ? 'Enabled' : 'Disabled') : `Requires ${feat.minPlan}`}
                                                            </p>
                                                        </div>
                                                        <div className={cn(
                                                            'w-8 h-4 rounded-full transition-all shrink-0',
                                                            isActive ? 'bg-primary' : 'bg-white/10'
                                                        )}>
                                                            <div className={cn(
                                                                'w-3 h-3 rounded-full bg-white mt-0.5 transition-all',
                                                                isActive ? 'ml-4' : 'ml-0.5'
                                                            )} />
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </Card>
                    )
                })}

                {properties.length === 0 && !loading && (
                    <div className="text-center py-16 bg-surface rounded-2xl border border-dashed border-border">
                        <Building2 className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-white">No properties yet</h3>
                        <p className="text-text-secondary text-sm mt-1">Add your first hotel to get started.</p>
                        <Button onClick={() => setIsModalOpen(true)} className="mt-4 gap-2">
                            <Plus className="w-4 h-4" /> Add Property
                        </Button>
                    </div>
                )}
            </div>

            {/* Add Property Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Add New Hotel Property"
                description="Register a new hotel to the Zenbourg portfolio"
                footer={(
                    <>
                        <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleAddProperty} loading={isSubmitting}>Create Property</Button>
                    </>
                )}
            >
                <form onSubmit={handleAddProperty} className="space-y-4">
                    <Input label="Hotel Name" placeholder="e.g. Grand Palace Hotel" required
                        value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Contact Email" type="email" placeholder="hotel@example.com" required
                            value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                        <Input label="Phone Number" placeholder="+91 1234567890" required
                            value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                    </div>
                    <Input label="Address" placeholder="Full physical address" required
                        value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                    <Textarea label="Description (optional)" placeholder="Brief overview of the property..."
                        value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Latitude (optional)" placeholder="e.g. 28.6139"
                            value={formData.latitude} onChange={e => setFormData({ ...formData, latitude: e.target.value })} />
                        <Input label="Longitude (optional)" placeholder="e.g. 77.2090"
                            value={formData.longitude} onChange={e => setFormData({ ...formData, longitude: e.target.value })} />
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            if (navigator.geolocation) {
                                navigator.geolocation.getCurrentPosition(pos => {
                                    setFormData({ ...formData, latitude: pos.coords.latitude.toString(), longitude: pos.coords.longitude.toString() })
                                    toast.success('Location captured')
                                })
                            }
                        }}
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                        <MapPin className="w-3 h-3" /> Use my current location
                    </button>
                </form>
            </Modal>
        </div>
    )
}
