import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { redis } from '@/lib/redis'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    const session = await getServerSession(authOptions)
    const allowedRoles = ['STAFF', 'MANAGER', 'RECEPTIONIST', 'HOTEL_ADMIN', 'SUPER_ADMIN']
    if (!session || !allowedRoles.includes(session.user.role)) {
        return new NextResponse('Unauthorized', { status: 401 })
    }

    const cacheKey = `staff_me:${session.user.id}`
    const cached = await redis.get(cacheKey)
    if (cached) {
        return NextResponse.json({ ...cached, fromCache: true })
    }

    try {
        // 1. Get Staff Profile
        // 1. Get Staff Profile - for managers/admins, just get their user data if no staff profile exists
        let staff = await prisma.staff.findUnique({
            where: { userId: session.user.id },
            include: { user: true }
        })

        if (!staff && ['MANAGER', 'HOTEL_ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
            // Create a temporary mock staff object for managers/admins to view the portal
            staff = {
                id: 'admin-view',
                userId: session.user.id,
                department: 'MANAGEMENT',
                designation: session.user.role,
                employeeId: 'ADMIN',
                status: 'ACTIVE',
                user: {
                    name: session.user.name,
                    email: session.user.email
                }
            } as any
        }

        if (!staff) {
            return new NextResponse('Staff Profile Not Found', { status: 404 })
        }

        // Fetch all related data in parallel
        const [attendance, tasks, unreadNotifications, unreadMessages, systemAlerts, performanceScore] = await Promise.all([
            // 2. Today's Attendance
            prisma.attendance.findFirst({
                where: {
                    staffId: staff.id
                },
                orderBy: { punchIn: 'desc' }
            }),
            // 3. Assigned Tasks
            staff.id === 'admin-view' 
                ? Promise.resolve([]) 
                : prisma.serviceRequest.findMany({
                    where: {
                        assignedToId: staff.id,
                        status: { in: ['PENDING', 'ACCEPTED', 'IN_PROGRESS'] }
                    },
                    include: { room: true },
                    orderBy: { priority: 'desc' }
                }),
            // 4. Unread Counts
            prisma.inAppNotification.count({
                where: { userId: session.user.id, isRead: false }
            }),
            prisma.message.count({
                where: { receiverId: session.user.id, isRead: false }
            }),
            // 5. Recent System Alerts
            prisma.systemAlert.findMany({
                where: { propertyId: staff.propertyId },
                orderBy: { timestamp: 'desc' },
                take: 3
            }),
            // 6. Latest Performance
            prisma.performanceScore.findFirst({
                where: { staffId: staff.id },
                orderBy: { createdAt: 'desc' }
            })
        ])

        const responseData = {
            profile: staff,
            attendance,
            tasks,
            systemAlerts,
            performanceScore,
            unreadCounts: {
                notifications: unreadNotifications,
                messages: unreadMessages
            }
        }

        // Cache for 1 minute
        await redis.set(cacheKey, responseData, { ex: 60 })

        return NextResponse.json(responseData)

    } catch (error) {
        console.error("Staff Me API Error:", error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}

export async function PATCH(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse('Unauthorized', { status: 401 })

    try {
        const body = await request.json()
        const { currentPassword, newPassword, phone, address, emergencyContactName, emergencyContactPhone, profilePhoto } = body

        // ── Password change ──────────────────────────────────────────────────
        if (currentPassword && newPassword) {
            const user = await prisma.user.findUnique({
                where: { id: session.user.id },
                select: { password: true },
            })
            if (!user?.password) {
                return NextResponse.json({ error: 'No password set on this account' }, { status: 400 })
            }
            const valid = await bcrypt.compare(currentPassword, user.password)
            if (!valid) {
                return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
            }
            if (newPassword.length < 8) {
                return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 })
            }
            const hashed = await bcrypt.hash(newPassword, 12)
            await prisma.user.update({
                where: { id: session.user.id },
                data: { password: hashed },
            })
            return NextResponse.json({ success: true, message: 'Password updated' })
        }

        // ── Profile update ───────────────────────────────────────────────────
        // Update phone on User model
        if (phone !== undefined && phone.trim()) {
            try {
                await prisma.user.update({
                    where: { id: session.user.id },
                    data: { phone: phone.trim() },
                })
            } catch (phoneErr: any) {
                if (phoneErr?.code === 'P2002') {
                    return NextResponse.json({ error: 'Phone number already in use' }, { status: 400 })
                }
                throw phoneErr
            }
        }

        // Update address / emergency contact / profile photo on Staff model
        const staffUpdates: Record<string, string> = {}
        if (address !== undefined) staffUpdates.address = address
        if (emergencyContactName !== undefined) staffUpdates.emergencyContactName = emergencyContactName
        if (emergencyContactPhone !== undefined) staffUpdates.emergencyContactPhone = emergencyContactPhone
        if (profilePhoto !== undefined) staffUpdates.profilePhoto = profilePhoto

        if (Object.keys(staffUpdates).length > 0) {
            const staff = await prisma.staff.findUnique({
                where: { userId: session.user.id },
                select: { id: true },
            })
            if (staff) {
                await prisma.staff.update({
                    where: { id: staff.id },
                    data: staffUpdates,
                })
            }
        }

        // Invalidate Cache
        await redis.del(`staff_me:${session.user.id}`)

        return NextResponse.json({ success: true, message: 'Profile updated' })
    } catch (error) {
        console.error('Staff PATCH error:', error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}
