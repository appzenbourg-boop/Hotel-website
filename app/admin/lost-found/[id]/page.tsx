'use client'

import { useState, useEffect } from 'react'
import {
    ChevronRight, ShieldAlert, CheckCircle2, AlertTriangle,
    Download, User, Clock, MapPin,
    Share2, Mail, Phone, Calendar,
    FileText, Image as ImageIcon, MessageSquare,
    ExternalLink, ArrowLeft, MoreVertical,
    Check, Fingerprint, Camera, Trash2,
    ShieldCheck, Bell, Briefcase, Tag,
    QrCode, Search, ChevronLeft, Send, Plus,
    Box, History as HistoryIcon
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export default function ItemDetailPage({ params }: { params: { id: string } }) {
    const router = useRouter()
    const [item, setItem] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [note, setNote] = useState('')
    const [isUpdating, setIsUpdating] = useState(false)
    const [roomHistory, setRoomHistory] = useState<any[]>([])

    useEffect(() => {
        fetchItem()
    }, [params.id])

    const fetchItem = async () => {
        setIsLoading(true)
        try {
            const res = await fetch(`/api/admin/lost-found/${params.id}`)
            if (res.ok) {
                const json = await res.json()
                const data = json?.data ?? json
                setItem(data)
                if (data.roomId) {
                    fetchRoomHistory(data.roomId)
                }
            } else {
                toast.error('Case dossier not found.')
                router.push('/admin/lost-found')
            }
        } catch (error) {
            console.error(error)
            toast.error('Fatal error accessing vault.')
        } finally {
            setIsLoading(false)
        }
    }

    const fetchRoomHistory = async (roomId: string) => {
        try {
            const res = await fetch(`/api/admin/rooms/${roomId}/history`)
            if (res.ok) {
                const data = await res.json()
                setRoomHistory(data)
            }
        } catch (e) {
            console.error('Failed to fetch intelligence background:', e)
        }
    }

    const handleImageUpdate = async (imageUrl: string) => {
        setIsUpdating(true)
        try {
            const res = await fetch(`/api/admin/lost-found/${params.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: imageUrl })
            })
            if (res.ok) {
                toast.success('Visual evidence updated.')
                setItem((prev: any) => ({ ...prev, image: imageUrl }))
            }
        } catch (e) { toast.error('Update failed.') }
        finally { setIsUpdating(false) }
    }

    const handleAddNote = async () => {
        if (!note) return toast.error('Manifest entry cannot be empty.')
        setIsUpdating(true)
        try {
            const res = await fetch(`/api/admin/lost-found/${params.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newNote: note })
            })
            if (res.ok) {
                toast.success('Dossier entry committed.')
                setNote('')
                fetchItem()
            }
        } catch (e) { toast.error('Commit failure.') }
        finally { setIsUpdating(false) }
    }

    const handleAppendImage = async (imageUrl: string) => {
        setIsUpdating(true)
        try {
            const res = await fetch(`/api/admin/lost-found/${params.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ appendImage: imageUrl })
            })
            if (res.ok) {
                toast.success('Secondary evidence record appended.')
                fetchItem()
            }
        } catch (e) { toast.error('Evidence append failed.') }
        finally { setIsUpdating(false) }
    }

    const handleResolve = async () => {
        setIsUpdating(true)
        try {
            const res = await fetch(`/api/admin/lost-found/${params.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'CLAIMED' })
            })
            if (res.ok) {
                toast.success('Case marked as RESOLVED. Documentation archived.')
                fetchItem()
            }
        } catch (e) { toast.error('Failed to update case.') }
        finally { setIsUpdating(false) }
    }

    const handleDelete = async () => {
        if (!confirm('Permanent deletion of asset record. Continue?')) return
        try {
            const res = await fetch(`/api/admin/lost-found/${params.id}`, { method: 'DELETE' })
            if (res.ok) {
                toast.info('Asset purged from system.')
                router.push('/admin/lost-found')
            }
        } catch (e) { toast.error('Purge failed.') }
    }

    const handleNotify = () => {
        const phone = item.guest?.phone || item.claimerPhone
        if (!phone) return toast.error('No claimant communication channel (phone) found.')

        // Format phone: remove non-digits
        let cleanPhone = phone.replace(/\D/g, '')
        // If 10 digits, add India prefix
        if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`

        const message = `Hello ${item.guest?.name || 'Guest'}, this is ${item.property?.name || 'Hotel Management'}. We found a ${item.name} in ${item.room?.roomNumber ? `Room ${item.room.roomNumber}` : item.location}. Is this yours? Case ID: ${item.id}`
        
        const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
        window.open(waUrl, '_blank')
        toast.success('Opening WhatsApp...')
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Accessing Vault Dossier...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#0d1117] text-gray-300 font-sans">
            {/* ── HEADER ── */}
            <div className="sticky top-0 z-30 bg-[#161b22] border-b border-gray-800 backdrop-blur-md">
                <div className="max-w-[1600px] mx-auto px-8 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-5">
                        <Link
                            href="/admin/lost-found"
                            className="w-10 h-10 border border-gray-700/50 rounded-xl flex items-center justify-center hover:bg-gray-800 text-gray-400 transition-all group"
                        >
                            <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                        </Link>
                <div>
                    <div className="flex items-center gap-2 text-[10px] text-gray-600 font-bold uppercase tracking-widest mb-0.5">
                        <span>SecOps</span>
                        <ChevronRight className="w-3 h-3" />
                        <span>Inventory</span>
                        <ChevronRight className="w-3 h-3" />
                        <span className="text-blue-500">Case Details</span>
                    </div>
                    <h1 className="text-lg font-bold text-white tracking-tight">#{item.id.slice(-12).toUpperCase()}</h1>
                </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-4 py-2 bg-[#0d1117] border border-gray-800 rounded-xl shadow-inner">
                            <span className={cn("w-1.5 h-1.5 rounded-full", item.status === 'FOUND' ? "bg-amber-500" : "bg-blue-500")} />
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">{item.status}</span>
                        </div>
                        {item.status === 'FOUND' && (
                            <button
                                onClick={handleResolve}
                                disabled={isUpdating}
                                className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-blue-900/20 active:scale-95 disabled:opacity-50"
                            >
                                <ShieldCheck className="w-4 h-4" /> Resolve Case
                            </button>
                        )}
                        <button 
                            onClick={handleDelete}
                            className="p-2.5 border border-gray-800 hover:bg-red-600/10 hover:border-red-600/20 text-gray-700 hover:text-red-500 rounded-xl transition-all"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="p-8">
                <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">

                    {/* ── LEFT: CASE DETAILS (8Cols) ── */}
                    <div className="lg:col-span-8 space-y-10">

                        {/* Primary Identity Card */}
                        <div className="bg-[#161b22] border border-gray-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row group">
                            <div className="w-full md:w-96 h-96 relative overflow-hidden shrink-0 border-r border-gray-800 bg-[#0d1117]">
                                <img
                                    src={item.image || "https://images.unsplash.com/photo-1581235720704-06d3acfcba80?q=80&w=600"}
                                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                    alt="item"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#0d1117] to-transparent opacity-40" />
                                <input
                                    type="file"
                                    id="case-image-update"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0]
                                        if (file) {
                                            try {
                                                toast.info('Uploading evidence...')
                                                const { uploadToCloudinary } = await import('@/lib/cloudinary')
                                                const result = await uploadToCloudinary(file, 'lost-found')
                                                handleImageUpdate(result.url)
                                            } catch (error) {
                                                console.error('[CASE_IMAGE_UPLOAD_ERROR]', error)
                                                toast.error('Failed to upload image')
                                            }
                                        }
                                    }}
                                />
                                <label 
                                    htmlFor="case-image-update"
                                    className="absolute bottom-6 right-6 p-3 bg-blue-600 text-white rounded-xl shadow-2xl hover:bg-blue-500 transition-all cursor-pointer active:scale-90 z-20"
                                >
                                    <Camera className="w-5 h-5" />
                                </label>
                            </div>

                            <div className="flex-1 p-12 flex flex-col">
                                <div className="flex items-center gap-3 mb-6">
                                    <span className="px-3 py-1 bg-blue-600/10 border border-blue-600/20 text-blue-500 text-[9px] font-bold uppercase tracking-widest rounded-lg">Property Asset</span>
                                    <span className={cn(
                                        "px-3 py-1 border text-[9px] font-bold uppercase tracking-widest rounded-lg",
                                        item.category === 'ELECTRONICS' ? "bg-purple-600/10 border-purple-600/20 text-purple-400" : "bg-gray-800 border-gray-700 text-gray-500"
                                    )}>{item.category}</span>
                                </div>
                                <h2 className="text-4xl font-bold text-white mb-8 tracking-tight leading-none group-hover:text-blue-400 transition-colors">
                                    {item.name}
                                </h2>
                                <div className="p-8 bg-[#0d1117]/50 border border-gray-800 rounded-2xl shadow-inner relative">
                                    <h4 className="absolute -top-3 left-6 px-3 bg-[#161b22] text-[9px] font-bold text-gray-600 uppercase tracking-widest">Formal Record</h4>
                                    <p className="text-[15px] text-gray-400 font-medium leading-relaxed ">
                                        &quot;{item.description || 'No specialized physical briefing available.'}&quot;
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Intelligence & Data */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            {/* Analysis */}
                            <div className="bg-[#161b22] border border-gray-800 rounded-3xl p-10 shadow-xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-5">
                                    <Fingerprint className="w-16 h-16" />
                                </div>
                                <h3 className="text-xs font-bold text-blue-500 uppercase tracking-[0.2em] mb-8 flex items-center gap-4">
                                    <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(37,99,235,1)]" /> Forensic Metadata
                                </h3>
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center pb-4 border-b border-gray-800/50">
                                        <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Discovery</span>
                                        <span className="text-[13px] font-bold text-gray-200">{new Date(item.createdAt).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center pb-4 border-b border-gray-800/50">
                                        <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Location</span>
                                        <span className="text-[13px] font-bold text-blue-500">{item.room ? `Room ${item.room.roomNumber}` : item.location}</span>
                                    </div>
                                    <div className="flex justify-between items-center pb-4 border-b border-gray-800/50">
                                        <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Reporter</span>
                                        <span className="text-[13px] font-bold text-gray-200">{item.reportedBy?.user?.name || 'Admin'}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">WhatsApp</span>
                                        <span className={cn("text-[10px] font-bold uppercase px-3 py-1 rounded-lg", item.whatsappSent ? "bg-green-600/10 text-green-500" : "bg-gray-800 text-gray-500")}>
                                            {item.whatsappSent ? 'Transmitted' : 'Pending'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Evidence */}
                            <div className="bg-[#161b22] border border-gray-800 rounded-3xl p-10 shadow-xl">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-xs font-bold text-blue-500 uppercase tracking-[0.2em] flex items-center gap-4">
                                        <ImageIcon className="w-4 h-4" /> Evidence Lab
                                    </h3>
                                    <span className="text-[9px] font-bold text-gray-700 uppercase tracking-widest leading-none bg-[#0d1117] px-2 py-1 rounded">Secure Cloud Vault</span>
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="aspect-square bg-[#0d1117] border border-gray-800 rounded-2xl overflow-hidden cursor-pointer group shadow-inner">
                                        <img src={item.image || "https://images.unsplash.com/photo-1581235720704-06d3acfcba80?q=80&w=200"} className="w-full h-full object-cover transition-opacity group-hover:opacity-80" alt="ev1" />
                                    </div>
                                    {item.evidenceImages?.map((img: string, i: number) => (
                                        <div key={i} className="aspect-square bg-[#0d1117] border border-gray-800 rounded-2xl overflow-hidden cursor-pointer group shadow-inner">
                                            <img src={img} className="w-full h-full object-cover transition-opacity group-hover:opacity-80" alt={`ev-${i}`} />
                                        </div>
                                    ))}
                                    <div className="relative">
                                        <input
                                            type="file"
                                            id="append-evidence"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0]
                                                if (file) {
                                                    try {
                                                        toast.info('Uploading evidence...')
                                                        const { uploadToCloudinary } = await import('@/lib/cloudinary')
                                                        const result = await uploadToCloudinary(file, 'lost-found')
                                                        handleAppendImage(result.url)
                                                    } catch (error) {
                                                        console.error('[EVIDENCE_APPEND_ERROR]', error)
                                                        toast.error('Failed to upload evidence')
                                                    }
                                                }
                                            }}
                                        />
                                        <label
                                            htmlFor="append-evidence"
                                            className="aspect-square bg-[#0d1117] border border-dashed border-gray-800 rounded-2xl flex flex-col items-center justify-center gap-3 group hover:border-blue-500 transition-all cursor-pointer w-full"
                                        >
                                            <Plus className="w-6 h-6 text-gray-800 group-hover:text-blue-500 transition-colors" />
                                            <span className="text-[9px] font-bold text-gray-700 uppercase tracking-widest group-hover:text-gray-500">Append Evidence</span>
                                        </label>
                                    </div>
                                    <div
                                        onClick={() => toast.info('Synchronizing with IoT tracking tags...')}
                                        className="col-span-2 py-4 bg-[#0d1117] border border-gray-800 rounded-2xl flex items-center justify-center gap-3 group hover:bg-emerald-600/5 transition-all cursor-pointer"
                                    >
                                        <QrCode className="w-5 h-5 text-gray-700 group-hover:text-emerald-500" />
                                        <span className="text-[9px] font-bold text-gray-700 uppercase tracking-[0.2em] group-hover:text-gray-400 transition-colors">Generate Smart Label</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Log Feed */}
                        <div className="space-y-8">
                            <h3 className="text-xs font-bold text-white uppercase tracking-[0.2em] flex items-center gap-4 px-2">
                                <MessageSquare className="w-4 h-4 text-blue-500" /> Transactional Audit Log
                            </h3>

                            <div className="space-y-6">
                                    <div className="p-8 bg-gradient-to-r from-[#161b22] to-[#0d1117] border border-gray-800 rounded-2xl shadow-xl">
                                        <div className="flex items-start justify-between mb-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-600/20 flex items-center justify-center text-blue-500 shadow-inner">
                                                    <User className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <p className="text-lg font-bold text-white leading-none mb-1">{item.reportedBy?.user?.name || 'System Auto'}</p>
                                                    <p className="text-[9px] text-blue-500 font-bold uppercase tracking-widest">Logging Officer</p>
                                                </div>
                                            </div>
                                            <span className="text-[10px] text-gray-700 font-bold uppercase tracking-widest">{new Date(item.createdAt).toLocaleTimeString()}</span>
                                        </div>
                                        <p className="text-[14px] text-gray-400 font-medium leading-relaxed pl-6 border-l-2 border-blue-600/50 ">
                                            &quot;Asset discovery protocol initiated. Security hash generated. Item transitioned to vault storage.&quot;
                                        </p>
                                    </div>

                                    {item.caseNotes?.map((n: any, i: number) => (
                                        <div key={i} className="p-8 bg-[#161b22] border border-gray-800 rounded-2xl shadow-lg border-l-4 border-l-blue-500/50">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-[10px] font-bold text-gray-400">
                                                        {n.author[0]}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-white leading-none mb-1">{n.author}</p>
                                                        <p className="text-[8px] text-gray-600 font-bold uppercase tracking-widest">Entry #{i+1}</p>
                                                    </div>
                                                </div>
                                                <span className="text-[9px] text-gray-700 font-bold uppercase tracking-widest">{new Date(n.createdAt).toLocaleString()}</span>
                                            </div>
                                            <p className="text-[13px] text-gray-300 font-medium leading-relaxed">
                                                {n.content}
                                            </p>
                                        </div>
                                    ))}

                                    <div className="bg-[#161b22] border border-gray-800 rounded-3xl p-10 shadow-2xl">
                                        <h4 className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-6 ml-1">Update Case Intelligence</h4>
                                        <textarea
                                            value={note}
                                            onChange={(e) => setNote(e.target.value)}
                                            placeholder="Record observation, claimant interactions, or physical state changes..."
                                            className="w-full h-32 bg-[#0d1117] border border-gray-800 rounded-2xl p-6 text-[14px] text-gray-300 placeholder:text-gray-800 outline-none focus:border-blue-500 transition-all font-medium resize-none shadow-inner"
                                        />
                                        <div className="flex items-center justify-end mt-6">
                                            <button
                                                onClick={handleAddNote}
                                                disabled={isUpdating}
                                                className="flex items-center gap-3 px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold uppercase tracking-widest rounded-xl transition-all shadow-xl shadow-blue-900/40 active:scale-95 disabled:opacity-50"
                                            >
                                                Commit Entry <Send className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                            </div>
                        </div>
                    </div>

                    {/* ── RIGHT: COMMAND SIDEBAR (4Cols) ── */}
                    <div className="lg:col-span-4 space-y-10">

                        {/* Status Watch Card (Communication) */}
                        <div className="bg-[#161b22] border border-gray-800 rounded-3xl p-10 shadow-xl relative overflow-hidden">
                            <h4 className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-10">Claimant Interaction</h4>
                            
                            {item.guest || item.claimerPhone ? (
                                <div className="space-y-10">
                                    <div className="p-6 bg-[#0d1117] border border-gray-800 rounded-2xl">
                                        <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-4">Linked Claimant</p>
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-900 flex items-center justify-center text-white shadow-lg">
                                                <User className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-white">{item.guest?.name || item.claimerName || 'Manual Claimant'}</p>
                                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{item.guest?.phone || item.claimerPhone}</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <button 
                                        onClick={handleNotify}
                                        className="w-full py-4 rounded-xl text-[11px] font-bold uppercase tracking-[0.2em] transition-all active:scale-95 shadow-lg bg-emerald-600 text-white shadow-emerald-900/30 hover:bg-emerald-500"
                                    >
                                        WhatsApp Claimant
                                    </button>
                                </div>
                            ) : (
                                <div className="py-10 text-center flex flex-col items-center opacity-40">
                                    <ShieldAlert className="w-12 h-12 text-gray-700 mb-4" />
                                    <p className="text-[11px] font-bold text-gray-700 uppercase tracking-widest">No Claimant Linked</p>
                                </div>
                            )}
                        </div>

                        {/* Recent Room Intelligence */}
                        {item.room && (
                            <div className="bg-[#161b22] border border-gray-800 rounded-3xl p-10 shadow-xl">
                                <h4 className="text-[10px] font-bold text-blue-500 uppercase tracking-[0.2em] mb-8 flex items-center gap-4">
                                    <HistoryIcon className="w-4 h-4" /> Recent Room Intelligence
                                </h4>
                                <div className="space-y-4">
                                    {roomHistory.length === 0 ? (
                                        <div className="h-48 bg-[#0d1117]/50 border border-dashed border-gray-800 rounded-2xl flex items-center justify-center">
                                            <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Scanning History...</p>
                                        </div>
                                    ) : (
                                        roomHistory.map((booking: any) => (
                                            <div key={booking.id} className="p-4 bg-[#0d1117] border border-gray-800 rounded-2xl hover:border-blue-500/30 transition-all group">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div>
                                                        <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">{booking.guest.name}</p>
                                                        <p className="text-[10px] text-gray-500 font-bold">Stay: {new Date(booking.checkIn).toLocaleDateString()} - {new Date(booking.checkOut).toLocaleDateString()}</p>
                                                    </div>
                                                    <span className={cn(
                                                        "px-2 py-0.5 text-[9px] font-bold rounded uppercase",
                                                        booking.status === 'CHECKED_OUT' ? "bg-gray-800 text-gray-500" : "bg-green-600/10 text-green-500"
                                                    )}>
                                                        {booking.status}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-[11px] text-gray-400">
                                                    <Phone className="w-3 h-3 text-gray-600" />
                                                    {booking.guest.phone}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                    <div className="pt-4 border-t border-gray-800/50">
                                        <p className="text-[10px] text-gray-600 font-bold leading-relaxed  uppercase tracking-wider">
                                            Historical records are based on verified checkout timestamps.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Recent Room Intelligence */}
                        {item.room && (
                            <div className="bg-[#161b22] border border-gray-800 rounded-3xl p-10 shadow-xl">
                                <h4 className="text-[10px] font-bold text-blue-500 uppercase tracking-[0.2em] mb-8 flex items-center gap-4">
                                    <HistoryIcon className="w-4 h-4" /> Recent Room Intelligence
                                </h4>
                                <div className="space-y-4">
                                    {roomHistory.length === 0 ? (
                                        <div className="h-48 bg-[#0d1117]/50 border border-dashed border-gray-800 rounded-2xl flex items-center justify-center">
                                            <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Scanning History...</p>
                                        </div>
                                    ) : (
                                        roomHistory.map((booking: any) => (
                                            <div key={booking.id} className="p-4 bg-[#0d1117] border border-gray-800 rounded-2xl hover:border-blue-500/30 transition-all group">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div>
                                                        <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">{booking.guest.name}</p>
                                                        <p className="text-[10px] text-gray-500 font-bold">Stay: {new Date(booking.checkIn).toLocaleDateString()} - {new Date(booking.checkOut).toLocaleDateString()}</p>
                                                    </div>
                                                    <span className={cn(
                                                        "px-2 py-0.5 text-[9px] font-bold rounded uppercase",
                                                        booking.status === 'CHECKED_OUT' ? "bg-gray-800 text-gray-500" : "bg-green-600/10 text-green-500"
                                                    )}>
                                                        {booking.status}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-[11px] text-gray-400">
                                                    <Phone className="w-3 h-3 text-gray-600" />
                                                    {booking.guest.phone}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                    <div className="pt-4 border-t border-gray-800/50">
                                        <p className="text-[10px] text-gray-600 font-bold leading-relaxed  uppercase tracking-wider">
                                            Historical records are based on verified checkout timestamps.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Context & Provenance */}
                        <div className="bg-[#161b22] border border-gray-800 rounded-3xl p-10 shadow-xl group cursor-help">
                            <h4 className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-8">Discovery Provenance</h4>
                            <div className="mb-8 h-48 bg-[#0d1117] rounded-2xl overflow-hidden relative border border-gray-800 shadow-inner group">
                                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1541818138543-5290b23023b1?q=80&w=600')] bg-cover bg-center opacity-20 group-hover:opacity-40 transition-opacity" />
                                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                                    <MapPin className="w-10 h-10 text-blue-600 mb-4 shadow-[0_0_15px_rgba(37,99,235,0.4)]" />
                                    <p className="text-[16px] font-bold text-white tracking-tight leading-tight mb-2">
                                        {item.room ? `Room ${item.room.roomNumber}` : (item.location || 'Undisclosed')}
                                    </p>
                                    <p className="text-[9px] text-gray-600 font-bold uppercase tracking-[0.2em]">Verified Secure Zone</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest  ml-1 leading-relaxed">
                                    &quot;Discovery confirmed at this physical location. Security footage and audit trails are cross-referenced.&quot;
                                </p>
                                <button className="w-full py-4 border border-gray-800 hover:bg-gray-800 text-[10px] font-bold text-gray-500 hover:text-white uppercase tracking-widest rounded-xl transition-all">
                                    Review Surveillance
                                </button>
                            </div>
                        </div>

                        {/* protocol */}
                        <div className="bg-gradient-to-b from-blue-900/20 to-transparent border border-blue-500/20 rounded-3xl p-12 text-center shadow-[0_0_50px_rgba(30,58,138,0.2)]">
                            <h4 className="text-2xl font-bold text-white mb-4 tracking-tighter">Chain of Custody</h4>
                            <p className="text-xs text-blue-300 font-medium mb-10 leading-relaxed uppercase tracking-widest opacity-60">
                                Official property return manifests ready for execution.
                            </p>
                            <button 
                                onClick={handleResolve}
                                className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold uppercase tracking-[0.2em] rounded-2xl shadow-[0_20px_40px_rgba(37,99,235,0.2)] transition-all active:scale-95"
                            >
                                Execute Asset Release
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
