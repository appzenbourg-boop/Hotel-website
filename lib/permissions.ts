import { prisma } from '@/lib/db'

export type PermissionLevel = 'NONE' | 'READ' | 'READ_WRITE'

type UserRoleType = 'SUPER_ADMIN' | 'HOTEL_ADMIN' | 'MANAGER' | 'RECEPTIONIST' | 'STAFF' | 'GUEST'

export async function getPermissions(propertyId: string, role: UserRoleType) {
    if (role === 'SUPER_ADMIN' || role === 'HOTEL_ADMIN') {
        // Admins have full access by default
        return null
    }

    const rolePerm = await prisma.rolePermission.findUnique({
        where: {
            propertyId_role: { propertyId, role }
        }
    })

    return (rolePerm?.permissions as Record<string, PermissionLevel>) || {}
}

/**
 * Server-side check for permissions
 */
export async function checkPermission(
    propertyId: string,
    role: UserRoleType,
    module: string,
    required: PermissionLevel = 'READ'
): Promise<boolean> {
    if (role === 'SUPER_ADMIN' || role === 'HOTEL_ADMIN') return true

    const perms = await getPermissions(propertyId, role)
    if (!perms) return true

    const level = perms[module] || 'NONE'

    if (required === 'READ_WRITE') {
        return level === 'READ_WRITE'
    }

    if (required === 'READ') {
        return level === 'READ' || level === 'READ_WRITE'
    }

    return false
}
