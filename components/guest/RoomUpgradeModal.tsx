'use client'

import { useState, useEffect } from 'react'
import { X, Sparkles, Check, ArrowRight, ShieldCheck, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface RoomUpgradeModalProps {
    isOpen: boolean
    onClose: () => void
    booking: any
    guestId: string
    onSuccess?: () => void
}

export default function RoomUpgradeModal({
    isOpen,
    onClose,
    booking,
    guestId,
    onSuccess
}: RoomUpgradeModalProps) {
    const [loading, setLoading] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [upgrades, setUpgrades] = useState<any[]>([])
    const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)

    useEffect(() => {
        if (!isOpen || !booking?.id) return
        setLoading(true)
        fetch(`/api/guest/rooms/upgrades?bookingId=${booking.id}&guestId=${guestId}`)
            .then(res => res.json())
            .then(data => {
                if (data.success && Array.isArray(data.availableUpgrades)) {
                    setUpgrades(data.availableUpgrades)
                    if (data.availableUpgrades.length > 0) {
                        setSelectedRoomId(data.availableUpgrades[0].id)
                    }
                }
            })
            .catch(err => {
                console.error(err)
                toast.error('Failed to load room upgrades')
            })
            .finally(() => setLoading(false))
    }, [isOpen, booking?.id, guestId])

    if (!isOpen) return null

    const handleRequestUpgrade = async () => {
        if (!selectedRoomId) {
            toast.error('Please select a room to upgrade to')
            return
        }

        setSubmitting(true)
        try {
            const res = await fetch('/api/bookings/manage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bookingId: booking.id,
                    guestId,
                    type: 'UPGRADE',
                    newRoomId: selectedRoomId
                })
            })

            const data = await res.json()
            if (res.ok && data.success) {
                toast.success('Room upgrade request submitted! Front desk is reviewing your request.')
                onSuccess?.()
                onClose()
            } else {
                toast.error(data.error || 'Failed to submit upgrade request')
            }
        } catch (e) {
            toast.error('Network error. Please try again.')
        } finally {
            setSubmitting(false)
        }
    }

    const selectedOption = upgrades.find(u => u.id === selectedRoomId)

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="relative w-full max-w-lg bg-[#0E1322] border border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Upgrade Your Room</h2>
                            <p className="text-xs text-gray-400 font-medium">
                                Current: <span className="text-white font-semibold">{booking?.room?.type || 'Standard'} (Room {booking?.room?.roomNumber || '---'})</span>
                            </p>
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
                <div className="overflow-y-auto py-5 space-y-4 pr-1 flex-1">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <Loader2 className="w-7 h-7 text-[#4A9EFF] animate-spin" />
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Finding Premium Rooms...</p>
                        </div>
                    ) : upgrades.length === 0 ? (
                        <div className="text-center py-12 space-y-3">
                            <p className="text-sm font-semibold text-gray-300">No upgrades currently available</p>
                            <p className="text-xs text-gray-500 max-w-xs mx-auto">
                                You are already enjoying our premier accommodation tier or other categories are fully occupied.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                Select Upgrade Option
                            </p>
                            {upgrades.map(opt => {
                                const isSelected = selectedRoomId === opt.id
                                return (
                                    <div
                                        key={opt.id}
                                        onClick={() => setSelectedRoomId(opt.id)}
                                        className={`relative p-4 rounded-2xl border transition-all cursor-pointer flex gap-4 ${
                                            isSelected
                                                ? 'bg-amber-500/10 border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/50'
                                                : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.05] hover:border-white/20'
                                        }`}
                                    >
                                        {opt.images?.[0] && (
                                            <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-white/5 border border-white/10">
                                                <img
                                                    src={opt.images[0]}
                                                    alt={opt.type}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <div className="flex items-center gap-1.5">
                                                        <h3 className="text-sm font-bold text-white truncate">{opt.type}</h3>
                                                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                                            Tier
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">{opt.description}</p>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className="text-xs font-black text-amber-400">
                                                        {opt.priceDifference > 0 ? `+₹${opt.priceDifference.toLocaleString('en-IN')}` : 'Complimentary'}
                                                    </p>
                                                    <p className="text-[9px] text-gray-500 font-bold uppercase">/ night</p>
                                                </div>
                                            </div>

                                            {opt.amenities?.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5 mt-2.5">
                                                    {opt.amenities.slice(0, 3).map((a: string, i: number) => (
                                                        <span key={i} className="text-[9px] px-2 py-0.5 rounded-md bg-white/[0.04] text-gray-300 font-medium">
                                                            {a}
                                                        </span>
                                                    ))}
                                                    {opt.amenities.length > 3 && (
                                                        <span className="text-[9px] px-1.5 py-0.5 text-gray-500 font-medium">
                                                            +{opt.amenities.length - 3} more
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="pt-4 border-t border-white/10 shrink-0 space-y-3">
                    {selectedOption && (
                        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs">
                            <span className="text-gray-400 font-medium">Estimated Add-on:</span>
                            <span className="text-amber-400 font-black">
                                {selectedOption.priceDifference > 0
                                    ? `+₹${selectedOption.priceDifference.toLocaleString('en-IN')} / night`
                                    : 'Complimentary'}
                            </span>
                        </div>
                    )}
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-3.5 rounded-xl border border-white/10 text-gray-300 font-bold text-xs uppercase tracking-widest hover:bg-white/[0.05] transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            disabled={submitting || !selectedRoomId || upgrades.length === 0}
                            onClick={handleRequestUpgrade}
                            className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs uppercase tracking-widest shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Submitting...</span>
                                </>
                            ) : (
                                <>
                                    <span>Request Room Upgrade</span>
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
