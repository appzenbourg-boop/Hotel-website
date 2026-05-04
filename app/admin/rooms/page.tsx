'use client'

import { useState, useEffect, useCallback } from 'react'
import {
    Plus, Search, Filter, Copy, Save, Minus, ChevronRight,
    ArrowUp, Bed, X, Loader2, CheckCircle2, Download,
    Wifi, Wind, Tv, Coffee, SlidersHorizontal
} from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { buildContextUrl } from '@/lib/admin-context'

type RoomStatus = 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'CLEANING'
type Tab = 'general' | 'amenities' | 'media' | 'upgrade'
const PAGE_SIZE = 10

const STATUS_STYLE: Record<string, string> = {
    AVAILABLE: 'bg-[#1db954]/10 text-[#1db954] border-[#1db954]/20',
    OCCUPIED: 'bg-[#4A9EFF]/10 text-[#4A9EFF] border-[#4A9EFF]/20',
    CLEANING: 'bg-[#d4aa00]/10 text-[#d4aa00] border-[#d4aa00]/20',
    MAINTENANCE: 'bg-[#e53e3e]/10 text-[#e53e3e] border-[#e53e3e]/20',
}
const STATUS_DOT: Record<string, string> = {
    AVAILABLE: 'bg-[#1db954]', OCCUPIED: 'bg-[#4A9EFF]',
    CLEANING: 'bg-[#d4aa00]', MAINTENANCE: 'bg-[#e53e3e]',
}
const AMENITY_ICONS: Record<string, any> = { WiFi: Wifi, AC: Wind, TV: Tv, Coffee: Coffee }
const AMENITIES_OPTS = ['WiFi', 'Air Conditioning', 'Mini Bar', 'Room Service', 'Balcony', 'Sea View', 'Bathtub', 'Jacuzzi', 'Kitchenette', 'Safe', 'Smart TV', 'Coffee Maker', 'Iron', 'Hair Dryer', 'Workspace']

export default function RoomsPage() {
    const [rooms, setRooms] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatus] = useState<RoomStatus | 'ALL'>('ALL')
    const [floorFilter, setFloor] = useState('ALL')
    const [typeFilter, setType] = useState('ALL')
    const [page, setPage] = useState(1)
    const [showConfig, setShowConfig] = useState(false)   // Room Config drawer
    const [showNewModal, setNewModal] = useState(false)
    const [configSelected, setCfgSel] = useState<any>(null)
    const [activeTab, setTab] = useState<Tab>('general')
    const [saving, setSaving] = useState(false)
    const [cfgForm, setCfgForm] = useState({
        type: '', category: '', roomNumber: '', floor: '1', basePrice: '0', weekendSurcharge: '0',
        maxOccupancy: '2', description: '', status: 'AVAILABLE' as RoomStatus,
        visibleOnline: true, petFriendly: false, smokingAllowed: false, adaCompliant: false,
        amenities: [] as string[],
        images: [] as string[],
    })
    const [newForm, setNewForm] = useState({ roomNumber: '', floor: '1', category: 'STANDARD', type: 'Standard King', basePrice: '150', maxOccupancy: '2', images: [] })
    const [uploading, setUploading] = useState(false)
    const [amenitiesList, setAmenitiesList] = useState<string[]>([])

    const fetchAmenities = async () => {
        try {
            // The API now handles session-based propertyId fallback, so we can call it directly
            const res = await fetch('/api/admin/content/amenities')
            if (res.ok) {
                const json = await res.json()
                const ams = Array.isArray(json) ? json : (json?.data ?? [])
                const customNames = ams.map((a: any) => a.name)
                // Filter out empty names and merge with presets
                const validCustoms = customNames.filter((n: string) => n && n.trim().length > 0)
                setAmenitiesList(Array.from(new Set([...AMENITIES_OPTS, ...validCustoms])))
            }
        } catch (e) { console.error('Amenity fetch error:', e) }
    }

    const fetchRooms = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch(buildContextUrl('/api/admin/rooms', { status: statusFilter }))
            if (res.ok) {
                const json = await res.json()
                setRooms(Array.isArray(json) ? json : (json?.data ?? []))
            }
            await fetchAmenities()
        } catch { toast.error('Failed to fetch rooms') }
        finally { setLoading(false) }
    }, [statusFilter])

    useEffect(() => { fetchRooms() }, [fetchRooms])

    const openConfig = (room: any) => {
        fetchAmenities() // Refresh amenities on open
        setCfgSel(room)
        setCfgForm({
            type: room.type || '', category: room.category || 'STANDARD',
            roomNumber: room.roomNumber || '', floor: String(room.floor || 1),
            basePrice: String(room.basePrice || 0), 
            weekendSurcharge: String(room.weekendSurcharge || 0),
            maxOccupancy: String(room.maxOccupancy || 2), description: room.description || '',
            status: room.status || 'AVAILABLE', 
            visibleOnline: room.visibleOnline ?? true,
            petFriendly: room.petFriendly ?? false, 
            smokingAllowed: room.smokingAllowed ?? false, 
            adaCompliant: room.adaCompliant ?? false,
            amenities: room.amenities || [],
            images: room.images || [],
        })
        setTab('general')
        setShowConfig(true)
    }

    const handleSave = async () => {
        if (!configSelected) return
        setSaving(true)
        try {
            const res = await fetch(`/api/admin/rooms/${configSelected.id}`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: cfgForm.type,
                    category: cfgForm.category,
                    roomNumber: cfgForm.roomNumber,
                    floor: parseInt(cfgForm.floor),
                    basePrice: parseFloat(cfgForm.basePrice),
                    maxOccupancy: parseInt(cfgForm.maxOccupancy),
                    description: cfgForm.description,
                    status: cfgForm.status,
                    amenities: cfgForm.amenities,
                    images: cfgForm.images,
                    visibleOnline: cfgForm.visibleOnline,
                    petFriendly: cfgForm.petFriendly,
                    smokingAllowed: cfgForm.smokingAllowed,
                    adaCompliant: cfgForm.adaCompliant,
                    weekendSurcharge: parseFloat(cfgForm.weekendSurcharge),
                }),
            })
            if (res.ok) { toast.success('Room saved'); setShowConfig(false); fetchRooms() }
            else toast.error('Failed to save')
        } catch { toast.error('Error') }
        finally { setSaving(false) }
    }

    const handleCreate = async () => {
        try {
            const res = await fetch('/api/admin/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...newForm, images: [] }) })
            if (res.ok) { toast.success('Room created'); setNewModal(false); fetchRooms() }
            else toast.error(await res.text())
        } catch { toast.error('Error') }
    }

    const handleDelete = async () => {
        if (!configSelected || !confirm('Delete this room?')) return
        try {
            const res = await fetch(`/api/admin/rooms/${configSelected.id}`, { method: 'DELETE' })
            if (res.ok) { toast.success('Deleted'); setShowConfig(false); fetchRooms() }
            else toast.error(await res.text())
        } catch { toast.error('Error') }
    }

    const toggleAmenity = (a: string) => setCfgForm(p => ({ ...p, amenities: p.amenities.includes(a) ? p.amenities.filter(x => x !== a) : [...p.amenities, a] }))

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploading(true)
        const toastId = toast.loading('Uploading image...')
        
        try {
            const { uploadToCloudinary } = await import('@/lib/cloudinary')
            const result = await uploadToCloudinary(file, 'rooms')
            
            setCfgForm(prev => ({
                ...prev,
                images: [...prev.images, result.url]
            }))
            
            toast.success('Image uploaded successfully', { id: toastId })
        } catch (error) {
            toast.error('Upload failed', { id: toastId })
            console.error(error)
        } finally {
            setUploading(false)
        }
    }

    const removeImage = (url: string) => {
        setCfgForm(prev => ({
            ...prev,
            images: prev.images.filter(img => img !== url)
        }))
    }

    const Occ = ({ k, label }: { k: 'maxOccupancy', label: string }) => (
        <button onClick={() => setCfgForm(p => ({ ...p, [k]: String(Math.max(1, parseInt(p[k] as string) + Number(label === '+' ? 1 : -1))) }))}
            className="w-8 h-9 flex items-center justify-center bg-[#182433] border border-white/[0.08] rounded-lg text-white hover:bg-white/[0.08] transition-colors shrink-0">
            {label === '+' ? <Plus className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
        </button>
    )
    const Toggle = ({ val, k, label }: { val: boolean; k: string; label: string }) => (
        <div className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
            <span className="text-[12px] text-gray-300">{label}</span>
            <button onClick={() => setCfgForm(p => ({ ...p, [k]: !p[k as keyof typeof p] }))}
                className={cn('relative w-10 h-5 rounded-full transition-all', val ? 'bg-[#4A9EFF]' : 'bg-gray-700')}>
                <span className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all', val ? 'left-[22px]' : 'left-0.5')} />
            </button>
        </div>
    )

    // derived
    const floors = [...new Set(rooms.map(r => r.floor))].sort()
    const types = [...new Set(rooms.map(r => r.type))]
    const filtered = rooms.filter(r => {
        const q = search.toLowerCase()
        return (r.roomNumber.toLowerCase().includes(q) || r.type.toLowerCase().includes(q))
            && (statusFilter === 'ALL' || r.status === statusFilter)
            && (floorFilter === 'ALL' || String(r.floor) === floorFilter)
            && (typeFilter === 'ALL' || r.type === typeFilter)
    })
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
    const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

    return (
        <div className="space-y-5 animate-fade-in">

            {/* ── HEADER ── */}
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-white">Room Inventory</h1>
                    <p className="text-[12px] text-gray-400 mt-0.5">Manage all hotel rooms, check status, and update inventory details.</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <button 
                        onClick={() => {
                            const headers = ['Room Number', 'Type', 'Floor', 'Price', 'Capacity', 'Status', 'Amenities']
                            const rows = filtered.map(r => [
                                r.roomNumber,
                                r.type,
                                r.floor,
                                r.basePrice,
                                r.maxOccupancy,
                                r.status,
                                (r.amenities || []).join('; ')
                            ])
                            const csvContent = "data:text/csv;charset=utf-8," 
                                + headers.join(",") + "\n" 
                                + rows.map(e => e.join(",")).join("\n")
                            const encodedUri = encodeURI(csvContent)
                            const link = document.createElement("a")
                            link.setAttribute("href", encodedUri)
                            link.setAttribute("download", `room_inventory_${new Date().toISOString().split('T')[0]}.csv`)
                            document.body.appendChild(link)
                            link.click()
                            document.body.removeChild(link)
                            toast.success('Inventory exported successfully')
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] text-gray-300 text-[12px] font-medium rounded-lg transition-all active:scale-95"
                    >
                        <Download className="w-3.5 h-3.5" /> Export Rooms
                    </button>
                    <button onClick={() => setNewModal(true)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-[#4A9EFF] hover:bg-[#3A8EEF] text-white text-[12px] font-semibold rounded-lg transition-colors shadow-lg shadow-[#4A9EFF]/20">
                        <Plus className="w-3.5 h-3.5" /> Add New Room
                    </button>
                </div>
            </div>

            {/* ── FILTERS ── */}
            <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[200px] max-w-[320px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                    <input type="text" placeholder="Search by Room No..." value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1) }}
                        className="w-full pl-9 pr-3 py-2 bg-[#233648] border border-white/[0.08] rounded-lg text-[12px] text-white placeholder:text-gray-600 focus:outline-none focus:border-[#4A9EFF]/40" />
                </div>
                <select value={statusFilter} onChange={e => { setStatus(e.target.value as any); setPage(1) }}
                    className="px-3 py-2 bg-[#233648] border border-white/[0.08] rounded-lg text-[12px] text-gray-300 focus:outline-none cursor-pointer">
                    <option value="ALL">Status: All</option>
                    <option value="AVAILABLE">Available</option>
                    <option value="OCCUPIED">Occupied</option>
                    <option value="CLEANING">Cleaning</option>
                    <option value="MAINTENANCE">Maintenance</option>
                </select>
                <select value={floorFilter} onChange={e => { setFloor(e.target.value); setPage(1) }}
                    className="px-3 py-2 bg-[#233648] border border-white/[0.08] rounded-lg text-[12px] text-gray-300 focus:outline-none cursor-pointer">
                    <option value="ALL">Floor: All</option>
                    {floors.map(f => <option key={f} value={String(f)}>Floor {f}</option>)}
                </select>
                <select value={typeFilter} onChange={e => { setType(e.target.value); setPage(1) }}
                    className="px-3 py-2 bg-[#233648] border border-white/[0.08] rounded-lg text-[12px] text-gray-300 focus:outline-none cursor-pointer">
                    <option value="ALL">Type: All</option>
                    {types.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <button className="flex items-center gap-1.5 px-3 py-2 bg-[#233648] border border-white/[0.08] rounded-lg text-[12px] text-gray-400 hover:text-white transition-colors">
                    <SlidersHorizontal className="w-3.5 h-3.5" /> More Filters
                </button>
            </div>

            {/* ── TABLE / MOBILE CARDS ── */}
            <div className="bg-[#233648] border border-white/[0.07] rounded-xl overflow-hidden shadow-sm">
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full min-w-[700px]">
                        <thead>
                            <tr className="border-b border-white/[0.06] bg-black/10">
                                {['ROOM NO', 'TYPE', 'FLOOR', 'PRICE/NIGHT', 'OCCUPANCY', 'STATUS', 'AMENITIES', 'ACTIONS'].map(h => (
                                    <th key={h} className="text-left px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                            {loading ? (
                                <tr><td colSpan={8} className="text-center py-12">
                                    <Loader2 className="w-5 h-5 text-[#4A9EFF] animate-spin mx-auto" />
                                </td></tr>
                            ) : pageRows.length === 0 ? (
                                <tr><td colSpan={8} className="text-center py-12 text-[12px] text-gray-500">No rooms found</td></tr>
                            ) : pageRows.map(room => (
                                <tr key={room.id} className="border-b border-white/[0.04] hover:bg-white/[0.04] transition-colors group">
                                    <td className="px-4 py-3.5">
                                        <span className="text-[14px] font-bold text-white">{room.roomNumber}</span>
                                    </td>
                                    <td className="px-4 py-3.5 text-[13px] text-gray-200">{room.type}</td>
                                    <td className="px-4 py-3.5 text-[13px] text-gray-400">{room.floor}</td>
                                    <td className="px-4 py-3.5 text-[13px] font-semibold text-white">{formatCurrency(room.basePrice)}</td>
                                    <td className="px-4 py-3.5 text-[12px] text-gray-300">{room.maxOccupancy} Adult{room.maxOccupancy > 1 ? 's' : ''}</td>
                                    <td className="px-4 py-3.5">
                                        <span className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold w-fit', STATUS_STYLE[room.status] || STATUS_STYLE.AVAILABLE)}>
                                            <span className={cn('w-1.5 h-1.5 rounded-full', STATUS_DOT[room.status] || STATUS_DOT.AVAILABLE)} />
                                            {room.status.charAt(0) + room.status.slice(1).toLowerCase()}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3.5">
                                        <div className="flex items-center gap-1.5 text-gray-500">
                                            {(room.amenities || []).slice(0, 4).map((a: string) => {
                                                const Icon = AMENITY_ICONS[a]
                                                return Icon
                                                    ? <Icon key={a} className="w-3.5 h-3.5" title={a} />
                                                    : <span key={a} className="text-[9px] px-1.5 py-0.5 bg-white/[0.04] border border-white/[0.06] rounded text-gray-400" title={a}>{a.slice(0, 2)}</span>
                                            })}
                                            {(room.amenities || []).length > 4 && (
                                                <span className="text-[9px] text-gray-600">+{room.amenities.length - 4}</span>
                                            )}
                                            {(!room.amenities || room.amenities.length === 0) && (
                                                <span className="text-[10px] text-gray-600 ">None</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3.5">
                                        <button onClick={() => openConfig(room)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.04] hover:bg-primary/20 border border-white/[0.06] hover:border-primary/40 text-[11px] text-gray-400 hover:text-white font-medium rounded-lg transition-all">
                                            <SlidersHorizontal className="w-3 h-3" /> Config
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-white/[0.04]">
                    {loading ? (
                        <div className="p-12 text-center">
                            <Loader2 className="w-6 h-6 text-[#4A9EFF] animate-spin mx-auto" />
                        </div>
                    ) : pageRows.length === 0 ? (
                        <div className="p-12 text-center text-[12px] text-gray-500 uppercase tracking-widest">No rooms found</div>
                    ) : pageRows.map(room => (
                        <div key={room.id} className="p-4 space-y-4 active:bg-white/[0.03] transition-colors">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/[0.08] flex flex-col items-center justify-center">
                                        <span className="text-[15px] font-black text-white">{room.roomNumber}</span>
                                        <span className="text-[8px] text-gray-500 font-bold uppercase">Floor {room.floor}</span>
                                    </div>
                                    <div>
                                        <h3 className="text-[14px] font-bold text-white leading-tight mb-1">{room.type}</h3>
                                        <span className={cn('flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[10px] font-bold w-fit', STATUS_STYLE[room.status] || STATUS_STYLE.AVAILABLE)}>
                                            <span className={cn('w-1.5 h-1.5 rounded-full', STATUS_DOT[room.status] || STATUS_DOT.AVAILABLE)} />
                                            {room.status.charAt(0) + room.status.slice(1).toLowerCase()}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[14px] font-black text-white">{formatCurrency(room.basePrice)}</p>
                                    <p className="text-[9px] text-gray-500 font-bold uppercase tracking-tight">Per Night</p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between gap-3 bg-black/10 rounded-xl p-3 border border-white/5">
                                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                                    {(room.amenities || []).slice(0, 5).map((a: string) => {
                                        const Icon = AMENITY_ICONS[a]
                                        return Icon 
                                            ? <Icon key={a} className="w-3.5 h-3.5 text-gray-400" />
                                            : <span key={a} className="text-[8px] px-1.5 py-0.5 bg-white/[0.04] rounded text-gray-500 border border-white/5">{a.slice(0, 2)}</span>
                                    })}
                                    {(room.amenities || []).length > 5 && (
                                        <span className="text-[9px] text-gray-600">+{room.amenities.length - 5}</span>
                                    )}
                                </div>
                                <button 
                                    onClick={() => openConfig(room)}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-[#4A9EFF] text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-[#4A9EFF]/20 active:scale-95"
                                >
                                    <SlidersHorizontal className="w-3 h-3" /> Config
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06]">
                    <p className="hidden sm:block text-[12px] text-gray-500">
                        Showing <b className="text-white">{Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}</b> to{' '}
                        <b className="text-white">{Math.min(page * PAGE_SIZE, filtered.length)}</b> of{' '}
                        <b className="text-white">{filtered.length}</b> results
                    </p>
                    <div className="flex-1 sm:flex-initial flex items-center justify-center gap-1">
                        <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                            className="px-3 py-1.5 text-[12px] text-gray-400 hover:text-white bg-[#182433] rounded-lg border border-white/[0.06] disabled:opacity-40 transition-colors">Prev</button>
                        {Array.from({ length: Math.min(totalPages, 3) }, (_, i) => i + 1).map(p => (
                            <button key={p} onClick={() => setPage(p)}
                                className={cn('w-8 h-8 text-[12px] font-medium rounded-lg border transition-colors', p === page ? 'bg-[#4A9EFF] text-white border-[#4A9EFF]' : 'text-gray-400 hover:text-white bg-[#182433] border-white/[0.06]')}>{p}</button>
                        ))}
                        {totalPages > 3 && <span className="text-gray-600 text-[12px]">...</span>}
                        <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                            className="px-3 py-1.5 text-[12px] text-gray-400 hover:text-white bg-[#182433] rounded-lg border border-white/[0.06] disabled:opacity-40 transition-colors">Next</button>
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════
          ROOM CONFIG DRAWER (slides in from right)
         ══════════════════════════════════════════ */}
            {showConfig && (
                <div className="fixed inset-0 z-50 flex">
                    {/* Backdrop */}
                    <div className="flex-1 bg-black/70" onClick={() => setShowConfig(false)} />

                    {/* Drawer panel */}
                    <div className="w-full max-w-[860px] bg-[#101922] border-l border-white/[0.08] flex flex-col h-full overflow-hidden shadow-2xl animate-slide-in-right">

                        {/* Drawer header */}
                        <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-white/[0.07]">
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h2 className="text-[18px] font-bold text-white">{cfgForm.type || configSelected?.type}</h2>
                                    <span className={cn('px-2 py-0.5 text-[10px] font-bold rounded-full border', STATUS_STYLE[cfgForm.status] || STATUS_STYLE.AVAILABLE)}>
                                        {cfgForm.status === 'AVAILABLE' ? 'Active' : cfgForm.status.charAt(0) + cfgForm.status.slice(1).toLowerCase()}
                                    </span>
                                </div>
                                <p className="text-[11px] text-gray-500 mt-0.5">Room {configSelected?.roomNumber} · Floor {configSelected?.floor}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={handleSave} disabled={saving}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-[#4A9EFF] hover:bg-[#3A8EEF] text-white text-[12px] font-semibold rounded-lg transition-colors disabled:opacity-60">
                                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </button>
                                <button onClick={() => setShowConfig(false)} className="p-2 hover:bg-white/[0.06] rounded-lg transition-colors">
                                    <X className="w-4 h-4 text-gray-400" />
                                </button>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="shrink-0 flex items-center gap-1 px-5 border-b border-white/[0.06] overflow-x-auto">
                            {(['general', 'amenities', 'media', 'upgrade'] as Tab[]).map(tab => (
                                <button key={tab} onClick={() => setTab(tab)}
                                    className={cn('px-4 py-2.5 text-[13px] font-medium whitespace-nowrap border-b-2 transition-colors capitalize',
                                        activeTab === tab ? 'text-[#4A9EFF] border-[#4A9EFF]' : 'text-gray-500 border-transparent hover:text-gray-300')}>
                                    {tab === 'media' ? 'Media Gallery' : tab === 'upgrade' ? 'Upgrade Logic' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                                </button>
                            ))}
                        </div>

                        {/* Tab body */}
                        <div className="flex-1 overflow-y-auto">

                            {/* ── GENERAL ── */}
                            {activeTab === 'general' && (
                                <div className="flex flex-col lg:flex-row h-full">
                                    <div className="flex-1 p-5 space-y-4 overflow-y-auto">
                                        <div className="bg-[#233648] border border-white/[0.07] rounded-xl p-5 space-y-4">
                                            <h3 className="text-[13px] font-semibold text-white">Basic Information</h3>
                                            <div>
                                                <label className="text-[11px] text-gray-500 font-medium mb-1.5 block">Category Name</label>
                                                <input value={cfgForm.type} onChange={e => setCfgForm(p => ({ ...p, type: e.target.value }))}
                                                    className="w-full px-3 py-2.5 bg-[#182433] border border-white/[0.08] rounded-lg text-[13px] text-white focus:outline-none focus:border-[#4A9EFF]/40" />
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="text-[11px] text-gray-500 font-medium mb-1.5 block">Internal Code</label>
                                                    <input value={cfgForm.roomNumber} onChange={e => setCfgForm(p => ({ ...p, roomNumber: e.target.value }))}
                                                        className="w-full px-3 py-2.5 bg-[#182433] border border-white/[0.08] rounded-lg text-[13px] text-white focus:outline-none focus:border-[#4A9EFF]/40" />
                                                </div>
                                                <div>
                                                    <label className="text-[11px] text-gray-500 font-medium mb-1.5 block">Max Occupancy</label>
                                                    <div className="flex items-center gap-2">
                                                        <Occ k="maxOccupancy" label="-" />
                                                        <input type="number" value={cfgForm.maxOccupancy} onChange={e => setCfgForm(p => ({ ...p, maxOccupancy: e.target.value }))}
                                                            className="flex-1 text-center px-2 py-2 bg-[#182433] border border-white/[0.08] rounded-lg text-[13px] font-bold text-white focus:outline-none" />
                                                        <Occ k="maxOccupancy" label="+" />
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[11px] text-gray-500 font-medium mb-1.5 block">Description</label>
                                                <textarea value={cfgForm.description} onChange={e => setCfgForm(p => ({ ...p, description: e.target.value }))} rows={4}
                                                    placeholder="A comfortable retreat featuring..."
                                                    className="w-full px-3 py-2.5 bg-[#182433] border border-white/[0.08] rounded-lg text-[13px] text-white placeholder:text-gray-600 focus:outline-none focus:border-[#4A9EFF]/40 resize-none" />
                                                <p className="text-[10px] text-gray-600 mt-1">This description will appear on the booking engine.</p>
                                            </div>
                                            <div>
                                                <label className="text-[11px] text-gray-500 font-medium mb-1.5 block">Room Status</label>
                                                <select value={cfgForm.status} onChange={e => setCfgForm(p => ({ ...p, status: e.target.value as RoomStatus }))}
                                                    className="w-full px-3 py-2.5 bg-[#182433] border border-white/[0.08] rounded-lg text-[13px] text-white focus:outline-none cursor-pointer">
                                                    <option value="AVAILABLE">Available</option>
                                                    <option value="OCCUPIED">Occupied</option>
                                                    <option value="CLEANING">Cleaning</option>
                                                    <option value="MAINTENANCE">Maintenance</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="bg-[#233648] border border-white/[0.07] rounded-xl p-5 space-y-3">
                                            <h3 className="text-[13px] font-semibold text-white">Pricing Configuration</h3>
                                            <div className="grid grid-cols-2 gap-3">
                                                {[{ label: 'Base Rate (Nightly)', k: 'basePrice' }, { label: 'Weekend Surcharge', k: 'weekendSurcharge' }].map(({ label, k }) => (
                                                    <div key={k}>
                                                        <label className="text-[11px] text-gray-500 font-medium mb-1.5 block">{label}</label>
                                                        <div className="relative">
                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-[13px]">₹</span>
                                                            <input type="number" value={cfgForm[k as keyof typeof cfgForm] as string}
                                                                onChange={e => setCfgForm(p => ({ ...p, [k]: e.target.value }))}
                                                                className="w-full pl-8 pr-3 py-2.5 bg-[#182433] border border-white/[0.08] rounded-lg text-[13px] text-white focus:outline-none focus:border-[#4A9EFF]/40" />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="bg-[#e53e3e]/5 border border-[#e53e3e]/20 rounded-xl p-4">
                                            <h3 className="text-[12px] font-semibold text-[#e53e3e] mb-2">Danger Zone</h3>
                                            <button onClick={handleDelete}
                                                className="px-4 py-2 text-[12px] font-semibold text-[#e53e3e] bg-[#e53e3e]/10 hover:bg-[#e53e3e]/20 border border-[#e53e3e]/20 rounded-lg transition-colors">
                                                Delete Room
                                            </button>
                                        </div>
                                    </div>

                                    {/* Quick Attributes + Upgrade Path sidebar */}
                                    <div className="lg:w-[220px] shrink-0 p-4 space-y-4 border-t lg:border-t-0 lg:border-l border-white/[0.06]">
                                        <div className="bg-[#233648] border border-white/[0.07] rounded-xl p-4">
                                            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Quick Attributes</h3>
                                            <Toggle val={cfgForm.visibleOnline} k="visibleOnline" label="Visible Online" />
                                            <Toggle val={cfgForm.petFriendly} k="petFriendly" label="Pet Friendly" />
                                            <Toggle val={cfgForm.smokingAllowed} k="smokingAllowed" label="Smoking Allowed" />
                                            <Toggle val={cfgForm.adaCompliant} k="adaCompliant" label="ADA Compliant" />
                                        </div>
                                        <div className="bg-[#233648] border border-white/[0.07] rounded-xl p-4">
                                            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Upgrade Path</h3>
                                            <p className="text-[10px] text-gray-500 mb-3">Guests booking this room are offered:</p>
                                            <div className="space-y-2">
                                                {rooms.filter(r => r.id !== configSelected?.id && parseFloat(r.basePrice) > parseFloat(cfgForm.basePrice)).slice(0, 3).map(r => (
                                                    <div key={r.id} className="flex items-center gap-2 p-2 bg-[#182433] rounded-lg border border-white/[0.04]">
                                                        <div className="w-6 h-6 rounded bg-[#4A9EFF]/10 flex items-center justify-center shrink-0">
                                                            <ArrowUp className="w-3 h-3 text-[#4A9EFF]" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-[11px] font-semibold text-white truncate">{r.type}</p>
                                                            <p className="text-[9px] text-[#1db954] font-medium">+{formatCurrency(parseFloat(r.basePrice) - parseFloat(cfgForm.basePrice))} / night</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── AMENITIES ── */}
                            {activeTab === 'amenities' && (
                                <div className="p-5 animate-fade-in">
                                    <div className="bg-[#233648] border border-white/[0.07] rounded-2xl p-6">
                                        <div className="mb-6">
                                            <h3 className="text-[15px] font-bold text-white">Room Amenities</h3>
                                            <p className="text-[11px] text-gray-500 mt-1">Select the amenities available for this specific room.</p>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                            {amenitiesList.map(a => {
                                                const on = cfgForm.amenities.includes(a); return (
                                                    <button key={a} onClick={() => toggleAmenity(a)}
                                                        className={cn('flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-[12px] font-semibold transition-all group',
                                                            on ? 'bg-[#4A9EFF]/10 border-[#4A9EFF]/30 text-[#4A9EFF]' : 'bg-[#182433] border-white/[0.06] text-gray-400 hover:text-white hover:border-white/[0.1]')}>
                                                        <div className={cn('w-2 h-2 rounded-full shrink-0 transition-all', on ? 'bg-[#4A9EFF] shadow-[0_0_8px_#4A9EFF]' : 'bg-gray-700 group-hover:bg-gray-500')} />
                                                        <span className="truncate">{a}</span>
                                                    </button>
                                                )
                                            })}
                                            {amenitiesList.length === 0 && (
                                                <div className="col-span-full py-12 text-center">
                                                    <p className="text-[12px] text-gray-500">No amenities found. Add some in Content Management.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── MEDIA ── */}
                            {activeTab === 'media' && (
                                <div className="p-5 animate-fade-in">
                                    <div className="bg-[#233648] border border-white/[0.07] rounded-2xl p-6">
                                        <div className="flex items-center justify-between mb-6">
                                            <div>
                                                <h3 className="text-[15px] font-bold text-white">Media Gallery</h3>
                                                <p className="text-[11px] text-gray-500 mt-1">Upload high-quality photos of the room for the booking engine.</p>
                                            </div>
                                            <label className={cn(
                                                "flex items-center gap-2 px-4 py-2 bg-[#4A9EFF] hover:bg-[#3A8EEF] text-white text-[12px] font-bold rounded-xl transition-all cursor-pointer shadow-lg shadow-[#4A9EFF]/20 active:scale-95",
                                                uploading && "opacity-50 pointer-events-none"
                                            )}>
                                                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                                                {uploading ? 'Uploading...' : 'Upload Photo'}
                                                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                                            </label>
                                        </div>

                                        {cfgForm.images.length > 0 ? (
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                                {cfgForm.images.map((img: string, i: number) => (
                                                    <div key={i} className="group relative aspect-[4/3] rounded-xl overflow-hidden border border-white/[0.08] bg-[#182433]">
                                                        <img src={img} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                            <button 
                                                                onClick={() => removeImage(img)}
                                                                className="p-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors shadow-lg"
                                                                title="Delete Image"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center border-2 border-dashed border-white/[0.08] rounded-2xl h-60 bg-white/[0.01]">
                                                <div className="w-16 h-16 rounded-full bg-white/[0.03] flex items-center justify-center mb-4">
                                                    <Plus className="w-8 h-8 text-gray-600" />
                                                </div>
                                                <p className="text-[13px] font-medium text-gray-400">No photos in the gallery</p>
                                                <p className="text-[11px] text-gray-500 mt-1">Click the upload button to add room images</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ── UPGRADE LOGIC ── */}
                            {activeTab === 'upgrade' && (
                                <div className="p-5">
                                    <div className="bg-[#233648] border border-white/[0.07] rounded-xl p-5">
                                        <h3 className="text-[13px] font-semibold text-white mb-4">Upgrade Logic</h3>
                                        <div className="space-y-3">
                                            {rooms.filter(r => r.id !== configSelected?.id && parseFloat(r.basePrice) > parseFloat(cfgForm.basePrice)).map(r => (
                                                <div key={r.id} className="flex items-center gap-4 p-4 bg-[#182433] rounded-xl border border-white/[0.06]">
                                                    <div className="w-14 h-14 rounded-xl bg-[#233648] border border-white/[0.06] overflow-hidden shrink-0 flex items-center justify-center">
                                                        {r.images?.[0] ? <img src={r.images[0]} alt="" className="w-full h-full object-cover" /> : <Bed className="w-5 h-5 text-gray-600" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[13px] font-bold text-white">{r.type}</p>
                                                        <p className="text-[11px] text-gray-400">Room {r.roomNumber} · Max {r.maxOccupancy}</p>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <p className="text-[12px] font-bold text-[#1db954]">+{formatCurrency(parseFloat(r.basePrice) - parseFloat(cfgForm.basePrice))}</p>
                                                        <p className="text-[10px] text-gray-500">/ night</p>
                                                    </div>
                                                </div>
                                            ))}
                                            {rooms.filter(r => r.id !== configSelected?.id && parseFloat(r.basePrice) > parseFloat(cfgForm.basePrice)).length === 0 && (
                                                <p className="text-[12px] text-gray-500 text-center py-8">No higher-tier rooms available</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── NEW ROOM MODAL ── */}
            {showNewModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
                    <div className="bg-[#233648] border border-white/[0.1] rounded-2xl p-6 w-full max-w-sm shadow-2xl">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-[15px] font-bold text-white">Add New Room</h2>
                            <button onClick={() => setNewModal(false)} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="space-y-3">
                            <div className="mb-4">
                                <label className="text-[11px] text-gray-500 font-medium mb-2 block">Room Media</label>
                                <div className="grid grid-cols-3 gap-2 mb-2">
                                    {(newForm as any).images?.map((img: string, idx: number) => (
                                        <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-white/[0.1] bg-white/[0.02]">
                                            <img src={img} alt="" className="w-full h-full object-cover" />
                                            <button 
                                                onClick={() => setNewForm(prev => ({ ...prev, images: (prev as any).images.filter((i: string) => i !== img) } as any))}
                                                className="absolute top-1 right-1 p-1 bg-rose-500 rounded-md text-white hover:bg-rose-600 transition-colors"
                                            >
                                                <X className="w-2 h-2" />
                                            </button>
                                        </div>
                                    ))}
                                    <label className={cn(
                                        "aspect-square rounded-lg border-2 border-dashed border-white/[0.08] flex flex-col items-center justify-center cursor-pointer hover:bg-white/[0.02] transition-all",
                                        uploading && "opacity-50 pointer-events-none"
                                    )}>
                                        {uploading ? <Loader2 className="w-4 h-4 animate-spin text-gray-500" /> : <Plus className="w-4 h-4 text-gray-500" />}
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            className="hidden" 
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0]
                                                if (!file) return
                                                setUploading(true)
                                                try {
                                                    const { uploadToCloudinary } = await import('@/lib/cloudinary')
                                                    const result = await uploadToCloudinary(file, 'rooms')
                                                    setNewForm(prev => ({ ...prev, images: [...((prev as any).images || []), result.url] } as any))
                                                    toast.success('Image added')
                                                } catch { toast.error('Upload failed') }
                                                finally { setUploading(false) }
                                            }} 
                                        />
                                    </label>
                                </div>
                                <p className="text-[9px] text-gray-500">Add at least one photo for the booking engine.</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {[{ label: 'Room Number', k: 'roomNumber', ph: '101' }, { label: 'Floor', k: 'floor', ph: '1', type: 'number' }].map(({ label, k, ph, type }) => (
                                    <div key={k}>
                                        <label className="text-[11px] text-gray-500 font-medium mb-1 block">{label}</label>
                                        <input type={type || 'text'} placeholder={ph} value={(newForm as any)[k]}
                                            onChange={e => setNewForm({ ...newForm, [k]: e.target.value })}
                                            className="w-full px-3 py-2 bg-[#182433] border border-white/[0.08] rounded-lg text-[12px] text-white focus:outline-none focus:border-[#4A9EFF]/40" />
                                    </div>
                                ))}
                            </div>
                            <div>
                                <label className="text-[11px] text-gray-500 font-medium mb-1 block">Room Type</label>
                                <input placeholder="Standard King" value={newForm.type} onChange={e => setNewForm({ ...newForm, type: e.target.value })}
                                    className="w-full px-3 py-2 bg-[#182433] border border-white/[0.08] rounded-lg text-[12px] text-white focus:outline-none focus:border-[#4A9EFF]/40" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[11px] text-gray-500 font-medium mb-1 block">Category</label>
                                    <select value={newForm.category} onChange={e => setNewForm({ ...newForm, category: e.target.value })}
                                        className="w-full px-3 py-2 bg-[#182433] border border-white/[0.08] rounded-lg text-[12px] text-white focus:outline-none cursor-pointer">
                                        <option value="STANDARD">Standard</option><option value="DELUXE">Deluxe</option>
                                        <option value="SUITE">Suite</option><option value="PENTHOUSE">Penthouse</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[11px] text-gray-500 font-medium mb-1 block">Max Guests</label>
                                    <input type="number" value={newForm.maxOccupancy} onChange={e => setNewForm({ ...newForm, maxOccupancy: e.target.value })}
                                        className="w-full px-3 py-2 bg-[#182433] border border-white/[0.08] rounded-lg text-[12px] text-white focus:outline-none" />
                                </div>
                            </div>
                            <div>
                                <label className="text-[11px] text-gray-500 font-medium mb-1 block">Base Price / night (₹)</label>
                                <input type="number" value={newForm.basePrice} onChange={e => setNewForm({ ...newForm, basePrice: e.target.value })}
                                    className="w-full px-3 py-2 bg-[#182433] border border-white/[0.08] rounded-lg text-[12px] text-white focus:outline-none" />
                            </div>
                            <div className="flex gap-3 pt-1">
                                <button onClick={() => setNewModal(false)} className="flex-1 py-2 bg-white/[0.04] text-gray-300 text-[12px] font-medium rounded-lg border border-white/[0.06] hover:bg-white/[0.08] transition-colors">Cancel</button>
                                <button onClick={handleCreate} className="flex-1 py-2 bg-[#4A9EFF] hover:bg-[#3A8EEF] text-white text-[12px] font-semibold rounded-lg transition-colors">Create Room</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

