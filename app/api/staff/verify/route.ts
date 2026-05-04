import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) return new NextResponse('Unauthorized', { status: 401 })

        const body = await req.json().catch(() => ({}))
        const { idProofImage, idType, idNumber } = body

        const staff = await prisma.staff.findUnique({
            where: { userId: session.user.id },
            include: { user: { select: { name: true } }, property: { select: { ownerIds: true } } }
        })

        if (!staff) return new NextResponse('Staff Profile Not Found', { status: 404 })

        // Build documents object — merge with existing
        const existingDocs = (staff.documents as Record<string, any>) ?? {}
        const updatedDocs = {
            ...existingDocs,
            ...(idProofImage ? { idProofImage } : {}),
            ...(idType ? { idType } : {}),
            ...(idNumber ? { idNumber } : {}),
        }

        await prisma.staff.update({
            where: { id: staff.id },
            data: {
                verificationRequested: true,
                documents: updatedDocs,
            }
        })

        // Notify property owners
        if (staff.property?.ownerIds?.length) {
            await prisma.inAppNotification.createMany({
                data: staff.property.ownerIds.map(ownerId => ({
                    userId: ownerId,
                    title: 'ID Verification Request',
                    description: `${staff.user?.name ?? 'Staff'} has submitted their ID for verification.`,
                    type: 'INFO',
                    isRead: false,
                })),
            }).catch(() => {}) // non-critical
        }

        return NextResponse.json({ success: true, message: 'Verification request sent' })

    } catch (error) {
        console.error('Verification POST API Error:', error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}
