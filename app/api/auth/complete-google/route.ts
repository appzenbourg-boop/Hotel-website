import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth/middleware'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
    try {
        const authResult = await requireAuth(req, ['HOTEL_ADMIN', 'SUPER_ADMIN'])
        if (authResult instanceof NextResponse) return authResult
        const { user } = authResult

        const body = await req.json()
        const { hotelName, hotelAddress, latitude, longitude, upiId } = body

        if (!hotelName) {
            return NextResponse.json({ error: 'Hotel name is required' }, { status: 400 })
        }

        const targetPropertyId = user.propertyId
        if (!targetPropertyId) {
            return NextResponse.json({ error: 'No property attached to this account' }, { status: 400 })
        }

        // Update Property
        await prisma.property.update({
            where: { id: targetPropertyId },
            data: {
                name: hotelName,
                address: hotelAddress || 'Address not provided',
                latitude: latitude ?? null,
                longitude: longitude ?? null,
            }
        })

        // Update or create PropertySettings for UPI ID
        if (upiId) {
            await prisma.propertySettings.upsert({
                where: { propertyId: targetPropertyId },
                update: { upiId },
                create: {
                    propertyId: targetPropertyId,
                    upiId,
                    gstPercent: 18.0,
                    serviceChargePercent: 0.0,
                    luxuryTaxPercent: 0.0,
                    defaultDiscountPercent: 0.0,
                    invoicePrefix: 'INV',
                    currency: 'INR',
                    currencySymbol: '₹',
                    checkInTime: '14:00',
                    checkOutTime: '11:00',
                }
            })
        }

        return NextResponse.json({ success: true, propertyId: targetPropertyId, user })
    } catch (error: any) {
        console.error('[COMPLETE_GOOGLE_ERROR]', error)
        return NextResponse.json({ error: error.message || 'Internal Error' }, { status: 500 })
    }
}
