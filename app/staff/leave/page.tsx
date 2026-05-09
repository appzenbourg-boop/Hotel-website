'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import {
    Calendar, ChevronLeft, Send,
    Clock, CheckCircle2, X,
    Umbrella, Stethoscope, Briefcase, Loader2, Paperclip
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { format, differenceInDays } from 'date-fns'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function LeavePage() {
    const router = useRouter()
    const [submitting, setSubmitting] = useState(false)
    const [leaveType, setLeaveType] = useState('EARNED')
    const [reason, setReason] = useState('')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [evidence, setEvidence] = useState('')

    const { data: rawData, mutate, isValidating: loading } = useSWR('/api/staff/leave', fetcher, {
        revalidateOnFocus: true,
        dedupingInterval: 2000,
    })

    const balances = rawData?.balances || {}
    const history: any[] = Array.isArray(rawData?.history) ? rawData.history : []

    const totalDays = startDate && endDate
        ? differenceInDays(new Date(endDate), new Date(startDate)) + 1
        : 0

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!startDate || !endDate || !reason) { toast.error('Please fill all fields'); return }
        if (totalDays <= 0) { toast.error('End date must be after start date'); return }

        setSubmitting(true)
        try {
            const res = await fetch('/api/staff/leave', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ leaveType, startDate, endDate, totalDays, reason, evidence }),
            })
            if (res.ok) {
                toast.success('Leave request submitted')
                setReason(''); setStartDate(''); setEndDate(''); setEvidence('')
                mutate()
            } else {
                toast.error('Failed to submit request')
            }
        } catch { toast.error('Something went wrong') }
        finally { setSubmitting(false) }
    }

    const leaveTypes = [
        { value: 'EARNED',  label: 'Annual Leave' },
        { value: 'SICK',    label: 'Sick Leave' },
        { value: 'CASUAL',  label: 'Casual Leave' },
        { value: 'UNPAID',  label: 'Unpaid Leave' },
    ]

    const getLeaveLabel = (type: string) => {
        const map: any = {
            'EARNED': 'Annual Leave',
            'ANNUAL': 'Annual Leave', // Fallback
            'SICK': 'Sick Leave',
            'CASUAL': 'Casual Leave',
            'UNPAID': 'Unpaid Leave'
        }
        return map[type] || (type.charAt(0) + type.slice(1).toLowerCase() + ' Leave')
    }

    const balanceCards = [
        { label: 'Annual Leave',  days: balances.annual ?? 0,  max: 15, icon: Umbrella,    color: 'text-blue-400',   bg: 'bg-blue-500/10',   bar: 'bg-blue-500' },
        { label: 'Sick Leave',    days: balances.sick ?? 0,    max: 10, icon: Stethoscope, color: 'text-amber-400',  bg: 'bg-amber-500/10',  bar: 'bg-amber-500' },
        { label: 'Casual Leave',  days: balances.casual ?? 0,  max: 7,  icon: Briefcase,   color: 'text-purple-400', bg: 'bg-purple-500/10', bar: 'bg-purple-500' },
    ]

    if (!rawData && loading) return (
        <div className="space-y-8 animate-pulse px-4 pb-16">
            <div className="flex justify-between items-center">
                <div className="h-10 w-10 bg-white/5 rounded-xl" />
                <div className="h-6 w-40 bg-white/5 rounded-xl" />
                <div className="w-10" />
            </div>
            <div className="grid grid-cols-3 gap-3">
                {[1,2,3].map(i => <div key={i} className="h-32 bg-white/5 rounded-3xl" />)}
            </div>
            <div className="h-80 w-full bg-white/5 rounded-[40px]" />
        </div>
    )

    return (
        <div className="space-y-8 animate-fade-in pb-16">

            {/* Header */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => router.back()}
                    className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-gray-400 hover:text-white transition-all active:scale-95"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="text-center">
                    <h1 className="text-xl font-black text-white tracking-tight">Leave Requests</h1>
                    <p className="text-[10px] font-semibold text-blue-500 uppercase tracking-widest mt-0.5">Apply & track your leaves</p>
                </div>
                <div className="w-10" />
            </div>

            {/* Balance Cards — proper grid, no horizontal scroll */}
            <div className="grid grid-cols-3 gap-3">
                {balanceCards.map((card, i) => {
                    const pct = card.max > 0 ? Math.min(100, Math.round((card.days / card.max) * 100)) : 0
                    return (
                        <div key={i} className="bg-[#161b22] border border-white/[0.05] rounded-3xl p-4 space-y-3">
                            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', card.bg)}>
                                <card.icon className={cn('w-4 h-4', card.color)} />
                            </div>
                            <div>
                                <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider leading-tight">{card.label}</p>
                                <p className="text-2xl font-black text-white mt-0.5">{card.days}</p>
                                <p className="text-[9px] text-gray-600 font-medium">of {card.max} days</p>
                            </div>
                            <div className="h-1.5 w-full bg-white/[0.04] rounded-full overflow-hidden">
                                <div
                                    className={cn('h-full rounded-full transition-all duration-700', card.bar)}
                                    style={{ width: `${pct}%` }}
                                />
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Request Form */}
            <form onSubmit={handleSubmit} className="bg-[#161b22] border border-white/[0.05] rounded-[40px] p-6 space-y-6 shadow-xl shadow-black/30">

                {/* Leave Type Selector */}
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Leave Type</label>
                    <div className="grid grid-cols-2 gap-2">
                        {leaveTypes.map(({ value, label }) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => setLeaveType(value)}
                                className={cn(
                                    'py-3 px-4 rounded-2xl text-xs font-bold transition-all active:scale-95 text-left',
                                    leaveType === value
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                                        : 'bg-white/[0.03] border border-white/[0.05] text-gray-500 hover:text-gray-300'
                                )}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Start Date</label>
                        <div className="relative">
                            <input
                                type="date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                className="w-full bg-[#0d1117] border border-white/[0.05] rounded-2xl px-4 py-3.5 text-sm text-white outline-none focus:border-blue-500/50 transition-all [color-scheme:dark]"
                                required
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">End Date</label>
                        <div className="relative">
                            <input
                                type="date"
                                value={endDate}
                                min={startDate}
                                onChange={e => setEndDate(e.target.value)}
                                className="w-full bg-[#0d1117] border border-white/[0.05] rounded-2xl px-4 py-3.5 text-sm text-white outline-none focus:border-blue-500/50 transition-all [color-scheme:dark]"
                                required
                            />
                        </div>
                    </div>
                </div>

                {/* Duration preview */}
                {totalDays > 0 && (
                    <div className="flex items-center justify-between bg-blue-600/5 border border-blue-500/10 rounded-2xl px-5 py-3">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-blue-400" />
                            <span className="text-sm font-bold text-white">{totalDays} day{totalDays > 1 ? 's' : ''}</span>
                        </div>
                        <span className="text-xs text-blue-400 font-medium">
                            Returns: {format(new Date(endDate), 'dd MMM yyyy')}
                        </span>
                    </div>
                )}

                {/* Reason */}
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Reason</label>
                    <textarea
                        rows={3}
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        placeholder="Briefly explain the reason for your leave..."
                        className="w-full bg-[#0d1117] border border-white/[0.05] rounded-2xl px-4 py-3.5 text-sm text-white outline-none focus:border-blue-500/50 transition-all placeholder:text-gray-700 resize-none"
                        required
                    />
                </div>

                {/* Supporting document (optional) */}
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">
                        Supporting Document <span className="text-gray-700 normal-case font-normal">(optional)</span>
                    </label>
                    <div className="flex items-center gap-4 bg-[#0d1117] border border-white/[0.05] rounded-2xl p-4">
                        {evidence ? (
                            <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0">
                                <img src={evidence} className="w-full h-full object-cover" alt="proof" />
                                <button
                                    type="button"
                                    onClick={() => setEvidence('')}
                                    className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/70 rounded-full flex items-center justify-center"
                                >
                                    <X className="w-3 h-3 text-white" />
                                </button>
                            </div>
                        ) : (
                            <div className="w-14 h-14 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center shrink-0">
                                <Paperclip className="w-5 h-5 text-gray-700" />
                            </div>
                        )}
                        <div>
                            <input
                                type="file"
                                id="leave-evidence"
                                className="hidden"
                                accept="image/*"
                                onChange={async e => {
                                    const file = e.target.files?.[0]
                                    if (file) {
                                        try {
                                            toast.info('Uploading document...')
                                            const { uploadToCloudinary } = await import('@/lib/cloudinary')
                                            const result = await uploadToCloudinary(file, 'leave-evidence')
                                            setEvidence(result.url)
                                            toast.success('Document uploaded')
                                        } catch (error) {
                                            console.error('[LEAVE_EVIDENCE_UPLOAD_ERROR]', error)
                                            toast.error('Failed to upload document')
                                        }
                                    }
                                }}
                            />
                            <label
                                htmlFor="leave-evidence"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-white/[0.04] border border-white/[0.08] text-gray-300 text-xs font-semibold rounded-xl cursor-pointer hover:bg-white/[0.08] transition-all"
                            >
                                <Paperclip className="w-3.5 h-3.5" />
                                {evidence ? 'Change file' : 'Attach file'}
                            </label>
                            <p className="text-[10px] text-gray-700 mt-1.5">Medical certificate, etc.</p>
                        </div>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-sm shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50"
                >
                    {submitting
                        ? <Loader2 className="w-5 h-5 animate-spin" />
                        : <><Send className="w-4 h-4" /> Submit Request</>
                    }
                </button>
            </form>

            {/* Leave History */}
            <div className="space-y-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">My Leave History</h3>

                {history.length === 0 ? (
                    <div className="py-16 text-center bg-[#161b22] rounded-[35px] border border-dashed border-white/5">
                        <Umbrella className="w-10 h-10 text-gray-800 mx-auto mb-3" />
                        <p className="text-xs text-gray-600 font-medium">No leave requests yet</p>
                    </div>
                ) : (
                    history.map((req: any, i: number) => (
                        <div
                            key={i}
                            className="bg-[#161b22] border border-white/[0.05] p-5 rounded-3xl flex items-center gap-4 relative overflow-hidden"
                        >
                            {/* Status stripe */}
                            <div className={cn(
                                'absolute top-0 bottom-0 left-0 w-1 rounded-l-3xl',
                                req.status === 'APPROVED' ? 'bg-emerald-500' :
                                req.status === 'REJECTED' ? 'bg-rose-500' : 'bg-blue-500'
                            )} />

                            {/* Icon */}
                            <div className={cn(
                                'w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ml-2',
                                req.status === 'APPROVED' ? 'bg-emerald-500/10' :
                                req.status === 'REJECTED' ? 'bg-rose-500/10' : 'bg-blue-500/10'
                            )}>
                                {req.status === 'APPROVED'
                                    ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                    : req.status === 'REJECTED'
                                    ? <X className="w-5 h-5 text-rose-500" />
                                    : <Clock className="w-5 h-5 text-blue-500" />
                                }
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <p className="text-sm font-bold text-white">
                                        {getLeaveLabel(req.leaveType)}
                                    </p>
                                    <span className="text-[10px] text-gray-600 font-medium">· {req.totalDays}d</span>
                                </div>
                                <p className="text-xs text-gray-500">
                                    {format(new Date(req.startDate), 'dd MMM')} – {format(new Date(req.endDate), 'dd MMM yyyy')}
                                </p>
                                {req.reason && (
                                    <p className="text-[11px] text-gray-600 mt-1 line-clamp-1">{req.reason}</p>
                                )}
                                
                                {/* Admin Rejection Reason */}
                                {req.status === 'REJECTED' && req.rejectionReason && (
                                    <div className="mt-2.5 p-2.5 bg-rose-500/[0.04] border border-rose-500/10 rounded-xl">
                                        <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-0.5">Admin Note</p>
                                        <p className="text-[11px] text-gray-300 leading-relaxed italic">“{req.rejectionReason}”</p>
                                    </div>
                                )}
                            </div>

                            {/* Status badge */}
                            <span className={cn(
                                'text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl shrink-0',
                                req.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400' :
                                req.status === 'REJECTED' ? 'bg-rose-500/10 text-rose-400' :
                                'bg-blue-500/10 text-blue-400'
                            )}>
                                {req.status}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
