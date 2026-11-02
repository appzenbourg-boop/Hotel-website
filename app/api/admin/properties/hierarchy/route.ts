import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const userRole = session.user.role
        if (!['SUPER_ADMIN', 'HOTEL_ADMIN', 'MANAGER'].includes(userRole)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        let whereClause: any = {}

        if (userRole !== 'SUPER_ADMIN') {
            const dbUser = await prisma.user.findUnique({
                where: { id: session.user.id },
                select: { workplaceId: true, ownedPropertyIds: true }
            })

            const propertyIds = new Set<string>()
            if (session.user.propertyId) propertyIds.add(session.user.propertyId)
            if (dbUser?.workplaceId) propertyIds.add(dbUser.workplaceId)
            if (Array.isArray(dbUser?.ownedPropertyIds)) {
                dbUser.ownedPropertyIds.forEach(id => {
                    if (id) propertyIds.add(id)
                })
            }

            const idList = Array.from(propertyIds)

            whereClause = {
                OR: [
                    ...(idList.length > 0 ? [{ id: { in: idList } }] : []),
                    { ownerIds: { has: session.user.id } }
                ]
            }
        }

        const properties = await prisma.property.findMany({
            where: whereClause,
            include: {
                owners: {
                    select: { id: true, name: true, email: true, role: true, status: true }
                },
                staff: {
                    include: {
                        user: {
                            select: { id: true, name: true, email: true, role: true, status: true }
                        }
                    }
                },
                _count: {
                    select: { rooms: true, staff: true, bookings: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json(properties || [])
    } catch (error) {
        console.error('Error fetching property hierarchy:', error)
        return NextResponse.json([], { status: 200 })
    }
}
