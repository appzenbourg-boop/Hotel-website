'use client'

import React, { useState, useEffect } from 'react'
import { Calendar, ChevronDown, Download, FileSpreadsheet, Plus, Save, Search, Settings2, SlidersHorizontal, Table, CheckCircle2, RefreshCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

const BASE_REPORTS = [
    { id: 'checkin', name: 'Check-in Report', fields: ['Guest Name', 'Room No', 'Check-in Date', 'Check-out Date', 'Status', 'Balance'] },
    { id: 'pos_sales', name: 'POS Sale Report', fields: ['Receipt No', 'Date', 'Outlet', 'Cashier', 'Amount', 'Payment Method'] },
    { id: 'fo_sales', name: 'FO Sale Report', fields: ['Folio No', 'Room No', 'Guest Name', 'Total Amount', 'Settlement Date'] },
    { id: 'inventory', name: 'Inventory Report', fields: ['Item Name', 'Category', 'Current Stock', 'Min Level', 'Unit Price'] },
    { id: 'staff', name: 'Staff Task Report', fields: ['Staff Name', 'Department', 'Task Count', 'Hours Logged', 'Efficiency %'] }
]

export default function DynamicReportBuilder() {
    const [selectedBase, setSelectedBase] = useState('checkin')
    const [fromDate, setFromDate] = useState('')
    const [toDate, setToDate] = useState('')
    const [selectedFields, setSelectedFields] = useState<string[]>([])
    
    // Custom columns added by user
    const [customFields, setCustomFields] = useState<string[]>([])
    const [newColumnName, setNewColumnName] = useState('')

    // Fetched Data
    const [reportData, setReportData] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(false)

    // Save template state
    const [reportCode, setReportCode] = useState('')
    const [reportName, setReportName] = useState('')

    const activeReportObj = BASE_REPORTS.find(r => r.id === selectedBase)
    const baseFields = activeReportObj ? activeReportObj.fields : []
    const allAvailableFields = [...baseFields, ...customFields]

    // When base changes, reset fields or select all by default
    useEffect(() => {
        setCustomFields([]) // Reset custom fields on module change
        setSelectedFields(baseFields)
        // Auto-fetch data on load
        fetchData(selectedBase, fromDate, toDate)
    }, [selectedBase])

    const fetchData = async (base: string, start: string, end: string) => {
        setIsLoading(true)
        try {
            const params = new URLSearchParams()
            params.append('base', base)
            if (start) params.append('fromDate', start)
            if (end) params.append('toDate', end)

            const res = await fetch(`/api/admin/reports/dynamic?${params.toString()}`)
            if (res.ok) {
                const json = await res.json()
                setReportData(json.data)
            }
        } catch (error) {
            console.error('Error fetching report', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleFetchData = () => {
        fetchData(selectedBase, fromDate, toDate)
    }

    const handleToggleField = (field: string) => {
        setSelectedFields(prev => 
            prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]
        )
    }

    const handleAddCustomColumn = () => {
        if (!newColumnName.trim()) return
        const colName = newColumnName.trim()
        if (!allAvailableFields.includes(colName)) {
            setCustomFields(prev => [...prev, colName])
            setSelectedFields(prev => [...prev, colName])
        }
        setNewColumnName('')
    }

    return (
        <div className="py-8 font-sans text-text-primary animate-fade-in w-full">
            <div className="mb-8 border-b border-border pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
                        <SlidersHorizontal className="w-6 h-6 text-[#4A9EFF]" />
                        Dynamic Report Builder
                    </h1>
                    <p className="text-sm text-text-secondary mt-2 max-w-xl">
                        Design custom reports by selecting a base module, filtering dates, and picking exactly which columns to include. You can then save this layout as a template.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                
                {/* ── CONTROLS SIDEBAR ── */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Basic Filters */}
                    <div className="bg-surface border border-border rounded-2xl p-5 space-y-5">
                        <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                            <Settings2 className="w-4 h-4 text-text-secondary" /> Data Source
                        </h3>
                        
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider">Select Base Module</label>
                            <select 
                                value={selectedBase} 
                                onChange={e => setSelectedBase(e.target.value)}
                                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none text-text-primary focus:border-[#4A9EFF] transition-colors cursor-pointer"
                            >
                                {BASE_REPORTS.map(r => (
                                    <option key={r.id} value={r.id}>{r.name}</option>
                                ))}
                            </select>
                        </div>



                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider">From Date</label>
                                <input 
                                    type="date" 
                                    value={fromDate}
                                    onChange={e => setFromDate(e.target.value)}
                                    className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-xs outline-none text-text-primary focus:border-[#4A9EFF] transition-colors"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider">To Date</label>
                                <input 
                                    type="date" 
                                    value={toDate}
                                    onChange={e => setToDate(e.target.value)}
                                    className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-xs outline-none text-text-primary focus:border-[#4A9EFF] transition-colors"
                                />
                            </div>
                        </div>

                        <button 
                            onClick={handleFetchData}
                            className="w-full py-2.5 bg-[#4A9EFF] hover:bg-[#3B82F6] text-white font-bold text-sm rounded-xl transition-colors shadow-lg shadow-[#4A9EFF]/20 flex justify-center items-center gap-2"
                        >
                            {isLoading ? <RefreshCcw className="w-4 h-4 animate-spin" /> : 'Fetch Live Data'}
                        </button>
                    </div>

                    {/* Field Selection */}
                    <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
                        <h3 className="text-sm font-bold text-text-primary flex items-center justify-between">
                            <span className="flex items-center gap-2"><Table className="w-4 h-4 text-text-secondary" /> Columns to Include</span>
                            <span className="text-xs text-text-tertiary font-normal">{selectedFields.length}/{allAvailableFields.length}</span>
                        </h3>
                        <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                            {allAvailableFields.map((field) => {
                                const isSelected = selectedFields.includes(field)
                                return (
                                    <label key={field} className={cn(
                                        "flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors",
                                        isSelected ? "bg-[#4A9EFF]/10 border-[#4A9EFF]/30" : "bg-background border-border/50 hover:border-border"
                                    )}>
                                        <div className={cn(
                                            "w-4 h-4 rounded-[4px] border flex items-center justify-center transition-colors",
                                            isSelected ? "bg-[#4A9EFF] border-[#4A9EFF]" : "bg-surface-light border-text-tertiary"
                                        )}>
                                            {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                                        </div>
                                        <input type="checkbox" checked={isSelected} onChange={() => handleToggleField(field)} className="hidden" />
                                        <span className={cn("text-xs font-medium", isSelected ? "text-text-primary" : "text-text-secondary")}>
                                            {field}
                                        </span>
                                    </label>
                                )
                            })}
                        </div>

                        {/* Add Custom Column UI */}
                        <div className="pt-3 border-t border-border mt-3">
                            <label className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider mb-2 block">Add Custom Empty Column</label>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    placeholder="Column Name" 
                                    value={newColumnName}
                                    onChange={e => setNewColumnName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAddCustomColumn()}
                                    className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-xs outline-none focus:border-[#4A9EFF] transition-colors"
                                />
                                <button 
                                    onClick={handleAddCustomColumn}
                                    className="px-3 py-2 bg-surface-light hover:bg-white/10 border border-border rounded-lg text-text-primary transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── PREVIEW & SAVE AREA ── */}
                <div className="lg:col-span-3 flex flex-col space-y-6">
                    
                    {/* Table Preview */}
                    <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm flex-1 flex flex-col">
                        <div className="p-4 border-b border-border bg-black/20 flex items-center justify-between">
                            <h3 className="font-bold text-text-primary text-sm flex items-center gap-2">
                                <FileSpreadsheet className="w-4 h-4 text-[#4A9EFF]" /> Report Preview & Live Data
                            </h3>
                            <button className="text-xs font-semibold text-text-secondary hover:text-text-primary flex items-center gap-1.5 bg-surface-light px-3 py-1.5 rounded-lg border border-border transition-colors">
                                <Download className="w-3.5 h-3.5" /> Export PDF/CSV
                            </button>
                        </div>
                        <div className="flex-1 p-0 overflow-x-auto min-h-[400px]">
                            {selectedFields.length === 0 ? (
                                <div className="h-64 flex flex-col items-center justify-center text-text-tertiary space-y-2">
                                    <Table className="w-8 h-8 opacity-50" />
                                    <p className="text-sm">No columns selected. Please select fields from the sidebar.</p>
                                </div>
                            ) : isLoading ? (
                                <div className="h-64 flex flex-col items-center justify-center text-text-tertiary space-y-4">
                                    <RefreshCcw className="w-8 h-8 text-[#4A9EFF] animate-spin" />
                                    <p className="text-sm font-medium">Fetching real-time data...</p>
                                </div>
                            ) : reportData.length === 0 ? (
                                <div className="h-64 flex flex-col items-center justify-center text-text-tertiary space-y-2">
                                    <p className="text-sm font-medium">No records found for the selected criteria.</p>
                                </div>
                            ) : (
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-[#4A9EFF] text-white">
                                            {selectedFields.map(field => (
                                                <th key={field} className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider border-b border-r border-[#4A9EFF]/20 last:border-r-0 whitespace-nowrap">
                                                    {field}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/[0.04]">
                                        {reportData.map((row, idx) => (
                                            <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                                                {selectedFields.map((field, colIdx) => (
                                                    <td key={colIdx} className="px-4 py-3 text-[12px] text-text-secondary whitespace-nowrap">
                                                        {row[field] !== undefined ? row[field] : '' /* Empty for custom columns */}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                        <div className="p-3 border-t border-border bg-surface-light text-[11px] text-text-tertiary text-center flex justify-between px-6">
                            <span>Showing up to {reportData.length} live records from the database.</span>
                            {customFields.length > 0 && <span className="text-[#4A9EFF]">{customFields.length} custom column(s) applied.</span>}
                        </div>
                    </div>

                    {/* Save Template Footer */}
                    <div className="bg-surface border border-border rounded-2xl p-5 flex flex-col md:flex-row items-center gap-4">
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider">Report Code</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. REP-FO-001"
                                    value={reportCode}
                                    onChange={e => setReportCode(e.target.value)}
                                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none text-text-primary focus:border-[#4A9EFF] transition-colors font-mono"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider">Report Name</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. Daily Check-in Log (Slim)"
                                    value={reportName}
                                    onChange={e => setReportName(e.target.value)}
                                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none text-text-primary focus:border-[#4A9EFF] transition-colors"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0 pt-5">
                            <button 
                                onClick={() => {
                                    setReportCode('')
                                    setReportName('')
                                }}
                                className="flex-1 md:flex-none px-6 py-2.5 bg-surface-light hover:bg-white/10 border border-border text-text-secondary text-sm font-bold rounded-xl transition-colors"
                            >
                                Reset
                            </button>
                            <button className="flex-1 md:flex-none px-6 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2">
                                <Save className="w-4 h-4" /> Save Template
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    )
}

