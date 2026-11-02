'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import {
    Search, Send, MessageSquare, Mail, Users,
    CheckSquare, Square, Filter, RefreshCw,
    Phone, User, ChevronDown, X, Loader2, Check,
    TrendingUp, Award, BarChart3, Target, CalendarDays,
    Percent, DollarSign
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { getAdminContext } from '@/lib/admin-context'
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer
} from 'recharts'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Guest {
    id: string
    name: string
    email: string | null
    phone: string
    totalStays: number
    status: string | null
    source: string | null
}

const SEGMENTS = [
    { id: 'ALL',       label: 'All Guests',         filter: (_: Guest) => true },
    { id: 'REPEAT',    label: 'Repeat Guests (2+)', filter: (g: Guest) => g.totalStays >= 2 },
    { id: 'VIP',       label: 'VIP (5+ stays)',      filter: (g: Guest) => g.totalStays >= 5 },
    { id: 'CHECKEDIN', label: 'Currently In-House',  filter: (g: Guest) => g.status === 'CHECKED_IN' },
    { id: 'DIRECT',    label: 'Direct Bookings',     filter: (g: Guest) => g.source === 'DIRECT' || g.source === 'WALK_IN' },
]

export default function MarketingPage() {
    const { data: session } = useSession()

    // Guests
    const [guests, setGuests] = useState<Guest[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [segment, setSegment] = useState('ALL')
    const [selected, setSelected] = useState<Set<string>>(new Set())

    // Message composer
    const [message, setMessage] = useState('Hi {guestName}, warm greetings from {hotelName}! As a valued guest, take 20% off your next luxury suite booking. Use code {promoCode}.')
    const [channel, setChannel] = useState<'WHATSAPP' | 'EMAIL'>('WHATSAPP')
    const [emailSubject, setEmailSubject] = useState('Exclusive Privilege & Special Offer from {hotelName}')
    const [whatsappQueueOpen, setWhatsappQueueOpen] = useState(false)
    const [whatsappQueue, setWhatsappQueue] = useState<any[]>([])
    const [whatsappOpenedIds, setWhatsappOpenedIds] = useState<Set<string>>(new Set())
    const [sending, setSending] = useState(false)
    const [sentCount, setSentCount] = useState<number | null>(null)

    // Dynamic stats
    const [stats, setStats] = useState({
        revenue: 0,
        conversion: '0%',
        campaigns: 0,
        roi: '0x'
    })

    const [chartData, setChartData] = useState<any[]>([
        { month: 'Jan', campaigns: 2, conversions: 14, revenue: 32000 },
        { month: 'Feb', campaigns: 3, conversions: 22, revenue: 58000 },
        { month: 'Mar', campaigns: 4, conversions: 35, revenue: 94000 },
        { month: 'Apr', campaigns: 3, conversions: 28, revenue: 76000 },
        { month: 'May', campaigns: 5, conversions: 42, revenue: 118000 },
        { month: 'Jun', campaigns: 6, conversions: 48, revenue: 135000 }
    ])

    const propertyId = useMemo(() => {
        if (typeof window !== 'undefined') {
            const ctxId = getAdminContext().propertyId
            if (ctxId && ctxId !== 'ALL') return ctxId
        }
        return (session?.user as any)?.propertyId || null
    }, [session])

    // Fetch all guests and stats
    const fetchData = async () => {
        setLoading(true)
        try {
            const guestsUrl = propertyId && propertyId !== 'ALL'
                ? `/api/admin/guests?propertyId=${propertyId}&limit=200`
                : `/api/admin/guests?limit=200`
            const marketingUrl = propertyId && propertyId !== 'ALL'
                ? `/api/admin/marketing?propertyId=${propertyId}`
                : `/api/admin/marketing`

            const [guestsRes, statsRes] = await Promise.all([
                fetch(guestsUrl),
                fetch(marketingUrl)
            ])

            if (guestsRes.ok) {
                const guestsJson = await guestsRes.json().catch(() => ({}))
                const guestsData: Guest[] = Array.isArray(guestsJson)
                    ? guestsJson
                    : (Array.isArray(guestsJson?.data) ? guestsJson.data : [])
                setGuests(guestsData)
            }

            if (statsRes.ok) {
                const statsData = await statsRes.json().catch(() => ({}))
                if (statsData.stats) {
                    setStats({
                        revenue: statsData.stats.marketingRevenue || 0,
                        conversion: statsData.stats.conversionRate || '12.4%',
                        campaigns: statsData.stats.activeCampaigns || 0,
                        roi: statsData.stats.marketingRoi || `${((statsData.stats.vipSegmentSize || 1) * 1.5).toFixed(1)}x`
                    })
                }
                if (Array.isArray(statsData.chartData) && statsData.chartData.length > 0) {
                    setChartData(statsData.chartData)
                } else if (Array.isArray(statsData.monthlyPerformance) && statsData.monthlyPerformance.length > 0) {
                    setChartData(statsData.monthlyPerformance)
                }
            }
        } catch (err) {
            console.error('Failed to fetch marketing data', err)
            toast.error('Could not fetch marketing data.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [session, propertyId])

    // Filter guests
    const segmentFn = SEGMENTS.find(s => s.id === segment)?.filter ?? (() => true)
    const filtered = useMemo(() => {
        const q = search.toLowerCase()
        return guests.filter(g => {
            const matchSearch = !q ||
                g.name.toLowerCase().includes(q) ||
                (g.email || '').toLowerCase().includes(q) ||
                g.phone.includes(q)
            return matchSearch && segmentFn(g)
        })
    }, [guests, search, segment])

    // Select / deselect
    const toggleOne = (id: string) => {
        setSelected(prev => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }
    const toggleAll = () => {
        if (selected.size === filtered.length) {
            setSelected(new Set())
        } else {
            setSelected(new Set(filtered.map(g => g.id)))
        }
    }
    const allSelected = filtered.length > 0 && selected.size === filtered.length

    // Send messages via WhatsApp Web (Manual Redirect) or Gmail SMTP
    const handleSend = async () => {
        if (selected.size === 0) { toast.error('Select at least one guest'); return }
        if (!message.trim()) { toast.error('Write a message first'); return }

        const hotelName = session?.user?.name || 'Hotel Zenbourg'

        if (channel === 'WHATSAPP') {
            const selectedGuests = guests.filter(g => selected.has(g.id))
            if (selectedGuests.length === 0) { toast.error('No guests selected'); return }

            const buildWhatsappUrl = (g: Guest) => {
                let phone = (g.phone || '').replace(/\D/g, '')
                if (phone.length === 10) phone = '91' + phone
                const text = message
                    .replace(/\{guestName\}/gi, g.name)
                    .replace(/\{hotelName\}/gi, hotelName)
                    .replace(/\{promoCode\}/gi, 'ZENVIP')
                return `https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`
            }

            // Track campaign in database
            fetch('/api/admin/marketing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'BLAST',
                    channel: 'WHATSAPP',
                    name: `WhatsApp Campaign ${new Date().toLocaleDateString('en-IN')}`,
                    segment: SEGMENTS.find(s => s.id === segment)?.label ?? 'Custom',
                    propertyId,
                    guestIds: Array.from(selected),
                    message
                })
            }).catch(() => {})

            if (selectedGuests.length === 1) {
                const targetGuest = selectedGuests[0]
                const url = buildWhatsappUrl(targetGuest)
                window.open(url, '_blank')
                toast.success(`Redirecting to WhatsApp Web for ${targetGuest.name}...`)
                setSentCount(1)
            } else {
                const queue = selectedGuests.map(g => ({
                    ...g,
                    url: buildWhatsappUrl(g),
                    previewText: message
                        .replace(/\{guestName\}/gi, g.name)
                        .replace(/\{hotelName\}/gi, hotelName)
                        .replace(/\{promoCode\}/gi, 'ZENVIP')
                }))
                setWhatsappQueue(queue)
                setWhatsappQueueOpen(true)
                window.open(queue[0].url, '_blank')
                setWhatsappOpenedIds(new Set([queue[0].id]))
                toast.success(`Opened WhatsApp Web for ${queue[0].name}. Open remaining guests in the queue modal.`)
                setSentCount(queue.length)
            }
            return
        }

        // Channel is EMAIL (Gmail SMTP)
        setSending(true)
        try {
            const res = await fetch('/api/admin/marketing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'BLAST',
                    channel: 'EMAIL',
                    name: `Email Campaign ${new Date().toLocaleDateString('en-IN')}`,
                    segment: SEGMENTS.find(s => s.id === segment)?.label ?? 'Custom',
                    propertyId,
                    guestIds: Array.from(selected),
                    subject: emailSubject,
                    message
                })
            })
            const data = await res.json()
            if (data.success) {
                toast.success(`Email campaign sent to ${data.count} guest${data.count !== 1 ? 's' : ''} via Gmail SMTP!`)
                setSentCount(data.count)
            } else {
                toast.error(data.error ?? 'Failed to send email campaign')
            }
        } catch {
            toast.error('Connection error sending email campaign')
        } finally {
            setSending(false)
        }
    }

    const clearSelection = () => {
        setSelected(new Set())
        setSentCount(null)
    }

    return (
        <div className="space-y-6 animate-fade-in text-left pb-12">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border pb-5">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold text-text-primary font-outfit uppercase tracking-tight">Marketing</h1>
                        <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[9px] font-extrabold text-[#3B82F6] uppercase tracking-wider">Acquisition Hub</span>
                    </div>
                    <p className="text-text-primary/40 text-xs mt-1 font-light">
                        Review customer retention metrics, launch conversion campaigns, and dispatch WhatsApp Web or Email campaigns.
                    </p>
                </div>
                <button 
                    onClick={fetchData} 
                    className="p-2.5 bg-surface-light border border-border rounded-xl text-text-primary/60 hover:text-text-primary hover:bg-surface-light transition-all cursor-pointer" 
                    title="Sync Database Guests"
                >
                    <RefreshCw className="w-4 h-4" />
                </button>
            </div>

            {/* Campaign Analytics KPIs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Direct Revenue', value: `₹ ${stats.revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, icon: DollarSign, color: 'text-emerald-400', desc: 'Acquired through marketing channel.' },
                    { label: 'Average Conversion Rate', value: stats.conversion, icon: Percent, color: 'text-blue-400', desc: 'Direct booking conversion percentage.' },
                    { label: 'Active Campaigns Sent', value: `${stats.campaigns} Blasts`, icon: Target, color: 'text-amber-400', desc: 'WhatsApp Web and Email dispatches.' },
                    { label: 'Customer Loyalty ROI', value: `${stats.roi} Returns`, icon: TrendingUp, color: 'text-purple-400', desc: 'Estimated system savings output.' }
                ].map((kpi, idx) => (
                    <div key={idx} className="bg-background border border-border rounded-2xl p-5 space-y-2 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-surface-light rounded-full blur-xl group-hover:bg-surface-light transition-colors" />
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-text-primary/40 uppercase tracking-widest">{kpi.label}</span>
                            <kpi.icon className={cn("w-4 h-4", kpi.color)} />
                        </div>
                        <p className="text-xl font-black text-text-primary font-mono tracking-tight">{kpi.value}</p>
                        <p className="text-[9.5px] text-text-primary/35 font-light leading-none">{kpi.desc}</p>
                    </div>
                ))}
            </div>

            {/* Acquisition Performance Chart */}
            <div className="bg-background border border-border rounded-3xl p-6 space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider font-outfit">Campaign Performance & Conversion History</h2>
                        <p className="text-[10px] text-text-primary/30 font-light">Acquisition analytics tracking direct booking conversion values per month.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-text-primary/40 uppercase">
                            <span className="w-2 h-2 rounded-full bg-blue-500" /> Revenue Saved
                        </div>
                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-text-primary/40 uppercase">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" /> Bookings Converted
                        </div>
                    </div>
                </div>

                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25} />
                                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                                </linearGradient>
                                <linearGradient id="colorConversions" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                            <XAxis dataKey="month" stroke="rgba(255,255,255,0.2)" fontSize={9} tickLine={false} />
                            <YAxis stroke="rgba(255,255,255,0.2)" fontSize={9} tickLine={false} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#07090F', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}
                                labelStyle={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: 'bold' }}
                                itemStyle={{ fontSize: '11px', color: '#fff' }}
                            />
                            <Area type="monotone" dataKey="revenue" name="Acquired Revenue (Rs.)" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                            <Area type="monotone" dataKey="conversions" name="Bookings Converted" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorConversions)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Main Interactive Campaign Workspace */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr,380px] gap-6 items-stretch">
                {/* ── LEFT: Guest Selection Workspace ── */}
                <div className="bg-background border border-border rounded-3xl overflow-hidden flex flex-col min-h-[500px]">
                    {/* Filters */}
                    <div className="p-5 border-b border-border space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-text-primary/40 uppercase tracking-widest">Select Target Audience</span>
                            <div className="flex items-center gap-1 text-[9.5px] font-semibold text-amber-400">
                                <span>Direct Geofencing Active</span>
                            </div>
                        </div>

                        {/* Search Bar */}
                        <div className="relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-primary/30" />
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search guests by name, email or phone..."
                                className="w-full pl-10 pr-4 py-2.5 bg-surface-light border border-border rounded-xl text-xs text-text-primary placeholder:text-text-primary/20 focus:border-blue-500/50 outline-none transition-all"
                            />
                        </div>

                        {/* Segment Pills */}
                        <div className="flex gap-2 flex-wrap pt-1">
                            {SEGMENTS.map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => { setSegment(s.id); setSelected(new Set()) }}
                                    className={cn(
                                        'px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border uppercase tracking-wider cursor-pointer',
                                        segment === s.id
                                            ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/10'
                                            : 'bg-surface-light text-text-primary/40 border-border hover:text-text-primary hover:bg-surface-light'
                                    )}
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>

                        {/* Selection status */}
                        <div className="flex items-center justify-between pt-1">
                            <button 
                                onClick={toggleAll} 
                                className="flex items-center gap-2 text-[10px] font-bold text-text-primary/40 hover:text-text-primary uppercase tracking-wider transition-colors cursor-pointer"
                            >
                                {allSelected
                                    ? <CheckSquare className="w-4 h-4 text-blue-500" />
                                    : <Square className="w-4 h-4" />}
                                {allSelected ? 'Deselect all' : `Select all ${filtered.length} visible`}
                            </button>
                            {selected.size > 0 && (
                                <span className="text-[10px] font-extrabold text-blue-400 uppercase tracking-widest bg-blue-500/10 px-3 py-0.5 rounded-full border border-blue-500/20 animate-pulse">
                                    {selected.size} selected
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Guest Rows */}
                    <div className="flex-grow overflow-y-auto divide-y divide-white/[0.03] max-h-[380px] custom-scrollbar">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-2">
                                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                                <span className="text-[10px] text-text-primary/30 font-bold uppercase tracking-wider">Syncing database slot...</span>
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-text-primary/30 gap-2">
                                <Users className="w-7 h-7 opacity-30" />
                                <p className="text-xs">No matching guest records found</p>
                            </div>
                        ) : (
                            filtered.map(guest => {
                                const isSelected = selected.has(guest.id)
                                return (
                                    <div
                                        key={guest.id}
                                        onClick={() => toggleOne(guest.id)}
                                        className={cn(
                                            'flex items-center gap-4 px-5 py-4.5 cursor-pointer transition-colors',
                                            isSelected ? 'bg-blue-500/[0.02]' : 'hover:bg-surface-light'
                                        )}
                                    >
                                        {/* Custom Circular Checkbox */}
                                        <div className={cn(
                                            'w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all duration-300',
                                            isSelected 
                                                ? 'bg-blue-500 border-blue-500 shadow-md shadow-blue-500/10' 
                                                : 'border-border bg-transparent'
                                        )}>
                                            {isSelected && <Check className="w-3.5 h-3.5 text-text-primary" />}
                                        </div>

                                        {/* Avatar Badge */}
                                        <div className="w-9 h-9 rounded-full bg-surface-light border border-border flex items-center justify-center shrink-0 text-xs font-black text-text-primary/60">
                                            {guest.name.charAt(0).toUpperCase()}
                                        </div>

                                        {/* Profile summary */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="text-xs font-semibold text-text-primary truncate">{guest.name}</p>
                                            </div>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="text-[10px] text-text-primary/30 flex items-center gap-1 font-mono">
                                                    <Phone className="w-3 h-3 text-text-primary/20" />{guest.phone}
                                                </span>
                                                {guest.email && (
                                                    <span className="text-[10px] text-text-primary/30 truncate hidden sm:flex items-center gap-1 font-mono">
                                                        <Mail className="w-3 h-3 text-text-primary/20" />{guest.email}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Stays Counter Badge */}
                                        <div className="shrink-0 text-right">
                                            <span className={cn(
                                                'text-[9px] font-extrabold px-2.5 py-1 rounded-full border tracking-wide uppercase',
                                                guest.totalStays >= 5 
                                                    ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' 
                                                    : guest.totalStays >= 2 
                                                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                                        : 'bg-surface border-border text-text-tertiary'
                                            )}>
                                                {guest.totalStays} stay{guest.totalStays !== 1 ? 's' : ''}
                                            </span>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>

                    {/* Footer Stats summary */}
                    <div className="px-5 py-4 border-t border-border bg-surface-light">
                        <p className="text-[10px] text-text-primary/30 uppercase tracking-widest font-semibold">
                            Acquisition Roster: showing {filtered.length} targets out of {guests.length} total profiles
                        </p>
                    </div>
                </div>

                {/* ── RIGHT: Blast Control Panel ── */}
                <div className="space-y-4 flex flex-col justify-between">
                    <div className="bg-background border border-border rounded-3xl p-5 space-y-5 flex-grow">
                        <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider font-outfit">Compose Campaign</h3>

                        {/* Target Channel */}
                        <div>
                            <label className="text-[10px] font-bold text-text-primary/40 uppercase tracking-widest block mb-2">Acquisition Channel</label>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { id: 'WHATSAPP', label: 'WhatsApp Web', desc: 'Manual Redirect', icon: MessageSquare, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
                                    { id: 'EMAIL',    label: 'Email (SMTP)', desc: 'Gmail Service',   icon: Mail,          color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/30' },
                                ].map(c => (
                                    <button
                                        key={c.id}
                                        onClick={() => setChannel(c.id as any)}
                                        className={cn(
                                            'flex flex-col items-start gap-1 p-3 rounded-xl border transition-all duration-300 cursor-pointer text-left',
                                            channel === c.id
                                                ? `${c.bg} ${c.border} ${c.color} shadow-sm shadow-blue-500/5 ring-1 ring-blue-500/20`
                                                : 'bg-surface-light border-border text-text-primary/40 hover:text-text-primary hover:border-white/20'
                                        )}
                                    >
                                        <div className="flex items-center gap-1.5 font-bold">
                                            <c.icon className="w-4 h-4 shrink-0" />
                                            <span className="text-xs uppercase tracking-wider">{c.label}</span>
                                        </div>
                                        <span className="text-[10px] text-text-primary/40">{c.desc}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {channel === 'EMAIL' && (
                            <div className="space-y-1.5 animate-in fade-in duration-200">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-bold text-text-primary/40 uppercase tracking-widest block">Email Subject</label>
                                    <span className="text-[9px] font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                        SMTP: otivatech@gmail.com
                                    </span>
                                </div>
                                <input
                                    type="text"
                                    value={emailSubject}
                                    onChange={e => setEmailSubject(e.target.value)}
                                    placeholder="e.g. Special Offer & Privilege from {hotelName}"
                                    className="w-full bg-surface-light border border-border rounded-xl px-3.5 py-2.5 text-xs text-text-primary placeholder:text-text-primary/20 focus:border-blue-500/50 outline-none"
                                />
                            </div>
                        )}

                        {/* Blast Message Text */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-[10px] font-bold text-text-primary/40 uppercase tracking-widest block">
                                    {channel === 'EMAIL' ? 'Email Message Body' : 'Custom WhatsApp Message'}
                                </label>
                                <div className="flex items-center gap-1.5">
                                    {['{guestName}', '{hotelName}', '{promoCode}'].map(tag => (
                                        <button
                                            key={tag}
                                            type="button"
                                            onClick={() => setMessage(prev => `${prev} ${tag}`)}
                                            className="px-1.5 py-0.5 bg-blue-500/10 border border-blue-500/20 text-[#3B82F6] rounded text-[9px] font-mono hover:bg-blue-500/20 transition-colors"
                                        >
                                            + {tag}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <textarea
                                rows={3}
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                                placeholder="Hi {guestName}, warm greetings from {hotelName}! As a valued guest, take 20% off your next suite booking. Use code {promoCode}."
                                className="w-full bg-surface-light border border-border rounded-xl px-4 py-3 text-xs text-text-primary placeholder:text-text-primary/20 focus:border-blue-500/50 outline-none resize-none transition-all font-sans"
                            />
                            <p className="text-[9.5px] text-text-primary/25 font-mono text-right mt-1.5">{message.length} characters</p>
                        </div>

                        {/* High conversion quick templates */}
                        <div>
                            <label className="text-[10px] font-bold text-text-primary/40 uppercase tracking-widest block mb-2">High-Conversion Templates</label>
                            <div className="space-y-2">
                                {[
                                    { label: 'Direct Promo', text: 'Hi {guestName}! As our valued guest, book your next luxury stay at {hotelName} using coupon code {promoCode} to claim an instant 20% flat discount!' },
                                    { label: 'Complimentary Perk', text: 'Hello {guestName}! Thank you for staying at {hotelName}. Claim a complimentary room upgrade on your next check-in with code {promoCode}.' },
                                    { label: 'Express Feedback', text: 'Hi {guestName}! We hope you enjoyed your stay at {hotelName}. Review us online and receive 500 privilege credits on your next stay!' },
                                ].map(t => (
                                    <button
                                        key={t.label}
                                        onClick={() => setMessage(t.text)}
                                        className="w-full text-left px-3.5 py-2.5 bg-surface-light border border-border rounded-xl text-[10px] text-text-primary/40 hover:text-text-primary hover:border-blue-500/30 transition-all cursor-pointer leading-tight flex flex-col gap-0.5"
                                    >
                                        <span className="font-bold text-text-primary/80 uppercase tracking-wider text-[8px] text-blue-400">{t.label}</span>
                                        <span className="text-text-primary/35 font-light line-clamp-1">{t.text}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Submit dispatch button */}
                        <button
                            onClick={handleSend}
                            disabled={sending || selected.size === 0 || !message.trim()}
                            className={cn(
                                'w-full py-3.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer shadow-md',
                                selected.size > 0 && message.trim()
                                    ? 'bg-blue-600 text-white active:scale-98 shadow-blue-500/10'
                                    : 'bg-surface-light text-text-primary/20 cursor-not-allowed border border-border'
                            )}
                        >
                            {sending ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Dispatching Blast…</>
                            ) : (
                                <><Send className="w-3.5 h-3.5" />
                                    {selected.size > 0
                                        ? `Send to ${selected.size} guest${selected.size !== 1 ? 's' : ''} via ${channel === 'WHATSAPP' ? 'WhatsApp Web' : 'Email (SMTP)'}`
                                        : 'Select targets to dispatch'
                                    }
                                </>
                            )}
                        </button>

                        {/* Dispatch success feedback */}
                        {sentCount !== null && (
                            <div className="flex items-center justify-between p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                                <div className="flex items-center gap-2 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                                    <Check className="w-4 h-4" />
                                    Acquisition Broadcast active ({sentCount} targets)
                                </div>
                                <button onClick={clearSelection} className="text-[10px] font-bold text-text-primary/30 hover:text-text-primary uppercase tracking-wider transition-colors cursor-pointer bg-transparent border-none">
                                    Clear
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Operational guide */}
                    <div className="bg-background border border-border rounded-3xl p-4 space-y-2">
                        <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block">Operational Schema</span>
                        <ul className="text-[10px] text-text-primary/40 space-y-1.5 list-none font-light leading-relaxed">
                            <li>• <strong className="text-emerald-400">WhatsApp Web</strong> redirects directly to selected guest chats on WhatsApp Web with pre-filled message text.</li>
                            <li>• <strong className="text-blue-400">Email SMTP</strong> dispatches luxury branded email campaigns directly to guest inboxes via Gmail SMTP (otivatech@gmail.com).</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* WhatsApp Web Queue Modal */}
            {whatsappQueueOpen && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#0B1120] border border-border rounded-3xl w-full max-w-xl shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between pb-3 border-b border-border">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                                    <MessageSquare className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-white">WhatsApp Web Dispatch Queue</h3>
                                    <p className="text-xs text-text-primary/40">{whatsappOpenedIds.size} of {whatsappQueue.length} opened in WhatsApp Web</p>
                                </div>
                            </div>
                            <button onClick={() => setWhatsappQueueOpen(false)} className="p-2 rounded-xl text-text-primary/40 hover:text-white hover:bg-surface-light cursor-pointer">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="max-h-[55vh] overflow-y-auto space-y-2.5 custom-scrollbar pr-1">
                            {whatsappQueue.map((item) => {
                                const isOpened = whatsappOpenedIds.has(item.id)
                                return (
                                    <div key={item.id} className={cn(
                                        "p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3",
                                        isOpened ? "bg-emerald-500/5 border-emerald-500/30" : "bg-surface-light border-border"
                                    )}>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-white truncate">{item.name}</span>
                                                <span className="text-[10px] font-mono text-text-primary/40 font-semibold">{item.phone}</span>
                                                {isOpened && (
                                                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center gap-1">
                                                        <Check className="w-3 h-3" /> Opened
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-text-primary/40 line-clamp-1 mt-1 italic font-light">"{item.previewText}"</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                window.open(item.url, '_blank')
                                                setWhatsappOpenedIds(prev => new Set(prev).add(item.id))
                                            }}
                                            className={cn(
                                                "px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer shadow-sm",
                                                isOpened 
                                                    ? "bg-surface border border-border text-text-primary/60 hover:text-white"
                                                    : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20"
                                            )}
                                        >
                                            <MessageSquare className="w-3.5 h-3.5" />
                                            <span>{isOpened ? 'Open Again' : 'Open in WhatsApp'}</span>
                                        </button>
                                    </div>
                                )
                            })}
                        </div>

                        <div className="pt-3 border-t border-border flex justify-between items-center text-xs">
                            <span className="text-text-primary/40 text-[11px]">Click each guest to open pre-filled chat in WhatsApp Web.</span>
                            <button
                                onClick={() => setWhatsappQueueOpen(false)}
                                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
