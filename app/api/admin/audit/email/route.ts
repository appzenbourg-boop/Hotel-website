import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import nodemailer from 'nodemailer'

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const userEmail = session.user.email
        if (!userEmail) {
            return NextResponse.json({ error: 'User email not found' }, { status: 400 })
        }

        const propertyId = (session.user as any).propertyId
        if (!propertyId) {
            return NextResponse.json({ error: 'No property selected' }, { status: 400 })
        }

        // We could fetch the night audit data again here to construct the email
        // Or we could parse it from req.body if the frontend passes it.
        // Let's just fetch basic stats for the email body.
        const today = new Date()
        const startOfDay = new Date(today.setHours(0, 0, 0, 0))
        const endOfDay = new Date(today.setHours(23, 59, 59, 999))
        const dateStr = today.toDateString()

        // Very basic summary
        const activeBookings = await prisma.booking.findMany({
            where: {
                propertyId,
                status: 'CHECKED_IN',
                checkIn: { lte: endOfDay },
                checkOut: { gte: startOfDay }
            }
        })
        const roomRevenue = activeBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0)
        const soldRooms = activeBookings.length

        // Create transporter
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: Number(process.env.SMTP_PORT) || 465,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        })

        // Email HTML
        const html = `
            <h2>Night Audit Report - ${dateStr}</h2>
            <p>The night audit has been processed.</p>
            <h3>Summary:</h3>
            <ul>
                <li><strong>Rooms Sold:</strong> ${soldRooms}</li>
                <li><strong>Room Revenue:</strong> $${roomRevenue.toFixed(2)}</li>
            </ul>
            <p>Please log in to the admin dashboard for full details.</p>
        `

        await transporter.sendMail({
            from: process.env.EMAIL_FROM || '"Zenbourg System" <noreply@zenbourg.com>',
            to: userEmail,
            subject: `Night Audit Completed: ${dateStr}`,
            html: html,
        })

        return NextResponse.json({ success: true, sentTo: userEmail }, { status: 200 })
    } catch (e: any) {
        console.error('Email send error:', e)
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
