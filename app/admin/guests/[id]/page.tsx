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

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
    RESERVED: { label: 'Reserved', cls: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
    CHECKED_IN: { label: 'Active', cls: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
    CHECKED_OUT: { label: 'Completed', cls: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
    CANCELLED: { label: 'Cancelled', cls: 'bg-rose-500/10 text-rose-500 border-rose-500/20' },
    COMPLETED: { label: 'Completed', cls: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
}

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
                    idDocumentBack: side === 'back' ? data.url : prev.idDocumentBack,
                }))
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
                body: JSON.stringify(editForm),
            })
            if (res.ok) {
                toast.success('Profile updated')
                setIsEditing(false)
                fetchGuest()
            } else { toast.error('Update failed') }
        } catch { toast.error('Update failed') }
    }

    if (loading) return <div className="flex items-center justify-center h-screen bg-[#0A0F16]"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
    if (!guest) return <div className="flex flex-col items-center justify-center h-screen bg-[#0A0F16] text-gray-400 gap-4"><p>Guest not found</p><button onClick={() => router.back()} className="px-6 py-2 bg-blue-600 rounded-lg text-white">Go Back</button></div>

    const totalBill = bookings.reduce((s, b) => s + (b.totalAmount || 0), 0)
    const paidAmount = bookings.reduce((s, b) => s + (b.paidAmount || 0), 0)
    const dueBalance = totalBill - paidAmount
    const activeBooking = bookings.find(b => b.status === 'CHECKED_IN')

    return (
        <>
        <div className="min-h-screen bg-[#0A0F16] text-gray-300 p-4 lg:p-8 space-y-6 animate-fade-in">
            
            {/* Header / Breadcrumb */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push('/admin/guests')} className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-500 hover:text-white"><ArrowLeft className="w-5 h-5" /></button>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight leading-none">{guest.name}</h1>
                        <p className="text-[10px] text-gray-500 font-bold tracking-[0.2em] uppercase mt-1">Guest Repository / Profile</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-5 py-2.5 bg-white/[0.05] hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-widest text-white transition-all shadow-lg active:scale-95" onClick={() => setIsEditing(true)}>
                        <Edit className="w-4 h-4 text-blue-500" /> Edit Profile
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Left Sidebar: Profile & Info */}
                <div className="lg:col-span-4 space-y-6">
                    
                    {/* Main Identity Card */}
                    <div className="bg-[#111823] border border-white/[0.05] rounded-[2.5rem] p-10 flex flex-col items-center text-center space-y-6 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-full h-1 bg-blue-500/50" />
                        <Avatar name={guest.name} size="xl" className="w-28 h-28 ring-8 ring-blue-500/5 group-hover:ring-blue-500/10 transition-all duration-500 shadow-2xl" />
                        <div>
                            <h2 className="text-2xl font-bold text-white tracking-tight">{guest.name}</h2>
                            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.2em] mt-1">{guest.email || 'Email missing'}</p>
                        </div>
                        <div className="flex flex-wrap justify-center gap-2 pt-2">
                            {activeBooking && <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[9px] font-bold uppercase rounded-full border border-emerald-500/20 tracking-widest">Active Stay</span>}
                            {guest.checkInStatus === 'VERIFIED' && <span className="px-3 py-1 bg-blue-500/10 text-blue-500 text-[9px] font-bold uppercase rounded-full border border-blue-500/20 tracking-widest">Verified Guest</span>}
                        </div>
                    </div>

                    {/* Systematic Detail List */}
                    <div className="bg-[#111823] border border-white/[0.05] rounded-[2.5rem] p-8 space-y-8 shadow-xl">
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
                                <div key={i} className="flex items-start gap-4 p-4 hover:bg-white/[0.02] rounded-2xl transition-all group">
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
                    <div className="bg-[#111823] border border-white/[0.05] rounded-[2.5rem] p-8 shadow-xl">
                        <h3 className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.3em] mb-6 px-2">Administrative Notes</h3>
                        <div className="space-y-4">
                            <textarea 
                                value={note} 
                                onChange={e => setNote(e.target.value)}
                                className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-xs font-medium text-gray-300 outline-none focus:border-blue-500 transition-all resize-none shadow-inner" 
                                placeholder="Add private guest notes..."
                                rows={3}
                            />
                            <button className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-[10px] font-bold uppercase tracking-widest text-white transition-all disabled:opacity-30" disabled={!note.trim()} onClick={() => {
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
                        <div className="bg-[#111823] border border-white/[0.05] rounded-[2rem] p-8 shadow-lg group hover:border-blue-500/20 transition-all">
                            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">LIFETIME REVENUE</p>
                            <h4 className="text-3xl font-bold text-white tracking-tight">₹{totalBill.toLocaleString()}</h4>
                        </div>
                        <div className="bg-[#111823] border border-white/[0.05] rounded-[2rem] p-8 shadow-lg group hover:border-blue-500/20 transition-all">
                            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">RESERVATION HISTORY</p>
                            <h4 className="text-3xl font-bold text-white tracking-tight">{bookings.length} <span className="text-xs text-gray-500 font-medium">Stays</span></h4>
                        </div>
                        <div className="bg-[#111823] border border-white/[0.05] rounded-[2rem] p-8 shadow-lg group hover:border-blue-500/20 transition-all">
                            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">DUE BALANCE</p>
                            <h4 className={cn("text-3xl font-bold tracking-tight", dueBalance > 0 ? "text-rose-500" : "text-emerald-500")}>₹{dueBalance.toLocaleString()}</h4>
                        </div>
                    </div>

                    {/* Stay & Billing History */}
                    <div className="bg-[#111823] border border-white/[0.05] rounded-[2.5rem] overflow-hidden shadow-2xl">
                        <div className="px-10 py-8 border-b border-white/5 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-white tracking-tight">Stay & Billing History</h3>
                            <button className="p-2 hover:bg-white/5 rounded-lg text-gray-500 hover:text-white transition-all"><History className="w-5 h-5" /></button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-black/20">
                                    <tr className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.25em]">
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
                                                <p className="text-[14px] font-bold text-white group-hover:text-blue-400 transition-colors">Room {b.roomNumber}</p>
                                                <p className="text-[9px] text-gray-600 uppercase font-bold tracking-widest mt-0.5">{b.roomType || 'Standard'}</p>
                                            </td>
                                            <td className="px-10 py-7 text-[13px] font-semibold text-gray-300">
                                                {format(new Date(b.checkIn), 'dd MMM')} – {format(new Date(b.checkOut), 'dd MMM yyyy')}
                                            </td>
                                            <td className="px-10 py-7">
                                                <span className={cn("px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border tracking-widest", STATUS_CONFIG[b.status]?.cls)}>
                                                    {STATUS_CONFIG[b.status]?.label || b.status}
                                                </span>
                                            </td>
                                            <td className="px-10 py-7 text-right">
                                                <p className="text-[15px] font-bold text-white">₹{(b.finalAmount ?? b.totalAmount ?? 0).toLocaleString()}</p>
                                                <p className="text-[9px] text-gray-600 font-bold uppercase">{b.source || 'Direct'}</p>
                                            </td>
                                            <td className="px-10 py-7 text-right">
                                                <button
                                                    onClick={() => setInvoiceBooking(b)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500 border border-indigo-500/20 hover:border-indigo-500 text-indigo-400 hover:text-white text-[10px] font-bold rounded-xl transition-all ml-auto"
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
                    <div className="bg-[#111823] border border-white/[0.05] rounded-[2.5rem] p-10 shadow-2xl">
                        <div className="flex items-center justify-between mb-10">
                            <div>
                                <h3 className="text-xl font-bold text-white tracking-tight">Identity Compliance</h3>
                                <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest mt-1">Stored ID Documents & KYC</p>
                            </div>
                            <button className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-[10px] font-bold uppercase tracking-widest text-white transition-all shadow-xl shadow-blue-500/10 active:scale-95" onClick={() => frontRef.current?.click()}>
                                <Upload className="w-4 h-4" /> Upload Document
                            </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                            <div className="relative aspect-[16/10] bg-black/40 rounded-3xl border-2 border-dashed border-white/5 flex flex-col items-center justify-center p-6 hover:border-blue-500/30 transition-all cursor-pointer group shadow-inner" onClick={() => frontRef.current?.click()}>
                                {guest.idDocumentFront ? (
                                    <img src={guest.idDocumentFront} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 rounded-3xl" alt="Front ID" />
                                ) : (
                                    <><div className="p-4 bg-white/5 rounded-full mb-3"><Upload className="w-6 h-6 text-gray-700" /></div><p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Front of License/Passport</p></>
                                )}
                                <input type="file" ref={frontRef} className="hidden" onChange={e => { if (e.target.files?.[0]) handleUpload('front', e.target.files[0]) }} />
                            </div>
                            <div className="relative aspect-[16/10] bg-black/40 rounded-3xl border-2 border-dashed border-white/5 flex flex-col items-center justify-center p-6 hover:border-blue-500/30 transition-all cursor-pointer group shadow-inner" onClick={() => backRef.current?.click()}>
                                {guest.idDocumentBack ? (
                                    <img src={guest.idDocumentBack} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 rounded-3xl" alt="Back ID" />
                                ) : (
                                    <><div className="p-4 bg-white/5 rounded-full mb-3"><Upload className="w-6 h-6 text-gray-700" /></div><p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Back of License/Passport</p></>
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
                    <div className="bg-[#111823] border border-white/10 rounded-[3.5rem] p-12 w-full max-w-4xl shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 to-indigo-600" />
                        
                        <div className="flex items-center justify-between mb-12">
                            <div>
                                <h2 className="text-3xl font-bold text-white tracking-tight">Systematic Profile Registry</h2>
                                <p className="text-sm text-gray-500 mt-1 font-medium tracking-tight">Updating core identity parameters for <span className="text-blue-400">#GS-{guest.id.slice(-4).toUpperCase()}</span></p>
                            </div>
                            <button onClick={() => setIsEditing(false)} className="p-4 hover:bg-white/5 rounded-full text-gray-600 hover:text-white transition-all"><X className="w-7 h-7" /></button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 mb-12">
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest ml-1">Full Legal Name</label>
                                    <input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-blue-500/50 shadow-inner" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest ml-1">Contact Phone</label>
                                    <input value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-blue-500/50 shadow-inner" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest ml-1">Home Address / Street</label>
                                    <input value={editForm.address} onChange={e => setEditForm({...editForm, address: e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-blue-500/50 shadow-inner" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest ml-1">Guest GSTIN (Optional B2B Tax Invoice)</label>
                                    <input value={editForm.gstNumber} placeholder="e.g. 27ABCDE1234F1ZH" onChange={e => setEditForm({...editForm, gstNumber: e.target.value.toUpperCase()})} className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-white font-mono font-bold outline-none focus:border-blue-500/50 uppercase shadow-inner" />
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
                                    <input type="email" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-blue-500/50 shadow-inner" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest ml-1">Date of Birth</label>
                                    <input type="date" value={editForm.dateOfBirth} style={{ colorScheme: 'dark' }} onChange={e => setEditForm({...editForm, dateOfBirth: e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-blue-500/50 shadow-inner" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest ml-1">ID Type</label>
                                        <select value={editForm.idType} onChange={e => setEditForm({...editForm, idType: e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-blue-500/50 appearance-none shadow-inner">
                                            <option value="AADHAAR">Aadhaar</option>
                                            <option value="PASSPORT">Passport</option>
                                            <option value="DRIVING_LICENSE">DL</option>
                                            <option value="VOTER_ID">Voter ID</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest ml-1">ID Number</label>
                                        <input value={editForm.idNumber} onChange={e => setEditForm({...editForm, idNumber: e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-blue-500/50 shadow-inner" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-6 mt-12">
                            <button className="flex-1 py-5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400 hover:text-white transition-all shadow-xl" onClick={() => setIsEditing(false)}>Abort Updates</button>
                            <button className="flex-1 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-2xl text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-all shadow-2xl shadow-blue-600/20 active:scale-95" onClick={handleUpdate}>Synchronize Records</button>
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* Invoice Modal */}
        {invoiceBooking && (
            <GuestInvoiceModal
                booking={invoiceBooking}
                guestName={guest?.name ?? 'Guest'}
                onClose={() => setInvoiceBooking(null)}
            />
        )}
        </>
    )
}

// ─── Guest Invoice Modal ─────────────────────────────────────────────────────
function GuestInvoiceModal({ booking, guestName, onClose }: {
    booking: any
    guestName: string
    onClose: () => void
}) {
    const nights = Math.max(1, Math.ceil(
        (new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / (1000 * 60 * 60 * 24)
    ))
    const base     = booking.baseAmount       ?? booking.totalAmount ?? 0
    const gstAmt   = booking.gstAmount        ?? 0
    const scAmt    = booking.serviceChargeAmount ?? 0
    const ltAmt    = booking.luxuryTaxAmount  ?? 0
    const discAmt  = booking.discountAmount   ?? 0
    const finalAmt = booking.finalAmount      ?? booking.totalAmount ?? 0
    const gstPct   = booking.gstPercent       ?? 0
    const scPct    = booking.serviceChargePercent ?? 0
    const ltPct    = booking.luxuryTaxPercent ?? 0
    const discPct  = booking.discountPercent  ?? 0
    const invoiceNo = `INV-${booking.id?.slice(-6).toUpperCase() ?? '000000'}`
    const roomNo   = booking.roomNumber ?? booking.room?.roomNumber ?? '—'
    const roomType = booking.roomType   ?? booking.room?.type ?? ''

    const handleDownloadPDF = async () => {
        try {
            const hotelName = booking.property?.name || 'Zenbourg Luxury Manor'
            const roomImg = booking.room?.images?.[0] || booking.property?.images?.[0] || 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1200&auto=format&fit=crop&q=80'
            const checkInFormatted = format(new Date(booking.checkIn), 'yyyy-MM-dd')
            const checkOutFormatted = format(new Date(booking.checkOut), 'yyyy-MM-dd')

            const htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <title>Luxury Stay Voucher - ${invoiceNo}</title>
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Outfit:wght@600;700;800&display=swap');
                        
                        * { box-sizing: border-box; margin: 0; padding: 0; }
                        body {
                            font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
                            background-color: #ffffff;
                            color: #1e293b;
                            padding: 32px 40px;
                            max-width: 820px;
                            margin: 0 auto;
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                        }
                        
                        .brand-header {
                            display: flex;
                            align-items: flex-start;
                            justify-content: space-between;
                            margin-bottom: 20px;
                        }
                        .brand-logo-group {
                            display: flex;
                            align-items: center;
                            gap: 10px;
                        }
                        .brand-icon {
                            width: 28px;
                            height: 28px;
                            background: #4F46E5;
                            color: #ffffff;
                            border-radius: 8px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 16px;
                            font-weight: 800;
                        }
                        .brand-title {
                            font-family: 'Outfit', sans-serif;
                            font-size: 24px;
                            font-weight: 800;
                            color: #4F46E5;
                            letter-spacing: -0.5px;
                        }
                        .brand-subtitle {
                            font-size: 10px;
                            font-weight: 700;
                            letter-spacing: 0.15em;
                            color: #64748B;
                            text-transform: uppercase;
                            margin-top: 4px;
                        }
                        .status-pill {
                            background-color: #ECFDF5;
                            border: 1px solid #A7F3D0;
                            color: #059669;
                            font-size: 10px;
                            font-weight: 800;
                            letter-spacing: 0.08em;
                            padding: 6px 14px;
                            border-radius: 9999px;
                            text-transform: uppercase;
                        }
                        .top-divider {
                            height: 1px;
                            background-color: #F1F5F9;
                            margin-bottom: 24px;
                        }
                        
                        .card {
                            background-color: #F8FAFC;
                            border: 1px solid #E2E8F0;
                            border-radius: 20px;
                            overflow: hidden;
                            margin-bottom: 20px;
                        }
                        .card-content {
                            padding: 22px;
                        }
                        
                        .banner-img {
                            width: 100%;
                            height: 210px;
                            object-fit: cover;
                            display: block;
                            border-radius: 16px;
                            margin-bottom: 18px;
                        }
                        
                        .res-tag {
                            display: inline-block;
                            background-color: #EFF6FF;
                            border: 1px solid #BFDBFE;
                            color: #1D4ED8;
                            font-size: 10px;
                            font-weight: 800;
                            font-family: monospace;
                            letter-spacing: 0.1em;
                            padding: 4px 10px;
                            border-radius: 6px;
                            text-transform: uppercase;
                            margin-bottom: 8px;
                        }
                        .prop-title {
                            font-size: 20px;
                            font-weight: 800;
                            color: #0F172A;
                            margin-bottom: 4px;
                        }
                        .prop-loc {
                            font-size: 12px;
                            font-weight: 600;
                            color: #64748B;
                            margin-bottom: 16px;
                        }
                        
                        .card-divider {
                            height: 1px;
                            background-color: #E2E8F0;
                            margin: 16px 0;
                        }
                        
                        .grid-2 {
                            display: grid;
                            grid-template-columns: 1fr 1fr;
                            gap: 20px;
                        }
                        .field-label {
                            font-size: 10px;
                            font-weight: 800;
                            letter-spacing: 0.12em;
                            color: #64748B;
                            text-transform: uppercase;
                            margin-bottom: 4px;
                        }
                        .field-val-lg {
                            font-size: 15px;
                            font-weight: 800;
                            color: #0F172A;
                        }
                        .field-sub {
                            font-size: 11px;
                            font-weight: 500;
                            color: #64748B;
                            margin-top: 2px;
                        }
                        
                        .card-header-title {
                            font-size: 11px;
                            font-weight: 800;
                            letter-spacing: 0.12em;
                            color: #475569;
                            text-transform: uppercase;
                            margin-bottom: 14px;
                        }
                        .kv-row {
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            padding: 6px 0;
                            font-size: 13px;
                        }
                        .kv-key {
                            color: #64748B;
                            font-weight: 500;
                        }
                        .kv-val {
                            color: #0F172A;
                            font-weight: 700;
                            text-align: right;
                        }
                        .total-val {
                            font-size: 18px;
                            font-weight: 800;
                            color: #4F46E5;
                        }

                        .bottom-code {
                            text-align: center;
                            font-family: monospace;
                            font-size: 12px;
                            font-weight: 800;
                            letter-spacing: 0.35em;
                            color: #64748B;
                            margin-top: 32px;
                        }
                    </style>
                </head>
                <body>
                    <div class="brand-header">
                        <div>
                            <div class="brand-logo-group">
                                <div class="brand-icon">📄</div>
                                <div class="brand-title">${hotelName.toUpperCase()}</div>
                            </div>
                            <div class="brand-subtitle">LUXURY STAY VOUCHER & CONFIRMATION RECEIPT</div>
                        </div>
                        <div class="status-pill">PAID & CONFIRMED</div>
                    </div>

                    <div class="top-divider"></div>

                    <!-- Property Card -->
                    <div class="card">
                        <div class="card-content">
                            <img src="${roomImg}" alt="Property Preview" class="banner-img" />
                            <div class="res-tag">RESERVATION: ${invoiceNo}</div>
                            <div class="prop-title">${hotelName} - ${roomType || 'Luxury Suite'}</div>
                            <div class="prop-loc">📍 Room ${roomNo} • ${hotelName}</div>

                            <div class="card-divider"></div>

                            <div class="grid-2">
                                <div>
                                    <div class="field-label">CHECK IN DATE</div>
                                    <div class="field-val-lg">${checkInFormatted}</div>
                                    <div class="field-sub">From 2:00 PM</div>
                                </div>
                                <div>
                                    <div class="field-label">CHECK OUT DATE</div>
                                    <div class="field-val-lg">${checkOutFormatted}</div>
                                    <div class="field-sub">By 11:00 AM</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Guest Info Card -->
                    <div class="card">
                        <div class="card-content">
                            <div class="card-header-title">PRIMARY LODGING GUEST</div>
                            <div class="kv-row">
                                <span class="kv-key">Guest Name:</span>
                                <span class="kv-val">${guestName}</span>
                            </div>
                            ${booking.guest?.email ? `
                            <div class="kv-row">
                                <span class="kv-key">Email Address:</span>
                                <span class="kv-val">${booking.guest.email}</span>
                            </div>` : ''}
                            ${booking.guest?.phone ? `
                            <div class="kv-row">
                                <span class="kv-key">Phone Contact:</span>
                                <span class="kv-val">${booking.guest.phone}</span>
                            </div>` : ''}
                            <div class="kv-row">
                                <span class="kv-key">Party Size:</span>
                                <span class="kv-val">${booking.numberOfGuests || 1} Guests</span>
                            </div>
                        </div>
                    </div>

                    <!-- Payment Breakdown Card -->
                    <div class="card">
                        <div class="card-content">
                            <div class="card-header-title">PAYMENT BREAKDOWN</div>
                            <div class="kv-row">
                                <span class="kv-key">Room Fare (${nights} Night${nights > 1 ? 's' : ''}):</span>
                                <span class="kv-val">₹${base.toLocaleString('en-IN')}</span>
                            </div>
                            <div class="kv-row">
                                <span class="kv-key">Concierge & Butler Fees:</span>
                                <span class="kv-val" style="color: #059669;">Complimentary</span>
                            </div>
                            ${gstAmt > 0 ? `
                            <div class="kv-row">
                                <span class="kv-key">GST & Local Stay Taxes (${gstPct}%):</span>
                                <span class="kv-val">₹${gstAmt.toLocaleString('en-IN')}</span>
                            </div>` : `
                            <div class="kv-row">
                                <span class="kv-key">GST & Local Stay Taxes:</span>
                                <span class="kv-val">Included</span>
                            </div>`}
                            ${discAmt > 0 ? `
                            <div class="kv-row" style="color: #DC2626;">
                                <span class="kv-key" style="color: #DC2626;">Special Rate Discount (${discPct}%):</span>
                                <span class="kv-val" style="color: #DC2626;">-₹${discAmt.toLocaleString('en-IN')}</span>
                            </div>` : ''}

                            <div class="card-divider"></div>

                            <div class="kv-row" style="padding-top: 4px;">
                                <span class="kv-key" style="font-size: 15px; font-weight: 800; color: #4F46E5;">Total Charged (Paid):</span>
                                <span class="total-val">₹${finalAmt.toLocaleString('en-IN')}</span>
                            </div>
                        </div>
                    </div>

                    <div class="bottom-code">${invoiceNo.split('').join(' ')}</div>
                    <script>
                        window.onload = function() { 
                            setTimeout(function() {
                                window.print(); 
                                window.onafterprint = function(){ window.close(); };
                            }, 300);
                        };
                </body>
                </html>
            `;
            const printWindow = window.open('', '', 'width=800,height=800');
            if (printWindow) {
                printWindow.document.write(htmlContent);
                printWindow.document.close();
            } else {
                toast.error('Please allow popups to print invoices');
            }
        } catch (err) {
            console.error(err)
            toast.error('Failed to generate printable invoice')
        }
    }

    return (
        <>
            <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm" onClick={onClose} />
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none">
                <div
                    className="w-full max-w-lg bg-white text-slate-900 rounded-3xl shadow-2xl pointer-events-auto overflow-hidden max-h-[90vh] overflow-y-auto"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="bg-[#C26A2C] px-6 py-6 text-white">
                        <div className="flex items-start justify-between">
                            <div>
                                <h2 className="text-xl font-black uppercase tracking-tight">Guest Invoice</h2>
                                <p className="text-[#F2C4A7] text-xs mt-1">{guestName} · Room {roomNo}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[#E8A375] text-[10px] uppercase tracking-wider">Invoice No.</p>
                                <p className="text-base font-mono font-bold">{invoiceNo}</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-6 space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-[10px] font-bold text-[#C26A2C] uppercase tracking-widest border-b border-[#C26A2C]/20 pb-1 mb-2">Stay Details</p>
                                {[
                                    ['Room',      `${roomNo}${roomType ? ' · ' + roomType : ''}`],
                                    ['Check-in',  format(new Date(booking.checkIn),  'dd MMM yyyy')],
                                    ['Check-out', format(new Date(booking.checkOut), 'dd MMM yyyy')],
                                    ['Nights',    String(nights)],
                                ].map(([l, v]) => (
                                    <div key={l} className="flex justify-between text-xs mb-1.5">
                                        <span className="text-slate-400">{l}</span>
                                        <span className="font-semibold text-slate-800">{v}</span>
                                    </div>
                                ))}
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-[#C26A2C] uppercase tracking-widest border-b border-[#C26A2C]/20 pb-1 mb-2">Billing</p>
                                {[
                                    ['Base Amount', `₹${base.toLocaleString('en-IN')}`],
                                    ...(gstAmt > 0 ? [[`GST (${gstPct}%)`, `₹${gstAmt.toLocaleString('en-IN')}`]] : []),
                                    ...(scAmt  > 0 ? [[`Service (${scPct}%)`, `₹${scAmt.toLocaleString('en-IN')}`]] : []),
                                    ...(discAmt > 0 ? [[`Discount`, `-₹${discAmt.toLocaleString('en-IN')}`]] : []),
                                ].map(([l, v]) => (
                                    <div key={l} className="flex justify-between text-xs mb-1.5">
                                        <span className="text-slate-400">{l}</span>
                                        <span className={`font-semibold ${String(v).startsWith('-') ? 'text-red-500' : 'text-slate-800'}`}>{v}</span>
                                    </div>
                                ))}
                                <div className="flex justify-between text-sm font-black border-t border-slate-200 pt-2 mt-2">
                                    <span className="text-slate-700">Total</span>
                                    <span className="text-[#C26A2C]">₹{finalAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button onClick={handleDownloadPDF} className="flex-1 flex items-center justify-center gap-2 h-11 bg-[#C26A2C] hover:bg-[#A85822] text-white text-sm font-bold rounded-2xl transition-all active:scale-95">
                                <Download className="w-4 h-4" /> Download PDF
                            </button>
                            <button onClick={() => window.print()} className="h-11 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-2xl transition-all flex items-center gap-2">
                                <Printer className="w-4 h-4" /> Print
                            </button>
                            <button onClick={onClose} className="h-11 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-2xl transition-all">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}
