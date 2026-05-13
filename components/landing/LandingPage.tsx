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
  Key
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
    tagline: 'Essential operational layer for independent boutique hotels.',
    priceMonthly: 499,
    priceAnnual: 449,
    discountLabel: '10% off for 3 months',
    cta: 'Start a trial',
    accentColor: 'from-blue-500 to-cyan-400',
    features: [
      'Up to 30 active rooms',
      'Core Property Management Hub',
      'Digital Guest self check-in portal',
      'Basic real-time bookings tracking',
      'Role-based staff permissions presets'
    ]
  },
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'Elevate guest experience with rich mobile app-like controls.',
    priceMonthly: 1499,
    priceAnnual: 1349,
    cta: 'Start a trial',
    accentColor: 'from-indigo-500 to-purple-500',
    features: [
      'Up to 100 active rooms',
      'Integrated Guest Web App Platform',
      'Real-time staff service request pipeline',
      'Loyalty Referral engine automation',
      'Standard Razorpay platform support'
    ]
  },
  {
    id: 'standard',
    name: 'Standard',
    tagline: 'Complete command center for high-yield hospitality groups.',
    priceMonthly: 3499,
    priceAnnual: 3149,
    discountLabel: 'Best Value',
    cta: 'Start a trial',
    accentColor: 'from-blue-600 via-indigo-500 to-teal-400',
    features: [
      'Unlimited rooms & staff accounts',
      'Unified Guest Wallet & Cashbacks Engine',
      'Dynamic Shift Scheduling & Leave Management',
      'Custom property Razorpay API override',
      'Predictive Yield & ADR analytics dashboard'
    ]
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'Bespoke secure deployments for global resort networks.',
    priceMonthly: 'Let\'s Talk',
    priceAnnual: 'Let\'s Talk',
    cta: 'Contact sales',
    accentColor: 'from-emerald-500 to-teal-400',
    features: [
      'Multi-property Single Sign-On (SSO)',
      'Hardware System Node Monitoring',
      'Dedicated secure isolated infrastructure',
      '24/7 VIP Architectural SLA support',
      'Fully White-labeled Guest mobile experience'
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
    subtitle: "Zenbourg automates your front desk, handles room cleaning schedules, and integrates payments in a unified dashboard.",
    badge: "Zenbourg Hotel OS",
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
                name: 'Zenbourg OS',
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
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white">Zenbourg OS Setup</span>
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
                        onChange={e => setFormData({...formData, businessName: e.target.value})}
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
                          onClick={() => setFormData({...formData, roomsRange: opt.val})}
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
                        onChange={e => setFormData({...formData, region: e.target.value})}
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
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Full Name</label>
                      <input 
                        type="text"
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        placeholder="Administrative Lead"
                        className="w-full px-4 py-3 bg-white/[0.02] border border-white/10 rounded-xl text-white outline-none focus:border-[#4A9EFF] transition-all placeholder:text-white/20"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Phone Number</label>
                      <input 
                        type="tel"
                        value={formData.phone}
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                        placeholder="+91 "
                        className="w-full px-4 py-3 bg-white/[0.02] border border-white/10 rounded-xl text-white outline-none focus:border-[#4A9EFF] transition-all placeholder:text-white/20"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Email Address</label>
                      <input 
                        type="email"
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
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
                          onChange={e => setFormData({...formData, password: e.target.value})}
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
                        onChange={e => setFormData({...formData, hotelAddress: e.target.value})}
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
                          onChange={(lat, lng) => setFormData({...formData, latitude: lat, longitude: lng})}
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
                            onChange={e => setFormData({...formData, trialPeriod: e.target.checked})}
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

          <h3 className="text-2xl font-bold text-white tracking-tight mb-4 font-outfit uppercase">Getting your Zenbourg Hub Ready</h3>
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
  
  // Interactive selection & registration wizard state
  const [selectedPlanId, setSelectedPlanId] = useState('standard')
  const [isRegistering, setIsRegistering] = useState(false)

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
    return `₹${calculated.toLocaleString('en-IN')}`
  }

  return (
    <div className="min-h-screen bg-[#050505] text-[#D1D1D1] selection:bg-[#4A9EFF]/30 font-sans tracking-tight overflow-x-hidden relative">
      
      {/* Header Navigation */}
      <nav className={cn(
        "fixed top-0 inset-x-0 z-[100] transition-all duration-700",
        scrolled 
          ? "bg-[#050505]/90 backdrop-blur-3xl border-b border-white/[0.03] py-4" 
          : "bg-transparent py-8"
      )}>
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-7 h-7 rounded-full border border-white/20 flex items-center justify-center group-hover:border-[#4A9EFF] transition-colors duration-500 shadow-[0_0_15px_rgba(74,158,255,0.1)]">
               <div className="w-1.5 h-1.5 bg-white rounded-full group-hover:bg-[#4A9EFF] transition-all duration-500" />
            </div>
            <span className="text-xl font-bold tracking-[0.2em] uppercase text-white font-outfit">Zenbourg</span>
          </Link>

          <div className="hidden lg:flex items-center gap-10 text-[10px] font-bold uppercase tracking-[0.3em] text-white/40">
            {['Ecosystem', 'Pricing', 'Comparison', 'Security'].map((item) => (
              <a 
                key={item} 
                href={`#${item.toLowerCase()}`}
                className="hover:text-white transition-colors duration-300"
              >
                {item}
              </a>
            ))}
            <div className="h-4 w-px bg-white/10" />
            <Link 
              href="/admin/login"
              className="px-6 py-2.5 bg-white/5 border border-white/10 rounded-full hover:bg-white hover:text-black hover:border-white transition-all duration-500"
            >
              Admin Login
            </Link>
          </div>

          <button 
            className="lg:hidden p-2 text-white/60 hover:text-white"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu size={22} />
          </button>
        </div>
      </nav>

      <main className="pt-28 pb-20">
        
        {/* Upper Summary Slider */}
        <section id="ecosystem" className="max-w-[1400px] mx-auto px-6 md:px-12 pt-12 pb-20 text-center relative overflow-hidden">
          <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-[#4A9EFF]/5 blur-[120px] -z-10 pointer-events-none" />
          
          <AnimatePresence mode="wait">
            <motion.div 
              key={activeSlide}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-4xl mx-auto flex flex-col items-center"
            >
              <div className="mb-6 px-4 py-1.5 border border-white/10 rounded-full bg-white/[0.02] flex items-center gap-2 backdrop-blur">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
                </span>
                <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-[#4A9EFF]">{FEATURES_SLIDER[activeSlide].badge}</span>
              </div>
              
              <h2 className="text-4xl md:text-6xl font-semibold tracking-tighter text-white mb-6 leading-[1.1] font-outfit max-w-3xl">
                {FEATURES_SLIDER[activeSlide].title}
              </h2>
              
              <p className="text-base md:text-lg text-white/50 font-light max-w-2xl leading-relaxed mb-10">
                {FEATURES_SLIDER[activeSlide].subtitle}
              </p>

              <button 
                onClick={() => {
                  setSelectedPlanId('standard')
                  setIsRegistering(true)
                }} 
                className="group inline-flex items-center gap-3 px-8 py-4 bg-[#4A9EFF] text-white font-semibold rounded-full shadow-[0_10px_25px_-5px_rgba(74,158,255,0.4)] hover:shadow-[0_15px_35px_-5px_rgba(74,158,255,0.6)] hover:scale-[1.01] transition-all duration-500 text-sm cursor-pointer"
              >
                Get Started Instantly
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          </AnimatePresence>

          <div className="flex justify-center gap-2.5 mt-12">
            {FEATURES_SLIDER.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveSlide(idx)}
                className={cn(
                  "h-1 rounded-full transition-all duration-700",
                  activeSlide === idx ? "w-12 bg-[#4A9EFF]" : "w-3 bg-white/10 hover:bg-white/20"
                )}
              />
            ))}
          </div>
        </section>

        {/* Interactive Controls */}
        <section id="pricing" className="max-w-[1400px] mx-auto px-6 md:px-12 mb-8 flex flex-col md:flex-row justify-between items-center gap-6 py-8 bg-white/[0.02] border border-white/5 rounded-[2rem] backdrop-blur-3xl">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <Building2 size={18} className="text-[#4A9EFF]" />
              <label className="text-xs font-bold tracking-wider text-white/50 uppercase">Properties / Hubs</label>
            </div>
            <div className="flex items-center border border-white/10 rounded-xl bg-black overflow-hidden shadow-inner">
              <button 
                onClick={() => setUserCount(Math.max(1, userCount - 1))}
                className="px-4 py-2 hover:bg-white/5 text-white border-r border-white/10 transition-colors"
              >
                -
              </button>
              <span className="px-6 py-2 text-sm font-bold text-white font-mono">{userCount}</span>
              <button 
                onClick={() => setUserCount(Math.min(20, userCount + 1))}
                className="px-4 py-2 hover:bg-white/5 text-white border-l border-white/10 transition-colors"
              >
                +
              </button>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-white/30 hover:text-white/50 cursor-pointer">
              <Info size={14} />
            </div>
          </div>

          <div className="flex items-center gap-4 bg-white/[0.01] border border-white/[0.05] py-2.5 px-5 rounded-2xl">
            <span className={cn("text-xs font-bold tracking-widest transition-colors", !isAnnual ? "text-white" : "text-white/20")}>MONTHLY</span>
            <button 
              onClick={() => setIsAnnual(!isAnnual)}
              className={cn(
                "w-14 h-7 rounded-full p-1 flex relative items-center cursor-pointer transition-all duration-300 border",
                isAnnual ? "bg-[#4A9EFF] border-[#4A9EFF]" : "bg-white/5 border-white/15"
              )}
            >
              <motion.div 
                className="w-4.5 h-4.5 bg-white rounded-full shadow-md"
                layout
                animate={{ x: isAnnual ? 28 : 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </button>
            <div className="flex items-center gap-2">
              <span className={cn("text-xs font-bold tracking-widest transition-colors", isAnnual ? "text-white" : "text-white/20")}>ANNUAL</span>
              <span className="text-[8px] font-extrabold tracking-widest bg-[#4A9EFF]/20 text-[#4A9EFF] px-2 py-0.5 rounded-full border border-[#4A9EFF]/30 animate-pulse">SAVE 10%</span>
            </div>
          </div>
        </section>

        {/* Plan Pricing Cards */}
        <section className="max-w-[1400px] mx-auto px-6 md:px-12 mb-24 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8 items-stretch">
          {PLANS.map((plan, idx) => {
            const isSelected = selectedPlanId === plan.id
            
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: idx * 0.1 }}
                viewport={{ once: true }}
                onClick={() => setSelectedPlanId(plan.id)}
                className={cn(
                  "relative rounded-[2.5rem] flex flex-col bg-white/[0.02] backdrop-blur-md cursor-pointer transition-all duration-500 group overflow-hidden",
                  isSelected 
                    ? "ring-2 ring-[#4A9EFF] scale-[1.03] bg-white/[0.05] shadow-[0_30px_60px_-10px_rgba(74,158,255,0.15)]" 
                    : "border border-white/[0.06] hover:border-white/20 hover:bg-white/[0.04] scale-100 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.5)]"
                )}
              >
                {/* Top accent gradient banner */}
                <div className={cn(
                  "absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r opacity-80 group-hover:opacity-100 transition-opacity", 
                  plan.accentColor
                )} />
                
                <div className="p-8 flex flex-col flex-grow">
                  <div className="mb-6 flex items-start justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-white mb-3 font-outfit">{plan.name}</h3>
                      {plan.discountLabel && (
                        <span className="text-[9px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full uppercase tracking-widest">
                          {plan.discountLabel}
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-[#4A9EFF] flex items-center justify-center shadow-[0_0_10px_rgba(74,158,255,0.5)]">
                        <CheckCircle2 size={12} className="text-white" />
                      </div>
                    )}
                  </div>

                  <div className="mb-6 h-20 flex flex-col justify-end">
                    <div className="text-4xl font-semibold text-white tracking-tight font-outfit mb-1">
                      {formatPrice(plan.priceMonthly)}
                    </div>
                    <div className="text-xs text-white/30 font-medium tracking-wider uppercase">
                      {typeof plan.priceMonthly === 'string' ? 'Global Licensing' : '/ property / month'}
                    </div>
                  </div>

                  <button 
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedPlanId(plan.id)
                      setIsRegistering(true)
                    }}
                    className={cn(
                      "w-full py-4 rounded-2xl font-bold text-xs uppercase tracking-[0.2em] flex items-center justify-center transition-all duration-500 mb-10 border cursor-pointer",
                      isSelected 
                        ? "bg-[#4A9EFF] text-white border-[#4A9EFF] hover:bg-[#4A9EFF]/90 shadow-[0_10px_30px_rgba(74,158,255,0.3)]" 
                        : "bg-transparent text-white border-white/10 hover:bg-white hover:text-black hover:border-white"
                    )}
                  >
                    {plan.cta}
                  </button>

                  <div className="space-y-6 pt-8 border-t border-white/[0.05]">
                    <div className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-white/30 flex items-center gap-2">
                      {plan.id === 'base' ? 'CORE BUNDLE INCLUDES:' : `ALL ${PLANS[idx-1]?.name.toUpperCase()}, PLUS:`}
                    </div>
                    
                    <ul className="space-y-5">
                      {plan.features.map((feat, fIdx) => (
                        <li key={fIdx} className="flex items-start gap-4 text-sm text-white/50 font-light leading-snug">
                          <div className={cn(
                            "mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors", 
                            isSelected ? "border-[#4A9EFF]/30 text-[#4A9EFF]" : "border-white/20"
                          )}>
                            <Check size={10} />
                          </div>
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

        {/* Comparison Section Header */}
        <section id="comparison" className="max-w-[1400px] mx-auto px-6 md:px-12 mb-16 text-center pt-12 border-t border-white/[0.03]">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 tracking-tight font-outfit uppercase">Compare Full Capabilities</h2>
          <p className="text-white/40 font-light text-base md:text-lg max-w-xl mx-auto mb-1">
            Discover exactly what granular capabilities are packaged with your licensing tier.
          </p>
        </section>

        {/* Full Feature Table Component - Flattened Full Detail Format */}
        <section className="max-w-[1400px] mx-auto px-6 md:px-12 overflow-x-auto pb-20">
          <div className="min-w-[900px] border border-white/[0.05] rounded-3xl bg-[#0A0A0A]/80 overflow-hidden backdrop-blur-3xl shadow-2xl">
            
            {/* Table Header sticky top */}
            <div className="grid grid-cols-12 bg-black/50 border-b border-white/[0.05] p-6 sticky top-0 z-30 backdrop-blur-2xl items-center">
              <div className="col-span-4 text-sm font-bold uppercase tracking-[0.3em] text-white/30">All System Features</div>
              <div className="col-span-2 text-center font-bold text-white font-outfit tracking-wide">Base</div>
              <div className="col-span-2 text-center font-bold text-white font-outfit tracking-wide">Starter</div>
              <div className="col-span-2 text-center font-bold text-[#4A9EFF] font-outfit tracking-wide flex items-center justify-center gap-1.5">
                Standard <Sparkles size={12} />
              </div>
              <div className="col-span-2 text-center font-bold text-white font-outfit tracking-wide">Enterprise</div>
            </div>

            {/* Flattened single-level detail row iterating */}
            <div className="divide-y divide-white/[0.04]">
              {FEATURES_MATRIX.map((feat, rIdx) => (
                <div 
                  key={rIdx} 
                  className="grid grid-cols-12 p-6 items-center hover:bg-white/[0.03] transition-colors group"
                >
                  <div className="col-span-4 flex items-center gap-2.5 pr-4">
                    <span className="text-sm font-semibold text-white/75 group-hover:text-white transition-colors font-outfit">
                      {feat.name}
                    </span>
                  </div>

                  <div className="col-span-2 text-center flex items-center justify-center">
                    {feat.base === '✓' ? (
                      <Check size={16} className="text-white/40" />
                    ) : feat.base === '—' ? (
                      <Minus size={14} className="text-white/10" />
                    ) : (
                      <span className="text-xs font-medium text-white/30 leading-relaxed font-mono">{feat.base}</span>
                    )}
                  </div>

                  <div className="col-span-2 text-center flex items-center justify-center">
                    {feat.starter === '✓' ? (
                      <Check size={16} className="text-white/60" />
                    ) : feat.starter === '—' ? (
                      <Minus size={14} className="text-white/10" />
                    ) : (
                      <span className="text-xs font-medium text-white/50 leading-relaxed font-mono">{feat.starter}</span>
                    )}
                  </div>

                  <div className="col-span-2 text-center flex items-center justify-center bg-[#4A9EFF]/[0.01] py-2 border-x border-[#4A9EFF]/5">
                    {feat.standard === '✓' ? (
                      <Check size={18} className="text-[#4A9EFF] drop-shadow-[0_0_10px_rgba(74,158,255,0.4)]" strokeWidth={2.5} />
                    ) : feat.standard === '—' ? (
                      <Minus size={14} className="text-white/10" />
                    ) : (
                      <span className="text-xs font-semibold text-[#4A9EFF] drop-shadow-[0_0_10px_rgba(74,158,255,0.1)] leading-relaxed font-mono">{feat.standard}</span>
                    )}
                  </div>

                  <div className="col-span-2 text-center flex items-center justify-center">
                    {feat.enterprise === '✓' ? (
                      <Check size={18} className="text-emerald-400" strokeWidth={2.5} />
                    ) : feat.enterprise === '—' ? (
                      <Minus size={14} className="text-white/10" />
                    ) : (
                      <span className="text-xs font-bold text-emerald-400/90 leading-relaxed font-mono">{feat.enterprise}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* Bottom CTA Banner - Modern Premium Grid Format */}
        <section className="max-w-[1400px] mx-auto px-6 md:px-12 mb-24">
          <div className="relative rounded-[3.5rem] overflow-hidden border border-white/[0.05] bg-gradient-to-r from-[#0A0C10] to-[#05070A] p-10 md:p-20 group shadow-3xl">
            
            {/* Atmospheric Background Glows */}
            <div className="absolute -top-24 -right-24 w-[350px] h-[350px] bg-[#4A9EFF]/10 blur-[120px] -z-10 group-hover:bg-[#4A9EFF]/15 transition-colors duration-1000" />
            <div className="absolute -bottom-24 -left-24 w-[350px] h-[350px] bg-indigo-500/5 blur-[120px] -z-10" />
            
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              
              {/* Left Column: Content */}
              <div className="lg:col-span-7 space-y-6 text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#4A9EFF]/10 border border-[#4A9EFF]/20">
                  <Sparkles size={10} className="text-[#4A9EFF]" />
                  <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-[#4A9EFF]">Zero Setup Fees</span>
                </div>
                
                <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.05] font-outfit text-white">
                  Take Complete Control <br />
                  <span className="bg-gradient-to-r from-white via-white to-white/40 bg-clip-text text-transparent">Of Your Hotel Today</span>
                </h2>
                
                <p className="text-sm md:text-base text-white/40 font-normal max-w-xl leading-relaxed">
                  Instantly streamline frontdesk workflows, coordinate housekeeping squads, and empower guests with our unified platform.
                </p>
              </div>

              {/* Right Column: Floating Action Card */}
              <div className="lg:col-span-5">
                <div className="bg-white/[0.02] border border-white/[0.06] backdrop-blur-xl rounded-3xl p-8 flex flex-col items-center space-y-6 shadow-2xl relative group-hover:border-white/10 transition-colors">
                  
                  <div className="text-center">
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/30">Ready to onboard?</p>
                    <p className="text-2xl font-bold text-white font-outfit mt-1">Get Started Instantly</p>
                  </div>

                  <div className="w-full flex flex-col gap-3">
                    <button 
                      onClick={() => {
                        setSelectedPlanId('standard')
                        setIsRegistering(true)
                      }}
                      className="w-full py-4 bg-[#4A9EFF] text-white rounded-2xl text-xs font-extrabold uppercase tracking-[0.25em] shadow-[0_15px_30px_rgba(74,158,255,0.25)] hover:shadow-[0_20px_40px_rgba(74,158,255,0.4)] hover:scale-[1.01] transition-all duration-300 cursor-pointer"
                    >
                      Start Free Trial
                    </button>
                    
                    <Link 
                      href="/staff/login"
                      className="w-full py-4 bg-white/[0.03] border border-white/10 rounded-2xl text-xs font-bold uppercase tracking-[0.25em] text-white text-center hover:bg-white/[0.06] hover:border-white/20 transition-all"
                    >
                      Staff Portal Login
                    </Link>
                  </div>

                  <div className="flex flex-col items-center gap-1.5 pt-2 text-white/30 text-[9px] uppercase tracking-wider font-medium">
                    <div className="flex items-center gap-1.5">
                      <Check size={10} className="text-[#4A9EFF]" /> No credit card required
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check size={10} className="text-[#4A9EFF]" /> Provisioned in 60 seconds
                    </div>
                  </div>

                </div>
              </div>

            </div>
          </div>
        </section>

      </main>

      {/* Global Footer */}
      <footer className="py-24 bg-[#030303] border-t border-white/[0.03]">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-16 mb-20">
            
            <div className="xl:col-span-2 space-y-8">
              <div className="flex items-center gap-3">
                 <div className="w-6 h-6 rounded-full border-2 border-[#4A9EFF] flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-[#4A9EFF] rounded-full" />
                 </div>
                 <span className="text-xl font-extrabold tracking-[0.1em] text-white uppercase font-outfit">Zenbourg</span>
              </div>
              <p className="text-sm text-white/30 font-light leading-relaxed max-w-xs">
                &quot;Delivering operational clarity and administration high-definition precision for hospitality portfolios.&quot;
              </p>
            </div>

            <div className="space-y-6">
              <h5 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white">Portfolio</h5>
              <div className="flex flex-col gap-3.5 text-sm text-white/30 font-light">
                <Link href="#" className="hover:text-[#4A9EFF] transition-colors">Estates Hub</Link>
                <Link href="#" className="hover:text-[#4A9EFF] transition-colors">Yield Engines</Link>
                <Link href="#" className="hover:text-[#4A9EFF] transition-colors">Amenity Suites</Link>
              </div>
            </div>

            <div className="space-y-6">
              <h5 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white">Ecosystem</h5>
              <div className="flex flex-col gap-3.5 text-sm text-white/30 font-light">
                <Link href="#" className="hover:text-[#4A9EFF] transition-colors">Command Console</Link>
                <Link href="#" className="hover:text-[#4A9EFF] transition-colors">Staff Shifts Node</Link>
                <Link href="#" className="hover:text-[#4A9EFF] transition-colors">Guest Loyalty Web</Link>
              </div>
            </div>

            <div className="space-y-6">
              <h5 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white">Resources</h5>
              <div className="flex flex-col gap-3.5 text-sm text-white/30 font-light">
                <Link href="#" className="hover:text-[#4A9EFF] transition-colors">Architecture Vault</Link>
                <Link href="#" className="hover:text-[#4A9EFF] transition-colors">Security Schema</Link>
                <Link href="#" className="hover:text-[#4A9EFF] transition-colors">API Gateway Docs</Link>
              </div>
            </div>

            <div className="space-y-6">
              <h5 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white">Legal</h5>
              <div className="flex flex-col gap-3.5 text-sm text-white/30 font-light">
                <Link href="#" className="hover:text-[#4A9EFF] transition-colors">Vault Compliance</Link>
                <Link href="#" className="hover:text-[#4A9EFF] transition-colors">GDPR Directives</Link>
                <Link href="#" className="hover:text-[#4A9EFF] transition-colors">System SLAs</Link>
              </div>
            </div>

          </div>

          <div className="pt-10 border-t border-white/[0.03] flex flex-col md:flex-row justify-between items-center gap-6">
             <div className="text-[9px] font-bold tracking-[0.4em] text-white/10 uppercase">&copy; 2026 ZENBOURG CORE. ALL RIGHTS RESERVED.</div>
             <div className="flex gap-8 text-[9px] font-bold tracking-[0.3em] text-white/20 uppercase">
                <Link href="#" className="hover:text-[#4A9EFF]">Vault</Link>
                <Link href="#" className="hover:text-[#4A9EFF]">Identity</Link>
                <Link href="#" className="hover:text-[#4A9EFF]">Trust</Link>
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
            className="fixed inset-0 z-[200] bg-[#050505] p-10 flex flex-col items-start justify-center gap-12"
          >
            <button 
              className="absolute top-8 right-8 p-2 text-white/40 hover:text-white"
              onClick={() => setMobileMenuOpen(false)}
            >
              <X size={30} />
            </button>
            
            <div className="flex flex-col gap-8">
               {['Ecosystem', 'Pricing', 'Comparison', 'Security'].map((link) => (
                 <a 
                   key={link} 
                   href={`#${link.toLowerCase()}`}
                   onClick={() => setMobileMenuOpen(false)}
                   className="text-4xl font-bold text-white uppercase tracking-tight font-outfit"
                 >
                   {link}
                 </a>
               ))}
            </div>
            
            <Link 
              href="/admin/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full py-5 bg-[#4A9EFF] text-white text-center rounded-2xl text-xs font-bold uppercase tracking-[0.3em] shadow-xl"
            >
              Admin Login
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
