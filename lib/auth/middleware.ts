import { NextRequest, NextResponse } from 'next/server'
import { verify } from 'jsonwebtoken'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from './options'

// Fail fast if secret is missing in production
if (process.env.NODE_ENV === 'production' && !process.env.NEXTAUTH_SECRET) {
    throw new Error('NEXTAUTH_SECRET environment variable is required in production')
}

const JWT_SECRET = process.env.NEXTAUTH_SECRET!

export interface AuthUser {
    id: string
    email: string
    role: string
    propertyId?: string | null
    department?: string | null
}

/**
 * Verify JWT Bearer token and return user info.
 * Used as fallback for mobile app requests.
 */
export async function verifyAuth(req: NextRequest): Promise<AuthUser | null> {
    try {
        const authHeader = req.headers.get('authorization')
        if (!authHeader?.startsWith('Bearer ')) return null

        const token = authHeader.substring(7)
        const decoded = verify(token, JWT_SECRET) as AuthUser

        // Verify user still exists and is active
        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: { id: true, role: true, status: true, workplaceId: true }
        })

        if (!user || user.status !== 'ACTIVE') return null

        return {
            id: decoded.id,
            email: decoded.email,
            role: user.role,
            propertyId: user.workplaceId,
            department: null,
        }
    } catch {
        return null
    }
}

/**
 * Check if user has one of the required roles.
 */
export function hasRole(userRole: string, allowedRoles: string[]): boolean {
    return allowedRoles.includes(userRole)
}

/**
 * Require authentication. Supports both NextAuth session (web) and JWT header (mobile).
 * Returns { user } on success or a NextResponse error on failure.
 */
export async function requireAuth(
    req: NextRequest,
    allowedRoles?: string[]
): Promise<{ user: AuthUser } | NextResponse> {

    // 1. Try NextAuth session (web/admin)
    const session = await getServerSession(authOptions)
    if (session?.user) {
        const user: AuthUser = {
            id: session.user.id,
            email: session.user.email ?? '',
            role: session.user.role,
            propertyId: session.user.propertyId ?? null,
            department: session.user.department ?? null,
        }

        if (allowedRoles && !hasRole(user.role, allowedRoles)) {
            return NextResponse.json(
                { error: 'Forbidden. Insufficient permissions.' },
                { status: 403 }
            )
        }
        return { user }
    }

    // 2. Fallback to JWT Bearer header (mobile app)
    const user = await verifyAuth(req)
    if (!user) {
        return NextResponse.json(
            { error: 'Unauthorized. Please login.' },
            { status: 401 }
        )
    }

    if (allowedRoles && !hasRole(user.role, allowedRoles)) {
        return NextResponse.json(
            { error: 'Forbidden. Insufficient permissions.' },
            { status: 403 }
        )
    }

    return { user }
}

/**
 * Helper: get auth user or null (does not return error response).
 */
export async function getAuthUser(
    req: NextRequest,
    allowedRoles?: string[]
): Promise<AuthUser | null> {
    const result = await requireAuth(req, allowedRoles)
    if (result instanceof NextResponse) return null
    return result.user
}
