import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'

export interface TaxInvoiceItem {
    date: string
    roomNo: string
    description: string
    hsnCode: string
    rackRate?: string
    amount: number
}

export interface TaxInvoicePDFOptions {
    invoiceNo: string
    billDate: Date | string
    isB2B: boolean

    // Hotel Details
    hotelName: string
    hotelAddress?: string
    hotelPhone?: string
    hotelEmail?: string
    hotelGstNumber?: string

    // Guest Details
    guestName: string
    guestPhone?: string
    guestEmail?: string
    guestGstNumber?: string
    guestAddress?: string

    // Stay Details
    checkIn: Date | string
    checkOut: Date | string
    nights: number
    pax: number
    roomType: string
    mealPlan?: string
    source?: string

    // Line Items
    items: TaxInvoiceItem[]

    // Totals
    totalAmount: number
    amountInWords: string
}

export function generateTaxInvoicePDF(data: TaxInvoicePDFOptions) {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
    })

    const primaryColor: [number, number, number] = [194, 106, 44]  // #C26A2C Warm Terracotta/Bronze
    const darkSlate: [number, number, number] = [30, 41, 59]       // Slate 800
    const textMuted: [number, number, number] = [100, 116, 139]    // Slate 500

    // 1. Header Banner (#C26A2C)
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.rect(0, 0, 210, 36, 'F')

    // Hotel Info on Left
    doc.setTextColor(255, 255, 255)
    doc.setFont('Helvetica', 'bold')
    doc.setFontSize(16)
    doc.text((data.hotelName || 'HOTEL').toUpperCase(), 14, 12)

    doc.setFont('Helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(254, 243, 199)
    doc.text(data.hotelAddress || 'Hotel Address, City, India', 14, 17)
    doc.text(`Phone: ${data.hotelPhone || '9876543210'} | Email: ${data.hotelEmail || 'hotel@example.com'}`, 14, 21)

    if (data.hotelGstNumber) {
        doc.setFillColor(255, 255, 255)
        doc.roundedRect(14, 24, 48, 5.5, 1, 1, 'F')
        doc.setFont('Helvetica', 'bold')
        doc.setFontSize(7)
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
        doc.text(`GSTIN: ${data.hotelGstNumber}`, 16, 28)
    }

    // Invoice Title & Ref on Right
    doc.setTextColor(254, 243, 199)
    doc.setFont('Helvetica', 'bold')
    doc.setFontSize(8)
    doc.text(data.isB2B ? 'B2B TAX INVOICE' : 'TAX INVOICE', 196, 12, { align: 'right' })

    doc.setTextColor(255, 255, 255)
    doc.setFont('Helvetica', 'bold')
    doc.setFontSize(13)
    doc.text(data.invoiceNo, 196, 18, { align: 'right' })

    doc.setTextColor(254, 243, 199)
    doc.setFont('Helvetica', 'normal')
    doc.setFontSize(7.5)
    const billDateStr = typeof data.billDate === 'string' ? data.billDate : format(data.billDate, 'dd MMM yyyy')
    doc.text(`Bill Date: ${billDateStr}`, 196, 23, { align: 'right' })

    // 2. Info Boxes: Guest Info (Left) & Stay Details (Right)
    const startY = 41

    // Headers
    doc.setFont('Helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.text('GUEST INFO', 14, startY)
    doc.text('STAY DETAILS', 112, startY)

    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.setLineWidth(0.3)
    doc.line(14, startY + 1.5, 102, startY + 1.5)
    doc.line(112, startY + 1.5, 196, startY + 1.5)

    // Guest Info Fields
    let yPos = startY + 6
    const guestFields: [string, string, boolean][] = [
        ['Name', data.guestName || '—', false],
        ['Mobile', data.guestPhone || '—', false],
        ['Email', data.guestEmail || '—', false],
        ['Guest GSTIN', data.guestGstNumber || 'B2C / Retail', Boolean(data.guestGstNumber)],
        ['Address', data.guestAddress || '—', false]
    ]

    guestFields.forEach(([label, val, isGst]) => {
        doc.setFont('Helvetica', 'normal')
        doc.setFontSize(7.5)
        doc.setTextColor(textMuted[0], textMuted[1], textMuted[2])
        doc.text(label, 14, yPos)

        if (isGst) {
            doc.setFont('Helvetica', 'bold')
            doc.setTextColor(37, 99, 235) // Blue font
        } else {
            doc.setFont('Helvetica', 'bold')
            doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2])
        }
        const cleanVal = doc.splitTextToSize(val, 55)[0] || val
        doc.text(cleanVal, 102, yPos, { align: 'right' })
        yPos += 4.5
    })

    // Stay Details Fields
    let sYPos = startY + 6
    const checkInStr = typeof data.checkIn === 'string' ? data.checkIn : format(new Date(data.checkIn), 'dd MMM yyyy HH:mm')
    const checkOutStr = typeof data.checkOut === 'string' ? data.checkOut : format(new Date(data.checkOut), 'dd MMM yyyy HH:mm')

    const stayFields: [string, string][] = [
        ['Check-in', checkInStr],
        ['Check-out', checkOutStr],
        ['Nights', `${data.nights}`],
        ['Pax', `${data.pax}`],
        ['Room Type', data.roomType || 'Standard'],
        ['Meal Plan', data.mealPlan || 'EP'],
        ['Source', data.source || 'Direct']
    ]

    stayFields.forEach(([label, val]) => {
        doc.setFont('Helvetica', 'normal')
        doc.setFontSize(7.5)
        doc.setTextColor(textMuted[0], textMuted[1], textMuted[2])
        doc.text(label, 112, sYPos)

        doc.setFont('Helvetica', 'bold')
        doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2])
        const cleanVal = doc.splitTextToSize(val, 50)[0] || val
        doc.text(cleanVal, 196, sYPos, { align: 'right' })
        sYPos += 4.5
    })

    // 3. Itemized Tax Invoice Table
    const tableStartY = Math.max(yPos, sYPos) + 3

    const tableRows = data.items.map(item => [
        item.date,
        item.roomNo,
        item.description,
        item.hsnCode,
        item.rackRate || '',
        item.amount < 0
            ? `-${Math.abs(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    ])

    // Add total row at the bottom
    tableRows.push([
        '',
        '',
        'TOTAL BILL AMOUNT',
        '',
        '',
        `INR ${data.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    ])

    autoTable(doc, {
        startY: tableStartY,
        margin: { left: 14, right: 14 },
        head: [['DATE', 'ROOM NO', 'DESCRIPTION', 'HSN CODE', 'RACK RATE', 'AMOUNT (INR)']],
        body: tableRows,
        theme: 'grid',
        headStyles: {
            fillColor: [248, 240, 235], // Light terracotta tint #C26A2C/10
            textColor: [194, 106, 44],
            fontSize: 7.5,
            fontStyle: 'bold',
            halign: 'left',
            lineWidth: 0.15,
            lineColor: [226, 232, 240]
        },
        bodyStyles: {
            textColor: [30, 41, 59],
            fontSize: 7.5,
            cellPadding: 2.2,
            lineWidth: 0.1,
            lineColor: [241, 245, 249]
        },
        columnStyles: {
            0: { cellWidth: 26 },
            1: { cellWidth: 20 },
            2: { cellWidth: 'auto' },
            3: { cellWidth: 22, halign: 'center' },
            4: { cellWidth: 24, halign: 'right' },
            5: { cellWidth: 32, halign: 'right', fontStyle: 'bold' }
        },
        didParseCell: (hookData) => {
            // Style the last row (Total Bill Amount)
            if (hookData.section === 'body' && hookData.row.index === tableRows.length - 1) {
                hookData.cell.styles.fillColor = [248, 240, 235]
                hookData.cell.styles.fontStyle = 'bold'
                hookData.cell.styles.textColor = [194, 106, 44]
                if (hookData.column.index === 2) {
                    hookData.cell.styles.fontSize = 8.5
                }
                if (hookData.column.index === 5) {
                    hookData.cell.styles.fontSize = 9
                }
            }
        }
    })

    const finalY = (doc as any).lastAutoTable?.finalY || 160

    // 4. Amount in Words & Terms Box
    doc.setFillColor(248, 250, 252)
    doc.setDrawColor(226, 232, 240)
    doc.roundedRect(14, finalY + 4, 182, 30, 2, 2, 'FD')

    doc.setFont('Helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2])
    doc.text('Amount in Words: ', 18, finalY + 9)
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.text(data.amountInWords || 'One Thousand One Hundred And Fifty Four Only', 45, finalY + 9)

    doc.setFont('Helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2])
    doc.text(`* Payment to be made in favour of ${data.hotelName || 'Hotel'}.`, 18, finalY + 14)
    doc.text('* We are committed to look after your needs.', 18, finalY + 18)
    doc.text('* The hotel is not responsible for loss or damage to personal belongings.', 18, finalY + 22)
    doc.text('* Any disputes arising from this agreement shall be governed by the laws of the jurisdiction where the hotel is located.', 18, finalY + 26)

    doc.setFont('Helvetica', 'bold')
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.text('* WE HOPE YOU ENJOYED YOUR STAY AND WOULD LIKE TO WELCOME YOU BACK', 18, finalY + 31)

    // 5. Signatures Section
    const sigY = finalY + 44
    doc.setDrawColor(148, 163, 184)
    doc.setLineWidth(0.3)
    doc.line(30, sigY, 70, sigY)
    doc.line(140, sigY, 180, sigY)

    doc.setFont('Helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2])
    doc.text('F.O.A. SIGNATURE', 50, sigY + 4, { align: 'center' })
    doc.text('GUEST SIGNATURE', 160, sigY + 4, { align: 'center' })

    // Save PDF
    doc.save(`${data.invoiceNo || 'Tax-Invoice'}.pdf`)
}
