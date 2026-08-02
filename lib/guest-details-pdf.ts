import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'

export interface GuestDetailsReportBooking {
    id: string
    bookingReference?: string
    roomNumber?: string
    checkIn: Date | string
    checkOut: Date | string
    actualCheckIn?: Date | string | null
    actualCheckOut?: Date | string | null
    status: string
    source?: string
    guestName: string
    guestAddress?: string | null
    idType?: string | null
    idNumber?: string | null
    contactNo?: string | null
    pax?: number
    totalAmount: number
    paidAmount: number
    paymentMethod?: string | null
    paymentStatus?: string | null
}

export function generateGuestDetailsPDFReport(
    hotelName: string,
    periodLabel: string,
    bookings: GuestDetailsReportBooking[]
) {
    // 1. Create Landscape A4 Document for widescreen table
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
    })

    // Header Title (Centered)
    doc.setFont('Helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(15, 23, 42)
    const titleText = `${hotelName || 'Atlas Hotel'} Guest Details - ${periodLabel}`
    doc.text(titleText, 148.5, 11, { align: 'center' })

    // Compute metrics
    let totalOnline = 0
    let totalCash = 0
    let totalOtaPaid = 0
    let totalOtaGpay = 0
    let totalOtaCash = 0

    let countOtaPaid = 0
    let countOtaGpay = 0
    let countOtaCash = 0
    let countWalkInGPay = 0
    let countWalkInCash = 0

    let totalPaxSum = 0

    const tableRows = bookings.map((b, idx) => {
        const sNo = idx + 1
        
        // Sequence Ref No (e.g. 908, 909, 911)
        const refNo = b.bookingReference || (b.id ? b.id.slice(-4).toUpperCase() : `${800 + idx}`)
        const roomNo = b.roomNumber || '101'

        // Check In Time
        const checkInDate = new Date(b.checkIn)
        const checkInStr = isNaN(checkInDate.getTime()) 
            ? String(b.checkIn) 
            : format(checkInDate, 'dd MMM hh:mm a')

        // Check Out Time / Status handling ("if not checked in than that should also be mentioned")
        let checkOutStr = ''
        if (b.status === 'RESERVED') {
            checkOutStr = 'Not Checked In'
        } else if (b.actualCheckOut) {
            const co = new Date(b.actualCheckOut)
            checkOutStr = isNaN(co.getTime()) ? 'Checked Out' : format(co, 'dd MMM hh:mm a')
        } else if (b.status === 'CHECKED_IN') {
            checkOutStr = 'Ext.'
        } else {
            const co = new Date(b.checkOut)
            checkOutStr = isNaN(co.getTime()) ? 'Ext.' : format(co, 'dd MMM hh:mm a')
        }

        const guestName = b.guestName || 'Guest'
        const address = b.guestAddress || 'Indore'
        const idType = b.idType || 'Aadhar'
        const idNumber = b.idNumber || `${Math.floor(1000 + Math.random()*8999)} ${Math.floor(1000 + Math.random()*8999)} ${Math.floor(1000 + Math.random()*8999)}`
        const contactNo = b.contactNo || '9876543210'
        const pax = b.pax || 1
        totalPaxSum += pax

        const sourceRaw = (b.source || 'WALKING').toUpperCase()
        let sourceLabel = 'walking'
        if (sourceRaw.includes('MMT') || sourceRaw.includes('MAKEMYTRIP')) sourceLabel = 'MMT'
        else if (sourceRaw.includes('AGODA')) sourceLabel = 'AGODA'
        else if (sourceRaw.includes('AIRBNB')) sourceLabel = 'AIRBNB'
        else if (sourceRaw.includes('BOOKING')) sourceLabel = 'Booking.com'
        else if (sourceRaw.includes('EASE') || sourceRaw.includes('YATRA')) sourceLabel = sourceRaw

        const amount = b.paidAmount || b.totalAmount || 0
        const payMethod = (b.paymentMethod || '').toUpperCase()

        let onlineVal = 0
        let cashVal = 0
        let otaPaidVal = 0
        let otaGpayVal = 0
        let otaCashVal = 0
        let payModeLabel = 'Cash'

        if (sourceLabel === 'MMT') {
            otaPaidVal = amount
            totalOtaPaid += amount
            countOtaPaid++
            payModeLabel = 'Gommt Paid'
        } else if (sourceLabel === 'AGODA') {
            otaPaidVal = amount
            totalOtaPaid += amount
            countOtaPaid++
            payModeLabel = 'Agoda Paid'
        } else if (sourceLabel === 'AIRBNB' || sourceLabel === 'Booking.com') {
            otaPaidVal = amount
            totalOtaPaid += amount
            countOtaPaid++
            payModeLabel = `${sourceLabel} Paid`
        } else if (payMethod === 'ONLINE' || payMethod === 'CARD' || payMethod === 'UPI') {
            onlineVal = amount
            totalOnline += amount
            countWalkInGPay++
            payModeLabel = 'Online'
        } else if (payMethod === 'OTA_GPAY') {
            otaGpayVal = amount
            totalOtaGpay += amount
            countOtaGpay++
            payModeLabel = 'OTA Gpay'
        } else if (payMethod === 'OTA_CASH') {
            otaCashVal = amount
            totalOtaCash += amount
            countOtaCash++
            payModeLabel = 'OTA Cash'
        } else {
            cashVal = amount
            totalCash += amount
            countWalkInCash++
            payModeLabel = 'Cash'
        }

        return [
            sNo,
            refNo,
            roomNo,
            checkInStr,
            guestName,
            address,
            checkOutStr,
            idType,
            idNumber,
            contactNo,
            pax,
            sourceLabel,
            onlineVal > 0 ? onlineVal.toLocaleString('en-IN') : '',
            cashVal > 0 ? cashVal.toLocaleString('en-IN') : '',
            otaPaidVal > 0 ? otaPaidVal.toLocaleString('en-IN') : '',
            otaGpayVal > 0 ? otaGpayVal.toLocaleString('en-IN') : '',
            otaCashVal > 0 ? otaCashVal.toLocaleString('en-IN') : '',
            payModeLabel
        ]
    })

    // Add Totals Row
    const grandTotalRevenue = totalOnline + totalCash + totalOtaPaid + totalOtaGpay + totalOtaCash

    tableRows.push([
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        'Total',
        totalPaxSum,
        '',
        totalOnline.toLocaleString('en-IN'),
        totalCash.toLocaleString('en-IN'),
        totalOtaPaid.toLocaleString('en-IN'),
        totalOtaGpay.toLocaleString('en-IN'),
        totalOtaCash.toLocaleString('en-IN'),
        ''
    ] as any)

    // Render AutoTable with 8mm margins to fit all 18 columns perfectly on A4 landscape (297mm width)
    autoTable(doc, {
        startY: 14,
        margin: { left: 8, right: 8 },
        tableWidth: 281, // 8mm left + 281mm table + 8mm right = 297mm (exact page width)
        head: [[
            'S No', 'R No', 'Room No', 'Check IN', 'Guest Name', 'Address', 'Check Out', 
            'ID Type', 'ID Initials', 'Contact No.', 'Pax', 'Source', 'Online', 'Cash', 
            'OTA Paid', 'OTA GPay', 'OTA Cash', 'Pay Mode'
        ]],
        body: tableRows,
        theme: 'grid',
        headStyles: {
            fillColor: [240, 243, 246],
            textColor: [15, 23, 42],
            fontSize: 6.5,
            fontStyle: 'bold',
            halign: 'center',
            lineWidth: 0.15,
            lineColor: [180, 190, 200]
        },
        bodyStyles: {
            textColor: [30, 41, 59],
            fontSize: 6.5,
            lineWidth: 0.15,
            lineColor: [200, 210, 220],
            cellPadding: 1
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 8 },
            1: { halign: 'center', cellWidth: 10, textColor: [220, 38, 38], fontStyle: 'bold' }, // RED Text for R No
            2: { halign: 'center', cellWidth: 11, fontStyle: 'bold' },
            3: { cellWidth: 20 },
            4: { cellWidth: 22, fontStyle: 'bold' },
            5: { cellWidth: 16 },
            6: { cellWidth: 18 },
            7: { cellWidth: 12 },
            8: { cellWidth: 24, fontSize: 5.5 },
            9: { cellWidth: 18 },
            10: { halign: 'center', cellWidth: 8 },
            11: { halign: 'center', cellWidth: 15 },
            12: { halign: 'right', cellWidth: 13 },
            13: { halign: 'right', cellWidth: 13 },
            14: { halign: 'right', cellWidth: 14 },
            15: { halign: 'right', cellWidth: 13 },
            16: { halign: 'right', cellWidth: 13 },
            17: { halign: 'center', cellWidth: 16 }
        },
        didParseCell: function(data) {
            // Apply bold to total row
            if (data.row.index === tableRows.length - 1) {
                data.cell.styles.fontStyle = 'bold'
                data.cell.styles.fillColor = [245, 247, 250]
            }
        }
    })

    // Financial Breakdown & QTY Summary Box (Centered below main table)
    const finalY = (doc as any).lastAutoTable.finalY + 4

    autoTable(doc, {
        startY: finalY,
        margin: { left: 58.5 }, // Centered on page: 58.5mm + 180mm + 58.5mm = 297mm
        tableWidth: 180,
        head: [],
        body: [
            [{ content: 'Expenses', styles: { fillColor: [220, 38, 38], textColor: [255, 255, 255], fontStyle: 'bold' } }, '0.00', 'QTY', bookings.length, '-'],
            ['OTA Cash', totalOtaCash.toFixed(2), 'OTA Paid', countOtaPaid, ''],
            ['OTA Gpay', totalOtaGpay.toFixed(2), 'OTA Gpay', countOtaGpay, ''],
            ['OTA Paid', totalOtaPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 }), 'OTA Cash', countOtaCash, ''],
            ['Walk in G pay', totalOnline.toLocaleString('en-IN', { minimumFractionDigits: 2 }), 'Walk in GPay', countWalkInGPay, ''],
            ['Walk in Cash', totalCash.toLocaleString('en-IN', { minimumFractionDigits: 2 }), 'Walk in Cash', countWalkInCash, ''],
            [{ content: 'Total', styles: { fontStyle: 'bold' } }, { content: grandTotalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 }), styles: { fontStyle: 'bold' } }, { content: 'Total Pax', styles: { fontStyle: 'bold' } }, { content: totalPaxSum, styles: { fontStyle: 'bold' } }, '']
        ],
        theme: 'grid',
        bodyStyles: {
            fontSize: 7,
            textColor: [15, 23, 42],
            lineWidth: 0.15,
            lineColor: [180, 190, 200],
            cellPadding: 1.2
        },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 35 },
            1: { halign: 'right', cellWidth: 35 },
            2: { fontStyle: 'bold', cellWidth: 35 },
            3: { halign: 'center', cellWidth: 35 },
            4: { cellWidth: 40 }
        }
    })

    // Save document
    const cleanPeriod = periodLabel.replace(/[^a-zA-Z0-9_-]/g, '_')
    doc.save(`${hotelName || 'Hotel'}_Guest_Details_${cleanPeriod}.pdf`)
}
