'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
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
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

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
        plan: 'BASE' as 'BASE' | 'STARTER' | 'STANDARD' | 'ENTERPRISE'
    })

    const plans = [
        {
            id: 'BASE',
            name: 'Base',
            price: '₹9,999',
            icon: Building2,
            color: 'text-slate-400',
            bg: 'bg-slate-500/10',
            border: 'border-slate-500/20',
            features: ['Core PMS & Reservations', 'Digital Check-in', 'Up to 30 rooms']
        },
        {
            id: 'STARTER',
            name: 'Starter',
            price: '₹15,999',
            icon: Zap,
            color: 'text-blue-400',
            bg: 'bg-blue-500/10',
            border: 'border-blue-500/20',
            features: ['Everything in Base', 'Staff App & Management', 'Marketing Tools', 'Up to 75 rooms']
        },
        {
            id: 'STANDARD',
            name: 'Standard',
            price: '₹29,999',
            icon: Star,
            color: 'text-amber-400',
            bg: 'bg-amber-500/10',
            border: 'border-amber-500/20',
            features: ['Everything in Starter', 'Advanced Analytics', 'F&B & Spa Integration', 'Up to 150 rooms']
        },
        {
            id: 'ENTERPRISE',
            name: 'Enterprise',
            price: 'Custom',
            icon: Crown,
            color: 'text-purple-400',
            bg: 'bg-purple-500/10',
            border: 'border-purple-500/20',
            features: ['Everything in Standard', 'Multi-property Admin', 'Unlimited rooms', 'Dedicated Support']
        },
    ]

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            // 1. Register User & Property
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

            // 2. If paid plan, handle Razorpay payment
            if (formData.plan !== 'BASE' && formData.plan !== 'ENTERPRISE') {
                try {
                    toast.loading(`Initializing payment for ${formData.plan} plan...`)
                    const orderRes = await fetch('/api/subscription/razorpay', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            plan: formData.plan,
                            propertyId: data.propertyId,
                            userId: data.user?.id,   // pass userId so API can verify without session
                        })
                    })
                    const order = await orderRes.json()
                    toast.dismiss()

                    if (!order.success) {
                        toast.error('Payment failed to initialize. Your account is on the Base plan.', { duration: 5000 })
                    } else {
                        const rzpPromise = new Promise((resolve) => {
                            const options = {
                                key: order.key,
                                amount: order.amount,
                                currency: order.currency,
                                name: 'Zenbourg',
                                description: `Registration: ${formData.plan} Plan`,
                                order_id: order.orderId,
                                handler: async (response: any) => {
                                    const verifyRes = await fetch('/api/subscription/verify', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            ...response,
                                            plan: formData.plan,
                                            propertyId: data.propertyId,
                                            userId: data.user?.id,  // pass userId here too
                                        })
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
                        if (paid) toast.success(`Payment verified! ${formData.plan} plan activated.`)
                        else toast.info('Payment skipped. Your account is on the Base plan.')
                    }
                } catch (payErr) {
                    console.error('Payment Flow Error:', payErr)
                    toast.error('Payment failed. Defaulting to Base plan.')
                }
            }

            // 3. Auto Login
            const result = await signIn('credentials', {
                email: formData.email,
                password: formData.password,
                redirect: false,
            })

            if (result?.ok) {
                toast.success('Registration successful! Welcome to Zenbourg.')
                router.push('/admin/dashboard')
            } else {
                toast.error('Registration successful, but login failed. Please sign in manually.')
                router.push('/admin/login')
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
                            Create Account
                        </h2>
                        <p className="text-text-secondary">
                            Register your hotel to get started.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">

                        {/* Personal Info */}
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Full Name"
                                placeholder="John Doe"
                                value={formData.name}
                                onChange={(e) => handleChange('name', e.target.value)}
                                required
                            />
                            <Input
                                label="Phone"
                                placeholder="+91..."
                                value={formData.phone}
                                onChange={(e) => handleChange('phone', e.target.value)}
                                required
                            />
                        </div>

                        <Input
                            label="Email Address"
                            type="email"
                            placeholder="owner@hotel.com"
                            value={formData.email}
                            onChange={(e) => handleChange('email', e.target.value)}
                            required
                        />

                        <Input
                            label="Password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Create a password"
                            value={formData.password}
                            onChange={(e) => handleChange('password', e.target.value)}
                            required
                            rightIcon={
                                <button type="button" onClick={() => setShowPassword(!showPassword)}>
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            }
                        />

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
                                                    <p className="text-[11px] text-text-tertiary">{plan.price}/month</p>
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
