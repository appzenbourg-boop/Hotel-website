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

            const formatCurrencyPDF = (amount: number) => {
                return `Rs. ${(amount || 0).toLocaleString('en-IN')}`
            }

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
            doc.text('AMOUNT (INR)', 192, y + 6, { align: 'right' })
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
                doc.text(`${isExtra && amount > 0 ? '+' : ''}${formatCurrencyPDF(amount)}`, 192, y + 6, { align: 'right' })
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
            doc.text(`-${formatCurrencyPDF(payroll.deductions || 0)}`, 192, y + 6, { align: 'right' })
            y += 9

            // Net pay
            doc.setFillColor(...indigo)
            doc.rect(14, y, 182, 13, 'F')
            doc.text('NET PAY', 18, y + 9)
            doc.setFontSize(13)
            doc.text(formatCurrencyPDF(payroll.netSalary), 192, y + 9, { align: 'right' })
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
            <div ref={slipRef} className="max-w-2xl mx-auto bg-white text-slate-900 rounded-[32px] shadow-2xl overflow-hidden slip-printable border border-slate-100">
                {/* Header with deep elegant indigo to violet gradient */}
                <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-600 px-8 py-10 text-white relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_50%)]"></div>
                    <div className="flex items-start justify-between gap-4 relative z-10">
                        <div className="flex items-center gap-4">
                            {payroll.staff?.profilePhoto ? (
                                <img 
                                    src={payroll.staff.profilePhoto} 
                                    alt={staffName} 
                                    className="w-16 h-16 rounded-2xl object-cover border-2 border-white/20 shadow-md shadow-black/10 shrink-0"
                                />
                            ) : (
                                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center shrink-0 border border-white/10 shadow-md">
                                    <Building2 className="w-8 h-8 text-white" />
                                </div>
                            )}
                            <div>
                                <h1 className="text-2xl font-black uppercase tracking-tight leading-none font-sans">{hotelName}</h1>
                                <p className="text-indigo-200 text-xs mt-2 font-medium tracking-wide">Salary Disbursement Slip · {payroll.month} {payroll.year}</p>
                            </div>
                        </div>
                        <div className="text-right shrink-0">
                            <p className="text-indigo-200 text-[10px] font-black uppercase tracking-widest mb-1.5 opacity-80">Reference No.</p>
                            <p className="text-base font-mono font-black tracking-wide text-white bg-black/20 px-3 py-1 rounded-xl border border-white/10 shadow-inner">{slipId}</p>
                            {payroll.status === 'PAID' && (
                                <div className="inline-flex items-center gap-1.5 mt-3 text-emerald-300 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                                    <span className="text-[10px] font-black uppercase tracking-widest">DISBURSED</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-8 space-y-8 bg-slate-50/30">
                    {/* Employee + Payment Info Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        {/* Employee Details */}
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-600 border-b border-indigo-100 pb-2 mb-3.5 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                Employee Details
                            </h3>
                            <div className="space-y-3">
                                {[
                                    ['Name',        staffName],
                                    ['Employee ID', payroll.staff?.employeeId || '—'],
                                    ['Designation', payroll.staff?.designation || '—'],
                                    ['Department',  payroll.staff?.department || '—'],
                                ].map(([label, value]) => (
                                    <div key={label} className="flex flex-col gap-0.5">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{label}</span>
                                        <span className="text-xs font-extrabold text-slate-800">{value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Payment Details */}
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-600 border-b border-indigo-100 pb-2 mb-3.5 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                Pay Period Details
                            </h3>
                            <div className="space-y-3">
                                {[
                                    ['Pay Cycle',   `${payroll.month} ${payroll.year}`],
                                    ['Issue Date',  format(new Date(payroll.updatedAt), 'dd MMM yyyy')],
                                    ...(payroll.paidAt ? [['Paid On', format(new Date(payroll.paidAt), 'dd MMM yyyy')]] : []),
                                ].map(([label, value]) => (
                                    <div key={label} className="flex flex-col gap-0.5">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{label}</span>
                                        <span className="text-xs font-extrabold text-slate-800">{value}</span>
                                    </div>
                                ))}
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Status</span>
                                    <span className={cn(
                                        'inline-block self-start text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full mt-1 border',
                                        payroll.status === 'PAID'
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                            : 'bg-amber-50 text-amber-700 border-amber-100'
                                    )}>
                                        {payroll.status}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Disbursement Details */}
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-600 border-b border-indigo-100 pb-2 mb-3.5 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                Bank Details
                            </h3>
                            <div className="space-y-3">
                                {[
                                    ['Bank Name', payroll.bankDetails?.bankName || payroll.staff?.bankName || 'N/A'],
                                    ['A/C Number', payroll.bankDetails?.accountNumber || payroll.staff?.accountNumber || 'N/A'],
                                    ['IFSC Code', payroll.bankDetails?.ifscCode || payroll.staff?.ifscCode || 'N/A'],
                                    ['Transaction ID', payroll.transactionId || '—'],
                                ].map(([label, value]) => (
                                    <div key={label} className="flex flex-col gap-0.5">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{label}</span>
                                        <span className="text-xs font-extrabold text-slate-800 truncate font-mono max-w-full block" title={value}>{value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Earnings & Deductions Table */}
                    <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gradient-to-r from-indigo-50 to-indigo-50/50 border-b border-indigo-100">
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-indigo-700">Earnings &amp; Allowances Description</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-indigo-700 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                <tr className="hover:bg-slate-50/30 transition-colors">
                                    <td className="px-6 py-4 text-xs font-extrabold text-slate-700">Basic Monthly Salary</td>
                                    <td className="px-6 py-4 text-xs font-mono font-black text-slate-800 text-right">{formatCurrency(payroll.baseSalary)}</td>
                                </tr>
                                {(payroll.overtimePay || 0) > 0 && (
                                    <tr className="hover:bg-slate-50/30 transition-colors">
                                        <td className="px-6 py-4 text-xs font-extrabold text-slate-700 flex items-center gap-2">
                                            Overtime Allowance
                                            <span className="text-[9px] bg-emerald-50 text-emerald-700 font-black uppercase px-2 py-0.5 rounded-full border border-emerald-100">Extra</span>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-mono font-black text-emerald-600 text-right">+{formatCurrency(payroll.overtimePay)}</td>
                                    </tr>
                                )}
                                {(payroll.incentives || 0) > 0 && (
                                    <tr className="hover:bg-slate-50/30 transition-colors">
                                        <td className="px-6 py-4 text-xs font-extrabold text-slate-700 flex items-center gap-2">
                                            Performance Incentive
                                            <span className="text-[9px] bg-emerald-50 text-emerald-700 font-black uppercase px-2 py-0.5 rounded-full border border-emerald-100">Incentive</span>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-mono font-black text-emerald-600 text-right">+{formatCurrency(payroll.incentives)}</td>
                                    </tr>
                                )}
                                {(payroll.bonuses || 0) > 0 && (
                                    <tr className="hover:bg-slate-50/30 transition-colors">
                                        <td className="px-6 py-4 text-xs font-extrabold text-slate-700 flex items-center gap-2">
                                            Performance Bonus
                                            <span className="text-[9px] bg-emerald-50 text-emerald-700 font-black uppercase px-2 py-0.5 rounded-full border border-emerald-100">Bonus</span>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-mono font-black text-emerald-600 text-right">+{formatCurrency(payroll.bonuses)}</td>
                                    </tr>
                                )}
                                {(payroll.deductions || 0) > 0 && (
                                    <tr className="bg-rose-50/20 hover:bg-rose-50/30 transition-colors">
                                        <td className="px-6 py-4 text-xs font-extrabold text-slate-700 flex items-center gap-2">
                                            Leave Deductions &amp; Taxes
                                            <span className="text-[9px] bg-rose-50 text-rose-700 font-black uppercase px-2 py-0.5 rounded-full border border-rose-100">Deduction</span>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-mono font-black text-rose-500 text-right">-{formatCurrency(payroll.deductions)}</td>
                                    </tr>
                                )}
                                <tr className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/10">
                                    <td className="px-6 py-5 text-sm font-black uppercase tracking-widest text-white/90">Net Disbursed Amount</td>
                                    <td className="px-6 py-5 text-xl font-mono font-black text-white text-right">{formatCurrency(payroll.netSalary)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Authorisation and Sign-off */}
                    <div className="border-t border-slate-100 pt-6 flex flex-col sm:flex-row justify-between items-start gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center shrink-0">
                                <CheckCircle className="w-6 h-6 text-indigo-600" />
                            </div>
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Digitally Signed &amp; Approved</p>
                                <p className="text-xs font-extrabold text-slate-800">{hotelName} HR Department</p>
                                <p className="text-[10px] text-emerald-600 font-bold mt-0.5">✓ Verification Status: Authenticated</p>
                            </div>
                        </div>
                        <div className="text-slate-400 space-y-1 sm:text-right text-xs">
                            <p className="text-[10px] font-semibold">This is a certified digital payout slip.</p>
                            <p className="text-[10px] font-semibold">Requires no physical signature under IT Act 2000.</p>
                            <p className="text-[10px] font-semibold font-mono">Generated: {format(new Date(), 'dd MMM yyyy, hh:mm a')}</p>
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
