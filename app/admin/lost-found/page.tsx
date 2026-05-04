'use client'

import { useState, useMemo, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import {
    Search, Plus, Package, Clock, MapPin, CheckCircle2,
    Trash2, Filter, User, ShieldCheck, Send, X,
    ChevronDown, Camera, Phone, Calendar, ShieldAlert,
    RefreshCw, Tag, MessageSquare
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { toast } from 'sonner'
import { getAdminContext } from '@/lib/admin-context'

const STATUS_STYLE: Record<string, string> = {
    FOUND:    'bg-amber-500/15 text-amber-400 border-amber-500/20',
    CLAIMED:  'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    DISPOSED: 'bg-slate-500/15 text-slate-400 border-slate-500/20',
}

const CATEGORIES = ['ELECTRONICS', 'CLOTHING', 'PERSONAL', 'ID_DOCUMENTS', 'JEWELLERY', 'BAGS', 'OTHER']

export default function LostFoundPage() {
    const { data: session } = useSession()
    const [mounted, setMounted] = useState(false)

    const propertyId = session?.user?.role === 'SUPER_ADMIN'
        ? getAdminContext().propertyId
        : session?.user?.propertyId ?? null

    useEffect(() => { setMounted(true) }, [])

    const [view, setView] = useState<'FOUND' | 'CLAIMED' | 'DISPOSED'>('FOUND')
    const [search, setSearch] = useState('')
    const [categoryFilter, setCategoryFilter] = useState('All')
    const [showForm, setShowForm] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [claiming, setClaiming] = useState<string | null>(null)

    const [items, setItems] = useState<any[]>([])
    const [rooms, setRooms] = useState<any[]>([])

    const [form, setForm] = useState({
        name: '', category: 'ELECTRONICS', location: '',
        description: '', roomId: '', image: ''
    })

    useEffect(() => {
        if (propertyId && propertyId !== 'ALL') {
            fetchItems()
            fetchRooms()
        }
    }, [propertyId, session])

    const fetchItems = async () => {
        setIsLoading(true)
        try {
            const res = await fetch(`/api/admin/lost-found?propertyId=${propertyId}`)
            if (res.ok) {
                const json = await res.json()
                setItems(Array.isArray(json) ? json : (json?.data ?? []))
            }
        } catch { toast.error('Could not load items') }
        finally { setIsLoading(false) }
    }

    const fetchRooms = async () => {
        try {
            const res = await fetch(`/api/admin/rooms?propertyId=${propertyId}`)
            if (res.ok) {
                const json = await res.json()
                setRooms(Array.isArray(json) ? json : (json?.data ?? []))
            }
        } catch { /* silent */ }
    }

    const handleAdd = async () => {
        if (!form.name.trim()) return toast.error('Item name is required')
        if (!form.location && !form.roomId) return toast.error('Please specify a location or room')
        setSaving(true)
        try {
            const res = await fetch('/api/admin/lost-found', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, propertyId })
            })
            if (res.ok) {
                const data = await res.json()
                setItems(prev => [data, ...prev])
                setShowForm(false)
                setForm({ name: '', category: 'ELECTRONICS', location: '', description: '', roomId: '', image: '' })
                toast.success('Item logged successfully')
            } else toast.error('Failed to log item')
        } catch { toast.error('Connection error') }
        finally { setSaving(false) }
    }

    const handleClaim = async (id: string) => {
        setClaiming(id)
        try {
            const res = await fetch(`/api/admin/lost-found/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'CLAIMED' })
            })
            if (res.ok) {
                const data = await res.json()
                setItems(prev => prev.map(i => i.id === id ? data : i))
                toast.success('Item marked as claimed')
            } else toast.error('Failed to update')
        } catch { toast.error('Error') }
        finally { setClaiming(null) }
    }

    const handleWhatsApp = (item: any) => {
        const phone = item.guest?.phone
        if (!phone) return toast.error('No guest phone number available')
        const clean = phone.replace(/\D/g, '')
        const num = clean.length === 10 ? `91${clean}` : clean
        const msg = `Hello ${item.guest?.name || 'Guest'}, we found a ${item.name} at ${item.room ? `Room ${item.room.roomNumber}` : item.location}. Please contact the front desk to claim it. Case ID: ${item.id.slice(-6).toUpperCase()}`
        window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank')
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this record?')) return
        try {
            const res = await fetch(`/api/admin/lost-found/${id}`, { method: 'DELETE' })
            if (res.ok) {
                setItems(prev => prev.filter(i => i.id !== id))
                toast.success('Record deleted')
            }
        } catch { toast.error('Failed to delete') }
    }

    const filtered = useMemo(() => items.filter(item => {
        const matchSearch = item.name.toLowerCase().includes(search.toLowerCase()) ||
            item.id.toLowerCase().includes(search.toLowerCase())
        const matchTab = item.status === view
        const matchCat = categoryFilter === 'All' || item.category === categoryFilter
        return matchSearch && matchTab && matchCat
    }), [items, search, view, categoryFilter])

    const counts = useMemo(() => ({
        FOUND: items.filter(i => i.status === 'FOUND').length,
        CLAIMED: items.filter(i => i.status === 'CLAIMED').length,
        DISPOSED: items.filter(i => i.status === 'DISPOSED').length,
    }), [items])

    if (!mounted || !session) return null

    if (session.user.role === 'SUPER_ADMIN' && (!propertyId || propertyId === 'ALL')) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
                <ShieldAlert className="w-12 h-12 text-amber-500 mb-4 opacity-50" />
                <h2 className="text-lg font-bold text-white mb-2">Select a Hotel First</h2>
                <p className="text-text-secondary text-sm max-w-sm">Use the property switcher above to select a hotel before managing Lost & Found.</p>
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Lost & Found</h1>
                    <p className="text-text-secondary text-sm mt-0.5">Track and manage items found on the property</p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white text-sm font-semibold rounded-xl transition-all active:scale-95"
                >
                    <Plus className="w-4 h-4" /> Log Item
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Unclaimed', count: counts.FOUND, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
                    { label: 'Claimed', count: counts.CLAIMED, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
                    { label: 'Disposed', count: counts.DISPOSED, color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20' },
                ].map(s => (
                    <div key={s.label} className={cn('border rounded-2xl p-5', s.bg)}>
                        <p className="text-xs font-semibold text-text-secondary mb-1">{s.label}</p>
                        <p className={cn('text-3xl font-bold', s.color)}>{s.count}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                {/* Tabs */}
                <div className="flex bg-surface-light border border-border rounded-xl p-1 gap-1">
                    {(['FOUND', 'CLAIMED', 'DISPOSED'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setView(tab)}
                            className={cn(
                                'px-4 py-1.5 rounded-lg text-sm font-medium transition-all',
                                view === tab ? 'bg-primary text-white shadow-sm' : 'text-text-secondary hover:text-white'
                            )}
                        >
                            {tab.charAt(0) + tab.slice(1).toLowerCase()}
                            <span className="ml-1.5 text-[10px] opacity-70">({counts[tab]})</span>
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by name or ID..."
                        className="w-full pl-9 pr-4 py-2 bg-surface-light border border-border rounded-xl text-sm text-white placeholder:text-text-tertiary focus:ring-1 focus:ring-primary outline-none"
                    />
                </div>

                {/* Category filter */}
                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
                    <select
                        value={categoryFilter}
                        onChange={e => setCategoryFilter(e.target.value)}
                        className="pl-8 pr-8 py-2 bg-surface-light border border-border rounded-xl text-sm text-white focus:ring-1 focus:ring-primary outline-none appearance-none cursor-pointer"
                    >
                        <option value="All">All Categories</option>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase().replace('_', ' ')}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary pointer-events-none" />
                </div>

                <button onClick={fetchItems} className="p-2 bg-surface-light border border-border rounded-xl text-text-secondary hover:text-white transition-colors" title="Refresh">
                    <RefreshCw className="w-4 h-4" />
                </button>
            </div>

            {/* Items List */}
            {isLoading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => <div key={i} className="h-24 bg-surface-light rounded-2xl animate-pulse" />)}
                </div>
            ) : filtered.length === 0 ? (
                <div className="py-16 text-center border border-dashed border-border rounded-2xl">
                    <Package className="w-10 h-10 text-text-tertiary mx-auto mb-3 opacity-40" />
                    <p className="text-text-secondary text-sm">No {view.toLowerCase()} items found.</p>
                    {view === 'FOUND' && (
                        <button onClick={() => setShowForm(true)} className="mt-3 text-sm text-primary hover:underline font-medium">
                            + Log a new item
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(item => (
                        <div key={item.id} className="bg-surface border border-border rounded-2xl p-5 hover:border-primary/30 transition-all">
                            <div className="flex items-start gap-4">
                                {/* Thumbnail */}
                                <div className="w-16 h-16 rounded-xl bg-surface-light border border-border overflow-hidden shrink-0">
                                    {item.image ? (
                                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Package className="w-6 h-6 text-text-tertiary" />
                                        </div>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider', STATUS_STYLE[item.status])}>
                                                    {item.status}
                                                </span>
                                                <span className="text-[10px] text-text-tertiary font-mono">#{item.id.slice(-6).toUpperCase()}</span>
                                            </div>
                                            <h3 className="text-base font-semibold text-white">{item.name}</h3>
                                            <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                                                <span className="flex items-center gap-1 text-xs text-text-secondary">
                                                    <Tag className="w-3 h-3" />
                                                    {item.category?.charAt(0) + item.category?.slice(1).toLowerCase().replace('_', ' ')}
                                                </span>
                                                <span className="flex items-center gap-1 text-xs text-text-secondary">
                                                    <MapPin className="w-3 h-3" />
                                                    {item.room ? `Room ${item.room.roomNumber}` : (item.location || 'Unknown')}
                                                </span>
                                                <span className="flex items-center gap-1 text-xs text-text-secondary">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </span>
                                                {item.guest && (
                                                    <span className="flex items-center gap-1 text-xs text-primary">
                                                        <User className="w-3 h-3" />
                                                        {item.guest.name}
                                                    </span>
                                                )}
                                            </div>
                                            {item.description && (
                                                <p className="text-xs text-text-tertiary mt-1.5 line-clamp-1">{item.description}</p>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2 shrink-0">
                                            <Link
                                                href={`/admin/lost-found/${item.id}`}
                                                className="px-3 py-1.5 bg-surface-light border border-border hover:border-primary/40 text-text-secondary hover:text-white text-xs font-semibold rounded-lg transition-all"
                                            >
                                                View
                                            </Link>
                                            {item.status === 'FOUND' && (
                                                <>
                                                    <button
                                                        onClick={() => handleClaim(item.id)}
                                                        disabled={claiming === item.id}
                                                        className="px-3 py-1.5 bg-primary hover:bg-primary/90 text-white text-xs font-semibold rounded-lg transition-all disabled:opacity-50"
                                                    >
                                                        {claiming === item.id ? '...' : 'Mark Claimed'}
                                                    </button>
                                                    {item.guest?.phone && (
                                                        <button
                                                            onClick={() => handleWhatsApp(item)}
                                                            className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 rounded-lg transition-all"
                                                            title="Notify via WhatsApp"
                                                        >
                                                            <MessageSquare className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                className="p-1.5 bg-surface-light hover:bg-red-500/10 border border-border hover:border-red-500/30 text-text-tertiary hover:text-red-400 rounded-lg transition-all"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Item Modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="absolute inset-0" onClick={() => setShowForm(false)} />
                    <div className="relative bg-surface border border-border w-full max-w-lg rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-6 border-b border-border">
                            <h3 className="text-base font-semibold text-white">Log Found Item</h3>
                            <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-surface-light rounded-lg transition-colors">
                                <X className="w-4 h-4 text-text-secondary" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2 space-y-1.5">
                                    <label className="text-xs font-semibold text-text-secondary block">Item Name *</label>
                                    <input
                                        value={form.name}
                                        onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                                        placeholder="e.g. iPhone 14, Leather Wallet"
                                        className="w-full bg-surface-light border border-border rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-text-tertiary focus:ring-1 focus:ring-primary outline-none"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-text-secondary block">Category</label>
                                    <select
                                        value={form.category}
                                        onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                                        className="w-full bg-surface-light border border-border rounded-xl px-4 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary outline-none appearance-none cursor-pointer"
                                    >
                                        {CATEGORIES.map(c => (
                                            <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase().replace('_', ' ')}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-text-secondary block">Found in Room</label>
                                    <select
                                        value={form.roomId}
                                        onChange={e => setForm(p => ({ ...p, roomId: e.target.value }))}
                                        className="w-full bg-surface-light border border-border rounded-xl px-4 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary outline-none appearance-none cursor-pointer"
                                    >
                                        <option value="">Public Area / Other</option>
                                        {rooms.map(r => <option key={r.id} value={r.id}>Room {r.roomNumber}</option>)}
                                    </select>
                                </div>

                                <div className="col-span-2 space-y-1.5">
                                    <label className="text-xs font-semibold text-text-secondary block">Location (if not a room)</label>
                                    <input
                                        value={form.location}
                                        onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                                        placeholder="e.g. Restaurant, Pool area, Lobby"
                                        className="w-full bg-surface-light border border-border rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-text-tertiary focus:ring-1 focus:ring-primary outline-none"
                                    />
                                </div>

                                <div className="col-span-2 space-y-1.5">
                                    <label className="text-xs font-semibold text-text-secondary block">Description</label>
                                    <textarea
                                        rows={2}
                                        value={form.description}
                                        onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                                        placeholder="Color, brand, distinguishing marks..."
                                        className="w-full bg-surface-light border border-border rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-text-tertiary focus:ring-1 focus:ring-primary outline-none resize-none"
                                    />
                                </div>

                                {/* Photo upload */}
                                <div className="col-span-2 space-y-1.5">
                                    <label className="text-xs font-semibold text-text-secondary block">Photo (optional)</label>
                                    <div className="flex items-center gap-3">
                                        {form.image && (
                                            <img src={form.image} alt="preview" className="w-12 h-12 rounded-lg object-cover border border-border" />
                                        )}
                                        <label className="flex items-center gap-2 px-4 py-2 bg-surface-light border border-border rounded-xl text-xs font-semibold text-text-secondary hover:text-white cursor-pointer transition-all">
                                            <Camera className="w-4 h-4" />
                                            {form.image ? 'Change Photo' : 'Add Photo'}
                                            <input type="file" accept="image/*" className="hidden" onChange={async e => {
                                                const file = e.target.files?.[0]
                                                if (file) {
                                                    try {
                                                        toast.info('Uploading photo...')
                                                        const { uploadToCloudinary } = await import('@/lib/cloudinary')
                                                        const result = await uploadToCloudinary(file, 'lost-found')
                                                        setForm(p => ({ ...p, image: result.url }))
                                                        toast.success('Photo uploaded')
                                                    } catch (error) {
                                                        console.error('[ADMIN_LF_UPLOAD_ERROR]', error)
                                                        toast.error('Failed to upload photo')
                                                    }
                                                }
                                            }} />
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-border text-text-secondary hover:text-white text-sm font-semibold rounded-xl transition-all">
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAdd}
                                    disabled={saving}
                                    className="flex-1 py-2.5 bg-primary hover:bg-primary/90 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-50"
                                >
                                    {saving ? 'Saving...' : 'Log Item'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
