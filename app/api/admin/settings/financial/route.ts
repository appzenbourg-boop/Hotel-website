/**
 * GET/POST /api/admin/settings/financial
 * Hotel admin manages tax rates, discounts, invoice settings, check-in/out times,
 * and bank account details for Razorpay payouts.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { prisma } from '@/lib/db'
import { unauthorized, forbidden, badRequest, serverError } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

const ALLOWED_ROLES = ['SUPER_ADMIN', 'HOTEL_ADMIN']

const DEFAULTS = {
    gstPercent: 18.0,
    serviceChargePercent: 0.0,
    luxuryTaxPercent: 0.0,
    defaultDiscountPercent: 0.0,
    discountLabel: 'Discount',
    invoicePrefix: 'INV',
    invoiceFooter: null,
    currency: 'INR',
    currencySymbol: '₹',
    checkInTime: '14:00',
    checkOutTime: '11:00',
    bankAccountName: null,
    bankAccountNumber: null,
    bankIfscCode: null,
    bankName: null,
    bankBranch: null,
    upiId: null,
    razorpayKeyId: null,
    // Never return razorpayKeySecret in GET — only write
}

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return unauthorized()
    if (!ALLOWED_ROLES.includes(session.user.role)) return forbidden()

    const { searchParams } = new URL(req.url)
    const queryPropertyId = searchParams.get('propertyId')

    const propertyId = session.user.role === 'SUPER_ADMIN'
        ? (queryPropertyId ?? session.user.propertyId)
        : session.user.propertyId

    if (!propertyId || propertyId === 'ALL') return badRequest('propertyId is required')

    try {
        let settings = await (prisma as any).propertySettings.findUnique({
            where: { propertyId },
        })

        if (!settings) {
            settings = { propertyId, ...DEFAULTS }
        }

        // Never expose the secret key
        const { razorpayKeySecret: _secret, ...safeSettings } = settings

        // Mask account number for display (show last 4 digits only)
        if (safeSettings.bankAccountNumber) {
            safeSettings.bankAccountNumberMasked =
                '•'.repeat(safeSettings.bankAccountNumber.length - 4) +
                safeSettings.bankAccountNumber.slice(-4)
        }

        return NextResponse.json({ success: true, data: safeSettings })
    } catch (error) {
        return serverError(error, 'FINANCIAL_SETTINGS_GET')
    }
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return unauthorized()
    if (!ALLOWED_ROLES.includes(session.user.role)) return forbidden()

    try {
        const body = await req.json()
        const {
            propertyId: bodyPropertyId,
            // Tax
            gstPercent, serviceChargePercent, luxuryTaxPercent,
            // Discount
            defaultDiscountPercent, discountLabel,
            // Invoice
            invoicePrefix, invoiceFooter,
            // Currency
            currency, currencySymbol,
            // Times
            checkInTime, checkOutTime,
            // Bank
            bankAccountName, bankAccountNumber, bankIfscCode,
            bankName, bankBranch, upiId,
            // Razorpay
            razorpayKeyId, razorpayKeySecret,
        } = body

        const propertyId = session.user.role === 'SUPER_ADMIN'
            ? (bodyPropertyId ?? session.user.propertyId)
            : session.user.propertyId

        if (!propertyId || propertyId === 'ALL') return badRequest('propertyId is required')

        // Validate tax ranges
        for (const [field, val] of [
            ['GST', gstPercent], ['Service charge', serviceChargePercent],
            ['Luxury tax', luxuryTaxPercent], ['Discount', defaultDiscountPercent],
        ]) {
            if (val !== undefined && (val < 0 || val > 100)) {
                return badRequest(`${field} percent must be between 0 and 100`)
            }
        }

        // Validate IFSC format if provided
        if (bankIfscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bankIfscCode.toUpperCase())) {
            return badRequest('Invalid IFSC code format (e.g. HDFC0001234)')
        }

        const data: any = {}
        const setIfDefined = (key: string, val: any) => { if (val !== undefined) data[key] = val }

        setIfDefined('gstPercent', gstPercent !== undefined ? parseFloat(gstPercent) : undefined)
        setIfDefined('serviceChargePercent', serviceChargePercent !== undefined ? parseFloat(serviceChargePercent) : undefined)
        setIfDefined('luxuryTaxPercent', luxuryTaxPercent !== undefined ? parseFloat(luxuryTaxPercent) : undefined)
        setIfDefined('defaultDiscountPercent', defaultDiscountPercent !== undefined ? parseFloat(defaultDiscountPercent) : undefined)
        setIfDefined('discountLabel', discountLabel)
        setIfDefined('invoicePrefix', invoicePrefix)
        setIfDefined('invoiceFooter', invoiceFooter)
        setIfDefined('currency', currency)
        setIfDefined('currencySymbol', currencySymbol)
        setIfDefined('checkInTime', checkInTime)
        setIfDefined('checkOutTime', checkOutTime)
        setIfDefined('bankAccountName', bankAccountName)
        setIfDefined('bankAccountNumber', bankAccountNumber)
        setIfDefined('bankIfscCode', bankIfscCode ? bankIfscCode.toUpperCase() : bankIfscCode)
        setIfDefined('bankName', bankName)
        setIfDefined('bankBranch', bankBranch)
        setIfDefined('upiId', upiId)
        setIfDefined('razorpayKeyId', razorpayKeyId)
        setIfDefined('razorpayKeySecret', razorpayKeySecret)

        // Remove undefined values
        Object.keys(data).forEach(k => data[k] === undefined && delete data[k])

        const settings = await (prisma as any).propertySettings.upsert({
            where: { propertyId },
            update: data,
            create: { propertyId, ...DEFAULTS, ...data },
        })

        const { razorpayKeySecret: _secret, ...safeSettings } = settings
        return NextResponse.json({ success: true, data: safeSettings })
    } catch (error) {
        return serverError(error, 'FINANCIAL_SETTINGS_POST')
    }
}
