import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth/middleware'
import { hash } from 'bcryptjs'

export const dynamic = 'force-dynamic'

/**
 * GET /api/staff
 * List all staff (Admin/Manager only)
 */
export async function GET(req: NextRequest) {
    try {
        const authResult = await requireAuth(req, ['SUPER_ADMIN', 'HOTEL_ADMIN'])
        if (authResult instanceof NextResponse) return authResult

        const { searchParams } = new URL(req.url)
        const department = searchParams.get('department')

        const where: any = {}
        if (department && department !== 'ALL') {
            where.department = department
        }

        const staffList = await prisma.staff.findMany({
            where,
            include: {
                user: {
                    select: {
                        name: true,
                        email: true,
                        phone: true,
                        status: true,
                        role: true
                    }
                }
            },
            orderBy: {
                user: { name: 'asc' }
            }
        })

        return NextResponse.json({
            success: true,
            count: staffList.length,
            staff: staffList
        })

    } catch (error: any) {
        console.error('[STAFF_GET_ERROR]', error)
        return NextResponse.json(
            { error: 'Failed to fetch staff', details: error.message },
            { status: 500 }
        )
    }
}

/**
 * POST /api/staff
 * Create a new staff member (Admin only)
 */
export async function POST(req: NextRequest) {
    try {
        const authResult = await requireAuth(req, ['SUPER_ADMIN', 'HOTEL_ADMIN'])
        if (authResult instanceof NextResponse) return authResult

        const body = await req.json()
        const {
            name,
            email,
            phone,
            password,
            department,
            designation,
            baseSalary,
            employeeId
        } = body

        if (!name || !email || !phone || !password || !department || !designation || !baseSalary || !employeeId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // 1. Check if user already exists
        const existingUser = await prisma.user.findFirst({
            where: { OR: [{ email }, { phone }] }
        })

        if (existingUser) {
            return NextResponse.json({ error: 'User already exists' }, { status: 400 })
        }

        // 2. Hash password
        const hashedPassword = await hash(password, 10)

        // 3. Create User and Staff in a transaction
        const result = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    name,
                    email,
                    phone,
                    password: hashedPassword,
                    role: 'STAFF',
                    status: 'ACTIVE'
                }
            })

            // Get a property to link to if not provided (should ideally be from context/session)
            const property = await tx.property.findFirst()

            const staff = await tx.staff.create({
                data: {
                    userId: user.id,
                    propertyId: property?.id || '',
                    employeeId,
                    department: department as any,
                    designation,
                    baseSalary: parseFloat(baseSalary),
                    dateOfJoining: new Date()
                },
                include: {
                    user: {
                        select: { name: true, email: true, role: true }
                    }
                }
            })

            return staff
        })

        return NextResponse.json({
            success: true,
            staff: result,
            message: 'Staff member created successfully'
        }, { status: 201 })

    } catch (error: any) {
        console.error('[STAFF_POST_ERROR]', error)
        return NextResponse.json(
            { error: 'Failed to create staff member', details: error.message },
            { status: 500 }
        )
    }
}
