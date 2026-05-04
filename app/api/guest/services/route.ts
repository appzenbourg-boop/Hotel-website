import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { performAutoAssignment } from '@/lib/service-utils'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { category, item, description, priority } = body

        // In real app, we get guestId from session or token
        // For MVP demo, we attach to first guest found or just log
        const guest = await prisma.guest.findFirst()
        const guestId = guest?.id

        const property = await prisma.property.findFirst()
        if (!property) return new NextResponse('No property found', { status: 404 })

        await prisma.serviceRequest.create({
            data: {
                title: item || 'Service Request',
                description,
                type: 'ROOM_SERVICE', // Default for now
                priority: (priority as any) || 'NORMAL',
                guestId: guestId as string,
                propertyId: property.id,
                status: 'PENDING',
                assignedToId: null
            }
        })
        
        // Auto-assign immediately
        await performAutoAssignment(property.id, 0)

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error(error)
        return new NextResponse('Error', { status: 500 })
    }
}
