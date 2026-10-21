'use client'

import React, { useState, useEffect } from 'react'
import { Calendar, Download, RefreshCcw, Table } from 'lucide-react'
import { toast } from 'sonner'

export default function CheckinReport() {
    const [fromDate, setFromDate] = useState('')
    const [toDate, setToDate] = useState('')
    const [data, setData] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(false)

    const fetchReport = async () => {
        setIsLoading(true)
        try {
            const params = new URLSearchParams({ base: 'checkin' })
            if (fromDate) params.append('fromDate', fromDate)
            if (toDate) params.append('toDate', toDate)
            
            const res = await fetch(`/api/admin/reports/dynamic?${params.toString()}`)
            if (res.ok) {
                const json = await res.json()
                setData(json.data)
            }
        } catch (error) {
            console.error('Error fetching checkin report:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleExport = () => {
        if (!data || data.length === 0) {
            toast.error('No check-in records to export')
            return
        }
        const headers = ['Guest Name', 'Room No', 'Check-in Date', 'Check-out Date', 'Status', 'Balance']
        const escapeCSV = (val: any) => {
            const str = String(val ?? '')
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`
            }
            return str
        }
        const rows = data.map(row => [
            escapeCSV(row['Guest Name']),
            escapeCSV(row['Room No']),
            escapeCSV(row['Check-in Date']),
            escapeCSV(row['Check-out Date']),
            escapeCSV(row['Status']),
            row['Balance'] ?? 0
        ])
        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `checkin-report-${fromDate || 'start'}-to-${toDate || 'end'}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        toast.success('Check-in report exported successfully!')
    }

    useEffect(() => {
        fetchReport()
    }, [])

    return (
        <div className="py-8 font-sans text-text-primary animate-fade-in w-full">
            <div className="bg-surface border border-border rounded-xl p-5 mb-6 flex flex-col md:flex-row md:items-end gap-6 shadow-sm">
                <div className="space-y-1.5 w-full md:w-48">
                    <label className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" /> From Date
                    </label>
                    <input 
                        type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-[#4A9EFF]"
                    />
                </div>
                <div className="space-y-1.5 w-full md:w-48">
                    <label className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" /> To Date
                    </label>
                    <input 
                        type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-[#4A9EFF]"
                    />
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={fetchReport} className="px-6 py-2 bg-[#4A9EFF] hover:bg-[#3B82F6] text-white text-sm font-bold rounded-lg shadow-md flex items-center gap-2">
                        {isLoading ? <RefreshCcw className="w-4 h-4 animate-spin" /> : 'Fetch Data'}
                    </button>
                    <button onClick={handleExport} className="px-4 py-2 bg-surface-light border border-border hover:bg-white/10 active:scale-95 text-text-primary text-sm font-bold rounded-lg flex items-center gap-2 cursor-pointer transition-all shadow-sm">
                        <Download className="w-4 h-4 text-[#4A9EFF]" /> Export
                    </button>
                </div>
            </div>

            <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto min-h-[400px]">
                    {isLoading ? (
                        <div className="h-64 flex flex-col items-center justify-center text-text-tertiary">
                            <RefreshCcw className="w-8 h-8 animate-spin text-[#4A9EFF] mb-4" />
                            <p className="text-sm font-medium">Fetching Records...</p>
                        </div>
                    ) : data.length === 0 ? (
                        <div className="h-64 flex flex-col items-center justify-center text-text-tertiary">
                            <Table className="w-8 h-8 opacity-50 mb-2" />
                            <p className="text-sm font-medium">No records found.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[#4A9EFF] text-white">
                                    <th className="px-4 py-3 text-[11px] font-bold uppercase border-r border-white/20">Guest Name</th>
                                    <th className="px-4 py-3 text-[11px] font-bold uppercase border-r border-white/20">Room No</th>
                                    <th className="px-4 py-3 text-[11px] font-bold uppercase border-r border-white/20">Check-in Date</th>
                                    <th className="px-4 py-3 text-[11px] font-bold uppercase border-r border-white/20">Check-out Date</th>
                                    <th className="px-4 py-3 text-[11px] font-bold uppercase border-r border-white/20">Status</th>
                                    <th className="px-4 py-3 text-[11px] font-bold uppercase">Balance</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {data.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-white/[0.02]">
                                        <td className="px-4 py-3 text-xs text-text-primary border-r border-border/30">{row['Guest Name']}</td>
                                        <td className="px-4 py-3 text-xs text-text-secondary border-r border-border/30">{row['Room No']}</td>
                                        <td className="px-4 py-3 text-xs text-text-secondary border-r border-border/30">{row['Check-in Date']}</td>
                                        <td className="px-4 py-3 text-xs text-text-secondary border-r border-border/30">{row['Check-out Date']}</td>
                                        <td className="px-4 py-3 text-xs font-semibold text-[#4A9EFF] border-r border-border/30">{row['Status']}</td>
                                        <td className="px-4 py-3 text-xs text-text-secondary">₹{row['Balance']}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    )
}
