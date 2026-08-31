'use client'

import React, { useState, useMemo } from 'react'
import useSWR from 'swr'
import { buildContextUrl } from '@/lib/admin-context'
import { Search, Bell, Settings, Filter, Plus, ChevronLeft, ChevronRight, TrendingUp, ArrowUpRight, X, FileText, Calendar, Building2 } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function PurchaseOrdersPage() {
    const router = useRouter()
    const [search, setSearch] = useState('')
    const [selectedPO, setSelectedPO] = useState<any>(null)

    const { data: rawData, isLoading } = useSWR(
        buildContextUrl('/api/admin/procurement'),
        fetcher
    )

    const pos = rawData?.data?.purchaseOrders || []
    const analytics = rawData?.data?.analytics || { totalSpend: 0, totalOrderedUnits: 0 }

    const budgetLimit = 200000 // Configurable budget limit
    const spendPercentage = budgetLimit > 0 ? Math.min(100, Math.round((analytics.totalSpend / budgetLimit) * 100)) : 0

    const filteredPOs = useMemo(() => {
        return pos.filter((p: any) => {
            const matchesSearch = p.poNumber.toLowerCase().includes(search.toLowerCase()) || 
                                  p.vendor?.name.toLowerCase().includes(search.toLowerCase())
            return matchesSearch
        })
    }, [pos, search])

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'PENDING_APPROVAL': return 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
            case 'SENT': return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
            case 'RECEIVED': return 'bg-green-500/10 text-green-400 border border-green-500/20'
            case 'CANCELLED': return 'bg-red-500/10 text-red-400 border border-red-500/20'
            default: return 'bg-white/5 text-gray-400 border border-white/5'
        }
    }

    const formatStatus = (status: string) => {
        if (status === 'PENDING_APPROVAL') return 'PENDING APPROVAL'
        return status
    }

    return (
        <div className="min-h-screen bg-[#0F172A] pb-24 font-sans text-gray-200 relative -mx-6 md:-mx-8 -my-6 md:-my-8 p-8 overflow-y-auto">

            <main className="max-w-7xl mx-auto py-6">
                {/* Hero Section */}
                <div className="mb-12">

                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                        <div>
                            <h1 className="text-5xl font-black text-white leading-tight">Purchase Orders</h1>
                            <p className="mt-4 text-sm text-gray-400 max-w-lg leading-relaxed font-medium">
                                Manage your supplier relationships and inventory acquisition with surgical precision, real database tracking, and aesthetic clarity.
                            </p>
                        </div>
                        <button 
                            onClick={() => router.push('/admin/procurement/new')}
                            className="bg-[#2563EB] hover:bg-[#3B82F6] text-white px-8 py-4 rounded-2xl font-bold text-xs tracking-wider uppercase transition-colors shadow-lg shadow-blue-500/20 flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" /> CREATE NEW PO
                        </button>
                    </div>
                </div>

                {/* Dashboard Widgets */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                    <div className="bg-[#1E293B] rounded-3xl p-8 border border-white/5 relative overflow-hidden group">
                        <div className="relative z-10">
                            <div className="text-[10px] font-black tracking-[0.2em] uppercase text-gray-400 mb-6">Total Spend / Oct</div>
                            <div className="text-4xl font-black text-white mb-6">{formatCurrency(analytics.totalSpend)}</div>
                            
                            <div className="w-full bg-white/10 rounded-full h-2 mb-2">
                                <div className="bg-[#3B82F6] h-2 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{ width: `${spendPercentage}%` }}></div>
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-bold text-gray-400">
                                <span>{spendPercentage}% OF BUDGET</span>
                                <span>{formatCurrency(budgetLimit)} LIMIT</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-[#1E293B] rounded-3xl p-8 border border-white/5 text-white flex flex-col justify-between relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#3B82F6]/10 rounded-bl-full flex items-start justify-end p-6 z-0 group-hover:scale-110 transition-transform">
                            <ArrowUpRight className="w-8 h-8 text-[#3B82F6] opacity-50" />
                        </div>
                        <div className="relative z-10">
                            <div className="text-[10px] font-black tracking-[0.2em] uppercase mb-6 text-[#3B82F6]">Total Ordered Units</div>
                            <div className="text-4xl font-black mb-6">{(analytics.totalOrderedUnits || 0).toLocaleString('en-IN')}</div>
                        </div>
                        <div className="text-xs text-gray-400 font-semibold mt-4">
                            Total product volume requested from all active suppliers
                        </div>
                    </div>
                </div>

                {/* Search controls */}
                <div className="flex items-center justify-between mb-8">
                    <div className="relative w-72">
                        <Search className="w-4 h-4 text-gray-500 absolute left-4.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search purchase orders..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full bg-[#1E293B] border border-white/5 rounded-2xl py-3.5 pl-12 pr-4 text-xs outline-none text-white focus:border-[#3B82F6] hover:border-white/10 transition-all placeholder-gray-500 font-medium"
                        />
                    </div>
                </div>

                {/* PO Table */}
                <div className="bg-[#1E293B] border border-white/5 rounded-3xl overflow-hidden shadow-xl">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/10">
                                <th className="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-gray-400">PO Number</th>
                                <th className="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Vendor</th>
                                <th className="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Date Issued</th>
                                <th className="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Total Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPOs.length > 0 ? filteredPOs.map((po: any) => (
                                <tr 
                                    key={po.id} 
                                    onClick={() => setSelectedPO(po)}
                                    className="border-b border-white/5 hover:bg-white/5 transition-colors group cursor-pointer"
                                >
                                    <td className="py-5 px-6">
                                        <div className="font-bold text-white text-sm group-hover:text-[#3B82F6] transition-colors">{po.poNumber}</div>
                                    </td>
                                    <td className="py-5 px-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded bg-[#3B82F6]/10 text-[#3B82F6] flex items-center justify-center text-[10px] font-black uppercase">
                                                {po.vendor?.name ? po.vendor.name.substring(0, 2) : 'VN'}
                                            </div>
                                            <div>
                                                <div className="font-bold text-white text-sm">{po.vendor?.name || 'Unknown Vendor'}</div>
                                                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mt-0.5">{po.vendor?.category || 'General'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-5 px-6 text-sm text-gray-400 font-medium">
                                        {new Date(po.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </td>
                                    <td className="py-5 px-6 font-black text-white">
                                        {formatCurrency(po.totalAmount)}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={4} className="py-12 text-center text-gray-500 text-sm font-medium">
                                        No purchase orders logged in database history.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination (Visual) */}
                <div className="flex items-center justify-between mt-6">
                    <div className="text-[10px] font-bold tracking-widest uppercase text-gray-400">
                        Showing 1-{filteredPOs.length} of {pos.length} Entries <span className="text-[#3B82F6] ml-2">— Page 1 / 1</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:bg-white/10 hover:text-white transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                        <button className="w-8 h-8 rounded-full bg-[#3B82F6] text-white flex items-center justify-center text-xs font-bold shadow-lg shadow-blue-500/20">1</button>
                        <button className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:bg-white/10 hover:text-white transition-colors"><ChevronRight className="w-4 h-4" /></button>
                    </div>
                </div>
            </main>

            {/* ORDER DETAILS MODAL */}
            {selectedPO && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
                    <div className="bg-[#1E293B] border border-white/5 rounded-3xl w-full max-w-2xl p-8 shadow-2xl relative overflow-hidden">
                        
                        {/* Close button */}
                        <button 
                            onClick={() => setSelectedPO(null)}
                            className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-2xl bg-[#3B82F6]/10 flex items-center justify-center text-[#3B82F6]">
                                <FileText className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black leading-none">{selectedPO.poNumber}</h3>
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1 block">Purchase Order Breakdown</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 bg-[#0F172A]/40 rounded-3xl p-6 border border-white/5">
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-[#3B82F6]" /> Supplier Vendor</div>
                                <div className="font-bold text-white text-base">{selectedPO.vendor?.name || 'Unknown Vendor'}</div>
                                <div className="text-xs text-gray-400 font-semibold mt-1">Category: {selectedPO.vendor?.category || 'General'}</div>
                                <div className="text-xs text-gray-500 font-medium mt-0.5">{selectedPO.vendor?.email || 'N/A'}</div>
                            </div>
                            
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-[#3B82F6]" /> Acquisition Info</div>
                                <div className="text-xs text-gray-300 font-bold">
                                    Issued On: {new Date(selectedPO.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </div>
                                <div className="mt-3">
                                    <span className={cn(
                                        "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border",
                                        getStatusStyle(selectedPO.status)
                                    )}>
                                        {formatStatus(selectedPO.status)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Items list */}
                        <div className="mb-8">
                            <h4 className="text-[10px] font-black uppercase tracking-wider text-gray-500 mb-3">Order Items</h4>
                            <div className="max-h-60 overflow-y-auto border border-white/5 rounded-2xl bg-[#0F172A]/20">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-white/5 text-[9px] font-black uppercase tracking-widest text-gray-500">
                                            <th className="py-3 px-4">Description</th>
                                            <th className="py-3 px-4">Qty</th>
                                            <th className="py-3 px-4">Unit Cost</th>
                                            <th className="py-3 px-4">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedPO.items && selectedPO.items.length > 0 ? selectedPO.items.map((item: any, idx: number) => (
                                            <tr key={idx} className="border-b border-white/5 last:border-0 text-sm">
                                                <td className="py-3 px-4 font-bold text-white text-xs">{item.description}</td>
                                                <td className="py-3 px-4 font-bold text-gray-400 text-xs">{item.quantity}</td>
                                                <td className="py-3 px-4 text-gray-400 text-xs">{formatCurrency(item.unitPrice)}</td>
                                                <td className="py-3 px-4 font-black text-white text-xs">{formatCurrency(item.total)}</td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={4} className="py-4 text-center text-xs text-gray-500 font-semibold">No items specified.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Financial summary */}
                        <div className="flex flex-col items-end gap-2 border-t border-white/5 pt-6">
                            <div className="flex justify-between w-64 text-xs font-semibold text-gray-400">
                                <span>Subtotal</span>
                                <span>{formatCurrency(selectedPO.subtotal)}</span>
                            </div>
                            <div className="flex justify-between w-64 text-xs font-semibold text-gray-400">
                                <span>Tax (18% GST)</span>
                                <span>{formatCurrency(selectedPO.tax)}</span>
                            </div>
                            {selectedPO.shipping > 0 && (
                                <div className="flex justify-between w-64 text-xs font-semibold text-gray-400">
                                    <span>Shipping</span>
                                    <span>{formatCurrency(selectedPO.shipping)}</span>
                                </div>
                            )}
                            <div className="flex justify-between w-64 text-sm font-black text-white pt-2 border-t border-white/5 mt-1">
                                <span>Grand Total</span>
                                <span className="text-[#3B82F6]">{formatCurrency(selectedPO.totalAmount)}</span>
                            </div>
                        </div>

                    </div>
                </div>
            )}

        </div>
    )
}
