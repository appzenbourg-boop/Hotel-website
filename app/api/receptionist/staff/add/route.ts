import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { hash } from 'bcryptjs'

export const dynamic = 'force-dynamic'

/**
 * POST /api/receptionist/staff/add
 */
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || !['RECEPTIONIST', 'SUPER_ADMIN', 'HOTEL_ADMIN'].includes(session.user.role)) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const propertyId = session.user.propertyId
        if (!propertyId) {
            return new NextResponse('Property ID missing from session', { status: 400 })
        }

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

        if (!name || !email || !phone || !password || !department || !designation || !employeeId) {
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
                    status: 'ACTIVE',
                    workplaceId: propertyId
                }
            })

            const staff = await tx.staff.create({
                data: {
                    userId: user.id,
                    propertyId: propertyId,
                    employeeId,
                    department,
                    designation,
                    baseSalary: parseFloat(baseSalary || '0'),
                    dateOfJoining: new Date()
                }
            })

            return staff
        })

        return NextResponse.json({
            success: true,
            staff: result,
            message: 'Staff member onboarded successfully'
        }, { status: 201 })

    } catch (error: any) {
        console.error('[RECEPTIONIST_STAFF_POST_ERROR]', error)
        return NextResponse.json({ error: 'Failed' }, { status: 500 })
    }
}
