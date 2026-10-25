'use client'

import { useState, useEffect } from 'react'
import { format, differenceInDays } from 'date-fns'
import { Download, Printer } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { generateTaxInvoicePDF, TaxInvoiceItem } from '@/lib/invoice-pdf-generator'

const numberToWords = (num: number): string => {
  if (num === 0) return 'Zero';
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return '';
  let str = '';
  str += (n[1] != '00') ? (a[Number(n[1])] || b[n[1][0] as any] + ' ' + a[n[1][1] as any]) + 'Crore ' : '';
  str += (n[2] != '00') ? (a[Number(n[2])] || b[n[2][0] as any] + ' ' + a[n[2][1] as any]) + 'Lakh ' : '';
  str += (n[3] != '00') ? (a[Number(n[3])] || b[n[3][0] as any] + ' ' + a[n[3][1] as any]) + 'Thousand ' : '';
  str += (n[4] != '0') ? (a[Number(n[4])] || b[n[4][0] as any] + ' ' + a[n[4][1] as any]) + 'Hundred ' : '';
  str += (n[5] != '00') ? ((str != '') ? 'And ' : '') + (a[Number(n[5])] || b[n[5][0] as any] + ' ' + a[n[5][1] as any]) : '';
  return str.trim() + ' Only';
}

export interface InvoiceModalProps {
  booking: any
  guest?: any
  onClose: () => void
}

export function InvoiceModal({ booking, guest, onClose }: InvoiceModalProps) {
  const [hotelGstNumber, setHotelGstNumber] = useState<string>('')

  useEffect(() => {
    fetch('/api/admin/settings/financial')
      .then(res => res.json())
      .then(j => {
        if (j.data?.gstNumber) setHotelGstNumber(j.data.gstNumber)
      })
      .catch(() => {})
  }, [])

  const nights = differenceInDays(
    new Date(booking.checkOut),
    new Date(booking.checkIn)
  ) || 1

  const isComp     = Boolean(booking.isComplimentary || booking.raw?.isComplimentary)
  const base       = isComp ? 0 : (booking.baseAmount ?? booking.totalAmount ?? 0)
  const gstAmt     = isComp ? 0 : (booking.gstAmount ?? 0)
  const scAmt      = isComp ? 0 : (booking.serviceChargeAmount ?? 0)
  const ltAmt      = isComp ? 0 : (booking.luxuryTaxAmount ?? 0)
  const discAmt    = booking.discountAmount   ?? 0
  const mealAmt    = booking.mealPlanAmount   ?? 0
  const finalAmt   = isComp ? (mealAmt + (booking.extraAddonsAmount ?? 0)) : (booking.finalAmount ?? booking.totalAmount ?? 0)
  const gstPct     = booking.gstPercent       ?? 0
  const scPct      = booking.serviceChargePercent ?? 0
  const ltPct      = booking.luxuryTaxPercent ?? 0
  const discPct    = booking.discountPercent  ?? 0
  const invoiceNo  = `INV-${booking.id?.slice(-6).toUpperCase() ?? '000000'}`
  const hotelName  = booking.property?.name ?? 'Hotel'

  const guestName  = booking.guest?.name || guest?.name || 'Guest'
  const guestPhone = booking.guest?.phone || guest?.phone || '—'
  const guestEmail = booking.guest?.email || guest?.email || '—'
  const guestGst   = booking.guestGstNumber || booking.guest?.gstNumber || guest?.gstNumber || ''
  const guestAddress = booking.guest?.address || guest?.address || '—'

  const roomNo     = booking.room?.roomNumber ?? booking.roomNumber ?? '—'
  const roomType   = booking.room?.type ?? booking.roomType ?? ''
  
  const cgstAmt = gstAmt / 2;
  const sgstAmt = gstAmt / 2;
  const cgstPct = gstPct / 2;
  const sgstPct = gstPct / 2;

  // Additional charges (extra services, POS dining, or checkout additions)
  const knownSubtotal = base + gstAmt + scAmt + ltAmt + mealAmt - discAmt;
  const extraCharges = (booking.extraAddonsAmount && booking.extraAddonsAmount > 0)
    ? booking.extraAddonsAmount
    : Math.max(0, Math.round((finalAmt - knownSubtotal) * 100) / 100);

  const handleDownloadPDF = async () => {
    const toastId = toast.loading('Generating Tax Invoice PDF...')
    try {
      const items: TaxInvoiceItem[] = [
        {
          date: format(new Date(booking.checkIn), 'dd-MMM-yyyy'),
          roomNo: String(roomNo),
          description: isComp ? `Tariff (${nights} night${nights > 1 ? 's' : ''}) - Complimentary Stay` : `Tariff (${nights} night${nights > 1 ? 's' : ''})`,
          hsnCode: '996311',
          rackRate: isComp ? 'Complimentary' : (booking.room?.basePrice || booking.room?.pricePerNight ? (booking.room.basePrice || booking.room.pricePerNight).toLocaleString() : (base/nights).toFixed(2)),
          amount: base,
        }
      ]

      if (mealAmt > 0) {
        items.push({
          date: format(new Date(booking.checkIn), 'dd-MMM-yyyy'),
          roomNo: String(roomNo),
          description: `Meal Plan (${booking.mealPlan || 'EP'})`,
          hsnCode: '996311',
          amount: mealAmt,
        })
      }

      if (extraCharges > 0) {
        items.push({
          date: format(new Date(booking.checkIn), 'dd-MMM-yyyy'),
          roomNo: String(roomNo),
          description: 'Extra Services / POS Add-ons',
          hsnCode: '996331',
          amount: extraCharges,
        })
      }

      if (cgstAmt > 0) {
        items.push({
          date: '',
          roomNo: '',
          description: `CGST ${cgstPct}%`,
          hsnCode: '996311',
          amount: cgstAmt,
        })
      }

      if (sgstAmt > 0) {
        items.push({
          date: '',
          roomNo: '',
          description: `SGST ${sgstPct}%`,
          hsnCode: '996311',
          amount: sgstAmt,
        })
      }

      if (scAmt > 0) {
        items.push({
          date: '',
          roomNo: '',
          description: `Service Charge ${scPct}%`,
          hsnCode: '996311',
          amount: scAmt,
        })
      }

      if (discAmt > 0) {
        items.push({
          date: '',
          roomNo: '',
          description: `Discount (${discPct}%)`,
          hsnCode: '',
          amount: -discAmt,
        })
      }

      generateTaxInvoicePDF({
        invoiceNo,
        billDate: new Date(),
        isB2B: Boolean(guestGst),
        hotelName,
        hotelAddress: booking.property?.address || 'Hotel Address, City, 123456',
        hotelPhone: booking.property?.phone || '9876543210',
        hotelEmail: booking.property?.email || 'hotel@example.com',
        hotelGstNumber: hotelGstNumber || undefined,
        guestName,
        guestPhone: guestPhone !== '—' ? guestPhone : undefined,
        guestEmail: guestEmail !== '—' ? guestEmail : undefined,
        guestGstNumber: guestGst || undefined,
        guestAddress: guestAddress !== '—' ? guestAddress : undefined,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        nights,
        pax: booking.numberOfGuests || 1,
        roomType: roomType || 'Standard King',
        mealPlan: booking.mealPlan || 'EP',
        source: booking.source || 'DIRECT',
        items,
        totalAmount: finalAmt,
        amountInWords: numberToWords(Math.round(finalAmt)),
      })

      toast.success('Tax Invoice PDF downloaded successfully!', { id: toastId })
    } catch (err) {
      console.error('Tax Invoice PDF generation error:', err)
      toast.error('Failed to generate Tax Invoice PDF', { id: toastId })
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="w-full max-w-3xl bg-white text-slate-900 rounded-3xl shadow-2xl pointer-events-auto overflow-hidden max-h-[90vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
          {/* Invoice Header */}
          <div className="bg-[#C26A2C] px-6 py-6 text-white">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight">{hotelName}</h2>
                <p className="text-[#F2C4A7] text-xs mt-0.5">{booking.property?.address || 'Hotel Address, City, 123456'}</p>
                <p className="text-[#F2C4A7] text-xs mt-0.5">Phone: {booking.property?.phone || '9876543210'} | Email: {booking.property?.email || 'hotel@example.com'}</p>
                {hotelGstNumber && (
                  <span className="inline-block mt-2 px-2 py-0.5 bg-white/20 backdrop-blur-md rounded text-[10px] font-mono font-bold tracking-wider text-white">
                    GSTIN: {hotelGstNumber}
                  </span>
                )}
              </div>
              <div className="text-right">
                <p className="text-[#E8A375] text-[10px] uppercase tracking-wider">{guestGst ? 'B2B TAX INVOICE' : 'TAX INVOICE'}</p>
                <p className="text-base font-mono font-bold">{invoiceNo}</p>
                <p className="text-[#F2C4A7] text-[10px] mt-1">Bill Date: {format(new Date(), 'dd MMM yyyy')}</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Guest + Stay Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-bold text-[#C26A2C] uppercase tracking-widest border-b border-[#C26A2C]/20 pb-1 mb-2">Guest Info</p>
                {[
                  ['Name',          guestName],
                  ['Mobile',        guestPhone],
                  ['Email',         guestEmail],
                  ['Guest GSTIN',   guestGst || 'B2C / Retail'],
                  ['Address',       guestAddress],
                ].map(([l, v]) => (
                  <div key={l} className="flex justify-between text-xs mb-1.5 gap-2">
                    <span className="text-slate-500 shrink-0">{l}</span>
                    <span className={cn("font-semibold text-right truncate", l === 'Guest GSTIN' && guestGst ? 'text-blue-600 font-mono font-bold' : 'text-slate-800')}>{v}</span>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-[10px] font-bold text-[#C26A2C] uppercase tracking-widest border-b border-[#C26A2C]/20 pb-1 mb-2">Stay Details</p>
                {[
                  ['Check-in',  format(new Date(booking.checkIn),  'dd MMM yyyy HH:mm')],
                  ['Check-out', format(new Date(booking.checkOut), 'dd MMM yyyy HH:mm')],
                  ['Nights',    String(nights)],
                  ['Pax',       String(booking.numberOfGuests || 1)],
                  ['Room Type', roomType],
                  ['Meal Plan', booking.mealPlan || 'EP'],
                  ['Source',    booking.source || 'Walk-In'],
                ].map(([l, v]) => (
                  <div key={l} className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-500">{l}</span>
                    <span className="font-semibold text-slate-800 text-right truncate">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Charges Table */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[#C26A2C]/10 text-[#C26A2C]">
                    <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest">Date</th>
                    <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest">RoomNo</th>
                    <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest">Description</th>
                    <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest">HSNCode</th>
                    <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-right">RackRate</th>
                    <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="bg-white">
                    <td className="px-3 py-2 text-xs text-slate-700">{format(new Date(booking.checkIn), 'dd-MMM-yyyy')}</td>
                    <td className="px-3 py-2 text-xs text-slate-700">{roomNo}</td>
                    <td className="px-3 py-2 text-xs text-slate-700">
                      Tariff ({nights} night{nights > 1 ? 's' : ''})
                      {isComp && (
                        <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-100 text-emerald-800">
                          Complimentary
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-700">996311</td>
                    <td className="px-3 py-2 text-xs font-mono text-slate-800 text-right">
                      {isComp ? 'Complimentary' : (booking.room?.basePrice || booking.room?.pricePerNight ? (booking.room.basePrice || booking.room.pricePerNight).toLocaleString() : (base/nights).toFixed(2))}
                    </td>
                    <td className="px-3 py-2 text-xs font-mono font-bold text-slate-800 text-right">{base.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  
                  {mealAmt > 0 && (
                    <tr className="bg-white">
                      <td className="px-3 py-2 text-xs text-slate-700">{format(new Date(booking.checkIn), 'dd-MMM-yyyy')}</td>
                      <td className="px-3 py-2 text-xs text-slate-700">{roomNo}</td>
                      <td className="px-3 py-2 text-xs text-slate-700">Meal Plan ({booking.mealPlan || 'EP'})</td>
                      <td className="px-3 py-2 text-xs text-slate-700">996311</td>
                      <td className="px-3 py-2 text-xs font-mono text-slate-800 text-right">—</td>
                      <td className="px-3 py-2 text-xs font-mono font-bold text-slate-800 text-right">{mealAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  )}

                  {extraCharges > 0 && (
                    <tr className="bg-white">
                      <td className="px-3 py-2 text-xs text-slate-700">{format(new Date(booking.checkIn), 'dd-MMM-yyyy')}</td>
                      <td className="px-3 py-2 text-xs text-slate-700">{roomNo}</td>
                      <td className="px-3 py-2 text-xs text-slate-700">Extra Services / POS Add-ons</td>
                      <td className="px-3 py-2 text-xs text-slate-700">996331</td>
                      <td className="px-3 py-2 text-xs font-mono text-slate-800 text-right">—</td>
                      <td className="px-3 py-2 text-xs font-mono font-bold text-slate-800 text-right">{extraCharges.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  )}
                  
                  {cgstAmt > 0 && (
                    <tr className="bg-slate-50">
                      <td colSpan={2}></td>
                      <td className="px-3 py-2 text-xs text-slate-700">CGST {cgstPct}%</td>
                      <td className="px-3 py-2 text-xs text-slate-700">996311</td>
                      <td colSpan={1}></td>
                      <td className="px-3 py-2 text-xs font-mono text-slate-800 text-right">{cgstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  )}
                  {sgstAmt > 0 && (
                    <tr className="bg-slate-50">
                      <td colSpan={2}></td>
                      <td className="px-3 py-2 text-xs text-slate-700">SGST {sgstPct}%</td>
                      <td className="px-3 py-2 text-xs text-slate-700">996311</td>
                      <td colSpan={1}></td>
                      <td className="px-3 py-2 text-xs font-mono text-slate-800 text-right">{sgstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  )}
                  {scAmt > 0 && (
                    <tr className="bg-slate-50">
                      <td colSpan={2}></td>
                      <td className="px-3 py-2 text-xs text-slate-700">Service Charge {scPct}%</td>
                      <td className="px-3 py-2 text-xs text-slate-700">996311</td>
                      <td colSpan={1}></td>
                      <td className="px-3 py-2 text-xs font-mono text-slate-800 text-right">{scAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  )}
                  
                  {discAmt > 0 && (
                    <tr className="bg-red-50/40">
                      <td colSpan={2}></td>
                      <td className="px-3 py-2 text-xs text-slate-700">Discount ({discPct}%)</td>
                      <td colSpan={2}></td>
                      <td className="px-3 py-2 text-xs font-mono font-bold text-red-500 text-right">-{discAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  )}
                  <tr className="bg-[#C26A2C]/10 border-t-2 border-[#C26A2C]/30">
                    <td colSpan={4} className="px-3 py-3 text-sm font-black text-slate-800 uppercase tracking-wide">Total Bill Amount</td>
                    <td colSpan={2} className="px-3 py-3 text-lg font-mono font-black text-[#C26A2C] text-right">₹{finalAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            {/* Words and instructions */}
            <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 flex flex-col gap-1">
                <p className="text-xs font-semibold text-slate-700">Amount in Words: <span className="text-[#C26A2C]">{numberToWords(Math.round(finalAmt))}</span></p>
                <div className="mt-2 text-[10px] text-slate-500 space-y-1">
                    <p>* Payment to be made in favour of {hotelName}.</p>
                    <p>* We are committed to look after your needs.</p>
                    <p>* The hotel is not responsible for loss or damage to personal belongings.</p>
                    <p>* Any disputes arising from this agreement shall be governed by the laws of the jurisdiction where the hotel is located.</p>
                    <p className="font-bold text-[#C26A2C] mt-2 uppercase">* WE HOPE YOU ENJOYED YOUR STAY AND WOULD LIKE TO WELCOME YOU BACK</p>
                </div>
            </div>

            {/* Signatures */}
            <div className="flex justify-between items-end mt-12 mb-4 px-8">
                <div className="text-center">
                    <div className="w-32 border-b border-slate-400 mb-2"></div>
                    <p className="text-[10px] font-bold text-slate-600 uppercase">F.O.A. Signature</p>
                </div>
                <div className="text-center">
                    <div className="w-32 border-b border-slate-400 mb-2"></div>
                    <p className="text-[10px] font-bold text-slate-600 uppercase">Guest Signature</p>
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleDownloadPDF}
                className="flex-1 flex items-center justify-center gap-2 h-11 bg-[#C26A2C] hover:bg-[#A85822] text-white text-sm font-bold rounded-2xl transition-all active:scale-95"
              >
                <Download className="w-4 h-4" /> Download PDF
              </button>
              <button
                onClick={() => window.print()}
                className="h-11 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-2xl transition-all active:scale-95 flex items-center gap-2"
              >
                <Printer className="w-4 h-4" /> Print
              </button>
              <button
                onClick={onClose}
                className="h-11 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-2xl transition-all active:scale-95"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
