'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Printer, Download, ChevronLeft, Building2, CheckCircle, Loader2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export default function StaffSalarySlipPage() {
    const { id } = useParams()
    const router = useRouter()
    const [payroll, setPayroll] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [downloading, setDownloading] = useState(false)
    const slipRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const fetchSlip = async () => {
            try {
                const res = await fetch(`/api/staff/payroll`)
                if (res.ok) {
                    const allPayroll = await res.json()
                    const slip = Array.isArray(allPayroll)
                        ? allPayroll.find((p: any) => p.id === id)
                        : null
                    setPayroll(slip || null)
                }
            } catch (error) {
                console.error(error)
            } finally {
                setLoading(false)
            }
        }
        fetchSlip()
    }, [id])

    const handlePrint = () => window.print()

    const handleDownloadPDF = async () => {
        setDownloading(true)
        try {
            const { jsPDF } = await import('jspdf')
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

            const staffName = payroll.staff?.user?.name || 'Employee'
            const hotelName = (payroll.staff?.property?.name || 'Hotel').toUpperCase()
            const slipId = `PAY-${payroll.id.substring(payroll.id.length - 6).toUpperCase()}`

            const indigo  = [99, 102, 241] as [number, number, number]
            const dark    = [15, 23, 42]   as [number, number, number]
            const mid     = [71, 85, 105]  as [number, number, number]
            const light   = [148, 163, 184] as [number, number, number]
            const emerald = [16, 185, 129] as [number, number, number]
            const white   = [255, 255, 255] as [number, number, number]
            const offWhite = [248, 250, 252] as [number, number, number]

            // Header bar
            doc.setFillColor(...indigo)
            doc.rect(0, 0, 210, 36, 'F')
            doc.setTextColor(...white)
            doc.setFontSize(20)
            doc.setFont('helvetica', 'bold')
            doc.text(hotelName, 14, 15)
            doc.setFontSize(9)
            doc.setFont('helvetica', 'normal')
            doc.text('Salary Slip', 14, 23)
            doc.text(`${payroll.month} ${payroll.year}`, 14, 30)
            doc.setFont('helvetica', 'bold')
            doc.text(slipId, 196, 15, { align: 'right' })
            doc.setFont('helvetica', 'normal')
            doc.text(`Issued: ${format(new Date(payroll.updatedAt), 'dd MMM yyyy')}`, 196, 23, { align: 'right' })

            // Employee info
            let y = 48
            doc.setTextColor(...indigo)
            doc.setFontSize(8)
            doc.setFont('helvetica', 'bold')
            doc.text('EMPLOYEE DETAILS', 14, y)
            doc.setDrawColor(...indigo)
            doc.setLineWidth(0.3)
            doc.line(14, y + 1.5, 95, y + 1.5)
            y += 7

            const infoRows = [
                ['Name',        staffName],
                ['Employee ID', payroll.staff?.employeeId || '—'],
                ['Designation', payroll.staff?.designation || '—'],
                ['Department',  payroll.staff?.department || '—'],
            ]
            infoRows.forEach(([label, value]) => {
                doc.setTextColor(...light)
                doc.setFont('helvetica', 'normal')
                doc.text(label, 14, y)
                doc.setTextColor(...dark)
                doc.setFont('helvetica', 'bold')
                doc.text(value, 55, y)
                y += 6
            })

            // Payment summary (right column)
            let y2 = 48
            doc.setTextColor(...indigo)
            doc.setFont('helvetica', 'bold')
            doc.text('PAYMENT DETAILS', 110, y2)
            doc.line(110, y2 + 1.5, 196, y2 + 1.5)
            y2 += 7

            const summaryRows = [
                ['Pay Period',  `${payroll.month} ${payroll.year}`],
                ['Status',      payroll.status],
                ['Issue Date',  format(new Date(payroll.updatedAt), 'dd MMM yyyy')],
            ]
            summaryRows.forEach(([label, value]) => {
                doc.setTextColor(...light)
                doc.setFont('helvetica', 'normal')
                doc.text(label, 110, y2)
                const isPaidStatus = label === 'Status' && payroll.status === 'PAID'
                doc.setTextColor(
                    isPaidStatus ? emerald[0] : dark[0],
                    isPaidStatus ? emerald[1] : dark[1],
                    isPaidStatus ? emerald[2] : dark[2],
                )
                doc.setFont('helvetica', 'bold')
                doc.text(value, 160, y2)
                y2 += 6
            })

            // Earnings table
            y = Math.max(y, y2) + 10
            doc.setFillColor(...indigo)
            doc.rect(14, y, 182, 9, 'F')
            doc.setTextColor(...white)
            doc.setFontSize(8)
            doc.setFont('helvetica', 'bold')
            doc.text('DESCRIPTION', 18, y + 6)
            doc.text('AMOUNT (₹)', 192, y + 6, { align: 'right' })
            y += 9

            const rows: [string, number, boolean][] = [
                ['Basic Salary',          payroll.baseSalary,        false],
                ['Overtime Pay',          payroll.overtimePay || 0,  true],
                ['Performance Incentive', payroll.incentives || 0,   true],
                ['Bonus',                 payroll.bonuses || 0,      true],
            ]
            rows.forEach(([label, amount, isExtra], idx) => {
                doc.setFillColor(idx % 2 === 0 ? white[0] : offWhite[0], idx % 2 === 0 ? white[1] : offWhite[1], idx % 2 === 0 ? white[2] : offWhite[2])
                doc.rect(14, y, 182, 9, 'F')
                doc.setDrawColor(226, 232, 240)
                doc.setLineWidth(0.2)
                doc.line(14, y + 9, 196, y + 9)
                doc.setTextColor(...mid)
                doc.setFont('helvetica', 'normal')
                doc.text(label, 18, y + 6)
                doc.setTextColor(isExtra && amount > 0 ? emerald[0] : dark[0], isExtra && amount > 0 ? emerald[1] : dark[1], isExtra && amount > 0 ? emerald[2] : dark[2])
                doc.setFont('helvetica', 'bold')
                doc.text(`${isExtra && amount > 0 ? '+' : ''}${formatCurrency(amount)}`, 192, y + 6, { align: 'right' })
                y += 9
            })

            // Deductions
            doc.setFillColor(255, 245, 245)
            doc.rect(14, y, 182, 9, 'F')
            doc.line(14, y + 9, 196, y + 9)
            doc.setTextColor(...mid)
            doc.setFont('helvetica', 'normal')
            doc.text('Deductions (Tax / Leave)', 18, y + 6)
            doc.setTextColor(239, 68, 68)
            doc.setFont('helvetica', 'bold')
            doc.text(`-${formatCurrency(payroll.deductions || 0)}`, 192, y + 6, { align: 'right' })
            y += 9

            // Net pay
            doc.setFillColor(...indigo)
            doc.rect(14, y, 182, 13, 'F')
            doc.setTextColor(...white)
            doc.setFontSize(10)
            doc.setFont('helvetica', 'bold')
            doc.text('NET PAY', 18, y + 9)
            doc.setFontSize(13)
            doc.text(formatCurrency(payroll.netSalary), 192, y + 9, { align: 'right' })
            y += 20

            // Footer
            doc.setDrawColor(226, 232, 240)
            doc.setLineWidth(0.5)
            doc.line(14, y, 196, y)
            y += 10
            doc.setTextColor(...light)
            doc.setFontSize(7)
            doc.setFont('helvetica', 'normal')
            doc.text('This is a system-generated document. No physical signature required.', 14, y)
            doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy, hh:mm a')}`, 14, y + 6)

            const filename = `Payslip_${staffName.replace(/\s+/g, '_')}_${payroll.month}_${payroll.year}.pdf`
            doc.save(filename)
            toast.success('Salary slip downloaded')
        } catch (err) {
            console.error(err)
            window.print()
        } finally {
            setDownloading(false)
        }
    }

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#0d1117]">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <p className="mt-4 text-xs text-gray-500">Loading salary slip...</p>
        </div>
    )

    if (!payroll) return (
        <div className="p-12 text-center bg-[#0d1117] min-h-screen flex flex-col items-center justify-center">
            <h2 className="text-xl font-bold text-rose-500">Salary slip not found</h2>
            <button
                onClick={() => router.back()}
                className="mt-6 px-6 py-3 bg-white/5 rounded-xl text-sm font-medium text-white hover:bg-white/10 transition-all border border-white/5"
            >
                Go Back
            </button>
        </div>
    )

    const staffName = payroll.staff?.user?.name || 'Employee'
    const hotelName = payroll.staff?.property?.name || 'Hotel'
    const slipId = `PAY-${payroll.id.substring(payroll.id.length - 6).toUpperCase()}`

    return (
        <div className="min-h-screen bg-[#0d1117] text-gray-300 pb-20 font-sans p-4 md:p-8">
            {/* Action Bar */}
            <div className="max-w-2xl mx-auto flex items-center justify-between gap-3 mb-6 no-print">
                <button
                    onClick={() => router.back()}
                    className="w-11 h-11 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-gray-400 hover:text-white transition-all active:scale-95"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex gap-2 flex-1 justify-end">
                    <button
                        onClick={handlePrint}
                        className="h-11 px-4 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center gap-2 text-xs font-semibold text-white hover:bg-white/[0.08] transition-all"
                    >
                        <Printer className="w-4 h-4" />
                        <span className="hidden sm:inline">Print</span>
                    </button>
                    <button
                        onClick={handleDownloadPDF}
                        disabled={downloading}
                        className="h-11 px-5 rounded-2xl bg-blue-600 flex items-center gap-2 text-xs font-semibold text-white shadow-lg shadow-blue-600/20 active:scale-95 disabled:opacity-50 transition-all"
                    >
                        {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        Download PDF
                    </button>
                </div>
            </div>

            {/* Salary Slip */}
            <div ref={slipRef} className="max-w-2xl mx-auto bg-white text-slate-900 rounded-3xl shadow-2xl overflow-hidden slip-printable">

                {/* Header */}
                <div className="bg-indigo-600 px-6 py-8 text-white">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
                                <Building2 className="w-7 h-7 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-black uppercase tracking-tight leading-tight">{hotelName}</h1>
                                <p className="text-indigo-200 text-xs mt-1">Salary Slip · {payroll.month} {payroll.year}</p>
                            </div>
                        </div>
                        <div className="text-right shrink-0">
                            <p className="text-indigo-300 text-[10px] uppercase tracking-wider mb-1">Receipt No.</p>
                            <p className="text-base font-mono font-bold">{slipId}</p>
                            {payroll.status === 'PAID' && (
                                <div className="flex items-center justify-end gap-1 mt-2 text-emerald-300">
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    <span className="text-[10px] font-bold">PAID</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* Employee + Payment Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {/* Employee Details */}
                        <div>
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-600 border-b border-indigo-100 pb-1.5 mb-3">Employee Details</h3>
                            <div className="space-y-2.5">
                                {[
                                    ['Name',        staffName],
                                    ['Employee ID', payroll.staff?.employeeId || '—'],
                                    ['Designation', payroll.staff?.designation || '—'],
                                    ['Department',  payroll.staff?.department || '—'],
                                ].map(([label, value]) => (
                                    <div key={label} className="flex items-start justify-between gap-2">
                                        <span className="text-[11px] text-slate-400 font-medium shrink-0 w-24">{label}</span>
                                        <span className="text-[11px] font-bold text-slate-800 text-right">{value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Payment Details */}
                        <div>
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-600 border-b border-indigo-100 pb-1.5 mb-3">Payment Details</h3>
                            <div className="space-y-2.5">
                                {[
                                    ['Pay Period', `${payroll.month} ${payroll.year}`],
                                    ['Issue Date', format(new Date(payroll.updatedAt), 'dd MMM yyyy')],
                                    ...(payroll.paidAt ? [['Paid On', format(new Date(payroll.paidAt), 'dd MMM yyyy')]] : []),
                                ].map(([label, value]) => (
                                    <div key={label} className="flex items-start justify-between gap-2">
                                        <span className="text-[11px] text-slate-400 font-medium shrink-0 w-24">{label}</span>
                                        <span className="text-[11px] font-bold text-slate-800 text-right">{value}</span>
                                    </div>
                                ))}
                                <div className="flex items-start justify-between gap-2">
                                    <span className="text-[11px] text-slate-400 font-medium shrink-0 w-24">Status</span>
                                    <span className={cn(
                                        'text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg',
                                        payroll.status === 'PAID'
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : 'bg-amber-100 text-amber-700'
                                    )}>
                                        {payroll.status}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Earnings Table */}
                    <div className="border border-slate-100 rounded-2xl overflow-hidden">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-indigo-600 text-white">
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest">Description</th>
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                <tr className="bg-white">
                                    <td className="px-4 py-3 text-sm font-semibold text-slate-700">Basic Salary</td>
                                    <td className="px-4 py-3 text-sm font-mono font-bold text-slate-800 text-right">{formatCurrency(payroll.baseSalary)}</td>
                                </tr>
                                {(payroll.overtimePay || 0) > 0 && (
                                    <tr className="bg-slate-50/50">
                                        <td className="px-4 py-3 text-sm font-semibold text-slate-700">Overtime Pay</td>
                                        <td className="px-4 py-3 text-sm font-mono font-bold text-emerald-600 text-right">+{formatCurrency(payroll.overtimePay)}</td>
                                    </tr>
                                )}
                                {(payroll.incentives || 0) > 0 && (
                                    <tr className="bg-white">
                                        <td className="px-4 py-3 text-sm font-semibold text-slate-700">Performance Incentive</td>
                                        <td className="px-4 py-3 text-sm font-mono font-bold text-emerald-600 text-right">+{formatCurrency(payroll.incentives)}</td>
                                    </tr>
                                )}
                                {(payroll.bonuses || 0) > 0 && (
                                    <tr className="bg-slate-50/50">
                                        <td className="px-4 py-3 text-sm font-semibold text-slate-700">Bonus</td>
                                        <td className="px-4 py-3 text-sm font-mono font-bold text-emerald-600 text-right">+{formatCurrency(payroll.bonuses)}</td>
                                    </tr>
                                )}
                                {(payroll.deductions || 0) > 0 && (
                                    <tr className="bg-red-50/40">
                                        <td className="px-4 py-3 text-sm font-semibold text-slate-700">Deductions (Tax / Leave)</td>
                                        <td className="px-4 py-3 text-sm font-mono font-bold text-red-500 text-right">-{formatCurrency(payroll.deductions)}</td>
                                    </tr>
                                )}
                                <tr className="bg-indigo-600">
                                    <td className="px-4 py-4 text-sm font-black text-white uppercase tracking-wide">Net Pay</td>
                                    <td className="px-4 py-4 text-xl font-mono font-black text-white text-right">{formatCurrency(payroll.netSalary)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Footer */}
                    <div className="border-t border-slate-100 pt-5 flex flex-col sm:flex-row justify-between items-start gap-4">
                        <div>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2">Authorised by</p>
                            <div className="w-40 h-10 border-b-2 border-slate-200 bg-slate-50 rounded-t-lg" />
                            <p className="text-xs font-semibold text-slate-600 mt-1">{hotelName} · HR</p>
                        </div>
                        <div className="text-slate-400 space-y-1 sm:text-right">
                            <p className="text-[10px]">System-generated document.</p>
                            <p className="text-[10px]">No physical signature required.</p>
                            <p className="text-[10px]">Generated: {format(new Date(), 'dd MMM yyyy')}</p>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; padding: 0 !important; margin: 0 !important; }
                    .slip-printable {
                        box-shadow: none !important;
                        border: none !important;
                        width: 100% !important;
                        margin: 0 !important;
                        border-radius: 0 !important;
                    }
                }
            `}</style>
        </div>
    )
}
