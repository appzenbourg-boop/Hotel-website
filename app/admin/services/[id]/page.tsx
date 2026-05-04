'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
    ChevronRight, X, Clock, AlertTriangle, CheckCircle2,
    LayoutGrid, User, MessageSquare, ArrowUpRight,
    Utensils, Brush, Settings as Tools, Shirt, AlertCircle,
    History, Camera, Plus, ShieldAlert, List, Search,
    Mail, Phone
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { format, differenceInMinutes, differenceInSeconds } from 'date-fns'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import { Loader2 } from 'lucide-react'

/* ───────────────── helpers (Sync with main page) ───────────────── */
const getServiceIcon = (type: string) => {
    switch (type) {
        case 'FOOD_ORDER': return <Utensils className="w-5 h-5" />
        case 'HOUSEKEEPING': return <Brush className="w-5 h-5" />
        case 'MAINTENANCE': return <Tools className="w-5 h-5" />
        case 'LAUNDRY': return <Shirt className="w-5 h-5" />
        default: return <AlertCircle className="w-5 h-5" />
    }
}

const getStatusStyle = (status: string) => {
    switch (status) {
        case 'OVERDUE': return 'bg-rose-500/10 text-rose-500 border-rose-500/20'
        case 'IN_PROGRESS': return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
        case 'COMPLETED': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
        case 'ACCEPTED': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
        case 'PENDING': return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
        default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
    }
}

export default function ServiceDetailPage() {
    const params = useParams()
    const router = useRouter()
    const id = params.id as string

    const [detail, setDetail] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [now, setNow] = useState(new Date())
    const [staffList, setStaffList] = useState<any[]>([])
    const [isUpdating, setIsUpdating] = useState(false)
    const [message, setMessage] = useState('')
    const [sendingMessage, setSendingMessage] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isUploadingImage, setIsUploadingImage] = useState(false)

    const fetchDetail = useCallback(async () => {
        if (!id || id === 'undefined' || id === '[id]') return
        setLoading(true)
        try {
            const res = await fetch(`/api/admin/services/${id}`)
            if (res.ok) {
                const json = await res.json()
                setDetail(json?.data ?? json)
            }
            else {
                toast.error('Service not found')
                router.push('/admin/services')
            }
        } catch { toast.error('Failed to load detail') }
        finally { setLoading(false) }
    }, [id, router])

    const fetchStaff = async () => {
        const res = await fetch('/api/admin/staff?activeOnly=true')
        if (res.ok) {
            const json = await res.json()
            setStaffList(Array.isArray(json) ? json : (json?.data ?? []))
        }
    }

    useEffect(() => {
        fetchDetail()
        fetchStaff()
        const timer = setInterval(() => setNow(new Date()), 1000)
        return () => clearInterval(timer)
    }, [fetchDetail])

    const handleUpdateStatus = async (status: string) => {
        setIsUpdating(true)
        try {
            const res = await fetch('/api/admin/services/assign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestId: id, status })
            })
            if (res.ok) {
                toast.success(`Order ${status.toLowerCase()}`)
                fetchDetail()
            } else {
                const errText = res.status === 401 ? 'Unauthorized: Permission denied' : 'API Error'
                toast.error(errText)
            }
        } catch (err) { 
            console.error(err)
            toast.error('Update failed. Check network.') 
        }
        finally { setIsUpdating(false) }
    }

    const handleAssign = async (staffId: string) => {
        setIsUpdating(true)
        try {
            const res = await fetch('/api/admin/services/assign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestId: id, assignedToId: staffId })
            })
            if (res.ok) {
                toast.success('Assigned successfully')
                fetchDetail()
            }
        } catch { toast.error('Assignment failed') }
        finally { setIsUpdating(false) }
    }

    const handleSendMessage = async () => {
        if (!message.trim()) return
        setSendingMessage(true)
        try {
            const res = await fetch('/api/staff/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: message,
                    serviceRequestId: id,
                    category: 'TEAM'
                })
            })
            if (res.ok) {
                setMessage('')
                fetchDetail()
                toast.success('Message sent to team')
            }
        } catch { toast.error('Failed to send message') }
        finally { setSendingMessage(false) }
    }

    const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsUploadingImage(true)
        try {
            const { uploadToCloudinary } = await import('@/lib/cloudinary')
            const url = await uploadToCloudinary(file)
            
            const currentAttachments = detail.attachments || []
            const newAttachments = [...currentAttachments, url]

            const res = await fetch(`/api/admin/services/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ attachments: newAttachments })
            })

            if (res.ok) {
                toast.success('Photo added')
                fetchDetail()
            }
        } catch {
            toast.error('Failed to upload image')
        } finally {
            setIsUploadingImage(false)
        }
    }

    const handleMessageGuest = async () => {
        if (!detail.guest?.userId) {
            return toast.error('Guest does not have an active app account')
        }

        const msg = window.prompt(`Send a message to ${detail.guest.name}:`)
        if (!msg?.trim()) return

        setIsUpdating(true)
        try {
            const res = await fetch('/api/admin/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    receiverId: detail.guest.userId,
                    content: msg.trim(),
                    category: 'GUEST'
                })
            })
            if (res.ok) {
                toast.success('Message sent to guest')
            } else {
                toast.error('Failed to send message')
            }
        } catch {
            toast.error('Error sending message')
        } finally {
            setIsUpdating(false)
        }
    }

    const handleEscalate = async () => {
        setIsUpdating(true)
        try {
            const res = await fetch('/api/admin/services/assign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestId: id, priority: 'URGENT' })
            })
            if (res.ok) {
                toast.success('Order escalated to URGENT')
                // Also send an internal message about escalation
                await fetch('/api/staff/messages', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        content: '⚠️ This request has been escalated to URGENT priority by management.',
                        serviceRequestId: id,
                        category: 'TEAM'
                    })
                }).catch(() => {})
                fetchDetail()
            } else {
                toast.error('Escalation failed')
            }
        } catch { toast.error('Escalation failed') }
        finally { setIsUpdating(false) }
    }

    const handlePriorityChange = async (p: string) => {
        if (p === detail.priority) return
        setIsUpdating(true)
        try {
            const res = await fetch('/api/admin/services/assign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestId: id, priority: p })
            })
            if (res.ok) {
                toast.success(`Priority updated to ${p}`)
                fetchDetail()
            }
        } catch { toast.error('Update failed') }
        finally { setIsUpdating(false) }
    }

    if (loading) return (
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
        </div>
    )

    if (!detail) return null

    const timeStr = detail.createdAt
    const completionTime = detail.completedAt ? new Date(detail.completedAt) : now
    const start = new Date(timeStr)
    const diffMins = differenceInMinutes(completionTime, start)
    const diffSecs = differenceInSeconds(completionTime, start) % 60
    const slaLimit = detail.slaMinutes || 30
    const slaPercent = Math.min(100, (diffMins / slaLimit) * 100)
    const isCompleted = detail.status === 'COMPLETED'

    return (
        <div className="flex flex-col min-h-screen bg-[#101922] text-gray-300 pb-20">
            {/* ── TOP NAV / HEADER ── */}
            <div className="p-6 pb-2">
                <div className="flex items-center gap-2 text-[11px] text-gray-500 font-bold uppercase tracking-widest mb-4">
                    <Link href="/admin/dashboard" className="hover:text-gray-300">Dashboard</Link>
                    <ChevronRight className="w-3 h-3" />
                    <Link href="/admin/services" className="hover:text-gray-300">Services</Link>
                    <ChevronRight className="w-3 h-3" />
                    <span className="text-blue-400">#SO-{detail.id.slice(-4).toUpperCase()}</span>
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-4 mb-2">
                            <h1 className="text-2xl font-black text-white tracking-tight">
                                Service Order #SO-{detail.id.slice(-4).toUpperCase()}
                            </h1>
                            <span className={cn('px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] rounded-full border', getStatusStyle(detail.status))}>
                                {detail.status === 'ACCEPTED' ? 'OPEN' : detail.status}
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">
                            Created {format(new Date(detail.createdAt), 'MMM dd, yyyy · hh:mm a')}
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleEscalate}
                            disabled={isCompleted || isUpdating || detail.priority === 'URGENT'}
                            className={cn(
                                "px-5 py-2 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-white text-[12px] font-bold rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed",
                                detail.priority === 'URGENT' && "bg-rose-500/10 text-rose-500 border-rose-500/20 opacity-100"
                            )}
                        >
                            {detail.priority === 'URGENT' ? 'Escalated' : 'Escalate'}
                        </button>
                        <button
                            onClick={() => handleUpdateStatus('COMPLETED')}
                            disabled={isCompleted || isUpdating}
                            className={cn(
                                "flex items-center gap-2 px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white text-[12px] font-black uppercase tracking-widest rounded-xl shadow-xl shadow-blue-500/20 transition-all active:scale-95",
                                isCompleted && "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-none hover:bg-emerald-500/10 cursor-default"
                            )}
                        >
                            <CheckCircle2 className="w-4 h-4" /> 
                            {isCompleted ? 'Order Resolved' : 'Resolve Order'}
                        </button>
                    </div>
                </div>
            </div>

            {/* ── MAIN CONTENT GRID ── */}
            <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* ═══ LEFT COLUMN (2/3) ═══ */}
                <div className="lg:col-span-2 space-y-8">

                    {/* SLA TIMER CARD */}
                    <div className="bg-[#233648] border border-white/[0.06] rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="flex gap-2">
                                    {[
                                        { val: Math.floor(diffMins / 60), label: 'Hr' },
                                        { val: diffMins % 60, label: 'Min' },
                                        { val: diffSecs, label: 'Sec' }
                                    ].map((t, idx) => (
                                        <div key={idx} className="flex flex-col items-center">
                                            <div className="w-12 h-12 bg-[#101922] rounded-xl flex items-center justify-center text-xl font-black text-white shadow-inner border border-white/[0.04]">
                                                {t.val.toString().padStart(2, '0')}
                                            </div>
                                            <span className="text-[9px] text-gray-500 font-black uppercase mt-1.5 tracking-widest">{t.label}</span>
                                        </div>
                                    ))}
                                </div>
                                <span className="text-xl font-black text-gray-700">:</span>
                            </div>

                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <Clock className={cn("w-4 h-4", isCompleted ? "text-emerald-500" : "text-orange-500")} />
                                        <span className="text-[11px] font-black text-white uppercase tracking-widest">
                                            {isCompleted ? 'Resolved Time' : 'SLA Timer'}
                                        </span>
                                    </div>
                                    <span className={cn("text-[10px] font-black uppercase tracking-widest", 
                                        isCompleted ? "text-emerald-500" : 
                                        slaPercent > 80 ? "text-rose-500" : "text-orange-400"
                                    )}>
                                        {isCompleted ? 'Completed On Time' : slaPercent > 80 ? 'CRITICAL BREACH' : 'Approaching Breach'}
                                    </span>
                                </div>
                                <div className="h-3 bg-[#101922] rounded-full overflow-hidden border border-white/[0.04] p-0.5">
                                    <div
                                        className={cn("h-full rounded-full transition-all duration-1000", slaPercent > 80 ? "bg-rose-500" : "bg-orange-500")}
                                        style={{ width: `${slaPercent}%` }}
                                    />
                                </div>
                                <p className="text-[11px] text-gray-500 mt-3 font-bold">
                                    Target resolution time: {slaLimit} minutes.
                                    {detail.type === 'FOOD_ORDER' && " This includes time for cooking and staff transfer."}
                                </p>
                            </div>
                        </div>
                        {/* Background subtle mesh gradient or glow */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-[100px] pointer-events-none group-hover:bg-orange-500/10 transition-all" />
                    </div>

                    {/* REQUEST DETAILS CARD */}
                    <div className="bg-[#233648] border border-white/[0.06] rounded-3xl shadow-2xl overflow-hidden">
                        <div className="p-6 border-b border-white/[0.06] flex items-center gap-3">
                            <List className="w-5 h-5 text-blue-400" />
                            <h3 className="text-base font-black text-white uppercase tracking-tight">Request Details</h3>
                        </div>
                        <div className="p-8 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] block">Service Type</label>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                                            {getServiceIcon(detail.type)}
                                        </div>
                                        <span className="text-base font-black text-white capitalize">{detail.type.replace('_', ' ').toLowerCase()}</span>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] block">Specific Item</label>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
                                            <AlertCircle className="w-4 h-4" />
                                        </div>
                                        <span className="text-base font-black text-white">{detail.title}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] block">Description</label>
                                <div className="bg-[#101922] border border-white/[0.04] rounded-xl p-5 text-gray-400 leading-relaxed text-[13px] font-medium  shadow-inner">
                                    &quot;{detail.description || 'No description provided.'}&quot;
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[11px] text-gray-500 font-black uppercase tracking-[0.2em] block">Attachments</label>
                                <div className="flex flex-wrap gap-4">
                                    {detail.attachments?.map((url: string, idx: number) => (
                                        <div key={idx} className="w-32 h-32 rounded-2xl border border-white/[0.08] overflow-hidden group relative cursor-pointer shadow-lg hover:border-blue-500/40 transition-all">
                                            <img src={url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                <Search className="w-6 h-6 text-white" />
                                            </div>
                                        </div>
                                    ))}
                                    <input 
                                        type="file" 
                                        className="hidden" 
                                        ref={fileInputRef} 
                                        accept="image/*"
                                        onChange={handleUploadImage}
                                    />
                                    <button 
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isUploadingImage}
                                        className="w-32 h-32 rounded-2xl border-2 border-dashed border-white/[0.06] hover:border-blue-500/30 hover:bg-white/[0.02] flex flex-col items-center justify-center gap-2 transition-all disabled:opacity-50"
                                    >
                                        {isUploadingImage ? (
                                            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                                        ) : (
                                            <>
                                                <Camera className="w-6 h-6 text-gray-600" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">Add Photo</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ACTIVITY TIMELINE */}
                    <div className="bg-[#233648] border border-white/[0.06] rounded-3xl shadow-2xl overflow-hidden">
                        <div className="p-6 border-b border-white/[0.06] flex items-center gap-3">
                            <History className="w-5 h-5 text-indigo-400" />
                            <h3 className="text-lg font-black text-white uppercase tracking-tight">Activity Timeline</h3>
                        </div>
                        <div className="p-8 pb-12 relative">
                            {/* Vertical Line */}
                            <div className="absolute left-11 top-12 bottom-12 w-[2px] bg-gradient-to-b from-blue-500/40 via-indigo-500/20 to-transparent" />

                            <div className="space-y-10">
                                {detail.acceptedAt && (
                                    <div className="flex gap-6 relative z-10">
                                        <div className="w-6 h-6 rounded-full bg-[#1db954] ring-4 ring-[#1db954]/20 flex items-center justify-center shadow-lg shadow-[#1db954]/20">
                                            <CheckCircle2 className="w-3 h-3 text-white" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-1">
                                                <h4 className="text-sm font-black text-white uppercase tracking-wider">Order Accepted</h4>
                                                <span className="text-[11px] text-gray-600 font-bold">{format(new Date(detail.acceptedAt), 'hh:mm a')}</span>
                                            </div>
                                            <p className="text-[11px] text-gray-500">Service order acknowledged and assigned to staff member.</p>
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-6 relative z-10">
                                    <div className="w-6 h-6 rounded-full bg-blue-500 ring-4 ring-blue-500/20 flex items-center justify-center shadow-lg shadow-blue-500/20">
                                        <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <h4 className="text-sm font-black text-white uppercase tracking-wider">Request Created</h4>
                                            <span className="text-[11px] text-gray-600 font-bold">{format(new Date(detail.createdAt), 'hh:mm a')}</span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-2">
                                            <div className="w-5 h-5 rounded-full bg-amber-500/10 flex items-center justify-center text-[9px] font-black text-amber-500 border border-amber-500/20">
                                                {detail.guest?.name?.charAt(0) || 'G'}
                                            </div>
                                            <p className="text-[11px] text-gray-500">Submitted by <span className="text-gray-300 font-bold">{detail.guest?.name}</span> via Mobile App</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* STAFF CHAT / COMMS */}
                    <div className="bg-[#233648] border border-white/[0.06] rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[500px]">
                        <div className="p-6 border-b border-white/[0.06] flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <MessageSquare className="w-5 h-5 text-blue-400" />
                                <h3 className="text-lg font-black text-white uppercase tracking-tight">Staff Communications</h3>
                            </div>
                            <span className="text-[10px] font-black uppercase bg-blue-500/10 text-blue-500 px-3 py-1 rounded-lg border border-blue-500/20">Internal Only</span>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-8 space-y-6">
                            {detail.messages?.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                                    <MessageSquare className="w-12 h-12 mb-4" />
                                    <p className="text-xs font-black uppercase tracking-widest">No messages yet</p>
                                    <p className="text-[10px] font-bold mt-2">Start a conversation with the assigned staff</p>
                                </div>
                            ) : (
                                detail.messages?.map((msg: any) => (
                                    <div key={msg.id} className={cn("flex flex-col max-w-[80%]", msg.category === 'TEAM' ? "ml-auto items-end" : "items-start")}>
                                        <div className={cn(
                                            "p-4 rounded-2xl text-sm font-medium",
                                            msg.category === 'TEAM' ? "bg-blue-600 text-white rounded-tr-none" : "bg-[#101922] text-gray-300 rounded-tl-none border border-white/[0.04]"
                                        )}>
                                            {msg.content}
                                        </div>
                                        <span className="text-[9px] font-black uppercase text-gray-600 mt-2 tracking-widest">
                                            {format(new Date(msg.createdAt), 'hh:mm a')}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="p-6 border-t border-white/[0.06] bg-[#101922]/50">
                            <div className="flex gap-4">
                                <input 
                                    type="text"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Type a message for the team..."
                                    className="flex-1 bg-[#101922] border border-white/[0.06] rounded-xl px-5 py-3 text-sm text-white placeholder:text-gray-700 outline-none focus:border-blue-500/30 transition-all font-bold"
                                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                />
                                <button 
                                    onClick={handleSendMessage}
                                    disabled={sendingMessage || !message.trim()}
                                    className="w-12 h-12 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                                >
                                    {sendingMessage ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ═══ RIGHT COLUMN (1/3) ═══ */}
                <div className="space-y-8">

                    {/* GUEST PROFILE CARD */}
                    <div className="bg-[#233648] border border-white/[0.06] rounded-3xl shadow-2xl overflow-hidden group">
                        <div className="p-6 border-b border-white/[0.06] bg-gradient-to-r from-amber-500/5 to-transparent">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl ring-2 ring-amber-500/20 p-1 group-hover:ring-amber-500/40 transition-all duration-500">
                                        <div className="w-full h-full rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 font-black text-xl overflow-hidden shadow-inner">
                                            {detail.guest?.image ? <img src={detail.guest.image} alt="" className="w-full h-full object-cover" /> : detail.guest?.name?.charAt(0)}
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-black text-white leading-none">{detail.guest?.name}</h4>
                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Premium Member</p>
                                    </div>
                                </div>
                                <span className="px-3 py-1 bg-amber-500/10 text-amber-500 text-[9px] font-black uppercase tracking-[0.2em] rounded-lg border border-amber-500/20 shadow-lg shadow-amber-500/5">
                                    VIP GOLD
                                </span>
                            </div>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="bg-[#101922] border border-white/[0.04] rounded-xl p-5 ring-1 ring-white/[0.02] shadow-inner group-hover:border-blue-500/20 transition-all">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2 text-gray-500">
                                        <LayoutGrid className="w-4 h-4 text-blue-500" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Active Room</span>
                                    </div>
                                    <span className="text-2xl font-black text-white tracking-tight shadow-blue-500/20 drop-shadow-lg">{detail.room?.roomNumber}</span>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-gray-600 font-black uppercase tracking-tighter">
                                    <span className="px-2 py-0.5 bg-white/[0.04] rounded-md border border-white/[0.04]">Floor {detail.room?.floor || '1'}</span>
                                    <span className="px-2 py-0.5 bg-white/[0.04] rounded-md border border-white/[0.04]">Premium Suite</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <span className="text-[10px] text-gray-600 font-black uppercase tracking-widest block">Check-in</span>
                                    <span className="text-sm font-black text-white">
                                        {detail.guest?.bookings?.[0]?.checkIn ? format(new Date(detail.guest.bookings[0].checkIn), 'MMM dd, yyyy') : 'Oct 20, 2023'}
                                    </span>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[10px] text-gray-600 font-black uppercase tracking-widest block">Check-out</span>
                                    <span className="text-sm font-black text-white">
                                        {detail.guest?.bookings?.[0]?.checkOut ? format(new Date(detail.guest.bookings[0].checkOut), 'MMM dd, yyyy') : 'Oct 27, 2023'}
                                    </span>
                                </div>
                            </div>

                            <button 
                                onClick={handleMessageGuest}
                                disabled={isUpdating}
                                className="w-full flex items-center justify-center gap-2 py-4 bg-blue-500/5 hover:bg-blue-500/10 text-blue-400 text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl border border-blue-500/20 transition-all shadow-lg group-hover:shadow-blue-500/5 disabled:opacity-50"
                            >
                                <MessageSquare className="w-4 h-4" /> Message Guest
                            </button>
                        </div>
                    </div>

                    {/* MANAGEMENT CARD */}
                    <div className="bg-[#233648] border border-white/[0.06] rounded-3xl shadow-2xl overflow-hidden">
                        <div className="p-6 border-b border-white/[0.06] flex items-center gap-3">
                            <Tools className="w-5 h-5 text-gray-500" />
                            <h3 className="text-base font-black text-white uppercase tracking-tight">Management</h3>
                        </div>
                        <div className="p-8 space-y-8">
                            <div>
                                <label className="text-[10px] text-gray-600 font-black uppercase tracking-widest mb-3 block">Assigned To</label>
                                <div className="space-y-4">
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                                            <div className="w-7 h-7 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center">
                                                <User className="w-4 h-4 text-gray-500" />
                                            </div>
                                        </div>
                                        <select
                                            value={detail.assignedToId || ''}
                                            onChange={(e) => handleAssign(e.target.value)}
                                            className="w-full bg-[#101922] border border-white/[0.06] rounded-xl pl-14 pr-10 py-3 text-sm text-white font-black outline-none hover:border-blue-500/30 transition-all cursor-pointer appearance-none shadow-inner"
                                        >
                                            <option value="">Unassigned</option>
                                            {staffList.map(s => <option key={s.id} value={s.id}>{s.name || s.user?.name}</option>)}
                                        </select>
                                        <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 rotate-90 pointer-events-none" />
                                    </div>

                                    {detail.assignedTo && (
                                        <div className="bg-[#101922] border border-white/[0.06] rounded-2xl p-4 space-y-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 font-black relative overflow-hidden">
                                                    {detail.assignedTo.profilePhoto ? (
                                                        <img src={detail.assignedTo.profilePhoto} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <User className="w-5 h-5" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-sm font-black text-white truncate">{detail.assignedTo.user?.name}</h4>
                                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest truncate">{detail.assignedTo.designation || detail.assignedTo.department}</p>
                                                </div>
                                            </div>

                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        const email = detail.assignedTo.user?.email;
                                                        if (email) window.location.href = `mailto:${email}`;
                                                        else toast.error('No email found for staff');
                                                    }}
                                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white/[0.04] hover:bg-white/[0.08] text-white text-[10px] font-black uppercase tracking-widest rounded-xl border border-white/[0.06] transition-all"
                                                >
                                                    <Mail className="w-3.5 h-3.5" /> Email
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const phone = detail.assignedTo.user?.phone;
                                                        if (phone) window.location.href = `tel:${phone}`;
                                                        else toast.error('No phone number found for staff');
                                                    }}
                                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-xl border border-blue-500/20 transition-all"
                                                >
                                                    <Phone className="w-3.5 h-3.5" /> Call
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] text-gray-600 font-black uppercase tracking-widest mb-3 block">Priority</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {['LOW', 'NORMAL', 'HIGH'].map(p => (
                                        <button
                                            key={p}
                                            onClick={() => handlePriorityChange(p)}
                                            disabled={isUpdating || isCompleted}
                                            className={cn(
                                                "py-2 text-[9px] font-black uppercase tracking-widest rounded-xl border transition-all shadow-sm disabled:opacity-50",
                                                detail.priority === p
                                                    ? p === 'HIGH' ? "bg-orange-500 text-white border-orange-500 shadow-xl shadow-orange-500/20"
                                                        : "bg-white/10 text-white border-white/20"
                                                    : "bg-[#101922] text-gray-600 border-white/[0.04] hover:border-white/10"
                                            )}
                                        >
                                            {p === 'NORMAL' ? 'Med' : p.charAt(0) + p.slice(1).toLowerCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] text-gray-600 font-black uppercase tracking-widest mb-3 block">Internal Note</label>
                                <div className="relative group">
                                    <textarea
                                        placeholder="Add a note for the team..."
                                        className="w-full bg-[#101922] border border-white/[0.06] rounded-xl p-5 text-sm text-white placeholder:text-gray-700 outline-none focus:border-blue-500/40 min-h-[120px] resize-none pb-14 shadow-inner group-hover:border-white/10 transition-all"
                                    />
                                    <button className="absolute bottom-3 right-3 w-9 h-9 bg-blue-500 hover:bg-blue-600 text-white rounded-xl flex items-center justify-center transition-all shadow-xl active:scale-95 group/btn">
                                        <ArrowUpRight className="w-4 h-4 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    )
}
