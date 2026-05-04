import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        // In real app, we get guestId from session
        const guest = await prisma.guest.findFirst()
        if (!guest) {
            return NextResponse.json([], { status: 200 })
        }

        const requests = await prisma.serviceRequest.findMany({
            where: { guestId: guest.id },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json(requests)
    } catch (error) {
        console.error(error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}
