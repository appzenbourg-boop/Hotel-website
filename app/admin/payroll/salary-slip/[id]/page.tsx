'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Printer, Download, ArrowLeft, Building2, CheckCircle } from 'lucide-react'
import Button from '@/components/ui/Button'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'

export default function SalarySlipPage() {
    const { id } = useParams()
    const router = useRouter()
    const [payroll, setPayroll] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [downloading, setDownloading] = useState(false)
    const slipRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const fetchSlip = async () => {
            try {
                // Use the dedicated /api/payroll/[id] endpoint
                const res = await fetch(`/api/payroll/${id}`)
                if (res.ok) {
                    const data = await res.json()
                    setPayroll(data.payroll)
                }
            } catch (error) {
                console.error(error)
            } finally {
                setLoading(false)
            }
        }
        fetchSlip()
    }, [id])

    const handlePrint = () => {
        window.print()
    }

    const handleDownloadPDF = async () => {
        setDownloading(true)
        try {
            // Dynamically import jsPDF to avoid SSR issues
            const { jsPDF } = await import('jspdf')
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

            const staffName = payroll.staff?.user?.name || payroll.staff?.name || 'Employee'
            const slipId = `ZB-PAY-${payroll.id.substring(payroll.id.length - 6).toUpperCase()}`

            // ── Colors ──
            const indigo = [99, 102, 241] as [number, number, number]
            const slate900 = [15, 23, 42] as [number, number, number]
            const slate600 = [71, 85, 105] as [number, number, number]
            const slate400 = [148, 163, 184] as [number, number, number]
            const emerald = [16, 185, 129] as [number, number, number]
            const white = [255, 255, 255] as [number, number, number]
            const lightGray = [248, 250, 252] as [number, number, number]

            // ── Header Bar ──
            doc.setFillColor(...indigo)
            doc.rect(0, 0, 210, 36, 'F')

            const hotelName = (payroll.staff?.property?.name || 'ZENBOURG').toUpperCase()
            const hotelAddress = payroll.staff?.property?.address || 'Hotel Address'

            doc.setTextColor(...white)
            doc.setFontSize(22)
            doc.setFont('helvetica', 'bold')
            doc.text(hotelName, 14, 16)
            doc.setFontSize(9)
            doc.setFont('helvetica', 'normal')
            doc.text('Employee Pay Slip', 14, 24)
            doc.text(`${payroll.month} ${payroll.year}`, 14, 30)

            doc.setFontSize(9)
            doc.setFont('helvetica', 'bold')
            doc.text(slipId, 196, 16, { align: 'right' })
            doc.setFont('helvetica', 'normal')
            doc.text(`Issued: ${format(new Date(payroll.updatedAt), 'dd MMM yyyy')}`, 196, 24, { align: 'right' })

            // ── Two-column Info ──
            let y = 48

            // Left: Employee Info
            doc.setTextColor(...indigo)
            doc.setFontSize(8)
            doc.setFont('helvetica', 'bold')
            doc.text('EMPLOYEE INFORMATION', 14, y)

            doc.setDrawColor(...indigo)
            doc.setLineWidth(0.3)
            doc.line(14, y + 1.5, 95, y + 1.5)
            y += 7

            const infoRows = [
                ['Name', staffName],
                ['Employee ID', payroll.staff?.employeeId || 'N/A'],
                ['Designation', payroll.staff?.designation || 'N/A'],
                ['Department', payroll.staff?.department || 'N/A'],
            ]

            infoRows.forEach(([label, value]) => {
                doc.setTextColor(...slate400)
                doc.setFontSize(8)
                doc.setFont('helvetica', 'normal')
                doc.text(label, 14, y)
                doc.setTextColor(...slate900)
                doc.setFont('helvetica', 'bold')
                doc.text(value, 55, y)
                y += 6
            })

            // Right: Payment Summary
            let y2 = 48
            doc.setTextColor(...indigo)
            doc.setFontSize(8)
            doc.setFont('helvetica', 'bold')
            doc.text('PAYMENT SUMMARY', 110, y2)
            doc.line(110, y2 + 1.5, 196, y2 + 1.5)
            y2 += 7

            const summaryRows = [
                ['Pay Period', `${payroll.month} ${payroll.year}`],
                ['Payment Status', payroll.status],
                ['Issue Date', format(new Date(payroll.updatedAt), 'dd MMM yyyy')],
            ]

            summaryRows.forEach(([label, value]) => {
                doc.setTextColor(...slate400)
                doc.setFont('helvetica', 'normal')
                doc.text(label, 110, y2)
                doc.setTextColor(payroll.status === 'PAID' && label === 'Payment Status' ? emerald[0] : slate900[0],
                    payroll.status === 'PAID' && label === 'Payment Status' ? emerald[1] : slate900[1],
                    payroll.status === 'PAID' && label === 'Payment Status' ? emerald[2] : slate900[2])
                doc.setFont('helvetica', 'bold')
                doc.text(value, 160, y2)
                y2 += 6
            })

            // ── Earnings Table ──
            y = Math.max(y, y2) + 10

            // Table header
            doc.setFillColor(...indigo)
            doc.rect(14, y, 182, 9, 'F')
            doc.setTextColor(...white)
            doc.setFontSize(8)
            doc.setFont('helvetica', 'bold')
            doc.text('EARNINGS DESCRIPTION', 18, y + 6)
            doc.text('AMOUNT (INR)', 192, y + 6, { align: 'right' })
            y += 9

            const tableRows = [
                ['Basic Salary', payroll.baseSalary, false],
                ['Overtime Pay (1.5x Hourly)', payroll.overtimePay || 0, true],
                ['Performance Incentive', payroll.incentives || 0, true],
                ['Bonus', payroll.bonuses || 0, true],
            ]

            tableRows.forEach(([label, amount, isBonus], idx) => {
                // Alternate row background
                if (idx % 2 === 0) {
                    doc.setFillColor(white[0], white[1], white[2])
                } else {
                    doc.setFillColor(lightGray[0], lightGray[1], lightGray[2])
                }
                doc.rect(14, y, 182, 9, 'F')
                doc.setDrawColor(226, 232, 240)
                doc.setLineWidth(0.2)
                doc.line(14, y + 9, 196, y + 9)

                doc.setTextColor(slate600[0], slate600[1], slate600[2])
                doc.setFont('helvetica', 'normal')
                doc.text(String(label), 18, y + 6)

                // Green for positive bonus values, dark for base
                if (isBonus && Number(amount) > 0) {
                    doc.setTextColor(emerald[0], emerald[1], emerald[2])
                } else {
                    doc.setTextColor(slate900[0], slate900[1], slate900[2])
                }
                doc.setFont('helvetica', 'bold')
                doc.text(
                    `${isBonus && Number(amount) > 0 ? '+' : ''}${formatCurrency(Number(amount))}`,
                    192, y + 6, { align: 'right' }
                )
                y += 9
            })

            // Deductions row
            doc.setFillColor(255, 245, 245)
            doc.rect(14, y, 182, 9, 'F')
            doc.line(14, y + 9, 196, y + 9)
            doc.setTextColor(...slate600)
            doc.setFont('helvetica', 'normal')
            doc.text('Deductions (Taxes / Leaves)', 18, y + 6)
            doc.setTextColor(239, 68, 68)
            doc.setFont('helvetica', 'bold')
            doc.text(`-${formatCurrency(payroll.deductions || 0)}`, 192, y + 6, { align: 'right' })
            y += 9

            // Net Payable
            doc.setFillColor(...indigo)
            doc.rect(14, y, 182, 13, 'F')
            doc.setTextColor(...white)
            doc.setFontSize(10)
            doc.setFont('helvetica', 'bold')
            doc.text('NET PAYABLE AMOUNT', 18, y + 9)
            doc.setFontSize(13)
            doc.text(formatCurrency(payroll.netSalary), 192, y + 9, { align: 'right' })
            y += 13

            // ── Footer ──
            y += 20
            doc.setDrawColor(226, 232, 240)
            doc.setLineWidth(0.5)
            doc.line(14, y, 196, y)
            y += 12

            // Signature area
            doc.setFillColor(...lightGray)
            doc.rect(14, y, 70, 20, 'F')
            doc.setTextColor(...slate400)
            doc.setFontSize(7)
            doc.setFont('helvetica', 'normal')
            doc.text('AUTHORIZED SIGNATURE', 14, y - 2)
            doc.text('Zenbourg Grand HR Dept.', 18, y + 16)

            // System note
            doc.setTextColor(...slate400)
            doc.setFontSize(7)
            doc.text('This is a system-generated document. No physical signature required.', 196, y + 8, { align: 'right' })
            doc.text(`Generated on ${format(new Date(), 'dd MMM yyyy, hh:mm a')}`, 196, y + 14, { align: 'right' })

            // Save PDF
            const filename = `SalarySlip_${staffName.replace(/\s+/g, '_')}_${payroll.month}_${payroll.year}.pdf`
            doc.save(filename)
        } catch (err) {
            console.error('PDF generation failed:', err)
            // Fallback to print
            window.print()
        } finally {
            setDownloading(false)
        }
    }

    if (loading) return <div className="p-12 text-center text-text-secondary animate-pulse">Generating salary slip...</div>
    if (!payroll) return <div className="p-12 text-center text-danger">Salary slip not found.</div>

    const staffName = payroll.staff?.user?.name || payroll.staff?.name || 'Employee'

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6 animate-fade-in">
            <div className="flex items-center justify-between no-print">
                <Button variant="ghost" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={() => router.back()}>
                    Back to Payroll
                </Button>
                <div className="flex gap-3">
                    <Button variant="secondary" leftIcon={<Printer className="w-4 h-4" />} onClick={handlePrint}>
                        Print Slip
                    </Button>
                    <Button
                        variant="primary"
                        leftIcon={<Download className="w-4 h-4" />}
                        onClick={handleDownloadPDF}
                        loading={downloading}
                    >
                        Download PDF
                    </Button>
                </div>
            </div>

            {/* Salary Slip Content */}
            <div ref={slipRef} className="bg-white text-slate-900 p-12 rounded-2xl shadow-2xl border border-slate-200 slip-printable">
                {/* Header */}
                <div className="flex justify-between items-start mb-12 pb-8" style={{ borderBottom: '3px solid #6366f1' }}>
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white">
                            <Building2 className="w-10 h-10" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">{payroll.staff?.property?.name || 'Zenbourg'}</h1>
                            <p className="text-slate-500 font-medium">{payroll.staff?.property?.address || 'Employee Pay Slip'} • {payroll.month} {payroll.year}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Receipt No.</p>
                        <p className="text-xl font-mono font-bold text-slate-700">ZB-PAY-{payroll.id.substring(payroll.id.length - 6).toUpperCase()}</p>
                        {payroll.status === 'PAID' && (
                            <div className="flex items-center justify-end gap-1 mt-2 text-emerald-600">
                                <CheckCircle className="w-4 h-4" />
                                <span className="text-xs font-bold">PAID</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-12 mb-12">
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 border-b border-indigo-100 pb-1">Employee Information</h3>
                        <div className="grid grid-cols-2 gap-y-3">
                            <span className="text-sm font-bold text-slate-400">Name</span>
                            <span className="text-sm font-bold text-slate-800">{staffName}</span>
                            <span className="text-sm font-bold text-slate-400">Employee ID</span>
                            <span className="text-sm font-bold text-slate-800">{payroll.staff?.employeeId || 'N/A'}</span>
                            <span className="text-sm font-bold text-slate-400">Designation</span>
                            <span className="text-sm font-bold text-slate-800">{payroll.staff?.designation || 'N/A'}</span>
                            <span className="text-sm font-bold text-slate-400">Department</span>
                            <span className="text-sm font-bold text-slate-800">{payroll.staff?.department || 'N/A'}</span>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 border-b border-indigo-100 pb-1">Payment Summary</h3>
                        <div className="grid grid-cols-2 gap-y-3">
                            <span className="text-sm font-bold text-slate-400">Pay Period</span>
                            <span className="text-sm font-bold text-slate-800">{payroll.month} {payroll.year}</span>
                            <span className="text-sm font-bold text-slate-400">Payment Status</span>
                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded w-fit ${payroll.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                {payroll.status}
                            </span>
                            <span className="text-sm font-bold text-slate-400">Issue Date</span>
                            <span className="text-sm font-bold text-slate-800">{format(new Date(payroll.updatedAt), 'dd MMM yyyy')}</span>
                            {payroll.paidAt && (
                                <>
                                    <span className="text-sm font-bold text-slate-400">Paid On</span>
                                    <span className="text-sm font-bold text-emerald-600">{format(new Date(payroll.paidAt), 'dd MMM yyyy')}</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Earnings Table */}
                <div className="border border-slate-100 rounded-xl overflow-hidden mb-12">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-indigo-600 text-white">
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Earnings Description</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            <tr className="bg-white">
                                <td className="px-6 py-4 text-sm font-bold text-slate-700">Basic Salary</td>
                                <td className="px-6 py-4 text-sm font-mono font-bold text-slate-800 text-right">{formatCurrency(payroll.baseSalary)}</td>
                            </tr>
                            <tr className="bg-slate-50/50">
                                <td className="px-6 py-4 text-sm font-bold text-slate-700">Overtime Pay (1.5x Hourly)</td>
                                <td className="px-6 py-4 text-sm font-mono font-bold text-emerald-600 text-right">+{formatCurrency(payroll.overtimePay || 0)}</td>
                            </tr>
                            <tr className="bg-white">
                                <td className="px-6 py-4 text-sm font-bold text-slate-700">Performance Incentive</td>
                                <td className="px-6 py-4 text-sm font-mono font-bold text-emerald-600 text-right">+{formatCurrency(payroll.incentives || 0)}</td>
                            </tr>
                            <tr className="bg-slate-50/50">
                                <td className="px-6 py-4 text-sm font-bold text-slate-700">Bonus</td>
                                <td className="px-6 py-4 text-sm font-mono font-bold text-emerald-600 text-right">+{formatCurrency(payroll.bonuses || 0)}</td>
                            </tr>
                            <tr className="bg-red-50/60">
                                <td className="px-6 py-4 text-sm font-bold text-slate-700">Deductions (Taxes / Leaves)</td>
                                <td className="px-6 py-4 text-sm font-mono font-bold text-red-500 text-right">-{formatCurrency(payroll.deductions || 0)}</td>
                            </tr>
                            <tr className="bg-indigo-600">
                                <td className="px-6 py-5 text-base font-black text-white uppercase tracking-tight">Net Payable Amount</td>
                                <td className="px-6 py-5 text-2xl font-mono font-black text-white text-right">{formatCurrency(payroll.netSalary)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="flex justify-between items-end border-t border-slate-100 pt-10">
                    <div className="space-y-1">
                        <p className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400">Employer Signature</p>
                        <div className="w-48 h-12 border-b-2 border-slate-200 bg-slate-50/50 rounded-t-lg" />
                        <p className="text-xs font-bold text-slate-600">Zenbourg Grand HR Dept.</p>
                    </div>
                    <div className="text-right text-slate-400 space-y-1">
                        <p className="text-[10px] font-bold">This is a system-generated document.</p>
                        <p className="text-[10px] font-bold">No physical signature required.</p>
                        <p className="text-[10px] font-bold">Generated: {format(new Date(), 'dd MMM yyyy')}</p>
                    </div>
                </div>
            </div>

            <style>{`
                @media print {
                    body { background: white !important; padding: 0 !important; margin: 0 !important; }
                    .slip-printable { 
                        box-shadow: none !important; 
                        border: none !important; 
                        width: 100% !important; 
                        margin: 0 !important; 
                        border-radius: 0 !important; 
                        padding: 0 !important;
                    }
                    /* Ensure no background clipping on print */
                    .bg-indigo-600 { background-color: #4f46e5 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .text-white { color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
            `}</style>
        </div>
    )
}
