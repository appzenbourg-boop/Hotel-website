'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { 
    User, Phone, Camera, CheckCircle2, 
    ArrowRight, ArrowLeft, Loader2, Sparkles,
    ShieldCheck, Building2, MapPin
} from 'lucide-react'
import { cn } from '@/lib/utils'

function GuestCheckInContent() {
    const searchParams = useSearchParams()
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [bookingRef, setBookingRef] = useState<string>('')
    const [bookingId, setBookingId] = useState<string | null>(null)
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        idProof: '' as string
    })

    useEffect(() => {
        const id = searchParams.get('bookingId')
        if (id) setBookingId(id)

        let phoneParam = searchParams.get('phone')
        if (phoneParam) {
            phoneParam = phoneParam.replace(/\D/g, '')
            if (phoneParam.length > 10 && phoneParam.startsWith('91')) {
                phoneParam = phoneParam.slice(-10)
            }
            setFormData(prev => ({ ...prev, phone: phoneParam || '' }))
        }
    }, [searchParams])

    const [fileUploading, setFileUploading] = useState(false)

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                alert('File is too large. Max 5MB allowed.')
                return
            }
            setFileUploading(true)
            try {
                const { uploadToCloudinary } = await import('@/lib/cloudinary')
                const result = await uploadToCloudinary(file, 'guest-id-proofs')
                setFormData(prev => ({ ...prev, idProof: result.url }))
            } catch (error) {
                console.error('[GUEST_ID_UPLOAD_ERROR]', error)
                alert('Failed to upload ID. Please try again.')
            } finally {
                setFileUploading(false)
            }
        }
    }

    const handleSubmit = async () => {
        if (!formData.name || !formData.phone || !formData.idProof) return
        setLoading(true)
        try {
            const res = await fetch('/api/guest/check-in', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, bookingId })
            })

            if (res.ok) {
                const data = await res.json()
                setBookingRef(data.bookingRef)
                setStep(3)
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const STEPS = [
        { id: 1, label: 'Personal Info' },
        { id: 2, label: 'Identity Verification' },
        { id: 3, label: 'Complete' }
    ]

    return (
        <div className="min-h-screen bg-[#080B11] text-white flex flex-col font-sans selection:bg-[#4A9EFF]/30 overflow-hidden">
            {/* Background Glows */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#4A9EFF15] blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#4A9EFF10] blur-[120px] rounded-full" />
            </div>

            {/* Header */}
            <header className="relative z-10 w-full px-6 py-8 flex items-center justify-between max-w-5xl mx-auto border-b border-white/[0.05]">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#4A9EFF] to-[#3A8EEF] rounded-xl flex items-center justify-center shadow-lg shadow-[#4A9EFF]/20">
                        <Building2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold tracking-tight">ZENBOURG</h2>
                        <p className="text-[10px] font-bold text-[#4A9EFF] uppercase tracking-[0.2em] leading-none">Hotel & Suites</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white/[0.03] border border-white/[0.05] rounded-full">
                    <ShieldCheck className="w-4 h-4 text-[#4A9EFF]" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Secure Check-in</span>
                </div>
            </header>

            <main className="flex-1 relative z-10 flex flex-col items-center justify-center p-6 max-w-5xl mx-auto w-full">
                {/* Progress Indicators */}
                <div className="w-full max-w-md mb-12 flex items-center justify-between relative">
                    <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-white/10 -translate-y-1/2 z-0" />
                    {STEPS.map((s) => (
                        <div key={s.id} className="relative z-10 flex flex-col items-center gap-3">
                            <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-all duration-500 border-2 shadow-2xl",
                                step === s.id ? "bg-[#4A9EFF] border-[#4A9EFF] text-white scale-110 shadow-[#4A9EFF]/30" : 
                                step > s.id ? "bg-[#1db954] border-[#1db954] text-white" : "bg-[#0D151C] border-white/10 text-gray-500"
                            )}>
                                {step > s.id ? <CheckCircle2 className="w-6 h-6" /> : s.id}
                            </div>
                            <span className={cn(
                                "text-[10px] font-bold uppercase tracking-widest absolute -bottom-6 whitespace-nowrap transition-colors duration-500",
                                step === s.id ? "text-white" : "text-gray-600"
                            )}>
                                {s.label}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Form Container */}
                <div className="w-full max-w-lg bg-white/[0.02] border border-white/[0.08] backdrop-blur-3xl rounded-[2.5rem] p-10 shadow-2xl shadow-black/50 overflow-hidden relative group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#4A9EFF]/30 to-transparent" />
                    
                    {step === 1 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight mb-2">Welcome Back.</h1>
                                <p className="text-gray-400 font-medium">Please verify your details to initiate the express arrival process.</p>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Full Name</label>
                                    <div className="relative">
                                        <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600" />
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4.5 pl-14 pr-6 text-white font-semibold outline-none focus:border-[#4A9EFF]/50 focus:bg-white/[0.05] transition-all placeholder:text-gray-700"
                                            placeholder="John Doe"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Mobile number</label>
                                    <div className="relative">
                                        <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600" />
                                        <input
                                            type="tel"
                                            value={formData.phone}
                                            onChange={e => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                                            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4.5 pl-14 pr-6 text-white font-semibold outline-none focus:border-[#4A9EFF]/50 focus:bg-white/[0.05] transition-all placeholder:text-gray-700"
                                            placeholder="98765 43210"
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={() => {
                                        if (formData.name && formData.phone.length >= 10) setStep(2)
                                        else alert('Please enter your full name and 10-digit mobile number.')
                                    }}
                                    className="w-full bg-[#4A9EFF] hover:bg-[#3A8EEF] text-white py-5 rounded-2xl font-bold tracking-tight text-lg shadow-xl shadow-[#4A9EFF]/20 transition-all flex items-center justify-center gap-3 active:scale-[0.98] group"
                                >
                                    Proceed to Identity <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-700">
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight mb-2">ID Verification</h1>
                                <p className="text-gray-400 font-medium">As per government regulations, please provide a high-quality upload of your ID.</p>
                            </div>

                            <label className="block bg-black/40 border-2 border-dashed border-white/10 rounded-3xl p-12 text-center hover:bg-[#4A9EFF]/5 hover:border-[#4A9EFF]/30 transition-all cursor-pointer group relative overflow-hidden">
                                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                                {formData.idProof ? (
                                    <div className="relative animate-in zoom-in-95 duration-500">
                                        <div className="w-full aspect-video rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                                            <img src={formData.idProof} alt="ID Preview" className="w-full h-full object-cover" />
                                        </div>
                                        <div className="mt-6 flex flex-col items-center gap-2">
                                            <div className="flex items-center gap-2 text-[#1db954] font-bold">
                                                <CheckCircle2 className="w-5 h-5" /> Document captured
                                            </div>
                                            <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">Click to retake</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="w-16 h-16 bg-white/[0.03] border border-white/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <Camera className="w-8 h-8 text-[#4A9EFF]" />
                                        </div>
                                        <div>
                                            <p className="text-lg font-bold text-white group-hover:text-[#4A9EFF] transition-colors">Start ID Capture</p>
                                            <p className="text-xs text-gray-600 mt-1 font-bold uppercase tracking-widest">Aadhaar / Passport / License</p>
                                        </div>
                                    </div>
                                )}
                            </label>

                            <div className="flex gap-4">
                                <button onClick={() => setStep(1)} className="flex-1 bg-white/[0.03] hover:bg-white/[0.1] border border-white/5 text-white py-5 rounded-2xl font-bold transition-all flex items-center justify-center gap-2">
                                    <ArrowLeft className="w-4 h-4" /> Back
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={loading || !formData.idProof}
                                    className="flex-[2] bg-[#4A9EFF] hover:bg-[#3A8EEF] text-white py-5 rounded-2xl font-bold shadow-xl shadow-[#4A9EFF]/20 transition-all disabled:opacity-50 disabled:grayscale flex justify-center items-center gap-3 active:scale-[0.98]"
                                >
                                    {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <>Finalize Check-in <Sparkles className="w-5 h-5" /></>}
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="text-center space-y-8 animate-in zoom-in-95 duration-700">
                            <div className="w-24 h-24 bg-[#1db954]/10 rounded-full flex items-center justify-center text-[#1db954] mx-auto shadow-[0_0_50px_rgba(29,185,84,0.2)]">
                                <CheckCircle2 className="w-12 h-12" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight mb-2">You&apos;re checked in!</h1>
                                <p className="text-gray-400 font-medium max-w-sm mx-auto">
                                    Your digital arrival is confirmed. Please present your booking reference at the front desk to receive your key.
                                </p>
                            </div>
                            <div className="bg-[#0D151C] border border-white/[0.06] p-8 rounded-3xl text-left relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-[#4A9EFF]/5 blur-3xl rounded-full" />
                                <p className="text-[10px] text-gray-600 uppercase font-black tracking-[0.2em] mb-3">CONFERMATION CODE</p>
                                <p className="font-mono text-4xl font-black text-white tracking-widest">#{bookingRef}</p>
                            </div>
                            <div className="space-y-4">
                                <a href="/guest/dashboard" className="block w-full bg-white text-black py-5 rounded-2xl font-bold hover:shadow-[0_10px_30px_rgba(255,255,255,0.15)] transition-all">
                                    Explore Guest Portal
                                </a>
                                <div className="flex items-center justify-center gap-4 text-gray-500 font-bold text-[10px] uppercase tracking-widest">
                                    <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Luxury City View</span>
                                    <span className="w-1 h-1 rounded-full bg-gray-700" />
                                    <span>Fast Wi-Fi Active</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-12 text-center text-gray-600 text-[10px] font-bold uppercase tracking-[0.2em] space-y-1">
                    <p>© 2026 ZENBOURG LUXURY GROUP</p>
                    <p>Express Entry System v4.0</p>
                </div>
            </main>
        </div>
    )
}

export default function GuestCheckInPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#080B11] flex flex-col items-center justify-center text-gray-500">
                <Loader2 className="w-8 h-8 animate-spin mb-4" />
                <p className="text-xs font-bold uppercase tracking-widest animate-pulse">Initializing Digital Arrival...</p>
            </div>
        }>
            <GuestCheckInContent />
        </Suspense>
    )
}
