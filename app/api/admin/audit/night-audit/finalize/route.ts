import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const property = await prisma.property.findFirst({
            where: { ownerIds: { has: session.user.id } }
        })

        if (!property) {
            return NextResponse.json({ error: "Property not found" }, { status: 404 })
        }

        const activeAudit = await prisma.auditRun.findFirst({
            where: { propertyId: property.id, status: 'IN_PROGRESS' }
        })

        if (!activeAudit) {
            return NextResponse.json({ error: "No active audit found" }, { status: 404 })
        }

        // Check for pending critical exceptions
        const pendingExceptions = await prisma.auditException.count({
            where: { 
                auditRunId: activeAudit.id, 
                status: 'PENDING',
                severity: 'HIGH' 
            }
        })

        if (pendingExceptions > 0) {
            return NextResponse.json({ 
                error: `Cannot finalize. There are ${pendingExceptions} unresolved HIGH severity exceptions.` 
            }, { status: 400 })
        }

        // Finalize
        await prisma.auditRun.update({
            where: { id: activeAudit.id },
            data: {
                status: 'COMPLETED',
                closedAt: new Date()
            }
        })

        return NextResponse.json({ message: "Audit finalized successfully" })

    } catch (error) {
        console.error('Failed to finalize night audit:', error)
        return NextResponse.json({ error: "Failed to finalize night audit" }, { status: 500 })
    }
}
