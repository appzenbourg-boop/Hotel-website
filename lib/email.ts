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
