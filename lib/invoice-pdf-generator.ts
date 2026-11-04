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
    companyName?: string
    companyAddress?: string
    guestAddress?: string
    itcEligibility?: string

    // Stay Details
    checkIn: Date | string
    checkOut: Date | string
    nights: number
    pax: number
    roomType: string
    mealPlan?: string
    source?: string
    roomImage?: string

    // Line Items
    items: TaxInvoiceItem[]

    // Totals
    totalAmount: number
    amountInWords: string
}

async function loadImageAsDataUrl(url?: string): Promise<string | null> {
    if (!url || typeof window === 'undefined') return null
    if (url.startsWith('data:image/')) return url

    // Method 1: Try fetch + FileReader blob
    try {
        const res = await fetch(url, { mode: 'cors' })
        if (res.ok) {
            const blob = await res.blob()
            const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader()
                reader.onloadend = () => resolve(reader.result as string)
                reader.onerror = reject
                reader.readAsDataURL(blob)
            })
            if (base64) return base64
        }
    } catch {
        // Fallback to Image element
    }

    // Method 2: HTML Image element
    return new Promise((resolve) => {
        try {
            const img = new Image()
            img.crossOrigin = 'Anonymous'
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas')
                    canvas.width = img.naturalWidth || img.width || 300
                    canvas.height = img.naturalHeight || img.height || 200
                    const ctx = canvas.getContext('2d')
                    if (!ctx) return resolve(null)
                    ctx.drawImage(img, 0, 0)
                    resolve(canvas.toDataURL('image/jpeg', 0.85))
                } catch {
                    resolve(null)
                }
            }
            img.onerror = () => resolve(null)
            img.src = url
        } catch {
            resolve(null)
        }
    })
}

export async function generateTaxInvoicePDF(data: TaxInvoicePDFOptions) {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
    })

    // Premium Blue & White Palette
    const primaryBlue: [number, number, number] = [37, 99, 235]       // #2563EB Royal Blue
    const darkBlue: [number, number, number] = [30, 64, 175]          // #1E40AF Deep Navy
    const lightBlueTint: [number, number, number] = [239, 246, 255]   // #EFF6FF Blue-50
    const lightBlueBorder: [number, number, number] = [191, 219, 254] // #BFDBFE Blue-200
    const darkSlate: [number, number, number] = [15, 23, 42]          // Slate 900
    const textMuted: [number, number, number] = [100, 116, 139]       // Slate 500

    // 1. Header Banner (Royal Blue)
    doc.setFillColor(primaryBlue[0], primaryBlue[1], primaryBlue[2])
    doc.rect(0, 0, 210, 36, 'F')

    // Hotel Info on Left
    doc.setTextColor(255, 255, 255)
    doc.setFont('Helvetica', 'bold')
    doc.setFontSize(16)
    doc.text((data.hotelName || 'HOTEL').toUpperCase(), 14, 12)

    doc.setFont('Helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(224, 231, 255)
    doc.text(data.hotelAddress || 'Hotel Address, City, India', 14, 17)
    doc.text(`Phone: ${data.hotelPhone || '9876543210'} | Email: ${data.hotelEmail || 'hotel@example.com'}`, 14, 21)

    if (data.hotelGstNumber) {
        doc.setFillColor(255, 255, 255)
        doc.roundedRect(14, 24, 52, 5.8, 1, 1, 'F')
        doc.setFont('Helvetica', 'bold')
        doc.setFontSize(7)
        doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2])
        doc.text(`GSTIN: ${data.hotelGstNumber}`, 16, 28)
    }

    // Invoice Title & Ref on Right
    doc.setTextColor(224, 231, 255)
    doc.setFont('Helvetica', 'bold')
    doc.setFontSize(8)
    doc.text(data.isB2B ? 'B2B TAX INVOICE' : 'TAX INVOICE', 196, 12, { align: 'right' })

    doc.setTextColor(255, 255, 255)
    doc.setFont('Helvetica', 'bold')
    doc.setFontSize(13)
    doc.text(data.invoiceNo, 196, 18, { align: 'right' })

    doc.setTextColor(224, 231, 255)
    doc.setFont('Helvetica', 'normal')
    doc.setFontSize(7.5)
    const billDateStr = typeof data.billDate === 'string' ? data.billDate : format(data.billDate, 'dd MMM yyyy')
    doc.text(`Bill Date: ${billDateStr}`, 196, 23, { align: 'right' })

    // 2. Info Boxes: Guest Info (Left) & Stay Details (Right)
    const startY = 41
    const hasRoomImage = Boolean(data.roomImage)

    // Load Room Image Data URL if provided
    let roomImageDataUrl: string | null = null
    if (hasRoomImage) {
        try {
            roomImageDataUrl = await loadImageAsDataUrl(data.roomImage)
        } catch {
            roomImageDataUrl = null
        }
    }

    // Section Titles
    doc.setFont('Helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2])
    doc.text('GUEST INFO', 14, startY)
    doc.text('STAY DETAILS', 106, startY)

    doc.setDrawColor(primaryBlue[0], primaryBlue[1], primaryBlue[2])
    doc.setLineWidth(0.3)
    doc.line(14, startY + 1.5, 98, startY + 1.5)
    doc.line(106, startY + 1.5, 196, startY + 1.5)

    // Guest Info Fields
    let yPos = startY + 6
    const guestFields: [string, string, boolean][] = [
        ['Guest Name', data.guestName || '—', false],
        ...(data.companyName ? [['Company', data.companyName, true] as [string, string, boolean]] : []),
        ['Guest GSTIN', data.guestGstNumber || 'B2C / Retail', Boolean(data.guestGstNumber)],
        ['Mobile', data.guestPhone || '—', false],
        ['Email', data.guestEmail || '—', false],
        ['Address', data.companyAddress || data.guestAddress || '—', false],
        ...(data.itcEligibility ? [['ITC Status', data.itcEligibility, false] as [string, string, boolean]] : [])
    ]

    guestFields.forEach(([label, val, isGst]) => {
        doc.setFont('Helvetica', 'normal')
        doc.setFontSize(7.5)
        doc.setTextColor(textMuted[0], textMuted[1], textMuted[2])
        doc.text(label, 14, yPos)

        if (isGst) {
            doc.setFont('Helvetica', 'bold')
            doc.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2])
        } else {
            doc.setFont('Helvetica', 'bold')
            doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2])
        }
        const cleanVal = doc.splitTextToSize(val, 50)[0] || val
        doc.text(cleanVal, 98, yPos, { align: 'right' })
        yPos += 4.5
    })

    // Stay Details Fields
    let sYPos = startY + 6
    const checkInStr = typeof data.checkIn === 'string' ? data.checkIn : format(new Date(data.checkIn), 'dd MMM yyyy HH:mm')
    const checkOutStr = typeof data.checkOut === 'string' ? data.checkOut : format(new Date(data.checkOut), 'dd MMM yyyy HH:mm')

    const stayFields: [string, string][] = [
        ['Check-in', checkInStr],
        ['Check-out (Std)', '11:00 AM'],
        ['Departure', checkOutStr],
        ['Nights / Pax', `${data.nights} Night${data.nights > 1 ? 's' : ''} / ${data.pax} Pax`],
        ['Room Type', data.roomType || 'Standard'],
        ['Meal Plan', data.mealPlan || 'EP'],
        ['Booking Source', data.source || 'Direct']
    ]

    const stayDetailsRightX = roomImageDataUrl ? 154 : 196

    stayFields.forEach(([label, val]) => {
        doc.setFont('Helvetica', 'normal')
        doc.setFontSize(7.5)
        doc.setTextColor(textMuted[0], textMuted[1], textMuted[2])
        doc.text(label, 106, sYPos)

        doc.setFont('Helvetica', 'bold')
        doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2])
        const cleanVal = doc.splitTextToSize(val, 28)[0] || val
        doc.text(cleanVal, stayDetailsRightX, sYPos, { align: 'right' })
        sYPos += 4.5
    })

    // Embed Room Image if available
    if (roomImageDataUrl) {
        try {
            // Draw thumbnail photo frame
            doc.setFillColor(lightBlueTint[0], lightBlueTint[1], lightBlueTint[2])
            doc.setDrawColor(lightBlueBorder[0], lightBlueBorder[1], lightBlueBorder[2])
            doc.roundedRect(158, startY + 4, 38, 28, 1.5, 1.5, 'FD')

            doc.addImage(roomImageDataUrl, 'JPEG', 159, startY + 5, 36, 22)

            // Caption under photo
            doc.setFont('Helvetica', 'bold')
            doc.setFontSize(6)
            doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2])
            doc.text('ROOM PHOTOGRAPH', 177, startY + 30, { align: 'center' })
        } catch (imgErr) {
            console.warn('[PDF_ROOM_IMAGE_WARN]', imgErr)
        }
    }

    // 3. Itemized Tax Invoice Table
    const tableStartY = Math.max(yPos, sYPos, roomImageDataUrl ? startY + 35 : startY) + 4

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
            fillColor: lightBlueTint, // Soft blue-50
            textColor: darkBlue,      // Deep Blue
            fontSize: 7.5,
            fontStyle: 'bold',
            halign: 'left',
            lineWidth: 0.15,
            lineColor: lightBlueBorder
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
                hookData.cell.styles.fillColor = lightBlueTint
                hookData.cell.styles.fontStyle = 'bold'
                hookData.cell.styles.textColor = darkBlue
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
    doc.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2])
    doc.text(data.amountInWords || 'One Thousand One Hundred And Fifty Four Only', 45, finalY + 9)

    doc.setFont('Helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2])
    doc.text(`* Payment to be made in favour of ${data.hotelName || 'Hotel'}.`, 18, finalY + 14)
    doc.text('* We are committed to look after your needs.', 18, finalY + 18)
    doc.text('* The hotel is not responsible for loss or damage to personal belongings.', 18, finalY + 22)
    doc.text('* Any disputes arising from this agreement shall be governed by the laws of the jurisdiction where the hotel is located.', 18, finalY + 26)

    doc.setFont('Helvetica', 'bold')
    doc.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2])
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

    // Save PDF with dynamic, sanitized current hotel name
    const cleanHotel = (data.hotelName || 'StayIn_Hotel')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '') || 'Hotel'
    const cleanInvoiceNo = (data.invoiceNo || 'INV').replace(/[^a-zA-Z0-9_-]/g, '_')

    doc.save(`${cleanHotel}_Invoice_${cleanInvoiceNo}.pdf`)
}
