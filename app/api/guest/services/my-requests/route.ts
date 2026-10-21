import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const guestId = searchParams.get('guestId')
        
        if (!guestId) {
            return NextResponse.json([], { status: 200 })
        }

        const requests = await prisma.serviceRequest.findMany({
            where: { guestId },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json(requests)
    } catch (error) {
        console.error(error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}
