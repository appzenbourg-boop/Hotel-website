import { NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
    const token = await getToken({ req })
    const isAuth = !!token
    const { pathname } = req.nextUrl

    const isPublicPage = pathname === '/'
    const isAuthPage =
        pathname.startsWith('/admin/login') ||
        pathname.startsWith('/admin/register') ||
        pathname.startsWith('/admin/forgot-password') ||
        pathname.startsWith('/receptionist/login') ||
        pathname.startsWith('/staff/login')

    // 1. Allow public pages through
    if (isPublicPage) {
        return NextResponse.next()
    }

    const getHomePath = (role: string) => {
        if (role === 'STAFF') return '/staff'
        if (['HOTEL_ADMIN', 'MANAGER', 'SUPER_ADMIN', 'RECEPTIONIST'].includes(role)) return '/admin/dashboard'
        return '/'
    }

    // 2. If logged in, don't allow visiting auth pages
    if (isAuthPage && isAuth) {
        return NextResponse.redirect(new URL(getHomePath(token.role as string), req.url))
    }

    // 3. Unauthenticated users trying to access protected paths
    if (!isAuth && !isAuthPage) {
        const isProtectedPath =
            pathname.startsWith('/admin') ||
            pathname.startsWith('/staff') ||
            pathname.startsWith('/receptionist')

        if (isProtectedPath) {
            let loginPath = '/admin/login'
            if (pathname.startsWith('/staff')) loginPath = '/staff/login'
            return NextResponse.redirect(new URL(loginPath, req.url))
        }
    }

    // 4. Role-based access for authenticated users
    if (isAuth) {
        const role = token.role as string
        const plan = (token.plan as string) ?? 'BASE'

        // ── Admin paths ──────────────────────────────────────────────────────
        if (pathname.startsWith('/admin') && !isAuthPage) {
            const allowedAdminRoles = ['SUPER_ADMIN', 'HOTEL_ADMIN', 'MANAGER', 'RECEPTIONIST']
            if (!allowedAdminRoles.includes(role)) {
                return NextResponse.redirect(new URL(getHomePath(role), req.url))
            }

            // SUPER_ADMIN bypasses all plan checks
            if (role !== 'SUPER_ADMIN') {
                // Plan-gated routes — redirect to dashboard with upgrade prompt
                const STARTER_ROUTES = [
                    '/admin/staff', '/admin/attendance', '/admin/leaves',
                    '/admin/payroll', '/admin/services', '/admin/marketing',
                    '/admin/bulk-import', '/admin/reports',
                ]
                const STANDARD_ROUTES = [
                    '/admin/infrastructure', '/admin/restaurant-analysis', '/admin/loyalty-analysis',
                ]
                const ENTERPRISE_ROUTES = [
                    '/admin/properties', '/admin/subscription-plans',
                ]

                const planOrder = ['BASE', 'STARTER', 'STANDARD', 'ENTERPRISE']
                // Normalize legacy plans
                const legacyMap: Record<string, string> = { GOLD: 'BASE', PLATINUM: 'STARTER', DIAMOND: 'STANDARD' }
                const normalizedPlan = legacyMap[plan] ?? plan
                const planIdx = planOrder.indexOf(normalizedPlan)

                const needsStarter   = STARTER_ROUTES.some(r => pathname.startsWith(r))
                const needsStandard  = STANDARD_ROUTES.some(r => pathname.startsWith(r))
                const needsEnterprise = ENTERPRISE_ROUTES.some(r => pathname.startsWith(r))

                if (needsEnterprise && planIdx < 3) {
                    return NextResponse.redirect(new URL('/admin/dashboard?upgrade=ENTERPRISE', req.url))
                }
                if (needsStandard && planIdx < 2) {
                    return NextResponse.redirect(new URL('/admin/dashboard?upgrade=STANDARD', req.url))
                }
                if (needsStarter && planIdx < 1) {
                    return NextResponse.redirect(new URL('/admin/dashboard?upgrade=STARTER', req.url))
                }
            }

            // Payroll: SUPER_ADMIN, HOTEL_ADMIN, MANAGER, or ACCOUNTS dept
            const isFinanceUser = token.department === 'ACCOUNTS'
            const isAuthorizedForPayroll =
                ['SUPER_ADMIN', 'HOTEL_ADMIN', 'MANAGER'].includes(role) || isFinanceUser
            if (pathname.startsWith('/admin/payroll') && !isAuthorizedForPayroll) {
                return NextResponse.redirect(new URL('/admin/dashboard', req.url))
            }
        }

        // ── Staff paths ──────────────────────────────────────────────────────
        if (pathname.startsWith('/staff') && !isAuthPage) {
            const allowedStaffRoles = ['STAFF', 'SUPER_ADMIN', 'HOTEL_ADMIN', 'MANAGER', 'RECEPTIONIST']
            if (!allowedStaffRoles.includes(role)) {
                return NextResponse.redirect(new URL(getHomePath(role), req.url))
            }
        }

        // Handle base paths
        const homePath = getHomePath(role)
        if ((pathname === '/admin' || pathname === '/staff') && pathname !== homePath) {
            return NextResponse.redirect(new URL(homePath, req.url))
        }
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ]
}
