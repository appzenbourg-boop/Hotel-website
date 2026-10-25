import { prisma } from '@/lib/db'
import { redis } from '@/lib/redis'

// Type to Department mapping for service auto-assignment
const typeToDeptMap: Record<string, string> = {
    HOUSEKEEPING: 'HOUSEKEEPING',
    MAINTENANCE: 'MAINTENANCE',
    ROOM_SERVICE: 'ROOM_SERVICE',
    FOOD_ORDER: 'KITCHEN',
    RECEPTION: 'FRONT_DESK',
    OTHER: 'FRONT_DESK'
}

/**
 * Automatically assigns unassigned pending service requests to available on-duty staff.
 * @param propertyId The target property ID
 * @param minAgeSeconds Optional minimum age threshold in seconds (e.g. 5 seconds to give staff time to claim)
 */
export async function performAutoAssignment(propertyId: string, minAgeSeconds?: number) {
    return autoAssignRequests(propertyId, minAgeSeconds)
}

export async function autoAssignRequests(propertyId: string, minAgeSeconds?: number) {
    if (!propertyId) return { assignedCount: 0, totalProcessed: 0, assignments: [] }

    // 1. Fetch unassigned pending service requests for target property
    const allPending = await prisma.serviceRequest.findMany({
        where: {
            propertyId,
            status: 'PENDING',
            assignedToId: null
        }
    })

    const requests = allPending.filter(r => {
        if (minAgeSeconds) {
            const threshold = new Date(Date.now() - minAgeSeconds * 1000)
            return new Date(r.createdAt) <= threshold
        }
        return true
    })

    if (requests.length === 0) {
        return { assignedCount: 0, totalProcessed: 0, assignments: [] }
    }

    // 2. Fetch ON-DUTY STAFF for this property (clocked in)
    let staffList = await prisma.staff.findMany({
        where: { 
            propertyId,
            attendances: {
                some: {
                    punchOut: null
                }
            }
        },
        include: { user: { select: { name: true, id: true } } }
    })

    // Fallback: If no staff is currently clocked in, fetch all ACTIVE staff at the property
    if (staffList.length === 0) {
        staffList = await prisma.staff.findMany({
            where: {
                propertyId,
                user: { status: 'ACTIVE' }
            },
            include: { user: { select: { name: true, id: true } } }
        })
    }

    if (staffList.length === 0) {
        console.warn(`[AUTO-ASSIGN] No active or on-duty staff found for property ${propertyId}`)
        return { assignedCount: 0, totalProcessed: requests.length, assignments: [] }
    }

    let assignedCount = 0
    const assignments: any[] = []

    const updatePromises = requests.map(async (request) => {
        try {
            const targetDept = typeToDeptMap[request.type] || 'FRONT_DESK'
            let availableStaff = staffList.filter(s => s.department === targetDept)

            // Cross-department fallback for food/kitchen orders
            if (availableStaff.length === 0) {
                if (targetDept === 'KITCHEN') {
                    availableStaff = staffList.filter(s => s.department === 'ROOM_SERVICE' || s.department === 'FRONT_DESK')
                } else if (targetDept === 'ROOM_SERVICE') {
                    availableStaff = staffList.filter(s => s.department === 'KITCHEN' || s.department === 'FRONT_DESK')
                } else {
                    availableStaff = staffList.filter(s => s.department === 'FRONT_DESK' || s.department === 'MANAGEMENT')
                }
            }

            // Ultimate fallback to any staff in the property
            if (availableStaff.length === 0) {
                availableStaff = staffList
            }

            if (availableStaff.length > 0) {
                const staff = availableStaff[Math.floor(Math.random() * availableStaff.length)]
                
                await prisma.serviceRequest.update({
                    where: { id: request.id },
                    data: {
                        assignedToId: staff.id,
                        status: 'ACCEPTED',
                    }
                })

                // Create an in-app notification for the assigned staff member
                if (staff.user?.id) {
                    await prisma.inAppNotification.create({
                        data: {
                            userId: staff.user.id,
                            title: request.type === 'FOOD_ORDER' || request.type === 'ROOM_SERVICE' 
                                ? 'New Kitchen/Food Order' 
                                : 'New Task Assigned',
                            description: request.title,
                            type: 'TASK',
                            isRead: false
                        }
                    }).catch(() => {})

                    // Invalidate staff dashboard cache in Redis
                    await redis.del(`staff_me:${staff.user.id}`).catch(() => {})
                }

                assignedCount++
                assignments.push({
                    requestId: request.id,
                    requestTitle: request.title,
                    assignedTo: staff.user?.name || 'Staff'
                })
            }
        } catch (err: any) {
            console.error(`[AUTO-ASSIGN FAILED] for "${request.title}":`, err.message)
        }
    })

    await Promise.all(updatePromises)

    if (assignedCount > 0) {
        console.log(`[AUTO-ASSIGN] Successfully assigned ${assignedCount} requests for property ${propertyId}`)
    }

    return {
        assignedCount,
        totalProcessed: requests.length,
        assignments
    }
}
