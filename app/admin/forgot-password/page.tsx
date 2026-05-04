'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { 
    Building2, 
    ArrowLeft, 
    Smartphone, 
    ShieldCheck, 
    Lock, 
    Eye, 
    EyeOff, 
    Loader2, 
    CheckCircle2,
    AlertCircle
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type Step = 'IDENTIFY' | 'VERIFY' | 'RESET' | 'SUCCESS'

export default function ForgotPasswordPage() {
    const router = useRouter()
    const [step, setStep] = useState<Step>('IDENTIFY')
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    
    const [formData, setFormData] = useState({
        phone: '',
        otp: '',
        password: '',
        confirmPassword: ''
    })

    const handleSendOTP = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.phone || formData.phone.length < 10) {
            toast.error('Please enter a valid phone number')
            return
        }

        setLoading(true)
        try {
            const res = await fetch('/api/otp/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: formData.phone })
            })

            const data = await res.json()
            if (res.ok) {
                toast.success('Security code sent to your device')
                setStep('VERIFY')
            } else {
                toast.error(data.error || 'Failed to send code')
            }
        } catch (error) {
            toast.error('System synchronization error')
        } finally {
            setLoading(false)
        }
    }

    const handleVerifyOTP = async (e: React.FormEvent) => {
        e.preventDefault()
        if (formData.otp.length < 4) {
            toast.error('Please enter the full code')
            return
        }

        setLoading(true)
        try {
            const res = await fetch('/api/otp/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: formData.phone, code: formData.otp })
            })

            const data = await res.json()
            if (res.ok && data.verified) {
                toast.success('Identity verified')
                setStep('RESET')
            } else {
                toast.error(data.error || 'Invalid verification code')
            }
        } catch (error) {
            toast.error('Verification handshake failed')
        } finally {
            setLoading(false)
        }
    }

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault()
        if (formData.password !== formData.confirmPassword) {
            toast.error('Passwords do not match')
            return
        }
        if (formData.password.length < 6) {
            toast.error('Password must be at least 6 characters')
            return
        }

        setLoading(true)
        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    phone: formData.phone, 
                    password: formData.password,
                    verified: true 
                })
            })

            const data = await res.json()
            if (res.ok) {
                toast.success('Password updated successfully')
                setStep('SUCCESS')
            } else {
                toast.error(data.error || 'Failed to update password')
            }
        } catch (error) {
            toast.error('Failed to commit password change')
        } finally {
            setLoading(false)
        }
    }

    const containerVariants: Variants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as const } },
        exit: { opacity: 0, y: -20, transition: { duration: 0.3 } }
    }

    return (
        <div className="min-h-screen bg-[#050505] text-[#D1D1D1] selection:bg-[#4A9EFF]/30 font-sans tracking-tight overflow-hidden flex items-center justify-center p-6 bg-[url('/grid.svg')] bg-center bg-fixed">
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#4A9EFF]/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#4A9EFF]/5 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2" />
            </div>

            <div className="w-full max-w-md relative z-10">
                {/* Branding */}
                <div className="text-center mb-12">
                    <Link href="/" className="inline-flex items-center gap-3 group mb-6">
                        <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center group-hover:border-[#4A9EFF] transition-colors duration-500">
                           <div className="w-1.5 h-1.5 bg-white rounded-full group-hover:bg-[#4A9EFF] transition-all duration-500 shrink-0" />
                        </div>
                        <span className="text-xl font-bold tracking-[0.2em] uppercase text-white font-outfit">Zenbourg</span>
                    </Link>
                    <h1 className="text-3xl font-bold text-white tracking-tight font-outfit uppercase">Security Recovery</h1>
                    <p className="text-white/40 text-xs font-bold tracking-[0.3em] mt-2 uppercase">Identity Management Terminal</p>
                </div>

                <div className="bg-[#111111]/80 backdrop-blur-3xl border border-white/[0.05] rounded-[2.5rem] p-10 shadow-2xl overflow-hidden shadow-black/50">
                    <AnimatePresence mode="wait">
                        {step === 'IDENTIFY' && (
                            <motion.div key="identify" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-8">
                                <div className="space-y-2">
                                    <div className="w-12 h-12 rounded-2xl bg-[#4A9EFF]/10 border border-[#4A9EFF]/20 flex items-center justify-center text-[#4A9EFF] mb-4">
                                        <Smartphone size={24} strokeWidth={1.5} />
                                    </div>
                                    <h2 className="text-xl font-bold text-white uppercase  tracking-tight">Identity Handshake</h2>
                                    <p className="text-sm text-white/40 leading-relaxed">Enter your registered mobile number to initiate the verification protocol.</p>
                                </div>

                                <form onSubmit={handleSendOTP} className="space-y-6">
                                    <Input
                                        placeholder="Mobile Identity (e.g. 9876543210)"
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="bg-black/50 border-white/5 rounded-2xl p-6 text-white text-lg font-bold placeholder:text-white/10 "
                                        required
                                    />
                                    <Button 
                                        type="submit" 
                                        className="w-full py-6 rounded-2xl bg-white text-black font-black uppercase text-[10px] tracking-[0.4em] transition-all active:scale-95 shadow-xl shadow-white/5"
                                        loading={loading}
                                    >
                                        Validate Terminal
                                    </Button>
                                </form>
                            </motion.div>
                        )}

                        {step === 'VERIFY' && (
                            <motion.div key="verify" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-8">
                                <div className="space-y-2">
                                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mb-4">
                                        <ShieldCheck size={24} strokeWidth={1.5} />
                                    </div>
                                    <h2 className="text-xl font-bold text-white uppercase  tracking-tight">Handshake Verification</h2>
                                    <p className="text-sm text-white/40 leading-relaxed">A specialized security code has been transmitted to <span className="text-white font-bold">+{formData.phone}</span>.</p>
                                </div>

                                <form onSubmit={handleVerifyOTP} className="space-y-6">
                                    <Input
                                        placeholder="Security Code (OTP)"
                                        type="text"
                                        maxLength={6}
                                        value={formData.otp}
                                        onChange={(e) => setFormData({ ...formData, otp: e.target.value })}
                                        className="bg-black/50 border-white/5 rounded-2xl p-6 text-white text-center text-2xl tracking-[0.5em] font-black placeholder:text-white/10 placeholder:tracking-normal"
                                        required
                                    />
                                    <div className="grid grid-cols-2 gap-4">
                                        <button 
                                            type="button" 
                                            onClick={() => setStep('IDENTIFY')}
                                            className="py-4 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all"
                                        >
                                            Modify Identity
                                        </button>
                                        <Button 
                                            type="submit" 
                                            className="py-4 rounded-2xl bg-[#4A9EFF] text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-[#4A9EFF]/10"
                                            loading={loading}
                                        >
                                            Confirm Access
                                        </Button>
                                    </div>
                                </form>
                            </motion.div>
                        )}

                        {step === 'RESET' && (
                            <motion.div key="reset" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-8">
                                <div className="space-y-2">
                                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 mb-4">
                                        <Lock size={24} strokeWidth={1.5} />
                                    </div>
                                    <h2 className="text-xl font-bold text-white uppercase  tracking-tight">Security Update</h2>
                                    <p className="text-sm text-white/40 leading-relaxed">Establish a new administrative cipher for your terminal access.</p>
                                </div>

                                <form onSubmit={handleResetPassword} className="space-y-6">
                                    <div className="space-y-4">
                                        <Input
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="New Cipher Pattern"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            className="bg-black/50 border-white/5 rounded-2xl p-6 text-white"
                                            required
                                            rightIcon={
                                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-white/20 hover:text-white">
                                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            }
                                        />
                                        <Input
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="Verify Cipher Pattern"
                                            value={formData.confirmPassword}
                                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                            className="bg-black/50 border-white/5 rounded-2xl p-6 text-white"
                                            required
                                        />
                                    </div>
                                    <Button 
                                        type="submit" 
                                        className="w-full py-6 rounded-2xl bg-emerald-600 text-white font-black uppercase text-[10px] tracking-[0.4em] shadow-xl shadow-emerald-500/10"
                                        loading={loading}
                                    >
                                        Update Security Ledger
                                    </Button>
                                </form>
                            </motion.div>
                        )}

                        {step === 'SUCCESS' && (
                            <motion.div key="success" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="text-center py-10 space-y-8">
                                <div className="flex justify-center">
                                    <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                                        <CheckCircle2 size={40} strokeWidth={1.5} className="animate-in zoom-in duration-500" />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <h2 className="text-2xl font-black text-white  tracking-tight uppercase">Security Restored</h2>
                                    <p className="text-sm text-white/40 leading-relaxed">Your terminal credentials have been successfully synchronized across the Zenbourg network.</p>
                                </div>
                                <Button 
                                    onClick={() => router.push('/admin/login')}
                                    className="w-full py-6 rounded-2xl bg-white text-black font-black uppercase text-[10px] tracking-[0.4em] shadow-xl shadow-white/5 transition-all active:scale-95"
                                >
                                    Return to Command Center
                                </Button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer Navigation */}
                <div className="text-center mt-10">
                    <Link href="/admin/login" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-white/20 hover:text-[#4A9EFF] transition-colors">
                        <ArrowLeft size={12} strokeWidth={3} /> Abort Recovery
                    </Link>
                </div>

                <div className="mt-16 pt-8 border-t border-white/[0.03] text-center">
                    <p className="text-[10px] text-white/10 font-black tracking-[0.5em] uppercase ">&copy; 2026 ZENBOURG SYSTEMS. ARCHITECTURE ENFORCED.</p>
                </div>
            </div>
        </div>
    )
}
