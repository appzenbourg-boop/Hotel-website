import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const propertyId = searchParams.get('propertyId')
        if (!propertyId || propertyId === 'ALL') {
            return NextResponse.json({ policies: {}, cancellationPolicy: '' })
        }

        const property = await prisma.property.findUnique({
            where: { id: propertyId },
            select: { policies: true, cancellationPolicy: true }
        })
        return NextResponse.json({
            policies: property?.policies || {},
            cancellationPolicy: property?.cancellationPolicy || ''
        })
    } catch (error) {
        return new NextResponse('Error', { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || session.user.role === 'GUEST') return new NextResponse('Unauthorized', { status: 401 })

        const body = await req.json()
        const { propertyId, policies, cancellationPolicy } = body

        if (!propertyId) return new NextResponse('Property ID required', { status: 400 })

        await prisma.property.update({
            where: { id: propertyId },
            data: {
                policies,
                cancellationPolicy
            }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        return new NextResponse('Error', { status: 500 })
    }
}
