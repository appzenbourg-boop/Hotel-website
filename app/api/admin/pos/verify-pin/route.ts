import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/pos/verify-pin
 * Verifies if entered PIN matches the hotel property's configured Manager PIN
 */
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ valid: false, error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { pin, propertyId: reqPropertyId } = body

        const propertyId = reqPropertyId || session.user.propertyId
        if (!propertyId || propertyId === 'ALL') {
            // Fallback default
            if (pin === '1234') return NextResponse.json({ valid: true })
            return NextResponse.json({ valid: false, error: 'Invalid Manager PIN' }, { status: 400 })
        }

        const settings = await (prisma as any).propertySettings.findUnique({
            where: { propertyId },
            select: { managerPin: true }
        })

        const configuredPin = settings?.managerPin?.trim() || '1234'

        if (String(pin).trim() === configuredPin) {
            return NextResponse.json({ valid: true })
        }

        return NextResponse.json({ valid: false, error: 'Invalid Authorization Key (PIN)' }, { status: 400 })
    } catch (error: any) {
        return NextResponse.json({ valid: false, error: 'Failed to verify PIN' }, { status: 500 })
    }
}

/**
 * GET /api/admin/pos/verify-pin?propertyId=...
 * For Admins & Managers to retrieve current PIN value
 */
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const propertyId = searchParams.get('propertyId') || session.user.propertyId

        if (!propertyId || propertyId === 'ALL') {
            return NextResponse.json({ success: true, pin: '1234' })
        }

        const settings = await (prisma as any).propertySettings.findUnique({
            where: { propertyId },
            select: { managerPin: true }
        })

        return NextResponse.json({ success: true, pin: settings?.managerPin?.trim() || '1234' })
    } catch {
        return NextResponse.json({ success: true, pin: '1234' })
    }
}
