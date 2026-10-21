'use client'

import { useState, useMemo } from 'react'
import useSWR from 'swr'
import {
    Plus, ChevronDown, ChevronRight, Building2, UserCircle, Users,
    Mail, MapPin, CheckCircle2, Zap, Star, Crown, Lock, Clock,
    Phone, Edit2, Save, X, Loader2, DollarSign, ShieldAlert, Send, RefreshCw,
    Sliders, Search, Filter, Layers, Check, Key, ShieldCheck, Sparkles, ExternalLink
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
import {
    MASTER_FEATURES,
    FEATURE_CATEGORIES,
    FEATURE_PRESETS,
    type MasterFeature,
    type FeatureCategory
} from '@/lib/master-features'
import { setAdminContext } from '@/lib/admin-context'
import { useRouter } from 'next/navigation'

interface StaffMember {
    id: string
    user: { id: string; name: string; email: string; role: string; status: string }
}
interface Owner {
    id: string; name: string; email: string; phone?: string; role: string; status: string
}
interface PropertyData {
    id: string; name: string; chainName?: string | null; address: string; email: string; phone: string
    description?: string; owners: Owner[]; staff: StaffMember[]
    plan: string; features: string[]
    planExpiresAt?: string | null
    customQuoteStatus?: 'NONE' | 'PENDING' | 'APPROVED' | 'PAID' | null
    customQuoteAmount?: number | null
    customQuoteAllowsTrial?: boolean
    _count?: { rooms?: number; staff?: number; bookings?: number }
}

const PLAN_META: Record<string, { icon: React.ElementType; color: string; bg: string; border: string; label: string }> = {
    BASE:       { icon: Building2, color: 'text-text-secondary',  bg: 'bg-slate-500/10',  border: 'border-slate-500/20',  label: 'Base' },
    STARTER:    { icon: Zap,       color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20',   label: 'Starter' },
    STANDARD:   { icon: Star,      color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20',  label: 'Standard' },
    ENTERPRISE: { icon: Crown,     color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', label: 'Enterprise' }
}

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function PropertiesPage() {
    const router = useRouter()
    const [expandedProperties, setExpandedProperties] = useState<string[]>([])
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [updatingPlan, setUpdatingPlan] = useState<string | null>(null)

    // Filter states
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedChain, setSelectedChain] = useState('ALL')

    // Feature Matrix Modal states
    const [featureModalProperty, setFeatureModalProperty] = useState<PropertyData | null>(null)
    const [activeFeatures, setActiveFeatures] = useState<string[]>([])
    const [featureCategoryFilter, setFeatureCategoryFilter] = useState<string>('ALL')
    const [featureSearchQuery, setFeatureSearchQuery] = useState<string>('')
    const [isSavingFeatures, setIsSavingFeatures] = useState(false)

    // Onboarding Form Data with Owner & Chain Provisioning
    const [onboardingTab, setOnboardingTab] = useState<'property' | 'owner' | 'plan'>('property')
    const [formData, setFormData] = useState({
        name: '',
        chainName: '',
        customChainName: '',
        email: '',
        phone: '',
        address: '',
        description: '',
        latitude: '',
        longitude: '',
        plan: 'STANDARD',
        selectedPreset: 'STANDARD_HOTEL',
        ownerName: '',
        ownerEmail: '',
        ownerPhone: '',
        ownerPassword: '',
        trialPeriod: true,
        upiId: ''
    })

    const { data: properties = [], mutate, isValidating: loading } = useSWR<PropertyData[]>(
        '/api/admin/properties/hierarchy',
        fetcher,
        { revalidateOnFocus: true, dedupingInterval: 5000 }
    )

    // Collect distinct chain names
    const chainsList = useMemo(() => {
        const chains = new Set<string>()
        properties.forEach(p => {
            if (p.chainName?.trim()) chains.add(p.chainName.trim())
        })
        return Array.from(chains)
    }, [properties])

    // Filter properties based on search and chain
    const filteredProperties = useMemo(() => {
        return properties.filter(p => {
            if (selectedChain !== 'ALL') {
                if (selectedChain === 'INDEPENDENT') {
                    if (p.chainName) return false
                } else if (p.chainName !== selectedChain) {
                    return false
                }
            }
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase()
                const matchName = p.name.toLowerCase().includes(q)
                const matchCity = p.address.toLowerCase().includes(q)
                const matchEmail = p.email.toLowerCase().includes(q)
                const matchChain = p.chainName?.toLowerCase().includes(q)
                const matchOwner = p.owners.some(o => o.name.toLowerCase().includes(q) || o.email.toLowerCase().includes(q))
                if (!matchName && !matchCity && !matchEmail && !matchChain && !matchOwner) return false
            }
            return true
        })
    }, [properties, selectedChain, searchQuery])

    // Total stats
    const stats = useMemo(() => {
        const totalHotels = properties.length
        const totalChains = chainsList.length
        const totalRooms = properties.reduce((acc, p) => acc + (p._count?.rooms || 0), 0)
        const activeSub = properties.filter(p => p.plan !== 'BASE').length
        return { totalHotels, totalChains, totalRooms, activeSub }
    }, [properties, chainsList])

    // Generate random secure password for owner
    const handleGeneratePassword = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&'
        let pwd = ''
        for (let i = 0; i < 10; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length))
        setFormData(prev => ({ ...prev, ownerPassword: pwd }))
        toast.info(`Generated password: ${pwd}`)
    }

    // Open Feature Matrix Modal
    const handleOpenFeatureModal = (property: PropertyData) => {
        setFeatureModalProperty(property)
        const currentFeats = property.features && property.features.length > 0
            ? [...property.features]
            : (FEATURE_PRESETS.find(p => p.id === 'STANDARD_HOTEL')?.features || MASTER_FEATURES.filter(f => f.defaultOn).map(f => f.id))
        setActiveFeatures(currentFeats)
        setFeatureCategoryFilter('ALL')
        setFeatureSearchQuery('')
    }

    // Toggle a single feature
    const handleToggleFeature = (featureId: string) => {
        setActiveFeatures(prev => {
            if (prev.includes(featureId)) {
                return prev.filter(id => id !== featureId)
            } else {
                return [...prev, featureId]
            }
        })
    }

    // Apply a preset in feature modal
    const handleApplyPreset = (presetId: string) => {
        const preset = FEATURE_PRESETS.find(p => p.id === presetId)
        if (preset) {
            setActiveFeatures([...preset.features])
            toast.success(`Applied "${preset.name}" (${preset.features.length} features)`)
        }
    }

    // Enable / Disable all
    const handleEnableAll = () => {
        setActiveFeatures(MASTER_FEATURES.map(f => f.id))
        toast.success(`Enabled all ${MASTER_FEATURES.length} features!`)
    }

    const handleDisableAll = () => {
        setActiveFeatures([])
        toast.info('Disabled all features for this property')
    }

    // Save Feature Matrix changes
    const handleSaveFeatures = async () => {
        if (!featureModalProperty) return
        setIsSavingFeatures(true)
        try {
            const res = await fetch('/api/admin/settings/property', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    propertyId: featureModalProperty.id,
                    features: activeFeatures
                })
            })

            if (res.ok) {
                toast.success(`Saved feature access matrix for ${featureModalProperty.name}! (${activeFeatures.length} active)`)
                window.dispatchEvent(new CustomEvent('featuresUpdated', {
                    detail: { propertyId: featureModalProperty.id, features: activeFeatures }
                }))
                mutate()
                setFeatureModalProperty(null)
            } else {
                const d = await res.json()
                toast.error(d.error || 'Failed to save feature settings')
            }
        } catch {
            toast.error('Connection error while saving features')
        } finally {
            setIsSavingFeatures(false)
        }
    }

    // Onboard New Property
    const handleAddProperty = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim() || !formData.address.trim()) {
            setOnboardingTab('property')
            return toast.error('Please fill in all mandatory property fields.')
        }

        if (formData.trialPeriod && !formData.upiId.trim()) {
            setOnboardingTab('plan')
            return toast.error('UPI ID is required to configure auto-pay and activate the 14-day free trial.')
        }

        setIsSubmitting(true)
        try {
            const finalChain = formData.chainName === 'NEW'
                ? formData.customChainName.trim()
                : (formData.chainName === 'INDEPENDENT' ? '' : formData.chainName)

            const preset = FEATURE_PRESETS.find(p => p.id === formData.selectedPreset)
            const initialFeatures = preset ? preset.features : FEATURE_PRESETS[1].features

            const res = await fetch('/api/admin/properties', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    chainName: finalChain || undefined,
                    email: formData.email,
                    phone: formData.phone,
                    address: formData.address,
                    description: formData.description,
                    latitude: formData.latitude,
                    longitude: formData.longitude,
                    plan: formData.plan,
                    features: initialFeatures,
                    ownerName: formData.ownerName || undefined,
                    ownerEmail: formData.ownerEmail || undefined,
                    ownerPhone: formData.ownerPhone || undefined,
                    ownerPassword: formData.ownerPassword || undefined,
                    trialPeriod: formData.trialPeriod,
                    upiId: formData.upiId
                })
            })

            const data = await res.json()
            if (res.ok) {
                toast.success(`Hotel "${formData.name}" onboarded successfully! Owner account created.`)
                setIsAddModalOpen(false)
                setFormData({
                    name: '', chainName: '', customChainName: '', email: '', phone: '', address: '', description: '',
                    latitude: '', longitude: '', plan: 'STANDARD', selectedPreset: 'STANDARD_HOTEL',
                    ownerName: '', ownerEmail: '', ownerPhone: '', ownerPassword: '', trialPeriod: true, upiId: ''
                })
                setOnboardingTab('property')
                mutate()
            } else {
                toast.error(data.error || 'Failed to onboard property')
            }
        } catch {
            toast.error('An unexpected error occurred during onboarding')
        } finally {
            setIsSubmitting(false)
        }
    }

    // Plan Change handler
    const handlePlanChange = async (propertyId: string, plan: string) => {
        setUpdatingPlan(propertyId + plan)
        try {
            const res = await fetch('/api/admin/settings/property', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ propertyId, plan })
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

    // Switch active hotel in context
    const handleSwitchToHotel = (propertyId: string, propertyName: string) => {
        setAdminContext(propertyId)
        toast.success(`Switched active workspace to ${propertyName}`)
        router.push('/admin/dashboard')
    }

    // Filter features inside Feature Matrix Modal
    const modalFilteredFeatures = useMemo(() => {
        return MASTER_FEATURES.filter(f => {
            if (featureCategoryFilter !== 'ALL' && f.category !== featureCategoryFilter) return false
            if (featureSearchQuery.trim()) {
                const q = featureSearchQuery.toLowerCase()
                return f.name.toLowerCase().includes(q) || f.description.toLowerCase().includes(q)
            }
            return true
        })
    }, [featureCategoryFilter, featureSearchQuery])

    if (loading && properties.length === 0) return (
        <div className="space-y-4 animate-pulse p-6">
            <div className="flex justify-between items-center">
                <div className="h-8 w-48 bg-white/5 rounded-lg" />
                <div className="h-10 w-32 bg-white/5 rounded-lg" />
            </div>
            <div className="grid grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-white/5 rounded-2xl" />)}
            </div>
            {[1, 2, 3].map(i => <div key={i} className="h-20 w-full bg-white/5 rounded-2xl" />)}
        </div>
    )

    return (
        <div className="space-y-8 p-1">
            {/* Top Overview Banner */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-6">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#4A9EFF]/10 border border-[#4A9EFF]/20 flex items-center justify-center text-[#4A9EFF]">
                            <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-text-primary tracking-tight">Super Admin Hotel Portfolio</h1>
                            <p className="text-text-secondary text-xs mt-0.5">
                                Onboard independent hotels & hotel chains, provision owner credentials, and configure granular feature access
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        onClick={() => {
                            setOnboardingTab('property')
                            setIsAddModalOpen(true)
                        }}
                        className="bg-[#4A9EFF] hover:bg-[#3B82F6] text-white shadow-lg shadow-[#4A9EFF]/20 gap-2 border-0"
                    >
                        <Plus className="w-4 h-4" /> Onboard Hotel / Chain
                    </Button>
                </div>
            </div>

            {/* Platform Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-surface border border-border/60 flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider">Total Hotels</p>
                        <p className="text-2xl font-black text-text-primary mt-1">{stats.totalHotels}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                        <Building2 className="w-5 h-5" />
                    </div>
                </div>

                <div className="p-4 rounded-2xl bg-surface border border-border/60 flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider">Hotel Chains & Brands</p>
                        <p className="text-2xl font-black text-text-primary mt-1">{stats.totalChains}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                        <Layers className="w-5 h-5" />
                    </div>
                </div>

                <div className="p-4 rounded-2xl bg-surface border border-border/60 flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider">Total Rooms Managed</p>
                        <p className="text-2xl font-black text-text-primary mt-1">{stats.totalRooms}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <CheckCircle2 className="w-5 h-5" />
                    </div>
                </div>

                <div className="p-4 rounded-2xl bg-surface border border-border/60 flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider">Active Subscriptions</p>
                        <p className="text-2xl font-black text-text-primary mt-1">{stats.activeSub}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                        <Crown className="w-5 h-5" />
                    </div>
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-surface/50 border border-border p-3 rounded-2xl">
                <div className="flex items-center gap-2 w-full md:w-auto flex-1">
                    <div className="relative flex-1 max-w-md">
                        <Search className="w-4 h-4 text-text-tertiary absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search by hotel name, city, owner, email, or chain..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full bg-black/20 border border-border rounded-xl pl-9 pr-4 py-2 text-xs text-text-primary placeholder:text-text-tertiary outline-none focus:border-[#4A9EFF]"
                        />
                    </div>

                    {/* Chain Filter Dropdown */}
                    <div className="flex items-center gap-1.5 shrink-0">
                        <Filter className="w-3.5 h-3.5 text-text-tertiary ml-2" />
                        <select
                            value={selectedChain}
                            onChange={e => setSelectedChain(e.target.value)}
                            className="bg-black/20 border border-border rounded-xl px-3 py-2 text-xs text-text-secondary outline-none focus:border-[#4A9EFF]"
                        >
                            <option value="ALL">All Chains & Brands ({properties.length})</option>
                            <option value="INDEPENDENT">Independent Hotels</option>
                            {chainsList.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="text-xs text-text-tertiary px-2">
                    Showing <span className="font-bold text-text-primary">{filteredProperties.length}</span> of {properties.length} properties
                </div>
            </div>

            {/* Property Cards List */}
            <div className="space-y-4">
                {filteredProperties.map(property => {
                    const isExpanded = expandedProperties.includes(property.id)
                    const plan = normalizePlan(property.plan ?? 'BASE')
                    const planMeta = PLAN_META[plan] ?? PLAN_META.BASE
                    const PlanIcon = planMeta.icon
                    const activeCount = property.features ? property.features.length : 0
                    const totalFeatures = MASTER_FEATURES.length
                    const activePercent = Math.round((activeCount / totalFeatures) * 100)

                    return (
                        <Card key={property.id} className="overflow-hidden border-border bg-surface p-0 hover:border-[#4A9EFF]/40 transition-colors">
                            {/* Card Top Row */}
                            <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                    <button
                                        onClick={() => setExpandedProperties(prev =>
                                            prev.includes(property.id) ? prev.filter(p => p !== property.id) : [...prev, property.id]
                                        )}
                                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-text-tertiary hover:text-text-primary transition-colors"
                                    >
                                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                    </button>

                                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#4A9EFF]/20 to-purple-500/10 border border-[#4A9EFF]/30 flex items-center justify-center text-[#4A9EFF] shrink-0 font-black text-sm">
                                        {property.name.substring(0, 2).toUpperCase()}
                                    </div>

                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="font-bold text-base text-text-primary truncate">{property.name}</h3>
                                            {property.chainName ? (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-500/15 border border-purple-500/30 text-purple-300 flex items-center gap-1">
                                                    <Layers className="w-2.5 h-2.5" /> {property.chainName}
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-text-tertiary">
                                                    Independent
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-4 text-xs text-text-secondary mt-1 flex-wrap">
                                            <span className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3 shrink-0 text-text-tertiary" />{property.address}</span>
                                            <span className="flex items-center gap-1 shrink-0"><Mail className="w-3 h-3 text-text-tertiary" />{property.email}</span>
                                            <span className="flex items-center gap-1 shrink-0"><Phone className="w-3 h-3 text-text-tertiary" />{property.phone}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Action Badges & Buttons */}
                                <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                                    {/* Feature Access Button */}
                                    <button
                                        onClick={() => handleOpenFeatureModal(property)}
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#4A9EFF]/30 bg-[#4A9EFF]/10 hover:bg-[#4A9EFF]/20 text-[#4A9EFF] text-xs font-bold transition-all shadow-sm shadow-[#4A9EFF]/10"
                                    >
                                        <Sliders className="w-3.5 h-3.5" />
                                        <span>Features ({activeCount}/{totalFeatures})</span>
                                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#4A9EFF]/20 font-black">{activePercent}%</span>
                                    </button>

                                    {/* Plan badge */}
                                    <span className={cn('flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border', planMeta.bg, planMeta.color, planMeta.border)}>
                                        <PlanIcon className="w-3 h-3" />{planMeta.label}
                                    </span>

                                    {/* Switch Context Button */}
                                    <button
                                        onClick={() => handleSwitchToHotel(property.id, property.name)}
                                        title="Switch to this property context"
                                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-text-secondary hover:text-text-primary transition-colors border border-border"
                                    >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>

                            {/* Expanded Details */}
                            {isExpanded && (
                                <div className="border-t border-border bg-black/20 p-6 space-y-6">
                                    {/* Owners section */}
                                    <div>
                                        <h4 className="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <UserCircle className="w-3.5 h-3.5 text-[#4A9EFF]" /> Hotel Owners & Administrators
                                        </h4>

                                        {property.owners.length === 0 ? (
                                            <div className="p-4 rounded-xl border border-dashed border-border text-center text-xs text-text-tertiary">
                                                No owner account assigned yet.
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                {property.owners.map(owner => (
                                                    <div key={owner.id} className="p-3 bg-surface rounded-xl border border-border flex items-center justify-between gap-3">
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <Avatar name={owner.name} size="sm" />
                                                            <div className="min-w-0">
                                                                <p className="text-xs font-bold text-text-primary truncate">{owner.name}</p>
                                                                <p className="text-[11px] text-text-secondary truncate">{owner.email}</p>
                                                                {owner.phone && <p className="text-[10px] text-text-tertiary">{owner.phone}</p>}
                                                            </div>
                                                        </div>
                                                        <Badge variant="secondary" className="text-[9px] uppercase tracking-wider">
                                                            {owner.role}
                                                        </Badge>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Subscription Plan Change */}
                                    <div>
                                        <h4 className="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <Crown className="w-3.5 h-3.5 text-amber-400" /> Subscription Plan Tier
                                        </h4>
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
                                                            'flex flex-col items-center gap-2 p-3.5 rounded-xl border text-center transition-all',
                                                            isCurrent
                                                                ? cn('border-2 shadow-md', meta.border, meta.bg)
                                                                : 'border-border bg-surface hover:bg-surface-light cursor-pointer'
                                                        )}
                                                    >
                                                        {isUpdating ? (
                                                            <Loader2 className="w-5 h-5 animate-spin text-[#4A9EFF]" />
                                                        ) : (
                                                            <Icon className={cn('w-5 h-5', isCurrent ? meta.color : 'text-text-tertiary')} />
                                                        )}
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

                                    {/* Quick Feature Summary & Direct Manage Button */}
                                    <div className="p-4 rounded-2xl bg-[#4A9EFF]/5 border border-[#4A9EFF]/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div>
                                            <h4 className="text-xs font-bold text-[#4A9EFF] uppercase tracking-wider flex items-center gap-1.5">
                                                <Sliders className="w-3.5 h-3.5" /> Granular Module Permissions
                                            </h4>
                                            <p className="text-xs text-text-secondary mt-1">
                                                Currently <span className="font-bold text-text-primary">{activeCount} of {totalFeatures} features</span> enabled. The client only sees features enabled here.
                                            </p>
                                        </div>
                                        <Button
                                            onClick={() => handleOpenFeatureModal(property)}
                                            className="bg-[#4A9EFF] hover:bg-[#3B82F6] text-white text-xs font-bold gap-2 self-start md:self-auto border-0"
                                        >
                                            <Sliders className="w-3.5 h-3.5" /> Open Feature Matrix
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </Card>
                    )
                })}

                {filteredProperties.length === 0 && (
                    <div className="text-center py-16 bg-surface rounded-2xl border border-dashed border-border">
                        <Building2 className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-text-primary">No hotels match your filters</h3>
                        <p className="text-text-secondary text-sm mt-1">Try adjusting your search query or chain filter.</p>
                        <Button
                            onClick={() => { setSearchQuery(''); setSelectedChain('ALL') }}
                            variant="secondary"
                            className="mt-4"
                        >
                            Clear Filters
                        </Button>
                    </div>
                )}
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                 FEATURE ACCESS CONTROL MATRIX MODAL (GRANULAR TOGGLES)
               ═══════════════════════════════════════════════════════════════ */}
            {featureModalProperty && (
                <Modal
                    isOpen={!!featureModalProperty}
                    onClose={() => setFeatureModalProperty(null)}
                    title={`Feature Access Matrix · ${featureModalProperty.name}`}
                    description={`Configure which modules and tools this hotel client has access to. Disabled features disappear from their dashboard and sidebar.`}
                    size="xl"
                    footer={(
                        <div className="flex items-center justify-between w-full">
                            <div className="text-xs text-text-tertiary flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-[#4A9EFF] animate-pulse"></span>
                                <span className="font-bold text-text-primary">{activeFeatures.length}</span> of {MASTER_FEATURES.length} features enabled ({Math.round((activeFeatures.length / MASTER_FEATURES.length) * 100)}%)
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="secondary" onClick={() => setFeatureModalProperty(null)}>
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleSaveFeatures}
                                    loading={isSavingFeatures}
                                    className="bg-[#4A9EFF] hover:bg-[#3B82F6] text-white border-0 font-bold gap-2"
                                >
                                    <Save className="w-4 h-4" /> Save Feature Permissions
                                </Button>
                            </div>
                        </div>
                    )}
                >
                    <div className="space-y-6">
                        {/* Presets and Global Controls Bar */}
                        <div className="p-4 rounded-2xl bg-black/30 border border-border/80 space-y-3">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-border/40 pb-2.5">
                                <p className="text-xs font-bold text-text-tertiary uppercase tracking-wider flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-amber-400" /> 1-Click Feature Presets
                                </p>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleEnableAll}
                                        className="text-[11px] font-bold text-[#4A9EFF] hover:underline px-2 py-0.5"
                                    >
                                        Enable All ({MASTER_FEATURES.length})
                                    </button>
                                    <span className="text-text-tertiary">·</span>
                                    <button
                                        onClick={handleDisableAll}
                                        className="text-[11px] font-bold text-red-400 hover:underline px-2 py-0.5"
                                    >
                                        Disable All
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {FEATURE_PRESETS.map(preset => (
                                    <button
                                        key={preset.id}
                                        onClick={() => handleApplyPreset(preset.id)}
                                        className="p-2.5 rounded-xl border border-border/60 bg-surface/60 hover:bg-surface hover:border-[#4A9EFF]/40 transition-all text-left flex flex-col justify-between"
                                    >
                                        <p className="text-xs font-bold text-text-primary leading-tight">{preset.name}</p>
                                        <p className="text-[10px] text-text-tertiary mt-1 line-clamp-1">{preset.description}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Search & Category Tabs */}
                        <div className="space-y-3">
                            <div className="relative">
                                <Search className="w-4 h-4 text-text-tertiary absolute left-3.5 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    placeholder="Search features (e.g. banquet, pos, ota, housekeeping, payroll)..."
                                    value={featureSearchQuery}
                                    onChange={e => setFeatureSearchQuery(e.target.value)}
                                    className="w-full bg-black/20 border border-border rounded-xl pl-9 pr-4 py-2.5 text-xs text-text-primary placeholder:text-text-tertiary outline-none focus:border-[#4A9EFF]"
                                />
                            </div>

                            {/* Category Filter Pills */}
                            <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
                                <button
                                    onClick={() => setFeatureCategoryFilter('ALL')}
                                    className={cn(
                                        'px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors border',
                                        featureCategoryFilter === 'ALL'
                                            ? 'bg-[#4A9EFF] text-white border-[#4A9EFF]'
                                            : 'bg-surface text-text-secondary border-border hover:bg-surface-light'
                                    )}
                                >
                                    All Categories ({MASTER_FEATURES.length})
                                </button>
                                {FEATURE_CATEGORIES.map(cat => {
                                    const count = MASTER_FEATURES.filter(f => f.category === cat.id).length
                                    const isSelected = featureCategoryFilter === cat.id
                                    return (
                                        <button
                                            key={cat.id}
                                            onClick={() => setFeatureCategoryFilter(cat.id)}
                                            className={cn(
                                                'px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors border flex items-center gap-1.5',
                                                isSelected
                                                    ? 'bg-[#4A9EFF] text-white border-[#4A9EFF]'
                                                    : 'bg-surface text-text-secondary border-border hover:bg-surface-light'
                                            )}
                                        >
                                            <span>{cat.title}</span>
                                            <span className={cn('text-[10px] px-1.5 rounded-full', isSelected ? 'bg-white/20' : 'bg-white/5')}>
                                                {count}
                                            </span>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Feature Toggles Grid */}
                        <div className="max-h-[50vh] overflow-y-auto pr-1 space-y-2.5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {modalFilteredFeatures.map(feature => {
                                    const isEnabled = activeFeatures.includes(feature.id)
                                    const catMeta = FEATURE_CATEGORIES.find(c => c.id === feature.category)

                                    return (
                                        <div
                                            key={feature.id}
                                            onClick={() => handleToggleFeature(feature.id)}
                                            className={cn(
                                                'p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 select-none',
                                                isEnabled
                                                    ? 'bg-[#4A9EFF]/10 border-[#4A9EFF]/40 shadow-sm shadow-[#4A9EFF]/5'
                                                    : 'bg-surface/50 border-border/70 hover:border-border hover:bg-surface opacity-70 hover:opacity-100'
                                            )}
                                        >
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={cn('text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/5', catMeta?.color)}>
                                                        {catMeta?.title || feature.category}
                                                    </span>
                                                </div>
                                                <p className="text-xs font-bold text-text-primary leading-snug">{feature.name}</p>
                                                <p className="text-[11px] text-text-secondary mt-0.5 leading-normal line-clamp-2">
                                                    {feature.description}
                                                </p>
                                            </div>

                                            {/* Custom Switch Toggle */}
                                            <div
                                                className={cn(
                                                    'w-12 h-6 rounded-full transition-all duration-200 shrink-0 p-0.5 flex items-center',
                                                    isEnabled ? 'bg-[#4A9EFF]' : 'bg-white/10'
                                                )}
                                            >
                                                <div
                                                    className={cn(
                                                        'w-5 h-5 rounded-full bg-white transition-all duration-200 shadow-md flex items-center justify-center text-[10px]',
                                                        isEnabled ? 'translate-x-6' : 'translate-x-0'
                                                    )}
                                                >
                                                    {isEnabled && <Check className="w-3 h-3 text-[#4A9EFF] stroke-[3]" />}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            {modalFilteredFeatures.length === 0 && (
                                <div className="text-center py-10 text-text-tertiary text-xs">
                                    No features match &quot;{featureSearchQuery}&quot; in this category.
                                </div>
                            )}
                        </div>
                    </div>
                </Modal>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                 ONBOARDING WIZARD MODAL (HOTEL + CHAIN + OWNER PROVISIONING)
               ═══════════════════════════════════════════════════════════════ */}
            <Modal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                title="Onboard New Hotel or Chain Property"
                description="Register a new hotel, assign its chain, provision the owner account, and define feature access."
                size="lg"
                footer={(
                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                            {onboardingTab !== 'property' && (
                                <Button
                                    variant="secondary"
                                    onClick={() => setOnboardingTab(onboardingTab === 'plan' ? 'owner' : 'property')}
                                >
                                    Back
                                </Button>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="secondary" onClick={() => setIsAddModalOpen(false)}>
                                Cancel
                            </Button>
                            {onboardingTab !== 'plan' ? (
                                <Button
                                    onClick={() => setOnboardingTab(onboardingTab === 'property' ? 'owner' : 'plan')}
                                    className="bg-[#4A9EFF] hover:bg-[#3B82F6] text-white border-0 font-bold"
                                >
                                    Next: {onboardingTab === 'property' ? 'Owner Account' : 'Plan & Features'}
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleAddProperty}
                                    loading={isSubmitting}
                                    className="bg-[#4A9EFF] hover:bg-[#3B82F6] text-white border-0 font-bold"
                                >
                                    Complete Onboarding
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            >
                <div className="space-y-6">
                    {/* Stepper Header */}
                    <div className="flex items-center border-b border-border/80 pb-3">
                        {[
                            { key: 'property', label: '1. Hotel & Chain Info' },
                            { key: 'owner',    label: '2. Owner Provisioning' },
                            { key: 'plan',     label: '3. Plan & Feature Pack' }
                        ].map(step => (
                            <button
                                key={step.key}
                                type="button"
                                onClick={() => setOnboardingTab(step.key as any)}
                                className={cn(
                                    'flex-1 text-center py-1.5 text-xs font-bold border-b-2 -mb-3 transition-colors',
                                    onboardingTab === step.key
                                        ? 'border-[#4A9EFF] text-[#4A9EFF]'
                                        : 'border-transparent text-text-tertiary hover:text-text-secondary'
                                )}
                            >
                                {step.label}
                            </button>
                        ))}
                    </div>

                    {/* Step 1: Hotel & Chain Identity */}
                    {onboardingTab === 'property' && (
                        <div className="space-y-4">
                            <Input
                                label="Hotel Property Name"
                                placeholder="e.g. The Grand Oberoi"
                                required
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />

                            {/* Chain / Brand Grouping */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                                    Hotel Chain / Brand Group
                                </label>
                                <select
                                    value={formData.chainName}
                                    onChange={e => setFormData({ ...formData, chainName: e.target.value })}
                                    className="w-full bg-black/30 border border-border rounded-xl px-3 py-2.5 text-xs text-text-primary outline-none focus:border-[#4A9EFF]"
                                >
                                    <option value="">Independent Hotel (No Chain)</option>
                                    {chainsList.map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                    <option value="NEW">+ Create New Hotel Chain / Brand</option>
                                </select>
                            </div>

                            {formData.chainName === 'NEW' && (
                                <Input
                                    label="New Chain / Brand Name"
                                    placeholder="e.g. Royal Heritage Hotels Group"
                                    required
                                    value={formData.customChainName}
                                    onChange={e => setFormData({ ...formData, customChainName: e.target.value })}
                                />
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="Hotel Contact Email"
                                    type="email"
                                    placeholder="contact@hotel.com"
                                    required
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                                <Input
                                    label="Hotel Contact Phone"
                                    placeholder="+91 9876543210"
                                    required
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>

                            <Input
                                label="Physical Address"
                                placeholder="Street, City, State, Pin Code"
                                required
                                value={formData.address}
                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                            />

                            <Textarea
                                label="Description / Tagline"
                                placeholder="Luxury boutique resort situated in the valleys..."
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                    )}

                    {/* Step 2: Hotel Owner Account Provisioning */}
                    {onboardingTab === 'owner' && (
                        <div className="space-y-4">
                            <div className="p-3.5 rounded-xl bg-[#4A9EFF]/10 border border-[#4A9EFF]/20 text-xs text-text-secondary leading-relaxed">
                                <span className="font-bold text-[#4A9EFF]">Owner Credentials:</span> When configured, an account with role <code className="text-white font-mono bg-black/40 px-1 rounded">HOTEL_ADMIN</code> will be immediately created so the hotel owner can log in straight away.
                            </div>

                            <Input
                                label="Owner Full Name"
                                placeholder="e.g. Vikramaditya Rathore"
                                value={formData.ownerName}
                                onChange={e => setFormData({ ...formData, ownerName: e.target.value })}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="Owner Login Email"
                                    type="email"
                                    placeholder="owner@hotel.com"
                                    value={formData.ownerEmail}
                                    onChange={e => setFormData({ ...formData, ownerEmail: e.target.value })}
                                />
                                <Input
                                    label="Owner Mobile Phone"
                                    placeholder="+91 9876543210"
                                    value={formData.ownerPhone}
                                    onChange={e => setFormData({ ...formData, ownerPhone: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                                        Owner Password
                                    </label>
                                    <button
                                        type="button"
                                        onClick={handleGeneratePassword}
                                        className="text-[11px] font-bold text-[#4A9EFF] hover:underline flex items-center gap-1"
                                    >
                                        <Key className="w-3 h-3" /> Generate Random
                                    </button>
                                </div>
                                <Input
                                    type="text"
                                    placeholder="Create password for owner login"
                                    value={formData.ownerPassword}
                                    onChange={e => setFormData({ ...formData, ownerPassword: e.target.value })}
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 3: Initial Subscription Plan & Feature Package */}
                    {onboardingTab === 'plan' && (
                        <div className="space-y-5">
                            {/* Plan Selection */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                                    Subscription Plan Tier
                                </label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    {(['BASE', 'STARTER', 'STANDARD', 'ENTERPRISE'] as PlanTier[]).map(p => {
                                        const meta = PLAN_META[p]
                                        const Icon = meta.icon
                                        const isSelected = formData.plan === p
                                        return (
                                            <button
                                                key={p}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, plan: p })}
                                                className={cn(
                                                    'p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5',
                                                    isSelected
                                                        ? 'bg-[#4A9EFF]/15 border-[#4A9EFF] text-[#4A9EFF] font-bold'
                                                        : 'bg-surface border-border text-text-secondary hover:bg-surface-light'
                                                )}
                                            >
                                                <Icon className="w-4 h-4" />
                                                <span className="text-xs">{meta.label}</span>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Initial Feature Preset */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                                    Initial Feature Package (Can be toggled anytime later)
                                </label>
                                <div className="space-y-2">
                                    {FEATURE_PRESETS.map(preset => {
                                        const isSelected = formData.selectedPreset === preset.id
                                        return (
                                            <div
                                                key={preset.id}
                                                onClick={() => setFormData({ ...formData, selectedPreset: preset.id })}
                                                className={cn(
                                                    'p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between',
                                                    isSelected
                                                        ? 'bg-[#4A9EFF]/10 border-[#4A9EFF]'
                                                        : 'bg-surface border-border hover:border-border/80'
                                                )}
                                            >
                                                <div>
                                                    <p className="text-xs font-bold text-text-primary">{preset.name}</p>
                                                    <p className="text-[11px] text-text-secondary">{preset.description}</p>
                                                </div>
                                                <span className="text-xs font-bold text-[#4A9EFF] shrink-0">
                                                    {preset.features.length} Features
                                                </span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Free Trial & UPI Configuration */}
                            <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 space-y-3">
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.trialPeriod}
                                        onChange={e => setFormData({ ...formData, trialPeriod: e.target.checked })}
                                        className="w-4 h-4 rounded text-primary focus:ring-primary border-border bg-surface-light accent-primary mt-1"
                                    />
                                    <div className="flex-1">
                                        <span className="text-sm font-semibold text-text-primary block leading-tight">Activate 14-Day Free Trial</span>
                                        <span className="text-[11px] text-text-secondary block mt-1 leading-normal">
                                            Capture UPI ID details now to configure secure autopay recurring deductions after the free trial concludes.
                                        </span>
                                    </div>
                                </label>

                                {formData.trialPeriod && (
                                    <div className="pt-2 border-t border-primary/10">
                                        <Input
                                            label="UPI ID for Auto-Pay"
                                            placeholder="e.g. hoteladmin@upi or 9876543210@paytm"
                                            required={formData.trialPeriod}
                                            value={formData.upiId}
                                            onChange={e => setFormData({ ...formData, upiId: e.target.value })}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    )
}
