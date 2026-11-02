'use client'

import React, { useState, useEffect } from 'react'
import { Calendar, Download, RefreshCcw, Table, ShieldCheck, FileSpreadsheet } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { downloadFile } from '@/lib/download'

export default function CheckinReport() {
    const [fromDate, setFromDate] = useState('')
    const [toDate, setToDate] = useState('')
    const [data, setData] = useState<any[]>([])
    const [propertyInfo, setPropertyInfo] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [isExportingPDF, setIsExportingPDF] = useState(false)

    const fetchReport = async () => {
        setIsLoading(true)
        try {
            const params = new URLSearchParams({ base: 'checkin' })
            if (fromDate) params.append('fromDate', fromDate)
            if (toDate) params.append('toDate', toDate)
            
            const res = await fetch(`/api/admin/reports/dynamic?${params.toString()}`)
            if (res.ok) {
                const json = await res.json()
                setData(json.data || [])
                if (json.property) setPropertyInfo(json.property)
            }
        } catch (error) {
            console.error('Error fetching checkin report:', error)
            toast.error('Failed to load check-in report')
        } finally {
            setIsLoading(false)
        }
    }

    const handleExportCSV = () => {
        if (!data || data.length === 0) {
            toast.error('No check-in records to export')
            return
        }
        const headers = [
            'Room No', 'Guest Name', 'Aadhar / ID Number', 'ID Type', 'Mobile', 
            'Address', 'Check-in Date', 'Check-in Time', 'Check-out Date', 'Status', 'Balance'
        ]
        const escapeCSV = (val: any) => {
            const str = String(val ?? '')
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`
            }
            return str
        }
        const rows = data.map(row => [
            escapeCSV(row['Room No']),
            escapeCSV(row['Guest Name']),
            escapeCSV(row['Aadhar / ID Number'] || row['Aadhar']),
            escapeCSV(row['ID Type']),
            escapeCSV(row['Mobile'] || row['Phone']),
            escapeCSV(row['Address']),
            escapeCSV(row['Check-in Date']),
            escapeCSV(row['Check-in Time']),
            escapeCSV(row['Check-out Date']),
            escapeCSV(row['Status']),
            row['Balance'] ?? 0
        ])
        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
        const filename = `checkin_police_report_${fromDate || 'start'}_to_${toDate || 'end'}.csv`
        downloadFile(csvContent, filename, 'text/csv;charset=utf-8;')
        toast.success('Check-in report exported as CSV!')
    }

    const handleExportPDF = async () => {
        if (!data || data.length === 0) {
            toast.error('No check-in records to export')
            return
        }
        setIsExportingPDF(true)
        try {
            const { default: jsPDF } = await import('jspdf')
            const { default: autoTable } = await import('jspdf-autotable')

            const doc = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            })

            const hotelTitle = propertyInfo?.name || 'HOTEL GUEST MANAGEMENT SYSTEM'
            const hotelPhone = propertyInfo?.phone ? ` | Tel: ${propertyInfo.phone}` : ''

            doc.setFont('helvetica', 'bold')
            doc.setFontSize(14)
            doc.setTextColor(15, 23, 42)
            doc.text(hotelTitle.toUpperCase(), 148.5, 12, { align: 'center' })

            doc.setFont('helvetica', 'normal')
            doc.setFontSize(9)
            doc.setTextColor(71, 85, 105)
            doc.text(`DAILY GUEST ARRIVAL REGISTER & POLICE VERIFICATION REPORT${hotelPhone}`, 148.5, 17, { align: 'center' })

            doc.setFontSize(8)
            doc.setTextColor(100, 116, 139)
            const dateRangeStr = fromDate && toDate ? `Period: ${fromDate} to ${toDate}` : `Generated: ${new Date().toLocaleString('en-IN')}`
            doc.text(dateRangeStr, 10, 22)
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(180, 83, 9)
            doc.text('* Mandatory Guest Identification Record as per Police & Sarais Verification Guidelines', 287, 22, { align: 'right' })

            const headers = ['Room', 'Guest Name', 'Aadhar / ID No', 'ID Type', 'Mobile', 'Address', 'Check-In', 'Check-Out', 'Pax', 'Status']
            const rows = data.map(b => [
                b['Room No'] || '-',
                b['Guest Name'] || '-',
                b['Aadhar / ID Number'] || b['Aadhar'] || 'Pending Verification',
                b['ID Type'] || 'AADHAAR',
                b['Mobile'] || b['Phone'] || '-',
                b['Address'] || '-',
                `${b['Check-in Date']} ${b['Check-in Time'] || ''}`.trim(),
                b['Check-out Date'] || '-',
                b['Pax'] || 1,
                b['Status'] || '-'
            ])

            autoTable(doc, {
                startY: 25,
                margin: { left: 10, right: 10 },
                head: [headers],
                body: rows,
                theme: 'grid',
                headStyles: {
                    fillColor: [37, 99, 235],
                    textColor: [255, 255, 255],
                    fontSize: 7.5,
                    fontStyle: 'bold',
                    halign: 'center'
                },
                bodyStyles: {
                    fontSize: 7,
                    textColor: [30, 41, 59]
                }
            })

            const finalY = (doc as any).lastAutoTable?.finalY || 150
            const signY = Math.min(finalY + 14, 185)
            doc.setFontSize(8)
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(71, 85, 105)
            doc.text('Front Desk Executive Signature: ______________________', 12, signY)
            doc.text('General Manager Signature: ______________________', 115, signY)
            doc.text('Police Station Beat Incharge Seal: ______________________', 210, signY)

            const filename = `police_checkin_register_${new Date().toISOString().slice(0, 10)}.pdf`
            const pdfBlob = doc.output('blob')
            downloadFile(pdfBlob, filename, 'application/pdf')
            toast.success('Official Police Verification PDF generated!')
        } catch (e) {
            console.error('PDF error', e)
            toast.error('PDF export failed, downloading CSV')
            handleExportCSV()
        } finally {
            setIsExportingPDF(false)
        }
    }

    useEffect(() => {
        fetchReport()
    }, [])

    return (
        <div className="py-8 font-sans text-text-primary animate-fade-in w-full">
            <div className="bg-surface border border-border rounded-xl p-5 mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4 shadow-sm">
                <div className="flex flex-wrap items-end gap-4">
                    <div className="space-y-1.5 w-full md:w-44">
                        <label className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" /> From Date
                        </label>
                        <input 
                            type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs outline-none focus:border-[#4A9EFF]"
                        />
                    </div>
                    <div className="space-y-1.5 w-full md:w-44">
                        <label className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" /> To Date
                        </label>
                        <input 
                            type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs outline-none focus:border-[#4A9EFF]"
                        />
                    </div>
                    <button onClick={fetchReport} className="px-5 py-2 bg-[#4A9EFF] hover:bg-[#3B82F6] text-white text-xs font-bold rounded-lg shadow-md flex items-center gap-1.5 cursor-pointer">
                        {isLoading ? <RefreshCcw className="w-3.5 h-3.5 animate-spin" /> : 'Fetch Live Data'}
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <button onClick={handleExportCSV} className="px-3.5 py-2 bg-surface-light border border-border hover:bg-white/10 active:scale-95 text-text-primary text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer transition-all shadow-sm">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" /> Export CSV
                    </button>
                    <button onClick={handleExportPDF} disabled={isExportingPDF} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer transition-all shadow-md shadow-blue-600/20 disabled:opacity-50">
                        {isExportingPDF ? <RefreshCcw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                        <span>Export PDF (Police Report)</span>
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
                            <p className="text-sm font-medium">No check-in records found.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[#4A9EFF] text-white">
                                    <th className="px-3.5 py-3 text-[11px] font-bold uppercase border-r border-white/20">Room</th>
                                    <th className="px-3.5 py-3 text-[11px] font-bold uppercase border-r border-white/20">Guest Name</th>
                                    <th className="px-3.5 py-3 text-[11px] font-bold uppercase border-r border-white/20 bg-blue-700/80">
                                        <div className="flex items-center gap-1">
                                            <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
                                            <span>Aadhar / ID Number</span>
                                        </div>
                                    </th>
                                    <th className="px-3.5 py-3 text-[11px] font-bold uppercase border-r border-white/20">ID Type</th>
                                    <th className="px-3.5 py-3 text-[11px] font-bold uppercase border-r border-white/20">Mobile</th>
                                    <th className="px-3.5 py-3 text-[11px] font-bold uppercase border-r border-white/20">Address</th>
                                    <th className="px-3.5 py-3 text-[11px] font-bold uppercase border-r border-white/20">Check-in</th>
                                    <th className="px-3.5 py-3 text-[11px] font-bold uppercase border-r border-white/20">Check-out</th>
                                    <th className="px-3.5 py-3 text-[11px] font-bold uppercase border-r border-white/20">Status</th>
                                    <th className="px-3.5 py-3 text-[11px] font-bold uppercase">Balance</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {data.map((row, idx) => {
                                    const aadharVal = row['Aadhar / ID Number'] || row['Aadhar'] || 'Pending Verification'
                                    const isPending = aadharVal === 'Pending Verification' || aadharVal === 'Pending ID Proof'

                                    return (
                                        <tr key={idx} className="hover:bg-white/[0.02]">
                                            <td className="px-3.5 py-3 text-xs font-bold text-text-primary border-r border-border/30">{row['Room No']}</td>
                                            <td className="px-3.5 py-3 text-xs font-medium text-text-primary border-r border-border/30">{row['Guest Name']}</td>
                                            <td className="px-3.5 py-3 text-xs border-r border-border/30">
                                                {isPending ? (
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                                        Pending ID Proof
                                                    </span>
                                                ) : (
                                                    <span className="font-mono font-bold text-text-primary">
                                                        {aadharVal}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-3.5 py-3 text-xs text-text-secondary border-r border-border/30">{row['ID Type'] || 'AADHAAR'}</td>
                                            <td className="px-3.5 py-3 text-xs text-text-secondary border-r border-border/30">{row['Mobile'] || row['Phone']}</td>
                                            <td className="px-3.5 py-3 text-xs text-text-secondary border-r border-border/30 max-w-[160px] truncate" title={row['Address']}>{row['Address']}</td>
                                            <td className="px-3.5 py-3 text-xs text-text-secondary border-r border-border/30">{row['Check-in Date']}</td>
                                            <td className="px-3.5 py-3 text-xs text-text-secondary border-r border-border/30">{row['Check-out Date']}</td>
                                            <td className="px-3.5 py-3 text-xs font-semibold text-[#4A9EFF] border-r border-border/30">{row['Status']}</td>
                                            <td className="px-3.5 py-3 text-xs text-text-secondary">₹{row['Balance']}</td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    )
}
