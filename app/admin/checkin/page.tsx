'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { format, isToday, isTomorrow } from 'date-fns'
import {
    X, CheckCircle2, Send, MessageSquare,
    ChevronRight, ArrowUpRight, Clock, RefreshCw, User,
    FileCheck, AlertCircle, CheckCheck, Plane, Upload, Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import Avatar from '@/components/common/Avatar'

// ---- helpers ----
function getInitials(name: string) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function getAvatarColor(name: string) {
    const colors = [
        { bg: 'bg-[#4A9EFF]', text: 'text-white' },
        { bg: 'bg-[#1db954]', text: 'text-white' },
        { bg: 'bg-[#805ad5]', text: 'text-white' },
        { bg: 'bg-[#d4aa00]', text: 'text-black' },
        { bg: 'bg-[#e53e3e]', text: 'text-white' },
        { bg: 'bg-[#ed8936]', text: 'text-white' },
    ]
    return colors[name.charCodeAt(0) % colors.length]
}

const SOURCE_LABELS: Record<string, string> = {
    DIRECT: 'Direct',
    BOOKING_COM: 'Booking.com',
    MAKE_MY_TRIP: 'MakeMyTrip',
    AGODA: 'Agoda',
    EXPEDIA: 'Expedia',
    AIRBNB: 'Airbnb',
    WALK_IN: 'Walk-in',
    OTHER: 'Other',
}

const CHECKIN_STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
    PENDING:    { label: 'Pending',   color: 'text-gray-400',  dot: 'bg-gray-500' },
    LINK_SENT:  { label: 'Sent',      color: 'text-[#4A9EFF]', dot: 'bg-[#4A9EFF]' },
    LINK_OPENED:{ label: 'Opened',    color: 'text-[#d4aa00]', dot: 'bg-[#d4aa00]' },
    COMPLETED:  { label: 'Completed', color: 'text-[#1db954]', dot: 'bg-[#1db954]' },
    VERIFIED:   { label: 'Verified',  color: 'text-[#1db954]', dot: 'bg-[#1db954]' },
    NO_BOOKING: { label: 'No Booking',color: 'text-gray-500',  dot: 'bg-gray-600' },
}

export default function CheckInManagerPage() {
    const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all')
    const [search, setSearch] = useState('')
    const [bookings, setBookings] = useState<any[]>([])
    const [stats, setStats] = useState({ expected: 0, completed: 0, pending: 0, verificationPending: 0, monthlyAverage: 0, monthlyChange: 0 })
    const [loading, setLoading] = useState(true)
    const [selected, setSelected] = useState<Set<string>>(new Set())
    const [activeGuest, setActiveGuest] = useState<any>(null)
    const [isApproving, setIsApproving] = useState(false)
    const [isSending, setIsSending] = useState(false)
    const [successMsg, setSuccessMsg] = useState<string | null>(null)
    const [uploading, setUploading] = useState<'front' | 'back' | null>(null)
    const frontRef = useRef<HTMLInputElement>(null)
    const backRef = useRef<HTMLInputElement>(null)

    const fetchData = useCallback(async (isAuto = false) => {
        if (!isAuto) setLoading(true)
        try {
            const res = await fetch(`/api/admin/checkin?filter=${filter}&propertyId=${typeof window !== 'undefined' ? (localStorage.getItem('super_admin_property_context') || '') : ''}`)
            if (res.ok) {
                const json = await res.json()
                const data = json?.data ?? json
                setBookings(data.bookings || [])
                setStats(data.stats ? {
                    ...data.stats,
                    monthlyAverage: data.monthlyAverage || 0,
                    monthlyChange: data.monthlyChange || 0
                } : { expected: 0, completed: 0, pending: 0, verificationPending: 0, monthlyAverage: 0, monthlyChange: 0 })
            }
        } catch (err) {
            console.error(err)
        } finally {
            if (!isAuto) setLoading(false)
        }
    }, [filter])

    // Auto-select first guest if none is active
    useEffect(() => {
        if (bookings.length > 0 && !activeGuest) {
            setActiveGuest(bookings[0])
        }
    }, [bookings, activeGuest])


    useEffect(() => { 
        fetchData() 
        // Real-time polling: Refresh every 15 seconds
        const interval = setInterval(() => fetchData(true), 15000)
        return () => clearInterval(interval)
    }, [fetchData])

    // Filter by search
    const filtered = bookings.filter(b =>
        b.guestName.toLowerCase().includes(search.toLowerCase()) ||
        b.resId.toLowerCase().includes(search.toLowerCase()) ||
        (b.roomNumber && b.roomNumber.toString().includes(search))
    )

    const handleSelect = (id: string) => {
        setSelected(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const handleSelectAll = () => {
        if (selected.size === filtered.length) {
            setSelected(new Set())
        } else {
            setSelected(new Set(filtered.map(b => b.id)))
        }
    }

    // Approve check-in
    const handleApprove = async () => {
        if (!activeGuest) return
        setIsApproving(true)
        try {
            const res = await fetch('/api/admin/bookings/status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bookingId: activeGuest.id, action: 'CHECK_IN' })
            })
            if (res.ok) {
                setSuccessMsg(`${activeGuest.guestName} has just completed the online check-in process.`)
                toast.success('Check-in Approved', { description: `${activeGuest.guestName} is now checked in` })
                fetchData()
                setTimeout(() => setSuccessMsg(null), 5000)
            } else {
                toast.error('Failed to approve check-in')
            }
        } catch {
            toast.error('Something went wrong')
        } finally {
            setIsApproving(false)
        }
    }

    // Send verification link (mock — updates guest checkInStatus to LINK_SENT)
    const handleSendLink = async (bookingIds?: string[]) => {
        const ids = bookingIds || Array.from(selected)
        if (ids.length === 0) { toast.error('Select at least one guest'); return }
        setIsSending(true)
        try {
            await Promise.all(ids.map(id => {
                const booking = bookings.find(b => b.id === id)
                if (!booking) return Promise.resolve()
                return fetch(`/api/admin/guests/${booking.guestId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ checkInStatus: 'LINK_SENT' })
                })
            }))
            toast.success(`Verification link sent to ${ids.length} guest(s)`)
            setSelected(new Set())
            fetchData()
        } catch {
            toast.error('Failed to send links')
        } finally {
            setIsSending(false)
        }
    }

    const handleWhatsApp = (bookingIds?: string[]) => {
        const ids = bookingIds || Array.from(selected)
        if (ids.length === 0) { toast.error('Select at least one guest'); return }

        const baseUrl = window.location.origin
        const activeBookings = ids.map(id => bookings.find(b => b.id === id)).filter(Boolean)

        activeBookings.forEach((b, index) => {
            const phone = b.guestPhone?.replace(/\D/g, '') || ''
            if (!phone) {
                toast.error(`No phone number for ${b.guestName}`)
                return
            }

            const message = `Hello *${b.guestName}*, \n\nWelcome to *Zenbourg Hotel*! ✨\nTo skip the queue and enjoy an express check-in, please complete your registration here: \n\n${baseUrl}/guest/check-in?bookingId=${b.id}&phone=${phone}\n\nWe look forward to seeing you!`
            const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
            
            setTimeout(() => {
                window.open(waUrl, '_blank')
            }, index * 500)
        })

        toast.success(`WhatsApp message generated for ${activeBookings.length} guest(s)`)
        if (ids.length === selected.size) setSelected(new Set())
    }

    // Document upload from manager side
    const handleDocUpload = async (side: 'front' | 'back', file: File) => {
        if (!activeGuest) return
        setUploading(side)
        const fd = new FormData()
        fd.append('file', file)
        fd.append('side', side)
        fd.append('guestId', activeGuest.guestId)
        try {
            const res = await fetch('/api/admin/guests/upload', { method: 'POST', body: fd })
            if (res.ok) {
                const data = await res.json()
                setActiveGuest((prev: any) => ({
                    ...prev,
                    idDocumentFront: side === 'front' ? data.url : prev.idDocumentFront,
                    idDocumentBack: side === 'back' ? data.url : prev.idDocumentBack,
                    checkInStatus: 'LINK_OPENED',
                }))
                toast.success(`${side === 'front' ? 'Front' : 'Back'} document uploaded`)
                fetchData()
            } else {
                toast.error('Upload failed')
            }
        } catch { toast.error('Upload failed') }
        finally { setUploading(null) }
    }

    // Mark verified
    const handleMarkVerified = async () => {
        if (!activeGuest) return
        try {
            const res = await fetch(`/api/admin/guests/${activeGuest.guestId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ checkInStatus: 'VERIFIED' }),
            })
            if (res.ok) {
                toast.success('Guest ID marked as verified')
                setActiveGuest((prev: any) => ({ ...prev, checkInStatus: 'VERIFIED' }))
                fetchData()
            }
        } catch { toast.error('Failed to verify') }
    }

    const formatArrival = (booking: any) => {
        if (!booking.checkIn && !booking.checkInCompletedAt) return '—'
        const dateStr = booking.checkInCompletedAt || booking.checkIn
        const d = new Date(dateStr)
        const timeStr = format(d, 'hh:mm a')
        if (isToday(d)) return `Today ${timeStr}`
        if (isTomorrow(d)) return `Tomorrow ${timeStr}`
        return format(d, 'dd MMM hh:mm a')
    }

    return (
        <div className="h-[calc(100vh-3.5rem)] flex flex-col bg-[#101922] overflow-hidden">

            {/* ===== BREADCRUMB ===== */}
            <div className="shrink-0 flex items-center gap-2 px-5 pt-4 pb-1">
                <span className="text-[12px] text-gray-500">Operations</span>
                <ChevronRight className="w-3 h-3 text-gray-600" />
                <span className="text-[12px] text-[#4A9EFF]">Front Desk</span>
            </div>

            {/* ===== STAT CARDS ===== */}
            <div className="shrink-0 grid grid-cols-1 md:grid-cols-3 gap-4 px-5 py-3">
                {/* Expected Today */}
                <div className="bg-[#233648] border border-white/[0.07] rounded-xl p-5 relative overflow-hidden">
                    <div className="absolute right-4 top-4 opacity-10">
                        <Plane className="w-10 h-10 text-[#4A9EFF]" />
                    </div>
                    <p className="text-[11px] text-gray-500 font-medium mb-2">Expected Today</p>
                    <p className="text-4xl font-bold text-white">{stats.expected}</p>
                    <p className="text-[11px] text-gray-500 mt-1">Today&apos;s arrivals</p>
                    <div className="mt-3 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                        <div
                            className="h-full bg-[#4A9EFF] rounded-full"
                            style={{ width: stats.expected > 0 ? `${(stats.completed / stats.expected) * 100}%` : '0%' }}
                        />
                    </div>
                </div>

                {/* Completed Online */}
                <div className="bg-[#233648] border border-white/[0.07] rounded-xl p-5 relative overflow-hidden">
                    <div className="absolute right-4 top-4 opacity-10">
                        <CheckCheck className="w-10 h-10 text-[#1db954]" />
                    </div>
                    <p className="text-[11px] text-gray-500 font-medium mb-2">Currently In-House</p>
                    <p className="text-4xl font-bold text-white">{stats.completed}</p>
                    <p className={cn(
                        "text-[11px] mt-1 flex items-center gap-1",
                        stats.monthlyChange >= 0 ? "text-[#1db954]" : "text-[#e53e3e]"
                    )}>
                        {stats.monthlyChange >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {stats.monthlyChange >= 0 ? '+' : ''}{Math.round(stats.monthlyChange)}% vs monthly avg
                    </p>
                    <div className="mt-3 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-[#1db954] rounded-full transition-all duration-1000" 
                            style={{ width: stats.monthlyAverage > 0 ? `${(stats.completed / stats.monthlyAverage) * 100}%` : '75%' }} 
                        />
                    </div>
                </div>

                {/* Pending Verification */}
                <div className="bg-[#233648] border border-white/[0.07] rounded-xl p-5 relative overflow-hidden">
                    <div className="absolute right-4 top-4 opacity-10">
                        <FileCheck className="w-10 h-10 text-[#d4aa00]" />
                    </div>
                    <p className="text-[11px] text-gray-500 font-medium mb-2">Pending Verification</p>
                    <p className="text-4xl font-bold text-white">{stats.verificationPending}</p>
                    <p className="text-[11px] text-[#d4aa00] mt-1">Requires attention</p>
                    <div className="mt-3 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                        <div className="h-full bg-[#d4aa00] rounded-full"
                            style={{ width: stats.expected > 0 ? `${(stats.verificationPending / stats.expected) * 100}%` : '0%' }}
                        />
                    </div>
                </div>
            </div>

            {/* ===== MAIN CONTENT (guest list + verification panel) ===== */}
            <div className="flex-1 flex flex-col lg:flex-row gap-4 px-5 pb-5 overflow-hidden min-h-0">

                {/* LEFT — Guest List */}
                <div className="flex-1 flex flex-col bg-[#233648] border border-white/[0.07] rounded-xl overflow-hidden min-w-0">

                    {/* Tabs + actions */}
                    <div className="shrink-0 flex items-center justify-between px-4 pt-3 pb-0">
                        <div className="flex bg-[#182433] rounded-lg p-0.5">
                            {(['all', 'pending', 'completed'] as const).map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setFilter(tab)}
                                    className={cn(
                                        'px-4 py-1.5 text-[12px] font-medium rounded-md capitalize transition-all',
                                        filter === tab ? 'bg-white text-black' : 'text-gray-400 hover:text-white'
                                    )}
                                >
                                    {tab === 'all' ? 'All Guests' : tab === 'pending' ? 'Pending Check-in' : 'Checked In'}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-2">
                            {selected.size > 0 && (
                                <span className="text-[12px] text-gray-400 font-medium">{selected.size} Selected</span>
                            )}
                            <button
                                onClick={() => handleWhatsApp()}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 text-[#25D366] text-[11px] font-semibold rounded-lg transition-colors"
                            >
                                <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                            </button>
                            <button
                                onClick={() => handleSendLink()}
                                disabled={isSending}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#4A9EFF] hover:bg-[#3A8EEF] text-white text-[11px] font-semibold rounded-lg transition-colors disabled:opacity-50"
                            >
                                <Send className="w-3.5 h-3.5" />
                                {isSending ? 'Sending...' : 'Send Link'}
                            </button>
                            <button
                                onClick={() => fetchData()}
                                className="p-1.5 hover:bg-white/[0.06] rounded-lg transition-colors"
                                title="Refresh"
                            >
                                <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
                            </button>
                        </div>
                    </div>

                    {/* Table header */}
                    <div className="shrink-0 grid grid-cols-[2rem_1fr_1fr_1fr_1fr] gap-3 px-4 py-2.5 border-b border-white/[0.06] mt-3">
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                checked={selected.size === filtered.length && filtered.length > 0}
                                onChange={handleSelectAll}
                                className="w-3.5 h-3.5 accent-[#4A9EFF] cursor-pointer"
                            />
                        </div>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Guest & Res ID</span>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Arrival</span>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Channel</span>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Link Status</span>
                    </div>

                    {/* Table rows */}
                    <div className="flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center h-40">
                                <div className="w-6 h-6 border-2 border-[#4A9EFF] border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-40 gap-2">
                                <User className="w-8 h-8 text-gray-600" />
                                <p className="text-[12px] text-gray-500">No guests found</p>
                            </div>
                        ) : (
                            filtered.map(booking => {
                                const isActive = activeGuest?.id === booking.id
                                const isChecked = selected.has(booking.id)
                                const statusCfg = CHECKIN_STATUS_CONFIG[booking.checkInStatus] || CHECKIN_STATUS_CONFIG['PENDING']
                                const avatar = getAvatarColor(booking.guestName)

                                return (
                                    <div
                                        key={booking.id}
                                        onClick={() => setActiveGuest(booking)}
                                        className={cn(
                                            'grid grid-cols-[2rem_1fr_1fr_1fr_1fr] gap-3 px-4 py-3.5 border-b border-white/[0.04] cursor-pointer transition-colors hover:bg-white/[0.03]',
                                            isActive && 'bg-[#4A9EFF]/5 border-l-2 border-l-[#4A9EFF]'
                                        )}
                                    >
                                        {/* Checkbox */}
                                        <div className="flex items-center" onClick={e => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => handleSelect(booking.id)}
                                                className="w-3.5 h-3.5 accent-[#4A9EFF] cursor-pointer"
                                            />
                                        </div>

                                        {/* Guest & Res ID */}
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <Avatar name={booking.guestName} size="sm" />
                                            <div className="min-w-0">
                                                <p className="text-[13px] font-semibold text-white truncate">{booking.guestName}</p>
                                                <p className="text-[10px] text-gray-500">{booking.resId}</p>
                                            </div>
                                        </div>

                                        {/* Arrival */}
                                        <div className="flex flex-col justify-center">
                                            <p className="text-[12px] text-white">
                                                {formatArrival(booking)}
                                            </p>
                                        </div>

                                        {/* Channel */}
                                        <div className="flex items-center">
                                            <span className="px-2 py-1 bg-[#182433] text-[11px] text-gray-300 rounded-md font-medium border border-white/[0.06]">
                                                {SOURCE_LABELS[booking.source] || booking.source}
                                            </span>
                                        </div>

                                        {/* Link Status */}
                                        <div className="flex items-center gap-1.5">
                                            <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', statusCfg.dot)} />
                                            <span className={cn('text-[11px] font-medium', statusCfg.color)}>{statusCfg.label}</span>
                                            {booking.checkInStatus === 'LINK_SENT' && (
                                                <span className="text-[9px] text-gray-600 ml-1">2m ago</span>
                                            )}
                                            {booking.checkInStatus === 'PENDING' && (
                                                <button
                                                    onClick={e => { e.stopPropagation(); handleSendLink([booking.id]) }}
                                                    className="ml-auto opacity-0 group-hover:opacity-100 text-[10px] text-[#4A9EFF] hover:underline"
                                                >
                                                    Send
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>

                {/* RIGHT — Verification Panel */}
                <div className="w-full lg:w-[340px] shrink-0 flex flex-col gap-3">
                    {activeGuest ? (
                        <div className="flex-1 bg-[#233648] border border-white/[0.07] rounded-xl flex flex-col overflow-hidden">
                            {/* Panel header */}
                            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] shrink-0">
                                <h3 className="text-[13px] font-semibold text-white">Verification Needed</h3>
                                <button
                                    onClick={() => setActiveGuest(null)}
                                    className="p-1 hover:bg-white/[0.06] rounded-lg transition-colors"
                                >
                                    <X className="w-4 h-4 text-gray-500" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-5 space-y-5">
                                {/* Guest identity */}
                                <div className="flex items-center gap-3">
                                    <Avatar name={activeGuest.guestName} size="lg" />
                                    <div>
                                        <p className="text-[15px] font-bold text-white">{activeGuest.guestName}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="px-2 py-0.5 bg-[#182433] text-[11px] text-gray-300 rounded-md border border-white/[0.06]">
                                                {activeGuest.roomType || 'Standard Room'}
                                            </span>
                                            <span className="text-[11px] text-gray-500">
                                                {SOURCE_LABELS[activeGuest.source] || activeGuest.source}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Booking details */}
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="p-3 bg-[#182433] rounded-lg">
                                        <p className="text-[9px] text-gray-500 uppercase font-bold mb-1">Room</p>
                                        <p className="text-[13px] font-semibold text-white">{activeGuest.roomNumber}</p>
                                    </div>
                                    <div className="p-3 bg-[#182433] rounded-lg">
                                        <p className="text-[9px] text-gray-500 uppercase font-bold mb-1">Res ID</p>
                                        <p className="text-[13px] font-semibold text-white">{activeGuest.resId}</p>
                                    </div>
                                    <div className="p-3 bg-[#182433] rounded-lg">
                                        <p className="text-[9px] text-gray-500 uppercase font-bold mb-1">Check-in</p>
                                        <p className="text-[12px] font-medium text-white">{format(new Date(activeGuest.checkIn), 'dd MMM yyyy')}</p>
                                    </div>
                                    <div className="p-3 bg-[#182433] rounded-lg">
                                        <p className="text-[9px] text-gray-500 uppercase font-bold mb-1">Check-out</p>
                                        <p className="text-[12px] font-medium text-white">{format(new Date(activeGuest.checkOut), 'dd MMM yyyy')}</p>
                                    </div>
                                </div>

                                {/* ID Document — CLICKABLE UPLOAD */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-[12px] font-semibold text-white">Passport / ID Upload</p>
                                        {(activeGuest.idDocumentFront || activeGuest.idDocumentBack) ? (
                                            <span className="flex items-center gap-1 text-[10px] text-[#1db954] font-medium">
                                                <CheckCircle2 className="w-3 h-3" /> Uploaded
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-[10px] text-[#d4aa00] font-medium">
                                                <AlertCircle className="w-3 h-3" /> Awaiting
                                            </span>
                                        )}
                                    </div>

                                    {/* Front Doc */}
                                    <div
                                        onClick={() => frontRef.current?.click()}
                                        className="w-full h-36 bg-[#182433] rounded-xl flex items-center justify-center overflow-hidden border border-white/[0.06] hover:border-[#4A9EFF]/40 cursor-pointer transition-colors group relative mb-2"
                                    >
                                        {uploading === 'front' ? (
                                            <div className="flex flex-col items-center gap-2">
                                                <Loader2 className="w-5 h-5 text-[#4A9EFF] animate-spin" />
                                                <span className="text-[10px] text-gray-400">Uploading...</span>
                                            </div>
                                        ) : activeGuest.idDocumentFront ? (
                                            <>
                                                <img src={activeGuest.idDocumentFront} alt="ID Front" className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                                                    <Upload className="w-5 h-5 text-white" />
                                                    <span className="text-[10px] text-white">Replace Front</span>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-center gap-2 text-center px-4">
                                                <Upload className="w-6 h-6 text-gray-600 group-hover:text-[#4A9EFF] transition-colors" />
                                                <p className="text-[11px] text-gray-500 group-hover:text-gray-300 transition-colors">Upload ID Front</p>
                                                <p className="text-[9px] text-gray-600">Click to upload passport / Aadhaar / License</p>
                                            </div>
                                        )}
                                    </div>
                                    <input ref={frontRef} type="file" accept="image/*,application/pdf" className="hidden"
                                        onChange={e => { if (e.target.files?.[0]) handleDocUpload('front', e.target.files[0]) }} />

                                    {/* Back Doc */}
                                    <div
                                        onClick={() => backRef.current?.click()}
                                        className="w-full h-24 bg-[#182433] rounded-xl flex items-center justify-center overflow-hidden border border-white/[0.06] hover:border-[#4A9EFF]/40 cursor-pointer transition-colors group relative"
                                    >
                                        {uploading === 'back' ? (
                                            <div className="flex flex-col items-center gap-2">
                                                <Loader2 className="w-4 h-4 text-[#4A9EFF] animate-spin" />
                                                <span className="text-[10px] text-gray-400">Uploading...</span>
                                            </div>
                                        ) : activeGuest.idDocumentBack ? (
                                            <>
                                                <img src={activeGuest.idDocumentBack} alt="ID Back" className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                                    <Upload className="w-4 h-4 text-white" />
                                                    <span className="text-[10px] text-white">Replace Back</span>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex items-center gap-2 text-center px-4">
                                                <Upload className="w-4 h-4 text-gray-600 group-hover:text-[#4A9EFF] transition-colors" />
                                                <span className="text-[11px] text-gray-500 group-hover:text-gray-300 transition-colors">Upload ID Back (optional)</span>
                                            </div>
                                        )}
                                    </div>
                                    <input ref={backRef} type="file" accept="image/*,application/pdf" className="hidden"
                                        onChange={e => { if (e.target.files?.[0]) handleDocUpload('back', e.target.files[0]) }} />

                                    {/* Mark verified */}
                                    {(activeGuest.idDocumentFront) &&
                                        activeGuest.checkInStatus !== 'VERIFIED' && (
                                            <button
                                                onClick={handleMarkVerified}
                                                className="mt-3 w-full flex items-center justify-center gap-2 py-2 bg-[#1db954]/10 hover:bg-[#1db954]/20 text-[#1db954] text-[11px] font-semibold rounded-lg border border-[#1db954]/20 transition-colors"
                                            >
                                                <FileCheck className="w-3.5 h-3.5" /> Mark as Verified
                                            </button>
                                        )}
                                    {activeGuest.checkInStatus === 'VERIFIED' && (
                                        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[#1db954]">
                                            <CheckCircle2 className="w-3.5 h-3.5" /> Documents verified
                                        </div>
                                    )}

                                    {activeGuest.idType && (
                                        <p className="text-[10px] text-gray-500 mt-1 ml-1">
                                            {activeGuest.idType} · {activeGuest.idNumber || '—'}
                                        </p>
                                    )}
                                </div>

                                {/* Digital Signature placeholder */}
                                <div>
                                    <p className="text-[12px] font-semibold text-white mb-2">Digital Signature</p>
                                    <div className="w-full h-20 bg-[#182433] rounded-xl flex items-center justify-center border border-white/[0.06] overflow-hidden">
                                        {activeGuest.checkInStatus === 'COMPLETED' || activeGuest.checkInStatus === 'VERIFIED' ? (
                                            <div className="flex items-center gap-2 text-[#1db954]">
                                                <CheckCircle2 className="w-5 h-5" />
                                                <span className="text-[12px] font-medium">Signature captured</span>
                                            </div>
                                        ) : (
                                            <p className="text-[11px] text-gray-600">Awaiting guest signature</p>
                                        )}
                                    </div>
                                </div>

                                {/* Guest contact */}
                                {activeGuest.guestPhone && (
                                    <div className="flex items-center justify-between p-3 bg-[#182433] rounded-lg">
                                        <div className="flex-1">
                                            <p className="text-[9px] text-gray-500 uppercase font-bold mb-0.5">Contact</p>
                                            <p className="text-[12px] text-white truncate mr-2">{activeGuest.guestPhone}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleWhatsApp([activeGuest.id])}
                                                className="p-1.5 hover:bg-[#25D366]/10 text-[#25D366] rounded-lg border border-white/[0.05] transition-colors"
                                                title="Send WhatsApp"
                                            >
                                                <MessageSquare className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => handleSendLink([activeGuest.id])}
                                                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#4A9EFF]/10 hover:bg-[#4A9EFF]/20 text-[#4A9EFF] text-[11px] font-medium rounded-lg border border-[#4A9EFF]/20 transition-colors"
                                            >
                                                <Send className="w-3 h-3" /> Link
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Action buttons */}
                            <div className="shrink-0 p-4 border-t border-white/[0.06] space-y-2">
                                {activeGuest.status === 'RESERVED' ? (
                                    <button
                                        disabled={isApproving}
                                        onClick={handleApprove}
                                        className="w-full flex items-center justify-center gap-2 py-3 bg-[#1db954] hover:bg-[#17a349] text-white text-[13px] font-bold rounded-xl transition-colors disabled:opacity-50"
                                    >
                                        <CheckCircle2 className="w-4 h-4" />
                                        {isApproving ? 'Approving...' : 'Approve Check-in'}
                                    </button>
                                ) : (
                                    <div className="w-full flex items-center justify-center gap-2 py-3 bg-[#1db954]/10 text-[#1db954] text-[13px] font-bold rounded-xl border border-[#1db954]/20">
                                        <CheckCircle2 className="w-4 h-4" />
                                        Already Checked In
                                    </div>
                                )}

                                {activeGuest.status === 'RESERVED' && (
                                    <button
                                        onClick={() => handleSendLink([activeGuest.id])}
                                        disabled={isSending}
                                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 text-[12px] font-medium rounded-xl border border-white/[0.06] transition-colors"
                                    >
                                        <Send className="w-3.5 h-3.5" />
                                        {isSending ? 'Sending...' : 'Send Verification Link'}
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 bg-[#233648] border border-white/[0.07] rounded-xl flex flex-col items-center justify-center gap-3 p-8">
                            <div className="w-12 h-12 rounded-full bg-[#182433] flex items-center justify-center">
                                <User className="w-6 h-6 text-gray-600" />
                            </div>
                            <p className="text-[13px] font-medium text-gray-400 text-center">
                                Select a guest from the list to view their verification details
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* ===== SUCCESS TOAST STRIP ===== */}
            {successMsg && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 px-5 py-3.5 bg-[#233648] border border-[#1db954]/30 rounded-2xl shadow-2xl z-50 animate-fade-in max-w-md">
                    <div className="w-8 h-8 rounded-full bg-[#1db954]/10 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-4 h-4 text-[#1db954]" />
                    </div>
                    <div>
                        <p className="text-[13px] font-bold text-white">Check-in Completed</p>
                        <p className="text-[11px] text-gray-400">{successMsg}</p>
                    </div>
                    <button onClick={() => setSuccessMsg(null)} className="ml-2 text-gray-500 hover:text-white">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    )
}

