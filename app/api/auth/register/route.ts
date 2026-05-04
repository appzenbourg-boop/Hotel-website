import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { sign } from 'jsonwebtoken'
import { prisma } from '@/lib/db'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { badRequest, conflict, tooManyRequests, serverError } from '@/lib/api-response'
import { sendWelcomeEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
    // Rate limit: 5 registrations per 10 minutes per IP
    const ip = getClientIp(req)
    const rl = await rateLimit(`register:${ip}`, { limit: 5, windowSec: 600 })
    if (!rl.success) return tooManyRequests(rl.resetAt)

    try {
        const body = await req.json()
        const {
            name,
            email,
            phone,
            password,
            role = 'GUEST',
            hotelName,
            hotelAddress,
            latitude,
            longitude,
        } = body

        if (!name || !email || !phone || !password) {
            return badRequest('name, email, phone and password are required')
        }

        if (password.length < 8) {
            return badRequest('Password must be at least 8 characters')
        }

        if (role === 'HOTEL_ADMIN' && !hotelName) {
            return badRequest('Hotel name is required for hotel accounts')
        }

        const existing = await prisma.user.findFirst({
            where: { OR: [{ email: { equals: email, mode: 'insensitive' } }, { phone }] },
        })
        if (existing) return conflict('User with this email or phone already exists')

        const hashedPassword = await hash(password, 12)

        const result = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    name,
                    email: email.toLowerCase().trim(),
                    phone,
                    password: hashedPassword,
                    role: role as any,
                    status: 'ACTIVE',
                },
            })

            let propertyId: string | null = null

            if (role === 'HOTEL_ADMIN' && hotelName) {
                const property = await tx.property.create({
                    data: {
                        name: hotelName,
                        address: hotelAddress || 'Address not provided',
                        phone,
                        email: email.toLowerCase().trim(),
                        latitude: latitude ?? null,
                        longitude: longitude ?? null,
                        plan: 'GOLD',
                        features: ['BASIC_OPS', 'STAFF_MANAGEMENT'],
                        ownerIds: [user.id],
                    } as any,
                })
                propertyId = property.id

                await tx.user.update({
                    where: { id: user.id },
                    data: { ownedPropertyIds: [property.id] } as any,
                })
            }

            if (role === 'GUEST') {
                await tx.guest.create({
                    data: { name, email: email.toLowerCase().trim(), phone, checkInStatus: 'PENDING' },
                })
            }

            return { user, propertyId }
        })

        // Send welcome email (non-blocking)
        sendWelcomeEmail({ to: email, name, hotelName }).catch(() => {})

        const token = sign(
            { id: result.user.id, email: result.user.email, role: result.user.role },
            process.env.NEXTAUTH_SECRET!,
            { expiresIn: '30d' }
        )

        const { password: _pw, ...safeUser } = result.user

        return NextResponse.json(
            { success: true, user: safeUser, propertyId: result.propertyId, token },
            { status: 201 }
        )
    } catch (error) {
        return serverError(error, 'REGISTER')
    }
}
