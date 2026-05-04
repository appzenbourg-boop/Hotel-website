import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendWhatsApp } from '@/lib/twilio'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'

export const dynamic = 'force-dynamic'

export async function POST(request: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const item = await prisma.lostItem.findUnique({
            where: { id: params.id },
            include: {
                guest: true,
                room: true,
                property: true
            }
        })

        if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 })

        const body = await request.json()
        const { phone, message } = body

        const recipientPhone = phone || item.guest?.phone || item.claimerPhone
        if (!recipientPhone) {
            return NextResponse.json({ error: 'No phone number found' }, { status: 400 })
        }

        const template = message || `Hello ${item.guest?.name || 'Guest'}, this is ${item.property.name}. A ${item.name} was found in ${item.room?.roomNumber || item.location}. Please let us know if this belongs to you. Case ID: ${item.id}`

        const result = await sendWhatsApp(recipientPhone, template)

        await prisma.lostItem.update({
            where: { id: params.id },
            data: {
                whatsappSent: true,
                whatsappSentAt: new Date(),
                whatsappStatus: 'SENT',
                whatsappMessageId: result.sid
            }
        })

        return NextResponse.json({ success: true, sid: result.sid })
    } catch (error) {
        console.error('WhatsApp Notification Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
