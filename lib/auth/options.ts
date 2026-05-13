import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/db'
import { compare } from 'bcryptjs'

export const authOptions: NextAuthOptions = {
    session: {
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    pages: {
        signIn: '/admin/login',
    },
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                email: { label: 'Email or Phone', type: 'text' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null

                const identifier = credentials.email.trim().toLowerCase()

                const user = await prisma.user.findFirst({
                    where: {
                        OR: [
                            { email: { equals: identifier, mode: 'insensitive' } },
                            { phone: credentials.email.trim() },
                        ],
                    },
                })

                if (!user) return null
                if (user.status !== 'ACTIVE') return null

                const isPasswordValid = await compare(credentials.password, user.password)
                if (!isPasswordValid) return null

                // Resolve propertyId for multi-tenant context
                let propertyId: string | null = (user as any).workplaceId ?? null
                if (!propertyId && (user as any).ownedPropertyIds?.length > 0) {
                    propertyId = (user as any).ownedPropertyIds[0]
                }

                // Fetch department for staff roles
                let department: string | null = null
                if (['STAFF', 'MANAGER', 'RECEPTIONIST'].includes(user.role)) {
                    const staff = await prisma.staff.findUnique({
                        where: { userId: user.id },
                        select: { department: true },
                    })
                    department = staff?.department ?? null
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    propertyId,
                    department,
                }
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user, trigger }) {
            if (user) {
                token.id = user.id
                token.role = (user as any).role
                token.propertyId = (user as any).propertyId ?? null
                token.department = (user as any).department ?? null

                // Fetch property plan for middleware feature gating
                const pid = (user as any).propertyId
                if (pid) {
                    try {
                        const prop = await prisma.property.findUnique({
                            where: { id: pid },
                            select: { plan: true, customQuoteStatus: true, customQuoteAmount: true, customQuoteAllowsTrial: true },
                        })
                        token.plan = prop?.plan ?? 'BASE'
                        token.customQuoteStatus = prop?.customQuoteStatus ?? 'NONE'
                        token.customQuoteAmount = prop?.customQuoteAmount ?? null
                        token.customQuoteAllowsTrial = prop?.customQuoteAllowsTrial ?? false
                    } catch {
                        token.plan = 'BASE'
                        token.customQuoteStatus = 'NONE'
                        token.customQuoteAmount = null
                        token.customQuoteAllowsTrial = false
                    }
                } else {
                    token.plan = 'BASE'
                    token.customQuoteStatus = 'NONE'
                    token.customQuoteAmount = null
                    token.customQuoteAllowsTrial = false
                }
            }

            // Re-fetch plan when session.update() is called (e.g. after upgrade)
            if (trigger === 'update' && token.propertyId) {
                try {
                    const prop = await prisma.property.findUnique({
                        where: { id: token.propertyId as string },
                        select: { plan: true, customQuoteStatus: true, customQuoteAmount: true, customQuoteAllowsTrial: true },
                    })
                    if (prop?.plan) token.plan = prop.plan
                    token.customQuoteStatus = prop?.customQuoteStatus ?? 'NONE'
                    token.customQuoteAmount = prop?.customQuoteAmount ?? null
                    token.customQuoteAllowsTrial = prop?.customQuoteAllowsTrial ?? false
                } catch { /* silent */ }
            }

            return token
        },
        async session({ session, token }) {
            if (token) {
                session.user.id = token.id as string
                session.user.role = token.role as string
                session.user.propertyId = (token.propertyId as string) ?? null
                session.user.department = (token.department as string) ?? null
                ;(session.user as any).plan = token.plan ?? 'BASE'
                ;(session.user as any).customQuoteStatus = token.customQuoteStatus ?? 'NONE'
                ;(session.user as any).customQuoteAmount = token.customQuoteAmount ?? null
                ;(session.user as any).customQuoteAllowsTrial = token.customQuoteAllowsTrial ?? false
            }
            return session
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
}
