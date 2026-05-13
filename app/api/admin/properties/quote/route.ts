import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { sendEnterpriseQuoteApproval } from '@/lib/email'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || session.user.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { propertyId, quoteAmount, shouldSendEmail, allowsTrial } = body

        if (!propertyId || typeof quoteAmount !== 'number' || quoteAmount <= 0) {
            return NextResponse.json({ error: 'Invalid quote details' }, { status: 400 })
        }

        // 1. Fetch property and owners
        const property = await prisma.property.findUnique({
            where: { id: propertyId },
            include: {
                owners: {
                    select: { name: true, email: true }
                }
            }
        })

        if (!property) {
            return NextResponse.json({ error: 'Property not found' }, { status: 404 })
        }

        // 2. Update Property status to APPROVED and set the price and trial flag
        const updatedProperty = await prisma.property.update({
            where: { id: propertyId },
            data: {
                customQuoteAmount: quoteAmount,
                customQuoteStatus: 'APPROVED',
                customQuoteAllowsTrial: !!allowsTrial
            }
        })

        // 3. Handle Email Notifications
        if (shouldSendEmail) {
            const recipientEmails: string[] = []
            if (property.email) recipientEmails.push(property.email)
            
            property.owners.forEach(owner => {
                if (owner.email && !recipientEmails.includes(owner.email)) {
                    recipientEmails.push(owner.email)
                }
            })

            if (recipientEmails.length > 0) {
                // Generate absolute dashboard link
                const baseUrl = process.env.NEXTAUTH_URL || 'https://zenbourg.com'
                const dashboardUrl = `${baseUrl}/admin`
                
                const name = property.owners[0]?.name || 'Valued Client'
                
                await sendEnterpriseQuoteApproval({
                    to: recipientEmails,
                    name,
                    hotelName: property.name,
                    quoteAmount,
                    dashboardUrl
                })
            }
        }

        return NextResponse.json({
            success: true,
            property: updatedProperty
        })

    } catch (error) {
        console.error('[QUOTE_API_ERROR]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
