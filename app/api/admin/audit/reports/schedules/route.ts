import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const propertyId = (session.user as any).propertyId
        if (!propertyId) {
            return NextResponse.json({ error: 'No property ID found' }, { status: 400 })
        }

        const { schedule } = await req.json()
        if (!schedule) {
            return NextResponse.json({ error: 'Missing required schedule payload' }, { status: 400 })
        }

        const property = await prisma.property.findUnique({
            where: { id: propertyId },
            select: { policies: true }
        })

        const policies = (property?.policies as any) || {}
        const auditSchedules = policies.auditSchedules || [
            { title: 'Monthly Closing Reconciliation', nextRun: 'Oct 31, 23:59', recipient: 'Board', status: 'Active', progress: 85 },
            { title: 'OTA Commission Integrity', nextRun: 'Nov 01, 08:00', recipient: 'Regional Manager', status: 'Pending', progress: 0 },
            { title: 'Nightly Void Exceptions', nextRun: 'Oct 25, 03:00', recipient: 'Audit Team', status: 'Delayed', progress: 0 }
        ]

        auditSchedules.push(schedule)
        policies.auditSchedules = auditSchedules

        await prisma.property.update({
            where: { id: propertyId },
            data: { policies: policies as any }
        })

        return NextResponse.json({ success: true, schedules: auditSchedules })
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
