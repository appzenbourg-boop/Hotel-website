import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session || !['SUPER_ADMIN', 'HOTEL_ADMIN', 'MANAGER'].includes(session.user.role)) {
        return new NextResponse('Unauthorized', { status: 401 })
    }

    try {
        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status')
        const qPropertyId = searchParams.get('propertyId')

        // Resolve property scope — HOTEL_ADMIN/MANAGER always scoped to their property
        let propertyFilter: any = {}
        if (session.user.role === 'SUPER_ADMIN') {
            if (qPropertyId && qPropertyId !== 'ALL') {
                propertyFilter = { staff: { propertyId: qPropertyId } }
            }
            // else: global view — no filter
        } else {
            const propertyId = session.user.propertyId
            if (!propertyId) return new NextResponse('No property associated', { status: 400 })
            propertyFilter = { staff: { propertyId } }
        }

        const requests = await prisma.leaveRequest.findMany({
            where: {
                ...propertyFilter,
                ...(status && status !== 'ALL' ? { status: status as any } : {}),
            },
            include: {
                staff: {
                    include: {
                        user: { select: { name: true, email: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json(requests)
    } catch (error) {
        console.error('Admin Leaves GET Error:', error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}

export async function PATCH(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session || !['SUPER_ADMIN', 'HOTEL_ADMIN', 'MANAGER'].includes(session.user.role)) {
        return new NextResponse('Unauthorized', { status: 401 })
    }

    try {
        const body = await request.json()
        const { requestId, status, rejectionReason } = body

        if (!requestId || !status) return new NextResponse('Missing Data', { status: 400 })

        const updated = await prisma.leaveRequest.update({
            where: { id: requestId },
            data: {
                status: status as any,
                rejectionReason: rejectionReason || null
            },
            include: {
                staff: {
                    select: { userId: true }
                }
            }
        })

        // 1. Create In-App Notification for staff
        await prisma.inAppNotification.create({
            data: {
                userId: updated.staff.userId,
                title: `Leave Request ${status === 'APPROVED' ? 'Approved' : 'Rejected'}`,
                description: status === 'APPROVED' 
                    ? `Your leave request has been approved. Enjoy your time off!` 
                    : `Your leave request was rejected. ${rejectionReason ? 'Reason: ' + rejectionReason : ''}`,
                type: 'SYSTEM',
                isRead: false
            }
        })

        return NextResponse.json(updated)
    } catch (error) {
        console.error("Admin Leaves PATCH Error:", error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}
