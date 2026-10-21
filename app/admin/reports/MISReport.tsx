'use client'

import React, { useState, useEffect } from 'react'
import { Calendar, Search, RefreshCcw, Download } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface MISData {
    name: string
    today: { pax: number, occ: number, rev: number, rate: number, pct: number }
    mtd: { pax: number, occ: number, rev: number, rate: number, arr: number, arp: number, rpp: number }
    ytd: { pax: number, occ: number, rev: number, rate: number, pct: number }
}

export default function MISReportPage() {
    const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0])
    const [reportType, setReportType] = useState('business_source')
    const [data, setData] = useState<MISData[]>([])
    const [loading, setLoading] = useState(false)

    const fetchReport = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/admin/reports/mis?date=${fromDate}&type=${reportType}`)
            if (res.ok) {
                const json = await res.json()
                setData(json.data)
            }
        } catch (error) {
            console.error('Failed to fetch MIS report', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchReport()
    }, [fromDate, reportType])

    const handleReset = () => {
        setFromDate(new Date().toISOString().split('T')[0])
        setReportType('business_source')
    }

    const handleExport = () => {
        if (!data || data.length === 0) {
            toast.error('No MIS records to export')
            return
        }

        const headers = [
            'Report Name',
            'Today PAX',
            'Today Occupied',
            'Today Rate',
            'Today Revenue',
            'Today Occ %',
            'MTD Rate',
            'MTD Revenue',
            'MTD ARR',
            'MTD ARP',
            'MTD RPP',
            'MTD Occupied',
            'MTD Occ %',
            'YTD PAX',
            'YTD PAX %',
            'YTD Rate',
            'YTD Revenue',
            'YTD Occupied',
            'YTD Occ %'
        ]

        const escapeCSV = (val: any) => {
            const str = String(val ?? '')
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`
            }
            return str
        }

        const rows = data.map(row => [
            escapeCSV(row.name),
            row.today.pax,
            row.today.occ,
            row.today.rate.toFixed(2),
            row.today.rev.toFixed(2),
            `${row.today.pct.toFixed(2)}%`,
            row.mtd.rate.toFixed(2),
            row.mtd.rev.toFixed(2),
            row.mtd.arr.toFixed(2),
            row.mtd.arp.toFixed(2),
            row.mtd.rpp.toFixed(2),
            row.mtd.occ,
            `${((row.mtd as any).pct || 0).toFixed(2)}%`,
            row.ytd.pax,
            `${((row.ytd as any).pct || 0).toFixed(2)}%`,
            row.ytd.rate.toFixed(2),
            row.ytd.rev.toFixed(2),
            row.ytd.occ,
            `${((row.ytd as any).pct || 0).toFixed(2)}%`
        ])

        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `MIS-Report-${reportType}-${fromDate}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        toast.success('MIS report exported successfully!')
    }

    const formatCurrency = (val: number | string | null | undefined) => {
        const num = Number(val) || 0
        if (!isFinite(num) || isNaN(num) || num === 0) return '₹0'
        const abs = Math.abs(num)
        const prefix = num < 0 ? '-₹' : '₹'

        // Extreme numbers (>= 10,000 Crores or scientific)
        if (abs >= 100_000_000_000) {
            if (abs >= 10_000_000_000_000) {
                return `${prefix}${num.toExponential(2)}`
            }
            const cr = abs / 10_000_000
            return `${prefix}${cr.toLocaleString('en-IN', { maximumFractionDigits: 1 })} Cr`
        }
        // Crores (>= 1 Crore)
        if (abs >= 10_000_000) {
            const cr = abs / 10_000_000
            return `${prefix}${cr.toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr`
        }
        // Lakhs (>= 10 Lakhs)
        if (abs >= 1_000_000) {
            const l = abs / 100_000
            return `${prefix}${l.toLocaleString('en-IN', { maximumFractionDigits: 2 })} L`
        }
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(num)
    }

    const getFullCurrency = (val: number | string | null | undefined) => {
        const num = Number(val) || 0
        if (!isFinite(num) || isNaN(num)) return '₹0'
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(num)
    }

    return (
        <div className="py-8 font-sans text-text-primary animate-fade-in w-full">
            {/* Header & Controls */}
            <div className="bg-surface border border-border rounded-xl p-5 mb-6 flex flex-col md:flex-row md:items-end gap-6 shadow-sm">
                <div className="space-y-1.5 w-full md:w-48">
                    <label className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" /> From Date
                    </label>
                    <input 
                        type="date" 
                        value={fromDate}
                        onChange={e => setFromDate(e.target.value)}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none text-text-primary focus:border-[#4A9EFF] transition-colors"
                    />
                </div>
                
                <div className="space-y-1.5 w-full md:w-64">
                    <label className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider">Report Type</label>
                    <select 
                        value={reportType}
                        onChange={e => setReportType(e.target.value)}
                        className="w-full bg-[#4A9EFF] text-white border-transparent rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#3b82f6] transition-colors cursor-pointer appearance-none font-medium shadow-md"
                        style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23FFFFFF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right .7rem top 50%', backgroundSize: '.65rem auto' }}
                    >
                        <option value="business_source">Business Source</option>
                        <option value="market_segment">Market Segment</option>
                        <option value="corporate">Corporate</option>
                        <option value="booker">Booker</option>
                        <option value="room_type">Room Type</option>
                    </select>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleReset}
                        className="px-6 py-2 bg-[#4A9EFF] hover:bg-[#1e3a8a] text-white text-sm font-bold rounded-lg transition-colors shadow-md"
                    >
                        Reset
                    </button>
                    <button 
                        onClick={handleExport}
                        className="px-4 py-2 bg-surface-light border border-border hover:bg-white/10 active:scale-95 text-text-primary text-sm font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                    >
                        <Download className="w-4 h-4 text-[#4A9EFF]" /> Export
                    </button>
                </div>
            </div>

            {/* Table Area */}
            <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar pb-2">
                    {loading ? (
                        <div className="h-64 flex flex-col items-center justify-center text-text-tertiary">
                            <RefreshCcw className="w-8 h-8 animate-spin text-[#4A9EFF] mb-4" />
                            <p className="text-sm font-medium">Generating MIS Report...</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse min-w-[1200px]">
                            <thead>
                                {/* Top Header Row */}
                                <tr className="bg-[#4A9EFF] text-white">
                                    <th rowSpan={2} className="px-4 py-3 border-r border-white/20 align-middle text-sm font-bold">Report Name</th>
                                    <th colSpan={5} className="px-4 py-2 border-r border-white/20 text-center text-xs font-bold uppercase tracking-wider relative">
                                        <span className="relative z-10 px-4 bg-[#4A9EFF]">Today</span>
                                        <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/20 -z-0"></div>
                                    </th>
                                    <th colSpan={7} className="px-4 py-2 border-r border-white/20 text-center text-xs font-bold uppercase tracking-wider relative">
                                        <span className="relative z-10 px-4 bg-[#4A9EFF]">Month To Date</span>
                                        <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/20 -z-0"></div>
                                    </th>
                                    <th colSpan={6} className="px-4 py-2 text-center text-xs font-bold uppercase tracking-wider relative">
                                        <span className="relative z-10 px-4 bg-[#4A9EFF]">Year To Date</span>
                                        <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/20 -z-0"></div>
                                    </th>
                                </tr>
                                {/* Sub Header Row */}
                                <tr className="bg-[#4A9EFF] text-white border-b-2 border-[#3b82f6]">
                                    {/* Today */}
                                    <th className="px-3 py-2 text-[11px] font-semibold text-center border-r border-white/10 whitespace-nowrap">Total PAX</th>
                                    <th className="px-3 py-2 text-[11px] font-semibold text-center border-r border-white/10 whitespace-nowrap">Total Occupied</th>
                                    <th className="px-3 py-2 text-[11px] font-semibold text-center border-r border-white/10 whitespace-nowrap">Total Rate</th>
                                    <th className="px-3 py-2 text-[11px] font-semibold text-center border-r border-white/10 whitespace-nowrap">Today Revenue</th>
                                    <th className="px-3 py-2 text-[11px] font-semibold text-center border-r border-white/20 whitespace-nowrap">%</th>
                                    {/* MTD */}
                                    <th className="px-3 py-2 text-[11px] font-semibold text-center border-r border-white/10 whitespace-nowrap">Rate</th>
                                    <th className="px-3 py-2 text-[11px] font-semibold text-center border-r border-white/10 whitespace-nowrap">Total Revenue</th>
                                    <th className="px-3 py-2 text-[11px] font-semibold text-center border-r border-white/10 whitespace-nowrap">ARR</th>
                                    <th className="px-3 py-2 text-[11px] font-semibold text-center border-r border-white/10 whitespace-nowrap">ARP</th>
                                    <th className="px-3 py-2 text-[11px] font-semibold text-center border-r border-white/10 whitespace-nowrap">RPP</th>
                                    <th className="px-3 py-2 text-[11px] font-semibold text-center border-r border-white/10 whitespace-nowrap">Occupied</th>
                                    <th className="px-3 py-2 text-[11px] font-semibold text-center border-r border-white/20 whitespace-nowrap">%</th>
                                    {/* YTD */}
                                    <th className="px-3 py-2 text-[11px] font-semibold text-center border-r border-white/10 whitespace-nowrap">PAX</th>
                                    <th className="px-3 py-2 text-[11px] font-semibold text-center border-r border-white/10 whitespace-nowrap">%</th>
                                    <th className="px-3 py-2 text-[11px] font-semibold text-center border-r border-white/10 whitespace-nowrap">Rate</th>
                                    <th className="px-3 py-2 text-[11px] font-semibold text-center border-r border-white/10 whitespace-nowrap">Total Revenue</th>
                                    <th className="px-3 py-2 text-[11px] font-semibold text-center border-r border-white/10 whitespace-nowrap">Occupied</th>
                                    <th className="px-3 py-2 text-[11px] font-semibold text-center whitespace-nowrap">%</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {data.length === 0 ? (
                                    <tr>
                                        <td colSpan={19} className="px-4 py-12 text-center text-text-tertiary text-sm font-medium">
                                            No Record Found
                                        </td>
                                    </tr>
                                ) : (
                                    data.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                                            <td className="px-4 py-3 text-[13px] font-bold text-text-primary border-r border-border/50 whitespace-nowrap">{row.name}</td>
                                            
                                            {/* Today */}
                                            <td className="px-3 py-3 text-xs text-center border-r border-border/30">{row.today.pax}</td>
                                            <td className="px-3 py-3 text-xs text-center border-r border-border/30">{row.today.occ}</td>
                                            <td className="px-3 py-3 text-xs text-center border-r border-border/30 font-medium max-w-[110px] truncate" title={getFullCurrency(row.today.rate)}>{formatCurrency(row.today.rate)}</td>
                                            <td className="px-3 py-3 text-xs text-center border-r border-border/30 text-green-400 font-bold max-w-[110px] truncate" title={getFullCurrency(row.today.rev)}>{formatCurrency(row.today.rev)}</td>
                                            <td className="px-3 py-3 text-xs text-center border-r border-border/50">{row.today.pct.toFixed(2)}%</td>
                                            
                                            {/* MTD */}
                                            <td className="px-3 py-3 text-xs text-center border-r border-border/30 font-medium max-w-[110px] truncate" title={getFullCurrency(row.mtd.rate)}>{formatCurrency(row.mtd.rate)}</td>
                                            <td className="px-3 py-3 text-xs text-center border-r border-border/30 text-green-400 font-bold max-w-[110px] truncate" title={getFullCurrency(row.mtd.rev)}>{formatCurrency(row.mtd.rev)}</td>
                                            <td className="px-3 py-3 text-xs text-center border-r border-border/30 max-w-[110px] truncate" title={getFullCurrency(row.mtd.arr)}>{formatCurrency(row.mtd.arr)}</td>
                                            <td className="px-3 py-3 text-xs text-center border-r border-border/30 max-w-[110px] truncate" title={getFullCurrency(row.mtd.arp)}>{formatCurrency(row.mtd.arp)}</td>
                                            <td className="px-3 py-3 text-xs text-center border-r border-border/30 max-w-[110px] truncate" title={getFullCurrency(row.mtd.rpp)}>{formatCurrency(row.mtd.rpp)}</td>
                                            <td className="px-3 py-3 text-xs text-center border-r border-border/30">{row.mtd.occ}</td>
                                            <td className="px-3 py-3 text-xs text-center border-r border-border/50">{(row.mtd as any).pct?.toFixed(2) || '0.00'}%</td>
                                            
                                            {/* YTD */}
                                            <td className="px-3 py-3 text-xs text-center border-r border-border/30">{row.ytd.pax}</td>
                                            <td className="px-3 py-3 text-xs text-center border-r border-border/30">{(row.ytd as any).pct?.toFixed(2) || '0.00'}%</td>
                                            <td className="px-3 py-3 text-xs text-center border-r border-border/30 font-medium max-w-[110px] truncate" title={getFullCurrency(row.ytd.rate)}>{formatCurrency(row.ytd.rate)}</td>
                                            <td className="px-3 py-3 text-xs text-center border-r border-border/30 text-green-400 font-bold max-w-[110px] truncate" title={getFullCurrency(row.ytd.rev)}>{formatCurrency(row.ytd.rev)}</td>
                                            <td className="px-3 py-3 text-xs text-center border-r border-border/30">{row.ytd.occ}</td>
                                            <td className="px-3 py-3 text-xs text-center">{(row.ytd as any).pct?.toFixed(2) || '0.00'}%</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
            
        </div>
    )
}
