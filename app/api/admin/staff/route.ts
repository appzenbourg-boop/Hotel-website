import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { prisma } from '@/lib/db'
import { hash } from 'bcryptjs'
import { unauthorized, forbidden, badRequest, conflict, serverError } from '@/lib/api-response'
import { redis } from '@/lib/redis'

export const dynamic = 'force-dynamic'

const ALLOWED_ROLES = ['SUPER_ADMIN', 'HOTEL_ADMIN', 'MANAGER', 'RECEPTIONIST']

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return unauthorized()
    if (!ALLOWED_ROLES.includes(session.user.role)) return forbidden()

    const { searchParams } = new URL(request.url)
    const queryPropertyId = searchParams.get('propertyId')
    const activeOnly = searchParams.get('activeOnly') === 'true'
    const department = searchParams.get('department')
    const search = searchParams.get('search')?.trim()
    const page = parseInt(searchParams.get('page') ?? '1')
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200)

    const where: any = { user: { status: 'ACTIVE' } }

    if (activeOnly) {
        where.attendances = { some: { punchOut: null } }
    }

    if (department && department !== 'ALL') {
        where.department = department
    }

    let targetPropertyId = session.user.propertyId;

    if (session.user.role === 'SUPER_ADMIN') {
        if (queryPropertyId && queryPropertyId !== 'ALL') {
            where.propertyId = queryPropertyId
            targetPropertyId = queryPropertyId
        }
    } else {
        if (!targetPropertyId) return NextResponse.json({ success: true, data: [], pagination: { page: 1, limit, total: 0, pages: 0 } })
        where.propertyId = targetPropertyId
    }

    if (search) {
        where.user = {
            ...where.user,
            OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search } },
            ],
        }
    }

    try {
        const cacheKey = `admin:staff:${targetPropertyId}:${activeOnly}:${department}:${search}:${page}:${limit}`;
        const cached = await redis.get(cacheKey);
        
        if (cached) {
            return NextResponse.json(cached);
        }

        const [staff, total] = await Promise.all([
            prisma.staff.findMany({
                where,
                include: {
                    user: {
                        select: { name: true, email: true, phone: true, status: true, role: true },
                    },
                    attendances: {
                        orderBy: { punchIn: 'desc' },
                        take: 1,
                    },
                },
                orderBy: { user: { name: 'asc' } },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.staff.count({ where }),
        ])

        const canSeeSalary = ['SUPER_ADMIN', 'HOTEL_ADMIN', 'MANAGER'].includes(session.user.role)

        const formatted = staff.map((s) => {
            const attendance = s.attendances[0]
            let dutyStatus = 'OFF_DUTY'

            if (attendance) {
                if (attendance.punchIn && !attendance.punchOut) {
                    dutyStatus = 'ON_DUTY'
                } else if (attendance.punchOut) {
                    const punchedOutRecently =
                        Date.now() - new Date(attendance.punchOut).getTime() < 24 * 60 * 60 * 1000
                    dutyStatus = punchedOutRecently ? 'PUNCHED_OUT' : 'OFF_DUTY'
                }
            } else {
                dutyStatus = 'NOT_STARTED'
            }

            return {
                id: s.id,
                userId: s.userId,
                name: s.user.name,
                email: s.user.email,
                phone: s.user.phone,
                department: s.department,
                designation: s.designation,
                userRole: s.user.role,
                status: s.user.status,
                dutyStatus,
                isVerified: s.isVerified,
                verificationRequested: s.verificationRequested,
                salary: canSeeSalary ? s.baseSalary : null,
                employeeId: s.employeeId,
                dateOfJoining: s.dateOfJoining,
                documents: s.documents ?? null,
                profilePhoto: s.profilePhoto || null,
            }
        })

        const result = {
            success: true,
            data: formatted,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        }

        // Cache for 30 seconds
        await redis.set(cacheKey, result, { ex: 30 })

        return NextResponse.json(result)
    } catch (error) {
        return serverError(error, 'STAFF_GET')
    }
}

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return unauthorized()
    if (!ALLOWED_ROLES.includes(session.user.role)) return forbidden()

    try {
        const body = await request.json()
        const { name, email, phone, designation, department, salary, password, userRole, profilePhoto, propertyId: bodyPropertyId } = body

        if (!name || !email || !phone || !department) {
            return badRequest('name, email, phone and department are required')
        }

        let targetPropertyId = session.user.propertyId
        if (session.user.role === 'SUPER_ADMIN' && bodyPropertyId) {
            targetPropertyId = bodyPropertyId
        }
        if (!targetPropertyId) return badRequest('Missing property ID')

        const hashedPassword = await hash(password || '123456', 12)

        const result = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    name,
                    email: email.toLowerCase().trim(),
                    phone,
                    password: hashedPassword,
                    role: (userRole ?? 'STAFF') as any,
                    status: 'ACTIVE',
                    workplaceId: targetPropertyId,
                },
            })

            const staff = await tx.staff.create({
                data: {
                    userId: user.id,
                    propertyId: targetPropertyId!,
                    employeeId: `EMP-${Date.now().toString().slice(-6)}`,
                    department: department as any,
                    designation: designation ?? 'Member',
                    baseSalary: parseFloat(salary) || 0,
                    profilePhoto: profilePhoto || null,
                    dateOfJoining: new Date(),
                },
            })

            return { user, staff }
        })
        // Invalidate staff cache for this property
        const keys = await redis.keys(`admin:staff:${targetPropertyId}:*`)
        if (keys.length > 0) {
            await redis.del(...keys)
        }

        return NextResponse.json({ success: true, data: result.staff }, { status: 201 })
    } catch (error: any) {
        if (error?.code === 'P2002') return conflict('User with this email or phone already exists')
        return serverError(error, 'STAFF_POST')
    }
}
