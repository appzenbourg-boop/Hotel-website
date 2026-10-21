'use client'

import { useState } from 'react'
import { X, Calendar, Clock, ArrowRight, Loader2, Plus, CalendarCheck } from 'lucide-react'
import { format, addDays } from 'date-fns'
import { toast } from 'sonner'

interface StayExtensionModalProps {
    isOpen: boolean
    onClose: () => void
    booking: any
    guestId: string
    onSuccess?: () => void
}

export default function StayExtensionModal({
    isOpen,
    onClose,
    booking,
    guestId,
    onSuccess
}: StayExtensionModalProps) {
    const [extraNights, setExtraNights] = useState<number>(1)
    const [submitting, setSubmitting] = useState(false)
    const [specialNotes, setSpecialNotes] = useState('')

    if (!isOpen || !booking) return null

    const currentCheckOut = booking.checkOut ? new Date(booking.checkOut) : new Date()
    const newCheckOut = addDays(currentCheckOut, extraNights)
    const nightlyRate = booking.room?.basePrice || 0
    const estimatedExtraAmount = nightlyRate * extraNights

    const handleExtendStay = async () => {
        setSubmitting(true)
        try {
            const res = await fetch('/api/bookings/manage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bookingId: booking.id,
                    guestId,
                    type: 'EXTEND',
                    newCheckOut: newCheckOut.toISOString(),
                    notes: specialNotes || undefined
                })
            })

            const data = await res.json()
            if (res.ok && data.success) {
                toast.success(`Extension request for +${extraNights} night${extraNights > 1 ? 's' : ''} submitted! Front desk will confirm shortly.`)
                onSuccess?.()
                onClose()
            } else {
                toast.error(data.error || 'Failed to submit stay extension request')
            }
        } catch (e) {
            toast.error('Network error. Please try again.')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="relative w-full max-w-md bg-[#0E1322] border border-white/10 rounded-3xl p-6 shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-[#4A9EFF]/20 border border-[#4A9EFF]/30 flex items-center justify-center text-[#4A9EFF]">
                            <CalendarCheck className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Extend Your Stay</h2>
                            <p className="text-xs text-gray-400 font-medium">Room {booking.room?.roomNumber} · {booking.room?.type}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 hover:text-white transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="py-5 space-y-5">
                    {/* Stay Comparison */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5">
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Current Check-out</p>
                            <p className="text-xs font-bold text-gray-300">
                                {format(currentCheckOut, 'dd MMM yyyy, p')}
                            </p>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-[#4A9EFF]/10 border border-[#4A9EFF]/30">
                            <p className="text-[10px] font-black text-[#4A9EFF] uppercase tracking-widest mb-1">New Check-out</p>
                            <p className="text-xs font-black text-white">
                                {format(newCheckOut, 'dd MMM yyyy, p')}
                            </p>
                        </div>
                    </div>

                    {/* Quick Nights Selection */}
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2.5">
                            How many additional nights?
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                            {[1, 2, 3, 5].map(n => {
                                const isSelected = extraNights === n
                                return (
                                    <button
                                        key={n}
                                        type="button"
                                        onClick={() => setExtraNights(n)}
                                        className={`py-3 rounded-xl border text-xs font-black transition-all flex flex-col items-center justify-center gap-0.5 ${
                                            isSelected
                                                ? 'bg-[#4A9EFF] text-white border-[#4A9EFF] shadow-[0_0_15px_rgba(74,158,255,0.3)] scale-105'
                                                : 'bg-white/[0.02] border-white/10 text-gray-400 hover:bg-white/[0.06] hover:text-white'
                                        }`}
                                    >
                                        <span>+{n} {n === 1 ? 'Night' : 'Nights'}</span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Cost Preview */}
                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-400">Nightly Room Rate</span>
                            <span className="text-white font-bold">₹{nightlyRate.toLocaleString('en-IN')} / night</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-400">Additional Nights</span>
                            <span className="text-white font-bold">{extraNights}</span>
                        </div>
                        <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-300">Estimated Additional Bill</span>
                            <span className="text-sm font-black text-[#4A9EFF]">₹{estimatedExtraAmount.toLocaleString('en-IN')}</span>
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                            Special Requests / Reason (Optional)
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. Flight postponed, need late checkout..."
                            value={specialNotes}
                            onChange={e => setSpecialNotes(e.target.value)}
                            className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-[#4A9EFF]/50"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 pt-3 border-t border-white/10">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-3 rounded-xl border border-white/10 text-gray-300 font-bold text-xs uppercase tracking-widest hover:bg-white/[0.05] transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        disabled={submitting}
                        onClick={handleExtendStay}
                        className="flex-1 py-3 rounded-xl bg-[#4A9EFF] hover:bg-[#3A8EEF] text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-[#4A9EFF]/20 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Submitting...</span>
                            </>
                        ) : (
                            <>
                                <span>Confirm Extension</span>
                                <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
