'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { format } from 'date-fns'
import {
    ArrowLeft, Mail, Phone, MessageSquare, Edit, LogOut,
    Upload, CheckCircle2, Loader2, X, Plus, FileCheck, Star,
    User, MapPin, Calendar, CreditCard, Clock, History, Settings, FileText, Download, Printer
} from 'lucide-react'
import { cn, validateGSTIN } from '@/lib/utils'
import { toast } from 'sonner'
import Avatar from '@/components/common/Avatar'
import ImageLightboxModal, { LightboxImage } from '@/components/common/ImageLightboxModal'
import { Maximize2 } from 'lucide-react'
import { InvoiceModal } from '@/components/admin/InvoiceModal'

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
    RESERVED: { label: 'Reserved', cls: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
    CHECKED_IN: { label: 'Active', cls: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
    CHECKED_OUT: { label: 'Completed', cls: 'bg-gray-500/10 text-text-secondary border-gray-500/20' },
    CANCELLED: { label: 'Cancelled', cls: 'bg-rose-500/10 text-rose-500 border-rose-500/20' },
    COMPLETED: { label: 'Completed', cls: 'bg-gray-500/10 text-text-secondary border-gray-500/20' } }

export default function GuestDetailPage() {
    const params = useParams()
    const router = useRouter()
    const guestId = params.id as string

    const [guest, setGuest] = useState<any>(null)
    const [bookings, setBookings] = useState<any[]>([])
    const [services, setServices] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [note, setNote] = useState('')
    const [notes, setNotes] = useState<{ author: string; time: string; text: string }[]>([])
    const [preferences, setPreferences] = useState<string[]>([])
    const [newPref, setNewPref] = useState('')
    const [uploading, setUploading] = useState<'front' | 'back' | null>(null)
    const [isEditing, setIsEditing] = useState(false)
    const [editForm, setEditForm] = useState<any>({})
    const [invoiceBooking, setInvoiceBooking] = useState<any>(null)
    const [lightboxState, setLightboxState] = useState<{ isOpen: boolean; initialIndex: number }>({ isOpen: false, initialIndex: 0 })

    const frontRef = useRef<HTMLInputElement>(null)
    const backRef = useRef<HTMLInputElement>(null)

    const fetchGuest = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/admin/guests/${guestId}/detail`)
            if (res.ok) {
                const data = await res.json()
                setGuest(data.guest)
                setBookings(data.bookings || [])
                setServices(data.services || [])
                setNotes(data.notes || [])
                setPreferences(data.guest.preferences || ['High Floor', 'Near Elevator', 'Vegetarian'])
                setEditForm({
                    name: data.guest.name,
                    email: data.guest.email,
                    phone: data.guest.phone,
                    address: data.guest.address,
                    dateOfBirth: data.guest.dateOfBirth ? format(new Date(data.guest.dateOfBirth), 'yyyy-MM-dd') : '',
                    idType: data.guest.idType || '',
                    idNumber: data.guest.idNumber || '',
                    gstNumber: data.guest.gstNumber || '',
                    language: data.guest.language || 'English'
                })
            } else { toast.error('Failed to load guest') }
        } catch { toast.error('Network error') }
        finally { setLoading(false) }
    }

    useEffect(() => { fetchGuest() }, [guestId])

    const handleUpload = async (side: 'front' | 'back', file: File) => {
        setUploading(side)
        const fd = new FormData()
        fd.append('file', file)
        fd.append('side', side)
        fd.append('guestId', guestId)
        try {
            const res = await fetch('/api/admin/guests/upload', { method: 'POST', body: fd })
            if (res.ok) {
                const data = await res.json()
                setGuest((prev: any) => ({
                    ...prev,
                    idDocumentFront: side === 'front' ? data.url : prev.idDocumentFront,
                    idDocumentBack: side === 'back' ? data.url : prev.idDocumentBack }))
                toast.success(`${side === 'front' ? 'Front' : 'Back'} document uploaded`)
            } else { toast.error('Upload failed') }
        } catch { toast.error('Upload failed') }
        finally { setUploading(null) }
    }

    const handleUpdate = async () => {
        try {
            const res = await fetch(`/api/admin/guests/${guestId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm) })
            if (res.ok) {
                toast.success('Profile updated')
                setIsEditing(false)
                fetchGuest()
            } else { toast.error('Update failed') }
        } catch { toast.error('Update failed') }
    }

    if (loading) return <div className="flex items-center justify-center h-screen bg-background"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
    if (!guest) return <div className="flex flex-col items-center justify-center h-screen bg-background text-text-secondary gap-4"><p>Guest not found</p><button onClick={() => router.back()} className="px-6 py-2 bg-blue-600 text-white">Go Back</button></div>

    const totalBill = bookings.reduce((s, b) => s + (b.totalAmount || 0), 0)
    const paidAmount = bookings.reduce((s, b) => s + (b.paidAmount || 0), 0)
    const dueBalance = totalBill - paidAmount
    const activeBooking = bookings.find(b => b.status === 'CHECKED_IN')

    return (
        <>
        <div className="min-h-screen bg-background text-text-secondary p-4 lg:p-8 space-y-6 animate-fade-in">
            
            {/* Header / Breadcrumb */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push('/admin/guests')} className="p-2 hover:bg-white/5 rounded-full transition-colors text-text-tertiary hover:text-text-primary"><ArrowLeft className="w-5 h-5" /></button>
                    <div>
                        <h1 className="text-2xl font-bold text-text-primary tracking-tight leading-none">{guest.name}</h1>
                        <p className="text-[10px] text-text-tertiary font-bold tracking-[0.2em] uppercase mt-1">Guest Repository / Profile</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-5 py-2.5 bg-surface-light hover:bg-white/10 border border-border/50 rounded-xl text-xs font-bold uppercase tracking-widest text-text-primary transition-all shadow-lg active:scale-95" onClick={() => setIsEditing(true)}>
                        <Edit className="w-4 h-4 text-blue-500" /> Edit Profile
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Left Sidebar: Profile & Info */}
                <div className="lg:col-span-4 space-y-6">
                    
                    {/* Main Identity Card */}
                    <div className="bg-surface border border-border rounded-[2.5rem] p-10 flex flex-col items-center text-center space-y-6 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-full h-1 bg-blue-500/50" />
                        <Avatar name={guest.name} size="xl" className="w-28 h-28 ring-8 ring-blue-500/5 group-hover:ring-blue-500/10 transition-all duration-500 shadow-2xl" />
                        <div>
                            <h2 className="text-2xl font-bold text-text-primary tracking-tight">{guest.name}</h2>
                            <p className="text-[11px] font-bold text-text-tertiary uppercase tracking-[0.2em] mt-1">{guest.email || 'Email missing'}</p>
                        </div>
                        <div className="flex flex-wrap justify-center gap-2 pt-2">
                            {activeBooking && <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[9px] font-bold uppercase rounded-full border border-emerald-500/20 tracking-widest">Active Stay</span>}
                            {guest.checkInStatus === 'VERIFIED' && <span className="px-3 py-1 bg-blue-500/10 text-blue-500 text-[9px] font-bold uppercase rounded-full border border-blue-500/20 tracking-widest">Verified Guest</span>}
                        </div>
                    </div>

                    {/* Systematic Detail List */}
                    <div className="bg-surface border border-border rounded-[2.5rem] p-8 space-y-8 shadow-xl">
                        <h3 className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.3em] px-2 mb-2">Member Profiles</h3>
                        
                        <div className="space-y-2">
                            {[
                                { icon: Phone, label: 'Contact', value: `+91 ${guest.phone}`, color: 'text-blue-500' },
                                { icon: Calendar, label: 'DOB', value: guest.dateOfBirth ? format(new Date(guest.dateOfBirth), 'dd MMMM yyyy') : 'D.O.B Not Set', color: 'text-rose-500' },
                                { icon: MapPin, label: 'Address', value: guest.address || 'Address Not Provided', color: 'text-emerald-500' },
                                { icon: CreditCard, label: 'Identification', value: guest.idType ? `${guest.idType} : ${guest.idNumber}` : 'ID Not Available', color: 'text-amber-500' },
                                { icon: FileText, label: 'Guest GSTIN', value: guest.gstNumber || 'B2C / Not Set', color: 'text-indigo-400' },
                                { icon: Star, label: 'Language', value: guest.language || 'English', color: 'text-purple-500' },
                            ].map((item, i) => (
                                <div key={i} className="flex items-start gap-4 p-4 hover:bg-surface-light rounded-2xl transition-all group">
                                    <div className={cn("mt-1 p-2.5 rounded-xl bg-white/5 transition-colors group-hover:bg-white/10 shrink-0", item.color)}>
                                        <item.icon className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-0.5">{item.label}</p>
                                        <p className="text-[13px] font-semibold text-gray-200 truncate">{item.value}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Admin Notes */}
                    <div className="bg-surface border border-border rounded-[2.5rem] p-8 shadow-xl">
                        <h3 className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.3em] mb-6 px-2">Administrative Notes</h3>
                        <div className="space-y-4">
                            <textarea 
                                value={note} 
                                onChange={e => setNote(e.target.value)}
                                className="w-full bg-black/40 border border-border rounded-2xl p-4 text-xs font-medium text-text-secondary outline-none focus:border-blue-500 transition-all resize-none shadow-inner" 
                                placeholder="Add private guest notes..."
                                rows={3}
                            />
                            <button className="w-full py-3 bg-white/5 hover:bg-white/10 border border-border rounded-xl text-[10px] font-bold uppercase tracking-widest text-text-primary transition-all disabled:opacity-30" disabled={!note.trim()} onClick={() => {
                                setNotes([{ author: 'Admin', time: 'Just now', text: note }, ...notes])
                                setNote('')
                                toast.success("Note saved")
                            }}>Commit Note</button>
                        </div>
                    </div>
                </div>

                {/* Right Main Content */}
                <div className="lg:col-span-8 space-y-6">
                    
                    {/* Performance Metrics Bar */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div className="bg-surface border border-border rounded-[2rem] p-8 shadow-lg group hover:border-blue-500/20 transition-all">
                            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">LIFETIME REVENUE</p>
                            <h4 className="text-3xl font-bold text-text-primary tracking-tight">₹{totalBill.toLocaleString()}</h4>
                        </div>
                        <div className="bg-surface border border-border rounded-[2rem] p-8 shadow-lg group hover:border-blue-500/20 transition-all">
                            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">RESERVATION HISTORY</p>
                            <h4 className="text-3xl font-bold text-text-primary tracking-tight">{bookings.length} <span className="text-xs text-text-tertiary font-medium">Stays</span></h4>
                        </div>
                        <div className="bg-surface border border-border rounded-[2rem] p-8 shadow-lg group hover:border-blue-500/20 transition-all">
                            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">DUE BALANCE</p>
                            <h4 className={cn("text-3xl font-bold tracking-tight", dueBalance > 0 ? "text-rose-500" : "text-emerald-500")}>₹{dueBalance.toLocaleString()}</h4>
                        </div>
                    </div>

                    {/* Stay & Billing History */}
                    <div className="bg-surface border border-border rounded-[2.5rem] overflow-hidden shadow-2xl">
                        <div className="px-10 py-8 border-b border-border flex items-center justify-between">
                            <h3 className="text-lg font-bold text-text-primary tracking-tight">Stay & Billing History</h3>
                            <button className="p-2 hover:bg-white/5 rounded-lg text-text-tertiary hover:text-text-primary transition-all"><History className="w-5 h-5" /></button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-black/20">
                                    <tr className="text-[10px] font-bold text-text-tertiary uppercase tracking-[0.25em]">
                                        <th className="px-10 py-6">Reference / Room</th>
                                        <th className="px-10 py-6">Check-In / Out</th>
                                        <th className="px-10 py-6">Status</th>
                                        <th className="px-10 py-6 text-right">Amount</th>
                                        <th className="px-10 py-6 text-right">Invoice</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.03]">
                                    {bookings.length === 0 ? (
                                        <tr><td colSpan={5} className="px-10 py-16 text-center text-gray-600 font-medium">No previous reservation history found for this guest.</td></tr>
                                    ) : bookings.map((b, i) => (
                                        <tr key={i} className="hover:bg-white/[0.015] transition-colors group">
                                            <td className="px-10 py-7">
                                                <p className="text-[14px] font-bold text-text-primary group-hover:text-blue-400 transition-colors">Room {b.roomNumber}</p>
                                                <p className="text-[9px] text-gray-600 uppercase font-bold tracking-widest mt-0.5">{b.roomType || 'Standard'}</p>
                                            </td>
                                            <td className="px-10 py-7 text-[13px] font-semibold text-text-secondary">
                                                {format(new Date(b.checkIn), 'dd MMM')} – {format(new Date(b.checkOut), 'dd MMM yyyy')}
                                            </td>
                                            <td className="px-10 py-7">
                                                <span className={cn("px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border tracking-widest", STATUS_CONFIG[b.status]?.cls)}>
                                                    {STATUS_CONFIG[b.status]?.label || b.status}
                                                </span>
                                            </td>
                                            <td className="px-10 py-7 text-right">
                                                <p className="text-[15px] font-bold text-text-primary">₹{(b.finalAmount ?? b.totalAmount ?? 0).toLocaleString()}</p>
                                                <p className="text-[9px] text-gray-600 font-bold uppercase">{b.source || 'Direct'}</p>
                                            </td>
                                            <td className="px-10 py-7 text-right">
                                                <button
                                                    onClick={() => setInvoiceBooking(b)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500 border border-indigo-500/20 hover:border-indigo-500 text-indigo-400 hover:text-text-primary text-[10px] font-bold rounded-xl transition-all ml-auto"
                                                >
                                                    <FileText className="w-3.5 h-3.5" /> Invoice
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* ID Documentation System */}
                    <div className="bg-surface border border-border rounded-[2.5rem] p-10 shadow-2xl">
                        <div className="flex items-center justify-between mb-10">
                            <div>
                                <h3 className="text-xl font-bold text-text-primary tracking-tight">Identity Compliance</h3>
                                <p className="text-[11px] text-text-tertiary font-bold uppercase tracking-widest mt-1">Stored ID Documents & KYC</p>
                            </div>
                            <button className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white transition-all shadow-xl shadow-blue-500/10 active:scale-95" onClick={() => frontRef.current?.click()}>
                                <Upload className="w-4 h-4" /> Upload Document
                            </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                            {/* Front ID Card */}
                            <div
                                className="relative aspect-[16/10] bg-black/40 rounded-3xl border-2 border-dashed border-border overflow-hidden flex flex-col items-center justify-center p-6 hover:border-[#4A9EFF]/60 transition-all cursor-pointer group shadow-inner"
                                onClick={() => {
                                    if (guest.idDocumentFront) {
                                        setLightboxState({ isOpen: true, initialIndex: 0 })
                                    } else {
                                        frontRef.current?.click()
                                    }
                                }}
                            >
                                {guest.idDocumentFront ? (
                                    <>
                                        <img src={guest.idDocumentFront} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 rounded-3xl" alt="Front ID" />
                                        {/* View Large Pill */}
                                        <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20 flex items-center gap-1.5 text-xs font-bold text-white shadow-xl pointer-events-none">
                                            <Maximize2 className="w-3.5 h-3.5 text-[#4A9EFF]" />
                                            <span>View Large</span>
                                        </div>
                                        {/* Hover Overlay */}
                                        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 p-4">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setLightboxState({ isOpen: true, initialIndex: 0 })
                                                }}
                                                className="flex items-center gap-2 px-4 py-2.5 bg-[#4A9EFF] hover:bg-[#3d8ce6] text-white text-xs font-bold rounded-2xl shadow-xl transition-transform active:scale-95"
                                            >
                                                <Maximize2 className="w-4 h-4" />
                                                <span>View Large</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    frontRef.current?.click()
                                                }}
                                                className="flex items-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white text-xs font-bold rounded-2xl border border-white/20 backdrop-blur-md shadow-xl transition-transform active:scale-95"
                                            >
                                                <Upload className="w-4 h-4" />
                                                <span>Replace</span>
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="p-4 bg-white/5 rounded-full mb-3 group-hover:bg-[#4A9EFF]/20 transition-colors">
                                            <Upload className="w-6 h-6 text-gray-500 group-hover:text-[#4A9EFF] transition-colors" />
                                        </div>
                                        <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">Front of License / Passport</p>
                                        <p className="text-[10px] text-gray-600 mt-1">Click to upload document</p>
                                    </>
                                )}
                                <input type="file" ref={frontRef} className="hidden" onChange={e => { if (e.target.files?.[0]) handleUpload('front', e.target.files[0]) }} />
                            </div>

                            {/* Back ID Card */}
                            <div
                                className="relative aspect-[16/10] bg-black/40 rounded-3xl border-2 border-dashed border-border overflow-hidden flex flex-col items-center justify-center p-6 hover:border-[#4A9EFF]/60 transition-all cursor-pointer group shadow-inner"
                                onClick={() => {
                                    if (guest.idDocumentBack) {
                                        setLightboxState({ isOpen: true, initialIndex: guest.idDocumentFront ? 1 : 0 })
                                    } else {
                                        backRef.current?.click()
                                    }
                                }}
                            >
                                {guest.idDocumentBack ? (
                                    <>
                                        <img src={guest.idDocumentBack} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 rounded-3xl" alt="Back ID" />
                                        {/* View Large Pill */}
                                        <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20 flex items-center gap-1.5 text-xs font-bold text-white shadow-xl pointer-events-none">
                                            <Maximize2 className="w-3.5 h-3.5 text-[#4A9EFF]" />
                                            <span>View Large</span>
                                        </div>
                                        {/* Hover Overlay */}
                                        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 p-4">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setLightboxState({ isOpen: true, initialIndex: guest.idDocumentFront ? 1 : 0 })
                                                }}
                                                className="flex items-center gap-2 px-4 py-2.5 bg-[#4A9EFF] hover:bg-[#3d8ce6] text-white text-xs font-bold rounded-2xl shadow-xl transition-transform active:scale-95"
                                            >
                                                <Maximize2 className="w-4 h-4" />
                                                <span>View Large</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    backRef.current?.click()
                                                }}
                                                className="flex items-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white text-xs font-bold rounded-2xl border border-white/20 backdrop-blur-md shadow-xl transition-transform active:scale-95"
                                            >
                                                <Upload className="w-4 h-4" />
                                                <span>Replace</span>
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="p-4 bg-white/5 rounded-full mb-3 group-hover:bg-[#4A9EFF]/20 transition-colors">
                                            <Upload className="w-6 h-6 text-gray-500 group-hover:text-[#4A9EFF] transition-colors" />
                                        </div>
                                        <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">Back of License / Passport</p>
                                        <p className="text-[10px] text-gray-600 mt-1">Click to upload document</p>
                                    </>
                                )}
                                <input type="file" ref={backRef} className="hidden" onChange={e => { if (e.target.files?.[0]) handleUpload('back', e.target.files[0]) }} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Systematic Profile Editor */}
            {isEditing && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md animate-in fade-in zoom-in-95 duration-300">
                    <div className="bg-surface border border-border/50 rounded-[3.5rem] p-12 w-full max-w-4xl shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 to-indigo-600" />
                        
                        <div className="flex items-center justify-between mb-12">
                            <div>
                                <h2 className="text-3xl font-bold text-text-primary tracking-tight">Systematic Profile Registry</h2>
                                <p className="text-sm text-text-tertiary mt-1 font-medium tracking-tight">Updating core identity parameters for <span className="text-blue-400">#GS-{guest.id.slice(-4).toUpperCase()}</span></p>
                            </div>
                            <button onClick={() => setIsEditing(false)} className="p-4 hover:bg-white/5 rounded-full text-gray-600 hover:text-text-primary transition-all"><X className="w-7 h-7" /></button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 mb-12">
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest ml-1">Full Legal Name</label>
                                    <input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full bg-black/40 border border-border rounded-2xl px-6 py-4 text-text-primary font-bold outline-none focus:border-blue-500/50 shadow-inner" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest ml-1">Contact Phone</label>
                                    <input value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} className="w-full bg-black/40 border border-border rounded-2xl px-6 py-4 text-text-primary font-bold outline-none focus:border-blue-500/50 shadow-inner" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest ml-1">Home Address / Street</label>
                                    <input value={editForm.address} onChange={e => setEditForm({...editForm, address: e.target.value})} className="w-full bg-black/40 border border-border rounded-2xl px-6 py-4 text-text-primary font-bold outline-none focus:border-blue-500/50 shadow-inner" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest ml-1">Guest GSTIN (Optional B2B Tax Invoice)</label>
                                    <input value={editForm.gstNumber} placeholder="e.g. 27ABCDE1234F1ZH" onChange={e => setEditForm({...editForm, gstNumber: e.target.value.toUpperCase()})} className="w-full bg-black/40 border border-border rounded-2xl px-6 py-4 text-text-primary font-mono font-bold outline-none focus:border-blue-500/50 uppercase shadow-inner" />
                                    {(() => {
                                        if (!editForm.gstNumber) return null
                                        const v = validateGSTIN(editForm.gstNumber)
                                        return (
                                            <div className={cn("text-[11px] font-semibold flex items-center gap-1.5 mt-1 px-3 py-1.5 rounded-xl border", v.isValid ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border-rose-500/20 text-rose-400")}>
                                                <span>{v.message}</span>
                                            </div>
                                        )
                                    })()}
                                </div>
                            </div>
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest ml-1">E-mail Record</label>
                                    <input type="email" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} className="w-full bg-black/40 border border-border rounded-2xl px-6 py-4 text-text-primary font-bold outline-none focus:border-blue-500/50 shadow-inner" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest ml-1">Date of Birth</label>
                                    <input type="date" value={editForm.dateOfBirth} style={{ colorScheme: 'dark' }} onChange={e => setEditForm({...editForm, dateOfBirth: e.target.value})} className="w-full bg-black/40 border border-border rounded-2xl px-6 py-4 text-text-primary font-bold outline-none focus:border-blue-500/50 shadow-inner" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest ml-1">ID Type</label>
                                        <select value={editForm.idType} onChange={e => setEditForm({...editForm, idType: e.target.value})} className="w-full bg-black/40 border border-border rounded-2xl px-6 py-4 text-text-primary font-bold outline-none focus:border-blue-500/50 cursor-pointer shadow-inner">
                                            <option value="AADHAAR">Aadhaar</option>
                                            <option value="PASSPORT">Passport</option>
                                            <option value="DRIVING_LICENSE">DL</option>
                                            <option value="VOTER_ID">Voter ID</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest ml-1">ID Number</label>
                                        <input value={editForm.idNumber} onChange={e => setEditForm({...editForm, idNumber: e.target.value})} className="w-full bg-black/40 border border-border rounded-2xl px-6 py-4 text-text-primary font-bold outline-none focus:border-blue-500/50 shadow-inner" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-6 mt-12">
                            <button className="flex-1 py-5 bg-white/5 hover:bg-white/10 border border-border/50 rounded-2xl text-[11px] font-bold uppercase tracking-[0.2em] text-text-secondary hover:text-text-primary transition-all shadow-xl" onClick={() => setIsEditing(false)}>Abort Updates</button>
                            <button className="flex-1 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-2xl text-[11px] font-bold uppercase tracking-[0.2em] text-text-primary transition-all shadow-2xl shadow-blue-600/20 active:scale-95" onClick={handleUpdate}>Synchronize Records</button>
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* Large Document Lightbox Modal */}
        {guest && (
            <ImageLightboxModal
                isOpen={lightboxState.isOpen}
                onClose={() => setLightboxState({ isOpen: false, initialIndex: 0 })}
                images={[
                    guest.idDocumentFront ? { url: guest.idDocumentFront, label: 'Front Document' } : null,
                    guest.idDocumentBack ? { url: guest.idDocumentBack, label: 'Back Document' } : null,
                ].filter(Boolean) as LightboxImage[]}
                initialIndex={lightboxState.initialIndex}
                title={guest.idType ? `${guest.idType} Verification` : 'Identity Compliance Document'}
                subtitle={`Guest: ${guest.name} • Contact: ${guest.phone || '—'}`}
                onReplace={(idx) => {
                    setLightboxState({ isOpen: false, initialIndex: 0 })
                    if (idx === 0 && guest.idDocumentFront) frontRef.current?.click()
                    else backRef.current?.click()
                }}
            />
        )}

        {/* Invoice Modal */}
        {invoiceBooking && (
            <InvoiceModal
                booking={invoiceBooking}
                guest={guest}
                onClose={() => setInvoiceBooking(null)}
            />
        )}
        </>
    )
}
