import { prisma } from './db'
import { redis } from './redis'

export const typeToDeptMap: Record<string, string> = {
    'HOUSEKEEPING': 'HOUSEKEEPING',
    'LAUNDRY': 'LAUNDRY',
    'FOOD_ORDER': 'KITCHEN',
    'ROOM_SERVICE': 'ROOM_SERVICE',
    'MAINTENANCE': 'MAINTENANCE',
    'CONCIERGE': 'FRONT_DESK',
    'SPA': 'SPA'
}

/**
 * Automatically assign unassigned service requests to staff based on domain/department.
 * If minAgeSeconds is provided, only requests older than that will be processed.
 */
export async function performAutoAssignment(propertyId: string, minAgeSeconds?: number) {
    if (!propertyId || propertyId === 'ALL') return { assignedCount: 0, totalProcessed: 0, assignments: [] }

    // 1. Fetch unassigned service requests
    const allPending = await prisma.serviceRequest.findMany({
        where: {
            status: 'PENDING',
            assignedToId: null
        }
    })

    console.log(`[AUTO-ASSIGN] TARGET: Prop(${propertyId})`)
    
    // Filter by propertyId and age in memory to be safe from ObjectId/String matching issues
    const requests = allPending.filter(r => {
        const rProp = r.propertyId?.toString()
        const targetProp = propertyId?.toString()
        const matchesProperty = rProp === targetProp
        
        console.log(`[AUTO-ASSIGN] Checking request "${r.title}": Prop(${rProp}) vs Target(${targetProp}) -> MATCH: ${matchesProperty}`)
        
        if (!matchesProperty) return false
        
        if (minAgeSeconds) {
            const threshold = new Date(Date.now() - minAgeSeconds * 1000)
            return new Date(r.createdAt) <= threshold
        }
        return true
    })

    console.log(`[AUTO-ASSIGN] Matched ${requests.length} requests for this property`)

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
    
    console.log(`[AUTO-ASSIGN] Total On-Duty Staff Found: ${staffList.length}`)
    staffList.forEach(s => console.log(` - ${s.user?.name || 'Staff'}: ${s.department}`))

    let assignedCount = 0
    const assignments: any[] = []

    const updatePromises = requests.map(async (request) => {
        try {
            const targetDept = typeToDeptMap[request.type]
            const availableStaff = staffList.filter(s => s.department === targetDept)
            
            console.log(`[AUTO-ASSIGN] Evaluating "${request.title}" (${request.type} -> ${targetDept}). Matching staff: ${availableStaff.length}`)

            if (availableStaff.length > 0) {
                // To prevent assigning everything to the same person, we could do more complex logic, 
                // but random selection is a good start.
                const staff = availableStaff[Math.floor(Math.random() * availableStaff.length)]
                
                console.log(`[AUTO-ASSIGN] Attempting: Assigning "${request.title}" to ${staff.user?.name} (${staff.id})`)
                
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
                    assignedTo: staff.user?.name || 'Unknown'
                })
                console.log(`[AUTO-ASSIGN] DONE: Assigned "${request.title}" successfully`)
                return true
            } else {
                console.log(`[AUTO-ASSIGN] SKIP: No staff in ${targetDept} for "${request.title}"`)
            }
        } catch (err: any) {
            console.error(`[AUTO-ASSIGN] FAILED for "${request.title}":`, err.message)
        }
        return false
    })

    await Promise.all(updatePromises)

    return {
        assignedCount,
        totalProcessed: requests.length,
        assignments
    }
}
