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

async function sendWithNodemailer(payload: EmailPayload): Promise<boolean> {
    try {
        let nodemailer: any
        try {
            nodemailer = await (new Function('m', 'return import(m)'))('nodemailer')
        } catch {
            console.warn('[EMAIL] nodemailer package not installed. Run: npm install nodemailer')
            return logMockEmail(payload)
        }

        const host = process.env.SMTP_HOST || 'smtp.gmail.com'
        const port = parseInt(process.env.SMTP_PORT || '465')
        const user = process.env.SMTP_USER
        const pass = process.env.SMTP_PASS

        const transporter = nodemailer.createTransport({
            host,
            port,
            secure: port === 465,
            auth: {
                user,
                pass,
            },
        })

        const fromAddress = payload.from || process.env.EMAIL_FROM || `Zenbourg Hotel <${user}>`
        const recipient = Array.isArray(payload.to) ? payload.to.join(',') : payload.to

        await transporter.sendMail({
            from: fromAddress,
            to: recipient,
            subject: payload.subject,
            html: payload.html,
        })

        console.log(`[EMAIL SMTP SUCCESS] Sent email to ${recipient}`)
        return true
    } catch (err) {
        console.error('[EMAIL SMTP Error]', err)
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
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        return sendWithNodemailer(payload)
    }
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
      <div style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:600px;margin:auto;padding:32px;background:#0F172A;color:#F8FAFC;border-radius:20px;border:1px solid #1E293B">
        <div style="text-align:center;margin-bottom:28px">
          <div style="display:inline-block;background:#3B82F6;color:#ffffff;width:44px;height:44px;line-height:44px;border-radius:12px;font-size:22px;font-weight:bold;margin-bottom:12px">Z</div>
          <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:800;letter-spacing:-0.5px">Welcome to ${opts.hotelName || 'Zenbourg'}</h1>
          <p style="color:#94A3B8;font-size:13px;margin-top:6px;font-weight:600">All-in-One Hotel Management & Guest Platform</p>
        </div>
        
        <div style="background:#1E293B;border-radius:16px;padding:24px;margin-bottom:24px;border:1px solid #334155">
          <p style="font-size:16px;font-weight:700;color:#38BDF8;margin-top:0">Dear ${opts.name},</p>
          <p style="color:#CBD5E1;line-height:1.6;font-size:14px">We are thrilled to welcome you! Your account at <strong>${opts.hotelName || 'Zenbourg'}</strong> has been created and is fully active.</p>
          <div style="margin-top:20px;padding:16px;background:#0F172A;border-radius:12px;border:1px solid #334155">
            <div style="font-size:11px;font-weight:800;color:#94A3B8;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">REGISTERED EMAIL ADDRESS</div>
            <div style="font-size:15px;font-weight:700;color:#F8FAFC">${opts.to}</div>
          </div>
        </div>

        <div style="text-align:center;margin:32px 0 24px 0">
          <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/admin/login" style="background:#3B82F6;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:9999px;font-weight:800;font-size:13px;letter-spacing:1px;text-transform:uppercase;display:inline-block;box-shadow:0 10px 25px -5px rgba(59,130,246,0.5)">Log In to Your Account</a>
        </div>

        <p style="color:#64748B;font-size:12px;text-align:center;margin-top:28px;border-top:1px solid #1E293B;padding-top:20px">
          Need assistance? Our support team is here to help at support@zenbourg.com
        </p>
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

export async function sendLoginAlertEmail(opts: {
    to: string
    name: string
    time?: string
    ipAddress?: string
}) {
    return sendEmail({
        to: opts.to,
        subject: `Security Alert: New Sign-In to Your Zenbourg Account`,
        html: `
      <div style="font-family:'Segoe UI',Roboto,sans-serif;max-width:600px;margin:auto;padding:32px;background:#0F172A;color:#F8FAFC;border-radius:20px;border:1px solid #1E293B">
        <div style="text-align:center;margin-bottom:24px">
          <div style="display:inline-block;background:#3B82F6;color:#ffffff;width:44px;height:44px;line-height:44px;border-radius:12px;font-size:22px;font-weight:bold;margin-bottom:12px">Z</div>
          <h2 style="color:#ffffff;margin:0;font-size:22px;font-weight:800">New Account Login Detected</h2>
        </div>
        <div style="background:#1E293B;border-radius:16px;padding:24px;margin-bottom:24px;border:1px solid #334155">
          <p style="font-size:15px;color:#CBD5E1;margin-top:0">Hi <strong>${opts.name}</strong>,</p>
          <p style="color:#94A3B8;font-size:14px;line-height:1.6">We noticed a new login to your Zenbourg account on <strong>${opts.time || new Date().toLocaleString('en-IN')}</strong>.</p>
          ${opts.ipAddress ? `<p style="color:#38BDF8;font-size:13px;font-family:monospace">IP Address: ${opts.ipAddress}</p>` : ''}
        </div>
        <p style="color:#64748B;font-size:12px;text-align:center">If this was you, no action is needed. If you did not authorize this login, please reset your password immediately.</p>
      </div>`,
    })
}

export async function sendSubscriptionUpgradeEmail(opts: {
    to: string
    name: string
    hotelName: string
    newPlan: string
    amountPaid?: number
}) {
    return sendEmail({
        to: opts.to,
        subject: `Subscription Upgraded to ${opts.newPlan} – ${opts.hotelName}`,
        html: `
      <div style="font-family:'Segoe UI',Roboto,sans-serif;max-width:600px;margin:auto;padding:32px;background:#0F172A;color:#F8FAFC;border-radius:20px;border:1px solid #1E293B">
        <div style="text-align:center;margin-bottom:24px">
          <div style="display:inline-block;background:#10B981;color:#ffffff;width:44px;height:44px;line-height:44px;border-radius:12px;font-size:22px;font-weight:bold;margin-bottom:12px">✓</div>
          <h2 style="color:#ffffff;margin:0;font-size:24px;font-weight:800">Subscription Upgraded!</h2>
          <p style="color:#34D399;font-size:13px;margin-top:4px;font-weight:700">${opts.hotelName}</p>
        </div>
        <div style="background:#1E293B;border-radius:16px;padding:24px;margin-bottom:24px;border:1px solid #334155">
          <p style="font-size:15px;color:#CBD5E1;margin-top:0">Dear ${opts.name},</p>
          <p style="color:#CBD5E1;line-height:1.6;font-size:14px">Congratulations! Your subscription has been successfully upgraded to the <strong>${opts.newPlan}</strong> plan.</p>
          ${opts.amountPaid ? `<div style="margin-top:16px;padding:16px;background:#0F172A;border-radius:12px;font-size:16px;font-weight:bold;color:#10B981">Amount Paid: ₹${opts.amountPaid.toLocaleString('en-IN')}</div>` : ''}
        </div>
        <div style="text-align:center;margin:28px 0">
          <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/admin/dashboard" style="background:#10B981;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:9999px;font-weight:800;font-size:13px;letter-spacing:1px;text-transform:uppercase;display:inline-block">Go to Dashboard</a>
        </div>
      </div>`,
    })
}

export async function sendTrialExpiringEmail(opts: {
    to: string
    name: string
    hotelName: string
    daysLeft: number
}) {
    return sendEmail({
        to: opts.to,
        subject: `Reminder: Your Free Trial for ${opts.hotelName} Expires in ${opts.daysLeft} Day(s)`,
        html: `
      <div style="font-family:'Segoe UI',Roboto,sans-serif;max-width:600px;margin:auto;padding:32px;background:#0F172A;color:#F8FAFC;border-radius:20px;border:1px solid #1E293B">
        <div style="text-align:center;margin-bottom:24px">
          <div style="display:inline-block;background:#F59E0B;color:#ffffff;width:44px;height:44px;line-height:44px;border-radius:12px;font-size:22px;font-weight:bold;margin-bottom:12px">⏳</div>
          <h2 style="color:#ffffff;margin:0;font-size:22px;font-weight:800">Your Free Trial is Expiring Soon</h2>
        </div>
        <div style="background:#1E293B;border-radius:16px;padding:24px;margin-bottom:24px;border:1px solid #334155">
          <p style="font-size:15px;color:#CBD5E1;margin-top:0">Dear ${opts.name},</p>
          <p style="color:#CBD5E1;line-height:1.6;font-size:14px">Your free trial for <strong>${opts.hotelName}</strong> will expire in <strong>${opts.daysLeft} day(s)</strong>. Upgrade now to ensure uninterrupted access to reservations, POS, and channel sync.</p>
        </div>
        <div style="text-align:center;margin:28px 0">
          <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/admin/settings?view=SUBSCRIPTION" style="background:#3B82F6;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:9999px;font-weight:800;font-size:13px;letter-spacing:1px;text-transform:uppercase;display:inline-block">Upgrade Subscription</a>
        </div>
      </div>`,
    })
}

export async function sendTrialExpiredEmail(opts: {
    to: string
    name: string
    hotelName: string
}) {
    return sendEmail({
        to: opts.to,
        subject: `Trial Expired – Upgrade ${opts.hotelName} to Continue Services`,
        html: `
      <div style="font-family:'Segoe UI',Roboto,sans-serif;max-width:600px;margin:auto;padding:32px;background:#0F172A;color:#F8FAFC;border-radius:20px;border:1px solid #1E293B">
        <div style="text-align:center;margin-bottom:24px">
          <div style="display:inline-block;background:#EF4444;color:#ffffff;width:44px;height:44px;line-height:44px;border-radius:12px;font-size:22px;font-weight:bold;margin-bottom:12px">!</div>
          <h2 style="color:#ffffff;margin:0;font-size:22px;font-weight:800">Your Free Trial Has Expired</h2>
        </div>
        <div style="background:#1E293B;border-radius:16px;padding:24px;margin-bottom:24px;border:1px solid #334155">
          <p style="font-size:15px;color:#CBD5E1;margin-top:0">Dear ${opts.name},</p>
          <p style="color:#CBD5E1;line-height:1.6;font-size:14px">The free trial period for <strong>${opts.hotelName}</strong> has ended. Please choose a subscription plan to reactivate all features.</p>
        </div>
        <div style="text-align:center;margin:28px 0">
          <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/admin/settings?view=SUBSCRIPTION" style="background:#EF4444;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:9999px;font-weight:800;font-size:13px;letter-spacing:1px;text-transform:uppercase;display:inline-block">Select Plan & Upgrade</a>
        </div>
      </div>`,
    })
}

