/**
 * Email utility — uses Resend if RESEND_API_KEY is set,
 * otherwise logs to console (dev/mock mode).
 *
 * To enable real emails:
 *   1. npm install resend
 *   2. Add RESEND_API_KEY to your .env
 */

interface EmailPayload {
    to: string | string[]
    subject: string
    html: string
    from?: string
}

const FROM_ADDRESS = process.env.EMAIL_FROM || 'Zenbourg <noreply@zenbourg.com>'

async function sendWithResend(payload: EmailPayload): Promise<boolean> {
    try {
        // Lazy-load resend at runtime only (not at build time)
        // This avoids module-not-found errors when resend isn't installed
        let resendPkg: any
        try {
            // Use Function constructor to bypass static analysis
            resendPkg = await (new Function('m', 'return import(m)'))('resend')
        } catch {
            console.warn('[EMAIL] resend package not installed. Run: npm install resend')
            return logMockEmail(payload)
        }

        const resend = new resendPkg.Resend(process.env.RESEND_API_KEY)
        const { error } = await resend.emails.send({
            from: payload.from || FROM_ADDRESS,
            to: Array.isArray(payload.to) ? payload.to : [payload.to],
            subject: payload.subject,
            html: payload.html,
        })

        if (error) {
            console.error('[EMAIL] Resend error:', error)
            return false
        }
        return true
    } catch (err) {
        console.error('[EMAIL] Resend send failed:', err)
        return false
    }
}

function logMockEmail(payload: EmailPayload): boolean {
    console.log('[EMAIL MOCK]', {
        to: payload.to,
        subject: payload.subject,
        preview: payload.html.replace(/<[^>]+>/g, '').slice(0, 120),
    })
    return true
}

export async function sendEmail(payload: EmailPayload): Promise<boolean> {
    if (process.env.RESEND_API_KEY) {
        return sendWithResend(payload)
    }
    return logMockEmail(payload)
}

// ─── Pre-built templates ──────────────────────────────────────────────────────

export async function sendBookingConfirmation(opts: {
    to: string
    guestName: string
    roomNumber: string
    checkIn: string
    checkOut: string
    totalAmount: string
    hotelName: string
}) {
    return sendEmail({
        to: opts.to,
        subject: `Booking Confirmed – ${opts.hotelName}`,
        html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px">
        <h2 style="color:#4A9EFF">Booking Confirmed ✓</h2>
        <p>Dear ${opts.guestName},</p>
        <p>Your booking at <strong>${opts.hotelName}</strong> has been confirmed.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;border:1px solid #eee"><strong>Room</strong></td><td style="padding:8px;border:1px solid #eee">${opts.roomNumber}</td></tr>
          <tr><td style="padding:8px;border:1px solid #eee"><strong>Check-in</strong></td><td style="padding:8px;border:1px solid #eee">${opts.checkIn}</td></tr>
          <tr><td style="padding:8px;border:1px solid #eee"><strong>Check-out</strong></td><td style="padding:8px;border:1px solid #eee">${opts.checkOut}</td></tr>
          <tr><td style="padding:8px;border:1px solid #eee"><strong>Total</strong></td><td style="padding:8px;border:1px solid #eee">${opts.totalAmount}</td></tr>
        </table>
        <p style="color:#666;font-size:13px">We look forward to welcoming you.</p>
      </div>`,
    })
}

export async function sendPasswordResetOTP(opts: {
    to: string
    name: string
    otp: string
}) {
    return sendEmail({
        to: opts.to,
        subject: 'Password Reset OTP – Zenbourg',
        html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px">
        <h2 style="color:#4A9EFF">Password Reset</h2>
        <p>Hi ${opts.name},</p>
        <p>Your OTP for password reset is:</p>
        <div style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#4A9EFF;margin:24px 0">${opts.otp}</div>
        <p style="color:#666;font-size:13px">This OTP expires in 10 minutes.</p>
      </div>`,
    })
}

export async function sendWelcomeEmail(opts: {
    to: string
    name: string
    hotelName?: string
}) {
    return sendEmail({
        to: opts.to,
        subject: `Welcome to ${opts.hotelName || 'Zenbourg'}!`,
        html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px">
        <h2 style="color:#4A9EFF">Welcome, ${opts.name}!</h2>
        <p>Your account at <strong>${opts.hotelName || 'Zenbourg'}</strong> has been created successfully.</p>
        <p style="color:#666;font-size:13px">If you have any questions, our support team is here to help.</p>
      </div>`,
    })
}

export async function sendMarketingBlast(opts: {
    to: string
    guestName: string
    hotelName: string
    promoCode: string
    message?: string
}) {
    return sendEmail({
        to: opts.to,
        subject: `Exclusive Offer from ${opts.hotelName}`,
        html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px">
        <h2 style="color:#4A9EFF">A Special Offer Just for You</h2>
        <p>Dear ${opts.guestName},</p>
        <p>${opts.message || `Use code <strong>${opts.promoCode}</strong> for 20% off your next stay at ${opts.hotelName}.`}</p>
        <div style="background:#f0f7ff;border-radius:8px;padding:16px;margin:16px 0;text-align:center">
          <span style="font-size:24px;font-weight:bold;letter-spacing:4px;color:#4A9EFF">${opts.promoCode}</span>
        </div>
        <p style="color:#666;font-size:13px">Offer valid for 30 days. Terms and conditions apply.</p>
      </div>`,
    })
}

export async function sendEnterpriseQuoteApproval(opts: {
    to: string | string[]
    name: string
    hotelName: string
    quoteAmount: number
    dashboardUrl: string
}) {
    return sendEmail({
        to: opts.to,
        subject: `Zenbourg Enterprise Quote Approved – ${opts.hotelName}`,
        html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:32px;background:#0B0F19;color:#ffffff;border-radius:16px;border:1px solid #1F2937">
        <div style="text-align:center;margin-bottom:24px">
          <h1 style="color:#9333EA;margin:0;font-size:28px">Zenbourg</h1>
          <p style="color:#9CA3AF;font-size:14px;margin-top:4px">Enterprise Tier Approved</p>
        </div>
        <h2 style="color:#ffffff;font-size:20px;border-bottom:1px solid #374151;padding-bottom:12px">Greetings ${opts.name},</h2>
        <p style="color:#D1D5DB;line-height:1.6">We are pleased to inform you that your customized Enterprise Quote for <strong>${opts.hotelName}</strong> has been reviewed and officially approved by our corporate administration.</p>
        <div style="background:rgba(147,51,234,0.1);border:1px solid rgba(147,51,234,0.2);border-radius:12px;padding:24px;margin:24px 0;text-align:center">
          <p style="color:#9CA3AF;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px 0">Annual Enterprise Subscription</p>
          <div style="font-size:36px;font-weight:800;color:#ffffff">₹${opts.quoteAmount.toLocaleString('en-IN')}</div>
          <p style="color:#A78BFA;font-size:12px;margin:8px 0 0 0">+18% GST Applied At Checkout</p>
        </div>
        <p style="color:#D1D5DB;line-height:1.6">To unlock full capabilities including Multi-property Dashboards, White-label portals, and advanced analytics, please proceed to checkout by clicking below:</p>
        <div style="text-align:center;margin:32px 0">
          <a href="${opts.dashboardUrl}" style="background:#9333EA;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:bold;display:inline-block;box-shadow:0 4px 14px 0 rgba(147,51,234,0.39)">Proceed to Secure Checkout</a>
        </div>
        <p style="color:#9CA3AF;font-size:12px;text-align:center;margin-top:32px;border-top:1px solid #374151;padding-top:16px">If you did not request this or need adjustments, contact corporate-sales@zenbourg.com</p>
      </div>`,
    })
}

