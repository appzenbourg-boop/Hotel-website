import jsPDF from 'jspdf'

export interface PDFBookingData {
    id: string
    bookingNumber?: string
    guestName: string
    guestEmail: string
    guestPhone?: string
    roomType: string
    roomNumber?: string
    checkIn: string
    checkOut: string
    nightsCount: number
    guestsCount: number
    totalPrice: number
    paymentStatus?: string
    status?: string
    specialRequests?: string
    createdAt?: string
    source?: string
}

export interface PDFPropertyData {
    name: string
    address?: string
    city?: string
    phone?: string
    email?: string
    logo?: string | null
    coverImage?: string | null
}

/**
 * Loads an image URL into a Base64 data string for jsPDF rendering.
 * Falls back safely if image fails to load or CORS blocks canvas.
 */
async function loadBase64Image(url: string): Promise<string | null> {
    try {
        const res = await fetch(url, { mode: 'cors' })
        if (!res.ok) return null
        const blob = await res.blob()
        return new Promise((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => {
                const base64data = reader.result as string
                resolve(base64data)
            }
            reader.onerror = () => resolve(null)
            reader.readAsDataURL(blob)
        })
    } catch {
        return null
    }
}

/**
 * Generates an elegant, Stayesy-inspired PDF Luxury Stay Voucher & Invoice.
 */
export async function generateBookingPDFVoucher(
    booking: PDFBookingData,
    property: PDFPropertyData
) {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
    })

    // Theme Palette (Stayesy Luxury Dark & Indigo Theme)
    const primaryColor = [15, 23, 42]     // slate-900
    const accentColor = [59, 130, 246]    // blue-500
    const textColor = [51, 65, 85]        // slate-700
    const darkGrey = [100, 116, 139]      // slate-500
    const greenColor = [16, 185, 129]     // emerald-500
    const bgLight = [248, 250, 252]       // slate-50

    // 1. Draw Outer Frame & Top Header
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.5)
    doc.rect(10, 10, 190, 277) // Outer frame border

    // Top Header Banner
    doc.setFillColor(bgLight[0], bgLight[1], bgLight[2])
    doc.rect(10.5, 10.5, 189, 36, 'F')

    // Property Logo / Brand Header
    let logoXOffset = 20
    if (property.logo) {
        const logoBase64 = await loadBase64Image(property.logo)
        if (logoBase64) {
            try {
                doc.addImage(logoBase64, 'PNG', 16, 14, 20, 20)
                logoXOffset = 40
            } catch {
                logoXOffset = 20
            }
        }
    }

    // Brand / Hotel Name
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2])
    doc.setFont('Helvetica', 'bold')
    doc.setFontSize(20)
    doc.text((property.name || 'ZENBOURG HOTEL').toUpperCase(), logoXOffset, 24)

    // Subtitle
    doc.setTextColor(darkGrey[0], darkGrey[1], darkGrey[2])
    doc.setFont('Helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.text('OFFICIAL LUXURY STAY VOUCHER & INVOICE', logoXOffset, 31)

    // Voucher Title Right Aligned
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.setFont('Helvetica', 'bold')
    doc.setFontSize(14)
    doc.text('RESERVATION VOUCHER', 190, 23, { align: 'right' })

    // Booking Reference ID
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2])
    doc.setFont('Helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.text(`Ref ID: #${booking.bookingNumber || booking.id.substring(0, 10).toUpperCase()}`, 190, 30, { align: 'right' })

    // Header Divider Line
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.8)
    doc.line(15, 52, 195, 52)

    // 2. Status Badge & Issued Date
    const isPaid = (booking.paymentStatus || 'PAID') === 'PAID' || (booking.status || '') === 'CHECKED_IN'
    const statusText = isPaid ? 'CONFIRMED & PAID' : 'RESERVATION CONFIRMED'
    
    doc.setFillColor(isPaid ? greenColor[0] : accentColor[0], isPaid ? greenColor[1] : accentColor[1], isPaid ? greenColor[2] : accentColor[2])
    doc.rect(15, 58, 44, 7.5, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('Helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.text(statusText, 37, 63, { align: 'center' })

    // Issue Date
    const issueDate = booking.createdAt ? new Date(booking.createdAt).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')
    doc.setTextColor(darkGrey[0], darkGrey[1], darkGrey[2])
    doc.setFont('Helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(`Issued Date: ${issueDate}`, 195, 63, { align: 'right' })

    // 3. Property Information & Photo Section
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2])
    doc.setFont('Helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('PROPERTY DETAILS', 15, 76)

    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.setFont('Helvetica', 'bold')
    doc.setFontSize(13)
    doc.text(property.name || 'Zenbourg Hotel & Resort', 15, 84)

    doc.setTextColor(textColor[0], textColor[1], textColor[2])
    doc.setFont('Helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.text(`Address: ${property.address || 'MG Road, Main Boulevard'}, ${property.city || 'India'}`, 15, 90)
    if (property.phone) {
        doc.text(`Frontdesk Phone: ${property.phone}  |  Email: ${property.email || 'support@zenbourg.com'}`, 15, 96)
    }

    // Embed Hotel Cover Photo (if available)
    let photoOffsetY = 104
    if (property.coverImage) {
        const coverBase64 = await loadBase64Image(property.coverImage)
        if (coverBase64) {
            try {
                doc.addImage(coverBase64, 'JPEG', 15, 102, 180, 36)
                photoOffsetY = 144
            } catch {
                photoOffsetY = 104
            }
        }
    }

    // 4. Guest & Stay Details Grid Table
    const gridY = photoOffsetY
    doc.setDrawColor(226, 232, 240)
    doc.setFillColor(bgLight[0], bgLight[1], bgLight[2])
    doc.rect(15, gridY, 180, 52, 'FD')

    // Horizontal Divider in grid
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.4)
    doc.line(15, gridY + 26, 195, gridY + 26)
    // Vertical Dividers
    doc.line(75, gridY, 75, gridY + 52)
    doc.line(135, gridY, 135, gridY + 52)

    // Row 1: Stay Dates
    doc.setTextColor(darkGrey[0], darkGrey[1], darkGrey[2])
    doc.setFont('Helvetica', 'bold')
    doc.setFontSize(8)
    doc.text('CHECK-IN DATE', 20, gridY + 6)
    doc.text('CHECK-OUT DATE', 80, gridY + 6)
    doc.text('STAY DURATION', 140, gridY + 6)

    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.setFont('Helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(new Date(booking.checkIn).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), 20, gridY + 14)
    doc.text(new Date(booking.checkOut).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), 80, gridY + 14)
    doc.text(`${booking.nightsCount || 1} Night(s)`, 140, gridY + 14)

    doc.setTextColor(darkGrey[0], darkGrey[1], darkGrey[2])
    doc.setFont('Helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.text('Standard Check-in: 2:00 PM', 20, gridY + 20)
    doc.text('Standard Check-out: 11:00 AM', 80, gridY + 20)
    doc.text(`${booking.guestsCount || 1} Guest(s) (${booking.roomType || 'Deluxe Room'})`, 140, gridY + 20)

    // Row 2: Primary Guest Information
    doc.setTextColor(darkGrey[0], darkGrey[1], darkGrey[2])
    doc.setFont('Helvetica', 'bold')
    doc.setFontSize(8)
    doc.text('PRIMARY GUEST', 20, gridY + 32)
    doc.text('EMAIL ADDRESS', 80, gridY + 32)
    doc.text('PHONE NUMBER', 140, gridY + 32)

    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.setFont('Helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(booking.guestName, 20, gridY + 40)

    doc.setFont('Helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.text(booking.guestEmail || 'N/A', 80, gridY + 40)
    doc.text(booking.guestPhone || 'N/A', 140, gridY + 40)

    // Special Requests Section
    let requestOffset = 0
    if (booking.specialRequests) {
        doc.setTextColor(darkGrey[0], darkGrey[1], darkGrey[2])
        doc.setFont('Helvetica', 'bold')
        doc.setFontSize(8.5)
        doc.text('SPECIAL REQUESTS:', 15, gridY + 58)

        doc.setTextColor(textColor[0], textColor[1], textColor[2])
        doc.setFont('Helvetica', 'normal')
        doc.setFontSize(9)
        const lines = doc.splitTextToSize(booking.specialRequests, 175)
        doc.text(lines, 15, gridY + 64)
        requestOffset = lines.length * 4.5 + 6
    }

    // 5. Payment & Financial Summary Section
    const payY = gridY + 58 + requestOffset
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2])
    doc.setFont('Helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('PAYMENT & FINANCIAL SUMMARY', 15, payY)

    doc.setDrawColor(226, 232, 240)
    doc.setFillColor(255, 255, 255)
    doc.rect(15, payY + 4, 180, 26, 'FD')

    const nights = Math.max(1, booking.nightsCount || 1)
    const baseAmount = Math.round(booking.totalPrice / 1.18)
    const taxAmount = booking.totalPrice - baseAmount

    doc.setTextColor(textColor[0], textColor[1], textColor[2])
    doc.setFont('Helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(`Accommodation Charges (${nights} night(s) - ${booking.roomType}):`, 20, payY + 11)
    doc.text('Applicable Taxes (GST 18%):', 20, payY + 17)
    doc.text('Total Net Booking Amount Paid:', 20, payY + 23)

    doc.text(`INR ${baseAmount.toLocaleString('en-IN')}`, 190, payY + 11, { align: 'right' })
    doc.text(`INR ${taxAmount.toLocaleString('en-IN')}`, 190, payY + 17, { align: 'right' })

    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2])
    doc.setFont('Helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(`INR ${booking.totalPrice.toLocaleString('en-IN')}`, 190, payY + 23, { align: 'right' })

    // 6. Check-in Guidelines & Rules
    const rulesY = payY + 36
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.setFont('Helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.text('IMPORTANT GUIDELINES FOR YOUR STAY', 15, rulesY)

    doc.setTextColor(textColor[0], textColor[1], textColor[2])
    doc.setFont('Helvetica', 'normal')
    doc.setFontSize(8)

    const rules = [
        '• A government-approved photo identity card (Aadhaar / Passport / Voter ID) is mandatory for all guests at check-in.',
        '• Quiet hours are observed from 10:00 PM to 7:00 AM to ensure comfort for all hotel guests.',
        '• Please present this voucher or show your Booking Reference ID at the frontdesk desk upon arrival.',
        '• Any damage to hotel property, fixtures, or amenities will be billed directly at checkout.',
        '• For early check-in or late checkout requests, please contact the frontdesk concierge in advance.'
    ]

    let currentRuleY = rulesY + 5
    rules.forEach(r => {
        doc.text(r, 15, currentRuleY)
        currentRuleY += 4.5
    })

    // 7. Footer Concierge Brand Note
    const footerY = 270
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.4)
    doc.line(15, footerY, 195, footerY)

    doc.setTextColor(darkGrey[0], darkGrey[1], darkGrey[2])
    doc.setFont('Helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.text(`${(property.name || 'ZENBOURG HOTEL').toUpperCase()} CONCIERGE & SUPPORT`, 105, footerY + 5, { align: 'center' })

    doc.setFont('Helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.text(`Email: ${property.email || 'support@zenbourg.com'}  |  Website: https://zenbourg.com  |  Phone: ${property.phone || '+91 79991 35895'}`, 105, footerY + 9, { align: 'center' })

    // Save File
    doc.save(`Zenbourg_Voucher_${booking.bookingNumber || booking.id.substring(0, 8)}.pdf`)
}
