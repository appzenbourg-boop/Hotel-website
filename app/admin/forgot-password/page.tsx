'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    Mail, 
    ShieldCheck, 
    Lock, 
    Eye, 
    EyeOff, 
    Loader2, 
    CheckCircle2, 
    ArrowLeft, 
    RefreshCw,
    KeyRound
} from 'lucide-react'
import { toast } from 'sonner'

type Step = 'EMAIL' | 'OTP' | 'PASSWORD' | 'SUCCESS'

export default function ForgotPasswordPage() {
    const router = useRouter()
    const [step, setStep] = useState<Step>('EMAIL')
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [resendCountdown, setResendCountdown] = useState(0)

    const [email, setEmail] = useState('')
    const [otp, setOtp] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [resetToken, setResetToken] = useState('')

    // Resend countdown timer
    useEffect(() => {
        if (resendCountdown > 0) {
            const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000)
            return () => clearTimeout(timer)
        }
    }, [resendCountdown])

    // Step 1: Send OTP to Email
    const handleSendOTP = async (e?: React.FormEvent) => {
        if (e) e.preventDefault()

        const cleanEmail = email.trim().toLowerCase()
        if (!cleanEmail || !cleanEmail.includes('@')) {
            toast.error('Please enter a valid email address')
            return
        }

        setLoading(true)
        try {
            const res = await fetch('/api/otp/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: cleanEmail })
            })

            const data = await res.json()

            if (res.ok && data.success) {
                toast.success(data.message || 'Verification code sent to your email')
                setStep('OTP')
                setResendCountdown(60)
            } else {
                toast.error(data.error || 'Failed to send recovery code')
            }
        } catch {
            toast.error('Connection error. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    // Step 2: Verify 6-digit OTP
    const handleVerifyOTP = async (e: React.FormEvent) => {
        e.preventDefault()

        const cleanOtp = otp.trim()
        if (cleanOtp.length < 4) {
            toast.error('Please enter the full verification code')
            return
        }

        setLoading(true)
        try {
            const res = await fetch('/api/otp/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim().toLowerCase(), code: cleanOtp })
            })

            const data = await res.json()

            if (res.ok && data.verified) {
                toast.success('Identity verified successfully')
                if (data.resetToken) {
                    setResetToken(data.resetToken)
                }
                setStep('PASSWORD')
            } else {
                toast.error(data.error || 'Invalid or expired verification code')
            }
        } catch {
            toast.error('Verification failed. Please check the code and try again.')
        } finally {
            setLoading(false)
        }
    }

    // Step 3: Reset Password
    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault()

        if (password.length < 8) {
            toast.error('Password must be at least 8 characters long')
            return
        }

        if (password !== confirmPassword) {
            toast.error('Passwords do not match')
            return
        }

        setLoading(true)
        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email.trim().toLowerCase(),
                    password,
                    verified: true,
                    resetToken: resetToken || undefined
                })
            })

            const data = await res.json()

            if (res.ok && data.success) {
                toast.success('Password updated successfully')
                setStep('SUCCESS')
            } else {
                toast.error(data.error || 'Failed to update password')
            }
        } catch {
            toast.error('Failed to commit password change. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const cardVariants: any = {
        hidden: { opacity: 0, y: 15, scale: 0.98 },
        visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: 'easeOut' } },
        exit: { opacity: 0, y: -15, scale: 0.98, transition: { duration: 0.25 } }
    }

    return (
        <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden font-sans selection:bg-blue-600/30">
            {/* Ambient Lighting Gradients */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none" />
            <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="w-full max-w-[460px] relative z-10">
                {/* Brand Logo & Header */}
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex items-center gap-2.5 group mb-4 transition-transform hover:scale-105 duration-300">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <KeyRound className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-2xl font-black tracking-[0.2em] uppercase text-white font-outfit">Zenbourg</span>
                    </Link>
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-400 font-semibold">Account Recovery</p>
                </div>

                {/* Main Glassmorphic Card */}
                <div className="bg-[#0f172a]/80 backdrop-blur-2xl border border-slate-800/80 rounded-3xl p-7 sm:p-9 shadow-2xl shadow-black/80">
                    <AnimatePresence mode="wait">
                        {/* STEP 1: ENTER EMAIL */}
                        {step === 'EMAIL' && (
                            <motion.div key="step-email" variants={cardVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6">
                                <div className="space-y-2 text-center sm:text-left">
                                    <div className="inline-flex w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 items-center justify-center text-blue-400 mb-2">
                                        <Mail className="w-6 h-6" />
                                    </div>
                                    <h1 className="text-2xl font-bold tracking-tight text-white font-outfit">Forgot Password?</h1>
                                    <p className="text-sm text-slate-400 leading-relaxed">
                                        Enter your registered account email. We will send a 6-digit verification code to reset your password.
                                    </p>
                                </div>

                                <form onSubmit={handleSendOTP} className="space-y-5">
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                                            Email Address
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder="name@example.com"
                                                required
                                                autoFocus
                                                className="w-full bg-[#162032] border border-slate-700/80 rounded-xl px-4 py-3.5 pl-11 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm transition-all"
                                            />
                                            <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.99] text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                <span>Sending Recovery Code...</span>
                                            </>
                                        ) : (
                                            <span>Send Recovery Code</span>
                                        )}
                                    </button>
                                </form>
                            </motion.div>
                        )}

                        {/* STEP 2: ENTER OTP */}
                        {step === 'OTP' && (
                            <motion.div key="step-otp" variants={cardVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6">
                                <div className="space-y-2 text-center sm:text-left">
                                    <div className="inline-flex w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 items-center justify-center text-indigo-400 mb-2">
                                        <ShieldCheck className="w-6 h-6" />
                                    </div>
                                    <h1 className="text-2xl font-bold tracking-tight text-white font-outfit">Verify Your Email</h1>
                                    <p className="text-sm text-slate-400 leading-relaxed">
                                        We sent a 6-digit code to <span className="text-white font-medium break-all">{email}</span>.
                                    </p>
                                </div>

                                <form onSubmit={handleVerifyOTP} className="space-y-5">
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block text-center">
                                            6-Digit Security Code
                                        </label>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={6}
                                            value={otp}
                                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                            placeholder="• • • • • •"
                                            required
                                            autoFocus
                                            className="w-full bg-[#162032] border border-slate-700/80 rounded-xl px-4 py-3.5 text-center text-2xl font-black tracking-[0.4em] text-blue-400 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-mono"
                                        />
                                    </div>

                                    <div className="flex items-center justify-between text-xs text-slate-400">
                                        <button
                                            type="button"
                                            onClick={() => setStep('EMAIL')}
                                            className="hover:text-white transition-colors"
                                        >
                                            Change email
                                        </button>
                                        {resendCountdown > 0 ? (
                                            <span className="text-slate-500">
                                                Resend in <span className="text-blue-400 font-semibold">{resendCountdown}s</span>
                                            </span>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => handleSendOTP()}
                                                disabled={loading}
                                                className="text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 transition-colors"
                                            >
                                                <RefreshCw className="w-3 h-3" /> Resend Code
                                            </button>
                                        )}
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.99] text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                <span>Verifying...</span>
                                            </>
                                        ) : (
                                            <span>Verify Code</span>
                                        )}
                                    </button>
                                </form>
                            </motion.div>
                        )}

                        {/* STEP 3: NEW PASSWORD */}
                        {step === 'PASSWORD' && (
                            <motion.div key="step-password" variants={cardVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6">
                                <div className="space-y-2 text-center sm:text-left">
                                    <div className="inline-flex w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 items-center justify-center text-emerald-400 mb-2">
                                        <Lock className="w-6 h-6" />
                                    </div>
                                    <h1 className="text-2xl font-bold tracking-tight text-white font-outfit">Set New Password</h1>
                                    <p className="text-sm text-slate-400 leading-relaxed">
                                        Identity verified. Create a strong new password (at least 8 characters).
                                    </p>
                                </div>

                                <form onSubmit={handleResetPassword} className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                                            New Password
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                placeholder="••••••••"
                                                required
                                                minLength={8}
                                                className="w-full bg-[#162032] border border-slate-700/80 rounded-xl px-4 py-3.5 pr-11 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm transition-all"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                                            >
                                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                                            Confirm New Password
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showConfirmPassword ? 'text' : 'password'}
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                placeholder="••••••••"
                                                required
                                                minLength={8}
                                                className="w-full bg-[#162032] border border-slate-700/80 rounded-xl px-4 py-3.5 pr-11 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm transition-all"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                                            >
                                                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Password checks helper */}
                                    <div className="text-xs space-y-1 py-1">
                                        <div className={`flex items-center gap-1.5 ${password.length >= 8 ? 'text-emerald-400' : 'text-slate-500'}`}>
                                            <span>{password.length >= 8 ? '✓' : '○'}</span>
                                            <span>Minimum 8 characters</span>
                                        </div>
                                        <div className={`flex items-center gap-1.5 ${password && password === confirmPassword ? 'text-emerald-400' : 'text-slate-500'}`}>
                                            <span>{password && password === confirmPassword ? '✓' : '○'}</span>
                                            <span>Passwords match</span>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.99] text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 mt-2"
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                <span>Updating Password...</span>
                                            </>
                                        ) : (
                                            <span>Reset & Save Password</span>
                                        )}
                                    </button>
                                </form>
                            </motion.div>
                        )}

                        {/* STEP 4: SUCCESS */}
                        {step === 'SUCCESS' && (
                            <motion.div key="step-success" variants={cardVariants} initial="hidden" animate="visible" exit="exit" className="text-center space-y-6 py-4">
                                <div className="inline-flex w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/10 mx-auto">
                                    <CheckCircle2 className="w-9 h-9" />
                                </div>
                                <div className="space-y-2">
                                    <h1 className="text-2xl font-bold tracking-tight text-white font-outfit">Password Updated</h1>
                                    <p className="text-sm text-slate-400 leading-relaxed">
                                        Your password has been securely reset. You can now log in to the admin panel with your new password.
                                    </p>
                                </div>

                                <button
                                    onClick={() => router.push('/admin/login')}
                                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.99] text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/25 transition-all text-sm"
                                >
                                    Proceed to Login
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Return to Login link */}
                <div className="text-center mt-6">
                    <Link
                        href="/admin/login"
                        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white font-medium transition-colors group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        <span>Back to Login</span>
                    </Link>
                </div>
            </div>
        </div>
    )
}
