import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth/middleware'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/infrastructure/simulate
 * Simulates system events and maps them to staff/admin alerts
 */
export async function POST(req: NextRequest) {
    try {
        const authResult = await requireAuth(req, ['SUPER_ADMIN', 'HOTEL_ADMIN', 'MANAGER'])
        if (authResult instanceof NextResponse) return authResult

        const session = await getServerSession(authOptions)
        const body = await req.json()
        const { type, propertyId: bodyPropertyId } = body // e.g., 'IOT_FAILURE', 'SYSTEM_DIAGNOSTIC', 'VIP_ARRIVAL'

        let propertyId = session?.user?.propertyId
        if (session?.user?.role === 'SUPER_ADMIN' && bodyPropertyId) {
            propertyId = bodyPropertyId
        }

        if (!propertyId) {
            return NextResponse.json({ error: 'Property context required' }, { status: 400 })
        }

        let alertData: any = null

        if (type === 'IOT_FAILURE') {
            alertData = {
                message: 'Critical: Room 305 Door Lock Offline',
                description: 'IoT Hub reported loss of signal for BLE Door Lock 305. Low battery suspected.',
                type: 'CRITICAL',
                category: 'IoT'
            }
        } else if (type === 'VIP_ARRIVAL') {
             alertData = {
                message: 'VIP Check-in Alert',
                description: 'Titanium Level Guest "Mr. Alexander" is within 1km. Priority valet required.',
                type: 'INFO',
                category: 'Check-in'
            }
        } else {
             alertData = {
                message: 'System Integrity Check',
                description: 'Automated diagnostic complete. All 14 POS nodes syncing correctly.',
                type: 'INFO',
                category: 'System'
            }
        }

        // 1. Create System Alert (for Admin View)
        const alert = await (prisma as any).systemAlert.create({
            data: {
                ...alertData,
                propertyId,
                timestamp: new Date()
            }
        })

        // 2. Map to In-App Notifications for relevant staff roles
        // For simulation, we'll notify all staff in the property or target department
        const staffUsers = await prisma.user.findMany({
            where: {
                OR: [
                    { role: 'STAFF' },
                    { role: 'MANAGER' },
                    { role: 'HOTEL_ADMIN' }
                ],
                workplaceId: propertyId
            },
            select: { id: true }
        })

        if (staffUsers.length > 0) {
            await prisma.inAppNotification.createMany({
                data: staffUsers.map(u => ({
                    userId: u.id,
                    title: alertData.message,
                    description: alertData.description,
                    type: alertData.type === 'CRITICAL' ? 'ALERT' : 'SYSTEM',
                    isRead: false
                }))
            })
        }

        return NextResponse.json({
            success: true,
            alert,
            notificationsSent: staffUsers.length
        })

    } catch (error: any) {
        console.error('[INFRA_SIMULATE_POST_ERROR]', error)
        return NextResponse.json({ error: 'Internal Error', details: error.message }, { status: 500 })
    }
}
