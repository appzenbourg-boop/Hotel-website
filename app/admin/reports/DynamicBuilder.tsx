'use client'

import React, { useState, useEffect, useRef } from 'react'
import { 
    Calendar, ChevronDown, Download, FileSpreadsheet, Plus, Save, 
    Search, Settings2, SlidersHorizontal, Table, CheckCircle2, 
    RefreshCcw, ShieldCheck, Printer, FileText, Check, Trash2, 
    X, ChevronUp, AlertCircle, Phone, MapPin, User,
    Car, Hash, Clock, Building2, FileCheck2, Bookmark
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { downloadFile } from '@/lib/download'

// Base Report Definitions with Police Verification fields for Check-in
const BASE_REPORTS = [
    { 
        id: 'checkin', 
        name: 'Check-in Report (Police Verification & Daily Register)', 
        badge: 'Police Mandatory',
        fields: [
            'Room No',
            'Guest Name',
            'Aadhar / ID Number', // Mandatory for Police Verification
            'ID Type',
            'Mobile',
            'Address',
            'Check-in Date',
            'Check-in Time',
            'Check-out Date',
            'Pax',
            'Status',
            'Balance'
        ]
    },
    { 
        id: 'pos_sales', 
        name: 'POS Sale Report', 
        fields: ['Receipt No', 'Date', 'Outlet', 'Cashier', 'Amount', 'Payment Method'] 
    },
    { 
        id: 'fo_sales', 
        name: 'FO Sale Report', 
        fields: ['Folio No', 'Room No', 'Guest Name', 'Total Amount', 'Settlement Date'] 
    },
    { 
        id: 'inventory', 
        name: 'Inventory Report', 
        fields: ['Item Name', 'Category', 'Current Stock', 'Min Level', 'Unit Price'] 
    },
    { 
        id: 'staff', 
        name: 'Staff Task Report', 
        fields: ['Staff Name', 'Department', 'Task Count', 'Hours Logged', 'Efficiency %'] 
    }
]

// Suggested columns with metadata for quick addition
const SUGGESTED_COLUMNS = [
    { 
        category: 'Police Verification (Mandatory in India)', 
        items: [
            { name: 'Aadhar / ID Number', icon: ShieldCheck, desc: 'Government Photo ID (Aadhaar, Passport, Voter, DL)', badge: 'Compulsory' },
            { name: 'ID Type', icon: FileCheck2, desc: 'AADHAAR, PASSPORT, VOTER_ID, DRIVING_LICENSE', badge: 'Mandatory' },
            { name: 'Mobile', icon: Phone, desc: 'Guest contact mobile number', badge: 'Required' },
            { name: 'Address', icon: MapPin, desc: 'Full permanent residential address & city', badge: 'Required' },
            { name: 'Police Verification', icon: ShieldCheck, desc: 'Verification status (Verified on file / Pending)', badge: 'Audit' },
            { name: 'Police Sign', icon: Bookmark, desc: 'Space for local police beat officer seal & sign', badge: 'Physical' }
        ]
    },
    {
        category: 'Stay & Vehicle Logistics',
        items: [
            { name: 'Vehicle No (VIN)', icon: Car, desc: 'Car/Bike registration plate number', badge: 'Security' },
            { name: 'Pax', icon: User, desc: 'Number of persons staying in room', badge: 'Capacity' },
            { name: 'Check-in Time', icon: Clock, desc: 'Exact arrival timestamp of guest', badge: 'Time' },
            { name: 'Check-out Time', icon: Clock, desc: 'Departure timestamp (or Standard 11:00 AM)', badge: 'Time' },
            { name: 'City', icon: MapPin, desc: 'Guest home city / district', badge: 'Geo' },
            { name: 'State', icon: MapPin, desc: 'Guest home state', badge: 'Geo' }
        ]
    },
    {
        category: 'Billing & Corporate GST',
        items: [
            { name: 'Company', icon: Building2, desc: 'Corporate / business company name', badge: 'B2B' },
            { name: 'GSTIN', icon: Hash, desc: '15-digit Corporate GSTIN for tax invoice', badge: 'GST' },
            { name: 'Tariff', icon: Hash, desc: 'Room nightly rack tariff', badge: 'Tariff' },
            { name: 'Total Amount', icon: Hash, desc: 'Total booking bill amount', badge: 'Billing' },
            { name: 'Paid Amount', icon: Hash, desc: 'Total advance and settlements paid', badge: 'Payment' }
        ]
    }
]

// Normalizes and fetches cell values flexibly (case-insensitive & aliases)
export const getCellValue = (row: any, field: string): any => {
    if (!row) return ''
    if (row[field] !== undefined && row[field] !== null && row[field] !== '') {
        return row[field]
    }
    const clean = field.toLowerCase().replace(/[^a-z0-9]/g, '')
    for (const [k, v] of Object.entries(row)) {
        if (k.toLowerCase().replace(/[^a-z0-9]/g, '') === clean) {
            if (v !== undefined && v !== null && v !== '') return v
        }
    }
    // Specific aliases
    if (clean === 'aadhar' || clean === 'aadharid' || clean === 'id' || clean === 'idnumber' || clean === 'aadharno') {
        return row['Aadhar / ID Number'] || row['Aadhar'] || row['ID Number'] || 'Pending Verification'
    }
    if (clean === 'idtype') {
        return row['ID Type'] || 'AADHAAR'
    }
    if (clean === 'vin' || clean === 'vehicleno' || clean === 'vehicle' || clean === 'vehiclenumber') {
        return row['Vehicle No'] || row['VIN'] || '-'
    }
    if (clean === 'phone' || clean === 'mobile' || clean === 'contact' || clean === 'contactno') {
        return row['Mobile'] || row['Phone'] || '-'
    }
    if (clean === 'pax' || clean === 'guests' || clean === 'numberofguests') {
        return row['Pax'] || row['Guests'] || 1
    }
    if (clean === 'address' || clean === 'guestaddress') {
        return row['Address'] || '-'
    }
    return ''
}

export default function DynamicReportBuilder() {
    const [selectedBase, setSelectedBase] = useState('checkin')
    const [fromDate, setFromDate] = useState('')
    const [toDate, setToDate] = useState('')
    const [selectedFields, setSelectedFields] = useState<string[]>([])
    
    // Custom columns added by user
    const [customFields, setCustomFields] = useState<string[]>([])
    const [newColumnName, setNewColumnName] = useState('')
    const [showOptionsDropdown, setShowOptionsDropdown] = useState(false)

    // Fetched Data & Property Info
    const [reportData, setReportData] = useState<any[]>([])
    const [propertyInfo, setPropertyInfo] = useState<{ name?: string, address?: string, phone?: string } | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [isExporting, setIsExporting] = useState(false)
    const [showExportMenu, setShowExportMenu] = useState(false)

    // Save template state & Saved Templates list
    const [reportCode, setReportCode] = useState('')
    const [reportName, setReportName] = useState('')
    const [savedTemplates, setSavedTemplates] = useState<Array<{ code: string, name: string, base: string, fields: string[] }>>([])

    const optionsRef = useRef<HTMLDivElement>(null)
    const exportRef = useRef<HTMLDivElement>(null)

    const activeReportObj = BASE_REPORTS.find(r => r.id === selectedBase)
    const baseFields = activeReportObj ? activeReportObj.fields : []
    const allAvailableFields = Array.from(new Set([...baseFields, ...customFields]))

    // Load saved templates from localStorage on mount
    useEffect(() => {
        try {
            const raw = localStorage.getItem('zenbourg_report_templates')
            if (raw) {
                const parsed = JSON.parse(raw)
                if (Array.isArray(parsed)) setSavedTemplates(parsed)
            }
        } catch (e) {
            console.error('Error loading templates', e)
        }
    }, [])

    // Close dropdowns on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (optionsRef.current && !optionsRef.current.contains(e.target as Node)) {
                setShowOptionsDropdown(false)
            }
            if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
                setShowExportMenu(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

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
                setReportData(json.data || [])
                if (json.property) setPropertyInfo(json.property)
            } else {
                toast.error('Failed to load report data')
            }
        } catch (error) {
            console.error('Error fetching report', error)
            toast.error('Error connecting to reports service')
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

    // Handles adding a column either by typed string or preset selection
    const handleAddColumn = (columnName: string) => {
        const trimmed = columnName.trim()
        if (!trimmed) return

        if (!allAvailableFields.includes(trimmed)) {
            setCustomFields(prev => [...prev, trimmed])
        }
        if (!selectedFields.includes(trimmed)) {
            setSelectedFields(prev => [...prev, trimmed])
        }
        setNewColumnName('')
        setShowOptionsDropdown(false)
        toast.success(`Column "${trimmed}" added to report!`)
    }

    // When clicking the '+' button: if typed, add it; if blank, toggle options list!
    const handlePlusButtonClick = () => {
        if (newColumnName.trim()) {
            handleAddColumn(newColumnName)
        } else {
            setShowOptionsDropdown(prev => !prev)
        }
    }

    // CSV Export
    const handleExportCSV = () => {
        if (!reportData || reportData.length === 0) {
            toast.error('No records available to export')
            return
        }
        try {
            const escapeCSV = (val: any) => {
                const str = String(val ?? '')
                if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                    return `"${str.replace(/"/g, '""')}"`
                }
                return str
            }
            const headers = selectedFields.map(escapeCSV)
            const rows = reportData.map(row => 
                selectedFields.map(field => escapeCSV(getCellValue(row, field))).join(',')
            )
            const csvContent = [headers.join(','), ...rows].join('\n')
            const dateStr = fromDate && toDate ? `${fromDate}_to_${toDate}` : new Date().toISOString().slice(0, 10)
            const filename = `${selectedBase}_police_report_${dateStr}.csv`
            downloadFile(csvContent, filename, 'text/csv;charset=utf-8;')
            setShowExportMenu(false)
            toast.success('CSV Report exported successfully!')
        } catch (e) {
            console.error('CSV export failed', e)
            toast.error('Failed to export CSV')
        }
    }

    // Official Police Verification PDF Export
    const handleExportPDF = async () => {
        if (!reportData || reportData.length === 0) {
            toast.error('No records available to export')
            return
        }
        setIsExporting(true)
        setShowExportMenu(false)
        try {
            const { default: jsPDF } = await import('jspdf')
            const autoTableModule = await import('jspdf-autotable')
            const autoTable = (autoTableModule as any).default || autoTableModule

            const isCheckin = selectedBase === 'checkin'
            const doc = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            })

            const hotelTitle = propertyInfo?.name || 'HOTEL GUEST MANAGEMENT SYSTEM'
            const hotelAddr = propertyInfo?.address || 'City / State, India'
            const hotelPhone = propertyInfo?.phone ? ` | Tel: ${propertyInfo.phone}` : ''

            // Header Banner
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(14)
            doc.setTextColor(15, 23, 42)
            doc.text(hotelTitle.toUpperCase(), 148.5, 12, { align: 'center' })

            doc.setFont('helvetica', 'normal')
            doc.setFontSize(9)
            doc.setTextColor(71, 85, 105)
            doc.text(
                isCheckin 
                    ? `DAILY GUEST ARRIVAL REGISTER & POLICE VERIFICATION REPORT${hotelPhone}` 
                    : `${activeReportObj?.name?.toUpperCase()} | ${hotelAddr}`,
                148.5, 17, { align: 'center' }
            )

            // Date Range & Legal Notice
            doc.setFontSize(8)
            doc.setTextColor(100, 116, 139)
            const dateRangeStr = fromDate && toDate ? `Period: ${fromDate} to ${toDate}` : `Generated: ${new Date().toLocaleString('en-IN')}`
            doc.text(dateRangeStr, 10, 22)

            if (isCheckin) {
                doc.setFont('helvetica', 'bold')
                doc.setTextColor(180, 83, 9)
                doc.text('* Maintained under State Police Act & Sarais Act for Mandatory Guest Identification', 287, 22, { align: 'right' })
            }

            // Table Data
            const headers = selectedFields
            const rows = reportData.map(row => 
                selectedFields.map(field => {
                    const val = getCellValue(row, field)
                    return String(val ?? '-')
                })
            )

            autoTable(doc, {
                startY: 25,
                margin: { left: 10, right: 10 },
                head: [headers],
                body: rows,
                theme: 'grid',
                headStyles: {
                    fillColor: [37, 99, 235], // Professional Royal Blue
                    textColor: [255, 255, 255],
                    fontSize: 7.5,
                    fontStyle: 'bold',
                    halign: 'center',
                    cellPadding: 2,
                    lineWidth: 0.1,
                    lineColor: [200, 220, 250]
                },
                bodyStyles: {
                    fontSize: 7,
                    textColor: [30, 41, 59],
                    cellPadding: 1.8,
                    lineWidth: 0.1,
                    lineColor: [226, 232, 240]
                },
                alternateRowStyles: {
                    fillColor: [248, 250, 252]
                }
            })

            // Police Verification Signatures Block
            if (isCheckin) {
                const finalY = (doc as any).lastAutoTable?.finalY || 150
                const signY = Math.min(finalY + 14, 185)
                doc.setFontSize(8)
                doc.setFont('helvetica', 'bold')
                doc.setTextColor(71, 85, 105)
                doc.text('Duty Receptionist Signature: ______________________', 12, signY)
                doc.text('General Manager Signature: ______________________', 115, signY)
                doc.text('Police Station Beat Incharge Seal: ______________________', 210, signY)
            }

            const dateFileStr = fromDate && toDate ? `${fromDate}_to_${toDate}` : new Date().toISOString().slice(0, 10)
            const filename = `${selectedBase}_police_verification_${dateFileStr}.pdf`
            const pdfBlob = doc.output('blob')
            downloadFile(pdfBlob, filename, 'application/pdf')
            toast.success('Official Police Verification PDF downloaded!')
        } catch (err) {
            console.error('PDF export error:', err)
            toast.error('PDF generation encountered an error. Downloading CSV instead.')
            handleExportCSV()
        } finally {
            setIsExporting(false)
        }
    }

    // Save Template Handler
    const handleSaveTemplate = () => {
        if (!reportName.trim() && !reportCode.trim()) {
            toast.error('Please enter a Report Code or Name')
            return
        }
        const newTemplate = {
            code: reportCode.trim() || `REP-${Date.now().toString().slice(-4)}`,
            name: reportName.trim() || 'Custom Dynamic Layout',
            base: selectedBase,
            fields: selectedFields
        }
        const updated = [...savedTemplates.filter(t => t.code !== newTemplate.code), newTemplate]
        setSavedTemplates(updated)
        try {
            localStorage.setItem('zenbourg_report_templates', JSON.stringify(updated))
            toast.success(`Template "${newTemplate.name}" saved successfully!`)
        } catch (e) {
            console.error('Error saving template', e)
        }
    }

    // Load saved template
    const handleApplyTemplate = (tpl: { base: string, fields: string[] }) => {
        setSelectedBase(tpl.base)
        setSelectedFields(tpl.fields)
        toast.info(`Applied template with ${tpl.fields.length} columns`)
    }

    return (
        <div className="py-8 font-sans text-text-primary animate-fade-in w-full">
            {/* Header */}
            <div className="mb-6 border-b border-border pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
                        <SlidersHorizontal className="w-6 h-6 text-[#4A9EFF]" />
                        Dynamic Report Builder
                    </h1>
                    <p className="text-sm text-text-secondary mt-1.5 max-w-2xl">
                        Design custom guest registers and audit reports. Include compulsory <strong className="text-amber-500 font-semibold">Aadhaar / Photo ID details for local Police verification</strong>, filter live records, and export to official PDF or CSV.
                    </p>
                </div>

                {/* Quick Presets / Templates */}
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-text-tertiary flex items-center gap-1">
                        <Bookmark className="w-3.5 h-3.5 text-blue-500" /> Presets:
                    </span>
                    <button
                        onClick={() => {
                            setSelectedBase('checkin')
                            setSelectedFields([
                                'Room No', 'Guest Name', 'Aadhar / ID Number', 'ID Type', 
                                'Mobile', 'Address', 'Check-in Date', 'Check-in Time', 
                                'Check-out Date', 'Pax', 'Vehicle No (VIN)', 'Police Sign'
                            ])
                            toast.success('Applied: Police Station Daily Arrival Register')
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                        <ShieldCheck className="w-3.5 h-3.5" /> Police Verification Register
                    </button>
                    <button
                        onClick={() => {
                            setSelectedBase('checkin')
                            setSelectedFields(['Room No', 'Guest Name', 'Check-in Date', 'Check-out Date', 'Status', 'Balance'])
                            toast.success('Applied: Slim Check-in Log')
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-surface-light border border-border text-text-secondary hover:text-text-primary transition-all cursor-pointer"
                    >
                        Slim Check-in
                    </button>
                    {savedTemplates.map(tpl => (
                        <button
                            key={tpl.code}
                            onClick={() => handleApplyTemplate(tpl)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-blue-500/10 text-blue-500 border border-blue-500/30 hover:bg-blue-500/20 transition-all cursor-pointer"
                        >
                            {tpl.name}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                
                {/* ── CONTROLS SIDEBAR ── */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Basic Filters */}
                    <div className="bg-surface border border-border rounded-2xl p-5 space-y-4 shadow-sm">
                        <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                            <Settings2 className="w-4 h-4 text-[#4A9EFF]" /> Data Source
                        </h3>
                        
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider">Select Base Module</label>
                                {activeReportObj?.badge && (
                                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 border border-amber-500/30 uppercase tracking-wider">
                                        {activeReportObj.badge}
                                    </span>
                                )}
                            </div>
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
                                <label className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider flex items-center gap-1">
                                    <Calendar className="w-3 h-3" /> From Date
                                </label>
                                <input 
                                    type="date" 
                                    value={fromDate}
                                    onChange={e => setFromDate(e.target.value)}
                                    className="w-full bg-background border border-border rounded-xl px-2.5 py-2 text-xs outline-none text-text-primary focus:border-[#4A9EFF] transition-colors"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider flex items-center gap-1">
                                    <Calendar className="w-3 h-3" /> To Date
                                </label>
                                <input 
                                    type="date" 
                                    value={toDate}
                                    onChange={e => setToDate(e.target.value)}
                                    className="w-full bg-background border border-border rounded-xl px-2.5 py-2 text-xs outline-none text-text-primary focus:border-[#4A9EFF] transition-colors"
                                />
                            </div>
                        </div>

                        <button 
                            onClick={handleFetchData}
                            disabled={isLoading}
                            className="w-full py-2.5 bg-[#4A9EFF] hover:bg-[#3B82F6] active:scale-[0.98] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-[#4A9EFF]/20 flex justify-center items-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                            {isLoading ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <><span>Fetch Live Data</span> <RefreshCcw className="w-3.5 h-3.5" /></>}
                        </button>
                    </div>

                    {/* Field Selection */}
                    <div className="bg-surface border border-border rounded-2xl p-5 space-y-4 shadow-sm relative">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                                <Table className="w-4 h-4 text-[#4A9EFF]" /> Columns to Include
                            </h3>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setSelectedFields(selectedFields.length === allAvailableFields.length ? [] : allAvailableFields)}
                                    className="text-[11px] font-bold text-[#4A9EFF] hover:underline cursor-pointer"
                                >
                                    {selectedFields.length === allAvailableFields.length ? 'Deselect All' : 'Select All'}
                                </button>
                                <span className="text-xs text-text-tertiary font-bold bg-surface-light px-2 py-0.5 rounded-full border border-border">
                                    {selectedFields.length}/{allAvailableFields.length}
                                </span>
                            </div>
                        </div>

                        {/* Quick Police Notice for Check-in */}
                        {selectedBase === 'checkin' && (
                            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2 text-[11px] text-amber-700 dark:text-amber-300">
                                <ShieldCheck className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                <div>
                                    <span className="font-bold">Police Verification Mandatory:</span> Aadhaar / ID number must be recorded for every adult guest.
                                </div>
                            </div>
                        )}

                        {/* Field list */}
                        <div className="space-y-1.5 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                            {allAvailableFields.map((field) => {
                                const isSelected = selectedFields.includes(field)
                                const isAadharField = field.toLowerCase().includes('aadhar') || field.toLowerCase().includes('id number')
                                return (
                                    <label key={field} className={cn(
                                        "flex items-center justify-between p-2 rounded-xl border cursor-pointer transition-all",
                                        isSelected 
                                            ? isAadharField 
                                                ? "bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-400" 
                                                : "bg-[#4A9EFF]/10 border-[#4A9EFF]/30 text-text-primary" 
                                            : "bg-background border-border/50 hover:border-border text-text-secondary"
                                    )}>
                                        <div className="flex items-center gap-2.5 overflow-hidden">
                                            <div className={cn(
                                                "w-4 h-4 rounded-[4px] border flex items-center justify-center transition-colors shrink-0",
                                                isSelected 
                                                    ? isAadharField ? "bg-amber-500 border-amber-500" : "bg-[#4A9EFF] border-[#4A9EFF]" 
                                                    : "bg-surface-light border-text-tertiary"
                                            )}>
                                                {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                                            </div>
                                            <input type="checkbox" checked={isSelected} onChange={() => handleToggleField(field)} className="hidden" />
                                            <span className="text-xs font-semibold truncate">{field}</span>
                                        </div>
                                        {isAadharField && (
                                            <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-600 dark:text-amber-300 shrink-0">
                                                Police ID
                                            </span>
                                        )}
                                    </label>
                                )
                            })}
                        </div>

                        {/* ── ADD CUSTOM COLUMN WITH POPUP OPTIONS ── */}
                        <div className="pt-3 border-t border-border mt-3 space-y-2 relative" ref={optionsRef}>
                            <div className="flex items-center justify-between">
                                <label className="text-[11px] font-black text-text-tertiary uppercase tracking-wider">
                                    Add Custom Column
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setShowOptionsDropdown(prev => !prev)}
                                    className="text-[10px] font-bold text-[#4A9EFF] hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                    <span>Browse Options</span>
                                    {showOptionsDropdown ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                </button>
                            </div>

                            {/* Input box with '+' Button */}
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    placeholder="Type column or click (+) for options..." 
                                    value={newColumnName}
                                    onChange={e => setNewColumnName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handlePlusButtonClick()}
                                    className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-xs outline-none focus:border-[#4A9EFF] transition-colors"
                                />
                                <button 
                                    type="button"
                                    title={newColumnName.trim() ? "Add custom column" : "Click to view options"}
                                    onClick={handlePlusButtonClick}
                                    className={cn(
                                        "px-3.5 py-2 rounded-xl text-white font-bold transition-all flex items-center justify-center cursor-pointer shadow-sm active:scale-95",
                                        newColumnName.trim() 
                                            ? "bg-[#4A9EFF] hover:bg-[#3B82F6]" 
                                            : "bg-emerald-600 hover:bg-emerald-700"
                                    )}
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Quick suggested chips below '+' */}
                            <div className="flex flex-wrap gap-1.5 pt-1">
                                {['Aadhar / ID Number', 'ID Type', 'Mobile', 'Address', 'Vehicle No (VIN)', 'Pax', 'Police Sign'].map(s => {
                                    const isAdded = selectedFields.includes(s)
                                    return (
                                        <button
                                            key={s}
                                            type="button"
                                            onClick={() => handleAddColumn(s)}
                                            className={cn(
                                                "px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 border",
                                                isAdded 
                                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" 
                                                    : "bg-surface-light hover:bg-surface text-text-secondary hover:text-text-primary border-border"
                                            )}
                                        >
                                            {isAdded ? <Check className="w-2.5 h-2.5 text-emerald-500" /> : <Plus className="w-2.5 h-2.5 text-[#4A9EFF]" />}
                                            <span>{s}</span>
                                        </button>
                                    )
                                })}
                            </div>

                            {/* Options Dropdown Drawer when clicking '+' */}
                            {showOptionsDropdown && (
                                <div className="absolute left-0 right-0 bottom-full mb-2 bg-surface border border-border rounded-2xl p-4 shadow-2xl z-50 space-y-3.5 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 max-h-96 overflow-y-auto custom-scrollbar">
                                    <div className="flex items-center justify-between pb-2 border-b border-border">
                                        <div className="flex items-center gap-2">
                                            <SlidersHorizontal className="w-4 h-4 text-[#4A9EFF]" />
                                            <span className="text-xs font-black uppercase tracking-wider text-text-primary">
                                                Available Column Options
                                            </span>
                                        </div>
                                        <button 
                                            onClick={() => setShowOptionsDropdown(false)}
                                            className="p-1 rounded-lg hover:bg-surface-light text-text-tertiary cursor-pointer"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>

                                    {SUGGESTED_COLUMNS.map((cat, idx) => (
                                        <div key={idx} className="space-y-1.5">
                                            <div className="text-[10px] font-black uppercase tracking-widest text-[#4A9EFF]">
                                                {cat.category}
                                            </div>
                                            <div className="grid grid-cols-1 gap-1.5">
                                                {cat.items.map(item => {
                                                    const isAdded = selectedFields.includes(item.name)
                                                    const IconComponent = item.icon
                                                    return (
                                                        <div 
                                                            key={item.name}
                                                            onClick={() => handleAddColumn(item.name)}
                                                            className={cn(
                                                                "flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition-all",
                                                                isAdded 
                                                                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                                                                    : "bg-surface-light/60 hover:bg-surface-light border-border/60 hover:border-[#4A9EFF]/50 text-text-primary"
                                                            )}
                                                        >
                                                            <div className="flex items-center gap-2 overflow-hidden">
                                                                <div className="w-6 h-6 rounded-lg bg-surface flex items-center justify-center shrink-0 border border-border/50">
                                                                    <IconComponent className="w-3.5 h-3.5 text-[#4A9EFF]" />
                                                                </div>
                                                                <div className="truncate">
                                                                    <p className="font-bold text-[11px] leading-tight">{item.name}</p>
                                                                    <p className="text-[9px] text-text-tertiary truncate leading-tight">{item.desc}</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                                                <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-surface border border-border uppercase">
                                                                    {item.badge}
                                                                </span>
                                                                {isAdded ? (
                                                                    <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-0.5">
                                                                        <Check className="w-3 h-3" />
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-[10px] font-bold text-[#4A9EFF] flex items-center gap-0.5">
                                                                        <Plus className="w-3 h-3" />
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                        </div>
                    </div>
                </div>

                {/* ── PREVIEW & SAVE AREA ── */}
                <div className="lg:col-span-3 flex flex-col space-y-6">
                    
                    {/* Table Preview */}
                    <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm flex-1 flex flex-col">
                        <div className="p-4 border-b border-border bg-black/10 dark:bg-black/20 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                                <FileSpreadsheet className="w-5 h-5 text-[#4A9EFF]" />
                                <div>
                                    <h3 className="font-bold text-text-primary text-sm leading-tight flex items-center gap-2">
                                        <span>Report Preview &amp; Live Data</span>
                                        {selectedBase === 'checkin' && (
                                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 border border-amber-500/30">
                                                Police Verification Ready
                                            </span>
                                        )}
                                    </h3>
                                    <p className="text-[11px] text-text-tertiary">
                                        {reportData.length} live records matching {selectedFields.length} active columns.
                                    </p>
                                </div>
                            </div>

                            {/* Export Buttons */}
                            <div className="flex items-center gap-2" ref={exportRef}>
                                <button
                                    onClick={handleExportCSV}
                                    className="text-xs font-bold text-text-secondary hover:text-text-primary flex items-center gap-1.5 bg-surface-light hover:bg-surface px-3 py-1.5 rounded-xl border border-border transition-all cursor-pointer shadow-sm active:scale-95"
                                    title="Export raw data to Excel / CSV"
                                >
                                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                                    <span>Export CSV</span>
                                </button>

                                <button
                                    onClick={handleExportPDF}
                                    disabled={isExporting}
                                    className="text-xs font-bold text-white flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 px-3.5 py-1.5 rounded-xl transition-all shadow-md shadow-blue-600/20 cursor-pointer disabled:opacity-50"
                                    title="Generate official printable PDF with Police Station verification layout"
                                >
                                    {isExporting ? <RefreshCcw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                                    <span>Export PDF (Police Report)</span>
                                </button>
                            </div>
                        </div>

                        {/* Table Viewport */}
                        <div className="flex-1 p-0 overflow-x-auto min-h-[420px]">
                            {selectedFields.length === 0 ? (
                                <div className="h-64 flex flex-col items-center justify-center text-text-tertiary space-y-2">
                                    <Table className="w-8 h-8 opacity-50" />
                                    <p className="text-sm font-semibold">No columns selected. Please select fields from the sidebar or click (+) to add.</p>
                                </div>
                            ) : isLoading ? (
                                <div className="h-64 flex flex-col items-center justify-center text-text-tertiary space-y-4">
                                    <RefreshCcw className="w-8 h-8 text-[#4A9EFF] animate-spin" />
                                    <p className="text-sm font-medium">Fetching real-time database records...</p>
                                </div>
                            ) : reportData.length === 0 ? (
                                <div className="h-64 flex flex-col items-center justify-center text-text-tertiary space-y-2">
                                    <AlertCircle className="w-8 h-8 text-amber-500/70" />
                                    <p className="text-sm font-medium">No records found for the selected criteria.</p>
                                    <button 
                                        onClick={handleFetchData}
                                        className="text-xs text-[#4A9EFF] font-bold hover:underline"
                                    >
                                        Try refreshing or clearing date filter
                                    </button>
                                </div>
                            ) : (
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-[#4A9EFF] text-white">
                                            {selectedFields.map(field => {
                                                const isAadhar = field.toLowerCase().includes('aadhar') || field.toLowerCase().includes('id number')
                                                return (
                                                    <th 
                                                        key={field} 
                                                        className={cn(
                                                            "px-4 py-3 text-[11px] font-black uppercase tracking-wider border-b border-r border-white/20 last:border-r-0 whitespace-nowrap",
                                                            isAadhar ? "bg-blue-700/80" : ""
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-1.5">
                                                            {isAadhar && <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />}
                                                            <span>{field}</span>
                                                        </div>
                                                    </th>
                                                )
                                            })}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50 text-text-secondary">
                                        {reportData.map((row, idx) => (
                                            <tr key={idx} className="hover:bg-white/[0.03] transition-colors">
                                                {selectedFields.map((field, colIdx) => {
                                                    const cellVal = getCellValue(row, field)
                                                    const isAadhar = field.toLowerCase().includes('aadhar') || field.toLowerCase().includes('id number')
                                                    const isPending = cellVal === 'Pending Verification' || cellVal === 'Pending ID Proof'
                                                    
                                                    return (
                                                        <td key={colIdx} className="px-4 py-3 text-[12px] whitespace-nowrap border-r border-border/30 last:border-r-0">
                                                            {isAadhar ? (
                                                                isPending ? (
                                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                                                        Pending ID Proof
                                                                    </span>
                                                                ) : (
                                                                    <span className="font-mono font-bold text-text-primary tracking-wide">
                                                                        {cellVal}
                                                                    </span>
                                                                )
                                                            ) : field === 'Status' ? (
                                                                <span className={cn(
                                                                    "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider",
                                                                    cellVal === 'CHECKED_IN' ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30" : "bg-blue-500/15 text-blue-600 border border-blue-500/30"
                                                                )}>
                                                                    {cellVal}
                                                                </span>
                                                            ) : field === 'Balance' ? (
                                                                <span className={cn("font-mono font-bold", Number(cellVal) > 0 ? "text-red-500" : "text-emerald-500")}>
                                                                    ₹{Number(cellVal).toLocaleString()}
                                                                </span>
                                                            ) : (
                                                                <span>{cellVal || '-'}</span>
                                                            )}
                                                        </td>
                                                    )
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Footer Summary */}
                        <div className="p-3.5 border-t border-border bg-surface-light text-[11px] text-text-tertiary flex flex-wrap items-center justify-between gap-3 px-6">
                            <span>Showing {reportData.length} records from database.</span>
                            <div className="flex items-center gap-3">
                                {customFields.length > 0 && (
                                    <span className="text-[#4A9EFF] font-semibold">{customFields.length} custom column(s) applied.</span>
                                )}
                                <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                                    <ShieldCheck className="w-3.5 h-3.5" /> Compliant with Police &amp; Sarais Act
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Save Template Footer */}
                    <div className="bg-surface border border-border rounded-2xl p-5 flex flex-col md:flex-row items-center gap-4 shadow-sm">
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider">Report Code</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. REP-POLICE-001"
                                    value={reportCode}
                                    onChange={e => setReportCode(e.target.value)}
                                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none text-text-primary focus:border-[#4A9EFF] transition-colors font-mono"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider">Report Name</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. Daily Police Verification Arrival Register"
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
                                className="flex-1 md:flex-none px-5 py-2.5 bg-surface-light hover:bg-white/10 border border-border text-text-secondary text-sm font-bold rounded-xl transition-colors cursor-pointer"
                            >
                                Reset
                            </button>
                            <button 
                                onClick={handleSaveTemplate}
                                className="flex-1 md:flex-none px-6 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 active:scale-95 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <Save className="w-4 h-4" /> <span>Save Template</span>
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    )
}
