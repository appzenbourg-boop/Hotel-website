import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'

export async function PATCH(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { exceptionId, resolutionNotes } = await req.json()

        if (!exceptionId) {
            return NextResponse.json({ error: "Missing exceptionId" }, { status: 400 })
        }

        const exception = await prisma.auditException.findUnique({
            where: { id: exceptionId }
        })

        if (!exception) {
            return NextResponse.json({ error: "Exception not found" }, { status: 404 })
        }

        const updated = await prisma.auditException.update({
            where: { id: exceptionId },
            data: {
                status: 'RESOLVED',
                resolvedById: session.user.id,
                resolutionNotes: resolutionNotes || "Resolved by auditor"
            }
        })

        return NextResponse.json({ message: "Discrepancy resolved successfully", exception: updated })

    } catch (error) {
        console.error('Failed to resolve discrepancy:', error)
        return NextResponse.json({ error: "Failed to resolve discrepancy" }, { status: 500 })
    }
}
