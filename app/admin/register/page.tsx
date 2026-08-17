'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signIn, useSession } from 'next-auth/react'
import Link from 'next/link'
import { Building2, Eye, EyeOff, CheckCircle2, Crown, Zap, Star } from 'lucide-react'
import Button from '@/components/ui/Button'
import { hash } from 'bcryptjs'
import Input from '@/components/ui/Input'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import dynamic from 'next/dynamic'

const MapPicker = dynamic(() => import('@/components/ui/MapPicker'), { ssr: false })

export default function AdminRegisterPage() {
    const router = useRouter()
    const { data: session, update: updateSession } = useSession()
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search)
            const plan = params.get('plan')
            const hotelName = params.get('hotelName')
            if (plan || hotelName) {
                setFormData(prev => ({
                    ...prev,
                    ...(plan && { plan: plan as any }),
                    ...(hotelName && { hotelName })
                }))
            }
        }
    }, [])

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        hotelName: '',
        hotelAddress: '',
        latitude: null as number | null,
        longitude: null as number | null,
        plan: 'BASE' as 'BASE' | 'STARTER' | 'STANDARD' | 'ENTERPRISE',
        trialPeriod: true,
        upiId: ''
    })

    const plans = [
        {
            id: 'BASE',
            name: 'Base',
            price: '₹9,999',
            originalPrice: '₹15,000',
            icon: Building2,
            color: 'text-slate-400',
            bg: 'bg-slate-500/10',
            border: 'border-slate-500/20',
            features: ['Core PMS & Reservations', 'Front Desk Terminal', 'Digital Check-in & Check-out', 'Up to 30 rooms']
        },
        {
            id: 'STARTER',
            name: 'Starter',
            price: '₹14,999',
            originalPrice: '₹30,000',
            icon: Zap,
            color: 'text-blue-400',
            bg: 'bg-blue-500/10',
            border: 'border-blue-500/20',
            features: ['Everything in Base', 'Staff app, housekeeping & maintenance dispatch', 'Marketing tools & loyalty module', 'Up to 75 rooms']
        },
        {
            id: 'STANDARD',
            name: 'Standard',
            price: '₹29,999',
            originalPrice: '₹55,000',
            icon: Star,
            color: 'text-amber-400',
            bg: 'bg-amber-500/10',
            border: 'border-amber-500/20',
            features: ['Everything in Starter', 'IoT room controls & advanced analytics', 'F&B and spa integration, upsell engine', 'Multi-language Guest Portal', 'Up to 150 rooms']
        },
        {
            id: 'ENTERPRISE',
            name: 'Enterprise',
            price: 'Custom',
            icon: Crown,
            color: 'text-purple-400',
            bg: 'bg-purple-500/10',
            border: 'border-purple-500/20',
            features: ['Everything in Standard', 'Multi-property super admin & custom integrations', 'Dedicated success manager', 'White-label Guest Portal', 'SLA-backed uptime, unlimited rooms', 'Custom pricing']
        },
    ]

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (formData.trialPeriod && !formData.upiId.trim()) {
            return toast.error('UPI ID is required to set up auto-pay and activate the 14-day free trial.')
        }
        setLoading(true)

        try {
            let userObj = session?.user as any
            let propId = userObj?.propertyId
            
            if (!session) {
                // 1. Register User & Property via Credentials
                const res = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ...formData,
                        role: 'HOTEL_ADMIN'
                    })
                })

                const data = await res.json()

                if (!res.ok) {
                    toast.error(data.error || 'Registration failed')
                    setLoading(false)
                    return
                }
                userObj = data.user
                propId = data.propertyId
            } else {
                // 1b. Complete Google Auth Registration
                const res = await fetch('/api/auth/complete-google', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                })
                const data = await res.json()
                if (!res.ok) {
                    toast.error(data.error || 'Update failed')
                    setLoading(false)
                    return
                }
                propId = data.propertyId
            }

            // 2. If paid plan, handle Razorpay payment
            if (formData.plan !== 'BASE' && formData.plan !== 'ENTERPRISE') {
                try {
                    const statusText = formData.trialPeriod 
                        ? 'Initializing UPI Autopay verification mandate...' 
                        : `Initializing payment for ${formData.plan} plan...`
                    toast.loading(statusText)
                    const orderRes = await fetch('/api/subscription/razorpay', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            plan: formData.plan,
                            propertyId: propId,
                            userId: userObj?.id,
                            trialPeriod: formData.trialPeriod })
                    })
                    const order = await orderRes.json()
                    toast.dismiss()

                    if (!order.success) {
                        toast.error('Payment failed to initialize. Your account is on the Base plan.', { duration: 5000 })
                    } else {
                        const rzpPromise = new Promise((resolve) => {
                            const options: any = {
                                key: order.key,
                                amount: order.amount,
                                currency: order.currency,
                                name: 'Zenbourg',
                                description: formData.trialPeriod 
                                    ? `14-Day Free Trial Autopay Setup` 
                                    : `Registration: ${formData.plan} Plan`,
                                order_id: order.orderId,
                                ...(formData.trialPeriod ? { recurring: '1', customer_id: order.customer_id } : {}),
                                handler: async (response: any) => {
                                    const verifyRes = await fetch('/api/subscription/verify', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            ...response,
                                            plan: formData.plan,
                                            propertyId: propId,
                                            userId: userObj?.id,
                                            trialPeriod: formData.trialPeriod,
                                            upiId: formData.upiId })
                                    })
                                    const verifyData = await verifyRes.json()
                                    if (verifyData.success) resolve(true)
                                    else resolve(false)
                                },
                                modal: { ondismiss: () => resolve(false) }
                            }
                            new (window as any).Razorpay(options).open()
                        })

                        const paid = await rzpPromise
                        if (paid) {
                            const successMsg = formData.trialPeriod 
                                ? `UPI Autopay setup verified! Your 14-day free trial of ${formData.plan} is now active.` 
                                : `Payment verified! ${formData.plan} plan activated.`
                            toast.success(successMsg)
                        } else {
                            toast.info('Autopay setup skipped. Your account is on the Base plan.')
                        }
                    }
                } catch (payErr) {
                    console.error('Payment Flow Error:', payErr)
                    toast.error('Autopay verification failed. Defaulting to Base plan.')
                }
            }

            if (!session) {
                // 3. Auto Login for Credentials
                const result = await signIn('credentials', {
                    email: formData.email,
                    password: formData.password,
                    redirect: false })

                if (result?.ok) {
                    toast.success('Registration successful! Welcome to Zenbourg.')
                    router.push('/admin/dashboard')
                } else {
                    toast.error('Registration successful, but login failed. Please sign in manually.')
                    router.push('/admin/login')
                }
            } else {
                await updateSession() // refresh session to get new property details
                toast.success('Setup Complete! Welcome to Zenbourg.')
                router.push('/admin/dashboard')
            }

        } catch (error) {
            console.error(error)
            toast.error('Something went wrong. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex">
            {/* Left Side - Image/Branding (Same as Login) */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary to-primary-hover relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-black/10 via-transparent to-white/5 opacity-50" />
                <div className="relative z-10 flex flex-col justify-center p-12 text-white">
                    <div className="flex items-center gap-3 mb-8">
                        <Building2 className="w-10 h-10" />
                        <span className="text-3xl font-bold">Zenbourg</span>
                    </div>
                    <h1 className="text-4xl font-bold mb-4">
                        Join the future of hospitality.
                    </h1>
                    <p className="text-lg text-white/90 mb-8">
                        Create your hotel account today and start streamlining your operations.
                    </p>
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center">✓</div>
                            <div>
                                <h3 className="font-semibold">Instant Setup</h3>
                                <p className="text-sm text-white/80">Get your property running in minutes</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center">✓</div>
                            <div>
                                <h3 className="font-semibold">Full Control</h3>
                                <p className="text-sm text-white/80">Manage staff, rooms, and guests</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side - Register Form */}
            <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
                <div className="w-full max-w-md my-auto">
                    <div className="mb-6">
                        <h2 className="text-3xl font-bold text-text-primary mb-2">
                            {session ? 'Complete Setup' : 'Create Account'}
                        </h2>
                        <p className="text-text-secondary">
                            {session ? `Welcome, ${session.user?.name}! Tell us about your property.` : 'Register your hotel to get started.'}
                        </p>
                    </div>

                    {!session && (
                        <div className="mb-6">
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full flex items-center justify-center gap-2 border-border text-text-primary hover:bg-white/5"
                                onClick={() => signIn('google', { callbackUrl: '/admin/register' })}
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                    <path d="M1 1h22v22H1z" fill="none"/>
                                </svg>
                                Continue with Google
                            </Button>
                            
                            <div className="relative mt-6 mb-2">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-border"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-surface-dark text-text-tertiary">Or register with email</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">

                        {/* Personal Info - Hidden if Google Auth */}
                        {!session && (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        label="Full Name"
                                        placeholder="John Doe"
                                        value={formData.name}
                                        onChange={(e) => handleChange('name', e.target.value)}
                                        required={!session}
                                    />
                                    <Input
                                        label="Phone"
                                        placeholder="+91..."
                                        value={formData.phone}
                                        onChange={(e) => handleChange('phone', e.target.value)}
                                        required={!session}
                                    />
                                </div>

                                <Input
                                    label="Email Address"
                                    type="email"
                                    placeholder="owner@hotel.com"
                                    value={formData.email}
                                    onChange={(e) => handleChange('email', e.target.value)}
                                    required={!session}
                                />

                                <Input
                                    label="Password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Create a password"
                                    value={formData.password}
                                    onChange={(e) => handleChange('password', e.target.value)}
                                    required={!session}
                                    rightIcon={
                                        <button type="button" onClick={() => setShowPassword(!showPassword)}>
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    }
                                />
                            </>
                        )}

                        <div className="border-t border-border my-4 pt-4">
                            <h3 className="text-sm font-semibold text-text-primary mb-3">Property Details</h3>

                            <Input
                                label="Hotel Name"
                                placeholder="Grand Hotel"
                                value={formData.hotelName}
                                onChange={(e) => handleChange('hotelName', e.target.value)}
                                required
                                className="mb-4"
                            />

                            <Input
                                label="Address"
                                placeholder="Street, City, Country"
                                value={formData.hotelAddress}
                                onChange={(e) => handleChange('hotelAddress', e.target.value)}
                                className="mb-4"
                            />

                            <div className="mb-4">
                                <MapPicker 
                                    latitude={formData.latitude}
                                    longitude={formData.longitude}
                                    onChange={(lat, lng) => {
                                        setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }))
                                    }}
                                />
                            </div>
                        </div>

                        {/* Plan Selection */}
                        <div className="space-y-3 pt-2">
                            <label className="text-sm font-semibold text-text-primary px-1">Subscription Model</label>
                            <div className="grid grid-cols-1 gap-3">
                                {plans.map((plan) => (
                                    <div
                                        key={plan.id}
                                        onClick={() => handleChange('plan', plan.id)}
                                        className={cn(
                                            "relative p-4 rounded-2xl border transition-all cursor-pointer group",
                                            formData.plan === plan.id 
                                                ? `bg-[#233648] ${plan.border} ring-2 ring-primary/40` 
                                                : "bg-surface-light border-border hover:border-white/20"
                                        )}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-md", plan.bg)}>
                                                    <plan.icon className={cn("w-5 h-5", plan.color)} />
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-white text-[14px]">{plan.name}</h4>
                                                    <p className="text-[11px] text-text-tertiary">
                                                        {plan.originalPrice && <span className="line-through decoration-2 decoration-white/40 text-white/50 font-bold mr-1.5">{plan.originalPrice}</span>}
                                                        <span className="font-medium text-white/90">{plan.price}</span>/month
                                                    </p>
                                                </div>
                                            </div>
                                            {formData.plan === plan.id && (
                                                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                                    <CheckCircle2 className="w-3 h-3 text-white" />
                                                </div>
                                            )}
                                        </div>
                                        {formData.plan === plan.id && (
                                            <div className="mt-3 flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-1 duration-300">
                                                {plan.features.map((f, idx) => (
                                                    <span key={idx} className="px-2 py-0.5 bg-white/5 rounded-md text-[9px] font-medium text-text-tertiary border border-white/5">
                                                        {f}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Free Trial & UPI Autopay configuration */}
                        <div className="bg-[#1a2633] p-4 rounded-2xl border border-white/[0.06] space-y-3.5 mt-4">
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.trialPeriod}
                                    onChange={e => handleChange('trialPeriod', e.target.checked)}
                                    className="w-4 h-4 rounded text-primary focus:ring-primary border-border bg-surface-light accent-primary mt-1"
                                />
                                <div className="flex-1">
                                    <span className="text-sm font-semibold text-white block leading-tight">Activate 14-Day Free Trial</span>
                                    <span className="text-[11px] text-text-secondary block mt-1 leading-normal">
                                        Activate your chosen plan with a 14-day free trial. Input your UPI ID below to configure automatic autopay deductions after the trial. No immediate charge is made.
                                    </span>
                                </div>
                            </label>

                            {formData.trialPeriod && (
                                <div className="animate-in fade-in slide-in-from-top-1 duration-150 pt-2 border-t border-white/[0.06]">
                                    <Input
                                        label="UPI ID for Auto-Pay (After 14 Days)"
                                        placeholder="e.g. owner@upi or 9876543210@paytm"
                                        required={formData.trialPeriod}
                                        value={formData.upiId}
                                        onChange={e => handleChange('upiId', e.target.value)}
                                    />
                                </div>
                            )}
                        </div>

                        <Button
                            type="submit"
                            variant="primary"
                            className="w-full mt-2"
                            loading={loading}
                        >
                            Create Hotel Account
                        </Button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-text-secondary">
                            Already have an account?{' '}
                            <Link href="/admin/login" className="text-primary hover:text-primary-hover font-medium">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
