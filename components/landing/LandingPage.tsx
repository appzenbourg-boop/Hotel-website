'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Building2,
  ShieldCheck,
  ChevronRight,
  Download,
  LayoutDashboard,
  Users,
  Menu,
  X,
  ArrowRight,
  Sparkles,
  Check,
  Minus,
  Info,
  CreditCard,
  Eye,
  EyeOff,
  CheckCircle2,
  ChevronLeft,
  Globe,
  Lock,
  Key,
  Bell,
  DollarSign,
  MapPin,
  TrendingUp,
  Calendar,
  Plus,
  Search,
  Bed,
  UtensilsCrossed,
  CalendarDays,
  ClipboardSignature,
  PackageSearch,
  MessageSquareShare,
  FileInput,
  BarChart3,
  HelpCircle,
  ChevronDown,
  Trash2,
  Edit
} from 'lucide-react'
import { usePwaInstall } from '@/lib/hooks/usePwaInstall'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import dynamic from 'next/dynamic'

const MapPicker = dynamic(() => import('@/components/ui/MapPicker'), { ssr: false })

const PLANS = [
  {
    id: 'base',
    name: 'Base',
    tagline: 'For independent properties getting started.',
    priceMonthly: 9999,
    originalPriceMonthly: 15000,
    priceAnnual: 8999,
    originalPriceAnnual: 13500,
    discountLabel: 'Save 10% on Annual',
    cta: 'Start a trial',
    accentColor: 'from-blue-500 to-cyan-400',
    features: [
      'Core PMS, Front Desk & Reservations',
      'Digital Guest Check-in & Check-out',
      'Room Status & Housekeeping Pipeline',
      'Limit of 30 Active Rooms'
    ]
  },
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'Designed for growth-stage hotels and boutique resorts.',
    priceMonthly: 14999,
    originalPriceMonthly: 30000,
    priceAnnual: 14399,
    originalPriceAnnual: 27000,
    cta: 'Start a trial',
    accentColor: 'from-indigo-500 to-purple-500',
    features: [
      'Complete Employee Mobile App',
      'Housekeeping & Maintenance Dispatch',
      'Growth Marketing & Loyalty Module',
      'Limit of 75 Active Rooms'
    ]
  },
  {
    id: 'standard',
    name: 'Standard',
    tagline: 'Perfect for full-service hotels seeking maximum performance.',
    priceMonthly: 29999,
    originalPriceMonthly: 55000,
    priceAnnual: 26999,
    originalPriceAnnual: 49500,
    discountLabel: 'Best Value',
    cta: 'Start a trial',
    accentColor: 'from-blue-600 via-indigo-500 to-teal-400',
    features: [
      'Smart IoT Room Hardware Controls',
      'Predictive Analytics & Advanced Reporting',
      'F&B Point of Sale & Spa Integrations',
      'Multi-language Guest Portal',
      'Limit of 150 Active Rooms'
    ]
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'Tailored for multi-property groups and luxury brands.',
    priceMonthly: 'Custom pricing',
    priceAnnual: 'Custom pricing',
    cta: 'Contact sales',
    accentColor: 'from-emerald-500 to-teal-400',
    features: [
      'Multi-property Super Admin Center',
      'Custom Integrations & API Access',
      'White-label Guest Applications',
      'Dedicated Success Manager & VIP Support',
      'SLA-backed Uptime & Unlimited Rooms'
    ]
  }
]

const FEATURES_MATRIX = [
  { name: 'Real-time Frontdesk Booking & Interactive Calendar', base: '✓', starter: '✓', standard: '✓', enterprise: '✓' },
  { name: 'Bulk CSV Data Import Engine (Rooms & Properties)', base: '—', starter: '✓', standard: '✓', enterprise: '✓' },
  { name: 'Dynamic Room Category & Inventory Pricing Setup', base: '30 Rooms', starter: '100 Rooms', standard: 'Unlimited', enterprise: 'Unlimited' },
  { name: 'Custom Room Amenities Integration & Setup Hub', base: '✓', starter: '✓', standard: '✓', enterprise: '✓' },
  { name: 'F&B and Spa Digital Menu Creation Hub', base: '—', starter: '✓', standard: '✓', enterprise: '✓' },
  { name: 'Digital Guest Onboarding & Document (Aadhaar) Verification', base: '✓', starter: '✓', standard: '✓', enterprise: '✓' },
  { name: 'Guest App: Digital Key & IoT Room Door Locking', base: '—', starter: '✓', standard: '✓', enterprise: '✓' },
  { name: 'Guest App: In-App Food & Beverage Ordering System', base: '—', starter: '✓', standard: '✓', enterprise: '✓' },
  { name: 'Guest App: Integrated Spa Appointment Booking System', base: '—', starter: '✓', standard: '✓', enterprise: '✓' },
  { name: 'Guest App: Direct Housekeeping, Laundry & Wake-Up Tools', base: '—', starter: '✓', standard: '✓', enterprise: '✓' },
  { name: 'Guest App: Dynamic Stay Extension & Live Upgrades', base: '✓', starter: '✓', standard: '✓', enterprise: '✓' },
  { name: 'Staff App: Shift Attendance Tracking & Face Log System', base: 'Up to 10', starter: 'Up to 30', standard: 'Unlimited', enterprise: 'Unlimited' },
  { name: 'Staff App: Automated Task Pipeline & Service Orders', base: '—', starter: '✓', standard: '✓', enterprise: '✓' },
  { name: 'Staff Portal: Leave Requests & Message Center Hub', base: '—', starter: '✓', standard: '✓', enterprise: '✓' },
  { name: 'Financials: Razorpay AutoPay & Private Key Overrides', base: '✓', starter: '✓', standard: '✓', enterprise: '✓' },
  { name: 'Financials: Automated Monthly Staff Payroll Engine', base: '—', starter: 'Basic', standard: '✓', enterprise: '✓' },
  { name: 'Analytics: Staff Performance & Workload Reports', base: '—', starter: 'Basic', standard: 'Advanced Suite', enterprise: 'Advanced Suite' },
  { name: 'Analytics: F&B Revenue & Spa Booking Analysis', base: '—', starter: 'Basic', standard: 'Advanced Suite', enterprise: 'Advanced Suite' },
  { name: 'Analytics: Guest Loyalty, Campaigns & Yield Analysis', base: '—', starter: 'Basic', standard: 'Advanced Suite', enterprise: 'Advanced Suite' },
  { name: 'Infrastructure: Node Security Sync & Monitoring System', base: '—', starter: '—', standard: '✓', enterprise: '✓' },
  { name: 'Enterprise: Multi-Property Central Command Control', base: '—', starter: '—', standard: '—', enterprise: '✓' },
  { name: 'Enterprise: Custom Subscription Configuration Tiering', base: '—', starter: '—', standard: '—', enterprise: '✓' }
]

const FEATURES_SLIDER = [
  {
    title: "Complete Hotel Operations Hub",
    subtitle: "StayIn automates your front desk, handles room cleaning schedules, and integrates payments in a unified dashboard.",
    badge: "StayIn Hotel OS",
    color: "from-blue-500 to-indigo-500"
  },
  {
    title: "Premium Guest Web & Wallet",
    subtitle: "Empower guests with instant check-in, automated referral cashbacks, and digital room service ordering from their phones.",
    badge: "Connected Guest Experience",
    color: "from-purple-500 to-pink-500"
  },
  {
    title: "Unified Staff Task & Rota Command",
    subtitle: "Assign housekeeping tasks, monitor staff shifts, and generate payroll reports flawlessly.",
    badge: "Staff Efficiency Suite",
    color: "from-cyan-500 to-teal-400"
  }
]

/* ───────────────────────────────────────────────────────────────
   GOOGLE WORKSPACE STYLE SIGNUP WIZARD
─────────────────────────────────────────────────────────────── */
function RegistrationWizard({
  selectedPlanId,
  onClose,
  isAnnual,
  userCount
}: {
  selectedPlanId: string,
  onClose: () => void,
  isAnnual: boolean,
  userCount: number
}) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const [formData, setFormData] = useState({
    businessName: '',
    roomsRange: '1-30',
    region: 'India',
    name: '',
    phone: '',
    email: '',
    password: '',
    hotelAddress: '',
    latitude: null as number | null,
    longitude: null as number | null,
    trialPeriod: true,
  })

  const planUpper = selectedPlanId.toUpperCase() as 'BASE' | 'STARTER' | 'STANDARD' | 'ENTERPRISE'
  const planData = PLANS.find(p => p.id === selectedPlanId)

  const calculatedPrice = planData
    ? (typeof planData.priceMonthly === 'string'
      ? planData.priceMonthly
      : ((isAnnual ? planData.priceAnnual : planData.priceMonthly) as number) * userCount)
    : 0

  const formatPrice = (val: number | string) => {
    if (typeof val === 'string') return val
    return `₹${val.toLocaleString('en-IN')}`
  }

  const nextStep = () => {
    if (step === 1 && !formData.businessName) return toast.error("Please enter your Business Name")
    if (step === 2 && (!formData.name || !formData.email || !formData.phone || !formData.password)) {
      return toast.error("Please fill all personal details")
    }
    if (step === 3 && !formData.hotelAddress) return toast.error("Please specify property address")
    setStep(prev => prev + 1)
  }

  const prevStep = () => setStep(prev => Math.max(1, prev - 1))

  const handleFinalSubmit = async () => {
    setLoading(true)
    try {
      // Format custom intake description for Super Admin review
      const telemetryDescription = planUpper === 'ENTERPRISE'
        ? `🏢 Enterprise Intake: ${userCount} Hotel(s) · 🔑 Scale: ${formData.roomsRange} rooms/property · 📍 Region: ${formData.region}`
        : `🏢 Boutique Property · 🔑 Scale: ${formData.roomsRange} rooms/property · 📍 Region: ${formData.region}`

      const regRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          hotelName: formData.businessName,
          hotelAddress: formData.hotelAddress,
          latitude: formData.latitude,
          longitude: formData.longitude,
          plan: planUpper,
          trialPeriod: formData.trialPeriod,
          role: 'HOTEL_ADMIN',
          description: telemetryDescription
        })
      })

      const regData = await regRes.json()

      if (!regRes.ok) {
        toast.error(regData.error || 'Registration failed')
        setLoading(false)
        return
      }

      // 2. Razorpay Autopay flow
      if (planUpper !== 'BASE' && planUpper !== 'ENTERPRISE') {
        try {
          const statusText = formData.trialPeriod
            ? 'Initializing UPI Autopay verification mandate...'
            : `Initializing payment for ${planUpper} plan...`
          toast.loading(statusText)

          const orderRes = await fetch('/api/subscription/razorpay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              plan: planUpper,
              propertyId: regData.propertyId,
              userId: regData.user?.id,
              trialPeriod: formData.trialPeriod,
            })
          })

          const order = await orderRes.json()
          toast.dismiss()

          if (!order.success) {
            toast.error('Autopay setup failed. Trial is active on Base tier.', { duration: 5000 })
          } else {
            const paid = await new Promise((resolve) => {
              const options = {
                key: order.key,
                amount: order.amount,
                currency: order.currency,
                name: 'StayIn OS',
                description: formData.trialPeriod
                  ? '14-Day Trial Autopay Mandate Setup'
                  : `${planUpper} Subscription`,
                order_id: order.orderId,
                handler: async (response: any) => {
                  const verifyRes = await fetch('/api/subscription/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      ...response,
                      plan: planUpper,
                      propertyId: regData.propertyId,
                      userId: regData.user?.id,
                      trialPeriod: formData.trialPeriod,
                    })
                  })
                  const verifyData = await verifyRes.json()
                  resolve(verifyData.success)
                },
                modal: { ondismiss: () => resolve(false) }
              }
              new (window as any).Razorpay(options).open()
            })

            if (paid) {
              toast.success(formData.trialPeriod ? `Autopay verified! Your 14-day free trial of ${planUpper} is active.` : 'Subscription successfully activated!')
            } else {
              toast.info('Setup bypassed. Operating on free Base tier.')
            }
          }
        } catch (payErr) {
          console.error(payErr)
          toast.error('Autopay verification timed out. Initialized on base tier.')
        }
      }

      // 3. Sign In
      const loginResult = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      })

      if (loginResult?.ok) {
        toast.success('Registration completed successfully! Transferring to dashboard...')
        router.push('/admin/dashboard')
      } else {
        toast.error('Registration completed, but login failed. Please sign in manually.')
        router.push('/admin/login')
      }

    } catch (err) {
      console.error(err)
      toast.error("An unexpected system error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] bg-[#05070A] w-screen h-screen flex overflow-hidden select-none text-[#D1D5DB] font-sans"
    >
      {/* Left: Form Container */}
      <div className="w-full lg:w-1/2 flex flex-col relative bg-[#05070A] overflow-y-auto custom-scrollbar h-full">

        {/* Top Floating Nav */}
        <div className="h-16 shrink-0 px-8 flex items-center justify-between border-b border-white/[0.03]">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-[#4A9EFF] shadow-[0_0_10px_rgba(74,158,255,0.5)]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white">StayIn OS Setup</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/5 text-white/50 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Far Left Floating Back Button (Google style) */}
        {step > 1 && (
          <button
            onClick={prevStep}
            className="absolute left-4 top-24 lg:left-8 w-10 h-10 rounded-full bg-white/[0.02] border border-white/10 flex items-center justify-center hover:bg-white/5 transition-colors group text-white"
          >
            <ChevronLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
          </button>
        )}

        <div className="flex-grow flex flex-col justify-center max-w-md mx-auto w-full px-6 py-12">

          {/* Page Headings based on Step */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              {step === 1 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-3xl lg:text-4xl font-semibold text-white tracking-tight mb-2">Let&apos;s get started</h2>
                    <p className="text-sm text-white/40">Enter your hotel group configuration parameters.</p>
                  </div>

                  <div className="space-y-4 pt-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Hotel / Business Name</label>
                      <input
                        type="text"
                        value={formData.businessName}
                        onChange={e => setFormData({ ...formData, businessName: e.target.value })}
                        placeholder="e.g. Grand Heights Resort"
                        className="w-full px-4 py-3 bg-white/[0.02] border border-white/10 rounded-xl text-white outline-none focus:border-[#4A9EFF] focus:ring-1 focus:ring-[#4A9EFF] transition-all placeholder:text-white/20"
                      />
                    </div>

                    <div className="space-y-2.5 pt-2">
                      <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Size of Inventory</label>
                      {[
                        { val: '1-30', label: 'Just 1 Boutique Property (1-30 Rooms)' },
                        { val: '30-100', label: '2-5 Branch Portfolio (30-100 Rooms)' },
                        { val: '100+', label: 'Enterprise Group (100+ Rooms)' }
                      ].map(opt => (
                        <label
                          key={opt.val}
                          onClick={() => setFormData({ ...formData, roomsRange: opt.val })}
                          className={cn(
                            "flex items-center gap-3 p-3.5 border rounded-xl cursor-pointer transition-all",
                            formData.roomsRange === opt.val
                              ? "bg-[#4A9EFF]/5 border-[#4A9EFF] text-white"
                              : "bg-white/[0.01] border-white/[0.05] hover:bg-white/[0.03] text-white/60"
                          )}
                        >
                          <div className={cn(
                            "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
                            formData.roomsRange === opt.val ? "border-[#4A9EFF]" : "border-white/20"
                          )}>
                            {formData.roomsRange === opt.val && <div className="w-1.5 h-1.5 rounded-full bg-[#4A9EFF]" />}
                          </div>
                          <span className="text-xs font-medium">{opt.label}</span>
                        </label>
                      ))}
                    </div>

                    <div className="space-y-1 pt-2">
                      <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Region</label>
                      <select
                        value={formData.region}
                        onChange={e => setFormData({ ...formData, region: e.target.value })}
                        className="w-full px-4 py-3 bg-[#0A0D14] border border-white/10 rounded-xl text-white outline-none appearance-none cursor-pointer focus:border-[#4A9EFF] transition-all"
                      >
                        <option value="India">India (₹ INR Checkout)</option>
                        <option value="Other">Global Region</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-3xl lg:text-4xl font-semibold text-white tracking-tight mb-2">Create Credentials</h2>
                    <p className="text-sm text-white/40">Specify administrative master credentials.</p>
                  </div>

                  <div className="space-y-4 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        const qs = `?plan=${planUpper}&hotelName=${encodeURIComponent(formData.businessName)}&google=1`;
                        signIn('google', { callbackUrl: '/admin/register' + qs });
                      }}
                      className="w-full py-3 bg-white/[0.05] border border-white/10 hover:bg-white/[0.1] text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-3 transition-all"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                          <path d="M1 1h22v22H1z" fill="none"/>
                      </svg>
                      Continue with Google
                    </button>

                    <div className="flex items-center gap-4 my-2">
                        <div className="h-[1px] flex-1 bg-white/10" />
                        <span className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Or register with Email</span>
                        <div className="h-[1px] flex-1 bg-white/10" />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Full Name</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Administrative Lead"
                        className="w-full px-4 py-3 bg-white/[0.02] border border-white/10 rounded-xl text-white outline-none focus:border-[#4A9EFF] transition-all placeholder:text-white/20"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Phone Number</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+91 "
                        className="w-full px-4 py-3 bg-white/[0.02] border border-white/10 rounded-xl text-white outline-none focus:border-[#4A9EFF] transition-all placeholder:text-white/20"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Email Address</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        placeholder="exec@hotel.com"
                        className="w-full px-4 py-3 bg-white/[0.02] border border-white/10 rounded-xl text-white outline-none focus:border-[#4A9EFF] transition-all placeholder:text-white/20"
                      />
                    </div>

                    <div className="space-y-1 relative">
                      <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Password</label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={formData.password}
                          onChange={e => setFormData({ ...formData, password: e.target.value })}
                          placeholder="At least 8 characters"
                          className="w-full px-4 py-3 bg-white/[0.02] border border-white/10 rounded-xl text-white outline-none focus:border-[#4A9EFF] transition-all placeholder:text-white/20 pr-12"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-3xl lg:text-4xl font-semibold text-white tracking-tight mb-2">Locate Property</h2>
                    <p className="text-sm text-white/40">Provide precise location metadata for distance routing.</p>
                  </div>

                  <div className="space-y-4 pt-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Street Address</label>
                      <input
                        type="text"
                        value={formData.hotelAddress}
                        onChange={e => setFormData({ ...formData, hotelAddress: e.target.value })}
                        placeholder="City center, Street line..."
                        className="w-full px-4 py-3 bg-white/[0.02] border border-white/10 rounded-xl text-white outline-none focus:border-[#4A9EFF] transition-all placeholder:text-white/20"
                      />
                    </div>

                    <div className="space-y-1 pt-2">
                      <label className="text-xs font-semibold text-white/50 uppercase tracking-wider block mb-1">Point on Map</label>
                      <div className="h-48 rounded-xl border border-white/10 overflow-hidden relative shadow-inner">
                        <MapPicker
                          latitude={formData.latitude}
                          longitude={formData.longitude}
                          onChange={(lat, lng) => setFormData({ ...formData, latitude: lat, longitude: lng })}
                        />
                      </div>
                      <span className="text-[10px] text-white/30">Drag pin to calibrate coordinate synchronization.</span>
                    </div>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-3xl lg:text-4xl font-semibold text-white tracking-tight mb-2">Confirm & Pay</h2>
                    <p className="text-sm text-white/40">Complete your subscription lifecycle activation.</p>
                  </div>

                  <div className="space-y-4 pt-4">
                    {/* Summary Card */}
                    <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-4 flex flex-col gap-2.5">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-[#4A9EFF] uppercase tracking-wider">Selected Plan</span>
                        <span className="text-xs font-mono font-bold text-white uppercase bg-white/10 px-2 py-0.5 rounded-md">{planUpper}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <span className="text-xs text-white/50">Calculation Model</span>
                        <span className="text-xs text-white font-medium">{isAnnual ? 'Annual (Saved 10%)' : 'Monthly'}</span>
                      </div>
                      <div className="flex justify-between items-center pt-1">
                        <span className="text-xs font-bold text-white uppercase">Total Amount</span>
                        <span className="text-lg font-bold text-white font-outfit">{formatPrice(calculatedPrice)}</span>
                      </div>
                    </div>

                    {planUpper !== 'BASE' && planUpper !== 'ENTERPRISE' && (
                      <div className="bg-[#0a1625] border border-[#4A9EFF]/20 rounded-2xl p-4 space-y-4 shadow-[0_10px_30px_rgba(74,158,255,0.05)]">
                        <label className="flex items-start gap-3.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.trialPeriod}
                            onChange={e => setFormData({ ...formData, trialPeriod: e.target.checked })}
                            className="w-4 h-4 text-[#4A9EFF] border-white/20 bg-transparent rounded focus:ring-[#4A9EFF] mt-0.5"
                          />
                          <div>
                            <span className="text-xs font-bold text-white uppercase tracking-wider">Activate 14-Day Trial First</span>
                            <p className="text-[11px] text-white/50 leading-relaxed mt-1">We will setup a UPI mandate. Zero money is deducted now; subscription begins after 14 days.</p>
                          </div>
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* CTA Buttons Bar */}
          <div className="pt-8 w-full flex justify-end">
            {step < 4 ? (
              <button
                onClick={nextStep}
                className="w-32 py-3.5 bg-[#4A9EFF] hover:bg-[#4A9EFF]/90 text-white rounded-full text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(74,158,255,0.3)] transition-all duration-300"
              >
                Next <ArrowRight size={14} />
              </button>
            ) : (
              <button
                disabled={loading}
                onClick={handleFinalSubmit}
                className="w-full py-4 bg-[#4A9EFF] hover:bg-[#4A9EFF]/90 disabled:bg-white/10 disabled:text-white/20 text-white rounded-full text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 shadow-[0_10px_30px_rgba(74,158,255,0.4)] transition-all duration-300"
              >
                {loading ? "Provisioning Cloud Space..." : "Start Your License Now"}
              </button>
            )}
          </div>
        </div>

        {/* Footer dots */}
        <div className="h-16 border-t border-white/[0.03] shrink-0 flex justify-center items-center gap-2">
          {[1, 2, 3, 4].map(i => (
            <div
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                step === i ? "w-6 bg-[#4A9EFF]" : "w-1.5 bg-white/20"
              )}
            />
          ))}
        </div>

      </div>

      {/* Right: Google-like Graphic Illustration & Info */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center bg-gradient-to-br from-[#0B1018] to-[#05080C] p-16 relative overflow-hidden border-l border-white/[0.03]">
        <div className="absolute top-0 left-0 w-[300px] h-[300px] bg-[#4A9EFF]/5 blur-[120px] -z-10" />

        <div className="max-w-md flex flex-col items-center text-center mx-auto">

          {/* Visual Card Deck using framer motion to represent Getting Ready */}
          <div className="relative w-64 h-48 mb-12 flex items-center justify-center scale-105">
            <motion.div
              animate={{ rotate: -6, y: -10 }}
              className="absolute w-44 h-28 bg-white/[0.01] border border-white/10 rounded-2xl backdrop-blur-md shadow-2xl flex flex-col p-4 items-start justify-between text-left"
            >
              <div className="flex gap-1.5">
                <div className="w-2 h-2 rounded-full bg-rose-500/50" />
                <div className="w-2 h-2 rounded-full bg-amber-500/50" />
                <div className="w-2 h-2 rounded-full bg-emerald-500/50" />
              </div>
              <div className="h-1.5 w-24 bg-white/10 rounded" />
              <div className="h-1.5 w-12 bg-white/5 rounded" />
            </motion.div>

            <motion.div
              animate={{ rotate: 4, y: 10, x: 10 }}
              className="absolute w-44 h-28 bg-gradient-to-br from-[#4A9EFF]/20 to-transparent border border-[#4A9EFF]/40 rounded-2xl backdrop-blur-md shadow-[0_20px_50px_-10px_rgba(74,158,255,0.1)] flex flex-col p-4 justify-between text-left"
            >
              <Globe className="text-[#4A9EFF] w-6 h-6" />
              <div className="space-y-1">
                <div className="h-2 w-16 bg-white rounded" />
                <div className="h-1 w-28 bg-white/40 rounded" />
              </div>
            </motion.div>
          </div>

          <h3 className="text-2xl font-bold text-white tracking-tight mb-4 font-outfit uppercase">Getting your StayIn Hub Ready</h3>
          <p className="text-sm text-white/40 leading-relaxed font-light mb-8 max-w-sm">
            In a few moments, you will possess full operational clarity. Instantly track real-time room states, configure your payment keys, and deliver the ultimate premium guest journey.
          </p>

          <div className="w-full text-left border-t border-white/5 pt-8 space-y-6">
            <p className="text-[10px] font-bold text-[#4A9EFF] uppercase tracking-[0.25em]">INCLUDED CAPABILITIES</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-white">
                  <LayoutDashboard size={14} className="text-[#4A9EFF]" />
                  <h4 className="text-[11px] font-extrabold uppercase tracking-wide">Core Property Hub</h4>
                </div>
                <p className="text-[10px] text-white/35 leading-normal pl-5.5">Visual Timeline, Frontdesk command center, and room inventory grid.</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-white">
                  <Globe size={14} className="text-[#4A9EFF]" />
                  <h4 className="text-[11px] font-extrabold uppercase tracking-wide">Guest Web Portal</h4>
                </div>
                <p className="text-[10px] text-white/35 leading-normal pl-5.5">Co-branded digital check-in & self-service portal for mobile devices.</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-white">
                  <Users size={14} className="text-[#4A9EFF]" />
                  <h4 className="text-[11px] font-extrabold uppercase tracking-wide">Staff Rota Control</h4>
                </div>
                <p className="text-[10px] text-white/35 leading-normal pl-5.5">Live cleaning schedules, task pipelines, and automated staff attendance.</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-white">
                  <CreditCard size={14} className="text-[#4A9EFF]" />
                  <h4 className="text-[11px] font-extrabold uppercase tracking-wide">Razorpay Checkout</h4>
                </div>
                <p className="text-[10px] text-white/35 leading-normal pl-5.5">Seamless digital payments orchestration with custom API key override.</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-white">
                  <ShieldCheck size={14} className="text-[#4A9EFF]" />
                  <h4 className="text-[11px] font-extrabold uppercase tracking-wide">Upgrade Engine</h4>
                </div>
                <p className="text-[10px] text-white/35 leading-normal pl-5.5">Instant stay extension tracking and real-time room class upgrades.</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-white">
                  <Sparkles size={14} className="text-[#4A9EFF]" />
                  <h4 className="text-[11px] font-extrabold uppercase tracking-wide">Loyalty & Wallet</h4>
                </div>
                <p className="text-[10px] text-white/35 leading-normal pl-5.5">Automated guest cashbacks, unified wallet ledger, and referrals.</p>
              </div>

            </div>
          </div>

        </div>
      </div>

    </motion.div>
  )
}

const TESTIMONIALS = [
  {
    quote: "StayIn has completely redefined our front desk operations. The digital check-in and masked ID verification alone saved our staff 12 hours a week, while guests love the seamless check-in experience.",
    author: "Aditya Verma",
    role: "General Manager",
    property: "The Royal Orchid Resort, Jaipur",
    rating: 5,
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop"
  },
  {
    quote: "The direct commission loop has increased our room margins by 22%. Housekeeping automated pipelines ensure rooms are clean 40% faster, increasing our absolute customer delight score.",
    author: "Meera Sen",
    role: "Director of Operations",
    property: "Zuri Sands Luxury Villas, Goa",
    rating: 5,
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop"
  },
  {
    quote: "From channel manager synchronization to F&B direct ordering, StayIn handles everything natively. The customer support is outstanding, and the interface is exceptionally premium.",
    author: "Rohan Malhotra",
    role: "Managing Director",
    property: "Wildflower Ridge Retreat, Shimla",
    rating: 5,
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=150&auto=format&fit=crop"
  }
]

/* ───────────────────────────────────────────────────────────────
   MAIN LANDING PAGE COMPONENT
   ─────────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const { isInstallable, installPwa } = usePwaInstall()
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isAnnual, setIsAnnual] = useState(true)
  const [userCount, setUserCount] = useState(1)
  const [activeSlide, setActiveSlide] = useState(0)
  const [activeTestimonialIdx, setActiveTestimonialIdx] = useState(0)

  // Interactive Guest App Showcase & Commission Simulator states
  const [activeDemoTab, setActiveDemoTab] = useState('home')
  const [mockDndActive, setMockDndActive] = useState(false)
  const [simulatorCommission, setSimulatorCommission] = useState(20)
  const [simulatorBookings, setSimulatorBookings] = useState(300)

  // Interactive selection & registration wizard state
  const [selectedPlanId, setSelectedPlanId] = useState('standard')
  const [isRegistering, setIsRegistering] = useState(false)

  // Interactive mockup state controls
  const [activeMockupRoute, setActiveMockupRoute] = useState<
    'dashboard' | 'reservations' | 'frontdesk' | 'amenities' | 'fbmenu' | 'guests' | 'staff' | 'loyalty' | 'infrastructure' | 'marketing'
  >('dashboard')
  const [autoplayMockup, setAutoplayMockup] = useState<boolean>(true)

  useEffect(() => {
    if (!autoplayMockup) return
    const routes: (
      | 'dashboard'
      | 'reservations'
      | 'frontdesk'
      | 'amenities'
      | 'fbmenu'
      | 'guests'
      | 'staff'
      | 'loyalty'
      | 'infrastructure'
      | 'marketing'
    )[] = [
      'dashboard',
      'reservations',
      'frontdesk',
      'amenities',
      'fbmenu',
      'guests',
      'staff',
      'loyalty',
      'infrastructure',
      'marketing'
    ]
    const timer = setInterval(() => {
      setActiveMockupRoute(prev => {
        const nextIdx = (routes.indexOf(prev) + 1) % routes.length
        return routes[nextIdx]
      })
    }, 6000)
    return () => clearInterval(timer)
  }, [autoplayMockup])

  const [mockCheckinName, setMockCheckinName] = useState("Aman Kapoor")
  const [mockCheckinRoom, setMockCheckinRoom] = useState("301 - Deluxe")
  const [mockCheckedIn, setMockCheckedIn] = useState(false)
  
  const [housekeepingStatus, setHousekeepingStatus] = useState([
    { room: "101", status: "Clean", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
    { room: "102", status: "In Progress", color: "text-amber-400 bg-amber-500/10 border-amber-500/20 animate-pulse" },
    { room: "103", status: "Dirty", color: "text-rose-400 bg-rose-500/10 border-rose-500/20" },
    { room: "104", status: "Clean", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  ])

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % FEATURES_SLIDER.length)
    }, 6000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('register') === 'true') {
        setIsRegistering(true)
        const plan = params.get('plan')
        if (plan) {
          setSelectedPlanId(plan.toLowerCase())
        }
      }
    }
  }, [])

  const formatPrice = (baseVal: number | string) => {
    if (typeof baseVal === 'string') return baseVal
    const sub = isAnnual ? baseVal * 0.9 : baseVal
    const calculated = sub * userCount
    return `₹${Math.round(calculated).toLocaleString('en-IN')}`
  }


  return (
    <div className="min-h-screen bg-[#05070A] text-[#D1D5DB] selection:bg-[#4A9EFF]/30 font-sans tracking-tight overflow-x-hidden relative">
      {/* Visual decorative glows in background */}
      <motion.div 
        animate={{
          x: [0, 80, -40, 0],
          y: [0, -60, 40, 0],
          scale: [1, 1.15, 0.9, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-blue-500/[0.04] blur-[140px] pointer-events-none -z-10" 
      />
      <motion.div 
        animate={{
          x: [0, -60, 80, 0],
          y: [0, 50, -70, 0],
          scale: [1, 0.9, 1.1, 1],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute top-1/3 left-1/4 w-[700px] h-[700px] bg-indigo-500/[0.03] blur-[160px] pointer-events-none -z-10" 
      />
      <motion.div 
        animate={{
          x: [0, 30, -30, 0],
          y: [0, -30, 30, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute bottom-1/4 right-1/3 w-[500px] h-[500px] bg-amber-500/[0.015] blur-[130px] pointer-events-none -z-10" 
      />
      
      {/* Header Navigation */}
      <nav className={cn(
        "fixed top-0 inset-x-0 z-[100] transition-all duration-500",
        scrolled
          ? "bg-[#05070A]/90 backdrop-blur-md border-b border-white/[0.04] py-4"
          : "bg-transparent py-6"
      )}>
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-amber-400/20 bg-white/10 p-0.5 shadow-[0_0_15px_rgba(212,175,55,0.1)] flex items-center justify-center shrink-0">
              <img src="/images/image copy.png" alt="StayIn Logo" className="w-full h-full object-contain rounded-full" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-[0.2em] uppercase text-white font-outfit leading-none">StayIn</span>
              <span className="text-[7.5px] font-bold tracking-[0.35em] text-amber-400 uppercase -mt-0.5 opacity-80">HOSPITALITY</span>
            </div>
          </Link>

          <div className="hidden lg:flex items-center gap-8 text-[11px] font-semibold uppercase tracking-[0.25em] text-white/50">
            {[
              { label: 'Product', href: '#ecosystem' },
              { label: 'Features', href: '#features' },
              { label: 'Pricing', href: '#pricing' },
              { label: 'Comparison', href: '#comparison' }
            ].map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="hover:text-white transition-colors duration-300 flex items-center gap-1 cursor-pointer"
              >
                {item.label}
              </a>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-6">
            <Link
              href="/admin/login"
              className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/60 hover:text-white transition-colors py-2 px-4"
            >
              Log in
            </Link>
            <button
              onClick={() => {
                setSelectedPlanId('standard')
                setIsRegistering(true)
              }}
              className="px-6 py-3 bg-[#3B82F6] hover:bg-[#2563EB] text-white text-[11px] font-bold uppercase tracking-[0.2em] rounded-full transition-all duration-300 shadow-[0_10px_20px_rgba(59,130,246,0.25)] hover:shadow-[0_15px_30px_rgba(59,130,246,0.4)] hover:scale-[1.02] cursor-pointer"
            >
              Start 14-Day Free Trial
            </button>
          </div>

          <button
            className="lg:hidden p-2 text-white/60 hover:text-white"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu size={22} />
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="pt-32 lg:pt-44 pb-20 max-w-[1400px] mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Hero Content Left */}
          <div className="lg:col-span-5 space-y-8 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#3B82F6]/10 border border-[#3B82F6]/20">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] animate-pulse" />
              <span className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-[#3B82F6]">All-in-One Hotel Management System</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-bold tracking-tight leading-[1.08] text-white font-outfit">
              Run Your Hotel. <br />
              <span className="text-[#C5A880] font-bold tracking-tight drop-shadow-sm">Delight Every Guest.</span>
            </h1>

            <p className="text-sm md:text-base text-white/50 font-light leading-relaxed max-w-lg">
              StayIn brings reservations, housekeeping, staff, guest services and payments together in one simple, ultra-premium platform designed for high-performance hoteliers.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
              <button
                onClick={() => {
                  setSelectedPlanId('standard')
                  setIsRegistering(true)
                }}
                className="group px-8 py-4 bg-[#3B82F6] hover:bg-[#2563EB] text-white text-[11px] font-extrabold uppercase tracking-[0.25em] rounded-full flex items-center justify-center gap-2 shadow-[0_15px_30px_rgba(59,130,246,0.3)] hover:shadow-[0_20px_40px_rgba(59,130,246,0.45)] hover:scale-[1.01] transition-all duration-300 cursor-pointer"
              >
                Start 14-Day Free Trial
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <a
                href="#comparison"
                className="px-8 py-4 border border-white/10 hover:border-white/20 hover:bg-white/[0.02] text-white text-[11px] font-extrabold uppercase tracking-[0.25em] rounded-full flex items-center justify-center transition-all duration-300"
              >
                Book a Demo
              </a>
            </div>

            {/* Trust highlights below hero CTAs */}
            <div className="flex flex-wrap items-center gap-y-3 gap-x-6 pt-4 text-white/40 text-[9.5px] uppercase tracking-wider font-semibold border-t border-white/[0.04]">
              <div className="flex items-center gap-2">
                <CreditCard size={12} className="text-[#3B82F6]" />
                No Credit Card Required
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={12} className="text-[#3B82F6]" />
                14-Day Free Trial
              </div>
              <div className="flex items-center gap-2">
                <Info size={12} className="text-[#3B82F6]" />
                Cancel Anytime, No Charges
              </div>
            </div>
          </div>

          {/* Hero Visual Right: Styled Interactive Dashboard Mockup */}
          <div className="lg:col-span-7 w-full flex justify-center">
            <div 
              className="bg-[#0A0D15]/95 border border-white/[0.06] rounded-3xl shadow-[0_30px_60px_-10px_rgba(0,0,0,0.85)] overflow-hidden font-sans text-[10px] text-white/70 w-full max-w-[660px] flex h-[400px] backdrop-blur-2xl relative group"
              onMouseEnter={() => setAutoplayMockup(false)}
              onMouseLeave={() => setAutoplayMockup(true)}
            >
              {/* Subtle background ambient flare */}
              <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-[#3B82F6]/[0.03] blur-[60px] pointer-events-none -z-10" />

              {/* Sidebar Navigation */}
              <div className="w-[130px] shrink-0 bg-[#05070C] border-r border-white/[0.04] p-2.5 flex flex-col justify-between select-none h-full">
                <div className="space-y-3 overflow-hidden flex flex-col h-full max-h-[300px]">
                  <div className="flex items-center gap-1.5 px-1 pb-1 border-b border-white/[0.03] shrink-0">
                    <div className="w-4 h-4 rounded-full overflow-hidden border border-amber-400/20 bg-white/10 p-0.2 flex items-center justify-center">
                      <img src="/images/image copy.png" alt="StayIn Logo" className="w-full h-full object-contain rounded-full" />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-white font-outfit">StayIn</span>
                  </div>
                  
                  {/* Scrollable list of sidebar items */}
                  <div className="flex-grow overflow-y-auto scrollbar-none space-y-0.5 pr-0.5">
                    {[
                      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                      { id: 'reservations', label: 'Reservations', icon: Calendar },
                      { id: 'frontdesk', label: 'Front Desk', icon: ShieldCheck },
                      { id: 'amenities', label: 'Amenities', icon: Sparkles },
                      { id: 'fbmenu', label: 'F&B Menu', icon: UtensilsCrossed },
                      { id: 'guests', label: 'Guests', icon: Users },
                      { id: 'staff', label: 'Staff Management', icon: Users },
                      { id: 'loyalty', label: 'Loyalty Analysis', icon: BarChart3 },
                      { id: 'infrastructure', label: 'System Health', icon: BarChart3 },
                      { id: 'marketing', label: 'Marketing', icon: MessageSquareShare }
                    ].map((item) => {
                      const Icon = item.icon
                      const isMainActive = activeMockupRoute === item.id
                      
                      return (
                        <div
                          key={item.label}
                          onClick={() => {
                            setActiveMockupRoute(item.id as any)
                            setAutoplayMockup(false)
                          }}
                          className={cn(
                            "relative px-2 py-1.5 rounded-lg flex items-center gap-2 transition-all duration-300 group/item cursor-pointer",
                            isMainActive 
                              ? "bg-[#3B82F6] text-white font-semibold shadow-[0_4px_10px_rgba(59,130,246,0.3)] font-medium" 
                              : "hover:bg-white/[0.03] text-white/50 hover:text-white/85"
                          )}
                        >
                          {Icon && <Icon size={10.5} className={cn("shrink-0", isMainActive ? "text-white" : "text-white/30 group-hover/item:text-white/60")} />}
                          <span className="text-[7.5px] truncate tracking-wide font-sans">{item.label}</span>
                          
                          {!isMainActive && (
                            <span className="absolute right-1 w-1 h-1 rounded-full bg-white/20 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Sidebar Bottom Account Badge */}
                <div className="pt-2 border-t border-white/[0.04] space-y-1.5 shrink-0">
                  <div className="border border-amber-400/25 bg-amber-400/[0.02] text-amber-400 text-[6px] font-extrabold uppercase px-1.5 py-0.5 rounded-full tracking-[0.08em] text-center">
                    Standard Plan
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-4.5 h-4.5 rounded-full bg-[#3B82F6] flex items-center justify-center font-black text-white text-[7.5px] shadow-sm shrink-0">
                      R
                    </div>
                    <div className="flex flex-col min-w-0 leading-none">
                      <span className="text-[7px] font-extrabold text-white truncate font-sans">rgd</span>
                      <span className="text-[5.5px] text-white/25 truncate mt-0.5 font-sans">ragad@gmail.com</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Simulated Panel View Space */}
              <div className="flex-grow p-3.5 flex flex-col justify-between bg-[#070A0F]/30 overflow-hidden relative">
                {/* Simulated Panel View Header */}
                <div className="flex items-center justify-between pb-2 border-b border-white/[0.04] shrink-0">
                  <div className="w-40 py-1 px-2.5 rounded bg-white/[0.02] border border-white/[0.05] text-[7px] text-white/30 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Search size={8.5} className="text-white/20" />
                      <span>Search guests, bookings, rooms...</span>
                    </div>
                    <div className="w-2 h-2 rounded bg-white/10" />
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="px-2.5 py-1 bg-[#3B82F6] text-white text-[7px] font-black uppercase tracking-wider rounded shadow-[0_2px_8px_rgba(59,130,246,0.3)] hover:bg-[#2563EB] transition-colors flex items-center gap-0.5">
                      <Plus size={8.5} />
                      <span>New Booking</span>
                    </button>
                    <div className="w-3.5 h-3.5 rounded-full bg-white/[0.02] border border-white/[0.08] flex items-center justify-center text-[7.5px] text-white/40 cursor-pointer hover:text-white hover:bg-white/5 transition-colors">
                      🔔
                    </div>
                    <div className="flex items-center gap-1 border-l border-white/5 pl-1.5 leading-none">
                      <div className="w-3.5 h-3.5 rounded-full bg-white/10 text-white flex items-center justify-center text-[7px] font-extrabold font-sans">R</div>
                      <div className="flex flex-col text-left font-sans">
                        <span className="text-[6.5px] font-extrabold text-white">rgd</span>
                        <span className="text-[5px] text-white/30 uppercase tracking-widest font-mono">HOTEL ADMIN</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Interactive Simulated Body content */}
                <div className="flex-grow py-2.5 overflow-hidden relative">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeMockupRoute}
                      initial={{ opacity: 0, y: 8, scale: 0.99 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.99 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="w-full h-full flex flex-col justify-between overflow-y-auto pr-0.5 scrollbar-none"
                    >
                      {activeMockupRoute === 'dashboard' && (
                        <div className="space-y-2.5 h-full flex flex-col justify-between">
                          {/* Stat Row */}
                          <div className="grid grid-cols-5 gap-1.5 shrink-0">
                            <div className="p-1.5 rounded-lg bg-white/[0.01]/70 border border-white/[0.04] shadow-sm flex flex-col justify-between h-[45px] relative overflow-hidden">
                              <span className="text-[6px] uppercase font-extrabold text-white/30 tracking-wider">Live Revenue</span>
                              <div className="flex flex-col leading-none font-sans">
                                <span className="text-[9.5px] font-black text-white">₹0</span>
                                <span className="text-[5px] text-[#3B82F6] font-bold flex items-center gap-0.5 mt-0.5">
                                  <span className="w-0.8 h-0.8 rounded-full bg-[#3B82F6] animate-ping" />
                                  ● LIVE
                                </span>
                              </div>
                            </div>
                            
                            <div className="p-1.5 rounded-lg bg-white/[0.01]/70 border border-white/[0.04] shadow-sm flex flex-col justify-between h-[45px]">
                              <span className="text-[6px] uppercase font-extrabold text-white/30 tracking-wider">MTD Revenue</span>
                              <div className="flex flex-col leading-none font-sans">
                                <span className="text-[9.5px] font-black text-white">₹14</span>
                                <span className="text-[5px] text-white/20 mt-0.5">Month to date</span>
                              </div>
                            </div>

                            <div className="p-1.5 rounded-lg bg-white/[0.01]/70 border border-white/[0.04] shadow-sm flex flex-col justify-between h-[45px]">
                              <span className="text-[6px] uppercase font-extrabold text-white/30 tracking-wider">Occupancy</span>
                              <div className="flex flex-col leading-none font-sans">
                                <span className="text-[9.5px] font-black text-white">33%</span>
                                <div className="w-full bg-white/5 h-0.8 rounded-full mt-0.5 overflow-hidden font-sans">
                                  <div className="bg-amber-500 h-full w-[33%]" />
                                </div>
                                <span className="text-[4.5px] text-emerald-400 font-extrabold mt-0.5">11% MONTHLY AVG</span>
                              </div>
                            </div>

                            <div className="p-1.5 rounded-lg bg-white/[0.01]/70 border border-white/[0.04] shadow-sm flex flex-col justify-between h-[45px]">
                              <span className="text-[6px] uppercase font-extrabold text-white/30 tracking-wider">Arrivals</span>
                              <div className="flex flex-col leading-none font-sans">
                                <span className="text-[9.5px] font-black text-white">3</span>
                                <span className="text-[4.5px] text-emerald-400 font-black bg-emerald-500/10 px-1 py-0.2 rounded mt-0.5 self-start uppercase">3 PENDING</span>
                              </div>
                            </div>

                            <div className="p-1.5 rounded-lg bg-white/[0.01]/70 border border-white/[0.04] shadow-sm flex flex-col justify-between h-[45px]">
                              <span className="text-[6px] uppercase font-extrabold text-white/30 tracking-wider">Departures</span>
                              <div className="flex flex-col leading-none font-sans">
                                <span className="text-[9.5px] font-black text-white">0</span>
                                <span className="text-[5px] text-white/15 mt-0.5">0 remaining</span>
                              </div>
                            </div>
                          </div>

                          {/* Middle Row */}
                          <div className="grid grid-cols-12 gap-2 flex-grow h-[100px]">
                            {/* Arrivals card */}
                            <div className="col-span-7 p-2 rounded-lg bg-[#070A0F]/60 border border-white/[0.04] flex flex-col justify-between">
                              <div className="flex items-center justify-between border-b border-white/[0.03] pb-1 shrink-0">
                                <span className="text-[7px] font-extrabold text-white/60 uppercase">Today&apos;s Arrivals</span>
                                <span className="text-[5.5px] font-black text-[#3B82F6] uppercase tracking-wider">View Hub (3)</span>
                              </div>
                              <div className="flex-grow flex flex-col justify-between py-1 space-y-1.5">
                                {[
                                  { name: "Vikram Malhotra", room: "102", eta: "12:45 PM", status: "Pre-Checked", statusColor: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
                                  { name: "Ananya Sen", room: "105", eta: "02:15 PM", status: "Ready", statusColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
                                  { name: "Rahul Khanna", room: "201", eta: "04:30 PM", status: "En Route", statusColor: "text-[#3B82F6] bg-[#3B82F6]/10 border-[#3B82F6]/20" }
                                ].map((guest, idx) => (
                                  <div key={idx} className="flex items-center justify-between p-1 rounded bg-white/[0.01] border border-white/[0.02] text-[6.5px]">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <div className="w-4 h-4 rounded-full bg-[#3B82F6]/10 text-[#3B82F6] font-bold text-[6px] flex items-center justify-center shrink-0">
                                        {guest.name.charAt(0)}
                                      </div>
                                      <div className="flex flex-col leading-none min-w-0">
                                        <span className="text-white font-extrabold truncate">{guest.name}</span>
                                        <span className="text-white/25 text-[5px] truncate mt-0.5">Room {guest.room} · ETA {guest.eta}</span>
                                      </div>
                                    </div>
                                    <span className={cn("px-1 py-0.2 rounded text-[4.5px] font-black uppercase border shrink-0 scale-[0.9]", guest.statusColor)}>
                                      {guest.status}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Quick Actions card */}
                            <div className="col-span-5 p-2 rounded-lg bg-[#070A0F]/60 border border-white/[0.04] flex flex-col justify-between">
                              <span className="text-[7px] font-extrabold text-white/60 uppercase border-b border-white/[0.03] pb-1 font-sans">Quick Actions</span>
                              <div className="grid grid-cols-2 gap-1 pt-1.5 flex-grow justify-between">
                                {[
                                  { label: "+ Walk-in", color: "bg-[#3B82F6]/10 border-[#3B82F6]/30 text-[#3B82F6]" },
                                  { label: "✓ Check-in", color: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" },
                                  { label: "⚙ Request", color: "bg-rose-500/10 border-rose-500/30 text-rose-400" },
                                  { label: "🧹 Clean Room", color: "bg-amber-500/10 border-amber-500/30 text-amber-400" },
                                  { label: "💳 Payment", color: "bg-purple-500/10 border-purple-500/30 text-purple-400" },
                                  { label: "✉ WhatsApp", color: "bg-sky-500/10 border-sky-500/30 text-sky-400" }
                                ].map((act, idx) => (
                                  <div key={idx} className={cn("p-1 rounded border flex items-center justify-center text-center py-1 cursor-pointer hover:brightness-125 transition-all text-[5.5px] font-extrabold uppercase font-sans", act.color)}>
                                    {act.label}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Bottom Row */}
                          <div className="grid grid-cols-12 gap-2 shrink-0">
                            <div className="col-span-7 p-2 rounded-lg bg-white/[0.01] border border-white/[0.04] flex items-center justify-between h-[36px]">
                              <div className="flex flex-col justify-center font-sans">
                                <span className="text-[7.5px] font-bold text-white/60 uppercase leading-none mb-0.5">Housekeeping Status</span>
                                <span className="text-[5px] text-white/15">Real-time status</span>
                              </div>
                              <div className="flex gap-1 font-sans">
                                <div className="px-1 py-0.5 rounded bg-rose-500/5 border border-rose-500/10 text-center min-w-[20px]">
                                  <div className="text-[7.5px] font-black text-rose-400 leading-none">0</div>
                                  <div className="text-[4.5px] text-white/30 uppercase mt-0.5">Dirty</div>
                                </div>
                                <div className="px-1 py-0.5 rounded bg-blue-500/5 border border-blue-500/10 text-center min-w-[20px]">
                                  <div className="text-[7.5px] font-black text-blue-400 leading-none">0</div>
                                  <div className="text-[4.5px] text-white/30 uppercase mt-0.5">Prog</div>
                                </div>
                                <div className="px-1 py-0.5 rounded bg-emerald-500/5 border border-emerald-500/10 text-center min-w-[24px]">
                                  <div className="text-[7.5px] font-black text-emerald-400 leading-none">2</div>
                                  <div className="text-[4.5px] text-white/30 uppercase mt-0.5">Ready</div>
                                </div>
                              </div>
                            </div>

                            <div className="col-span-5 p-2 rounded-lg bg-white/[0.01] border border-white/[0.04] flex items-center justify-between h-[36px] font-sans px-2.5">
                              <div className="flex flex-col justify-center leading-none">
                                <span className="text-[7px] font-extrabold text-white/60 uppercase">On-duty Staff</span>
                                <span className="text-[5px] text-emerald-400 font-bold mt-0.5">● 4 ACTIVE</span>
                              </div>
                              <div className="flex -space-x-1 overflow-hidden shrink-0">
                                {['H', 'S', 'V', 'R'].map((char, i) => (
                                  <div key={i} className="w-3.5 h-3.5 rounded-full bg-white/10 border border-[#0A0D15] flex items-center justify-center text-[4.5px] font-black text-white">{char}</div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeMockupRoute === 'reservations' && (
                        <div className="space-y-2 h-full flex flex-col justify-between">
                          <div className="flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-1.5 font-sans">
                              <span className="text-[8.5px] font-black uppercase text-white font-outfit tracking-wide">Calendar Timeline</span>
                              <div className="flex items-center gap-1 border border-white/5 bg-black rounded px-1.5 py-0.5">
                                <span className="text-[6px] text-white/30">◀</span>
                                <span className="text-[7px] font-bold text-white uppercase font-mono tracking-wider px-0.5">MAY 2026</span>
                                <span className="text-[6px] text-white/30">▶</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-0.5 bg-white/[0.02] border border-white/10 rounded p-0.5">
                              {['Today', 'Day', 'Week', 'Month'].map((lbl) => (
                                <span 
                                  key={lbl} 
                                  className={cn(
                                    "px-1.5 py-0.5 rounded text-[6px] font-bold uppercase tracking-wider cursor-pointer transition-colors",
                                    lbl === 'Week' ? "bg-[#3B82F6] text-white" : "text-white/40 hover:text-white/60"
                                  )}
                                >
                                  {lbl}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* CALENDAR SCHEDULER GRID */}
                          <div className="flex-grow border border-white/[0.04] bg-black/45 rounded-xl overflow-hidden flex flex-col h-[155px] relative">
                            {/* Days Columns Grid Background lines overlay */}
                            <div className="absolute inset-0 grid grid-cols-8 pointer-events-none z-0">
                              <div className="border-r border-white/[0.03] h-full" />
                              <div className="border-r border-white/[0.03] h-full bg-white/[0.005]" />
                              <div className="border-r border-white/[0.03] h-full" />
                              <div className="border-r border-white/[0.03] h-full" />
                              <div className="border-r border-white/[0.03] h-full" />
                              <div className="border-r border-white/[0.03] h-full" />
                              <div className="border-r border-white/[0.03] h-full" />
                              <div className="h-full" />
                            </div>

                            {/* Days Header */}
                            <div className="grid grid-cols-8 text-[5.5px] font-black uppercase tracking-wider text-white/35 bg-white/[0.02] border-b border-white/[0.04] py-1 text-center shrink-0 z-10 relative">
                              <div className="border-r border-white/[0.04] text-left pl-2">Room Hub</div>
                              {['Mon 18', 'Tue 19', 'Wed 20', 'Thu 21', 'Fri 22', 'Sat 23', 'Sun 24'].map((day) => (
                                <div key={day} className={cn("border-r border-white/[0.04] last:border-none", day === 'Tue 19' && "text-[#3B82F6] font-extrabold")}>
                                  {day}
                                </div>
                              ))}
                            </div>

                            {/* Calendar Room Timeline Rows */}
                            <div className="flex-grow flex flex-col justify-between py-1 text-[7px] z-10 relative">
                              {/* Row 101 */}
                              <div className="grid grid-cols-8 items-center border-b border-white/[0.02] h-7 relative">
                                <div className="flex items-center gap-1 pl-2 border-r border-white/[0.04] h-full bg-[#05070C]/50 z-20">
                                  <span className="font-extrabold text-white text-[7.5px]">101</span>
                                  <span className="text-[4px] bg-emerald-500/10 text-emerald-400 px-0.8 py-0.2 rounded border border-emerald-500/20 font-bold uppercase">CLEAN</span>
                                </div>
                                <div className="col-span-7 h-full relative flex items-center">
                                  {/* Booking Aman Kapoor (Mon 18 - Wed 20) */}
                                  <div 
                                    className="absolute left-[2%] w-[25%] bg-blue-600/20 border border-blue-500/40 text-blue-300 rounded px-1.5 py-0.5 text-[5.5px] font-extrabold flex items-center justify-between shadow-sm cursor-pointer hover:brightness-125 transition-all h-[18px] z-10"
                                    title="Aman Kapoor: 18 May - 20 May"
                                  >
                                    <span className="truncate tracking-wide font-sans">IN-HOUSE · Aman Kapoor</span>
                                    <span className="text-[4px] font-mono opacity-60 shrink-0 border-l border-blue-400/30 pl-1 ml-1 font-bold">#C4F8</span>
                                  </div>
                                </div>
                              </div>

                              {/* Row 102 */}
                              <div className="grid grid-cols-8 items-center border-b border-white/[0.02] h-7 relative">
                                <div className="flex items-center gap-1 pl-2 border-r border-white/[0.04] h-full bg-[#05070C]/50 z-20">
                                  <span className="font-extrabold text-white text-[7.5px]">102</span>
                                  <span className="text-[4px] bg-emerald-500/10 text-emerald-400 px-0.8 py-0.2 rounded border border-emerald-500/20 font-bold uppercase">CLEAN</span>
                                </div>
                                <div className="col-span-7 h-full relative flex items-center">
                                  {/* Booking Guest Zebra (Tue 19 - Thu 21) */}
                                  <div 
                                    className="absolute left-[16.5%] w-[25%] bg-amber-600/20 border border-amber-500/40 text-amber-300 rounded px-1.5 py-0.5 text-[5.5px] font-extrabold flex items-center justify-between shadow-sm cursor-pointer hover:brightness-125 transition-all h-[18px] z-10"
                                    title="Guest Zebra: 19 May - 21 May"
                                  >
                                    <span className="truncate tracking-wide font-sans">IN-HOUSE · Guest Zebra</span>
                                    <span className="text-[4px] font-mono opacity-60 shrink-0 border-l border-amber-400/30 pl-1 ml-1 font-bold">#B9C7</span>
                                  </div>
                                </div>
                              </div>

                              {/* Row 103 */}
                              <div className="grid grid-cols-8 items-center border-b border-white/[0.02] h-7 relative">
                                <div className="flex items-center gap-1 pl-2 border-r border-white/[0.04] h-full bg-[#05070C]/50 z-20">
                                  <span className="font-extrabold text-white text-[7.5px]">103</span>
                                  <span className="text-[4px] bg-emerald-500/10 text-emerald-400 px-0.8 py-0.2 rounded border border-emerald-500/20 font-bold uppercase">CLEAN</span>
                                </div>
                                <div className="col-span-7 h-full relative flex items-center">
                                  {/* Booking Vikram Singh (Wed 20 - Sat 23) */}
                                  <div 
                                    className="absolute left-[31%] w-[38%] bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 rounded px-1.5 py-0.5 text-[5.5px] font-extrabold flex items-center justify-between shadow-sm cursor-pointer hover:brightness-125 transition-all h-[18px] z-10"
                                    title="Vikram Singh: 20 May - 23 May"
                                  >
                                    <span className="truncate tracking-wide font-sans">CONFIRMED · Vikram Singh</span>
                                    <span className="text-[4px] font-mono opacity-60 shrink-0 border-l border-emerald-400/30 pl-1 ml-1 font-bold">#D9B2</span>
                                  </div>
                                </div>
                              </div>

                              {/* Row 104 */}
                              <div className="grid grid-cols-8 items-center h-7 relative">
                                <div className="flex items-center gap-1 pl-2 border-r border-white/[0.04] h-full bg-[#05070C]/50 z-20">
                                  <span className="font-extrabold text-white text-[7.5px]">104</span>
                                  <span className="text-[4px] bg-emerald-500/10 text-emerald-400 px-0.8 py-0.2 rounded border border-emerald-500/20 font-bold uppercase">CLEAN</span>
                                </div>
                                <div className="col-span-7 h-full relative flex items-center">
                                  {/* Booking Dr. Shreya Roy (Fri 22 - Sun 24) */}
                                  <div 
                                    className="absolute left-[60%] w-[38%] bg-purple-600/20 border border-purple-500/40 text-purple-300 rounded px-1.5 py-0.5 text-[5.5px] font-extrabold flex items-center justify-between shadow-sm cursor-pointer hover:brightness-125 transition-all h-[18px] z-10"
                                    title="Dr. Shreya Roy: 22 May - 24 May"
                                  >
                                    <span className="truncate tracking-wide font-sans">CONFIRMED · Shreya Roy</span>
                                    <span className="text-[4px] font-mono opacity-60 shrink-0 border-l border-purple-400/30 pl-1 ml-1 font-bold">#F2A1</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Legend markers */}
                          <div className="flex items-center gap-2.5 text-[5.5px] font-bold text-white/30 uppercase shrink-0 pt-0.5 font-sans">
                            <span className="flex items-center gap-0.8"><span className="w-1.5 h-1.5 rounded-full bg-yellow-400" /> RESERVED</span>
                            <span className="flex items-center gap-0.8"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> IN-HOUSE</span>
                            <span className="flex items-center gap-0.8"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> CONFIRMED</span>
                            <span className="flex items-center gap-0.8"><span className="w-1.5 h-1.5 rounded-full bg-gray-400" /> CHECKED-OUT</span>
                            <span className="flex items-center gap-0.8"><span className="w-1.5 h-1.5 rounded-full bg-purple-500" /> BLOCK/OTA</span>
                          </div>
                        </div>
                      )}

                      {activeMockupRoute === 'frontdesk' && (
                        <div className="space-y-2 h-full flex flex-col justify-between">
                          {/* Breadcrumb Path & Stats row */}
                          <div className="grid grid-cols-3 gap-1.5 shrink-0">
                            <div className="p-1 rounded-lg bg-white/[0.01] border border-white/[0.04] flex items-center gap-1.5">
                              <span className="text-[7.5px] text-blue-400 shrink-0">✈</span>
                              <div className="flex flex-col font-sans">
                                <span className="text-[8px] font-black text-white leading-none">0</span>
                                <span className="text-[4.5px] text-white/30 uppercase mt-0.5 font-sans">Expected Today</span>
                              </div>
                            </div>
                            
                            <div className="p-1 rounded-lg bg-white/[0.01] border border-white/[0.04] flex items-center gap-1.5">
                              <span className="text-[7.5px] text-emerald-400 shrink-0">✓</span>
                              <div className="flex flex-col font-sans">
                                <span className="text-[8px] font-black text-white leading-none">1</span>
                                <span className="text-[4.5px] text-emerald-400 font-bold uppercase mt-0.5 font-sans">In-House</span>
                              </div>
                            </div>

                            <div className="p-1 rounded-lg bg-white/[0.01] border border-white/[0.04] flex items-center gap-1.5">
                              <span className="text-[7.5px] text-yellow-400 shrink-0">📋</span>
                              <div className="flex flex-col font-sans">
                                <span className="text-[8px] font-black text-white leading-none">0</span>
                                <span className="text-[4.5px] text-white/30 uppercase mt-0.5 font-sans">Pending Check</span>
                              </div>
                            </div>
                          </div>

                          {/* Operations Grid split */}
                          <div className="grid grid-cols-12 gap-2 flex-grow h-[135px]">
                            {/* Left Guest List */}
                            <div className="col-span-7 p-2 rounded-lg bg-white/[0.01] border border-white/[0.04] flex flex-col justify-between overflow-hidden">
                              <div className="flex items-center justify-between border-b border-white/[0.03] pb-1.5 shrink-0">
                                <div className="flex items-center bg-white/[0.02] border border-white/10 rounded p-0.5 gap-0.8">
                                  <span className="px-1.5 py-0.5 bg-white text-[#0A0D14] rounded-[3px] text-[5px] font-black uppercase tracking-wider">All Guests</span>
                                  <span className="px-1.5 py-0.5 text-white/40 text-[5px] font-bold uppercase tracking-wider">In-House</span>
                                </div>
                                <span className="text-emerald-400 text-[5px] font-bold font-sans">WhatsApp Send ✓</span>
                              </div>

                              <div className="flex-grow pt-1.5 overflow-y-auto space-y-1 text-[7px] scrollbar-none">
                                <div className="grid grid-cols-12 font-extrabold uppercase text-white/30 pb-0.5 border-b border-white/[0.04] text-center">
                                  <div className="col-span-5 text-left pl-1">Guest</div>
                                  <div className="col-span-4 text-left">Arrival</div>
                                  <div className="col-span-3">Status</div>
                                </div>

                                <div className="grid grid-cols-12 items-center text-white/80 py-0.5 border-b border-white/[0.02] text-center">
                                  <div className="col-span-5 text-left pl-1 flex flex-col leading-none font-sans">
                                    <span className="font-extrabold text-white text-[7.5px]">Guest zebra</span>
                                    <span className="text-[5px] text-white/30 font-mono mt-0.5">#RES-B9C7</span>
                                  </div>
                                  <div className="col-span-4 text-left text-white/40 text-[6px]">10 May 04:22 AM</div>
                                  <div className="col-span-3"><span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1 py-0.2 rounded text-[4.5px] font-extrabold uppercase font-sans">Verified</span></div>
                                </div>
                              </div>
                            </div>

                            {/* Right Verification needed Drawer */}
                            <div className="col-span-5 p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] flex flex-col justify-between overflow-hidden shadow-lg relative">
                              <div className="absolute top-0 right-0 w-12 h-12 bg-emerald-500/[0.01] blur-lg pointer-events-none" />
                              <div className="flex items-center justify-between border-b border-white/[0.03] pb-1 shrink-0 font-sans">
                                <span className="text-[7px] font-black text-white uppercase tracking-wider">Verification Needed</span>
                                <span className="text-white/30 hover:text-white cursor-pointer text-[6.5px]">✕</span>
                              </div>

                              <div className="flex-grow pt-1 flex flex-col justify-between text-[6.5px] space-y-1">
                                <div className="flex justify-between items-start leading-none font-sans">
                                  <div className="flex flex-col">
                                    <span className="text-[8px] font-black text-white font-outfit">Guest zebra</span>
                                    <span className="text-[5px] text-white/40 font-semibold mt-0.5">Standard King stay</span>
                                  </div>
                                  <span className="bg-[#3B82F6]/10 text-[#3B82F6] font-extrabold text-[4.5px] border border-[#3B82F6]/20 px-1 py-0.2 rounded uppercase">Room 101</span>
                                </div>

                                <div className="space-y-0.8 bg-black/40 p-1 rounded border border-white/[0.02] font-sans">
                                  <div className="flex justify-between text-white/40 text-[5.5px]">
                                    <span>RES ID</span>
                                    <span className="text-white font-mono font-bold">#RES-B9C7</span>
                                  </div>
                                  <div className="flex justify-between text-white/40 text-[5.5px]">
                                    <span>Stay Duration</span>
                                    <span className="text-white font-bold font-sans">14 May - 16 May</span>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between text-[5px] bg-emerald-500/5 border border-emerald-500/10 rounded p-0.8 font-sans">
                                  <span className="text-emerald-400 font-bold">Passport / ID Uploaded</span>
                                  <span className="text-emerald-400 font-black">✓ Verified</span>
                                </div>

                                <button className="w-full py-0.8 bg-emerald-500 hover:bg-emerald-600 text-[#05070C] rounded font-black text-[6.5px] uppercase tracking-widest transition-all shadow-md shrink-0 flex items-center justify-center gap-0.5 mt-0.5 font-sans">
                                  <span>✓ Checked In</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeMockupRoute === 'amenities' && (
                        <div className="space-y-2 h-full flex flex-col justify-between">
                          <div className="flex items-center justify-between shrink-0 font-sans">
                            <div className="flex flex-col">
                              <span className="text-[8.5px] font-black uppercase text-white font-outfit tracking-wide">Amenities Catalog</span>
                              <span className="text-[6px] text-white/30 font-sans">Active property utilities and service tokens</span>
                            </div>
                            <button className="px-2 py-0.5 bg-[#3B82F6] text-white text-[7px] font-extrabold uppercase tracking-wider rounded shadow hover:bg-[#2563EB] transition-colors shrink-0 font-sans">
                              + Add Amenity
                            </button>
                          </div>

                          {/* DYNAMIC AMENITIES GRID & WIDGET */}
                          <div className="grid grid-cols-12 gap-2 flex-grow h-[135px]">
                            {/* Left List of Active Amenities */}
                            <div className="col-span-7 p-2 rounded-lg bg-white/[0.01] border border-white/[0.04] flex flex-col justify-between overflow-hidden">
                              <span className="text-[7px] font-extrabold text-white/50 uppercase border-b border-white/[0.03] pb-1 shrink-0 font-sans">Active Amenities</span>
                              
                              <div className="flex-grow pt-1 overflow-y-auto space-y-1 scrollbar-none font-sans">
                                {[
                                  { name: "Free High-Speed WiFi", icon: "📶", desc: "Premium 1Gbps Fiber connection", cat: "General" },
                                  { name: "Outdoor Infinity Pool", icon: "🏊", desc: "Temperature controlled rooftop pool", cat: "Recreation" },
                                  { name: "24/7 Premium Gym", icon: "🏋", desc: "Cardio & strength building assets", cat: "Health & Care" },
                                  { name: "In-Room Gourmet Dining", icon: "🍽", desc: "Selected digital restaurant menus", cat: "Services" }
                                ].map((am, idx) => (
                                  <div key={idx} className="p-1 rounded bg-[#05070C]/40 border border-white/[0.02] flex items-center justify-between text-[6.5px]">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span className="text-[8px]">{am.icon}</span>
                                      <div className="flex flex-col min-w-0 leading-none">
                                        <span className="text-white font-bold truncate">{am.name}</span>
                                        <span className="text-white/20 text-[5px] truncate mt-0.5">{am.desc}</span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0 pl-1.5 ml-auto border-l border-white/5">
                                      <span className="text-[4.5px] uppercase bg-white/5 border border-white/10 px-1 py-0.2 rounded text-white/40">{am.cat}</span>
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Right Custom Option Selector Picker */}
                            <div className="col-span-5 p-2 rounded-lg bg-white/[0.02]/80 border border-white/[0.04] flex flex-col justify-between overflow-hidden">
                              <span className="text-[6.5px] font-extrabold text-white/30 uppercase border-b border-white/[0.03] pb-0.5 shrink-0 font-sans">Amenity Creator</span>
                              
                              <div className="flex-grow py-1 space-y-1.5 text-[6px] font-sans">
                                <div className="space-y-0.2">
                                  <label className="text-white/20 font-bold uppercase text-[4.5px]">Amenity Title</label>
                                  <div className="w-full bg-[#05070C] border border-white/10 rounded px-1 py-0.5 text-white/50 text-[6px]">WiFi Premium</div>
                                </div>

                                <div className="space-y-0.2">
                                  <label className="text-white/20 font-bold uppercase text-[4.5px]">Select Custom Icon</label>
                                  <div className="grid grid-cols-4 gap-0.5 bg-[#05070C] border border-white/10 rounded p-0.5 text-center">
                                    {['WiFi', 'Pool', 'Gym', 'Bar'].map((ico) => (
                                      <div 
                                        key={ico} 
                                        className={cn(
                                          "rounded-[2px] p-0.5 text-[5px] flex flex-col items-center justify-center border",
                                          ico === 'WiFi' 
                                            ? "bg-[#3B82F6]/10 border-[#3B82F6]/40 text-[#3B82F6] font-bold" 
                                            : "bg-white/[0.01] border-white/5 text-white/30"
                                        )}
                                      >
                                        <span className="text-[6px]">{ico === 'WiFi' ? '📶' : ico === 'Pool' ? '🏊' : ico === 'Gym' ? '🏋' : '🍸'}</span>
                                        <span className="scale-[0.8] leading-none mt-0.5">{ico}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <button className="w-full py-0.8 bg-white/5 border border-white/10 hover:bg-white/10 rounded font-black text-[6.5px] uppercase tracking-wider transition-all shadow-md shrink-0 text-center text-white font-sans">
                                Add Option
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeMockupRoute === 'fbmenu' && (
                        <div className="space-y-2 h-full flex flex-col justify-between">
                          <div className="flex items-center justify-between shrink-0 font-sans">
                            <div className="flex flex-col">
                              <span className="text-[8.5px] font-black uppercase text-white font-outfit tracking-wide">Restaurant Menu</span>
                              <span className="text-[6px] text-white/30 font-sans">Curate your digital dining experience</span>
                            </div>
                            <button className="px-2 py-0.5 bg-[#3B82F6] text-white text-[7px] font-extrabold uppercase tracking-wider rounded shadow hover:bg-[#2563EB] transition-colors shrink-0 flex items-center gap-0.5">
                              <Plus size={7} />
                              <span>Add Item</span>
                            </button>
                          </div>

                          {/* F&B ITEM GRID & CREATION LAYOUT */}
                          <div className="grid grid-cols-12 gap-2 flex-grow h-[155px]">
                            {/* Left: Food & Beverage Menu Items Catalog */}
                            <div className="col-span-8 p-2 rounded-lg bg-white/[0.01] border border-white/[0.04] flex flex-col justify-between overflow-hidden">
                              {/* Restaurant Submenu Category Tabs */}
                              <div className="flex items-center gap-1 border-b border-white/[0.03] pb-1 shrink-0 overflow-x-auto scrollbar-none font-sans">
                                {['All', 'Breakfast', 'Main Course', 'Appetizers', 'Desserts', 'Beverages'].map((tab) => (
                                  <span 
                                    key={tab} 
                                    className={cn(
                                      "px-1.5 py-0.5 rounded-[4px] text-[5.5px] font-bold uppercase tracking-wider cursor-pointer transition-colors whitespace-nowrap",
                                      tab === 'All' ? "bg-[#3B82F6] text-white shadow-sm" : "text-white/40 hover:text-white/60 bg-white/[0.01]"
                                    )}
                                  >
                                    {tab}
                                  </span>
                                ))}
                              </div>

                              {/* Gourmet Items Food Card List */}
                              <div className="flex-grow pt-1.5 flex items-center justify-start gap-2 overflow-x-auto scrollbar-none font-sans">
                                {/* French Fries Card */}
                                <div className="bg-[#0D0F16] border border-white/[0.04] rounded-xl p-1.5 w-[115px] shrink-0 hover:border-white/10 transition-all flex flex-col justify-between h-full select-none">
                                  {/* Culinary Image */}
                                  <div className="h-[55px] rounded-lg border border-white/[0.04] relative overflow-hidden flex items-center justify-center shrink-0 bg-neutral-950">
                                    <img src="/images/fries.png" alt="French Fries" className="w-full h-full object-cover" />
                                    <div className="absolute top-1 left-1 bg-emerald-500/10 text-emerald-400 font-extrabold text-[3.5px] border border-emerald-500/30 px-1 py-0.2 rounded uppercase z-10 leading-none backdrop-blur-sm">VEG</div>
                                    <div className="absolute bottom-1 right-1 bg-black/40 text-white/40 text-[4px] font-black tracking-widest font-mono px-1 py-0.2 rounded leading-none backdrop-blur-sm">APPETIZERS</div>
                                  </div>

                                  {/* Item Details */}
                                  <div className="mt-1 space-y-0.5 min-w-0">
                                    <div className="flex items-center justify-between min-w-0">
                                      <span className="text-[7.5px] font-black text-white truncate font-outfit uppercase tracking-wide">french fries</span>
                                      <div className="flex flex-col items-end leading-none shrink-0 pl-1">
                                        <span className="text-[7px] font-extrabold text-[#3B82F6]">₹200</span>
                                        <span className="text-[4px] text-emerald-400 font-bold mt-0.2">+20 margin</span>
                                      </div>
                                    </div>
                                    <p className="text-[5px] text-white/30 truncate leading-relaxed">Curated for the refined digital dining experience.</p>
                                    <div className="flex items-center gap-1 text-[4px] text-white/20 border-t border-white/[0.03] pt-0.8 mt-0.8 whitespace-nowrap">
                                      <span>⏱ 12 mins</span>
                                      <span>•</span>
                                      <span>🌶 Mild</span>
                                      <span>•</span>
                                      <span className="text-emerald-400 font-bold">In Stock</span>
                                    </div>
                                  </div>

                                  {/* Actions Footer */}
                                  <div className="flex items-center gap-1 mt-1 shrink-0 font-sans">
                                    <button className="flex-grow py-0.5 border border-white/10 hover:bg-white/5 rounded text-[5px] font-black uppercase text-white/50 flex items-center justify-center gap-0.5">
                                      <Edit size={5.5} />
                                      <span>EDIT ITEM</span>
                                    </button>
                                    <button className="p-0.5 border border-rose-500/10 bg-rose-500/5 hover:bg-rose-500/10 rounded text-rose-400 shrink-0">
                                      <Trash2 size={5.5} />
                                    </button>
                                  </div>
                                </div>

                                {/* Placeholder Second Item Card */}
                                <div className="bg-[#0D0F16] border border-white/[0.04] rounded-xl p-1.5 w-[115px] shrink-0 hover:border-white/10 transition-all flex flex-col justify-between h-full select-none">
                                  {/* Culinary Image */}
                                  <div className="h-[55px] rounded-lg border border-white/[0.04] relative overflow-hidden flex items-center justify-center shrink-0 bg-neutral-950">
                                    <img src="/images/burger.png" alt="Royal Burger" className="w-full h-full object-cover" />
                                    <div className="absolute top-1 left-1 bg-rose-500/10 text-rose-400 font-extrabold text-[3.5px] border border-rose-500/30 px-1 py-0.2 rounded uppercase z-10 leading-none backdrop-blur-sm">NON-VEG</div>
                                    <div className="absolute bottom-1 right-1 bg-black/40 text-white/40 text-[4px] font-black tracking-widest font-mono px-1 py-0.2 rounded leading-none backdrop-blur-sm">MAIN COURSE</div>
                                  </div>
                                  <div className="mt-1 space-y-0.5">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[7.5px] font-black text-white truncate font-outfit uppercase">royal burger</span>
                                      <span className="text-[7px] font-extrabold text-[#3B82F6]">₹350</span>
                                    </div>
                                    <p className="text-[5px] text-white/30 truncate">Double patty premium flame-grilled chicken.</p>
                                    <div className="flex items-center gap-1 text-[4px] text-white/20 border-t border-white/[0.03] pt-0.8 mt-0.8 whitespace-nowrap">
                                      <span>⏱ 15 mins</span>
                                      <span>•</span>
                                      <span>🌶 Medium</span>
                                      <span>•</span>
                                      <span className="text-emerald-400 font-bold">In Stock</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 mt-1 shrink-0 font-sans">
                                    <button className="flex-grow py-0.5 border border-white/10 hover:bg-white/5 rounded text-[5px] font-black uppercase text-white/50 flex items-center justify-center gap-0.5">
                                      <Edit size={5.5} />
                                      <span>EDIT ITEM</span>
                                    </button>
                                    <button className="p-0.5 border border-rose-500/10 bg-rose-500/5 hover:bg-rose-500/10 rounded text-rose-400 shrink-0">
                                      <Trash2 size={5.5} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Right: Item Stats Drawer Panel */}
                            <div className="col-span-4 p-2 rounded-lg bg-white/[0.02]/90 border border-white/[0.04] flex flex-col justify-between overflow-hidden font-sans">
                              <span className="text-[6.5px] font-extrabold text-white/30 uppercase border-b border-white/[0.03] pb-0.5 shrink-0">Gourmet Metrics</span>
                              <div className="flex-grow py-1.5 flex flex-col justify-center space-y-1.5 text-[6.5px] leading-tight">
                                <div className="flex justify-between border-b border-white/[0.02] pb-1">
                                  <span className="text-white/40">Total Active Items</span>
                                  <span className="text-white font-extrabold">2 active</span>
                                </div>
                                <div className="flex justify-between border-b border-white/[0.02] pb-1">
                                  <span className="text-white/40">Menu Average Price</span>
                                  <span className="text-[#3B82F6] font-bold">₹275</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-white/40">Tax Slabs (GST)</span>
                                  <span className="text-emerald-400 font-bold">5% CGST/SGST</span>
                                </div>
                              </div>
                              <div className="bg-amber-400/[0.03] border border-amber-400/20 text-amber-400 text-[5px] font-bold uppercase rounded p-1 text-center shrink-0">
                                Digital QR Menu Active
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeMockupRoute === 'guests' && (
                        <div className="space-y-2 h-full flex flex-col justify-between">
                          <div className="flex items-center justify-between shrink-0 font-sans font-sans">
                            <div className="flex flex-col">
                              <span className="text-[9px] font-black uppercase text-white font-outfit tracking-wide">Guest Directory</span>
                              <span className="text-[6px] text-white/30">Active database log files of current hotel guests</span>
                            </div>
                            <button className="px-2 py-0.5 bg-[#3B82F6] text-white text-[7px] font-extrabold uppercase tracking-wider rounded shadow hover:bg-[#2563EB] transition-colors shrink-0 font-sans">
                              + Add Guest
                            </button>
                          </div>

                          {/* Guest List Grid Filter row */}
                          <div className="flex items-center justify-between gap-1 shrink-0 bg-white/[0.01] border border-white/[0.04] p-1 rounded font-sans">
                            <div className="flex-grow max-w-[100px] relative">
                              <input 
                                type="text" 
                                disabled 
                                placeholder="Search guests..." 
                                className="w-full bg-black/40 border border-white/5 rounded px-1.5 py-0.5 text-[5px] text-white/50 cursor-not-allowed select-none font-sans" 
                              />
                            </div>
                            <div className="flex items-center gap-0.5 text-[5px] font-bold">
                              {['Status', 'Source', 'ID Status', 'Dates'].map((flt) => (
                                <span key={flt} className="px-1 py-0.5 bg-white/5 border border-white/10 text-white/40 uppercase rounded cursor-pointer hover:text-white transition-colors font-sans">
                                  {flt}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Guest List Table */}
                          <div className="flex-grow border border-white/[0.04] bg-black/40 rounded-xl overflow-hidden flex flex-col justify-between h-[115px] text-[6.5px] font-sans">
                            <div className="grid grid-cols-12 font-black uppercase tracking-wider text-white/35 bg-white/[0.01] border-b border-white/[0.04] py-1 text-center shrink-0">
                              <div className="col-span-1">□</div>
                              <div className="col-span-4 text-left pl-1">Guest Name</div>
                              <div className="col-span-1">Room</div>
                              <div className="col-span-2">Check-in</div>
                              <div className="col-span-2">Check-out</div>
                              <div className="col-span-2">Source</div>
                            </div>

                            <div className="flex-grow flex flex-col justify-start py-0.5 overflow-y-auto space-y-0.5 scrollbar-none font-sans">
                              <div className="grid grid-cols-12 items-center text-white/80 py-0.5 border-b border-white/[0.02] text-center font-sans">
                                <div className="col-span-1 text-white/20">☑</div>
                                <div className="col-span-4 text-left pl-1 flex flex-col leading-none font-sans">
                                  <span className="font-extrabold text-white text-[7.5px]">Guest zebra</span>
                                  <span className="text-[5px] text-white/30 font-mono mt-0.5">+7896542134</span>
                                </div>
                                <div className="col-span-1"><span className="bg-white/5 px-1 py-0.2 rounded font-bold font-mono">101</span></div>
                                <div className="col-span-2 text-white/40 font-mono">May 14 2026</div>
                                <div className="col-span-2 text-white/40 font-mono">May 16 2026</div>
                                <div className="col-span-2"><span className="bg-white/5 border border-white/10 px-1 py-0.2 rounded text-[5px] uppercase font-mono text-white/30">OTHER</span></div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between border-t border-white/[0.03] px-2 py-0.5 bg-white/[0.01] shrink-0 text-white/25 text-[5px] font-bold uppercase font-sans">
                              <span>1 guest listed</span>
                              <div className="flex gap-1 text-white/40 font-sans">
                                <span className="opacity-50">◀ Prev</span>
                                <span className="text-[#3B82F6] font-black font-sans">1</span>
                                <span className="opacity-50">Next ▶</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeMockupRoute === 'staff' && (
                        <div className="space-y-2 h-full flex flex-col justify-between font-sans">
                          <div className="flex items-center justify-between shrink-0 font-sans font-sans">
                            <div className="flex flex-col">
                              <span className="text-[8.5px] font-black uppercase text-white font-outfit tracking-wide">Staff Management</span>
                              <span className="text-[6px] text-white/30">Manage employees, departments, and roles</span>
                            </div>
                            <button className="px-2 py-0.5 bg-[#3B82F6] text-white text-[7px] font-extrabold uppercase tracking-wider rounded shadow hover:bg-[#2563EB] transition-colors shrink-0 flex items-center gap-0.5 font-sans">
                              <Plus size={7} />
                              <span>Add Employee</span>
                            </button>
                          </div>

                          {/* STAFF MANAGEMENT GRID COMPONENT */}
                          <div className="flex-grow border border-white/[0.04] bg-black/45 rounded-xl overflow-hidden flex flex-col justify-between h-[150px] text-[7px] font-sans">
                            {/* Inner Subtabs */}
                            <div className="flex items-center justify-between border-b border-white/[0.04] bg-white/[0.01] px-2.5 py-0.5 shrink-0 font-sans">
                              <div className="flex items-center gap-3">
                                <span className="text-[#3B82F6] font-black uppercase tracking-wider text-[6.5px] border-b border-[#3B82F6] py-1 cursor-pointer">Staff</span>
                                <span className="text-white/40 font-bold uppercase tracking-wider text-[6.5px] py-1 cursor-pointer hover:text-white/60">Verification Tasks</span>
                              </div>
                              <div className="flex items-center gap-1 text-[5px] text-white/30 uppercase font-bold">
                                <span>All Departments</span>
                                <span className="text-white/20 font-sans">▼</span>
                              </div>
                            </div>

                            {/* Search bar & export row */}
                            <div className="flex items-center justify-between p-1 bg-white/[0.005] border-b border-white/[0.02] shrink-0 gap-1.5 font-sans">
                              <input 
                                type="text" 
                                disabled 
                                placeholder="Search staff by name or role..." 
                                className="flex-grow max-w-[130px] bg-black/40 border border-white/5 rounded px-1.5 py-0.5 text-[5px] text-white/50 cursor-not-allowed select-none font-sans" 
                              />
                              <button className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-[5px] font-black text-white/50 uppercase hover:text-white flex items-center gap-0.5 font-sans">
                                <Download size={6} />
                                <span>Export</span>
                              </button>
                            </div>

                            {/* Staff Employee List */}
                            <div className="flex-grow flex flex-col justify-start py-0.5 overflow-y-auto space-y-0.5 scrollbar-none font-sans">
                              {/* Harsh Row */}
                              <div className="px-2.5 py-1.5 border-b border-white/[0.02] flex items-center justify-between hover:bg-white/[0.01] transition-all select-none font-sans">
                                <div className="flex items-center gap-2 min-w-0 font-sans">
                                  <div className="w-5 h-5 rounded-full bg-[#0D0F16] border border-white/10 flex items-center justify-center font-bold text-white text-[7px] shrink-0 font-mono shadow-inner text-white/30">
                                    H
                                  </div>
                                  <div className="flex flex-col min-w-0 leading-none">
                                    <div className="flex items-center gap-1 min-w-0 font-sans">
                                      <span className="font-extrabold text-white text-[8px] truncate">Harsh</span>
                                      <span className="bg-white/5 border border-white/10 px-1 py-0.2 rounded text-[4.5px] uppercase font-bold text-white/40 shrink-0 font-mono scale-[0.9]">HOUSEKEEPING</span>
                                    </div>
                                    <span className="text-[5.5px] text-white/20 mt-0.8 leading-none">● Member</span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-4 shrink-0 text-left font-sans">
                                  <div className="flex flex-col leading-none">
                                    <span className="text-[6.5px] text-white/50 font-mono font-bold">7894561235</span>
                                    <span className="text-[5px] text-white/20 mt-0.5 font-mono">harshjohn@gmail.com</span>
                                  </div>
                                  <div className="flex flex-col leading-none">
                                    <span className="text-[#3B82F6] font-bold text-[6.5px]">● OFF DUTY</span>
                                    <span className="text-[5px] text-white/20 mt-0.5 font-mono text-center">@ HQ</span>
                                  </div>
                                  <div className="flex flex-col leading-none min-w-[30px] text-right">
                                    <span className="text-white/20 text-[5px] font-bold uppercase">SALARY</span>
                                    <span className="text-white font-mono font-black text-[7.5px] mt-0.5">₹100</span>
                                  </div>
                                </div>
                              </div>

                              {/* harish Row */}
                              <div className="px-2.5 py-1.5 flex items-center justify-between hover:bg-white/[0.01] transition-all select-none font-sans">
                                <div className="flex items-center gap-2 min-w-0 font-sans">
                                  <div className="w-5 h-5 rounded-full bg-[#3B82F6]/10 border border-[#3B82F6]/20 flex items-center justify-center font-bold text-[#3B82F6] text-[7px] shrink-0 font-mono shadow-inner scale-[0.98]">
                                    h
                                  </div>
                                  <div className="flex flex-col min-w-0 leading-none">
                                    <div className="flex items-center gap-1 min-w-0">
                                      <span className="font-extrabold text-white text-[8px] truncate">harish</span>
                                      <span className="bg-white/5 border border-white/10 px-1 py-0.2 rounded text-[4.5px] uppercase font-bold text-white/40 shrink-0 font-mono scale-[0.9]">HOUSEKEEPING</span>
                                    </div>
                                    <span className="text-emerald-400 font-bold text-[5.5px] mt-0.8 leading-none">● new</span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-4 shrink-0 text-left font-sans">
                                  <div className="flex flex-col leading-none font-mono">
                                    <span className="text-[6.5px] text-white/50 font-bold">8974561235</span>
                                    <span className="text-[5px] text-white/20 mt-0.5">harish@myhotel.com</span>
                                  </div>
                                  <div className="flex flex-col leading-none">
                                    <span className="text-[#3B82F6] font-bold text-[6.5px]">■ OFF DUTY</span>
                                    <span className="text-[5px] text-white/20 mt-0.5 font-mono text-center font-sans">@ HQ</span>
                                  </div>
                                  <div className="flex flex-col leading-none min-w-[30px] text-right font-sans">
                                    <span className="text-white/20 text-[5px] font-bold uppercase">SALARY</span>
                                    <span className="text-white font-mono font-black text-[7.5px] mt-0.5">₹5000</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeMockupRoute === 'loyalty' && (
                        <div className="space-y-2 h-full flex flex-col justify-between font-sans">
                          <div className="flex items-center justify-between shrink-0 font-sans">
                            <div className="flex flex-col">
                              <span className="text-[8.5px] font-black uppercase text-white font-outfit tracking-wide">Guest Loyalty & Retention</span>
                              <span className="text-[6px] text-white/30 font-sans">Insights into repeat visitor behaviour and lifetime value</span>
                            </div>
                            <div className="flex items-center gap-1 font-sans">
                              <span className="text-white/40 text-[5px] font-bold uppercase cursor-pointer hover:text-white flex items-center gap-0.5 border border-white/5 bg-black px-1.5 py-0.5 rounded font-sans">
                                <Info size={5.5} />
                                <span>How tiers work</span>
                              </span>
                              <button className="px-2 py-0.5 bg-[#3B82F6] text-white text-[7px] font-extrabold uppercase tracking-wider rounded shadow hover:bg-[#2563EB] transition-colors shrink-0 flex items-center gap-0.5 font-sans">
                                <Download size={6} />
                                <span>Export PDF</span>
                              </button>
                            </div>
                          </div>

                          {/* LOYALTY ANALYSIS STATS ROW */}
                          <div className="grid grid-cols-4 gap-1.5 shrink-0">
                            <div className="p-1.5 rounded-lg bg-white/[0.01] border border-white/[0.04] shadow-sm flex flex-col justify-between h-[45px] leading-tight font-sans">
                              <span className="text-[5.5px] uppercase font-bold text-white/30 tracking-wider">Repeat Guest Rate</span>
                              <div className="flex flex-col leading-none mt-1">
                                <span className="text-[9px] font-black text-white font-sans">100%</span>
                                <span className="text-[4.5px] text-white/20 mt-0.5">1 repeat guests</span>
                              </div>
                            </div>

                            <div className="p-1.5 rounded-lg bg-white/[0.01] border border-white/[0.04] shadow-sm flex flex-col justify-between h-[45px] leading-tight font-sans">
                              <span className="text-[5.5px] uppercase font-bold text-white/30 tracking-wider">Loyalty Revenue</span>
                              <div className="flex flex-col leading-none mt-1">
                                <span className="text-[9px] font-black text-white font-sans">₹28</span>
                                <span className="text-[4.5px] text-emerald-400 font-extrabold mt-0.5">100% of revenue</span>
                              </div>
                            </div>

                            <div className="p-1.5 rounded-lg bg-white/[0.01] border border-white/[0.04] shadow-sm flex flex-col justify-between h-[45px] leading-tight font-sans">
                              <span className="text-[5.5px] uppercase font-bold text-white/30 tracking-wider">Avg. Lifetime Value</span>
                              <div className="flex flex-col leading-none mt-1">
                                <span className="text-[9px] font-black text-white font-sans">₹28</span>
                                <span className="text-[4.5px] text-white/20 mt-0.5">Per unique guest</span>
                              </div>
                            </div>

                            <div className="p-1.5 rounded-lg bg-white/[0.01] border border-white/[0.04] shadow-sm flex flex-col justify-between h-[45px] leading-tight font-sans">
                              <span className="text-[5.5px] uppercase font-bold text-white/30 tracking-wider">Total Guests</span>
                              <div className="flex flex-col leading-none mt-1">
                                <span className="text-[9px] font-black text-white font-sans">1</span>
                                <span className="text-[4.5px] text-white/20 mt-0.5 font-sans font-sans">Unique profiles</span>
                              </div>
                            </div>
                          </div>

                          {/* TWO GRAPH CONTAINER PANELS */}
                          <div className="grid grid-cols-12 gap-2 flex-grow h-[100px] font-sans">
                            {/* First-time vs Repeat Visitors Bar chart */}
                            <div className="col-span-7 p-2 rounded-lg bg-white/[0.01] border border-white/[0.04] flex flex-col justify-between">
                              <span className="text-[7.5px] font-extrabold text-white/60 uppercase border-b border-white/[0.03] pb-1 shrink-0">Visitor Trends (First-time vs. Repeat)</span>
                              
                              <div className="flex-grow relative h-[65px] mt-1">
                                {/* SVG Grid Lines */}
                                <svg className="absolute inset-0 w-full h-full text-white/[0.03]" xmlns="http://www.w3.org/2000/svg">
                                  <line x1="15" y1="10" x2="100%" y2="10" stroke="currentColor" strokeWidth="0.5" strokeDasharray="1,1" />
                                  <line x1="15" y1="28" x2="100%" y2="28" stroke="currentColor" strokeWidth="0.5" strokeDasharray="1,1" />
                                  <line x1="15" y1="46" x2="100%" y2="46" stroke="currentColor" strokeWidth="0.5" strokeDasharray="1,1" />
                                  <line x1="15" y1="58" x2="100%" y2="58" stroke="currentColor" strokeWidth="0.5" />
                                  
                                  {/* Y-Axis Labels */}
                                  <text x="0" y="12" fill="currentColor" fontSize="5" fontWeight="bold">50</text>
                                  <text x="0" y="30" fill="currentColor" fontSize="5" fontWeight="bold">25</text>
                                  <text x="0" y="48" fill="currentColor" fontSize="5" fontWeight="bold">10</text>
                                  <text x="0" y="60" fill="currentColor" fontSize="5" fontWeight="bold">0</text>
                                </svg>
                                
                                {/* Bars Layer */}
                                <div className="absolute inset-x-0 bottom-0 left-[20px] top-[8px] flex justify-between items-end px-2">
                                  {[
                                    { mon: 'Dec', first: 15, repeat: 25 },
                                    { mon: 'Jan', first: 18, repeat: 32 },
                                    { mon: 'Feb', first: 12, repeat: 28 },
                                    { mon: 'Mar', first: 22, repeat: 40 },
                                    { mon: 'Apr', first: 28, repeat: 45 },
                                    { mon: 'May', first: 35, repeat: 52 }
                                  ].map((d) => {
                                    const firstH = (d.first / 60) * 50
                                    const repeatH = (d.repeat / 60) * 50
                                    return (
                                      <div key={d.mon} className="flex flex-col items-center gap-1 w-[12%] h-full justify-end">
                                        <div className="flex gap-0.8 items-end justify-center w-full h-[50px]">
                                          {/* First-time Bar */}
                                          <div 
                                            style={{ height: `${firstH}px` }} 
                                            className="w-1.5 bg-white/20 hover:bg-white/40 rounded-t-[1px] transition-all duration-300 relative group/bar"
                                          >
                                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-black/80 border border-white/10 px-1 py-0.2 rounded text-[4px] text-white opacity-0 group-hover/bar:opacity-100 transition-opacity z-30 pointer-events-none whitespace-nowrap font-mono">{d.first}</div>
                                          </div>
                                          {/* Repeat Bar with blue glow */}
                                          <div 
                                            style={{ height: `${repeatH}px` }} 
                                            className="w-1.5 bg-gradient-to-t from-blue-600 to-blue-400 hover:from-blue-500 hover:to-cyan-400 rounded-t-[1px] shadow-[0_0_8px_rgba(59,130,246,0.3)] transition-all duration-300 relative group/bar2"
                                          >
                                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-black/80 border border-white/10 px-1 py-0.2 rounded text-[4px] text-white opacity-0 group-hover/bar2:opacity-100 transition-opacity z-30 pointer-events-none whitespace-nowrap font-mono">{d.repeat}</div>
                                          </div>
                                        </div>
                                        <span className="text-[4.5px] text-white/20 font-bold font-mono tracking-widest leading-none mt-0.5">{d.mon}</span>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            </div>

                            {/* Booking Source Pie Chart */}
                            <div className="col-span-5 p-2 rounded-lg bg-white/[0.01] border border-white/[0.04] flex flex-col justify-between">
                              <span className="text-[7.5px] font-extrabold text-white/60 uppercase border-b border-white/[0.03] pb-1 shrink-0 font-sans">Booking Channels</span>
                              
                              <div className="flex-grow flex items-center justify-between px-1.5 py-1">
                                {/* Glowing Arc-based Donut SVG */}
                                <div className="w-[50px] h-[50px] relative shrink-0">
                                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
                                    {/* Circle background */}
                                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="3" />
                                    
                                    {/* Direct segment (55%) */}
                                    <circle 
                                      cx="18" 
                                      cy="18" 
                                      r="15.915" 
                                      fill="none" 
                                      stroke="#3B82F6" 
                                      strokeWidth="3" 
                                      strokeDasharray="55 45" 
                                      strokeDashoffset="0"
                                      className="shadow-[0_0_10px_rgba(59,130,246,0.4)]"
                                    />
                                    
                                    {/* OTA segment (30%) */}
                                    <circle 
                                      cx="18" 
                                      cy="18" 
                                      r="15.915" 
                                      fill="none" 
                                      stroke="#14B8A6" 
                                      strokeWidth="3" 
                                      strokeDasharray="30 70" 
                                      strokeDashoffset="-55" 
                                    />
                                    
                                    {/* Walk-in segment (15%) */}
                                    <circle 
                                      cx="18" 
                                      cy="18" 
                                      r="15.915" 
                                      fill="none" 
                                      stroke="#F59E0B" 
                                      strokeWidth="3" 
                                      strokeDasharray="15 85" 
                                      strokeDashoffset="-85" 
                                    />
                                  </svg>
                                  {/* Center Counter */}
                                  <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
                                    <span className="text-[7.5px] font-black text-white font-mono">148</span>
                                    <span className="text-[3.5px] text-white/20 uppercase font-extrabold tracking-widest mt-0.5 scale-[0.9]">STAYS</span>
                                  </div>
                                </div>

                                <div className="flex flex-col justify-center space-y-1.5 pl-2 leading-none flex-grow">
                                  <div className="flex items-center justify-between text-[5.5px]">
                                    <div className="flex items-center gap-1.2">
                                      <span className="w-1.2 h-1.2 rounded-full bg-[#3B82F6]" />
                                      <span className="text-white/40 font-bold">Direct Web</span>
                                    </div>
                                    <span className="text-white font-mono font-black">55%</span>
                                  </div>
                                  <div className="flex items-center justify-between text-[5.5px]">
                                    <div className="flex items-center gap-1.2">
                                      <span className="w-1.2 h-1.2 rounded-full bg-[#14B8A6]" />
                                      <span className="text-white/40 font-bold">OTAs</span>
                                    </div>
                                    <span className="text-white font-mono font-black">30%</span>
                                  </div>
                                  <div className="flex items-center justify-between text-[5.5px]">
                                    <div className="flex items-center gap-1.2">
                                      <span className="w-1.2 h-1.2 rounded-full bg-[#F59E0B]" />
                                      <span className="text-white/40 font-bold">Walk-in</span>
                                    </div>
                                    <span className="text-white font-mono font-black">15%</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeMockupRoute === 'infrastructure' && (
                        <div className="space-y-2 h-full flex flex-col justify-between font-sans">
                          <div className="flex items-center justify-between shrink-0 font-sans">
                            <div className="flex flex-col">
                              <span className="text-[8.5px] font-black uppercase text-white font-outfit tracking-wide">Infrastructure Health</span>
                              <span className="text-[6px] text-white/30">Live status of hotel operations, staff, guests and integrations</span>
                            </div>
                            <button className="px-2 py-0.5 bg-[#3B82F6] text-white text-[7px] font-extrabold uppercase tracking-wider rounded shadow hover:bg-[#2563EB] transition-colors shrink-0">
                              Refresh
                            </button>
                          </div>

                          {/* INFRASTRUCTURE HEALTH STATS ROW */}
                          <div className="grid grid-cols-4 gap-1.5 shrink-0">
                            <div className="p-1.5 rounded-lg bg-white/[0.01] border border-white/[0.04] shadow-sm flex flex-col justify-between h-[45px] leading-tight font-sans">
                              <span className="text-[5.5px] uppercase font-bold text-white/30 tracking-wider">Staff On Duty</span>
                              <div className="flex flex-col leading-none mt-1">
                                <span className="text-[9px] font-black text-white font-sans">4</span>
                                <span className="text-[4.5px] text-emerald-400 font-bold mt-0.5">Active on shift</span>
                              </div>
                            </div>

                            <div className="p-1.5 rounded-lg bg-white/[0.01] border border-white/[0.04] shadow-sm flex flex-col justify-between h-[45px] leading-tight font-sans">
                              <span className="text-[5.5px] uppercase font-bold text-white/30 tracking-wider flex items-center gap-0.8">
                                Guests In-House
                                <span className="w-1 h-1 rounded-full bg-emerald-500 animate-ping" />
                              </span>
                              <div className="flex flex-col leading-none mt-1">
                                <span className="text-[9px] font-black text-white font-sans">1</span>
                                <span className="text-[4.5px] text-amber-500 font-extrabold mt-0.5">33% occupancy</span>
                              </div>
                            </div>

                            <div className="p-1.5 rounded-lg bg-white/[0.01] border border-white/[0.04] shadow-sm flex flex-col justify-between h-[45px] leading-tight font-sans">
                              <span className="text-[5.5px] uppercase font-bold text-white/30 tracking-wider flex items-center gap-0.8 animate-pulse text-rose-400">
                                Service Requests
                                <span className="w-1 h-1 rounded-full bg-rose-500" />
                              </span>
                              <div className="flex flex-col leading-none mt-1 font-sans">
                                <span className="text-[9px] font-black text-white font-sans">1</span>
                                <span className="text-[4.5px] text-rose-400 font-bold mt-0.5">1 SLA breach</span>
                              </div>
                            </div>

                            <div className="p-1.5 rounded-lg bg-white/[0.01] border border-white/[0.04] shadow-sm flex flex-col justify-between h-[45px] leading-tight font-sans">
                              <span className="text-[5.5px] uppercase font-bold text-white/30 tracking-wider">Rooms Status</span>
                              <div className="flex flex-col leading-none mt-1">
                                <span className="text-[9px] font-black text-white font-sans">2</span>
                                <span className="text-[4.5px] text-emerald-400 font-bold mt-0.5">Clean & Ready</span>
                              </div>
                            </div>
                          </div>

                          {/* LOWER SPLIT LAYOUT */}
                          <div className="grid grid-cols-12 gap-2 flex-grow h-[120px] font-sans">
                            {/* Booking Activity wave graph */}
                            <div className="col-span-7 p-2 rounded-lg bg-[#070A0F]/60 border border-white/[0.04] flex flex-col justify-between relative overflow-hidden font-sans">
                              <span className="text-[7.5px] font-extrabold text-white/60 uppercase border-b border-white/[0.03] pb-1 shrink-0 z-10 relative">Operational Latency & Server Load</span>
                              
                              {/* Glowing Bezier Curve Area Graph */}
                              <div className="flex-grow relative h-[85px] mt-1.5">
                                <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                                  {/* Defs for gradients */}
                                  <defs>
                                    <linearGradient id="blueAreaGrad" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.2" />
                                      <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
                                    </linearGradient>
                                    <linearGradient id="roseAreaGrad" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="0%" stopColor="#EF4444" stopOpacity="0.15" />
                                      <stop offset="100%" stopColor="#EF4444" stopOpacity="0.0" />
                                    </linearGradient>
                                  </defs>

                                  {/* Grid Lines */}
                                  <line x1="20" y1="12" x2="100%" y2="12" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5" strokeDasharray="1,1" />
                                  <line x1="20" y1="34" x2="100%" y2="34" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5" strokeDasharray="1,1" />
                                  <line x1="20" y1="56" x2="100%" y2="56" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5" strokeDasharray="1,1" />
                                  <line x1="20" y1="78" x2="100%" y2="78" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />

                                  {/* Axis Labels */}
                                  <text x="0" y="14" fill="rgba(255,255,255,0.2)" fontSize="4.5" fontWeight="bold">300ms</text>
                                  <text x="0" y="36" fill="rgba(255,255,255,0.2)" fontSize="4.5" fontWeight="bold">150ms</text>
                                  <text x="0" y="58" fill="rgba(255,255,255,0.2)" fontSize="4.5" fontWeight="bold">50ms</text>

                                  {/* Blue Area & Path (Server Load) */}
                                  <path 
                                    d="M 20 65 Q 35 25, 50 45 T 80 20 T 110 50 T 140 30 T 170 48 L 100% 78 L 20 78 Z" 
                                    fill="url(#blueAreaGrad)" 
                                  />
                                  <path 
                                    d="M 20 65 Q 35 25, 50 45 T 80 20 T 110 50 T 140 30 T 170 48" 
                                    fill="none" 
                                    stroke="#3B82F6" 
                                    strokeWidth="1" 
                                    className="drop-shadow-[0_0_4px_rgba(59,130,246,0.5)]"
                                  />

                                  {/* Rose Path (Latency spikes) */}
                                  <path 
                                    d="M 20 70 Q 35 60, 50 68 T 80 38 T 110 65 T 140 72 T 170 55 L 100% 78 L 20 78 Z" 
                                    fill="url(#roseAreaGrad)" 
                                  />
                                  <path 
                                    d="M 20 70 Q 35 60, 50 68 T 80 38 T 110 65 T 140 72 T 170 55" 
                                    fill="none" 
                                    stroke="#EF4444" 
                                    strokeWidth="0.8" 
                                    className="drop-shadow-[0_0_3px_rgba(239,68,68,0.5)]"
                                  />

                                  {/* Interactive Markers */}
                                  <circle cx="80" cy="20" r="1.5" fill="#3B82F6" stroke="white" strokeWidth="0.5" />
                                  <circle cx="80" cy="38" r="1.5" fill="#EF4444" stroke="white" strokeWidth="0.5" />
                                </svg>
                                
                                {/* Time Labels along bottom */}
                                <div className="absolute bottom-1 right-2 left-[20px] flex justify-between font-mono text-[4px] text-white/20 font-bold uppercase tracking-wider">
                                  <span>02:00</span>
                                  <span>06:00</span>
                                  <span>10:00</span>
                                  <span>14:00</span>
                                  <span>18:00</span>
                                  <span>22:00</span>
                                </div>
                              </div>
                            </div>

                            {/* Live Alerts & Integrations Panel */}
                            <div className="col-span-5 flex flex-col gap-1.5 overflow-hidden">
                              {/* Live Alerts box */}
                              <div className="p-1.5 rounded-lg bg-[#070A0F]/60 border border-white/[0.04] flex flex-col justify-between flex-grow overflow-y-auto scrollbar-none space-y-1">
                                <span className="text-[6.5px] font-extrabold text-white/50 uppercase border-b border-white/[0.03] pb-0.5 shrink-0">Live Alerts</span>
                                
                                <div className="space-y-1 text-[5.2px] leading-tight font-sans">
                                  <div className="p-1.2 rounded bg-rose-500/5 border border-rose-500/10 text-rose-300 font-medium flex items-center justify-between">
                                    <span>🚨 <span className="font-black uppercase">SLA Breach</span>: Room 104 request pending &gt;1h</span>
                                    <span className="font-mono text-white/20 shrink-0 ml-1">20:34</span>
                                  </div>
                                  <div className="p-1.2 rounded bg-yellow-500/5 border border-yellow-500/10 text-yellow-300 font-medium flex items-center justify-between">
                                    <span>🧹 <span className="font-black uppercase">Unassigned</span>: Room Service for Room 101</span>
                                    <span className="font-mono text-white/20 shrink-0 ml-1">14:03</span>
                                  </div>
                                  <div className="p-1.2 rounded bg-emerald-500/5 border border-emerald-500/10 text-emerald-300 font-medium flex items-center justify-between">
                                    <span>✓ <span className="font-black uppercase">System Backup</span>: Database snapshot saved</span>
                                    <span className="font-mono text-white/20 shrink-0 ml-1">11:00</span>
                                  </div>
                                  <div className="p-1.2 rounded bg-[#3B82F6]/5 border border-[#3B82F6]/10 text-blue-300 font-medium flex items-center justify-between">
                                    <span>💳 <span className="font-black uppercase">Payment</span>: ₹4,500 via Razorpay for Room 204</span>
                                    <span className="font-mono text-white/20 shrink-0 ml-1">09:15</span>
                                  </div>
                                  <div className="p-1.2 rounded bg-purple-500/5 border border-purple-500/10 text-purple-300 font-medium flex items-center justify-between">
                                    <span>📶 <span className="font-black uppercase">Network</span>: Router connected at Reception</span>
                                    <span className="font-mono text-white/20 shrink-0 ml-1">08:30</span>
                                  </div>
                                </div>
                              </div>

                              {/* Integrations status */}
                              <div className="p-1 px-1.5 rounded-lg bg-white/[0.01] border border-white/[0.04] flex items-center justify-between shrink-0 text-[6px] font-sans">
                                <div className="flex items-center gap-1 min-w-0 font-sans">
                                  <span className="text-[8px]">💳</span>
                                  <div className="flex flex-col min-w-0 leading-none">
                                    <span className="text-white font-extrabold truncate">Razorpay</span>
                                    <span className="text-white/25 text-[4.5px] truncate mt-0.5 font-sans">₹0 collected (24h)</span>
                                  </div>
                                </div>
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeMockupRoute === 'marketing' && (
                        <div className="space-y-2 h-full flex flex-col justify-between font-sans">
                          <div className="flex items-center justify-between shrink-0 font-sans">
                            <div className="flex flex-col">
                              <span className="text-[8.5px] font-black uppercase text-white font-outfit tracking-wide">Growth Marketing Hub</span>
                              <span className="text-[6px] text-white/30 font-sans font-medium">Deploy loyalty tiers, broadcast automated WhatsApp invitations, and track referral rewards</span>
                            </div>
                            <button className="px-2 py-0.5 bg-[#3B82F6] text-white text-[7px] font-extrabold uppercase tracking-wider rounded shadow hover:bg-[#2563EB] transition-colors shrink-0 flex items-center gap-0.5 font-sans">
                              <Plus size={7} />
                              <span>+ Launch Campaign</span>
                            </button>
                          </div>

                          {/* Stats Row */}
                          <div className="grid grid-cols-4 gap-1.5 shrink-0">
                            <div className="p-1.5 rounded-lg bg-white/[0.01]/70 border border-white/[0.04] shadow-sm flex flex-col justify-between h-[45px] leading-tight font-sans">
                              <span className="text-[5.5px] uppercase font-bold text-white/30 tracking-wider">Campaign Reach</span>
                              <div className="flex flex-col leading-none mt-1">
                                <span className="text-[9.5px] font-black text-white font-sans">14,280</span>
                                <span className="text-[4.5px] text-emerald-400 font-extrabold mt-0.5">+12.4% MONTHLY</span>
                              </div>
                            </div>

                            <div className="p-1.5 rounded-lg bg-white/[0.01]/70 border border-white/[0.04] shadow-sm flex flex-col justify-between h-[45px] leading-tight font-sans">
                              <span className="text-[5.5px] uppercase font-bold text-white/30 tracking-wider">Referral Signups</span>
                              <div className="flex flex-col leading-none mt-1 font-sans">
                                <span className="text-[9.5px] font-black text-white font-sans">348</span>
                                <span className="text-[4.5px] text-blue-400 font-bold mt-0.5">8.4% conversion</span>
                              </div>
                            </div>

                            <div className="p-1.5 rounded-lg bg-white/[0.01]/70 border border-white/[0.04] shadow-sm flex flex-col justify-between h-[45px] leading-tight font-sans">
                              <span className="text-[5.5px] uppercase font-bold text-white/30 tracking-wider">Cashback Paid</span>
                              <div className="flex flex-col leading-none mt-1 font-sans">
                                <span className="text-[9.5px] font-black text-white font-sans">₹12,450</span>
                                <span className="text-[4.5px] text-white/20 mt-0.5">Automated payouts</span>
                              </div>
                            </div>

                            <div className="p-1.5 rounded-lg bg-white/[0.01]/70 border border-white/[0.04] shadow-sm flex flex-col justify-between h-[45px] leading-tight font-sans">
                              <span className="text-[5.5px] uppercase font-bold text-white/30 tracking-wider">Loyalty Tiers</span>
                              <div className="flex flex-col leading-none mt-1 font-sans">
                                <span className="text-[9.5px] font-black text-white font-sans">1,204</span>
                                <span className="text-[4.5px] text-amber-400 font-extrabold mt-0.5">Active profiles</span>
                              </div>
                            </div>
                          </div>

                          {/* LOWER SPLIT LAYOUT */}
                          <div className="grid grid-cols-12 gap-2 flex-grow h-[120px] font-sans">
                            {/* Campaigns table/list */}
                            <div className="col-span-7 p-2 rounded-lg bg-[#070A0F]/60 border border-white/[0.04] flex flex-col justify-between overflow-hidden">
                              <span className="text-[7.5px] font-extrabold text-white/60 uppercase border-b border-white/[0.03] pb-1 shrink-0 font-sans">Active Broadcasts</span>
                              <div className="flex-grow pt-1 overflow-y-auto space-y-1 text-[6.5px] scrollbar-none font-sans">
                                <div className="grid grid-cols-12 font-black uppercase text-white/30 pb-0.5 border-b border-white/[0.04] text-center font-sans">
                                  <div className="col-span-5 text-left pl-1">Campaign Title</div>
                                  <div className="col-span-4 text-center">Audience</div>
                                  <div className="col-span-3 text-right pr-1">Booking %</div>
                                </div>

                                {[
                                  { title: "Weekend Getaway Promo", audience: "1,200 guests", rate: "18%", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
                                  { title: "Referral Cashback Alert", audience: "850 guests", rate: "12%", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
                                  { title: "Monsoon Wellness Tier", audience: "Scheduled", rate: "—", color: "text-white/40 bg-white/5 border-white/10" }
                                ].map((c, idx) => (
                                  <div key={idx} className="grid grid-cols-12 items-center text-white/80 py-1 border-b border-white/[0.02] text-center font-sans">
                                    <div className="col-span-5 text-left pl-1 flex flex-col leading-none min-w-0">
                                      <span className="font-extrabold text-white truncate">{c.title}</span>
                                      <span className="text-[5px] text-white/20 font-mono mt-0.5">WhatsApp Broadcast</span>
                                    </div>
                                    <div className="col-span-4 text-center text-white/40">{c.audience}</div>
                                    <div className="col-span-3 text-right pr-1 font-mono">
                                      <span className={cn("px-1 py-0.2 rounded text-[4.5px] font-black border uppercase font-sans", c.color)}>
                                        {c.rate}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Acquisition/Yield chart card */}
                            <div className="col-span-5 p-2 rounded-lg bg-[#070A0F]/60 border border-white/[0.04] flex flex-col justify-between overflow-hidden">
                              <span className="text-[7.5px] font-extrabold text-white/60 uppercase border-b border-white/[0.03] pb-1 shrink-0 font-sans">Acquisition Yield</span>
                              <div className="flex-grow relative h-[70px] mt-1">
                                <svg className="absolute inset-0 w-full h-full text-white/[0.03]" xmlns="http://www.w3.org/2000/svg">
                                  <line x1="15" y1="10" x2="100%" y2="10" stroke="currentColor" strokeWidth="0.5" strokeDasharray="1,1" />
                                  <line x1="15" y1="30" x2="100%" y2="30" stroke="currentColor" strokeWidth="0.5" strokeDasharray="1,1" />
                                  <line x1="15" y1="50" x2="100%" y2="50" stroke="currentColor" strokeWidth="0.5" strokeDasharray="1,1" />
                                  
                                  {/* Y-Axis Labels */}
                                  <text x="0" y="12" fill="currentColor" fontSize="5" fontWeight="bold">200</text>
                                  <text x="0" y="32" fill="currentColor" fontSize="5" fontWeight="bold">100</text>
                                  <text x="0" y="52" fill="currentColor" fontSize="5" fontWeight="bold">0</text>

                                  {/* Area & Path (Conversions) */}
                                  <path 
                                    d="M 15 50 Q 25 35, 45 42 T 75 22 T 105 18 L 100% 50 Z" 
                                    fill="rgba(59,130,246,0.15)" 
                                  />
                                  <path 
                                    d="M 15 50 Q 25 35, 45 42 T 75 22 T 105 18" 
                                    fill="none" 
                                    stroke="#3B82F6" 
                                    strokeWidth="1.2" 
                                    className="drop-shadow-[0_0_4px_rgba(59,130,246,0.5)]"
                                  />
                                </svg>
                                <div className="absolute bottom-0 right-1 left-[15px] flex justify-between font-mono text-[4.2px] text-white/20 font-bold uppercase tracking-wider">
                                  <span>Dec</span>
                                  <span>Jan</span>
                                  <span>Feb</span>
                                  <span>Mar</span>
                                  <span>Apr</span>
                                  <span>May</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>        </div>
      </header>

      {/* Main Sections */}
      <main className="pb-24">
        
        {/* Four Column Feature Cards Row */}
        <motion.section 
          id="ecosystem" 
          initial={{ opacity: 0, y: 35 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8 }}
          className="max-w-[1400px] mx-auto px-6 md:px-12 py-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8"
        >
          {[
            {
              title: "Smart Reservations",
              desc: "Manage bookings across all OTAs, channels, and direct web portal bookings in one place.",
              color: "shadow-[0_0_20px_rgba(168,85,247,0.1)] border-purple-500/10 text-purple-400 bg-purple-500/5",
              glow: "bg-purple-400/20",
              icon: CalendarDays
            },
            {
              title: "Housekeeping Made Easy",
              desc: "Real-time room status trackers with countdown timers for automated housekeeping pipelines.",
              color: "shadow-[0_0_20px_rgba(59,130,246,0.1)] border-blue-500/10 text-blue-400 bg-blue-500/5",
              glow: "bg-blue-400/20",
              icon: Bed
            },
            {
              title: "Guest Services",
              desc: "Offer friction-free, high-end guest experiences with automated check-in and F&B direct ordering.",
              color: "shadow-[0_0_20px_rgba(6,182,212,0.1)] border-cyan-500/10 text-cyan-400 bg-cyan-500/5",
              glow: "bg-cyan-400/20",
              icon: Users
            },
            {
              title: "Reports & Insights",
              desc: "Make high-definition financial decisions with SLA compliance, occupancy, and payroll metrics.",
              color: "shadow-[0_0_20px_rgba(59,130,246,0.1)] border-indigo-500/10 text-indigo-400 bg-indigo-500/5",
              glow: "bg-indigo-400/20",
              icon: BarChart3
            }
          ].map((item, idx) => (
            <div
              key={idx}
              className="p-8 rounded-3xl bg-white/[0.01] border border-white/[0.04] hover:bg-white/[0.02] hover:border-white/10 hover:-translate-y-1 transition-all duration-300 space-y-4 group/card"
            >
              <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center border relative overflow-hidden", item.color)}>
                <div className={cn("absolute inset-0 opacity-15 animate-pulse", item.glow)} />
                <item.icon className="w-4 h-4 relative z-10 transition-transform duration-500 group-hover/card:scale-110 group-hover/card:rotate-6" />
              </div>
              <h3 className="text-base font-bold text-white font-outfit">{item.title}</h3>
              <p className="text-xs text-white/40 font-light leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </motion.section>

        <motion.section 
          id="features"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.9 }}
          className="max-w-[1400px] mx-auto px-6 md:px-12 py-16 space-y-12"
        >
          <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white font-outfit uppercase">Everything You Need to Run Your Hotel</h2>
            <p className="text-sm md:text-base text-white/40 font-light max-w-xl mx-auto">
              Powerful operational features. Simple to use. Precision-engineered for hotel teams.
            </p>
          </div>

          {/* Interactive cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            
            {/* Card 1: Front Desk */}
            <div className="p-6 rounded-[2rem] bg-white/[0.01] border border-white/[0.04] space-y-6 flex flex-col justify-between h-[360px] hover:border-white/10 transition-colors group">
              <div className="space-y-2">
                <h4 className="text-base font-bold text-white font-outfit">Front Desk</h4>
                <p className="text-xs text-white/40 leading-relaxed font-light">
                  Streamline online check-in, dynamic checkout, and masked guest ID verification.
                </p>
              </div>

              {/* Front Desk Live Action Widget */}
              <div className="bg-[#0A0D14] border border-white/[0.05] rounded-2xl p-4 space-y-3 relative overflow-hidden text-[9px] shadow-lg">
                <div className="space-y-2">
                  <div className="flex justify-between border-b border-white/[0.03] pb-1.5">
                    <span className="text-white/35">Guest Name</span>
                    <span className="font-semibold text-white">{mockCheckinName}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/[0.03] pb-1.5 items-center">
                    <span className="text-white/35">Room</span>
                    <select
                      value={mockCheckinRoom}
                      onChange={(e) => setMockCheckinRoom(e.target.value)}
                      className="bg-transparent border border-white/10 rounded px-1 text-[8px] outline-none text-white cursor-pointer"
                    >
                      <option value="301 - Deluxe" className="bg-[#0A0D14]">301 - Deluxe</option>
                      <option value="102 - Standard" className="bg-[#0A0D14]">102 - Standard</option>
                      <option value="204 - Suite" className="bg-[#0A0D14]">204 - Suite</option>
                    </select>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/35">ID Verified</span>
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">✓ Yes</span>
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    setMockCheckedIn(true)
                    toast.success("Guest checked in successfully!")
                  }}
                  disabled={mockCheckedIn}
                  className={cn(
                    "w-full py-2 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer text-center",
                    mockCheckedIn 
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                      : "bg-[#3B82F6] text-white hover:bg-[#2563EB]"
                  )}
                >
                  {mockCheckedIn ? "Checked In" : "Check-in"}
                </button>
              </div>
            </div>

            {/* Card 2: Housekeeping */}
            <div className="p-6 rounded-[2rem] bg-white/[0.01] border border-white/[0.04] space-y-6 flex flex-col justify-between h-[360px] hover:border-white/10 transition-colors">
              <div className="space-y-2">
                <h4 className="text-base font-bold text-white font-outfit">Housekeeping</h4>
                <p className="text-xs text-white/40 leading-relaxed font-light">
                  Assign tasks automatically and track progress in real-time.
                </p>
              </div>

              {/* Housekeeping Action Widget */}
              <div className="bg-[#0A0D14] border border-white/[0.05] rounded-2xl p-4 space-y-3 relative text-[9px] shadow-lg">
                <span className="text-[8px] font-bold text-white/30 uppercase">Room Status</span>
                <div className="space-y-2.5">
                  {housekeepingStatus.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between border-b border-white/[0.02] pb-1.5 last:border-0 last:pb-0">
                      <span className="font-semibold text-white">{item.room}</span>
                      <div className="flex items-center gap-2">
                        <span className={cn("px-1.5 py-0.5 rounded text-[8px] border font-medium", item.color)}>
                          {item.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Card 3: Staff Management */}
            <div className="p-6 rounded-[2rem] bg-white/[0.01] border border-white/[0.04] space-y-6 flex flex-col justify-between h-[360px] hover:border-white/10 transition-colors">
              <div className="space-y-2">
                <h4 className="text-base font-bold text-white font-outfit">Staff Management</h4>
                <p className="text-xs text-white/40 leading-relaxed font-light">
                  Manage employee profiles, GPS geofenced attendance, and shift schedules.
                </p>
              </div>

              {/* Staff Management Widget */}
              <div className="bg-[#0A0D14] border border-white/[0.05] rounded-2xl p-4 space-y-3 relative text-[9px] shadow-lg">
                <div className="space-y-2.5">
                  {[
                    { name: "Ramesh Kumar", role: "Housekeeping", status: "On Duty", green: true },
                    { name: "Priya Singh", role: "Front Desk", status: "On Duty", green: true },
                    { name: "Vikram Patel", role: "Maintenance", status: "Off Duty" }
                  ].map((staff, idx) => (
                    <div key={idx} className="flex items-center justify-between border-b border-white/[0.02] pb-1.5 last:border-0 last:pb-0">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-bold text-white text-[8px]">
                          {staff.name[0]}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-white">{staff.name}</span>
                          <span className="text-[7.5px] text-white/30">{staff.role}</span>
                        </div>
                      </div>
                      <span className={cn(
                        "text-[7px] px-1.5 py-0.5 rounded font-bold uppercase",
                        staff.green 
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                          : "bg-white/5 text-white/30 border border-white/10"
                      )}>
                        {staff.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Card 4: Reports */}
            <div className="p-6 rounded-[2rem] bg-white/[0.01] border border-white/[0.04] space-y-6 flex flex-col justify-between h-[360px] hover:border-white/10 transition-colors">
              <div className="space-y-2">
                <h4 className="text-base font-bold text-white font-outfit">Reports & Analytics</h4>
                <p className="text-xs text-white/40 leading-relaxed font-light">
                  Track real-time occupancy metrics, automated payroll, and yield analysis.
                </p>
              </div>

              {/* Reports Mini Chart Widget */}
              <div className="bg-[#0A0D14] border border-white/[0.05] rounded-2xl p-4 space-y-3 relative text-[9px] shadow-lg flex flex-col justify-between h-[135px]">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col">
                    <span className="text-[8px] font-bold text-white/30 uppercase">Revenue Overview</span>
                    <span className="text-xs font-semibold text-white mt-0.5">₹1,24,560</span>
                  </div>
                  <span className="text-[7px] text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-1 py-0.5 rounded">
                    +18%
                  </span>
                </div>
                <div className="h-10 w-full mt-2">
                  <svg className="w-full h-full" viewBox="0 0 100 40">
                    <path
                      d="M0,35 Q15,30 25,25 T50,22 T75,12 T100,5"
                      fill="none"
                      stroke="#3B82F6"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M0,35 Q15,30 25,25 T50,22 T75,12 T100,5 L100,40 L0,40 Z"
                      fill="url(#chartGlow)"
                    />
                  </svg>
                </div>
              </div>
            </div>

          </div>
        </motion.section>


        {/* Pricing Toggle Controls */}
        <motion.section 
          id="pricing" 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="max-w-[1400px] mx-auto px-8 py-6 mb-8 flex flex-col sm:flex-row justify-between items-center gap-6 bg-white/[0.01] border border-white/[0.04] rounded-[2rem] backdrop-blur-3xl"
        >
          {/* Centered/Left branding title */}
          <div className="flex flex-col text-center sm:text-left">
            <h2 className="text-xl md:text-2xl font-extrabold text-white font-outfit uppercase tracking-tight">Simple, Transparent Pricing</h2>
            <p className="text-[9px] text-white/30 uppercase font-extrabold tracking-wider mt-0.5">Choose the perfect plan for your property</p>
          </div>

          {/* Premium Billing sliding tab toggle */}
          <div className="flex p-1 rounded-2xl bg-[#090C12] border border-white/[0.05] relative shadow-lg overflow-hidden shrink-0 select-none">
            {/* Sliding Pill Background */}
            <div 
              className={cn(
                "absolute top-1 bottom-1 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-300 ease-out shadow-md",
                isAnnual ? "left-[102px] w-[96px]" : "left-1 w-[98px]"
              )} 
            />
            
            {/* Monthly Tab Button */}
            <button
              onClick={() => setIsAnnual(false)}
              className={cn(
                "relative z-10 px-4 py-2 text-[9px] font-extrabold tracking-widest uppercase transition-colors duration-300 w-[98px] text-center",
                !isAnnual ? "text-white" : "text-white/40 hover:text-white/60"
              )}
            >
              MONTHLY
            </button>
            
            {/* Annual Tab Button */}
            <button
              onClick={() => setIsAnnual(true)}
              className={cn(
                "relative z-10 px-4 py-2 text-[9px] font-extrabold tracking-widest uppercase transition-colors duration-300 w-[96px] text-center flex items-center justify-center gap-1",
                isAnnual ? "text-white" : "text-white/40 hover:text-white/60"
              )}
            >
              <span>ANNUAL</span>
              <span className="scale-[0.8] origin-right text-[7px] font-extrabold tracking-normal bg-white/20 text-white px-1.5 py-0.5 rounded-full shrink-0">
                -10%
              </span>
            </button>
          </div>
        </motion.section>

        {/* Plan Pricing Cards - Breathtaking Obsidian StayIn Style */}
        <section className="max-w-[1400px] mx-auto px-6 md:px-12 mb-24 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8 items-stretch">
          {PLANS.map((plan, idx) => {
            const isSelected = selectedPlanId === plan.id
            const isStandard = plan.id === 'standard'

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: idx * 0.1 }}
                viewport={{ once: true }}
                onClick={() => setSelectedPlanId(plan.id)}
                className={cn(
                  "relative rounded-[2.5rem] flex flex-col bg-white/[0.01] cursor-pointer transition-all duration-500 group overflow-hidden p-8 border",
                  isStandard
                    ? "border-amber-400/40 shadow-[0_20px_50px_-5px_rgba(212,175,55,0.15)] bg-amber-400/[0.01]"
                    : isSelected
                      ? "border-[#3B82F6]/40 shadow-[0_20px_45px_-5px_rgba(59,130,246,0.15)] bg-white/[0.03]"
                      : "border-white/[0.04] hover:border-white/10 hover:bg-white/[0.02]"
                )}
              >
                {/* Standard Popular Badge */}
                {isStandard && (
                  <div className="absolute top-4 right-4 bg-amber-400 text-[#05070C] text-[8px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-full select-none">
                    Most Popular
                  </div>
                )}

                <div className="flex flex-col flex-grow justify-between gap-8">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xl font-extrabold text-white font-outfit uppercase tracking-wider">{plan.name}</h3>
                      <p className="text-[10px] text-white/30 font-medium mt-1 leading-normal">{plan.tagline}</p>
                    </div>

                    <div className="h-[88px] flex flex-col justify-end">
                      {plan.originalPriceMonthly && (
                        <div className="text-lg text-white/50 line-through decoration-white/40 decoration-2 font-black mb-0.5">
                          {formatPrice(isAnnual && plan.originalPriceAnnual ? plan.originalPriceAnnual : plan.originalPriceMonthly)}
                        </div>
                      )}
                      <div className={cn(
                        "text-3xl font-extrabold tracking-tight font-outfit leading-none",
                        isStandard ? "text-[#C5A880]" : "text-white"
                      )}>
                        {formatPrice(isAnnual && typeof plan.priceAnnual === 'number' ? plan.priceAnnual : plan.priceMonthly)}
                      </div>
                      <div className="text-[8px] text-white/35 font-bold tracking-wider uppercase mt-2">
                        {typeof plan.priceMonthly === 'string' ? 'Global Custom Setup' : '/ property / month'}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedPlanId(plan.id)
                      setIsRegistering(true)
                    }}
                    className={cn(
                      "w-full py-3.5 rounded-2xl font-bold text-[10px] uppercase tracking-[0.2em] flex items-center justify-center transition-all duration-300 border cursor-pointer",
                      isStandard
                        ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-black border-amber-400 hover:from-amber-600 hover:to-yellow-500 shadow-[0_10px_20px_rgba(212,175,55,0.25)] font-extrabold"
                        : isSelected
                          ? "bg-[#3B82F6] text-white border-[#3B82F6] hover:bg-[#2563EB]"
                          : "bg-transparent text-white border-white/10 hover:bg-white hover:text-black hover:border-white"
                    )}
                  >
                    {plan.cta}
                  </button>

                  <div className="space-y-4 pt-6 border-t border-white/[0.04] flex-grow">
                    <span className="text-[8.5px] font-extrabold uppercase tracking-[0.2em] text-white/30 block">
                      {plan.id === 'base' ? 'CORE BUNDLE INCLUDES:' : `ALL ${PLANS[idx - 1]?.name.toUpperCase()}, PLUS:`}
                    </span>

                    <ul className="space-y-3.5">
                      {plan.features.map((feat, fIdx) => (
                        <li key={fIdx} className="flex items-start gap-3 text-xs text-white/50 font-light leading-relaxed">
                          <span className={cn(
                            "mt-0.5 text-[9px] shrink-0 font-bold",
                            isStandard ? "text-[#C5A880]" : "text-[#3B82F6]"
                          )}>
                            ✓
                          </span>
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </section>

        {/* Feature Comparison Section Header */}
        <motion.section 
          id="comparison" 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="max-w-[1400px] mx-auto px-6 md:px-12 mb-12 text-center pt-16 border-t border-white/[0.03]"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 tracking-tight font-outfit uppercase">Compare Capabilities</h2>
          <p className="text-white/40 font-light text-sm md:text-base max-w-xl mx-auto">
            Discover exactly what granular PMS, app, and billing capabilities are packaged with your operational licensing tier.
          </p>
        </motion.section>

        {/* Full Feature Table Component - Kept Similar as requested */}
        <motion.section 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-120px" }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className="max-w-[1400px] mx-auto px-6 md:px-12 overflow-x-auto pb-16"
        >
          <div className="min-w-[900px] border border-white/[0.05] rounded-3xl bg-[#05070C]/90 overflow-hidden shadow-2xl backdrop-blur-2xl">
            
            {/* Table Header */}
            <div className="grid grid-cols-12 bg-black/60 border-b border-white/[0.05] p-5 sticky top-0 z-30 items-center select-none">
              <div className="col-span-4 text-[10px] font-bold uppercase tracking-[0.3em] text-white/30">All System Features</div>
              <div className="col-span-2 text-center font-extrabold text-[11px] text-white font-outfit uppercase tracking-wider">Base</div>
              <div className="col-span-2 text-center font-extrabold text-[11px] text-white font-outfit uppercase tracking-wider">Starter</div>
              <div className="col-span-2 text-center font-extrabold text-[11px] text-amber-400 font-outfit uppercase tracking-wider flex items-center justify-center gap-1.5 bg-amber-400/[0.02] py-1 border-x border-amber-400/10">
                Standard <Sparkles size={11} className="text-amber-400" />
              </div>
              <div className="col-span-2 text-center font-extrabold text-[11px] text-white font-outfit uppercase tracking-wider">Enterprise</div>
            </div>

            {/* Matrix rows iterating */}
            <div className="divide-y divide-white/[0.03]">
              {FEATURES_MATRIX.map((feat, rIdx) => (
                <div
                  key={rIdx}
                  className="grid grid-cols-12 p-5 items-center hover:bg-white/[0.02] transition-colors group"
                >
                  <div className="col-span-4 pr-4">
                    <span className="text-xs font-bold text-white/70 group-hover:text-white transition-colors font-outfit tracking-wide">
                      {feat.name}
                    </span>
                  </div>

                  {/* Base Check */}
                  <div className="col-span-2 text-center flex items-center justify-center">
                    {feat.base === '✓' ? (
                      <span className="text-[#3B82F6] font-bold text-sm">✓</span>
                    ) : feat.base === '—' ? (
                      <span className="text-white/10">—</span>
                    ) : (
                      <span className="text-[10px] font-medium text-white/35 font-mono">{feat.base}</span>
                    )}
                  </div>

                  {/* Starter Check */}
                  <div className="col-span-2 text-center flex items-center justify-center">
                    {feat.starter === '✓' ? (
                      <span className="text-[#3B82F6] font-bold text-sm">✓</span>
                    ) : feat.starter === '—' ? (
                      <span className="text-white/10">—</span>
                    ) : (
                      <span className="text-[10px] font-medium text-white/50 font-mono">{feat.starter}</span>
                    )}
                  </div>

                  {/* Standard Check (Highlighted) */}
                  <div className="col-span-2 text-center flex items-center justify-center bg-amber-400/[0.01] border-x border-amber-400/5 py-1">
                    {feat.standard === '✓' ? (
                      <span className="text-amber-400 font-extrabold text-sm drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]">✓</span>
                    ) : feat.standard === '—' ? (
                      <span className="text-white/10">—</span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.1)] font-mono">{feat.standard}</span>
                    )}
                  </div>

                  {/* Enterprise Check */}
                  <div className="col-span-2 text-center flex items-center justify-center">
                    {feat.enterprise === '✓' ? (
                      <span className="text-emerald-400 font-bold text-sm">✓</span>
                    ) : feat.enterprise === '—' ? (
                      <span className="text-white/10">—</span>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-400 font-mono">{feat.enterprise}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

          </div>
        </motion.section>

        {/* Trust Footer Banner */}
        <section className="text-center py-8 max-w-[1400px] mx-auto px-6 border-t border-white/[0.03]">
          <div className="inline-flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] font-bold tracking-widest text-white/40 uppercase">
            <span>Trusted by 250+ hotels across India</span>
            <div className="flex gap-1 text-amber-400 text-sm">
              <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
            </div>
            <span className="text-white">4.9/5 Rating</span>
          </div>
        </section>

        {/* Testimonials Slider & Animated Metrics Section */}
        <motion.section
          id="testimonials"
          initial={{ opacity: 0, y: 35 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="max-w-[1400px] mx-auto px-6 md:px-12 py-16 grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch"
        >
          {/* Left Column: Testimonial Card Slider */}
          <div className="lg:col-span-7 flex flex-col justify-between p-8 md:p-10 rounded-[2.5rem] bg-gradient-to-br from-white/[0.02] to-transparent border border-white/[0.04] backdrop-blur-3xl relative overflow-hidden shadow-2xl">
            {/* Absolute Glowing Backdrop Decorative light */}
            <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-[#3B82F6]/[0.02] blur-[80px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[150px] h-[150px] bg-indigo-500/[0.01] blur-[70px] pointer-events-none" />

            <div className="space-y-6 relative z-10">
              {/* Stars & Header */}
              <div className="flex items-center justify-between">
                <div className="flex gap-1 text-amber-400 text-[10px]">
                  {Array.from({ length: TESTIMONIALS[activeTestimonialIdx].rating }).map((_, i) => (
                    <span key={i} className="animate-pulse">★</span>
                  ))}
                </div>
                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-[#3B82F6] bg-[#3B82F6]/10 px-2.5 py-1 rounded-full border border-[#3B82F6]/20">
                  Partner Success
                </span>
              </div>

              {/* Breathtaking Sliding Quote with AnimatePresence */}
              <div className="min-h-[110px] flex items-center text-left">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={activeTestimonialIdx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="text-sm md:text-base font-light text-white/90 leading-relaxed italic"
                  >
                    &quot;{TESTIMONIALS[activeTestimonialIdx].quote}&quot;
                  </motion.p>
                </AnimatePresence>
              </div>
            </div>

            {/* Testimonial Author Meta & Sleek Controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pt-6 border-t border-white/[0.04] mt-8 relative z-10 shrink-0">
              <AnimatePresence mode="wait">
                <motion.div 
                  key={activeTestimonialIdx}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center gap-3.5 text-left"
                >
                  <img 
                    src={TESTIMONIALS[activeTestimonialIdx].avatar} 
                    alt={TESTIMONIALS[activeTestimonialIdx].author} 
                    className="w-10 h-10 rounded-full object-cover border border-white/10 shadow-md"
                  />
                  <div className="flex flex-col text-left leading-tight">
                    <span className="text-xs font-bold text-white font-outfit">{TESTIMONIALS[activeTestimonialIdx].author}</span>
                    <span className="text-[10px] text-white/40 font-light mt-0.5">
                      {TESTIMONIALS[activeTestimonialIdx].role} · <span className="text-[#3B82F6] font-semibold">{TESTIMONIALS[activeTestimonialIdx].property}</span>
                    </span>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Caret Navigation Buttons */}
              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <button
                  onClick={() => setActiveTestimonialIdx((prev) => (prev === 0 ? TESTIMONIALS.length - 1 : prev - 1))}
                  className="w-8 h-8 rounded-xl flex items-center justify-center border border-white/10 hover:border-white/20 hover:bg-white/5 text-white/60 hover:text-white transition-all active:scale-95"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={() => setActiveTestimonialIdx((prev) => (prev === TESTIMONIALS.length - 1 ? 0 : prev + 1))}
                  className="w-8 h-8 rounded-xl flex items-center justify-center border border-white/10 hover:border-white/20 hover:bg-white/5 text-white/60 hover:text-white transition-all active:scale-95"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Breathtaking Animated Metrics Grid */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-6">
            
            {/* Metric Card 1 */}
            <div className="p-6 rounded-[2rem] bg-white/[0.01] border border-white/[0.04] hover:bg-white/[0.02] hover:border-white/10 transition-all duration-300 group flex items-center justify-between shadow-lg relative overflow-hidden">
              <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-[#3B82F6]/[0.01] rounded-full group-hover:scale-150 transition-transform duration-500 blur-xl" />
              <div className="space-y-1.5 text-left relative z-10">
                <span className="text-xl md:text-2xl font-black text-white font-outfit uppercase tracking-tight">250+</span>
                <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest leading-none">Hotels active across india</p>
                <p className="text-[9px] text-white/20 leading-relaxed font-light pt-0.5">Boutique retreats, resorts, and premium properties running daily operations.</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/5 border border-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform shrink-0 ml-4 relative z-10 font-sans text-sm">
                🏢
              </div>
            </div>

            {/* Metric Card 2 */}
            <div className="p-6 rounded-[2rem] bg-white/[0.01] border border-white/[0.04] hover:bg-white/[0.02] hover:border-white/10 transition-all duration-300 group flex items-center justify-between shadow-lg relative overflow-hidden">
              <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-emerald-500/[0.01] rounded-full group-hover:scale-150 transition-transform duration-500 blur-xl" />
              <div className="space-y-1.5 text-left relative z-10">
                <span className="text-xl md:text-2xl font-black text-white font-outfit uppercase tracking-tight">99.98%</span>
                <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest leading-none">Uptime & platform sla</p>
                <p className="text-[9px] text-white/20 leading-relaxed font-light pt-0.5">Strict backup snapshotting and fault-tolerant architecture with direct api support.</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform shrink-0 ml-4 relative z-10 font-sans text-sm">
                ⚡
              </div>
            </div>

            {/* Metric Card 3 */}
            <div className="p-6 rounded-[2rem] bg-white/[0.01] border border-white/[0.04] hover:bg-white/[0.02] hover:border-white/10 transition-all duration-300 group flex items-center justify-between shadow-lg relative overflow-hidden">
              <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-purple-500/[0.01] rounded-full group-hover:scale-150 transition-transform duration-500 blur-xl" />
              <div className="space-y-1.5 text-left relative z-10">
                <span className="text-xl md:text-2xl font-black text-white font-outfit uppercase tracking-tight">15%</span>
                <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest leading-none">Average direct revenue yield</p>
                <p className="text-[9px] text-white/20 leading-relaxed font-light pt-0.5">Direct F&B upsell and guest booking channels reducing heavy OTA commissions.</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-500/5 border border-purple-500/10 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform shrink-0 ml-4 relative z-10 font-sans text-sm">
                📈
              </div>
            </div>

          </div>
        </motion.section>

        {/* Bottom CTA Banner */}
        <motion.section 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="max-w-[1400px] mx-auto px-6 md:px-12 mt-12 mb-20"
        >
          <div className="relative rounded-[3rem] overflow-hidden border border-white/[0.04] bg-gradient-to-br from-[#0B0F19] to-[#05070C] p-10 md:p-16 group shadow-3xl">
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#3B82F6]/[0.02] blur-[150px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-indigo-500/[0.01] blur-[120px] pointer-events-none" />

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              
              {/* Content */}
              <div className="lg:col-span-7 space-y-6 text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#3B82F6]/10 border border-[#3B82F6]/20">
                  <Sparkles size={10} className="text-[#3B82F6]" />
                  <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#3B82F6]">Direct commission loops</span>
                </div>

                <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-[1.08] font-outfit text-white uppercase">
                  Take Complete Control <br />
                  <span className="bg-gradient-to-r from-white via-white to-white/40 bg-clip-text text-transparent">Of Your Property Today</span>
                </h2>

                <p className="text-xs md:text-sm text-white/40 leading-relaxed font-light max-w-xl">
                  Instantly synchronize frontdesk schedules, optimize staff attendance logs, and bypass third-party OTA commissions with our premium, co-branded Guest Web Portal.
                </p>
              </div>

              {/* Action Box */}
              <div className="lg:col-span-5 w-full flex justify-center">
                <div className="bg-white/[0.01] border border-white/[0.06] rounded-3xl p-6 md:p-8 flex flex-col items-center gap-6 w-full max-w-[360px] shadow-2xl relative">
                  <div className="text-center space-y-1">
                    <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-white/30">Immediate Provisioning</span>
                    <h4 className="text-lg font-bold text-white font-outfit uppercase">Get Started Instantly</h4>
                  </div>

                  <div className="w-full space-y-3">
                    <button
                      onClick={() => {
                        setSelectedPlanId('standard')
                        setIsRegistering(true)
                      }}
                      className="w-full py-4 bg-[#3B82F6] text-white rounded-2xl text-[10px] font-extrabold uppercase tracking-[0.25em] shadow-[0_12px_25px_rgba(59,130,246,0.2)] hover:shadow-[0_15px_30px_rgba(59,130,246,0.35)] hover:scale-[1.01] transition-all duration-300 cursor-pointer"
                    >
                      Start Free Trial
                    </button>

                    <Link
                      href="/staff/login"
                      className="w-full py-4 bg-white/[0.02] border border-white/10 rounded-2xl text-[10px] font-bold uppercase tracking-[0.25em] text-white text-center hover:bg-white/[0.04] transition-all flex items-center justify-center cursor-pointer"
                    >
                      Staff Portal Login
                    </Link>
                  </div>

                  <div className="flex flex-col items-center gap-1 text-white/30 text-[8px] uppercase tracking-widest font-semibold pt-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#3B82F6]">✓</span> No credit card required
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#3B82F6]">✓</span> Setup completed in 60s
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </motion.section>


      </main>

      {/* Global Footer */}
      <footer className="py-20 bg-[#030406] border-t border-white/[0.03] relative overflow-hidden">
        {/* Subtle decorative background ambient glow */}
        <div className="absolute top-0 left-1/4 w-[350px] h-[350px] bg-amber-400/[0.02] blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[350px] h-[350px] bg-blue-500/[0.015] blur-[120px] pointer-events-none" />

        <div className="max-w-[1400px] mx-auto px-6 md:px-12 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-16 mb-16">
            
            {/* Column 1: Brand & Premium Newsletter */}
            <div className="xl:col-span-2 space-y-6 text-left">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full overflow-hidden border border-amber-400/20 bg-white/10 p-0.5 shadow-sm flex items-center justify-center">
                  <img src="/images/image copy.png" alt="StayIn Logo" className="w-full h-full object-contain rounded-full" />
                </div>
                <span className="text-lg font-bold tracking-[0.2em] text-white uppercase font-outfit leading-none">StayIn</span>
              </div>
              <p className="text-xs text-white/30 font-light leading-relaxed max-w-xs">
                Simple and powerful hotel management software. Manage your front desk, bookings, staff payroll, food menus, and guest check-ins all in one unified platform.
              </p>
              
              {/* Sleek newsletter signup block */}
              <div className="space-y-2 pt-2">
                <span className="text-[8.5px] font-bold uppercase tracking-widest text-[#3B82F6]">Subscribe to our newsletter</span>
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const input = form.elements.namedItem('email') as HTMLInputElement;
                    if (input?.value) {
                      toast.success(`Newsletter subscription active for ${input.value}!`, { duration: 3500 });
                      input.value = '';
                    }
                  }}
                  className="flex max-w-xs rounded-xl overflow-hidden border border-white/[0.06] bg-white/[0.02] focus-within:border-amber-400/30 focus-within:shadow-[0_0_15px_rgba(212,175,55,0.05)] transition-all duration-300"
                >
                  <input 
                    name="email"
                    type="email" 
                    placeholder="Enter email address" 
                    required
                    className="w-full px-4 py-2.5 bg-transparent text-xs text-white placeholder-white/20 focus:outline-none"
                  />
                  <button 
                    type="submit"
                    className="px-4 bg-white/5 border-l border-white/[0.06] text-white text-[10px] font-black uppercase tracking-wider hover:bg-white/10 hover:text-amber-400 transition-all cursor-pointer"
                  >
                    Join
                  </button>
                </form>
              </div>
            </div>

            <div className="space-y-4 text-left">
              <h5 className="text-[9px] font-extrabold uppercase tracking-[0.3em] text-white">Product</h5>
              <div className="flex flex-col gap-3 text-xs text-white/35 font-light">
                <a href="#ecosystem" className="hover:text-white transition-colors">Ecosystem</a>
                <a href="#features" className="hover:text-white transition-colors">Features</a>
              </div>
            </div>

            <div className="space-y-4 text-left">
              <h5 className="text-[9px] font-extrabold uppercase tracking-[0.3em] text-white">Company</h5>
              <div className="flex flex-col gap-3 text-xs text-white/35 font-light">
                <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
                <a href="#testimonials" className="hover:text-white transition-colors">Stories</a>
              </div>
            </div>

            <div className="space-y-4 text-left">
              <h5 className="text-[9px] font-extrabold uppercase tracking-[0.3em] text-white">Portals</h5>
              <div className="flex flex-col gap-3 text-xs text-white/35 font-light">
                <Link href="/admin/login" className="hover:text-white transition-colors">Admin</Link>
                <Link href="/staff/login" className="hover:text-white transition-colors">Staff</Link>
              </div>
            </div>

            <div className="space-y-4 text-left">
              <h5 className="text-[9px] font-extrabold uppercase tracking-[0.3em] text-white">Legal</h5>
              <div className="flex flex-col gap-3 text-xs text-white/35 font-light">
                <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
                <Link href="/terms" className="hover:text-white transition-colors">Terms & Conditions</Link>
                <Link href="/refundpolicy" className="hover:text-white transition-colors">Refund & Cancellation</Link>
                <Link href="/contactus" className="hover:text-white transition-colors">Contact Us</Link>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-white/[0.03] flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-[8px] font-bold tracking-[0.35em] text-white/10 uppercase">&copy; 2026 STAYIN CORE. ALL RIGHTS RESERVED.</div>
            <div className="flex gap-6 text-[8px] font-bold tracking-[0.25em] text-white/20 uppercase">
              <Link href="/privacy" className="hover:text-[#3B82F6] transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-[#3B82F6] transition-colors">Terms</Link>
              <Link href="/refundpolicy" className="hover:text-[#3B82F6] transition-colors">Refunds</Link>
              <Link href="/contactus" className="hover:text-[#3B82F6] transition-colors">Contact</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Mobile Navigation Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-0 z-[200] bg-[#05070C] p-8 flex flex-col items-start justify-center gap-10"
          >
            <button
              className="absolute top-6 right-6 p-2 text-white/40 hover:text-white"
              onClick={() => setMobileMenuOpen(false)}
            >
              <X size={26} />
            </button>

            <div className="flex flex-col gap-6">
              {[
                { label: 'Product', href: '#ecosystem' },
                { label: 'Features', href: '#features' },
                { label: 'Pricing', href: '#pricing' },
                { label: 'Comparison', href: '#comparison' }
              ].map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-3xl font-bold text-white uppercase tracking-tight font-outfit"
                >
                  {link.label}
                </a>
              ))}
            </div>

            <Link
              href="/admin/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full py-4 bg-[#3B82F6] text-white text-center rounded-2xl text-xs font-bold uppercase tracking-[0.25em] shadow-xl"
            >
              Login
            </Link>
          </motion.div>
        )}
      </AnimatePresence>



      {/* Google Workspace Style Registration Wizard Overlay */}
      <AnimatePresence>
        {isRegistering && (
          <RegistrationWizard
            selectedPlanId={selectedPlanId}
            onClose={() => setIsRegistering(false)}
            isAnnual={isAnnual}
            userCount={userCount}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
