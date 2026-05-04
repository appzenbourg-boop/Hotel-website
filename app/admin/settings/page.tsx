'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import {
  Save, Building2, IndianRupee, Sparkles, Shield, Smartphone,
  Database, Globe, ChevronRight, ChevronLeft, Loader2,
  Calendar, Check, CheckCircle2, Bell, Zap, ShieldAlert, ClipboardList,
  Star, Crown, BedDouble, Users, CreditCard, Eye, EyeOff, AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { getAdminContext } from '@/lib/admin-context'
import Switch from '@/components/ui/Switch'
import Button from '@/components/ui/Button'

interface HotelInfo {
  name: string; description: string; address: string; phone: string; email: string
  plan: string; features: string[]; planExpiresAt: string | null; ranking: number
}
interface PlanDef {
  id?: string; plan: string; displayName: string; tagline?: string; description?: string
  originalPrice: number; discountedPrice: number; discountPercent: number
  maxRooms: number; maxStaff: number; features: string[]
}

const NAV = [
  { id: 'branding',     label: 'General Info',         icon: Building2,   desc: 'Hotel name, address, contact details' },
  { id: 'roles',        label: 'Roles & Permissions',  icon: Shield,      desc: 'Staff access levels per module' },
  { id: 'financial',    label: 'Financial & Tax',      icon: IndianRupee, desc: 'GST, service charge, discounts, invoice' },
  { id: 'ops',          label: 'Notifications',        icon: Smartphone,  desc: 'SMS, push, email alert settings' },
  { id: 'subscription', label: 'Subscription & Plans', icon: Sparkles,    desc: 'Current plan, upgrade, billing' },
  { id: 'integrations', label: 'Integrations',         icon: Globe,       desc: 'OTA channels and API connections' },
  { id: 'retention',    label: 'Data Retention',       icon: Database,    desc: 'How long data is stored' },
]

const PERMISSIONS_SCHEMA = [
  { id: 'reservations', label: 'Reservations', icon: Calendar, permissions: [
    { id: 'view_reservations',  label: 'View Reservations',   desc: 'View booking calendar and lists' },
    { id: 'create_reservation', label: 'Create Reservation',  desc: 'Add new bookings manually' },
    { id: 'edit_guest_details', label: 'Edit Guest Details',  desc: 'Modify guest names and contact info' },
    { id: 'process_refunds',    label: 'Process Refunds',     desc: 'Authorize refunds to guests' },
  ]},
  { id: 'housekeeping', label: 'Housekeeping', icon: ClipboardList, permissions: [
    { id: 'view_room_status',   label: 'View Room Status',   desc: 'See clean/dirty/inspected status' },
    { id: 'update_room_status', label: 'Update Room Status', desc: 'Change room status' },
    { id: 'manage_supplies',    label: 'Manage Supplies',    desc: 'Track and order cleaning supplies' },
  ]},
  { id: 'finance', label: 'Finance', icon: IndianRupee, permissions: [
    { id: 'view_reports',    label: 'View Financial Reports', desc: 'Access revenue reports' },
    { id: 'manage_invoices', label: 'Manage Invoices',        desc: 'Create and edit guest invoices' },
    { id: 'tax_settings',    label: 'Manage Tax Rules',       desc: 'Configure tax rates' },
  ]},
]

const ROLES = [
  { id: 'MANAGER',      label: 'Manager',      desc: 'Operations and staff oversight' },
  { id: 'RECEPTIONIST', label: 'Receptionist', desc: 'Front desk and check-in' },
  { id: 'STAFF',        label: 'Staff',        desc: 'Task execution only' },
]

const PLAN_ICONS: Record<string, React.ElementType> = {
  BASE: Building2, STARTER: Zap, STANDARD: Star, ENTERPRISE: Crown,
}
const PLAN_COLORS: Record<string, string> = {
  BASE: 'text-slate-400', STARTER: 'text-blue-400',
  STANDARD: 'text-amber-400', ENTERPRISE: 'text-purple-400',
}

// ─── Financial Settings Component ───────────────────────────────────────────
function FinancialView({ propertyId }: { propertyId: string | null | undefined }) {
  const [s, setS] = useState({
    gstPercent: 18, serviceChargePercent: 0, luxuryTaxPercent: 0,
    defaultDiscountPercent: 0, discountLabel: 'Discount',
    invoicePrefix: 'INV', invoiceFooter: '',
    checkInTime: '14:00', checkOutTime: '11:00',
    // Bank
    bankAccountName: '', bankAccountNumber: '', bankIfscCode: '',
    bankName: '', bankBranch: '', upiId: '',
    razorpayKeyId: '',
  })
  const [razorpayKeySecret, setRazorpayKeySecret] = useState('')
  const [showSecret, setShowSecret] = useState(false)
  const [showAccountNumber, setShowAccountNumber] = useState(false)
  const [maskedAccount, setMaskedAccount] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!propertyId || propertyId === 'ALL') { setLoading(false); return }
    fetch(`/api/admin/settings/financial?propertyId=${propertyId}`)
      .then(r => r.json())
      .then(j => {
        if (j.success && j.data) {
          const d = j.data
          setS(prev => ({
            ...prev,
            gstPercent: d.gstPercent ?? 18,
            serviceChargePercent: d.serviceChargePercent ?? 0,
            luxuryTaxPercent: d.luxuryTaxPercent ?? 0,
            defaultDiscountPercent: d.defaultDiscountPercent ?? 0,
            discountLabel: d.discountLabel ?? 'Discount',
            invoicePrefix: d.invoicePrefix ?? 'INV',
            invoiceFooter: d.invoiceFooter ?? '',
            checkInTime: d.checkInTime ?? '14:00',
            checkOutTime: d.checkOutTime ?? '11:00',
            bankAccountName: d.bankAccountName ?? '',
            bankAccountNumber: '',  // never pre-fill from server
            bankIfscCode: d.bankIfscCode ?? '',
            bankName: d.bankName ?? '',
            bankBranch: d.bankBranch ?? '',
            upiId: d.upiId ?? '',
            razorpayKeyId: d.razorpayKeyId ?? '',
          }))
          if (d.bankAccountNumberMasked) setMaskedAccount(d.bankAccountNumberMasked)
        }
      })
      .catch(() => {}).finally(() => setLoading(false))
  }, [propertyId])

  const save = async () => {
    if (!propertyId || propertyId === 'ALL') { toast.error('Select a hotel first'); return }
    setSaving(true)
    try {
      const payload: any = { propertyId, ...s }
      if (razorpayKeySecret) payload.razorpayKeySecret = razorpayKeySecret
      // Don't send empty account number (would overwrite existing)
      if (!s.bankAccountNumber) delete payload.bankAccountNumber

      const res = await fetch('/api/admin/settings/financial', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const j = await res.json()
      if (j.success) {
        toast.success('Financial settings saved')
        if (j.data?.bankAccountNumberMasked) setMaskedAccount(j.data.bankAccountNumberMasked)
        setS(p => ({ ...p, bankAccountNumber: '' }))
        setRazorpayKeySecret('')
      } else toast.error(j.error ?? 'Failed to save')
    } catch { toast.error('Connection error') } finally { setSaving(false) }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  )

  const base = 5000
  const gst = base * s.gstPercent / 100
  const sc = base * s.serviceChargePercent / 100
  const lt = base * s.luxuryTaxPercent / 100
  const total = base + gst + sc + lt
  const disc = total * s.defaultDiscountPercent / 100
  const final = total - disc

  const ic = 'w-full bg-surface-light border border-border rounded-xl px-4 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary outline-none transition-all'
  const lc = 'text-xs font-semibold text-text-secondary block mb-1.5'

  return (
    <div className="space-y-6">
      {/* ── Tax Rates ── */}
      <div className="bg-surface border border-border rounded-2xl p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-white">Tax Rates</h3>
            <p className="text-xs text-text-secondary mt-0.5">Applied automatically to every booking</p>
          </div>
          <Button onClick={save} loading={saving} variant="primary" className="text-sm">
            <Save className="w-4 h-4 mr-2" /> Save All
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5"><label className={lc}>GST %</label><p className="text-[11px] text-text-tertiary">Goods &amp; Services Tax on room charges</p><input type="number" min={0} max={100} value={s.gstPercent} onChange={e => setS(p => ({ ...p, gstPercent: parseFloat(e.target.value) || 0 }))} className={ic} /></div>
          <div className="space-y-1.5"><label className={lc}>Service Charge %</label><p className="text-[11px] text-text-tertiary">Hotel service charge</p><input type="number" min={0} max={100} value={s.serviceChargePercent} onChange={e => setS(p => ({ ...p, serviceChargePercent: parseFloat(e.target.value) || 0 }))} className={ic} /></div>
          <div className="space-y-1.5"><label className={lc}>Luxury Tax %</label><p className="text-[11px] text-text-tertiary">State luxury tax</p><input type="number" min={0} max={100} value={s.luxuryTaxPercent} onChange={e => setS(p => ({ ...p, luxuryTaxPercent: parseFloat(e.target.value) || 0 }))} className={ic} /></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5"><label className={lc}>Default Discount %</label><p className="text-[11px] text-text-tertiary">Auto-applied to all bookings (0 = none)</p><input type="number" min={0} max={100} value={s.defaultDiscountPercent} onChange={e => setS(p => ({ ...p, defaultDiscountPercent: parseFloat(e.target.value) || 0 }))} className={ic} /></div>
          <div className="space-y-1.5"><label className={lc}>Discount Label</label><p className="text-[11px] text-text-tertiary">e.g. Early Bird, Member Rate</p><input type="text" value={s.discountLabel} onChange={e => setS(p => ({ ...p, discountLabel: e.target.value }))} className={ic} /></div>
        </div>
      </div>

      {/* ── Invoice & Times ── */}
      <div className="bg-surface border border-border rounded-2xl p-6 space-y-4">
        <h3 className="text-base font-semibold text-white">Invoice & Operations</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5"><label className={lc}>Invoice Prefix</label><p className="text-[11px] text-text-tertiary">e.g. INV, ZB, HTL</p><input type="text" value={s.invoicePrefix} onChange={e => setS(p => ({ ...p, invoicePrefix: e.target.value }))} className={ic} /></div>
          <div className="space-y-1.5"><label className={lc}>Invoice Footer Note</label><p className="text-[11px] text-text-tertiary">Appears at the bottom of every invoice</p><input type="text" value={s.invoiceFooter} onChange={e => setS(p => ({ ...p, invoiceFooter: e.target.value }))} className={ic} /></div>
          <div className="space-y-1.5"><label className={lc}>Check-in Time</label><input type="time" value={s.checkInTime} onChange={e => setS(p => ({ ...p, checkInTime: e.target.value }))} className={ic} /></div>
          <div className="space-y-1.5"><label className={lc}>Check-out Time</label><input type="time" value={s.checkOutTime} onChange={e => setS(p => ({ ...p, checkOutTime: e.target.value }))} className={ic} /></div>
        </div>
      </div>

      {/* ── Bank Account Details ── */}
      <div className="bg-surface border border-border rounded-2xl p-6 space-y-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <CreditCard className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Bank Account Details</h3>
            <p className="text-xs text-text-secondary mt-0.5">
              All payments collected through the admin panel will be settled to this account via Razorpay.
            </p>
          </div>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-300">
            Account number is stored securely and masked after saving. Only the last 4 digits will be shown.
            Razorpay Key Secret is write-only — it will never be displayed after saving.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className={lc}>Account Holder Name</label>
            <input type="text" value={s.bankAccountName} onChange={e => setS(p => ({ ...p, bankAccountName: e.target.value }))} className={ic} placeholder="e.g. Rajesh Kumar" />
          </div>
          <div className="space-y-1.5">
            <label className={lc}>Account Number</label>
            {maskedAccount && !showAccountNumber ? (
              <div className="flex gap-2">
                <input type="text" value={maskedAccount} readOnly className={cn(ic, 'opacity-60 cursor-not-allowed font-mono tracking-widest')} />
                <button onClick={() => setShowAccountNumber(true)} className="px-3 py-2 bg-surface-light border border-border rounded-xl text-xs text-text-secondary hover:text-white transition-all whitespace-nowrap">
                  Change
                </button>
              </div>
            ) : (
              <input type="text" value={s.bankAccountNumber} onChange={e => setS(p => ({ ...p, bankAccountNumber: e.target.value }))} className={ic} placeholder="Enter account number" />
            )}
          </div>
          <div className="space-y-1.5">
            <label className={lc}>IFSC Code</label>
            <input type="text" value={s.bankIfscCode} onChange={e => setS(p => ({ ...p, bankIfscCode: e.target.value.toUpperCase() }))} className={cn(ic, 'uppercase tracking-widest')} placeholder="e.g. HDFC0001234" maxLength={11} />
          </div>
          <div className="space-y-1.5">
            <label className={lc}>Bank Name</label>
            <input type="text" value={s.bankName} onChange={e => setS(p => ({ ...p, bankName: e.target.value }))} className={ic} placeholder="e.g. HDFC Bank" />
          </div>
          <div className="space-y-1.5">
            <label className={lc}>Branch Name</label>
            <input type="text" value={s.bankBranch} onChange={e => setS(p => ({ ...p, bankBranch: e.target.value }))} className={ic} placeholder="e.g. Connaught Place, New Delhi" />
          </div>
          <div className="space-y-1.5">
            <label className={lc}>UPI ID</label>
            <input type="text" value={s.upiId} onChange={e => setS(p => ({ ...p, upiId: e.target.value }))} className={ic} placeholder="e.g. hotel@hdfcbank" />
          </div>
        </div>

        {/* Razorpay Credentials */}
        <div className="border-t border-border pt-5 space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-white">Razorpay Credentials</h4>
            <p className="text-xs text-text-secondary mt-0.5">
              Add your hotel&apos;s own Razorpay keys so payments go directly to your account.
              Leave blank to use the platform default.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className={lc}>Razorpay Key ID</label>
              <input type="text" value={s.razorpayKeyId} onChange={e => setS(p => ({ ...p, razorpayKeyId: e.target.value }))} className={ic} placeholder="rzp_live_xxxxxxxxxxxx" />
            </div>
            <div className="space-y-1.5">
              <label className={lc}>Razorpay Key Secret</label>
              <div className="relative">
                <input
                  type={showSecret ? 'text' : 'password'}
                  value={razorpayKeySecret}
                  onChange={e => setRazorpayKeySecret(e.target.value)}
                  className={cn(ic, 'pr-10')}
                  placeholder={s.razorpayKeyId ? '••••••••••••••••' : 'Enter secret key'}
                />
                <button onClick={() => setShowSecret(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-white transition-colors">
                  {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Live Preview ── */}
      <div className="bg-surface border border-border rounded-2xl p-6">
        <h3 className="text-base font-semibold text-white mb-4">Live Preview — ₹5,000 room charge</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-text-secondary"><span>Room Charges</span><span>₹{base.toLocaleString('en-IN')}</span></div>
          {gst > 0 && <div className="flex justify-between text-text-secondary"><span>GST ({s.gstPercent}%)</span><span>+₹{gst.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span></div>}
          {sc > 0 && <div className="flex justify-between text-text-secondary"><span>Service Charge ({s.serviceChargePercent}%)</span><span>+₹{sc.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span></div>}
          {lt > 0 && <div className="flex justify-between text-text-secondary"><span>Luxury Tax ({s.luxuryTaxPercent}%)</span><span>+₹{lt.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span></div>}
          <div className="flex justify-between text-text-secondary border-t border-border pt-2"><span>Subtotal</span><span>₹{total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span></div>
          {disc > 0 && <div className="flex justify-between text-emerald-400"><span>{s.discountLabel} ({s.defaultDiscountPercent}%)</span><span>-₹{disc.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span></div>}
          <div className="flex justify-between text-white font-bold border-t border-border pt-2"><span>Guest Pays</span><span>₹{final.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span></div>
        </div>
      </div>
    </div>
  )
}

// ─── Subscription Component ──────────────────────────────────────────────────
// Map legacy plan names to new ones (for properties that still have old plan in DB)
const LEGACY_PLAN_MAP: Record<string, string> = {
  GOLD: 'BASE', PLATINUM: 'STARTER', DIAMOND: 'STANDARD',
}

const PLAN_ORDER = ['BASE', 'STARTER', 'STANDARD', 'ENTERPRISE']

function SubscriptionView({ propertyId, currentPlan, onUpgrade }: {
  propertyId: string | null | undefined
  currentPlan: string
  onUpgrade: (plan: PlanDef) => void
}) {
  const [plans, setPlans] = useState<PlanDef[]>([])
  const [loading, setLoading] = useState(true)

  const loadPlans = () => {
    setLoading(true)
    fetch('/api/admin/subscription-plans')
      .then(r => r.json())
      .then(j => { if (j.success && j.data) setPlans(j.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadPlans() }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  )

  const normalizedPlan = LEGACY_PLAN_MAP[currentPlan] ?? currentPlan
  // Sort plans in correct order
  const sortedPlans = [...plans].sort((a, b) => {
    const ai = PLAN_ORDER.indexOf(a.plan)
    const bi = PLAN_ORDER.indexOf(b.plan)
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })
  const activePlan = sortedPlans.find(p => p.plan === normalizedPlan) ?? sortedPlans[0]

  return (
    <div className="space-y-6">
      {/* Current plan banner */}
      {activePlan && (
        <div className="bg-primary/10 border border-primary/30 rounded-2xl p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {(() => { const Icon = PLAN_ICONS[activePlan.plan] ?? Star; return <Icon className={cn('w-5 h-5', PLAN_COLORS[activePlan.plan] ?? 'text-primary')} /> })()}
            <div>
              <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">Current Plan</p>
              <p className="text-base font-bold text-white">{activePlan.displayName ?? activePlan.plan}</p>
              {activePlan.tagline && <p className="text-xs text-text-secondary mt-0.5">{activePlan.tagline}</p>}
            </div>
          </div>
          <div className="text-right">
            {activePlan.plan !== 'ENTERPRISE' ? (
              <div>
                <p className="text-lg font-bold text-white">
                  ₹{(activePlan.discountedPrice ?? 0).toLocaleString('en-IN')}
                  <span className="text-xs text-text-tertiary font-normal">/mo</span>
                </p>
                {(activePlan.maxRooms ?? 0) > 0 && (
                  <p className="text-xs text-text-secondary mt-0.5">Up to {activePlan.maxRooms} rooms</p>
                )}
              </div>
            ) : (
              <p className="text-sm font-bold text-white">Custom Pricing</p>
            )}
          </div>
        </div>
      )}

      {/* Plans grid */}
      {sortedPlans.length === 0 ? (
        <div className="text-center py-12 bg-surface border border-border rounded-2xl">
          <ShieldAlert className="w-8 h-8 mx-auto mb-3 text-text-tertiary opacity-40" />
          <p className="text-sm text-text-tertiary mb-3">No plans loaded.</p>
          <button onClick={loadPlans} className="text-xs text-primary hover:underline font-medium">Retry</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedPlans.map(plan => {
            const Icon = PLAN_ICONS[plan.plan] ?? Star
            const isActive = plan.plan === normalizedPlan
            const origPrice = plan.originalPrice ?? 0
            const discPrice = plan.discountedPrice ?? 0
            const savings = origPrice - discPrice
            const discPct = plan.discountPercent ?? 0
            const features: string[] = plan.features ?? []

            return (
              <div key={plan.plan} className={cn(
                'relative flex flex-col border rounded-2xl p-5 transition-all',
                isActive
                  ? 'bg-primary/10 border-primary/40 ring-1 ring-primary/20'
                  : 'bg-surface border-border hover:border-primary/30'
              )}>
                {isActive && (
                  <span className="absolute top-3 right-3 text-[10px] font-bold bg-primary text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Active
                  </span>
                )}

                {/* Header */}
                <div className="flex items-start gap-3 mb-4">
                  <div className={cn(
                    'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                    isActive ? 'bg-primary/20' : 'bg-surface-light'
                  )}>
                    <Icon className={cn('w-4 h-4', PLAN_COLORS[plan.plan] ?? 'text-primary')} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{plan.displayName ?? plan.plan}</h4>
                    {plan.tagline && <p className="text-[11px] text-text-secondary mt-0.5 leading-relaxed">{plan.tagline}</p>}
                  </div>
                </div>

                {/* Pricing */}
                {plan.plan !== 'ENTERPRISE' ? (
                  <div className="mb-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-white">₹{discPrice.toLocaleString('en-IN')}</span>
                      <span className="text-xs text-text-tertiary">/-month</span>
                    </div>
                    {savings > 0 && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-text-tertiary line-through">₹{origPrice.toLocaleString('en-IN')}</span>
                        {discPct > 0 && (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded">
                            {discPct}% OFF
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mb-4">
                    <p className="text-lg font-bold text-white">Custom Pricing</p>
                    <p className="text-xs text-text-secondary mt-0.5">Contact us for a tailored quote</p>
                  </div>
                )}

                {/* Limits */}
                <div className="flex items-center gap-4 mb-4 text-xs text-text-secondary">
                  <span className="flex items-center gap-1.5">
                    <BedDouble className="w-3.5 h-3.5 shrink-0" />
                    {(plan.maxRooms ?? 0) === 0 ? 'Unlimited rooms' : `Up to ${plan.maxRooms} rooms`}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 shrink-0" />
                    {(plan.maxStaff ?? 0) === 0 ? 'Unlimited staff' : `Up to ${plan.maxStaff} staff`}
                  </span>
                </div>

                {/* Features */}
                <div className="space-y-1.5 mb-5 flex-1">
                  {features.map((f, i) => (
                    <div key={i} className="flex items-start gap-2 text-[11px] text-text-secondary">
                      <CheckCircle2 className={cn('w-3.5 h-3.5 shrink-0 mt-0.5', PLAN_COLORS[plan.plan] ?? 'text-primary')} />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                {isActive ? (
                  <div className="flex items-center gap-2 text-xs text-primary font-semibold mt-auto">
                    <Check className="w-4 h-4" /> Current Plan
                  </div>
                ) : plan.plan === 'ENTERPRISE' ? (
                  <a
                    href="mailto:sales@zenbourg.com"
                    className="mt-auto block w-full text-center py-2.5 rounded-xl border border-purple-500/30 text-purple-400 text-xs font-semibold hover:bg-purple-500/10 transition-all"
                  >
                    Contact Sales
                  </a>
                ) : (
                  <button
                    onClick={() => onUpgrade(plan)}
                    className="mt-auto w-full py-2.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary/90 active:scale-95 transition-all"
                  >
                    Upgrade to {plan.displayName ?? plan.plan}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Main Settings Page ───────────────────────────────────────────────────────
export default function SettingsPage() {
  const { data: session, update } = useSession()
  const [view, setView] = useState('OVERVIEW')
  const [saving, setSaving] = useState(false)
  const [hotelInfo, setHotelInfo] = useState<HotelInfo>({ name: '', description: '', address: '', phone: '', email: '', plan: 'BASE', features: [], planExpiresAt: null, ranking: 0 })
  const [selectedRole, setSelectedRole] = useState('MANAGER')
  const [permissions, setPermissions] = useState<Record<string, boolean>>({})
  const [notif, setNotif] = useState({ smsAlerts: false, pushNotifications: true, emailAlerts: true, bookingConfirmation: true, checkoutReminder: true, serviceUpdates: true })
  const [retention, setRetention] = useState({ guestProfiles: '3_YEARS', financials: '7_YEARS', serviceLogs: '1_YEAR', legalHoldMode: false })

  const INTEGRATIONS = [
    { id: 'booking_com', name: 'Booking.com',  type: 'OTA Channel',      status: 'NOT_CONNECTED' },
    { id: 'expedia',     name: 'Expedia',       type: 'OTA Channel',      status: 'NOT_CONNECTED' },
    { id: 'airbnb',      name: 'Airbnb',        type: 'Travel & Booking', status: 'NOT_CONNECTED' },
    { id: 'makemytrip',  name: 'MakeMyTrip',    type: 'OTA Channel',      status: 'NOT_CONNECTED' },
    { id: 'razorpay',    name: 'Razorpay',      type: 'Payment Gateway',  status: 'CONNECTED' },
    { id: 'twilio',      name: 'Twilio',        type: 'SMS / WhatsApp',   status: 'CONNECTED' },
  ]

  const currentPropertyId = useMemo(() => session?.user?.role === 'SUPER_ADMIN' ? getAdminContext()?.propertyId : session?.user?.propertyId, [session])

  const fetchProperty = useCallback(async () => {
    if (!currentPropertyId || currentPropertyId === 'ALL') return
    try {
      const r = await fetch(`/api/admin/settings/property?propertyId=${currentPropertyId}`)
      const d = await r.json()
      if (d.success && d.property) setHotelInfo(d.property)
    } catch { /* silent */ }
  }, [currentPropertyId])

  const fetchRoles = useCallback(async () => {
    if (!currentPropertyId || currentPropertyId === 'ALL') return
    try {
      const r = await fetch(`/api/admin/settings/roles?propertyId=${currentPropertyId}`)
      const d = await r.json()
      if (d.success) {
        const cur = (d.rolePermissions || []).find((rp: any) => rp.role === selectedRole)
        const raw: Record<string, any> = cur?.permissions || {}
        // Normalize: convert 'READ'/'READ_WRITE' → true, 'NONE'/undefined → false
        const normalized: Record<string, boolean> = {}
        Object.entries(raw).forEach(([k, v]) => {
          normalized[k] = v === true || v === 'READ' || v === 'READ_WRITE'
        })
        setPermissions(normalized)
      }
    } catch { /* silent */ }
  }, [currentPropertyId, selectedRole])

  useEffect(() => { fetchProperty() }, [fetchProperty])
  useEffect(() => { fetchRoles() }, [fetchRoles])

  const saveBranding = async () => {
    if (!currentPropertyId || currentPropertyId === 'ALL') { toast.error('Select a hotel first'); return }
    setSaving(true)
    try {
      // Only send editable branding fields — never send plan/features (those are SUPER_ADMIN only)
      const { name, description, address, phone, email } = hotelInfo
      const r = await fetch('/api/admin/settings/property', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId: currentPropertyId, name, description, address, phone, email })
      })
      const d = await r.json()
      if (d.success) toast.success('Hotel info saved')
      else toast.error(d.error ?? 'Failed to save')
    } catch { toast.error('Connection error') } finally { setSaving(false) }
  }

  const saveRoles = async () => {
    if (!currentPropertyId || currentPropertyId === 'ALL') { toast.error('Select a hotel first'); return }
    setSaving(true)
    try {
      // Convert boolean map → PermissionLevel strings for server-side checkPermission()
      const permissionLevels: Record<string, string> = {}
      Object.entries(permissions).forEach(([k, v]) => {
        permissionLevels[k] = v ? 'READ_WRITE' : 'NONE'
      })
      const r = await fetch('/api/admin/settings/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId: currentPropertyId, role: selectedRole, permissions: permissionLevels })
      })
      const d = await r.json()
      if (d.success) toast.success('Permissions saved')
      else toast.error(d.error ?? 'Failed to save')
    } catch { toast.error('Connection error') } finally { setSaving(false) }
  }

  const handleUpgrade = async (plan: PlanDef) => {
    if (!currentPropertyId || currentPropertyId === 'ALL') { toast.error('Select a hotel first'); return }
    setSaving(true)
    try {
      const oRes = await fetch('/api/admin/subscription/upgrade', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'CREATE_ORDER', planId: plan.plan, propertyId: currentPropertyId }) })
      const oData = await oRes.json()
      if (!oData.success) throw new Error(oData.error || 'Order failed')
      const opts = {
        key: oData.key, amount: oData.amount, currency: oData.currency,
        name: 'Zenbourg', description: `Upgrade to ${plan.displayName}`, order_id: oData.orderId,
        handler: async (resp: any) => {
          try {
            const vRes = await fetch('/api/admin/subscription/upgrade', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'VERIFY_PAYMENT', planId: plan.plan, propertyId: currentPropertyId, razorpayData: resp }) })
            const vData = await vRes.json()
            if (vData.success) {
              setHotelInfo(p => ({ ...p, plan: plan.plan }))
              toast.success(`Upgraded to ${plan.displayName}!`)
              // Dispatch event so Sidebar/usePermissions re-fetches live plan immediately
              window.dispatchEvent(new CustomEvent('planUpgraded', { detail: { plan: plan.plan, propertyId: currentPropertyId } }))
              // Also update the NextAuth session token so middleware stays in sync
              await update()
            }
            else toast.error(vData.error ?? 'Verification failed')
          } catch { toast.error('Verification error') } finally { setSaving(false) }
        },
        prefill: { name: session?.user?.name, email: session?.user?.email },
        theme: { color: '#4A9EFF' }, modal: { ondismiss: () => setSaving(false) },
      }
      new (window as any).Razorpay(opts).open()
    } catch (e: any) { toast.error(e.message || 'Upgrade failed'); setSaving(false) }
  }

  const ic = 'w-full bg-surface-light border border-border rounded-xl px-4 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary outline-none transition-all'
  const lc = 'text-xs font-semibold text-text-secondary block mb-1.5'

  const renderView = () => {
    if (view === 'BRANDING') return (
      <div className="space-y-6">
        <div className="bg-surface border border-border rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div><h3 className="text-base font-semibold text-white">Hotel Information</h3><p className="text-xs text-text-secondary mt-0.5">Update your hotel name, contact details and description</p></div>
            <Button onClick={saveBranding} loading={saving} variant="primary" className="text-sm"><Save className="w-4 h-4 mr-2" />Save</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className={lc}>Hotel Name</label><input value={hotelInfo.name} onChange={e => setHotelInfo(p => ({ ...p, name: e.target.value }))} className={ic} placeholder="e.g. Grand Palace Hotel" /></div>
            <div><label className={lc}>Email</label><input type="email" value={hotelInfo.email} onChange={e => setHotelInfo(p => ({ ...p, email: e.target.value }))} className={ic} placeholder="admin@hotel.com" /></div>
            <div><label className={lc}>Phone</label><input value={hotelInfo.phone} onChange={e => setHotelInfo(p => ({ ...p, phone: e.target.value }))} className={ic} placeholder="+91 98765 43210" /></div>
            <div><label className={lc}>Address</label><input value={hotelInfo.address} onChange={e => setHotelInfo(p => ({ ...p, address: e.target.value }))} className={ic} placeholder="Street, City, State" /></div>
          </div>
          <div><label className={lc}>Description</label><textarea rows={3} value={hotelInfo.description} onChange={e => setHotelInfo(p => ({ ...p, description: e.target.value }))} className={cn(ic, 'resize-none')} placeholder="Brief description of your hotel..." /></div>
        </div>
      </div>
    )

    if (view === 'ROLES') return (
      <div className="space-y-6">
        <div className="bg-surface border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div><h3 className="text-base font-semibold text-white">Roles & Permissions</h3><p className="text-xs text-text-secondary mt-0.5">Control what each staff role can access</p></div>
            <Button onClick={saveRoles} loading={saving} variant="primary" className="text-sm"><Save className="w-4 h-4 mr-2" />Save</Button>
          </div>
          <div className="flex gap-2 flex-wrap mb-6">
            {ROLES.map(r => (
              <button key={r.id} onClick={() => setSelectedRole(r.id)} className={cn('px-4 py-2 rounded-xl text-sm font-medium transition-all', selectedRole === r.id ? 'bg-primary text-white' : 'bg-surface-light text-text-secondary hover:text-white border border-border')}>
                {r.label}
              </button>
            ))}
          </div>
          <div className="space-y-6">
            {PERMISSIONS_SCHEMA.map(mod => (
              <div key={mod.id}>
                <p className="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-3">{mod.label}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {mod.permissions.map(perm => (
                    <div key={perm.id} className="flex items-center justify-between p-4 bg-surface-light border border-border rounded-xl">
                      <div><p className="text-sm font-medium text-white">{perm.label}</p><p className="text-xs text-text-secondary mt-0.5">{perm.desc}</p></div>
                      <Switch checked={!!permissions[perm.id]} onChange={() => setPermissions(p => ({ ...p, [perm.id]: !p[perm.id] }))} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )

    if (view === 'FINANCIAL') return <FinancialView propertyId={currentPropertyId} />

    if (view === 'OPS') return (
      <div className="space-y-6">
        <div className="bg-surface border border-border rounded-2xl p-6 space-y-5">
          <div><h3 className="text-base font-semibold text-white">Notification Settings</h3><p className="text-xs text-text-secondary mt-0.5">Control which alerts are sent to staff and guests</p></div>
          <div className="space-y-3">
            {[
              { id: 'smsAlerts',           label: 'SMS Alerts',              desc: 'Send SMS for bookings and service updates' },
              { id: 'pushNotifications',   label: 'Push Notifications',      desc: 'In-app push alerts for staff' },
              { id: 'emailAlerts',         label: 'Email Alerts',            desc: 'Email notifications for important events' },
              { id: 'bookingConfirmation', label: 'Booking Confirmation',    desc: 'Auto-send confirmation to guests on booking' },
              { id: 'checkoutReminder',    label: 'Checkout Reminder',       desc: 'Remind guests 1 hour before checkout' },
              { id: 'serviceUpdates',      label: 'Service Request Updates', desc: 'Notify guests when their request is completed' },
            ].map(n => (
              <div key={n.id} className="flex items-center justify-between p-4 bg-surface-light border border-border rounded-xl">
                <div><p className="text-sm font-medium text-white">{n.label}</p><p className="text-xs text-text-secondary mt-0.5">{n.desc}</p></div>
                <Switch checked={!!(notif as any)[n.id]} onChange={() => setNotif(p => ({ ...p, [n.id]: !(p as any)[n.id] }))} />
              </div>
            ))}
          </div>
          <Button onClick={() => toast.success('Notification settings saved')} variant="primary" className="text-sm"><Save className="w-4 h-4 mr-2" />Save Settings</Button>
        </div>
      </div>
    )

    if (view === 'SUBSCRIPTION') return (
      <SubscriptionView propertyId={currentPropertyId} currentPlan={hotelInfo.plan} onUpgrade={handleUpgrade} />
    )

    if (view === 'INTEGRATIONS') return (
      <div className="space-y-6">
        <div className="bg-surface border border-border rounded-2xl p-6 space-y-4">
          <div><h3 className="text-base font-semibold text-white">Integrations & Channels</h3><p className="text-xs text-text-secondary mt-0.5">Connect OTA channels, payment gateways and communication tools</p></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {INTEGRATIONS.map(intg => (
              <div key={intg.id} className="flex items-center justify-between p-4 bg-surface-light border border-border rounded-xl">
                <div><p className="text-sm font-semibold text-white">{intg.name}</p><p className="text-xs text-text-secondary mt-0.5">{intg.type}</p></div>
                <div className="flex items-center gap-3">
                  <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', intg.status === 'CONNECTED' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-surface text-text-tertiary border border-border')}>
                    {intg.status === 'CONNECTED' ? 'Connected' : 'Not Connected'}
                  </span>
                  <button className="text-xs text-primary hover:underline font-medium">{intg.status === 'CONNECTED' ? 'Manage' : 'Connect'}</button>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
            <p className="text-xs text-amber-400 font-medium">OTA channel sync requires the Standard or Enterprise plan. Contact support to enable.</p>
          </div>
        </div>
      </div>
    )

    if (view === 'RETENTION') return (
      <div className="space-y-6">
        <div className="bg-surface border border-border rounded-2xl p-6 space-y-5">
          <div><h3 className="text-base font-semibold text-white">Data Retention</h3><p className="text-xs text-text-secondary mt-0.5">Configure how long different types of data are stored</p></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className={lc}>Guest Profiles</label><select value={retention.guestProfiles} onChange={e => setRetention(p => ({ ...p, guestProfiles: e.target.value }))} className={cn(ic, 'appearance-none cursor-pointer')}><option value="1_YEAR">1 Year</option><option value="3_YEARS">3 Years</option><option value="5_YEARS">5 Years</option><option value="FOREVER">Forever</option></select></div>
            <div><label className={lc}>Financial Records</label><select value={retention.financials} onChange={e => setRetention(p => ({ ...p, financials: e.target.value }))} className={cn(ic, 'appearance-none cursor-pointer')}><option value="3_YEARS">3 Years</option><option value="5_YEARS">5 Years</option><option value="7_YEARS">7 Years</option><option value="FOREVER">Forever</option></select></div>
            <div><label className={lc}>Service Logs</label><select value={retention.serviceLogs} onChange={e => setRetention(p => ({ ...p, serviceLogs: e.target.value }))} className={cn(ic, 'appearance-none cursor-pointer')}><option value="30_DAYS">30 Days</option><option value="90_DAYS">90 Days</option><option value="1_YEAR">1 Year</option><option value="3_YEARS">3 Years</option></select></div>
          </div>
          <div className="flex items-center justify-between p-4 bg-surface-light border border-border rounded-xl">
            <div><p className="text-sm font-medium text-white">Legal Hold Mode</p><p className="text-xs text-text-secondary mt-0.5">Prevent deletion of any data (for compliance/audit)</p></div>
            <Switch checked={retention.legalHoldMode} onChange={() => setRetention(p => ({ ...p, legalHoldMode: !p.legalHoldMode }))} />
          </div>
          <Button onClick={() => toast.success('Retention settings saved')} variant="primary" className="text-sm"><Save className="w-4 h-4 mr-2" />Save Settings</Button>
        </div>
      </div>
    )

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {NAV.map(item => (
          <button key={item.id} onClick={() => setView(item.id.toUpperCase())}
            className="group p-5 bg-surface border border-border rounded-2xl text-left hover:border-primary/40 hover:bg-surface-light transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-surface-light border border-border flex items-center justify-center text-text-secondary group-hover:text-primary group-hover:border-primary/30 transition-all">
                <item.icon className="w-5 h-5" />
              </div>
              <ChevronRight className="w-4 h-4 text-text-tertiary group-hover:text-primary transition-all group-hover:translate-x-0.5" />
            </div>
            <h3 className="text-sm font-semibold text-white mb-1">{item.label}</h3>
            <p className="text-xs text-text-secondary leading-relaxed">{item.desc}</p>
          </button>
        ))}
      </div>
    )
  }

  const viewTitle: Record<string, string> = {
    OVERVIEW: 'Settings', BRANDING: 'General Info', ROLES: 'Roles & Permissions',
    FINANCIAL: 'Financial & Tax', OPS: 'Notifications', SUBSCRIPTION: 'Subscription & Plans',
    INTEGRATIONS: 'Integrations', RETENTION: 'Data Retention',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        {view !== 'OVERVIEW' && (
          <button onClick={() => setView('OVERVIEW')} className="w-9 h-9 flex items-center justify-center rounded-xl bg-surface-light border border-border hover:border-primary/40 transition-all">
            <ChevronLeft className="w-4 h-4 text-text-secondary" />
          </button>
        )}
        <div>
          <h1 className="text-xl font-bold text-white">{viewTitle[view] ?? view}</h1>
          {view !== 'OVERVIEW' && <p className="text-xs text-text-secondary mt-0.5">{NAV.find(n => n.id.toUpperCase() === view)?.desc}</p>}
        </div>
      </div>
      {renderView()}
    </div>
  )
}
