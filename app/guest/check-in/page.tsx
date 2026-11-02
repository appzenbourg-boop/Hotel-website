'use client'

import { useState, useEffect, Suspense, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { 
    User, Phone, Camera, CheckCircle2, 
    ArrowRight, ArrowLeft, Loader2, ShieldCheck, Building2, MapPin,
    Plus, Trash2, Users, CreditCard, Upload
} from 'lucide-react'
import { toast } from 'sonner'
import { cn, getApiErrorMessage } from '@/lib/utils'

interface AccompanyingGuest {
    id: string
    name: string
    age: string
    aadharNumber: string
    idProof: string
}

function GuestCheckInContent() {
    const searchParams = useSearchParams()
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [bookingRef, setBookingRef] = useState<string>('')
    const [bookingId, setBookingId] = useState<string | null>(null)
    
    // Main Guest & Accompanying Guests
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        idType: 'Aadhaar Card',
        aadharNumber: '',
        idProof: '' as string,
        additionalGuests: [] as AccompanyingGuest[]
    })

    const [uploadingTarget, setUploadingTarget] = useState<string | null>(null)

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

    // Add new accompanying guest
    const handleAddGuest = () => {
        const newGuest: AccompanyingGuest = {
            id: 'g_' + Math.random().toString(36).slice(2, 9),
            name: '',
            age: '',
            aadharNumber: '',
            idProof: ''
        }
        setFormData(prev => ({
            ...prev,
            additionalGuests: [...prev.additionalGuests, newGuest]
        }))
    }

    // Remove accompanying guest
    const handleRemoveGuest = (id: string) => {
        setFormData(prev => ({
            ...prev,
            additionalGuests: prev.additionalGuests.filter(g => g.id !== id)
        }))
    }

    // Update accompanying guest fields
    const handleUpdateGuest = (id: string, field: keyof AccompanyingGuest, value: string) => {
        setFormData(prev => ({
            ...prev,
            additionalGuests: prev.additionalGuests.map(g => 
                g.id === id ? { ...g, [field]: value } : g
            )
        }))
    }

    // Universal file uploader (supports primary guest 'primary' or accompanying guest ID)
    const handleFileUpload = async (targetId: string, file?: File) => {
        if (!file) return
        if (file.size > 8 * 1024 * 1024) {
            toast.error('File exceeds 8MB limit. Please upload a smaller image.')
            return
        }

        setUploadingTarget(targetId)
        try {
            const { uploadToCloudinary } = await import('@/lib/cloudinary')
            const result = await uploadToCloudinary(file, 'guest-id-proofs')
            
            if (targetId === 'primary') {
                setFormData(prev => ({ ...prev, idProof: result.url }))
            } else {
                setFormData(prev => ({
                    ...prev,
                    additionalGuests: prev.additionalGuests.map(g =>
                        g.id === targetId ? { ...g, idProof: result.url } : g
                    )
                }))
            }
            toast.success('Document uploaded successfully')
        } catch (error) {
            console.error('[ID_UPLOAD_ERROR]', error)
            // Fallback: Local preview if Cloudinary is temporarily unreachable
            const reader = new FileReader()
            reader.onload = (event) => {
                const dataUrl = event.target?.result as string
                if (targetId === 'primary') {
                    setFormData(prev => ({ ...prev, idProof: dataUrl }))
                } else {
                    setFormData(prev => ({
                        ...prev,
                        additionalGuests: prev.additionalGuests.map(g =>
                            g.id === targetId ? { ...g, idProof: dataUrl } : g
                        )
                    }))
                }
                toast.success('Document captured (offline fallback)')
            }
            reader.readAsDataURL(file)
        } finally {
            setUploadingTarget(null)
        }
    }

    const handleSubmit = async () => {
        if (!formData.name || !formData.phone || !formData.idProof) {
            toast.error('Please complete all required fields and upload your ID')
            return
        }

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
                if (typeof window !== 'undefined') {
                    localStorage.setItem('zenbourg_guest_id', data.guestId)
                }
                setStep(3)
            } else {
                const err = await getApiErrorMessage(res, 'Check-in failed')
                toast.error(err)
            }
        } catch (error) {
            console.error(error)
            toast.error('Check-in failed. Please try again later.')
        } finally {
            setLoading(false)
        }
    }

    const STEPS = [
        { id: 1, label: 'Guest Details' },
        { id: 2, label: 'Aadhaar Verification' },
        { id: 3, label: 'Confirmed' }
    ]

    return (
        <div className="min-h-screen bg-[#080B11] text-white flex flex-col font-sans selection:bg-[#4A9EFF]/30 overflow-x-hidden">
            {/* Background Ambient Glow */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] bg-[#4A9EFF15] blur-[130px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] bg-[#4A9EFF10] blur-[130px] rounded-full" />
            </div>

            {/* Header */}
            <header className="relative z-10 w-full px-6 py-6 flex items-center justify-between max-w-5xl mx-auto border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#4A9EFF] to-[#3A8EEF] rounded-xl flex items-center justify-center shadow-lg shadow-[#4A9EFF]/20">
                        <Building2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black tracking-tight font-outfit uppercase">ZENBOURG</h2>
                        <p className="text-[10px] font-bold text-[#4A9EFF] uppercase tracking-[0.2em] leading-none">Hotel & Suites</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-3.5 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-full">
                    <ShieldCheck className="w-4 h-4 text-[#4A9EFF]" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-300">Express Check-in</span>
                </div>
            </header>

            <main className="flex-1 relative z-10 flex flex-col items-center justify-center p-4 sm:p-6 max-w-5xl mx-auto w-full my-6">
                {/* Stepper */}
                <div className="w-full max-w-md mb-10 flex items-center justify-between relative px-2">
                    <div className="absolute top-1/2 left-4 right-4 h-[1px] bg-white/10 -translate-y-1/2 z-0" />
                    {STEPS.map((s) => (
                        <div key={s.id} className="relative z-10 flex flex-col items-center gap-2">
                            <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-all duration-300 border-2 shadow-xl",
                                step === s.id ? "bg-[#4A9EFF] border-[#4A9EFF] text-white scale-110 shadow-[#4A9EFF]/30" : 
                                step > s.id ? "bg-[#1db954] border-[#1db954] text-white" : "bg-[#0D151C] border-white/10 text-gray-500"
                            )}>
                                {step > s.id ? <CheckCircle2 className="w-5 h-5" /> : s.id}
                            </div>
                            <span className={cn(
                                "text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-colors duration-300",
                                step === s.id ? "text-white" : "text-gray-500"
                            )}>
                                {s.label}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Main Card */}
                <div className="w-full max-w-xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-3xl rounded-[2rem] p-6 sm:p-10 shadow-2xl shadow-black/80 relative">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#4A9EFF]/40 to-transparent" />
                    
                    {/* ── STEP 1: PRIMARY GUEST & ACCOMPANYING GUESTS ── */}
                    {step === 1 && (
                        <div className="space-y-7 animate-in fade-in duration-500">
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">Primary Guest Details</h1>
                                <p className="text-sm text-gray-400 font-medium">Please enter your contact details and add any accompanying guests sharing your room.</p>
                            </div>

                            {/* Primary Guest Fields */}
                            <div className="space-y-4 bg-white/[0.02] p-5 rounded-2xl border border-white/[0.06]">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                                        Primary Guest Full Name <span className="text-red-400">*</span>
                                    </label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full bg-white/[0.04] border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-white font-medium text-sm outline-none focus:border-[#4A9EFF]/60 focus:bg-white/[0.06] transition-all placeholder:text-gray-600"
                                            placeholder="e.g. Harish Singh"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                                        Mobile Number <span className="text-red-400">*</span>
                                    </label>
                                    <div className="relative">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                        <input
                                            type="tel"
                                            value={formData.phone}
                                            onChange={e => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                                            className="w-full bg-white/[0.04] border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-white font-medium text-sm outline-none focus:border-[#4A9EFF]/60 focus:bg-white/[0.06] transition-all placeholder:text-gray-600"
                                            placeholder="98765 43210"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                                        Aadhaar / Gov ID Number <span className="text-gray-500">(Optional)</span>
                                    </label>
                                    <div className="relative">
                                        <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                        <input
                                            type="text"
                                            value={formData.aadharNumber}
                                            onChange={e => setFormData({ ...formData, aadharNumber: e.target.value })}
                                            className="w-full bg-white/[0.04] border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-white font-medium text-sm outline-none focus:border-[#4A9EFF]/60 focus:bg-white/[0.06] transition-all placeholder:text-gray-600"
                                            placeholder="e.g. 1234 5678 9012"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Accompanying Guests Section */}
                            <div className="space-y-4 pt-2">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                                            <Users className="w-4 h-4 text-[#4A9EFF]" /> Accompanying Guests
                                        </h3>
                                        <p className="text-xs text-gray-400 mt-0.5">Staying with someone? Add other guests for fast-track arrival.</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleAddGuest}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#4A9EFF]/10 hover:bg-[#4A9EFF]/20 border border-[#4A9EFF]/30 text-[#4A9EFF] rounded-xl text-xs font-bold transition-all active:scale-95 shadow-sm"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Add Guest
                                    </button>
                                </div>

                                {formData.additionalGuests.length === 0 ? (
                                    <div className="border border-dashed border-white/10 rounded-2xl p-5 text-center bg-white/[0.01]">
                                        <p className="text-xs text-gray-500">No accompanying guests added yet. Click &quot;Add Guest&quot; if other people are sharing this room.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {formData.additionalGuests.map((g, idx) => (
                                            <div key={g.id} className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-4 space-y-3 relative">
                                                <div className="flex items-center justify-between pb-1 border-b border-white/[0.04]">
                                                    <span className="text-xs font-bold text-[#4A9EFF] uppercase tracking-wider">
                                                        Guest #{idx + 2}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveGuest(g.id)}
                                                        className="text-gray-500 hover:text-red-400 transition-colors p-1"
                                                        title="Remove guest"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                    <div className="sm:col-span-2 space-y-1">
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Guest Full Name</label>
                                                        <input
                                                            type="text"
                                                            value={g.name}
                                                            onChange={e => handleUpdateGuest(g.id, 'name', e.target.value)}
                                                            placeholder="Full Name"
                                                            className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-[#4A9EFF]/60"
                                                            required
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Age (Yrs)</label>
                                                        <input
                                                            type="number"
                                                            value={g.age}
                                                            onChange={e => handleUpdateGuest(g.id, 'age', e.target.value)}
                                                            placeholder="Age"
                                                            min={1}
                                                            max={120}
                                                            className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-[#4A9EFF]/60"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Aadhaar / ID Card Number</label>
                                                    <input
                                                        type="text"
                                                        value={g.aadharNumber}
                                                        onChange={e => handleUpdateGuest(g.id, 'aadharNumber', e.target.value)}
                                                        placeholder="e.g. Aadhaar Number (XXXX-XXXX-XXXX)"
                                                        className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-[#4A9EFF]/60"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    if (!formData.name || formData.phone.length < 10) {
                                        toast.error('Please enter your full name and 10-digit mobile number.')
                                        return
                                    }
                                    setStep(2)
                                }}
                                className="w-full bg-[#4A9EFF] hover:bg-[#3A8EEF] text-white py-4 rounded-xl font-bold tracking-tight text-base shadow-xl shadow-[#4A9EFF]/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98] mt-4"
                            >
                                Proceed to Aadhaar / ID Verification <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {/* ── STEP 2: AADHAAR / ID PROOF UPLOADS ── */}
                    {step === 2 && (
                        <div className="space-y-7 animate-in fade-in duration-500">
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">Government ID Upload</h1>
                                <p className="text-sm text-gray-400 font-medium">As per local hotel safety compliance, please upload clear photos of Aadhaar cards or Gov IDs for all staying guests.</p>
                            </div>

                            {/* Main Guest Aadhaar Upload */}
                            <div className="space-y-3 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                                        Primary Guest: {formData.name}
                                    </span>
                                    <span className="text-[10px] bg-[#4A9EFF]/10 border border-[#4A9EFF]/30 text-[#4A9EFF] px-2 py-0.5 rounded-full font-bold">
                                        Required
                                    </span>
                                </div>

                                <label className="block bg-black/40 border-2 border-dashed border-white/10 rounded-2xl p-6 text-center hover:bg-[#4A9EFF]/5 hover:border-[#4A9EFF]/40 transition-all cursor-pointer group relative overflow-hidden">
                                    <input 
                                        type="file" 
                                        className="hidden" 
                                        accept="image/*,application/pdf" 
                                        onChange={e => e.target.files?.[0] && handleFileUpload('primary', e.target.files[0])} 
                                    />
                                    {uploadingTarget === 'primary' ? (
                                        <div className="flex flex-col items-center gap-2 py-4">
                                            <Loader2 className="w-7 h-7 text-[#4A9EFF] animate-spin" />
                                            <p className="text-xs text-gray-300 font-semibold">Uploading document...</p>
                                        </div>
                                    ) : formData.idProof ? (
                                        <div className="relative">
                                            <div className="w-full aspect-[16/9] max-h-48 rounded-xl overflow-hidden border border-white/10 shadow-lg mx-auto">
                                                <img src={formData.idProof} alt="Main ID" className="w-full h-full object-cover" />
                                            </div>
                                            <div className="mt-3 flex items-center justify-center gap-2 text-[#1db954] font-bold text-xs">
                                                <CheckCircle2 className="w-4 h-4" /> Document captured (Click to replace)
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-3 py-4">
                                            <div className="w-12 h-12 bg-white/[0.04] border border-white/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <Camera className="w-6 h-6 text-[#4A9EFF]" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-white group-hover:text-[#4A9EFF] transition-colors">Tap to Upload Primary Aadhaar / ID</p>
                                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Photo or Scan (Front Side)</p>
                                            </div>
                                        </div>
                                    )}
                                </label>
                            </div>

                            {/* Accompanying Guests Aadhaar Uploads */}
                            {formData.additionalGuests.length > 0 && (
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-white flex items-center gap-2 pt-2">
                                        <Users className="w-4 h-4 text-[#4A9EFF]" /> Accompanying Guests&apos; IDs ({formData.additionalGuests.length})
                                    </h3>

                                    {formData.additionalGuests.map((g, idx) => (
                                        <div key={g.id} className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-xs font-bold text-white">
                                                        Guest #{idx + 2}: {g.name || 'Accompanying Guest'}
                                                    </p>
                                                    {g.aadharNumber && (
                                                        <p className="text-[10px] text-gray-400 font-mono">ID: {g.aadharNumber}</p>
                                                    )}
                                                </div>
                                                {g.idProof ? (
                                                    <span className="text-[10px] text-[#1db954] flex items-center gap-1 font-bold">
                                                        <CheckCircle2 className="w-3.5 h-3.5" /> ID Attached
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] text-amber-400 font-semibold">Upload Required</span>
                                                )}
                                            </div>

                                            <label className="block bg-black/30 border border-dashed border-white/15 rounded-xl p-4 text-center hover:bg-[#4A9EFF]/5 hover:border-[#4A9EFF]/40 transition-all cursor-pointer">
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    accept="image/*,application/pdf"
                                                    onChange={e => e.target.files?.[0] && handleFileUpload(g.id, e.target.files[0])}
                                                />
                                                {uploadingTarget === g.id ? (
                                                    <div className="flex items-center justify-center gap-2 py-3">
                                                        <Loader2 className="w-5 h-5 text-[#4A9EFF] animate-spin" />
                                                        <span className="text-xs text-gray-300">Uploading ID...</span>
                                                    </div>
                                                ) : g.idProof ? (
                                                    <div className="flex items-center gap-3">
                                                        <img src={g.idProof} alt="Guest ID" className="w-16 h-12 rounded-lg object-cover border border-white/10" />
                                                        <div className="text-left flex-1">
                                                            <p className="text-xs font-bold text-white">ID Image Attached</p>
                                                            <p className="text-[10px] text-gray-400">Click to replace photo</p>
                                                        </div>
                                                        <CheckCircle2 className="w-5 h-5 text-[#1db954]" />
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-center gap-2 py-2">
                                                        <Upload className="w-4 h-4 text-[#4A9EFF]" />
                                                        <span className="text-xs font-bold text-gray-300">Upload Aadhaar for {g.name || 'Guest ' + (idx + 2)}</span>
                                                    </div>
                                                )}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Navigation Buttons */}
                            <div className="flex gap-3 pt-2">
                                <button 
                                    type="button" 
                                    onClick={() => setStep(1)} 
                                    className="flex-1 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm"
                                >
                                    <ArrowLeft className="w-4 h-4" /> Back
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSubmit}
                                    disabled={loading || !formData.idProof}
                                    className="flex-[2] bg-[#4A9EFF] hover:bg-[#3A8EEF] text-white py-4 rounded-xl font-bold shadow-xl shadow-[#4A9EFF]/20 transition-all disabled:opacity-50 disabled:grayscale flex justify-center items-center gap-2 active:scale-[0.98] text-sm"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            <span>Submitting Check-in...</span>
                                        </>
                                    ) : (
                                        <span>Finalize All Guests Check-in</span>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── STEP 3: CONFIRMATION ── */}
                    {step === 3 && (
                        <div className="text-center space-y-7 animate-in zoom-in-95 duration-500 py-2">
                            <div className="w-20 h-20 bg-[#1db954]/10 rounded-full flex items-center justify-center text-[#1db954] mx-auto shadow-[0_0_40px_rgba(29,185,84,0.25)] border border-[#1db954]/30">
                                <CheckCircle2 className="w-10 h-10" />
                            </div>
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">You&apos;re Checked In!</h1>
                                <p className="text-gray-400 text-sm max-w-sm mx-auto font-medium">
                                    Digital check-in completed for <strong className="text-white">{1 + formData.additionalGuests.length} guest(s)</strong>. Present your confirmation code at the front desk for instant key pickup.
                                </p>
                            </div>

                            <div className="bg-[#0D151C] border border-white/[0.08] p-6 rounded-2xl text-left relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-[#4A9EFF]/5 blur-3xl rounded-full" />
                                <p className="text-[10px] text-gray-500 uppercase font-black tracking-[0.2em] mb-2">Confirmation Code</p>
                                <p className="font-mono text-3xl sm:text-4xl font-black text-white tracking-widest">#{bookingRef}</p>
                                
                                <div className="mt-4 pt-3 border-t border-white/[0.06] text-xs text-gray-400 flex flex-wrap gap-x-4 gap-y-1">
                                    <span>Primary: <strong className="text-white">{formData.name}</strong></span>
                                    {formData.additionalGuests.length > 0 && (
                                        <span>Co-Guests: <strong className="text-white">{formData.additionalGuests.length} verified</strong></span>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <a 
                                    href="/guest/dashboard" 
                                    className="block w-full bg-white text-black py-4 rounded-xl font-bold hover:bg-slate-100 transition-all text-sm shadow-xl"
                                >
                                    Explore Guest Portal
                                </a>
                                <div className="flex items-center justify-center gap-4 text-gray-500 font-bold text-[10px] uppercase tracking-widest pt-1">
                                    <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> High-Speed Wi-Fi</span>
                                    <span className="w-1 h-1 rounded-full bg-gray-700" />
                                    <span>Front Desk Notified</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-10 text-center text-gray-600 text-[10px] font-bold uppercase tracking-[0.2em] space-y-1">
                    <p>© 2026 ZENBOURG LUXURY GROUP</p>
                    <p>Express Arrival & Compliance System</p>
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
