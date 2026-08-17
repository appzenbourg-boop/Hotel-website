'use client'

import React, { useState, useMemo } from 'react'
import useSWR from 'swr'
import { buildContextUrl } from '@/lib/admin-context'
import { Search, Bell, Settings, Filter, Plus, ChevronLeft, ChevronRight, TrendingUp, ArrowUpRight } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function PurchaseOrdersPage() {
    const router = useRouter()
    const [search, setSearch] = useState('')
    const [activeFilter, setActiveFilter] = useState('ALL')

    const { data: rawData, isLoading } = useSWR(
        buildContextUrl('/api/admin/procurement'),
        (url) => fetch(url).then(r => r.json())
    )

    const pos = rawData?.data?.purchaseOrders || []
    const analytics = rawData?.data?.analytics || { totalSpend: 0, budgetForecast: 0 }

    const budgetLimit = 200000 // Configurable budget limit
    const spendPercentage = budgetLimit > 0 ? Math.min(100, Math.round((analytics.totalSpend / budgetLimit) * 100)) : 0

    const STATUS_FILTERS = [
        { label: 'ALL', count: pos.length },
        { label: 'DRAFT', count: pos.filter((p: any) => p.status === 'DRAFT').length },
        { label: 'PENDING', count: pos.filter((p: any) => p.status === 'PENDING_APPROVAL').length },
        { label: 'SENT', count: pos.filter((p: any) => p.status === 'SENT').length },
        { label: 'RECEIVED', count: pos.filter((p: any) => p.status === 'RECEIVED').length },
        { label: 'CANCELLED', count: pos.filter((p: any) => p.status === 'CANCELLED').length },
    ]

    const filteredPOs = useMemo(() => {
        return pos.filter((p: any) => {
            const matchesSearch = p.poNumber.toLowerCase().includes(search.toLowerCase()) || 
                                  p.vendor?.name.toLowerCase().includes(search.toLowerCase())
            const matchesTab = activeFilter === 'ALL' || 
                               (activeFilter === 'PENDING' && p.status === 'PENDING_APPROVAL') ||
                               p.status === activeFilter
            return matchesSearch && matchesTab
        })
    }, [pos, search, activeFilter])

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'PENDING_APPROVAL': return 'bg-blue-100 text-blue-800'
            case 'SENT': return 'bg-[#1D4ED8] text-white'
            case 'RECEIVED': return 'bg-gray-200 text-gray-800'
            case 'CANCELLED': return 'bg-red-100 text-red-800'
            default: return 'bg-gray-100 text-gray-600'
        }
    }

    const formatStatus = (status: string) => {
        if (status === 'PENDING_APPROVAL') return 'PENDING APPROVAL'
        return status
    }

    return (
        <div className="min-h-screen bg-[#0F172A] pb-24 font-sans text-gray-200 relative">


            <main className="max-w-7xl mx-auto px-8 py-10">
                {/* Hero Section */}
                <div className="mb-12">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="h-[1px] w-8 bg-[#3B82F6]"></div>
                        <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#3B82F6]">Procurement Intelligence</span>
                    </div>
                    <div className="flex items-end justify-between">
                        <div>
                            <h1 className="text-5xl font-black text-white leading-tight">Concierge<br/><span className="text-[#3B82F6]">Operations</span></h1>
                            <p className="mt-4 text-sm text-gray-400 max-w-lg leading-relaxed font-medium">
                                Real-time monitoring of all global asset procurement. Track spending, verify authorized vendors, and manage concierge billing.
                            </p>
                        </div>
                        <button 
                            onClick={() => router.push('/admin/procurement/new')}
                            className="bg-[#3B82F6] hover:bg-[#2563EB] text-white px-8 py-4 rounded-lg font-bold text-xs tracking-wider uppercase transition-colors shadow-lg shadow-blue-500/20 flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" /> Create Purchase Order
                        </button>
                    </div>
                </div>

                {/* Dashboard Widgets */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                    <div className="bg-[#233648] rounded-3xl p-8 border border-white/5 relative overflow-hidden group">
                        <div className="relative z-10">
                            <div className="text-[10px] font-black tracking-[0.2em] uppercase text-gray-400 mb-6">Total Spend (YTD)</div>
                            <div className="text-4xl font-black text-white mb-6">{formatCurrency(analytics.totalSpend)}</div>
                            
                            <div className="w-full bg-white/10 rounded-full h-2 mb-2">
                                <div className="bg-[#3B82F6] h-2 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{ width: `${spendPercentage}%` }}></div>
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-bold text-gray-400">
                                <span>{formatCurrency(budgetLimit)} LIMIT</span>
                                <span>{100 - spendPercentage}% REMAINING</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-[#233648] rounded-3xl p-8 border border-white/5 text-white flex flex-col justify-between relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#3B82F6]/10 rounded-bl-full flex items-start justify-end p-6 z-0 group-hover:scale-110 transition-transform">
                            <ArrowUpRight className="w-8 h-8 text-[#3B82F6] opacity-50" />
                        </div>
                        <div className="relative z-10">
                            <div className="text-[10px] font-black tracking-[0.2em] uppercase mb-6 opacity-60 text-[#3B82F6]">Budget Forecast</div>
                            <div className="text-4xl font-black mb-6">{formatCurrency(analytics.budgetForecast)}</div>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold text-white bg-white/10 w-fit px-3 py-1.5 rounded-full">
                            <TrendingUp className="w-3.5 h-3.5 text-[#3B82F6]" /> DYNAMIC PROJECTION
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex gap-4">
                        {STATUS_FILTERS.map(f => (
                            <button
                                key={f.label}
                                onClick={() => setActiveFilter(activeFilter === f.label ? 'ALL' : f.label)}
                                className={cn(
                                    "px-5 py-2.5 rounded-full text-xs font-bold tracking-wider uppercase transition-colors border",
                                    activeFilter === f.label
                                        ? "bg-[#3B82F6] text-white border-transparent" 
                                        : "bg-[#233648] text-gray-400 border-white/5 hover:bg-white/10"
                                )}
                            >
                                {f.label} <span className="ml-2 opacity-50">{f.count}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* PO Table */}
                <div className="bg-[#233648] border border-white/5 rounded-3xl overflow-hidden shadow-xl">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/10">
                                <th className="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-gray-400">PO Number</th>
                                <th className="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Vendor</th>
                                <th className="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Date Issued</th>
                                <th className="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Total Amount</th>
                                <th className="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPOs.length > 0 ? filteredPOs.map((po: any) => (
                                <tr key={po.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group cursor-pointer">
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
                                        {new Date(po.issueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </td>
                                    <td className="py-5 px-6 font-bold text-white">
                                        {formatCurrency(po.totalAmount)}
                                    </td>
                                    <td className="py-5 px-6">
                                        <div className={cn(
                                            "inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider",
                                            getStatusStyle(po.status)
                                        )}>
                                            {formatStatus(po.status)}
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center text-gray-500 text-sm font-medium">
                                        No purchase orders found matching your criteria.
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
        </div>
    )
}
