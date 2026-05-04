import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { badRequest, unauthorized, forbidden, tooManyRequests, serverError } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

const JWT_SECRET = process.env.NEXTAUTH_SECRET!

export async function POST(request: NextRequest) {
    // Rate limit: 10 attempts per minute per IP
    const ip = getClientIp(request)
    const rl = await rateLimit(`login:${ip}`, { limit: 10, windowSec: 60 })
    if (!rl.success) return tooManyRequests(rl.resetAt)

    try {
        const body = await request.json()
        const { phone, email, password } = body

        const identifier = phone || email
        if (!identifier || !password) {
            return badRequest('Phone/email and password are required')
        }

        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { phone: identifier },
                    { email: { equals: identifier, mode: 'insensitive' } },
                ],
            },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                password: true,
                role: true,
                status: true,
                workplaceId: true,
            },
        })

        if (!user) return unauthorized('Invalid credentials')
        if (user.status !== 'ACTIVE') return forbidden('Account is not active')

        const isValid = await bcrypt.compare(password, user.password)
        if (!isValid) return unauthorized('Invalid credentials')

        // Ensure Guest profile exists
        if (user.role === 'GUEST') {
            const guest = await prisma.guest.findUnique({ where: { phone: user.phone } })
            if (!guest) {
                await prisma.guest.create({
                    data: {
                        name: user.name,
                        email: user.email,
                        phone: user.phone,
                        checkInStatus: 'PENDING',
                    },
                })
            }
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '30d' }
        )

        const { password: _pw, ...safeUser } = user

        return NextResponse.json({ success: true, token, user: safeUser })
    } catch (error) {
        return serverError(error, 'AUTH_LOGIN')
    }
}
