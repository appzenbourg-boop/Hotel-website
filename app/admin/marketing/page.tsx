'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import {
    Search, Send, MessageSquare, Mail, Users,
    CheckSquare, Square, Filter, RefreshCw,
    Phone, User, ChevronDown, X, Loader2, Check
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { getAdminContext } from '@/lib/admin-context'

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
    { id: 'ALL',      label: 'All Guests',         filter: (_: Guest) => true },
    { id: 'REPEAT',   label: 'Repeat Guests (2+)', filter: (g: Guest) => g.totalStays >= 2 },
    { id: 'VIP',      label: 'VIP (5+ stays)',      filter: (g: Guest) => g.totalStays >= 5 },
    { id: 'CHECKEDIN',label: 'Currently In-House',  filter: (g: Guest) => g.status === 'CHECKED_IN' },
    { id: 'DIRECT',   label: 'Direct Bookings',     filter: (g: Guest) => g.source === 'DIRECT' || g.source === 'WALK_IN' },
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
    const [message, setMessage] = useState('')
    const [channel, setChannel] = useState<'WHATSAPP' | 'SMS'>('WHATSAPP')
    const [sending, setSending] = useState(false)
    const [sentCount, setSentCount] = useState<number | null>(null)

    const propertyId = session?.user?.role === 'SUPER_ADMIN'
        ? getAdminContext().propertyId
        : session?.user?.propertyId

    // Fetch all guests of this hotel
    const fetchGuests = async () => {
        if (!propertyId) return
        setLoading(true)
        try {
            const res = await fetch(`/api/admin/guests?propertyId=${propertyId}&limit=200`)
            const json = await res.json()
            const data: Guest[] = Array.isArray(json) ? json : (json?.data ?? [])
            setGuests(data)
        } catch {
            toast.error('Failed to load guests')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (session) fetchGuests()
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

    // Send messages
    const handleSend = async () => {
        if (selected.size === 0) { toast.error('Select at least one guest'); return }
        if (!message.trim()) { toast.error('Write a message first'); return }

        const targets = guests.filter(g => selected.has(g.id))

        if (channel === 'WHATSAPP') {
            // Open WhatsApp for each selected guest (browser-based)
            let opened = 0
            for (const g of targets) {
                const clean = g.phone.replace(/\D/g, '')
                const num = clean.length === 10 ? `91${clean}` : clean
                if (!num) continue
                const url = `https://wa.me/${num}?text=${encodeURIComponent(message)}`
                setTimeout(() => window.open(url, '_blank'), opened * 600)
                opened++
            }
            toast.success(`Opening WhatsApp for ${opened} guest${opened !== 1 ? 's' : ''}`)
            setSentCount(opened)
        } else {
            // SMS via backend
            setSending(true)
            try {
                const res = await fetch('/api/admin/marketing', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'BLAST',
                        channel: 'SMS',
                        name: `Campaign ${new Date().toLocaleDateString('en-IN')}`,
                        segment: SEGMENTS.find(s => s.id === segment)?.label ?? 'Custom',
                        propertyId,
                        guestIds: Array.from(selected),
                        message,
                    }),
                })
                const data = await res.json()
                if (data.success) {
                    toast.success(`SMS sent to ${data.count} guest${data.count !== 1 ? 's' : ''}`)
                    setSentCount(data.count)
                } else {
                    toast.error(data.error ?? 'Failed to send')
                }
            } catch {
                toast.error('Connection error')
            } finally {
                setSending(false)
            }
        }
    }

    const clearSelection = () => {
        setSelected(new Set())
        setMessage('')
        setSentCount(null)
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Marketing</h1>
                    <p className="text-text-secondary text-sm mt-0.5">
                        Select guests and send them a message via WhatsApp or SMS
                    </p>
                </div>
                <button onClick={fetchGuests} className="p-2 bg-surface-light border border-border rounded-xl text-text-secondary hover:text-white transition-all" title="Refresh">
                    <RefreshCw className="w-4 h-4" />
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr,380px] gap-6">
                {/* ── LEFT: Guest List ── */}
                <div className="bg-surface border border-border rounded-2xl overflow-hidden flex flex-col">
                    {/* Filters */}
                    <div className="p-4 border-b border-border space-y-3">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search by name, email or phone..."
                                className="w-full pl-9 pr-4 py-2.5 bg-surface-light border border-border rounded-xl text-sm text-white placeholder:text-text-tertiary focus:ring-1 focus:ring-primary outline-none"
                            />
                        </div>

                        {/* Segment pills */}
                        <div className="flex gap-2 flex-wrap">
                            {SEGMENTS.map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => { setSegment(s.id); setSelected(new Set()) }}
                                    className={cn(
                                        'px-3 py-1.5 rounded-xl text-xs font-medium transition-all border',
                                        segment === s.id
                                            ? 'bg-primary text-white border-primary'
                                            : 'bg-surface-light text-text-secondary border-border hover:text-white'
                                    )}
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>

                        {/* Select all bar */}
                        <div className="flex items-center justify-between">
                            <button onClick={toggleAll} className="flex items-center gap-2 text-xs font-medium text-text-secondary hover:text-white transition-colors">
                                {allSelected
                                    ? <CheckSquare className="w-4 h-4 text-primary" />
                                    : <Square className="w-4 h-4" />}
                                {allSelected ? 'Deselect all' : `Select all ${filtered.length}`}
                            </button>
                            {selected.size > 0 && (
                                <span className="text-xs font-semibold text-primary">
                                    {selected.size} selected
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Guest rows */}
                    <div className="flex-1 overflow-y-auto divide-y divide-border">
                        {loading ? (
                            <div className="flex items-center justify-center py-16">
                                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-text-tertiary">
                                <Users className="w-8 h-8 mb-3 opacity-40" />
                                <p className="text-sm">No guests found</p>
                            </div>
                        ) : (
                            filtered.map(guest => {
                                const isSelected = selected.has(guest.id)
                                return (
                                    <div
                                        key={guest.id}
                                        onClick={() => toggleOne(guest.id)}
                                        className={cn(
                                            'flex items-center gap-4 px-4 py-3.5 cursor-pointer transition-colors',
                                            isSelected ? 'bg-primary/5' : 'hover:bg-surface-light'
                                        )}
                                    >
                                        {/* Checkbox */}
                                        <div className={cn(
                                            'w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all',
                                            isSelected ? 'bg-primary border-primary' : 'border-border'
                                        )}>
                                            {isSelected && <Check className="w-3 h-3 text-white" />}
                                        </div>

                                        {/* Avatar */}
                                        <div className="w-9 h-9 rounded-full bg-surface-light border border-border flex items-center justify-center shrink-0 text-sm font-bold text-text-secondary">
                                            {guest.name.charAt(0).toUpperCase()}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-white truncate">{guest.name}</p>
                                            <div className="flex items-center gap-3 mt-0.5">
                                                <span className="text-[11px] text-text-tertiary flex items-center gap-1">
                                                    <Phone className="w-3 h-3" />{guest.phone}
                                                </span>
                                                {guest.email && (
                                                    <span className="text-[11px] text-text-tertiary truncate hidden sm:flex items-center gap-1">
                                                        <Mail className="w-3 h-3" />{guest.email}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Stays badge */}
                                        <div className="shrink-0 text-right">
                                            <span className={cn(
                                                'text-[10px] font-bold px-2 py-0.5 rounded-full border',
                                                guest.totalStays >= 5 ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                                guest.totalStays >= 2 ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                'bg-surface-light text-text-tertiary border-border'
                                            )}>
                                                {guest.totalStays} stay{guest.totalStays !== 1 ? 's' : ''}
                                            </span>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>

                    {/* Footer count */}
                    <div className="px-4 py-3 border-t border-border bg-surface-light">
                        <p className="text-xs text-text-tertiary">
                            Showing {filtered.length} of {guests.length} guests
                        </p>
                    </div>
                </div>

                {/* ── RIGHT: Message Composer ── */}
                <div className="space-y-4">
                    <div className="bg-surface border border-border rounded-2xl p-5 space-y-5">
                        <h3 className="text-base font-semibold text-white">Compose Message</h3>

                        {/* Channel selector */}
                        <div>
                            <label className="text-xs font-semibold text-text-secondary block mb-2">Send via</label>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { id: 'WHATSAPP', label: 'WhatsApp', icon: MessageSquare, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
                                    { id: 'SMS',      label: 'SMS',       icon: Phone,         color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/30' },
                                ].map(c => (
                                    <button
                                        key={c.id}
                                        onClick={() => setChannel(c.id as any)}
                                        className={cn(
                                            'flex items-center gap-2.5 p-3 rounded-xl border transition-all',
                                            channel === c.id
                                                ? `${c.bg} ${c.border} ${c.color}`
                                                : 'bg-surface-light border-border text-text-secondary hover:text-white'
                                        )}
                                    >
                                        <c.icon className="w-4 h-4" />
                                        <span className="text-sm font-semibold">{c.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Message */}
                        <div>
                            <label className="text-xs font-semibold text-text-secondary block mb-2">Message</label>
                            <textarea
                                rows={5}
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                                placeholder={`Hi {guest_name}, we have a special offer for you at our hotel! Use code SAVE20 for 20% off your next stay. Book now at...`}
                                className="w-full bg-surface-light border border-border rounded-xl px-4 py-3 text-sm text-white placeholder:text-text-tertiary focus:ring-1 focus:ring-primary outline-none resize-none"
                            />
                            <p className="text-[11px] text-text-tertiary mt-1.5">{message.length} characters</p>
                        </div>

                        {/* Quick templates */}
                        <div>
                            <label className="text-xs font-semibold text-text-secondary block mb-2">Quick Templates</label>
                            <div className="space-y-2">
                                {[
                                    { label: 'Special Offer', text: 'Hi! We have an exclusive offer for you. Use code SAVE20 for 20% off your next stay. Book directly at our hotel for the best rates!' },
                                    { label: 'Seasonal Greetings', text: 'Wishing you a wonderful season! As a valued guest, enjoy special rates on your next visit. We look forward to welcoming you back.' },
                                    { label: 'Feedback Request', text: 'Thank you for staying with us! We would love to hear about your experience. Your feedback helps us serve you better.' },
                                ].map(t => (
                                    <button
                                        key={t.label}
                                        onClick={() => setMessage(t.text)}
                                        className="w-full text-left px-3 py-2 bg-surface-light border border-border rounded-xl text-xs text-text-secondary hover:text-white hover:border-primary/40 transition-all"
                                    >
                                        <span className="font-semibold text-text-primary">{t.label}</span>
                                        <span className="text-text-tertiary ml-2 line-clamp-1">{t.text.slice(0, 50)}…</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Send button */}
                        <button
                            onClick={handleSend}
                            disabled={sending || selected.size === 0 || !message.trim()}
                            className={cn(
                                'w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all',
                                selected.size > 0 && message.trim()
                                    ? 'bg-primary hover:bg-primary/90 text-white active:scale-95'
                                    : 'bg-surface-light text-text-tertiary cursor-not-allowed border border-border'
                            )}
                        >
                            {sending ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                            ) : (
                                <><Send className="w-4 h-4" />
                                    {selected.size > 0
                                        ? `Send to ${selected.size} guest${selected.size !== 1 ? 's' : ''} via ${channel === 'WHATSAPP' ? 'WhatsApp' : 'SMS'}`
                                        : 'Select guests to send'
                                    }
                                </>
                            )}
                        </button>

                        {/* Success state */}
                        {sentCount !== null && (
                            <div className="flex items-center justify-between p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                                <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
                                    <Check className="w-4 h-4" />
                                    Sent to {sentCount} guest{sentCount !== 1 ? 's' : ''}
                                </div>
                                <button onClick={clearSelection} className="text-xs text-text-tertiary hover:text-white transition-colors">
                                    Clear
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Info box */}
                    <div className="bg-amber-500/5 border border-amber-500/15 rounded-2xl p-4">
                        <p className="text-xs text-amber-400 font-semibold mb-1">How it works</p>
                        <ul className="text-xs text-text-secondary space-y-1">
                            <li>• <strong className="text-white">WhatsApp</strong> — opens WhatsApp web for each guest. Works without Twilio.</li>
                            <li>• <strong className="text-white">SMS</strong> — sends via Twilio. Requires TWILIO credentials in .env.</li>
                            <li>• Select guests using the checkboxes on the left.</li>
                            <li>• Use segment filters to target specific groups.</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    )
}
