'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { buildContextUrl } from '@/lib/admin-context'
import { Search, Bell, Settings, ArrowRight, Info, PlusCircle, CheckCircle2, Loader2, Hotel, Building2, BedDouble, Package, Plus, Calculator, Send } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'

export default function NewPurchaseOrderPage() {
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [vendorId, setVendorId] = useState('')
    const [isVendorOpen, setIsVendorOpen] = useState(false)
    const [bookingId, setBookingId] = useState('')
    const [isBookingOpen, setIsBookingOpen] = useState(false)
    const [shippingType, setShippingType] = useState('')
    const [notes, setNotes] = useState('')
    
    const [items, setItems] = useState([
        { id: 1, description: '', quantity: 1, unitPrice: 0, taxPercent: 0 }
    ])

    // Fetch Vendors
    const { data: vendorData } = useSWR(
        buildContextUrl('/api/admin/procurement/vendors'),
        (url) => fetch(url).then(r => r.json())
    )
    const vendors = vendorData?.data || []

    // Fetch Active Bookings (for Bill-to-Guest)
    const { data: bookingData } = useSWR(
        buildContextUrl('/api/admin/bookings'),
        (url) => fetch(url).then(r => r.json())
    )
    const activeBookings = bookingData?.data?.filter((b: any) => b.status === 'CHECKED_IN' || b.status === 'RESERVED') || []

    const handleAddItem = () => {
        setItems([...items, { id: Date.now(), description: '', quantity: 1, unitPrice: 0, taxPercent: 0 }])
    }

    const updateItem = (id: number, field: string, value: any) => {
        setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i))
    }

    const handleRemoveItem = (id: number) => {
        if (items.length === 1) return // Keep at least one item
        setItems(items.filter(i => i.id !== id))
    }

    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
    const estimatedTax = items.reduce((sum, item) => sum + ((item.quantity * item.unitPrice) * (item.taxPercent / 100)), 0)
    const shipping = 0 // Static for now
    const totalAmount = subtotal + estimatedTax + shipping

    const handleSubmit = async (status = 'PENDING_APPROVAL') => {
        if (!vendorId) return toast.error('Please select a vendor')
        if (items.some(i => !i.description)) return toast.error('Please provide a description for all items')

        setIsSubmitting(true)
        try {
            const res = await fetch(buildContextUrl('/api/admin/procurement'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    vendorId,
                    bookingId: bookingId || null,
                    notes,
                    shipping,
                    items,
                    status // Pass status to API
                })
            })
            if (res.ok) {
                toast.success('Purchase Order created successfully')
                if (bookingId) toast.success('Charges added to guest folio')
                router.push('/admin/procurement')
            } else {
                toast.error('Failed to create Purchase Order')
            }
        } catch (error) {
            toast.error('Something went wrong')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#0F172A] pb-24 font-sans text-gray-200">


            <main className="max-w-6xl mx-auto px-8 py-10">

                
                <div className="flex items-end justify-between mb-12">
                    <div>
                        <h1 className="text-5xl font-black text-white leading-tight mb-4">PO-NEW</h1>
                        <p className="text-sm text-gray-400 max-w-lg leading-relaxed font-medium">
                            Initiating a new procurement request for StayIn Elite high-traffic assets. Ensure all line items align with quarterly budgetary constraints.
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Creation Date</div>
                        <div className="text-xl font-black text-[#3B82F6]">
                            {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Form Section */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Meta Data Card */}
                        <div className="bg-[#233648] border border-white/5 p-8 rounded-3xl shadow-xl">
                            <h2 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-[#3B82F6]" /> Logistics & Allocation
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Authorized Supplier *</label>
                                    <div className="relative">
                                        <div 
                                            className="w-full border border-white/10 rounded-xl p-3.5 text-sm bg-white/5 cursor-pointer flex items-center justify-between"
                                            onClick={() => setIsVendorOpen(!isVendorOpen)}
                                        >
                                            <span className={cn("font-medium", vendorId ? "text-white" : "text-gray-500")}>
                                                {vendors.find((v: any) => v.id === vendorId)?.name || 'Select a vendor...'}
                                            </span>
                                            <span className="text-gray-500">▼</span>
                                        </div>
                                        
                                        {isVendorOpen && (
                                            <div className="absolute top-full left-0 right-0 mt-1 bg-[#1A2634] border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden max-h-64 overflow-y-auto">
                                                <div 
                                                    className="px-4 py-3 text-sm cursor-pointer text-gray-500 hover:bg-white/5 transition-colors"
                                                    onClick={() => { setVendorId(''); setIsVendorOpen(false) }}
                                                >
                                                    Select a vendor...
                                                </div>
                                                {vendors.map((v: any) => (
                                                    <div 
                                                        key={v.id}
                                                        className={cn(
                                                            "px-4 py-3 text-sm cursor-pointer transition-colors border-t border-white/5",
                                                            vendorId === v.id 
                                                                ? "bg-[#3B82F6] text-white font-bold" 
                                                                : "text-gray-300 hover:bg-white/10"
                                                        )}
                                                        onClick={() => { setVendorId(v.id); setIsVendorOpen(false) }}
                                                    >
                                                        {v.name} <span className="text-[10px] uppercase ml-2 opacity-50">({v.category})</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Shipping Type</label>
                                    <input 
                                        type="text" 
                                        className="w-full border border-white/10 rounded-xl p-3.5 text-sm bg-white/5 focus:border-[#3B82F6] focus:bg-transparent text-white outline-none transition-colors placeholder:text-gray-600"
                                        placeholder="e.g. Standard Freight, Express"
                                        value={shippingType}
                                        onChange={e => setShippingType(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="mt-6 pt-6 border-t border-white/5">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Additional Notes / Instructions</label>
                                <textarea 
                                    className="w-full border border-white/10 rounded-xl p-3.5 text-sm bg-white/5 focus:border-[#3B82F6] text-white outline-none transition-colors min-h-[100px] placeholder:text-gray-600"
                                    placeholder="Any special handling or delivery instructions..."
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                ></textarea>
                            </div>
                        </div>

                        {/* Items Section */}
                        <div className="bg-[#233648] border border-white/5 p-8 rounded-3xl shadow-xl">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-sm font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                    <Package className="w-4 h-4 text-[#3B82F6]" /> Line Items
                                </h2>
                                <button 
                                    onClick={handleAddItem}
                                    className="text-[10px] font-black uppercase tracking-widest text-[#3B82F6] hover:text-[#2563EB] bg-[#3B82F6]/10 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1"
                                >
                                    <Plus className="w-3 h-3" /> Add Row
                                </button>
                            </div>
                            
                            <div className="space-y-4">
                                {items.map((item, idx) => (
                                    <div key={item.id} className="grid grid-cols-12 gap-4 items-end bg-white/5 p-4 rounded-2xl relative group">
                                        {items.length > 1 && (
                                            <button 
                                                onClick={() => handleRemoveItem(item.id)}
                                                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-lg"
                                            >
                                                ×
                                            </button>
                                        )}
                                        <div className="col-span-12 md:col-span-4">
                                            <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Description</label>
                                            <input 
                                                type="text" 
                                                className="w-full border border-white/10 rounded-lg p-2.5 text-sm bg-[#1A2634] focus:border-[#3B82F6] text-white outline-none transition-colors placeholder:text-gray-600"
                                                placeholder="Asset name"
                                                value={item.description}
                                                onChange={e => updateItem(item.id, 'description', e.target.value)}
                                            />
                                        </div>
                                        <div className="col-span-4 md:col-span-2">
                                            <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Qty</label>
                                            <input 
                                                type="number" 
                                                min="1"
                                                className="w-full border border-white/10 rounded-lg p-2.5 text-sm bg-[#1A2634] focus:border-[#3B82F6] text-white outline-none transition-colors text-center"
                                                value={item.quantity}
                                                onChange={e => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                                            />
                                        </div>
                                        <div className="col-span-4 md:col-span-2">
                                            <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Unit Price ($)</label>
                                            <input 
                                                type="number" 
                                                min="0" step="0.01"
                                                className="w-full border border-white/10 rounded-lg p-2.5 text-sm bg-[#1A2634] focus:border-[#3B82F6] text-white outline-none transition-colors text-right font-mono"
                                                value={item.unitPrice}
                                                onChange={e => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                                            />
                                        </div>
                                        <div className="col-span-4 md:col-span-2">
                                            <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Tax / GST (%)</label>
                                            <input 
                                                type="number" 
                                                min="0" max="100" step="0.1"
                                                className="w-full border border-white/10 rounded-lg p-2.5 text-sm bg-[#1A2634] focus:border-[#3B82F6] text-white outline-none transition-colors text-right font-mono"
                                                value={item.taxPercent}
                                                onChange={e => updateItem(item.id, 'taxPercent', parseFloat(e.target.value) || 0)}
                                            />
                                        </div>
                                        <div className="col-span-12 md:col-span-2 text-right py-2.5">
                                            <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">Total</div>
                                            <div className="font-black text-[#3B82F6] font-mono">
                                                {formatCurrency(item.quantity * item.unitPrice * (1 + item.taxPercent / 100))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Summary Sidebar */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-[#1D4ED8] rounded-3xl p-8 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden sticky top-32">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-bl-full flex items-start justify-end p-6 z-0">
                                <Info className="w-8 h-8 text-white opacity-50" />
                            </div>
                            <div className="relative z-10">
                                <div className="mt-6 border-t border-white/5 pt-6">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <BedDouble className="w-3.5 h-3.5" /> Concierge Billing (Optional)
                                    </label>
                                    <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                                        <div className="text-xs text-gray-400 mb-4 font-medium">Link this purchase order directly to a guest&apos;s folio to automatically generate a concierge charge upon fulfillment.</div>
                                        <div className="relative">
                                            <div 
                                                className="w-full border border-white/10 rounded-xl p-3.5 text-sm bg-[#1A2634] cursor-pointer flex items-center justify-between"
                                                onClick={() => setIsBookingOpen(!isBookingOpen)}
                                            >
                                                <span className={cn("font-medium", bookingId ? "text-white" : "text-gray-500")}>
                                                    {bookingId 
                                                        ? `Room ${activeBookings.find((b: any) => b.id === bookingId)?.room?.roomNumber} - ${activeBookings.find((b: any) => b.id === bookingId)?.guest?.firstName} ${activeBookings.find((b: any) => b.id === bookingId)?.guest?.lastName}` 
                                                        : 'Do not bill to guest'}
                                                </span>
                                                <span className="text-gray-500">▼</span>
                                            </div>
                                            
                                            {isBookingOpen && (
                                                <div className="absolute top-full left-0 right-0 mt-1 bg-[#1A2634] border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden max-h-64 overflow-y-auto">
                                                    <div 
                                                        className="px-4 py-3 text-sm cursor-pointer text-gray-500 hover:bg-white/5 transition-colors"
                                                        onClick={() => { setBookingId(''); setIsBookingOpen(false) }}
                                                    >
                                                        Do not bill to guest
                                                    </div>
                                                    {activeBookings.map((b: any) => (
                                                        <div 
                                                            key={b.id}
                                                            className={cn(
                                                                "px-4 py-3 text-sm cursor-pointer transition-colors border-t border-white/5",
                                                                bookingId === b.id 
                                                                    ? "bg-[#3B82F6] text-white font-bold" 
                                                                    : "text-gray-300 hover:bg-white/10"
                                                            )}
                                                            onClick={() => { setBookingId(b.id); setIsBookingOpen(false) }}
                                                        >
                                                            Room {b.room?.roomNumber} - {b.guest?.firstName} {b.guest?.lastName}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-white/20 space-y-3">
                                <div className="flex justify-between items-center text-xs text-blue-200">
                                    <span>Subtotal</span>
                                    <span className="font-mono font-bold">{formatCurrency(subtotal)}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs text-blue-200">
                                    <span>Tax / GST</span>
                                    <span className="font-mono font-bold">{formatCurrency(estimatedTax)}</span>
                                </div>
                                <div className="h-[1px] bg-white/20 my-2"></div>
                                <div className="flex justify-between items-end mb-8">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-blue-200">Total Obligation</span>
                                    <span className="text-4xl font-black">{formatCurrency(totalAmount)}</span>
                                </div>

                                <div className="space-y-3">
                                    <button 
                                        onClick={() => handleSubmit('PENDING_APPROVAL')}
                                        disabled={isSubmitting}
                                        className="w-full py-4 bg-white text-[#1D4ED8] rounded-xl font-black text-xs uppercase tracking-widest hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                                    >
                                        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-4 h-4" /> Issue Purchase Order</>}
                                    </button>
                                    <button 
                                        onClick={() => handleSubmit('DRAFT')}
                                        disabled={isSubmitting}
                                        className="w-full py-4 bg-blue-800 text-blue-200 border border-blue-700 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-blue-900 transition-colors"
                                    >
                                        Save as Draft
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Guidelines Box */}
                        <div className="bg-[#233648] border border-white/5 rounded-3xl p-6">
                            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Procurement Guidelines</h3>
                            <ul className="space-y-3 text-xs text-gray-400 font-medium">
                                <li className="flex gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] mt-1 shrink-0"></div>
                                    All orders above $5,000 require Super Admin approval.
                                </li>
                                <li className="flex gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] mt-1 shrink-0"></div>
                                    Ensure vendor details are verified prior to submission.
                                </li>
                                <li className="flex gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] mt-1 shrink-0"></div>
                                    Concierge billing is irreversible once fulfilled.
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
