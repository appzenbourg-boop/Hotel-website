import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const room = await prisma.room.findUnique({
            where: { id: params.id },
            include: {
                property: true,
                bookings: {
                    where: {
                        status: { in: ['RESERVED', 'CHECKED_IN'] }
                    },
                    select: {
                        checkIn: true,
                        checkOut: true
                    }
                }
            }
        })

        if (!room) {
            return NextResponse.json({ success: false, error: 'Room not found' }, { status: 404 })
        }

        // Fetch dynamic pricing/tax settings for the property
        let settings = null
        try {
            settings = await (prisma as any).propertySettings.findUnique({
                where: { propertyId: room.propertyId }
            })
        } catch (err) {
            console.log("[RoomsAPI] Could not fetch property settings:", err)
        }

        const responseRoom = {
            ...room,
            property: room.property ? {
                ...room.property,
                settings: settings || {
                    gstPercent: 18.0,
                    serviceChargePercent: 0.0,
                    luxuryTaxPercent: 0.0,
                    defaultDiscountPercent: 0.0
                }
            } : null
        }

        return NextResponse.json({ success: true, room: responseRoom })
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
    }
}
