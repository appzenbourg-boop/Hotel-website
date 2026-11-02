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

import { validateGSTIN } from '@/lib/utils'

const DEFAULTS = {
    gstPercent: 18.0,
    serviceChargePercent: 0.0,
    luxuryTaxPercent: 0.0,
    gstNumber: null,
    defaultDiscountPercent: 0.0,
    discountLabel: 'Discount',
    managerPin: '1234',
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

    let propertyId = queryPropertyId && queryPropertyId !== 'ALL'
        ? queryPropertyId
        : session.user.propertyId

    if (!propertyId || propertyId === 'ALL') {
        const dbUser = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { workplaceId: true, ownedPropertyIds: true }
        })
        propertyId = dbUser?.workplaceId || dbUser?.ownedPropertyIds?.[0] || null
        if (!propertyId) {
            const firstProp = await prisma.property.findFirst({
                where: session.user.role === 'SUPER_ADMIN' ? undefined : { ownerIds: { has: session.user.id } }
            })
            if (firstProp) propertyId = firstProp.id
        }
        if (!propertyId && session.user.role === 'SUPER_ADMIN') {
            const anyProp = await prisma.property.findFirst()
            if (anyProp) propertyId = anyProp.id
        }
    }

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

        // Retrieve managerPin and GST details directly from settings or raw document to guarantee fresh persistence
        let managerPin = settings?.managerPin ? String(settings.managerPin).trim() : '1234'
        let rawDoc: any = null
        try {
            const findQuery = settings?.id 
                ? { _id: { $oid: settings.id } } 
                : { $or: [{ propertyId: { $oid: propertyId } }, { propertyId: propertyId }] }
            const raw = await prisma.$runCommandRaw({
                find: 'property_settings',
                filter: findQuery
            }) as any
            rawDoc = raw?.cursor?.firstBatch?.[0]
            if (rawDoc?.managerPin && managerPin === '1234') {
                managerPin = String(rawDoc.managerPin).trim()
            }
        } catch {
            // ignore
        }

        const gstLegalName = rawDoc?.gstLegalName || null
        const gstTradeName = rawDoc?.gstTradeName || null
        const gstAddress = rawDoc?.gstAddress || null
        const gstState = rawDoc?.gstState || null

        return NextResponse.json({ 
            success: true, 
            data: { 
                ...safeSettings, 
                managerPin,
                gstLegalName,
                gstTradeName,
                gstAddress,
                gstState
            } 
        })
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
            gstPercent, serviceChargePercent, luxuryTaxPercent, gstNumber,
            gstLegalName, gstTradeName, gstAddress, gstState,
            // Discount & POS Auth
            defaultDiscountPercent, discountLabel, managerPin,
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

        let propertyId = bodyPropertyId && bodyPropertyId !== 'ALL'
            ? bodyPropertyId
            : session.user.propertyId

        if (!propertyId || propertyId === 'ALL') {
            const dbUser = await prisma.user.findUnique({
                where: { id: session.user.id },
                select: { workplaceId: true, ownedPropertyIds: true }
            })
            propertyId = dbUser?.workplaceId || dbUser?.ownedPropertyIds?.[0] || null
            if (!propertyId) {
                const firstProp = await prisma.property.findFirst({
                    where: session.user.role === 'SUPER_ADMIN' ? undefined : { ownerIds: { has: session.user.id } }
                })
                if (firstProp) propertyId = firstProp.id
            }
        }

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

        // Validate Hotel GSTIN if provided
        if (gstNumber && gstNumber.trim().length > 0) {
            const gstValidation = validateGSTIN(gstNumber)
            if (!gstValidation.isValid) {
                return badRequest(`Hotel GSTIN Error: ${gstValidation.message}`)
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
        setIfDefined('gstNumber', gstNumber ? gstNumber.trim().toUpperCase() : gstNumber)
        setIfDefined('defaultDiscountPercent', defaultDiscountPercent !== undefined ? parseFloat(defaultDiscountPercent) : undefined)
        setIfDefined('discountLabel', discountLabel)
        setIfDefined('managerPin', managerPin !== undefined ? String(managerPin).trim() : undefined)
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

        // Ensure managerPin and GST details are directly persisted to raw document in MongoDB
        const rawFieldsToUpdate: any = {}
        if (managerPin !== undefined) rawFieldsToUpdate.managerPin = String(managerPin).trim()
        if (gstLegalName !== undefined) rawFieldsToUpdate.gstLegalName = gstLegalName ? String(gstLegalName).trim() : null
        if (gstTradeName !== undefined) rawFieldsToUpdate.gstTradeName = gstTradeName ? String(gstTradeName).trim() : null
        if (gstAddress !== undefined) rawFieldsToUpdate.gstAddress = gstAddress ? String(gstAddress).trim() : null
        if (gstState !== undefined) rawFieldsToUpdate.gstState = gstState ? String(gstState).trim() : null

        if (Object.keys(rawFieldsToUpdate).length > 0) {
            try {
                const updateQuery = settings?.id 
                    ? { _id: { $oid: settings.id } } 
                    : { propertyId: { $oid: propertyId } }
                await prisma.$runCommandRaw({
                    update: 'property_settings',
                    updates: [
                        {
                            q: updateQuery,
                            u: { $set: rawFieldsToUpdate },
                            upsert: true
                        }
                    ]
                })
            } catch (rawErr) {
                console.error('Error updating raw property settings fields:', rawErr)
            }
        }

        // Also update Property.address if gstAddress is provided
        if (gstAddress) {
            try {
                await prisma.property.update({
                    where: { id: propertyId },
                    data: { address: String(gstAddress).trim() }
                }).catch(() => {})
            } catch {
                // ignore
            }
        }

        const { razorpayKeySecret: _secret, ...safeSettings } = settings
        return NextResponse.json({ 
            success: true, 
            data: { 
                ...safeSettings, 
                managerPin: managerPin !== undefined ? String(managerPin).trim() : undefined,
                gstLegalName: gstLegalName !== undefined ? gstLegalName : undefined,
                gstTradeName: gstTradeName !== undefined ? gstTradeName : undefined,
                gstAddress: gstAddress !== undefined ? gstAddress : undefined,
                gstState: gstState !== undefined ? gstState : undefined,
            } 
        })
    } catch (error) {
        return serverError(error, 'FINANCIAL_SETTINGS_POST')
    }
}
