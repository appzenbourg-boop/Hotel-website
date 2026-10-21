'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { Printer, ArrowLeft, Download, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { buildContextUrl } from '@/lib/admin-context'
import { printBanquetQuotation, downloadBanquetQuotationPDF } from '@/lib/banquet-quotation-printer'

function BanquetBillingInner() {
  const searchParams = useSearchParams()
  const bookingId = searchParams.get('id')
  const [booking, setBooking] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [payAmount, setPayAmount] = useState('')
  const [payMode, setPayMode] = useState('Cash')
  const [paying, setPaying] = useState(false)

  useEffect(() => {
    if (!bookingId) { setLoading(false); return }
    fetch(buildContextUrl('/api/admin/banquet/bookings', { id: bookingId }))
      .then(r => r.json()).then(d => { setBooking(d); setLoading(false) })
  }, [bookingId])

  const handlePayment = async () => {
    if (!payAmount) return toast.error('Enter amount')
    setPaying(true)
    try {
      const newPaid = (booking.paidAmount || 0) + parseFloat(payAmount)
      const res = await fetch('/api/admin/banquet/bookings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: bookingId,
          ...booking,
          paidAmount: newPaid,
          balanceDue: (booking.totalAmount || 0) - newPaid,
          status: newPaid >= (booking.totalAmount || 0) ? 'CONFIRMED' : booking.status
        })
      })
      const j = await res.json()
      if (j.success) {
        setBooking(j.data)
        toast.success('Payment recorded!')
        setPayAmount('')
      }
    } catch { toast.error('Failed') }
    finally { setPaying(false) }
  }

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-[#4A9EFF]" /></div>

  if (!booking) return (
    <div className="text-center py-20 text-text-tertiary">
      <p>No booking found.</p>
      <Link href="/admin/banquet" className="text-[#4A9EFF] mt-2 inline-block hover:underline">← Back to Banquet</Link>
    </div>
  )

  const balance = (booking.totalAmount || 0) - (booking.paidAmount || 0)
  const isPaid = balance <= 0

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/banquet" className="p-2 hover:bg-white/10 rounded-xl text-text-secondary">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-black text-text-primary">Banquet Billing</h1>
            <p className="text-xs text-text-secondary">{booking.bookingNumber} · {booking.firstName} {booking.lastName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => downloadBanquetQuotationPDF(booking, booking?.property)} className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white text-sm font-bold rounded-xl border border-white/10 transition-all">
            <Download className="w-4 h-4 text-emerald-400" /> Download PDF
          </button>
          <button onClick={() => printBanquetQuotation(booking, booking?.property)} className="flex items-center gap-2 px-4 py-2.5 bg-[#4A9EFF] hover:bg-[#4A9EFF]/80 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-[#4A9EFF]/20">
            <Printer className="w-4 h-4" /> Print Quotation / Bill
          </button>
        </div>
      </div>

      {/* Bill Card */}
      <div id="banquet-bill" className="bg-surface border border-border/50 rounded-2xl overflow-hidden print:shadow-none">
        {/* Bill Header */}
        <div className="bg-[#4A9EFF] px-6 py-5">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-black text-white">BANQUET INVOICE</h2>
              <p className="text-blue-100 text-sm mt-0.5">Booking #{booking.bookingNumber}</p>
            </div>
            <div className="text-right text-blue-100 text-xs">
              <p>Date: {format(new Date(booking.createdAt), 'dd MMM yyyy')}</p>
              <p className="mt-0.5">Status: <span className="font-black text-white">{booking.status}</span></p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Guest & Payment Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-100/70 dark:bg-black/20 border border-border rounded-xl p-4 text-xs space-y-2">
              <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">Guest Details</p>
              <p className="font-bold text-text-primary text-sm">{booking.salutation} {booking.firstName} {booking.lastName}</p>
              <p className="text-text-secondary">{booking.mobile}</p>
              {booking.email && <p className="text-text-secondary">{booking.email}</p>}
              {booking.address && <p className="text-text-secondary">{booking.address}, {booking.city}</p>}
              {booking.guestGstin && <p className="text-text-tertiary">GSTIN: {booking.guestGstin}</p>}
            </div>
            <div className="bg-slate-100/70 dark:bg-black/20 border border-border rounded-xl p-4 text-xs space-y-2">
              <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">Billing Details</p>
              <div className="grid grid-cols-2 gap-1">
                <span className="text-text-tertiary">Payment Mode:</span><span className="text-text-primary font-semibold">{booking.payMode}</span>
                <span className="text-text-tertiary">Billing To:</span><span className="text-text-primary font-semibold">{booking.billingInstruction}</span>
                <span className="text-text-tertiary">Market Segment:</span><span className="text-text-primary font-semibold">{booking.marketSegment}</span>
                <span className="text-text-tertiary">Business Source:</span><span className="text-text-primary font-semibold">{booking.businessSource}</span>
                {booking.corporate && <><span className="text-text-tertiary">Corporate:</span><span className="text-text-primary font-semibold">{booking.corporate}</span></>}
                {booking.gstin && <><span className="text-text-tertiary">GSTIN:</span><span className="text-text-primary font-semibold">{booking.gstin}</span></>}
              </div>
            </div>
          </div>

          {/* Events Table */}
          <div>
            <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mb-3">Event Details</p>
            <div className="border border-border/50 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-[#4A9EFF] text-white">
                  <tr>
                    {['Hall', 'Event', 'Date', 'Time', 'Menu', 'Adult Pax', 'Child Pax', 'Per Plate', 'Hall Rent', 'Amount'].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-[10px] font-black">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {booking.events?.map((ev: any, i: number) => (
                    <tr key={i} className="hover:bg-white/[0.02]">
                      <td className="px-3 py-2.5 font-semibold text-text-primary">{ev.hallName}</td>
                      <td className="px-3 py-2.5 text-text-secondary">{ev.eventType}</td>
                      <td className="px-3 py-2.5 text-text-secondary">{format(parseISO(ev.eventDate), 'dd-MMM-yyyy')}</td>
                      <td className="px-3 py-2.5 text-text-secondary">{ev.startTime} - {ev.endTime}</td>
                      <td className="px-3 py-2.5 text-text-secondary">{ev.menuCard || '—'}</td>
                      <td className="px-3 py-2.5 text-text-secondary">{ev.guaranteedPax}</td>
                      <td className="px-3 py-2.5 text-text-secondary">{ev.childPax || 0}</td>
                      <td className="px-3 py-2.5 font-mono text-text-primary">₹{(ev.perPlateRate || 0).toLocaleString()}</td>
                      <td className="px-3 py-2.5 font-mono text-text-secondary">₹{(ev.hallRent || 0).toLocaleString()}</td>
                      <td className="px-3 py-2.5 font-mono font-black text-[#4A9EFF]">₹{(ev.amount || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-100/70 dark:bg-black/20 border border-border border-t border-border/50">
                  <tr>
                    <td colSpan={9} className="px-3 py-2.5 text-right font-black text-text-primary text-xs">Total Amount</td>
                    <td className="px-3 py-2.5 font-black text-[#4A9EFF] font-mono text-sm">₹{(booking.totalAmount || 0).toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td colSpan={9} className="px-3 py-2 text-right font-bold text-emerald-400 text-xs">Amount Paid</td>
                    <td className="px-3 py-2 font-bold text-emerald-400 font-mono">₹{(booking.paidAmount || 0).toLocaleString()}</td>
                  </tr>
                  <tr className="bg-[#4A9EFF]/10">
                    <td colSpan={9} className="px-3 py-2.5 text-right font-black text-text-primary text-sm">Balance Due</td>
                    <td className={`px-3 py-2.5 font-black font-mono text-base ${isPaid ? 'text-emerald-400' : 'text-red-400'}`}>
                      {isPaid ? '₹0 (PAID)' : `₹${balance.toLocaleString()}`}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Payment Collection */}
          {!isPaid && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5">
              <p className="text-sm font-black text-amber-400 mb-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> Record Payment
              </p>
              <div className="flex gap-3">
                <select value={payMode} onChange={e => setPayMode(e.target.value)}
                  className="bg-slate-50 dark:bg-black/30 border border-border/50 rounded-xl px-3 py-2.5 text-sm text-text-primary outline-none focus:border-[#4A9EFF]">
                  {['Cash', 'Card', 'UPI', 'Bank Transfer', 'Cheque'].map(m => <option key={m}>{m}</option>)}
                </select>
                <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)}
                  placeholder={`Amount (Balance: ₹${balance.toLocaleString()})`}
                  className="flex-1 bg-slate-50 dark:bg-black/30 border border-border/50 rounded-xl px-4 py-2.5 text-sm text-text-primary outline-none focus:border-[#4A9EFF]" />
                <button onClick={handlePayment} disabled={paying}
                  className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-sm transition-all flex items-center gap-2 disabled:opacity-50">
                  {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Record
                </button>
              </div>
            </div>
          )}

          {isPaid && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <p className="text-sm font-bold text-emerald-400">Fully Paid — No balance due</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function BanquetBillingPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-[#4A9EFF]" /></div>}>
      <BanquetBillingInner />
    </Suspense>
  )
}
