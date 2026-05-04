import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth/middleware'
import { UserRole } from '@/prisma/generated/client'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/settings/roles
 * Fetch roles and permissions for a property
 */
export async function GET(req: NextRequest) {
    try {
        const authResult = await requireAuth(req, ['SUPER_ADMIN', 'HOTEL_ADMIN'])
        if (authResult instanceof NextResponse) return authResult

        const { searchParams } = new URL(req.url)
        const propertyId = searchParams.get('propertyId') || authResult.user.propertyId

        if (!propertyId || propertyId === 'ALL') {
            return NextResponse.json({ success: true, rolePermissions: [] })
        }

        const rolePermissions = await prisma.rolePermission.findMany({
            where: { propertyId }
        })

        return NextResponse.json({ success: true, rolePermissions })

    } catch (error: any) {
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
    }
}

/**
 * POST /api/admin/settings/roles
 * Update permissions for a role
 */
export async function POST(req: NextRequest) {
    try {
        const authResult = await requireAuth(req, ['SUPER_ADMIN', 'HOTEL_ADMIN'])
        if (authResult instanceof NextResponse) return authResult

        const body = await req.json()
        const { propertyId, role, permissions } = body

        if (!propertyId || !role || !permissions) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Verify propertyId is authorized for the user
        if (authResult.user.role !== 'SUPER_ADMIN' && authResult.user.propertyId !== propertyId) {
            return NextResponse.json({ error: 'Unauthorized to manage roles for this property' }, { status: 403 })
        }

        const updated = await prisma.rolePermission.upsert({
            where: {
                propertyId_role: {
                    propertyId,
                    role: role as UserRole
                }
            },
            update: { permissions },
            create: {
                propertyId,
                role: role as UserRole,
                permissions
            }
        })

        return NextResponse.json({ success: true, rolePermission: updated })

    } catch (error: any) {
        console.error('[ROLES_UPDATE_ERROR]', error)
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
    }
}
