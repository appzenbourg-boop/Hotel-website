import { prisma } from '@/lib/db'
import { redis } from '@/lib/redis'

// Type to Department mapping for service auto-assignment
const typeToDeptMap: Record<string, string> = {
    HOUSEKEEPING: 'HOUSEKEEPING',
    MAINTENANCE: 'MAINTENANCE',
    ROOM_SERVICE: 'KITCHEN',
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

    // 2. Fetch only ON-DUTY STAFF for this property
    const staffList = await prisma.staff.findMany({
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

    if (staffList.length === 0) {
        return { assignedCount: 0, totalProcessed: requests.length, assignments: [] }
    }

    let assignedCount = 0
    const assignments: any[] = []

    const updatePromises = requests.map(async (request) => {
        try {
            const targetDept = typeToDeptMap[request.type] || 'FRONT_DESK'
            const availableStaff = staffList.filter(s => s.department === targetDept)

            if (availableStaff.length > 0) {
                const staff = availableStaff[Math.floor(Math.random() * availableStaff.length)]
                
                await prisma.serviceRequest.update({
                    where: { id: request.id },
                    data: {
                        assignedToId: staff.id,
                        status: 'ACCEPTED',
                    }
                })

                // Invalidate staff dashboard cache
                if (staff.user?.id) {
                    await redis.del(`staff_me:${staff.user.id}`)
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
