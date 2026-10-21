import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format, parseISO } from 'date-fns'

export interface HotelInfo {
  name?: string
  address?: string
  phone?: string
  email?: string
  gstNumber?: string
  city?: string
}

export const numberToWords = (num: number): string => {
  if (num === 0) return 'Zero'
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen ']
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  const n = ('000000000' + Math.round(num)).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/)
  if (!n) return ''
  let str = ''
  str += (n[1] !== '00') ? (a[Number(n[1])] || b[n[1][0] as any] + ' ' + a[n[1][1] as any]) + 'Crore ' : ''
  str += (n[2] !== '00') ? (a[Number(n[2])] || b[n[2][0] as any] + ' ' + a[n[2][1] as any]) + 'Lakh ' : ''
  str += (n[3] !== '00') ? (a[Number(n[3])] || b[n[3][0] as any] + ' ' + a[n[3][1] as any]) + 'Thousand ' : ''
  str += (n[4] !== '0') ? (a[Number(n[4])] || b[n[4][0] as any] + ' ' + a[n[4][1] as any]) + 'Hundred ' : ''
  str += (n[5] !== '00') ? ((str !== '') ? 'And ' : '') + (a[Number(n[5])] || b[n[5][0] as any] + ' ' + a[n[5][1] as any]) : ''
  return str.trim() + ' Only'
}

/**
 * Generates an official, print-ready HTML document and sends it to the browser's
 * print engine via an isolated iframe. This prevents taking a screen capture of the UI modal.
 */
export function printBanquetQuotation(booking: any, hotel?: HotelInfo) {
  const resolvedHotel = (hotel?.name ? hotel : booking?.property) || hotel
  const hotelName = (resolvedHotel?.name || 'HOTEL & BANQUET').toUpperCase()
  const hotelAddress = resolvedHotel?.address && resolvedHotel.address !== 'Pending Setup' ? resolvedHotel.address : ''
  const hotelPhone = resolvedHotel?.phone || ''
  const hotelEmail = resolvedHotel?.email || ''
  const hotelGst = resolvedHotel?.gstNumber || ''

  const bookingNo = booking.bookingNumber || `BQ-${String(booking.id || '').slice(-4).toUpperCase() || '0001'}`
  const createdDate = booking.createdAt ? format(new Date(booking.createdAt), 'dd MMMM yyyy') : format(new Date(), 'dd MMMM yyyy')
  const clientName = `${booking.salutation || ''} ${booking.firstName || ''} ${booking.lastName || ''}`.trim() || 'Valued Guest'
  const totalAmount = Number(booking.totalAmount || 0)
  const amountWords = numberToWords(totalAmount)

  const events = booking.events || []
  let totalPax = 0
  let totalHallRent = 0

  const eventRowsHtml = events.map((ev: any, index: number) => {
    const pax = Number(ev.guaranteedPax || 0)
    const childPax = Number(ev.childPax || 0)
    const hallRent = Number(ev.hallRent || 0)
    const plateRate = Number(ev.perPlateRate || 0)
    const lineAmount = Number(ev.amount || 0)
    totalPax += pax
    totalHallRent += (ev.hallOnRent !== false ? hallRent : 0)

    let formattedDate = '—'
    try {
      if (ev.eventDate) formattedDate = format(parseISO(ev.eventDate), 'dd-MMM-yyyy')
    } catch {
      formattedDate = ev.eventDate || '—'
    }

    return `
      <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
        <td style="padding: 10px 8px; font-weight: 600; color: #0f172a;">${index + 1}. ${ev.hallName || 'Hall'}</td>
        <td style="padding: 10px 8px; color: #334155;">${ev.eventType || 'Event'}</td>
        <td style="padding: 10px 8px; color: #334155; white-space: nowrap;">${formattedDate}</td>
        <td style="padding: 10px 8px; color: #475569; font-size: 10px; white-space: nowrap;">${ev.startTime || '09:00'} - ${ev.endTime || '17:00'}</td>
        <td style="padding: 10px 8px; color: #334155;">${ev.menuCard || 'Standard'}</td>
        <td style="padding: 10px 8px; text-align: center; color: #0f172a; font-weight: 600;">${pax}${childPax > 0 ? ` (+${childPax})` : ''}</td>
        <td style="padding: 10px 8px; text-align: right; font-family: 'Segoe UI', Arial, sans-serif; white-space: nowrap;">Rs. ${plateRate.toLocaleString('en-IN')}</td>
        <td style="padding: 10px 8px; text-align: right; font-family: 'Segoe UI', Arial, sans-serif; white-space: nowrap;">Rs. ${hallRent.toLocaleString('en-IN')}</td>
        <td style="padding: 10px 8px; text-align: right; font-weight: 700; color: #0369a1; font-family: 'Segoe UI', Arial, sans-serif; white-space: nowrap;">Rs. ${lineAmount.toLocaleString('en-IN')}</td>
      </tr>
    `
  }).join('')

  const printableHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>Banquet Quotation - ${bookingNo}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 14mm 16mm;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          color: #0f172a;
          background: #ffffff;
          margin: 0;
          padding: 10px;
          font-size: 11px;
          line-height: 1.4;
        }
        .header-box {
          border-bottom: 2px solid #0284c7;
          padding-bottom: 12px;
          margin-bottom: 14px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .hotel-title {
          font-size: 18px;
          font-weight: 800;
          color: #0369a1;
          letter-spacing: 0.5px;
          margin: 0 0 3px 0;
          text-transform: uppercase;
        }
        .hotel-meta {
          font-size: 10px;
          color: #475569;
          margin: 1px 0;
        }
        .badge-box {
          text-align: right;
        }
        .quotation-badge {
          display: inline-block;
          background: #0284c7;
          color: #ffffff;
          padding: 5px 12px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 1px;
          text-transform: uppercase;
          margin-bottom: 4px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 10px 14px;
          margin-bottom: 16px;
        }
        .info-col h4 {
          margin: 0 0 6px 0;
          font-size: 10px;
          font-weight: 800;
          color: #0284c7;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1px dashed #cbd5e1;
          padding-bottom: 3px;
        }
        .info-row {
          display: flex;
          margin-bottom: 3px;
          font-size: 10.5px;
        }
        .info-label {
          width: 110px;
          color: #64748b;
          font-weight: 500;
        }
        .info-value {
          color: #0f172a;
          font-weight: 600;
          flex: 1;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 14px;
        }
        thead th {
          background: #0f172a;
          color: #ffffff;
          font-size: 9.5px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 8px 6px;
          border: none;
        }
        .summary-wrapper {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          margin-top: 10px;
        }
        .words-box {
          flex: 1;
          background: #f1f5f9;
          border-left: 3px solid #0284c7;
          padding: 8px 12px;
          border-radius: 0 4px 4px 0;
        }
        .total-box {
          width: 260px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          overflow: hidden;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          padding: 6px 12px;
          font-size: 11px;
          border-bottom: 1px solid #f1f5f9;
        }
        .grand-total-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 12px;
          background: #0284c7;
          color: #ffffff;
          font-weight: 800;
          font-size: 13px;
        }
        .terms-box {
          margin-top: 18px;
          padding-top: 10px;
          border-top: 1px solid #e2e8f0;
          font-size: 9px;
          color: #64748b;
          line-height: 1.5;
        }
        .terms-box h5 {
          margin: 0 0 4px 0;
          color: #334155;
          font-size: 9.5px;
          font-weight: 700;
          text-transform: uppercase;
        }
        .terms-box ol {
          margin: 0;
          padding-left: 14px;
        }
        .signature-box {
          display: flex;
          justify-content: space-between;
          margin-top: 40px;
          padding: 0 20px;
        }
        .signature-line {
          width: 170px;
          text-align: center;
          border-top: 1px solid #0f172a;
          padding-top: 5px;
          font-size: 10px;
          font-weight: 700;
          color: #334155;
        }
      </style>
    </head>
    <body>
      <div class="header-box">
        <div>
          <h1 class="hotel-title">${hotelName}</h1>
          ${hotelAddress ? `<p class="hotel-meta">${hotelAddress}</p>` : ''}
          ${(hotelPhone || hotelEmail) ? `<p class="hotel-meta">${hotelPhone ? `Phone: ${hotelPhone}` : ''}${(hotelPhone && hotelEmail) ? ' &nbsp;|&nbsp; ' : ''}${hotelEmail ? `Email: ${hotelEmail}` : ''}</p>` : ''}
          ${hotelGst ? `<p class="hotel-meta"><strong>GSTIN:</strong> ${hotelGst}</p>` : ''}
        </div>
        <div class="badge-box">
          <div class="quotation-badge">BANQUET QUOTATION</div>
          <div style="font-size: 11px; font-weight: 700; color: #0f172a;">Ref: ${bookingNo}</div>
          <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Date: ${createdDate}</div>
          <div style="font-size: 10px; color: #0284c7; font-weight: 600; margin-top: 2px;">Status: ${booking.status || 'ENQUIRY'}</div>
        </div>
      </div>

      <div class="info-grid">
        <div class="info-col">
          <h4>Host / Client Information</h4>
          <div class="info-row"><span class="info-label">Client Name:</span><span class="info-value">${clientName}</span></div>
          <div class="info-row"><span class="info-label">Contact No:</span><span class="info-value">${booking.mobile || '—'}</span></div>
          <div class="info-row"><span class="info-label">Email:</span><span class="info-value">${booking.email || '—'}</span></div>
          <div class="info-row"><span class="info-label">Company / Org:</span><span class="info-value">${booking.corporate || 'Individual'}</span></div>
          ${booking.guestGstin ? `<div class="info-row"><span class="info-label">Client GSTIN:</span><span class="info-value">${booking.guestGstin}</span></div>` : ''}
        </div>
        <div class="info-col">
          <h4>Event & Billing Terms</h4>
          <div class="info-row"><span class="info-label">Event Name:</span><span class="info-value">${booking.eventName || 'Banquet Function'}</span></div>
          <div class="info-row"><span class="info-label">Billing Instructions:</span><span class="info-value">${booking.billingInstruction || 'Direct'}</span></div>
          <div class="info-row"><span class="info-label">Payment Mode:</span><span class="info-value">${booking.payMode || 'Cash'}</span></div>
          <div class="info-row"><span class="info-label">Market Segment:</span><span class="info-value">${booking.marketSegment || 'Walk In'}</span></div>
          <div class="info-row"><span class="info-label">Special Notes:</span><span class="info-value">${booking.specialInstructions || 'None'}</span></div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="text-align: left; border-radius: 4px 0 0 0;">Hall / Venue</th>
            <th style="text-align: left;">Event</th>
            <th style="text-align: left;">Date</th>
            <th style="text-align: left;">Timings</th>
            <th style="text-align: left;">Menu Card</th>
            <th style="text-align: center;">Pax</th>
            <th style="text-align: right;">Plate Rate (Rs.)</th>
            <th style="text-align: right;">Hall Rent (Rs.)</th>
            <th style="text-align: right; border-radius: 0 4px 0 0;">Total (Rs.)</th>
          </tr>
        </thead>
        <tbody>
          ${eventRowsHtml}
        </tbody>
      </table>

      <div class="summary-wrapper">
        <div class="words-box">
          <div style="font-size: 9.5px; font-weight: 700; color: #475569; text-transform: uppercase;">Amount in Words:</div>
          <div style="font-size: 11px; font-weight: 700; color: #0f172a; margin-top: 2px;">Rupees ${amountWords}</div>
          <div style="font-size: 9px; color: #64748b; margin-top: 6px;">* Valid for 15 days from issue date. Hall reservation is provisional until confirmation advance is credited.</div>
        </div>
        <div class="total-box">
          <div class="total-row">
            <span style="color: #64748b;">Total Guaranteed Pax:</span>
            <span style="font-weight: 600;">${totalPax} Guests</span>
          </div>
          <div class="total-row">
            <span style="color: #64748b;">Venue Rental Sum:</span>
            <span style="font-family: 'Segoe UI', Arial, sans-serif; font-weight: 600;">Rs. ${totalHallRent.toLocaleString('en-IN')}</span>
          </div>
          <div class="grand-total-row">
            <span>Estimated Total:</span>
            <span style="font-family: 'Segoe UI', Arial, sans-serif; font-weight: 800;">Rs. ${totalAmount.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      <div class="terms-box">
        <h5>Standard Banquet Terms & Conditions:</h5>
        <ol>
          <li>A non-refundable advance payment of 25% is mandatory to convert this quotation into a confirmed reservation.</li>
          <li>Balance 75% payment along with expected banquet extras must be settled at least 48 hours before the scheduled function.</li>
          <li>Billing is based on the guaranteed minimum pax or actual attendees, whichever is higher.</li>
          <li>Sound volume, decoration installations, and timing must strictly adhere to local government and hotel guidelines.</li>
          <li>Applicable statutory government GST taxes are included/levied as per prevailing tax laws.</li>
        </ol>
      </div>

      <div class="signature-box">
        <div class="signature-line">
          Prepared By<br/>
          <span style="font-size: 8.5px; font-weight: normal; color: #64748b;">Banquet Sales & Events</span>
        </div>
        <div class="signature-line">
          Accepted & Confirmed By<br/>
          <span style="font-size: 8.5px; font-weight: normal; color: #64748b;">Client / Authorized Signatory</span>
        </div>
      </div>
    </body>
    </html>
  `

  // Use a hidden iframe to initiate clean, native printing without capturing on-screen UI modals
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  document.body.appendChild(iframe)

  const doc = iframe.contentWindow?.document
  if (doc) {
    doc.open()
    doc.write(printableHtml)
    doc.close()

    // Give browser a moment to render styles, then trigger print
    setTimeout(() => {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe)
        }
      }, 3000)
    }, 250)
  }
}

/**
 * Downloads the banquet quotation as an A4 PDF document using jsPDF & autoTable.
 */
export function downloadBanquetQuotationPDF(booking: any, hotel?: HotelInfo) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const primaryColor: [number, number, number] = [2, 132, 199] // #0284c7 Sky/Blue
  const darkSlate: [number, number, number] = [15, 23, 42]     // Slate 900
  const textMuted: [number, number, number] = [100, 116, 139]  // Slate 500

  const resolvedHotel = (hotel?.name ? hotel : booking?.property) || hotel
  const hotelName = (resolvedHotel?.name || 'HOTEL & BANQUET').toUpperCase()
  const hotelAddress = resolvedHotel?.address && resolvedHotel.address !== 'Pending Setup' ? resolvedHotel.address : ''
  const hotelPhone = resolvedHotel?.phone || ''
  const hotelEmail = resolvedHotel?.email || ''
  const hotelGst = resolvedHotel?.gstNumber || ''
  const hotelContact = [hotelPhone ? `Phone: ${hotelPhone}` : '', hotelEmail ? `Email: ${hotelEmail}` : ''].filter(Boolean).join(' | ')

  const bookingNo = booking.bookingNumber || `BQ-${String(booking.id || '').slice(-4).toUpperCase() || '0001'}`
  const createdDate = booking.createdAt ? format(new Date(booking.createdAt), 'dd MMM yyyy') : format(new Date(), 'dd MMM yyyy')
  const clientName = `${booking.salutation || ''} ${booking.firstName || ''} ${booking.lastName || ''}`.trim() || 'Valued Guest'
  const totalAmount = Number(booking.totalAmount || 0)

  // 1. Header Banner
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.rect(0, 0, 210, 32, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(15)
  doc.text(hotelName, 14, 12)

  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(224, 242, 254)
  if (hotelAddress) {
    doc.text(hotelAddress, 14, 17)
  }
  if (hotelContact) {
    doc.text(hotelContact, 14, 21)
  }
  if (hotelGst) {
    doc.text(`GSTIN: ${hotelGst}`, 14, 25)
  }

  // Right Badge
  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(8)
  doc.text('BANQUET QUOTATION', 196, 11, { align: 'right' })
  doc.setFontSize(13)
  doc.text(bookingNo, 196, 18, { align: 'right' })
  doc.setFontSize(7.5)
  doc.setFont('Helvetica', 'normal')
  doc.text(`Date: ${createdDate} | Status: ${booking.status || 'ENQUIRY'}`, 196, 23, { align: 'right' })

  // 2. Info Cards
  const startY = 38
  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.text('HOST / CLIENT DETAILS', 14, startY)
  doc.text('EVENT & BILLING TERMS', 112, startY)

  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.setLineWidth(0.3)
  doc.line(14, startY + 1.5, 102, startY + 1.5)
  doc.line(112, startY + 1.5, 196, startY + 1.5)

  let y = startY + 6
  const clientFields: [string, string][] = [
    ['Client Name', clientName],
    ['Mobile No', booking.mobile || '—'],
    ['Email', booking.email || '—'],
    ['Company', booking.corporate || 'Individual'],
  ]

  const eventFields: [string, string][] = [
    ['Event Name', booking.eventName || 'Banquet Function'],
    ['Billing To', booking.billingInstruction || 'Direct'],
    ['Payment Mode', booking.payMode || 'Cash'],
    ['Market Segment', booking.marketSegment || 'Walk In'],
  ]

  doc.setFontSize(7.5)
  for (let i = 0; i < 4; i++) {
    const cf = clientFields[i]
    const ef = eventFields[i]

    doc.setFont('Helvetica', 'bold')
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2])
    doc.text(`${cf[0]}:`, 14, y)
    doc.setFont('Helvetica', 'normal')
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2])
    doc.text(cf[1], 40, y)

    doc.setFont('Helvetica', 'bold')
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2])
    doc.text(`${ef[0]}:`, 112, y)
    doc.setFont('Helvetica', 'normal')
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2])
    doc.text(ef[1], 142, y)

    y += 5
  }

  // 3. Events Table
  const events = booking.events || []
  const tableRows = events.map((ev: any, idx: number) => {
    let dateStr = ev.eventDate || '—'
    try {
      if (ev.eventDate) dateStr = format(parseISO(ev.eventDate), 'dd-MMM-yyyy')
    } catch {}

    return [
      String(idx + 1),
      ev.hallName || 'Hall',
      ev.eventType || 'Event',
      dateStr,
      `${ev.startTime || '09:00'} - ${ev.endTime || '17:00'}`,
      ev.menuCard || 'Standard',
      String(ev.guaranteedPax || 0),
      `Rs. ${Number(ev.perPlateRate || 0).toLocaleString('en-IN')}`,
      `Rs. ${Number(ev.hallRent || 0).toLocaleString('en-IN')}`,
      `Rs. ${Number(ev.amount || 0).toLocaleString('en-IN')}`,
    ]
  })

  autoTable(doc, {
    startY: y + 4,
    margin: { left: 14, right: 14 },
    head: [['#', 'Venue', 'Event', 'Date', 'Timings', 'Menu', 'Pax', 'Plate Rate (Rs.)', 'Hall Rent (Rs.)', 'Total (Rs.)']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: darkSlate,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: darkSlate,
    },
    columnStyles: {
      0: { cellWidth: 7, halign: 'center' },
      1: { cellWidth: 26 },
      2: { cellWidth: 20 },
      3: { cellWidth: 22 },
      4: { cellWidth: 22 },
      5: { cellWidth: 25 },
      6: { cellWidth: 12, halign: 'center' },
      7: { cellWidth: 16, halign: 'right' },
      8: { cellWidth: 16, halign: 'right' },
      9: { cellWidth: 16, halign: 'right', fontStyle: 'bold', textColor: primaryColor },
    },
    styles: { cellPadding: 2, overflow: 'linebreak' },
  })

  // @ts-ignore
  const tableEndY = doc.lastAutoTable?.finalY || (y + 40)

  // 4. Totals and Amount in words
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(14, tableEndY + 5, 110, 18, 1, 1, 'F')
  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.text('AMOUNT IN WORDS', 18, tableEndY + 11)
  doc.setFont('Helvetica', 'normal')
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2])
  doc.text(`Rupees ${numberToWords(totalAmount)}`, 18, tableEndY + 17)

  // Total summary box
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.roundedRect(132, tableEndY + 5, 64, 18, 1, 1, 'F')
  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(255, 255, 255)
  doc.text('ESTIMATED TOTAL AMOUNT', 164, tableEndY + 11, { align: 'center' })
  doc.setFontSize(13)
  doc.text(`Rs. ${totalAmount.toLocaleString('en-IN')}`, 164, tableEndY + 18, { align: 'center' })

  // 5. Terms & Signatures
  let footerY = tableEndY + 30
  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2])
  doc.text('TERMS & CONDITIONS:', 14, footerY)
  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2])
  doc.text('1. 25% non-refundable advance required upon confirmation. Balance payable 48 hours prior to event.', 14, footerY + 4)
  doc.text('2. Guaranteed minimum pax will be charged even if actual attendees are lower.', 14, footerY + 8)
  doc.text('3. Outside catering and unauthorized sound setups are prohibited without prior management approval.', 14, footerY + 12)

  // Signatures
  doc.setDrawColor(darkSlate[0], darkSlate[1], darkSlate[2])
  doc.setLineWidth(0.3)
  doc.line(14, footerY + 32, 60, footerY + 32)
  doc.line(150, footerY + 32, 196, footerY + 32)

  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2])
  doc.text('Prepared By (Banquet Sales)', 37, footerY + 36, { align: 'center' })
  doc.text('Client Acceptance Signature', 173, footerY + 36, { align: 'center' })

  // Save the document
  doc.save(`Banquet_Quotation_${bookingNo}.pdf`)
}
