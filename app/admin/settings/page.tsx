'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import {
  Save, Building2, IndianRupee, Sparkles, Shield, Smartphone,
  Database, Globe, ChevronRight, ChevronLeft, Loader2,
  Calendar, Check, CheckCircle2, Bell, Zap, ShieldAlert, ClipboardList,
  Star, Crown, BedDouble, Users, CreditCard, Eye, EyeOff, AlertCircle, X, MessageSquare
} from 'lucide-react'
import { cn, validateGSTIN } from '@/lib/utils'
import { toast } from 'sonner'
import { getAdminContext } from '@/lib/admin-context'
import Switch from '@/components/ui/Switch'
import Button from '@/components/ui/Button'
import { uploadToCloudinary } from '@/lib/cloudinary'

interface HotelInfo {
  name: string; description: string; address: string; phone: string; email: string
  plan: string; features: string[]; planExpiresAt: string | null; ranking: number
  isTrialActive?: boolean; isAutopayActive?: boolean;
  coverImage?: string | null; logo?: string | null;
  images?: string[];
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
  { id: 'payouts',      label: 'Payouts & Withdrawals',icon: CreditCard,  desc: 'Request withdrawals and view transaction logs' },
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
    gstNumber: '',
    defaultDiscountPercent: 0, discountLabel: 'Discount',
    invoicePrefix: 'INV', invoiceFooter: '',
    checkInTime: '14:00', checkOutTime: '11:00',
    // Bank
    bankAccountName: '', bankAccountNumber: '', reenterBankAccountNumber: '', bankIfscCode: '',
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
            gstNumber: d.gstNumber ?? '',
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
      if (s.bankAccountNumber) {
          if (s.bankAccountNumber !== s.reenterBankAccountNumber) {
              toast.error('Account numbers do not match')
              setSaving(false)
              return
          }
      } else {
          delete payload.bankAccountNumber
      }

      const res = await fetch('/api/admin/settings/financial', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const j = await res.json()
      if (j.success) {
        toast.success('Financial settings saved')
        if (j.data?.bankAccountNumberMasked) setMaskedAccount(j.data.bankAccountNumberMasked)
        setS(p => ({ ...p, bankAccountNumber: '', reenterBankAccountNumber: '' }))
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
          <div className="space-y-1.5 md:col-span-2 bg-[#182433]/60 border border-white/5 rounded-xl p-3.5">
            <label className={lc}>Hotel GST Number (GSTIN)</label>
            <p className="text-[11px] text-text-tertiary">Official 15-character GSTIN displayed on all hotel tax invoices</p>
            <div className="relative mt-1">
              <input
                type="text"
                placeholder="e.g. 22AAAAA0000A1Z5"
                value={s.gstNumber}
                onChange={e => setS(p => ({ ...p, gstNumber: e.target.value.toUpperCase() }))}
                className={cn(ic, "font-mono uppercase tracking-wide")}
              />
            </div>
            {(() => {
              if (!s.gstNumber) return null
              const v = validateGSTIN(s.gstNumber)
              return (
                <div className={cn("text-xs font-semibold flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg border", v.isValid ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border-rose-500/20 text-rose-400")}>
                  {v.isValid ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" /> : <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />}
                  <span>{v.message}</span>
                </div>
              )
            })()}
          </div>
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
              <input type="text" onCopy={e => e.preventDefault()} onPaste={e => e.preventDefault()} value={s.bankAccountNumber} onChange={e => setS(p => ({ ...p, bankAccountNumber: e.target.value }))} className={ic} placeholder="Enter account number" />
            )}
          </div>
          {(!maskedAccount || showAccountNumber) && (
            <div className="space-y-1.5">
              <label className={lc}>Re-enter Account Number</label>
              <input type="password" onCopy={e => e.preventDefault()} onPaste={e => e.preventDefault()} value={s.reenterBankAccountNumber} onChange={e => setS(p => ({ ...p, reenterBankAccountNumber: e.target.value }))} className={ic} placeholder="Re-enter account number" />
            </div>
          )}
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
      </div>

      {/* ── Demo Review ── */}
      <div className="bg-surface border border-border rounded-2xl p-6">
        <h3 className="text-base font-semibold text-white mb-4">Demo Review — ₹5,000 room charge</h3>
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
// Map legacy plan names to new ones (for properties that still have old plan in DB)
const LEGACY_PLAN_MAP: Record<string, string> = {
  GOLD: 'BASE', PLATINUM: 'STARTER', DIAMOND: 'STANDARD',
}

const PLAN_ORDER = ['BASE', 'STARTER', 'STANDARD', 'ENTERPRISE']

function SubscriptionView({ propertyId, currentPlan, isTrialActive, isAutopayActive, planExpiresAt, onUpgrade, onCancelAutopay }: {
  propertyId: string | null | undefined
  currentPlan: string
  isTrialActive?: boolean
  isAutopayActive?: boolean
  planExpiresAt?: string | null
  onUpgrade: (plan: PlanDef) => void
  onCancelAutopay: () => void
}) {
  const { data: session } = useSession()
  const isSuper = session?.user?.role === 'SUPER_ADMIN'

  const [plans, setPlans] = useState<PlanDef[]>([])
  const [loading, setLoading] = useState(true)

  // Request forms states
  const [customModal, setCustomModal] = useState(false)
  const [addHotelModal, setAddHotelModal] = useState(false)
  const [numHotels, setNumHotels] = useState('')
  const [roomDetails, setRoomDetails] = useState('')
  const [hotelName, setHotelName] = useState('')
  const [hotelAddress, setHotelAddress] = useState('')
  const [numRooms, setNumRooms] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Custom Pricing requests states
  const [customRequests, setCustomRequests] = useState<any[]>([])
  const [addHotelRequests, setAddHotelRequests] = useState<any[]>([])
  const [pricingQuote, setPricingQuote] = useState<Record<string, string>>({})

  const loadPlans = useCallback(() => {
    setLoading(true)
    fetch('/api/admin/subscription-plans')
      .then(r => r.json())
      .then(j => { if (j.success && j.data) setPlans(j.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const loadRequests = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/custom-pricing')
      const d = await res.json()
      if (d.success) {
        setCustomRequests(d.customRequests)
        setAddHotelRequests(d.addHotelRequests)
      }
    } catch {}
  }, [])

  useEffect(() => {
    loadPlans()
    loadRequests()
  }, [loadPlans, loadRequests])

  const handleCustomSubmit = async () => {
    if (!numHotels || parseInt(numHotels) <= 0) { toast.error('Enter a valid number of hotels'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/custom-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CREATE_CUSTOM_PRICE_REQUEST', numHotels, roomDetails })
      })
      const d = await res.json()
      if (d.success) {
        toast.success('Custom Pricing request sent to Super Admin!')
        setCustomModal(false)
        setNumHotels('')
        setRoomDetails('')
        loadRequests()
      } else {
        toast.error(d.error || 'Failed to submit')
      }
    } catch { toast.error('Connection error') } finally { setSubmitting(false) }
  }

  const handleAddHotelSubmit = async () => {
    if (!hotelName.trim() || !hotelAddress.trim()) { toast.error('Fill in all fields'); return }
    if (!numRooms || parseInt(numRooms) <= 0) { toast.error('Enter a valid room count'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/custom-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CREATE_ADD_HOTEL_REQUEST', hotelName, hotelAddress, numRooms })
      })
      const d = await res.json()
      if (d.success) {
        toast.success('Hotel Portfolio expansion request sent to Super Admin!')
        setAddHotelModal(false)
        setHotelName('')
        setHotelAddress('')
        setNumRooms('')
        loadRequests()
      } else {
        toast.error(d.error || 'Failed to submit')
      }
    } catch { toast.error('Connection error') } finally { setSubmitting(false) }
  }

  const handleSetPriceQuote = async (requestId: string, type: 'CUSTOM_PRICE' | 'ADD_HOTEL') => {
    const val = parseFloat(pricingQuote[requestId] ?? '')
    if (isNaN(val) || val < 0) { toast.error('Enter a valid price'); return }
    try {
      const res = await fetch('/api/admin/custom-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SET_PRICE_QUOTE', requestId, type, customPrice: val })
      })
      const d = await res.json()
      if (d.success) {
        toast.success('Pricing quote approved and sent to owner!')
        loadRequests()
      } else {
        toast.error(d.error || 'Failed to quote price')
      }
    } catch { toast.error('Connection error') }
  }

  const handlePayFirst = async (requestId: string, type: 'CUSTOM_PRICE' | 'ADD_HOTEL', amount: number) => {
    const toastId = toast.loading('Connecting to Razorpay gateway...')
    setTimeout(async () => {
      try {
        const res = await fetch('/api/admin/custom-pricing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'PAY_FIRST', requestId, type })
        })
        const d = await res.json()
        if (d.success) {
          toast.success(`Payment of ₹${amount.toLocaleString()} processed successfully! Multi-hotel tier is now active.`, { id: toastId })
          window.location.reload()
        } else {
          toast.error(d.error || 'Failed to process payment', { id: toastId })
        }
      } catch { toast.error('Connection error', { id: toastId }) }
    }, 1500)
  }

  if (loading) return <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>

  const normalizedPlan = LEGACY_PLAN_MAP[currentPlan] ?? currentPlan
  const sortedPlans = [...plans].sort((a, b) => {
    const ai = PLAN_ORDER.indexOf(a.plan)
    const bi = PLAN_ORDER.indexOf(b.plan)
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })
  const activePlan = sortedPlans.find(p => p.plan === normalizedPlan) ?? sortedPlans[0]

  const PLAN_ICONS: Record<string, any> = { BASE: Star, STARTER: Zap, STANDARD: Crown, ENTERPRISE: Sparkles }
  const PLAN_COLORS: Record<string, string> = { BASE: 'text-text-secondary', STARTER: 'text-amber-500', STANDARD: 'text-[#4A9EFF]', ENTERPRISE: 'text-purple-400' }

  return (
    <div className="space-y-6">
      {/* Current plan banner */}
      {activePlan && (
        <div className="bg-primary/10 border border-primary/30 rounded-2xl p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {(() => { const Icon = PLAN_ICONS[activePlan.plan] ?? Star; return <Icon className={cn('w-5 h-5', PLAN_COLORS[activePlan.plan] ?? 'text-primary')} /> })()}
            <div>
              <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">Current Plan</p>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-base font-bold text-white">{activePlan.displayName ?? activePlan.plan}</p>
                {isTrialActive && <span className="text-[10px] font-bold bg-amber-500/25 text-amber-400 border border-amber-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">Free Trial</span>}
                {isAutopayActive && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold bg-emerald-500/25 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">Autopay Active</span>
                    <button onClick={onCancelAutopay} className="text-[9px] text-red-400 hover:text-red-300 uppercase font-bold tracking-widest transition-colors ml-1 border border-red-500/20 px-2 py-0.5 rounded-full bg-red-500/10">Cancel Mandate</button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            {activePlan.plan !== 'ENTERPRISE' ? <p className="text-lg font-bold text-white">₹{(activePlan.discountedPrice ?? 0).toLocaleString()} <span className="text-xs text-text-tertiary">/mo</span></p> : <p className="text-sm font-bold text-white">Custom Pricing</p>}
          </div>
        </div>
      )}

      {/* Plans grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sortedPlans.map(plan => {
          const Icon = PLAN_ICONS[plan.plan] ?? Star
          const isActive = plan.plan === normalizedPlan
          return (
            <div key={plan.plan} className={cn('relative flex flex-col border rounded-2xl p-5 transition-all', isActive ? 'bg-primary/10 border-primary/40' : 'bg-surface border-border hover:border-primary/30')}>
              <div className="flex items-start gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-surface-light"><Icon className={cn('w-4 h-4', PLAN_COLORS[plan.plan])} /></div>
                <div><h4 className="text-sm font-bold text-white">{plan.displayName ?? plan.plan}</h4><p className="text-[11px] text-text-secondary mt-0.5">{plan.tagline}</p></div>
              </div>
              <div className="mb-4">
                {plan.plan !== 'ENTERPRISE' ? <p className="text-2xl font-bold text-white">₹{(plan.discountedPrice ?? 0).toLocaleString()}<span className="text-xs text-text-tertiary">/-mo</span></p> : <p className="text-lg font-bold text-white">Custom Multi-Hotel</p>}
              </div>
              <div className="space-y-1.5 mb-5 flex-1 text-xs text-text-secondary">
                {(plan.features ?? []).map((f: string, i: number) => <div key={i} className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-primary" /><span>{f}</span></div>)}
              </div>
              {isActive ? <span className="text-xs text-primary font-semibold font-bold">Current Plan</span> : plan.plan === 'ENTERPRISE' ? (
                <Button onClick={() => setCustomModal(true)} variant="secondary" className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10">Request Custom Pricing</Button>
              ) : <Button onClick={() => onUpgrade(plan)} variant="primary">Upgrade to {plan.displayName ?? plan.plan}</Button>}
            </div>
          )
        })}
      </div>

      {/* PORTFOLIO EXPANSION FOR CURRENT CUSTOM OWNERS */}
      {!isSuper && currentPlan === 'ENTERPRISE' && (
        <div className="bg-surface border border-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div><h3 className="text-base font-semibold text-white">Hotel Portfolio expansion</h3><p className="text-xs text-text-secondary mt-0.5">Request approval to register another hotel to your active dashboard</p></div>
            <Button onClick={() => setAddHotelModal(true)} variant="primary" className="text-xs py-1.5">Request New Hotel Addition</Button>
          </div>
        </div>
      )}

      {/* REQUESTS HISTORY & SUPER ADMIN MANAGEMENT LEDGER */}
      <div className="bg-surface border border-border rounded-2xl p-6 space-y-5">
        <div>
          <h3 className="text-base font-semibold text-white">{isSuper ? 'Multi-Hotel & Custom Pricing Requests Dashboard' : 'Your Multi-Hotel Portfolio Requests'}</h3>
          <p className="text-xs text-text-secondary mt-0.5">{isSuper ? 'Provide custom pricing quotes and audit incoming SaaS registration approvals' : 'Track the review, quotation, and Razorpay payment status of your portfolio extensions'}</p>
        </div>

        <div className="space-y-4">
          {/* Custom pricing requests list */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-primary tracking-wider uppercase">Custom Multi-Hotel Plan Requests</p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border text-text-secondary uppercase tracking-wider pb-2">
                    <th className="pb-2">Requested By</th>
                    <th className="pb-2">Hotels Requested</th>
                    <th className="pb-2">Room Specs</th>
                    <th className="pb-2">Custom Price Quote</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-white">
                  {customRequests.length === 0 ? <tr><td colSpan={6} className="py-4 text-center text-text-secondary">No custom plan requests found</td></tr> : customRequests.map(r => (
                    <tr key={r.id}>
                      <td className="py-3 font-medium">{r.userEmail ?? 'SaaS Customer'}</td>
                      <td className="py-3 font-bold">{r.numHotels} Hotels</td>
                      <td className="py-3 text-text-secondary">{r.roomDetails}</td>
                      <td className="py-3 font-bold">{r.customPrice ? `₹${r.customPrice.toLocaleString()}/mo` : 'Pending review...'}</td>
                      <td className="py-3">
                        <span className={cn('px-2 py-0.5 rounded-full text-[9px] font-bold uppercase', r.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-400' : r.status === 'PRICED' ? 'bg-[#4A9EFF]/10 text-[#4A9EFF]' : 'bg-orange-500/10 text-orange-400')}>{r.status}</span>
                      </td>
                      <td className="py-3 text-right">
                        {isSuper && r.status === 'PENDING' ? (
                          <div className="flex items-center justify-end gap-2">
                            <input type="number" placeholder="Set price" value={pricingQuote[r.id] ?? ''} onChange={e => setPricingQuote(p => ({ ...p, [r.id]: e.target.value }))} className="bg-surface-light border border-border rounded-lg px-2 py-1 text-xs text-white outline-none w-24" />
                            <Button onClick={() => handleSetPriceQuote(r.id, 'CUSTOM_PRICE')} variant="primary" className="text-[10px] py-1 px-2.5">Approve Quote</Button>
                          </div>
                        ) : !isSuper && r.status === 'PRICED' ? (
                          <Button onClick={() => handlePayFirst(r.id, 'CUSTOM_PRICE', r.customPrice)} variant="primary" className="text-[10px] py-1 px-3 bg-emerald-600 hover:bg-emerald-500">Pay First (Razorpay)</Button>
                        ) : <span className="text-text-tertiary">-</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add hotel requests list */}
          <div className="space-y-3 pt-4 border-t border-border">
            <p className="text-xs font-bold text-primary tracking-wider uppercase">Hotel Portfolio Extension Requests</p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border text-text-secondary uppercase tracking-wider pb-2">
                    <th className="pb-2">Requested By</th>
                    <th className="pb-2">New Hotel Name</th>
                    <th className="pb-2">Room Count</th>
                    <th className="pb-2">Extension Price Quote</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-white">
                  {addHotelRequests.length === 0 ? <tr><td colSpan={6} className="py-4 text-center text-text-secondary">No hotel extension requests found</td></tr> : addHotelRequests.map(r => (
                    <tr key={r.id}>
                      <td className="py-3 font-medium">{r.userEmail ?? 'SaaS Owner'}</td>
                      <td className="py-3 font-bold">{r.hotelName} <span className="text-[10px] text-text-secondary block font-normal">{r.hotelAddress}</span></td>
                      <td className="py-3 text-text-secondary">{r.numRooms} Rooms</td>
                      <td className="py-3 font-bold">{r.customPrice ? `₹${r.customPrice.toLocaleString()}` : 'Pending review...'}</td>
                      <td className="py-3">
                        <span className={cn('px-2 py-0.5 rounded-full text-[9px] font-bold uppercase', r.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-400' : r.status === 'PRICED' ? 'bg-[#4A9EFF]/10 text-[#4A9EFF]' : 'bg-orange-500/10 text-orange-400')}>{r.status}</span>
                      </td>
                      <td className="py-3 text-right">
                        {isSuper && r.status === 'PENDING' ? (
                          <div className="flex items-center justify-end gap-2">
                            <input type="number" placeholder="Set price" value={pricingQuote[r.id] ?? ''} onChange={e => setPricingQuote(p => ({ ...p, [r.id]: e.target.value }))} className="bg-surface-light border border-border rounded-lg px-2 py-1 text-xs text-white outline-none w-24" />
                            <Button onClick={() => handleSetPriceQuote(r.id, 'ADD_HOTEL')} variant="primary" className="text-[10px] py-1 px-2.5">Approve Quote</Button>
                          </div>
                        ) : !isSuper && r.status === 'PRICED' ? (
                          <Button onClick={() => handlePayFirst(r.id, 'ADD_HOTEL', r.customPrice)} variant="primary" className="text-[10px] py-1 px-3 bg-emerald-600 hover:bg-emerald-500">Pay First (Razorpay)</Button>
                        ) : <span className="text-text-tertiary">-</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* CUSTOM PRICE MODAL */}
      {customModal && (
        <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#0d1117] border border-border rounded-2xl max-w-md w-full p-6 space-y-5 text-left">
            <div>
              <h4 className="text-lg font-bold text-white">Request Custom Multi-Hotel Plan</h4>
              <p className="text-xs text-text-secondary mt-1">Submit your requirements. Super Admin will review and provide a customized quote directly here.</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-text-secondary block mb-1.5">How many hotels do you plan to manage?</label>
                <input type="number" value={numHotels} onChange={e => setNumHotels(e.target.value)} className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-primary" placeholder="e.g. 5" />
              </div>
              <div>
                <label className="text-xs font-semibold text-text-secondary block mb-1.5">Describe your average rooms per hotel & extra requirements</label>
                <textarea rows={3} value={roomDetails} onChange={e => setRoomDetails(e.target.value)} className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-primary resize-none" placeholder="e.g. Average 50 rooms per hotel, custom reporting roles..." />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={() => setCustomModal(false)} variant="secondary" className="flex-1 text-sm py-2">Cancel</Button>
              <Button onClick={handleCustomSubmit} loading={submitting} variant="primary" className="flex-1 text-sm py-2">Send Request</Button>
            </div>
          </div>
        </div>
      )}

      {/* ADD HOTEL MODAL */}
      {addHotelModal && (
        <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#0d1117] border border-border rounded-2xl max-w-md w-full p-6 space-y-5 text-left">
            <div>
              <h4 className="text-lg font-bold text-white">Request Hotel Portfolio Addition</h4>
              <p className="text-xs text-text-secondary mt-1">Add another hotel to your portfolio. Pricing is set dynamically by the Super Admin.</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-text-secondary block mb-1.5">New Hotel Name</label>
                <input value={hotelName} onChange={e => setHotelName(e.target.value)} className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-primary" placeholder="Zenbourg Palace" />
              </div>
              <div>
                <label className="text-xs font-semibold text-text-secondary block mb-1.5">Hotel Location / Address</label>
                <input value={hotelAddress} onChange={e => setHotelAddress(e.target.value)} className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-primary" placeholder="MG Road, Bangalore" />
              </div>
              <div>
                <label className="text-xs font-semibold text-text-secondary block mb-1.5">Number of Rooms</label>
                <input type="number" value={numRooms} onChange={e => setNumRooms(e.target.value)} className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-primary" placeholder="40" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={() => setAddHotelModal(false)} variant="secondary" className="flex-1 text-sm py-2">Cancel</Button>
              <Button onClick={handleAddHotelSubmit} loading={submitting} variant="primary" className="flex-1 text-sm py-2">Submit Request</Button>
            </div>
          </div>
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
  const [hotelInfo, setHotelInfo] = useState<HotelInfo>({ name: '', description: '', address: '', phone: '', email: '', plan: 'BASE', features: [], planExpiresAt: null, ranking: 0, isTrialActive: false, isAutopayActive: false, coverImage: null, logo: null, images: [] })
  const [selectedRole, setSelectedRole] = useState('MANAGER')
  const [permissions, setPermissions] = useState<Record<string, boolean>>({})
  const [notif, setNotif] = useState({ smsAlerts: false, pushNotifications: true, emailAlerts: true, bookingConfirmation: true, checkoutReminder: true, serviceUpdates: true })
  const [retention, setRetention] = useState({ guestProfiles: '3_YEARS', financials: '7_YEARS', serviceLogs: '1_YEAR', legalHoldMode: false })

  const [activePropertyId, setActivePropertyId] = useState('')
  const [myProperties, setMyProperties] = useState<any[]>([])

  const currentPropertyId = useMemo(() => session?.user?.role === 'SUPER_ADMIN' ? getAdminContext()?.propertyId : session?.user?.propertyId, [session])
  const effectivePropertyId = activePropertyId || currentPropertyId

  const [otaConnections, setOtaConnections] = useState<any[]>([])
  
  const [airbnbConnected, setAirbnbConnected] = useState(false)
  const [showTwilioModal, setShowTwilioModal] = useState(false)
  const [showRazorpayModal, setShowRazorpayModal] = useState(false)
  const [airbnbMappings, setAirbnbMappings] = useState<any[]>([])
  const [airbnbRooms, setAirbnbRooms] = useState<any[]>([])
  const [showAirbnbModal, setShowAirbnbModal] = useState(false)
  
  const [showOtaModal, setShowOtaModal] = useState<any | null>(null)

  const fetchIntegrations = useCallback(async () => {
    if (!effectivePropertyId || effectivePropertyId === 'ALL') return
    try {
      const resAir = await fetch(`/api/admin/settings/integrations/airbnb?propertyId=${effectivePropertyId}`)
      const dAir = await resAir.json()
      if (dAir.success) {
        setAirbnbConnected(dAir.data.connected)
        setAirbnbMappings(dAir.data.mappings)
        setAirbnbRooms(dAir.data.rooms)
      }

      const resAll = await fetch(`/api/admin/settings/integrations?propertyId=${effectivePropertyId}`)
      const dAll = await resAll.json()
      if (dAll.success) {
        setOtaConnections(dAll.data.connections)
      }
    } catch {}
  }, [effectivePropertyId])

  useEffect(() => {
    fetchIntegrations()
  }, [fetchIntegrations])

  const INTEGRATIONS = [
    { id: 'airbnb',       name: 'Airbnb',        type: 'Travel & Booking', status: airbnbConnected ? 'CONNECTED' : 'NOT_CONNECTED' },
    { id: 'booking_com',  name: 'Booking.com',   type: 'OTA Channel',      status: otaConnections.some(c => c.otaName === 'BOOKING_COM') ? 'CONNECTED' : 'NOT_CONNECTED' },
    { id: 'makemytrip',   name: 'MakeMyTrip',    type: 'OTA Channel',      status: otaConnections.some(c => c.otaName === 'MAKE_MY_TRIP') ? 'CONNECTED' : 'NOT_CONNECTED' },
    { id: 'agoda',        name: 'Agoda',         type: 'OTA Channel',      status: otaConnections.some(c => c.otaName === 'AGODA') ? 'CONNECTED' : 'NOT_CONNECTED' },
    { id: 'razorpay',     name: 'Razorpay',      type: 'Payment Gateway',  status: 'CONNECTED' },
    { id: 'twilio',       name: 'Twilio',        type: 'SMS / WhatsApp',   status: 'CONNECTED' },
  ]

  useEffect(() => {
    if (currentPropertyId) setActivePropertyId(currentPropertyId)
  }, [currentPropertyId])

  useEffect(() => {
    const loadProps = async () => {
      try {
        const res = await fetch('/api/admin/settings/property?listAll=true')
        const d = await res.json()
        if (d.success && d.properties) {
          setMyProperties(d.properties)
        }
      } catch {}
    }
    loadProps()
  }, [])

  const fetchProperty = useCallback(async () => {
    if (!effectivePropertyId || effectivePropertyId === 'ALL') return
    try {
      const r = await fetch(`/api/admin/settings/property?propertyId=${effectivePropertyId}`)
      const d = await r.json()
      if (d.success && d.property) setHotelInfo(d.property)
    } catch { /* silent */ }
  }, [effectivePropertyId])

  const fetchRoles = useCallback(async () => {
    if (!effectivePropertyId || effectivePropertyId === 'ALL') return
    try {
      const r = await fetch(`/api/admin/settings/roles?propertyId=${effectivePropertyId}`)
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
  }, [effectivePropertyId, selectedRole])

  useEffect(() => { fetchProperty() }, [fetchProperty])
  useEffect(() => { fetchRoles() }, [fetchRoles])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'logo' | 'coverImage') => {
    const file = e.target.files?.[0]
    if (!file) return
    const toastId = toast.loading(`Uploading ${field === 'logo' ? 'logo' : 'cover photo'} to Cloudinary...`)
    try {
      const result = await uploadToCloudinary(file, 'hotels')
      setHotelInfo(p => ({ ...p, [field]: result.url }))
      toast.success(`${field === 'logo' ? 'Logo' : 'Cover photo'} uploaded to Cloudinary successfully!`, { id: toastId })
    } catch (err) {
      console.error(err)
      toast.error('Failed to upload image to Cloudinary.', { id: toastId })
    }
  }

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    const toastId = toast.loading('Uploading gallery image(s) to Cloudinary...')
    try {
      const newUrls: string[] = []
      for (let i = 0; i < files.length; i++) {
        const result = await uploadToCloudinary(files[i], 'hotels/gallery')
        newUrls.push(result.url)
      }
      setHotelInfo(p => ({
        ...p,
        images: [...(p.images || []), ...newUrls]
      }))
      toast.success('Gallery image(s) uploaded successfully!', { id: toastId })
    } catch (err) {
      console.error(err)
      toast.error('Failed to upload one or more images.', { id: toastId })
    }
  }

  const removeGalleryImage = (index: number) => {
    setHotelInfo(p => ({
      ...p,
      images: (p.images || []).filter((_, i) => i !== index)
    }))
  }

  const saveBranding = async () => {
    if (!currentPropertyId || currentPropertyId === 'ALL') { toast.error('Select a hotel first'); return }
    setSaving(true)
    try {
      // Only send editable branding fields — never send plan/features (those are SUPER_ADMIN only)
      const { name, description, address, phone, email, logo, coverImage, images } = hotelInfo
      const r = await fetch('/api/admin/settings/property', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId: currentPropertyId, name, description, address, phone, email, logo, coverImage, images })
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

  const handleCancelAutopay = async () => {
    if (!currentPropertyId || currentPropertyId === 'ALL') return
    if (!confirm('Are you sure you want to cancel your UPI Autopay and Free Trial? Doing so will immediately downgrade your hotel to the unpaid Base plan.')) return

    setSaving(true)
    try {
      const res = await fetch('/api/admin/subscription/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId: currentPropertyId })
      })
      const d = await res.json()
      if (d.success) {
        toast.success('Autopay & Trial cancelled successfully. Downgraded to Base plan.')
        setHotelInfo(p => ({
          ...p,
          plan: 'BASE',
          isTrialActive: false,
          isAutopayActive: false,
          planExpiresAt: null,
        }))
        await update()
      } else {
        toast.error(d.error || 'Failed to cancel Autopay')
      }
    } catch {
      toast.error('Connection error')
    } finally {
      setSaving(false)
    }
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

          {/* Logo & Cover Image Upload Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            <div className="md:col-span-1 flex flex-col items-center justify-center p-4 bg-surface-light border border-white/[0.05] rounded-xl">
              <label className="text-xs font-semibold text-text-secondary mb-3">Hotel Logo</label>
              <div className="relative w-24 h-24 rounded-full border border-white/[0.05] bg-[#0d1117] flex items-center justify-center overflow-hidden group">
                {hotelInfo.logo ? (
                  <img src={hotelInfo.logo} className="w-full h-full object-cover" alt="Logo" />
                ) : (
                  <Building2 className="w-10 h-10 text-gray-500" />
                )}
                <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] text-white font-semibold cursor-pointer transition-all">
                  Upload
                  <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'logo')} className="hidden" />
                </label>
              </div>
              {hotelInfo.logo && (
                <button onClick={() => setHotelInfo(p => ({ ...p, logo: null }))} className="text-[10px] text-red-500 font-medium mt-2 hover:underline">Remove logo</button>
              )}
            </div>

            <div className="md:col-span-2 flex flex-col p-4 bg-surface-light border border-white/[0.05] rounded-xl justify-center">
              <label className="text-xs font-semibold text-text-secondary mb-3">Cover Image</label>
              <div className="relative h-24 rounded-lg border border-white/[0.05] bg-[#0d1117] flex items-center justify-center overflow-hidden group">
                {hotelInfo.coverImage ? (
                  <img src={hotelInfo.coverImage} className="w-full h-full object-cover" alt="Cover" />
                ) : (
                  <div className="text-center">
                    <p className="text-xs text-text-secondary">Click to upload cover photo</p>
                    <p className="text-[10px] text-gray-500 mt-1">PNG, JPG up to 5MB</p>
                  </div>
                )}
                <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs text-white font-semibold cursor-pointer transition-all">
                  Upload Cover Photo
                  <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'coverImage')} className="hidden" />
                </label>
              </div>
              {hotelInfo.coverImage && (
                <button onClick={() => setHotelInfo(p => ({ ...p, coverImage: null }))} className="text-[10px] text-red-500 font-medium mt-2 self-start hover:underline">Remove cover photo</button>
              )}
            </div>
          </div>

          {/* Hotel Gallery Upload Section */}
          <div className="flex flex-col p-4 bg-surface-light border border-white/[0.05] rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-semibold text-text-secondary block">Hotel Photo Gallery</label>
                <p className="text-[10px] text-gray-500 mt-0.5">These photos will appear in your mobile app&apos;s auto-sliding banner carousel</p>
              </div>
              <label className="bg-[#4A9EFF] hover:bg-[#4A9EFF]/90 text-white text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-all">
                Add Photos
                <input type="file" accept="image/*" multiple onChange={handleGalleryUpload} className="hidden" />
              </label>
            </div>

            {hotelInfo.images && hotelInfo.images.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {hotelInfo.images.map((imgUrl, idx) => (
                  <div key={idx} className="relative aspect-video rounded-lg border border-white/[0.05] overflow-hidden group">
                    <img src={imgUrl} className="w-full h-full object-cover" alt={`Gallery ${idx + 1}`} />
                    <button 
                      onClick={() => removeGalleryImage(idx)}
                      className="absolute top-1.5 right-1.5 bg-black/70 hover:bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remove photo"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border border-dashed border-white/[0.05] rounded-lg p-6 text-center bg-[#0d1117]">
                <p className="text-xs text-text-secondary">No gallery images uploaded yet</p>
                <p className="text-[10px] text-gray-500 mt-1">Upload 2 or 3 high-quality hotel photos for your customer-facing slider</p>
              </div>
            )}
          </div>

          <div><label className={lc}>Description</label><textarea rows={3} value={hotelInfo.description || ''} onChange={e => setHotelInfo(p => ({ ...p, description: e.target.value }))} className={cn(ic, 'resize-none')} placeholder="Brief description of your hotel..." /></div>
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

    if (view === 'FINANCIAL') return <FinancialView propertyId={effectivePropertyId} />

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
      <SubscriptionView 
        propertyId={effectivePropertyId} 
        currentPlan={hotelInfo.plan} 
        isTrialActive={hotelInfo.isTrialActive}
        isAutopayActive={hotelInfo.isAutopayActive}
        planExpiresAt={hotelInfo.planExpiresAt}
        onUpgrade={handleUpgrade} 
        onCancelAutopay={handleCancelAutopay}
      />
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
                  <button 
                    onClick={() => {
                      if (intg.id === 'airbnb') {
                        setShowAirbnbModal(true)
                      } else if (intg.id === 'twilio') {
                        setShowTwilioModal(true)
                      } else if (intg.id === 'razorpay') {
                        setShowRazorpayModal(true)
                      } else {
                        setShowOtaModal(intg)
                      }
                    }}
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    {intg.status === 'CONNECTED' ? 'Manage' : 'Connect'}
                  </button>
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

    if (view === 'PAYOUTS') return <PayoutsView propertyId={effectivePropertyId || ''} userRole={session?.user?.role} />

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
    INTEGRATIONS: 'Integrations', PAYOUTS: 'Payouts & Withdrawals', RETENTION: 'Data Retention',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
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

        {myProperties.length > 1 && (
          <div className="flex items-center gap-2 bg-surface border border-border rounded-xl px-3.5 py-1.5 shadow-sm">
            <span className="text-[11px] text-text-secondary font-semibold uppercase tracking-wider">Switch Hotel:</span>
            <select
              value={effectivePropertyId || ''}
              onChange={e => setActivePropertyId(e.target.value)}
              className="bg-transparent text-xs font-bold text-[#4A9EFF] focus:outline-none cursor-pointer"
            >
              {myProperties.map(p => (
                <option key={p.id} value={p.id} className="bg-[#0d1117] text-white">{p.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>
      {renderView()}
      {showAirbnbModal && (
        <AirbnbModal 
          propertyId={effectivePropertyId || ''} 
          rooms={airbnbRooms} 
          mappings={airbnbMappings}
          onClose={() => {
            setShowAirbnbModal(false)
            fetchIntegrations()
          }} 
        />
      )}
      {showTwilioModal && (
        <TwilioConnectionModal 
          propertyId={effectivePropertyId || ''} 
          onClose={() => {
            setShowTwilioModal(false)
            fetchIntegrations()
          }} 
        />
      )}
      {showRazorpayModal && (
        <RazorpayConnectionModal 
          propertyId={effectivePropertyId || ''} 
          onClose={() => {
            setShowRazorpayModal(false)
            fetchIntegrations()
          }} 
        />
      )}
      {showOtaModal && (
        <OtaConnectionModal 
          propertyId={effectivePropertyId || ''} 
          ota={showOtaModal}
          onClose={() => {
            setShowOtaModal(null)
            fetchIntegrations()
          }} 
        />
      )}
    </div>
  )
}

// ─── Payouts & Withdrawals Ledger Component ──────────────────────────────────
function PayoutsView({ propertyId, userRole }: { propertyId: string, userRole: string | undefined }) {
  const [stats, setStats] = useState({ totalRevenue: 0, totalPaidOut: 0, pendingPayout: 0, currentBalance: 0 })
  const [payoutRequests, setPayoutRequests] = useState<any[]>([])
  const [allRequests, setAllRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [withdrawModal, setWithdrawModal] = useState(false)
  const [processModal, setProcessModal] = useState<any>(null)
  const [amount, setAmount] = useState('')
  const [txId, setTxId] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/payouts?propertyId=${propertyId}`)
      const d = await res.json()
      if (d.success) {
        setStats(d.stats)
        setPayoutRequests(d.payoutRequests)
        if (d.allRequests) setAllRequests(d.allRequests)
      }
    } catch { toast.error('Failed to load ledger') } finally { setLoading(false) }
  }, [propertyId])

  useEffect(() => { fetchData() }, [fetchData])

  const handleRequestSubmit = async () => {
    const val = parseFloat(amount)
    if (isNaN(val) || val <= 0) { toast.error('Enter a valid amount'); return }
    if (val > stats.currentBalance) { toast.error('Amount exceeds your current balance'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CREATE_REQUEST', amount: val })
      })
      const d = await res.json()
      if (d.success) {
        toast.success('Withdrawal request submitted successfully!')
        setWithdrawModal(false)
        setAmount('')
        fetchData()
      } else {
        toast.error(d.error || 'Failed to submit request')
      }
    } catch { toast.error('Connection error') } finally { setSubmitting(false) }
  }

  const handleProcessSubmit = async (processAction: 'APPROVE' | 'REJECT') => {
    if (processAction === 'APPROVE' && !txId.trim()) { toast.error('Transaction ID / UTR is required'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'PROCESS_REQUEST', requestId: processModal.id, processAction, transactionId: txId, notes })
      })
      const d = await res.json()
      if (d.success) {
        toast.success(`Request marked as ${processAction === 'APPROVE' ? 'PAID' : 'REJECTED'} successfully!`)
        setProcessModal(null)
        setTxId('')
        setNotes('')
        fetchData()
      } else {
        toast.error(d.error || 'Failed to process request')
      }
    } catch { toast.error('Connection error') } finally { setSubmitting(false) }
  }

  if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>

  const isSuper = userRole === 'SUPER_ADMIN'

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Statistics (for Hotel Owner) */}
      {!isSuper && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-surface border border-border rounded-2xl p-5 space-y-2">
            <p className="text-xs font-semibold text-text-secondary">Total Bookings Revenue</p>
            <p className="text-2xl font-bold text-white">₹{stats.totalRevenue.toLocaleString()}</p>
          </div>
          <div className="bg-surface border border-border rounded-2xl p-5 space-y-2">
            <p className="text-xs font-semibold text-text-secondary">Total Payouts Done</p>
            <p className="text-2xl font-bold text-emerald-500">₹{stats.totalPaidOut.toLocaleString()}</p>
          </div>
          <div className="bg-surface border border-border rounded-2xl p-5 space-y-2">
            <p className="text-xs font-semibold text-text-secondary">Pending requests</p>
            <p className="text-2xl font-bold text-orange-500">₹{stats.pendingPayout.toLocaleString()}</p>
          </div>
          <div className="bg-gradient-to-br from-[#4A9EFF]/10 to-[#4A9EFF]/2 bg-surface border border-[#4A9EFF]/20 rounded-2xl p-5 flex flex-col justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-[#4A9EFF] tracking-wide uppercase">Requestable Balance</p>
              <p className="text-2xl font-black text-white">₹{stats.currentBalance.toLocaleString()}</p>
            </div>
            {stats.currentBalance > 0 && (
              <Button onClick={() => setWithdrawModal(true)} variant="primary" className="text-xs py-1.5 mt-3">Request Withdrawal</Button>
            )}
          </div>
        </div>
      )}

      {/* 2. LEDGER FOR SUPER ADMIN */}
      {isSuper ? (
        <div className="bg-surface border border-border rounded-2xl p-6 space-y-5">
          <div>
            <h3 className="text-base font-semibold text-white">Payment & Withdrawal Requests</h3>
            <p className="text-xs text-text-secondary mt-0.5">Approve, transfer, and ledger cash withdrawals for hotel partners</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  <th className="pb-3">Hotel Name</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm text-white">
                {allRequests.length === 0 ? (
                  <tr><td colSpan={5} className="py-8 text-center text-text-secondary">No payout requests registered in the network</td></tr>
                ) : allRequests.map((r) => (
                  <tr key={r.id} className="hover:bg-surface-light/30">
                    <td className="py-3.5 font-medium">{r.propertyName}</td>
                    <td className="py-3.5 font-bold">₹{r.amount.toLocaleString()}</td>
                    <td className="py-3.5 text-text-secondary text-xs">{new Date(r.requestedAt).toLocaleDateString()}</td>
                    <td className="py-3.5">
                      <span className={cn('px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider', 
                        r.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-500' :
                        r.status === 'PENDING' ? 'bg-orange-500/10 text-orange-500' : 'bg-red-500/10 text-red-500'
                      )}>{r.status}</span>
                    </td>
                    <td className="py-3.5 text-right">
                      {r.status === 'PENDING' ? (
                        <Button onClick={() => setProcessModal(r)} variant="primary" className="text-xs py-1 px-3">Review & Pay</Button>
                      ) : r.transactionId ? (
                        <span className="text-xs text-text-secondary font-mono">UTR: {r.transactionId}</span>
                      ) : (
                        <span className="text-xs text-text-secondary">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* 3. HISTORY FOR HOTEL ADMIN */
        <div className="bg-surface border border-border rounded-2xl p-6 space-y-5">
          <div>
            <h3 className="text-base font-semibold text-white">Payout History & Logs</h3>
            <p className="text-xs text-text-secondary mt-0.5">Track all requested, processed, and historical payout status</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  <th className="pb-3">Requested Amount</th>
                  <th className="pb-3">Request Date</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Transaction UTR</th>
                  <th className="pb-3 text-right">Processed At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm text-white">
                {payoutRequests.length === 0 ? (
                  <tr><td colSpan={5} className="py-8 text-center text-text-secondary">No historical payout requests registered</td></tr>
                ) : payoutRequests.map((r) => (
                  <tr key={r.id}>
                    <td className="py-3.5 font-bold">₹{r.amount.toLocaleString()}</td>
                    <td className="py-3.5 text-text-secondary text-xs">{new Date(r.requestedAt).toLocaleDateString()}</td>
                    <td className="py-3.5">
                      <span className={cn('px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider', 
                        r.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-500' :
                        r.status === 'PENDING' ? 'bg-orange-500/10 text-orange-500' : 'bg-red-500/10 text-red-500'
                      )}>{r.status}</span>
                    </td>
                    <td className="py-3.5 font-mono text-xs text-text-secondary">{r.transactionId ?? 'Waiting for processing...'}</td>
                    <td className="py-3.5 text-right text-text-secondary text-xs">{r.processedAt ? new Date(r.processedAt).toLocaleDateString() : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* WITHDRAW MODAL */}
      {withdrawModal && (
        <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#0d1117] border border-border rounded-2xl max-w-md w-full p-6 space-y-5">
            <div>
              <h4 className="text-lg font-bold text-white">Request Balance Withdrawal</h4>
              <p className="text-xs text-text-secondary mt-1">Submit a withdrawal request to Super Admin. Maximum requestable: ₹{stats.currentBalance.toLocaleString()}</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-text-secondary block mb-1.5">Withdrawal Amount (INR)</label>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-primary" placeholder="e.g. 5000" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={() => setWithdrawModal(false)} variant="secondary" className="flex-1 text-sm py-2">Cancel</Button>
              <Button onClick={handleRequestSubmit} loading={submitting} variant="primary" className="flex-1 text-sm py-2">Submit Request</Button>
            </div>
          </div>
        </div>
      )}

      {/* PROCESS MODAL (For Super Admin) */}
      {processModal && (
        <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#0d1117] border border-border rounded-2xl max-w-lg w-full p-6 space-y-5">
            <div>
              <h4 className="text-lg font-bold text-white">Process Payout Request</h4>
              <p className="text-xs text-text-secondary mt-1">Review the hotel&apos;s registered bank details and mark as complete after manual transfer.</p>
            </div>

            <div className="bg-surface border border-border rounded-xl p-4 space-y-3.5">
              <p className="text-xs font-bold text-primary uppercase tracking-wide">Hotel Registered Bank & UPI details</p>
              <div className="grid grid-cols-2 gap-3 text-xs text-left">
                <div><span className="text-text-secondary block">Account Name</span><span className="text-white font-medium">{processModal.bankDetails?.bankAccountName ?? '-'}</span></div>
                <div><span className="text-text-secondary block">Bank Name</span><span className="text-white font-medium">{processModal.bankDetails?.bankName ?? '-'}</span></div>
                <div><span className="text-text-secondary block">Account Number</span><span className="text-white font-medium font-mono">{processModal.bankDetails?.bankAccountNumber ?? '-'}</span></div>
                <div><span className="text-text-secondary block">IFSC Code</span><span className="text-white font-medium font-mono">{processModal.bankDetails?.bankIfscCode ?? '-'}</span></div>
                <div className="col-span-2 border-t border-border pt-2"><span className="text-text-secondary block">Quick Pay UPI ID</span><span className="text-emerald-500 font-bold font-mono">{processModal.bankDetails?.upiId ?? '-'}</span></div>
              </div>
            </div>

            <div className="space-y-3 text-left">
              <div>
                <label className="text-xs font-semibold text-text-secondary block mb-1.5">Transaction ID / UTR Ref Number (Required to approve)</label>
                <input value={txId} onChange={e => setTxId(e.target.value)} className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-primary" placeholder="e.g. UTR123849103" />
              </div>
              <div>
                <label className="text-xs font-semibold text-text-secondary block mb-1.5">Internal notes / Memo</label>
                <input value={notes} onChange={e => setNotes(e.target.value)} className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-primary" placeholder="e.g. Paid via HDFC Netbanking" />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button onClick={() => setProcessModal(null)} variant="secondary" className="text-sm py-2">Close</Button>
              <Button onClick={() => handleProcessSubmit('REJECT')} loading={submitting} variant="secondary" className="text-sm py-2 text-red-500 hover:bg-red-500/10">Reject Request</Button>
              <Button onClick={() => handleProcessSubmit('APPROVE')} loading={submitting} variant="primary" className="text-sm py-2 px-6">Mark as Paid Done</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
// ─── Airbnb Integration Setup Modal Component ─────────────────────────────────
function AirbnbModal({ 
  propertyId, 
  rooms: initialRooms, 
  mappings: initialMappings, 
  onClose 
}: { 
  propertyId: string
  rooms: any[]
  mappings: any[]
  onClose: () => void 
}) {
  const [airbnbUrl, setAirbnbUrl] = useState('')
  const [localRooms, setLocalRooms] = useState<any[]>(initialRooms || [])
  const [localMappings, setLocalMappings] = useState<Record<string, string>>({})
  const [loadingRooms, setLoadingRooms] = useState(false)
  const [importing, setImporting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)

  const loadData = useCallback(async () => {
    if (!propertyId || propertyId === 'ALL') return
    setLoadingRooms(true)
    try {
      const res = await fetch(`/api/admin/settings/integrations/airbnb?propertyId=${propertyId}`)
      const d = await res.json()
      if (d.success && d.data) {
        setLocalRooms(d.data.rooms || [])
        const initial: Record<string, string> = {}
        ;(d.data.rooms || []).forEach((r: any) => {
          const match = (d.data.mappings || []).find((m: any) => m.roomId === r.id)
          initial[r.id] = match ? match.otaRoomId : ''
        })
        setLocalMappings(initial)
      }
    } catch {} finally {
      setLoadingRooms(false)
    }
  }, [propertyId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleAutoImport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!airbnbUrl.trim()) {
      toast.error('Paste your Airbnb Listing URL or Calendar iCal Feed link')
      return
    }

    setImporting(true)
    const toastId = toast.loading('Detecting Airbnb rooms and syncing calendar...')
    try {
      const res = await fetch('/api/admin/rooms/import-airbnb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: airbnbUrl.trim(),
          otaChannel: 'AIRBNB',
          propertyId,
        }),
      })
      const d = await res.json()
      if (d.success) {
        toast.success(
          `Airbnb Connected! Imported "${d.data.room?.type || 'Room'}" and synced ${d.data.syncReport?.created || 0} booking(s) to your calendar!`,
          { id: toastId, duration: 6000 }
        )
        setAirbnbUrl('')
        loadData()
      } else {
        toast.error(d.error || 'Failed to auto-detect Airbnb listing', { id: toastId })
      }
    } catch {
      toast.error('Connection error during Airbnb auto-import', { id: toastId })
    } finally {
      setImporting(false)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    const toastId = toast.loading('Syncing bookings with Airbnb...')
    try {
      const res = await fetch(`/api/admin/settings/integrations/airbnb/sync?propertyId=${propertyId}`, {
        method: 'POST',
      })
      const d = await res.json()
      if (d.success) {
        toast.success(`Sync completed! Created: ${d.summary.created}, Updated: ${d.summary.updated}`, { id: toastId, duration: 5000 })
        loadData()
      } else {
        toast.error(d.error || 'Sync failed', { id: toastId })
      }
    } catch {
      toast.error('Network error during sync', { id: toastId })
    } finally {
      setSyncing(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Airbnb integration? All room mapping links will be removed.')) return
    setDisconnecting(true)
    try {
      const res = await fetch(`/api/admin/settings/integrations/airbnb?propertyId=${propertyId}`, {
        method: 'DELETE',
      })
      const d = await res.json()
      if (d.success) {
        toast.success('Airbnb disconnected successfully')
        onClose()
      } else {
        toast.error(d.error || 'Failed to disconnect')
      }
    } catch {
      toast.error('Network error during disconnect')
    } finally {
      setDisconnecting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[2000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in text-left">
      <div className="bg-[#101922] border border-white/[0.08] rounded-3xl max-w-2xl w-full p-6 space-y-6 text-left my-8 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>

        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-rose-500" /> Airbnb 1-Time Auto Connection
          </h3>
          <p className="text-xs text-text-secondary mt-1 leading-relaxed">
            Simply paste your Airbnb <span className="font-bold text-white">Listing URL or iCal Calendar Export Link</span> below. The system will automatically detect your rooms, build them into your website database, and sync all Airbnb bookings to your calendar!
          </p>
        </div>

        {/* 1-Time Link Import Form */}
        <form onSubmit={handleAutoImport} className="p-5 bg-rose-500/5 border border-rose-500/20 rounded-2xl space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-rose-400 uppercase tracking-wider block">
              Airbnb Listing URL or Export Calendar iCal Link *
            </label>
            <input 
              required
              type="text" 
              value={airbnbUrl} 
              onChange={e => setAirbnbUrl(e.target.value)}
              placeholder="https://www.airbnb.com/rooms/12345678 or https://www.airbnb.com/calendar/ical/12345678.ics"
              className="w-full bg-[#101922] border border-white/[0.15] focus:border-rose-500 rounded-xl px-3.5 py-3 text-xs text-white outline-none transition-colors shadow-inner"
            />
          </div>

          <button 
            type="submit"
            disabled={importing || !airbnbUrl.trim()}
            className="w-full py-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20"
          >
            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {importing ? 'Auto-Detecting & Syncing...' : 'Connect & Auto-Import Airbnb Listing'}
          </button>
        </form>

        {/* Registered Mapped Rooms */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Connected Airbnb Rooms ({localRooms.filter(r => localMappings[r.id]).length})</h4>
            {localRooms.some(r => localMappings[r.id]) && (
              <button 
                type="button"
                disabled={syncing}
                onClick={handleSync}
                className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5"
              >
                {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Sync Calendar Now
              </button>
            )}
          </div>

          <div className="max-h-[30vh] overflow-y-auto space-y-2 pr-1 custom-scrollbar border border-white/[0.05] rounded-xl p-3 bg-black/20">
            {loadingRooms ? (
              <div className="flex items-center justify-center py-6 gap-2 text-xs text-text-tertiary">
                <Loader2 className="w-4 h-4 animate-spin text-rose-500" /> Loading connected rooms...
              </div>
            ) : localRooms.length === 0 ? (
              <p className="text-center py-6 text-xs text-text-tertiary">No Airbnb listings imported yet. Paste your link above to auto-connect!</p>
            ) : (
              localRooms.map(room => {
                const isMapped = !!localMappings[room.id]
                return (
                  <div key={room.id} className="p-3 bg-surface-light border border-white/[0.08] rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white">Room {room.roomNumber}</span>
                      <span className="text-[10px] text-gray-400 ml-2">({room.type || room.category})</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isMapped ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-gray-500/15 text-gray-400'}`}>
                      {isMapped ? 'Active Calendar Sync' : 'Not Connected'}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          {localRooms.some(r => localMappings[r.id]) ? (
            <button 
              disabled={disconnecting}
              onClick={handleDisconnect}
              className="text-xs text-red-500 hover:text-red-400 font-bold uppercase tracking-wider text-left border border-red-500/20 hover:border-red-500/30 px-4 py-2 rounded-xl bg-red-500/5 active:scale-95 transition-all disabled:opacity-50"
            >
              {disconnecting ? 'Disconnecting...' : 'Disconnect Airbnb Channel'}
            </button>
          ) : <div />}

          <button 
            onClick={onClose}
            className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Unified OTA Connection Setup & Simulation Modal ───────────────────────────
function OtaConnectionModal({ 
  propertyId, 
  ota, 
  onClose 
}: { 
  propertyId: string
  ota: { id: string; name: string }
  onClose: () => void 
}) {
  const [rooms, setRooms] = useState<any[]>([])
  const [mappings, setMappings] = useState<any[]>([])
  const [hotelId, setHotelId] = useState('')
  const [apiKey, setApiKey] = useState('')
  
  const [localMappings, setLocalMappings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)

  // Simulation form states
  const [simRoomId, setSimRoomId] = useState('')
  const [simGuestName, setSimGuestName] = useState('')
  const [simCheckIn, setSimCheckIn] = useState('')
  const [simCheckOut, setSimCheckOut] = useState('')
  const [simulating, setSimulating] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/admin/settings/integrations/${ota.id}?propertyId=${propertyId}`)
        const d = await res.json()
        if (d.success) {
          setRooms(d.data.rooms)
          setMappings(d.data.mappings)
          if (d.data.connection) {
            setHotelId(d.data.connection.credentials?.hotelId || '')
            setApiKey(d.data.connection.credentials?.apiKey || '')
          }
          
          const initial: Record<string, string> = {}
          d.data.rooms.forEach((r: any) => {
            const match = d.data.mappings.find((m: any) => m.roomId === r.id)
            initial[r.id] = match ? match.otaRoomId : ''
          })
          setLocalMappings(initial)
          if (d.data.rooms.length > 0) {
            setSimRoomId(d.data.rooms[0].id)
          }
        }
      } catch {
        toast.error('Failed to load integration settings')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [ota, propertyId])

  const handleSave = async () => {
    setSaving(true)
    const payload = Object.entries(localMappings).map(([roomId, otaRoomId]) => ({
      roomId,
      otaRoomId,
    }))
    try {
      const res = await fetch(`/api/admin/settings/integrations/${ota.id}?propertyId=${propertyId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credentials: { hotelId, apiKey },
          mappings: payload,
        }),
      })
      const d = await res.json()
      if (d.success) {
        toast.success(`${ota.name} settings saved successfully!`)
        onClose()
      } else {
        toast.error(d.error || 'Failed to save settings')
      }
    } catch {
      toast.error('Network error saving settings')
    } finally {
      setSaving(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm(`Are you sure you want to disconnect ${ota.name}?`)) return
    setDisconnecting(true)
    try {
      const res = await fetch(`/api/admin/settings/integrations/${ota.id}?propertyId=${propertyId}`, {
        method: 'DELETE',
      })
      const d = await res.json()
      if (d.success) {
        toast.success(`${ota.name} disconnected successfully`)
        onClose()
      } else {
        toast.error(d.error || 'Failed to disconnect')
      }
    } catch {
      toast.error('Network error during disconnect')
    } finally {
      setDisconnecting(false)
    }
  }

  const handleSimulateBooking = async () => {
    if (!simRoomId || !simCheckIn || !simCheckOut) {
      toast.error('Please fill in all simulation fields (Room, Check-in, Check-out)')
      return
    }
    setSimulating(true)
    const toastId = toast.loading('Simulating channel booking webhook...')
    try {
      const res = await fetch(`/api/admin/settings/integrations/simulate?propertyId=${propertyId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          otaName: ota.name,
          roomId: simRoomId,
          guestName: simGuestName || `Mock ${ota.name} Reservation`,
          checkIn: simCheckIn,
          checkOut: simCheckOut,
        }),
      })
      const d = await res.json()
      if (d.success) {
        toast.success(`Booking successfully simulated! Reference: ${d.data.booking.notes.split('Ref: ')[1] || 'SIM123'}`, { id: toastId, duration: 4000 })
        setSimGuestName('')
        setSimCheckIn('')
        setSimCheckOut('')
      } else {
        toast.error(d.error || 'Simulation failed', { id: toastId })
      }
    } catch {
      toast.error('Network error simulating booking', { id: toastId })
    } finally {
      setSimulating(false)
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-[2000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-[#101922] border border-white/[0.08] rounded-3xl p-6 text-center text-white">
          <span className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin inline-block mb-2" />
          <p className="text-xs text-text-secondary">Loading integration credentials...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[2000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in text-left">
      <div className="bg-[#101922] border border-white/[0.08] rounded-3xl max-w-4xl w-full p-6 space-y-6 text-left my-8 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>

        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" /> Connect {ota.name} Channel
          </h3>
          <p className="text-xs text-text-secondary mt-1">
            Setup direct channel connection mappings. Save your credentials first, then map room IDs. Use the simulator card to test bookings live.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="bg-black/20 p-4 border border-white/[0.05] rounded-2xl space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">1. Credentials</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-text-secondary font-bold block mb-1">Hotel ID / Merchant ID</label>
                  <input 
                    type="text" 
                    value={hotelId} 
                    onChange={e => setHotelId(e.target.value)}
                    placeholder="e.g. H10283"
                    className="w-full bg-[#101922] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-primary/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-text-secondary font-bold block mb-1">API Password / Key</label>
                  <input 
                    type="password" 
                    value={apiKey} 
                    onChange={e => setApiKey(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#101922] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-primary/50 transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="bg-black/20 p-4 border border-white/[0.05] rounded-2xl space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">2. Room Mappings</h4>
              <div className="space-y-2 max-h-[30vh] overflow-y-auto pr-2 custom-scrollbar">
                {rooms.length === 0 ? (
                  <p className="text-center text-[11px] text-text-tertiary">No rooms found to map.</p>
                ) : (
                  rooms.map(room => (
                    <div key={room.id} className="flex items-center justify-between p-2 bg-surface-light border border-white/[0.05] rounded-xl gap-4">
                      <div>
                        <span className="text-xs font-bold text-white">Room {room.roomNumber}</span>
                        <span className="text-[9px] text-gray-500 uppercase font-black ml-1.5">({room.type})</span>
                      </div>
                      <input 
                        type="text"
                        value={localMappings[room.id] || ''}
                        onChange={e => setLocalMappings(prev => ({ ...prev, [room.id]: e.target.value }))}
                        placeholder="OTA Room Code"
                        className="bg-[#101922] border border-white/[0.1] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-primary/50 w-36 text-center"
                      />
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="bg-primary/5 border border-primary/20 p-5 rounded-2xl space-y-4">
            <div>
              <h4 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Channel Manager Simulator
              </h4>
              <p className="text-[11px] text-text-secondary mt-1">
                Simulate an incoming guest reservation webhook from {ota.name} to check calendar updates instantly.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-text-secondary font-bold block mb-1">Select Room to Book</label>
                <select 
                  value={simRoomId} 
                  onChange={e => setSimRoomId(e.target.value)}
                  className="w-full bg-[#101922] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer"
                >
                  {rooms.map(r => (
                    <option key={r.id} value={r.id} className="bg-[#101922]">Room {r.roomNumber} - {r.type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-text-secondary font-bold block mb-1">Guest Name</label>
                <input 
                  type="text" 
                  value={simGuestName} 
                  onChange={e => setSimGuestName(e.target.value)}
                  placeholder="e.g. Jack Sparrow"
                  className="w-full bg-[#101922] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-primary/50 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-text-secondary font-bold block mb-1">Check-in Date</label>
                  <input 
                    type="date" 
                    value={simCheckIn} 
                    onChange={e => setSimCheckIn(e.target.value)}
                    className="w-full bg-[#101922] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-text-secondary font-bold block mb-1">Check-out Date</label>
                  <input 
                    type="date" 
                    value={simCheckOut} 
                    onChange={e => setSimCheckOut(e.target.value)}
                    className="w-full bg-[#101922] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer"
                  />
                </div>
              </div>

              <button 
                type="button"
                disabled={simulating}
                onClick={handleSimulateBooking}
                className="w-full py-2.5 bg-primary/20 hover:bg-primary/30 border border-primary/30 text-primary rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
              >
                {simulating ? <span className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" /> : null}
                Simulate Guest Booking Webhook
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          {mappings.length > 0 ? (
            <button 
              disabled={saving || disconnecting}
              onClick={handleDisconnect}
              className="text-xs text-red-500 hover:text-red-400 font-bold uppercase tracking-wider text-left border border-red-500/20 hover:border-red-500/30 px-4 py-2 rounded-xl bg-red-500/5 active:scale-95 transition-all disabled:opacity-50"
            >
              {disconnecting ? 'Disconnecting...' : `Disconnect ${ota.name}`}
            </button>
          ) : <div />}

          <div className="flex items-center gap-2 justify-end flex-1">
            <button 
              onClick={onClose}
              className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all"
            >
              Cancel
            </button>
            <button 
              disabled={saving || disconnecting}
              onClick={handleSave}
              className="px-5 py-2.5 bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all"
            >
              {saving ? 'Saving...' : 'Save Mappings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function TwilioConnectionModal({ propertyId, onClose }: { propertyId: string; onClose: () => void }) {
    const [accountSid, setAccountSid] = useState('')
    const [authToken, setAuthToken] = useState('')
    const [phoneNumber, setPhoneNumber] = useState('')
    const [whatsappNumber, setWhatsappNumber] = useState('')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        const fetchTwilioConfig = async () => {
            try {
                const res = await fetch(`/api/admin/settings/integrations/twilio?propertyId=${propertyId}`)
                const json = await res.json()
                if (json.success && json.data.connection) {
                    const creds = json.data.connection.credentials || {}
                    setAccountSid(creds.accountSid || '')
                    setAuthToken(creds.authToken || '')
                    setPhoneNumber(creds.phoneNumber || '')
                    setWhatsappNumber(creds.whatsappNumber || '')
                }
            } catch {
                toast.error('Failed to load Twilio settings')
            } finally {
                setLoading(false)
            }
        }
        fetchTwilioConfig()
    }, [propertyId])

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            const res = await fetch(`/api/admin/settings/integrations/twilio?propertyId=${propertyId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    credentials: {
                        accountSid: accountSid.trim(),
                        authToken: authToken.trim(),
                        phoneNumber: phoneNumber.trim(),
                        whatsappNumber: whatsappNumber.trim(),
                    },
                    mappings: []
                })
            })
            const json = await res.json()
            if (json.success) {
                toast.success('Twilio account credentials saved successfully!')
                onClose()
            } else {
                toast.error(json.error || 'Failed to save Twilio settings')
            }
        } catch {
            toast.error('Connection error saving Twilio credentials')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="relative max-w-md w-full bg-[#182433] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-5 border-b border-white/10 bg-[#101922]">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 font-bold">
                            <MessageSquare className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-white">Twilio Gateway Settings</h3>
                            <p className="text-[11px] text-gray-400">Configure custom SMS & WhatsApp marketing credentials</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-lg bg-white/5 hover:bg-white/10">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSave} className="p-6 space-y-4">
                    {loading ? (
                        <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                    ) : (
                        <>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-gray-300 uppercase tracking-wider">Twilio Account SID</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                    value={accountSid}
                                    onChange={e => setAccountSid(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-[#101922] border border-white/10 rounded-xl text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-red-500/50 font-mono"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-gray-300 uppercase tracking-wider">Twilio Auth Token</label>
                                <input
                                    required
                                    type="password"
                                    placeholder="••••••••••••••••••••••••••••••••"
                                    value={authToken}
                                    onChange={e => setAuthToken(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-[#101922] border border-white/10 rounded-xl text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-red-500/50 font-mono"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-gray-300 uppercase tracking-wider">SMS Sender Phone</label>
                                    <input
                                        type="text"
                                        placeholder="+18885550199"
                                        value={phoneNumber}
                                        onChange={e => setPhoneNumber(e.target.value)}
                                        className="w-full px-3.5 py-2.5 bg-[#101922] border border-white/10 rounded-xl text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-red-500/50 font-mono"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-gray-300 uppercase tracking-wider">WhatsApp Sender</label>
                                    <input
                                        type="text"
                                        placeholder="+14155238886"
                                        value={whatsappNumber}
                                        onChange={e => setWhatsappNumber(e.target.value)}
                                        className="w-full px-3.5 py-2.5 bg-[#101922] border border-white/10 rounded-xl text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-red-500/50 font-mono"
                                    />
                                </div>
                            </div>

                            <p className="text-[10px] text-gray-500 leading-normal pt-1">
                                Used for dispatching automated booking OTPs, direct guest SMS blasts, and custom WhatsApp marketing campaigns.
                            </p>

                            <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold rounded-xl transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-red-600/30 flex items-center gap-2 disabled:opacity-50"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Twilio Credentials'}
                                </button>
                            </div>
                        </>
                    )}
                </form>
            </div>
        </div>
    )
}

function RazorpayConnectionModal({ propertyId, onClose }: { propertyId: string; onClose: () => void }) {
    const [keyId, setKeyId] = useState('')
    const [keySecret, setKeySecret] = useState('')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        const fetchRazorpayConfig = async () => {
            try {
                const res = await fetch(`/api/admin/settings/integrations/razorpay?propertyId=${propertyId}`)
                const json = await res.json()
                if (json.success && json.data.connection) {
                    const creds = json.data.connection.credentials || {}
                    setKeyId(creds.keyId || creds.razorpayKeyId || '')
                    setKeySecret(creds.keySecret || creds.razorpayKeySecret || '')
                }
            } catch {
                toast.error('Failed to load Razorpay settings')
            } finally {
                setLoading(false)
            }
        }
        fetchRazorpayConfig()
    }, [propertyId])

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            const res = await fetch(`/api/admin/settings/integrations/razorpay?propertyId=${propertyId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    credentials: {
                        keyId: keyId.trim(),
                        keySecret: keySecret.trim(),
                    },
                    mappings: []
                })
            })
            const json = await res.json()
            if (json.success) {
                toast.success('Property Razorpay gateway saved successfully!')
                onClose()
            } else {
                toast.error(json.error || 'Failed to save Razorpay settings')
            }
        } catch {
            toast.error('Connection error saving Razorpay settings')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="relative max-w-md w-full bg-[#182433] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-5 border-b border-white/10 bg-[#101922]">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold">
                            <CreditCard className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-white">Razorpay Gateway Settings</h3>
                            <p className="text-[11px] text-gray-400">Direct booking payments to your hotel&apos;s Razorpay account</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-lg bg-white/5 hover:bg-white/10">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSave} className="p-6 space-y-4">
                    {loading ? (
                        <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                    ) : (
                        <>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-gray-300 uppercase tracking-wider">Razorpay Key ID</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="rzp_live_xxxxxxxxxxxx"
                                    value={keyId}
                                    onChange={e => setKeyId(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-[#101922] border border-white/10 rounded-xl text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50 font-mono"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-gray-300 uppercase tracking-wider">Razorpay Key Secret</label>
                                <input
                                    required
                                    type="password"
                                    placeholder="••••••••••••••••••••••••"
                                    value={keySecret}
                                    onChange={e => setKeySecret(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-[#101922] border border-white/10 rounded-xl text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50 font-mono"
                                />
                            </div>

                            <p className="text-[10px] text-gray-400 leading-normal pt-1">
                                When configured, 100% of guest room booking payments and service bill payments for this hotel will be deposited directly into your linked Razorpay account.
                            </p>

                            <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold rounded-xl transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-blue-600/30 flex items-center gap-2 disabled:opacity-50"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Razorpay Gateway'}
                                </button>
                            </div>
                        </>
                    )}
                </form>
            </div>
        </div>
    )
}


