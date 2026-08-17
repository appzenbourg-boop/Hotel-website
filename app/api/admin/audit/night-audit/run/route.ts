import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Get user's primary property
        const property = await prisma.property.findFirst({
            where: { ownerIds: { has: session.user.id } }
        })

        if (!property) {
            return NextResponse.json({ error: "Property not found" }, { status: 404 })
        }

        // Check if an audit is already in progress
        const activeAudit = await prisma.auditRun.findFirst({
            where: { propertyId: property.id, status: 'IN_PROGRESS' }
        })

        if (activeAudit) {
            return NextResponse.json({ error: "An audit is already in progress" }, { status: 400 })
        }

        const today = new Date()
        today.setHours(0, 0, 0, 0)

        // 1. Create a new Audit Run
        const auditRun = await prisma.auditRun.create({
            data: {
                propertyId: property.id,
                auditDate: today,
                startedById: session.user.id,
            }
        })

        // 2. Validate all CHECKED_IN folios have room charge + tax posted
        const inHouseBookings = await prisma.booking.findMany({
            where: { propertyId: property.id, status: 'CHECKED_IN' },
            include: { ledgerTransactions: true }
        })

        let exceptionsFound = 0

        for (const booking of inHouseBookings) {
            // Did they get charged room revenue today?
            const roomChargeToday = booking.ledgerTransactions.find(t => 
                t.category === 'ROOM_REVENUE' && 
                new Date(t.timestamp).toDateString() === today.toDateString()
            )

            if (!roomChargeToday) {
                // Auto-post room charge!
                const chargeAmount = booking.baseAmount ? (booking.baseAmount / booking.numberOfGuests) : 1000 // Simple logic for seed
                await prisma.ledgerTransaction.create({
                    data: {
                        propertyId: property.id,
                        amount: chargeAmount,
                        type: 'CREDIT',
                        category: 'ROOM_REVENUE',
                        description: `Auto-posted nightly room charge`,
                        bookingId: booking.id,
                        terminal: 'SYSTEM'
                    }
                })

                // Auto-post tax
                await prisma.ledgerTransaction.create({
                    data: {
                        propertyId: property.id,
                        amount: chargeAmount * 0.18, // 18% GST mock
                        type: 'CREDIT',
                        category: 'TAX_LIABILITY',
                        description: `Auto-posted GST 18%`,
                        bookingId: booking.id,
                        terminal: 'SYSTEM'
                    }
                })

                // Create a minor exception just to notify that it was auto-posted
                await prisma.auditException.create({
                    data: {
                        propertyId: property.id,
                        auditRunId: auditRun.id,
                        type: "AUTO_POSTED_CHARGE",
                        severity: "LOW",
                        bookingId: booking.id,
                        resolutionNotes: "System auto-posted missing nightly room charge and taxes."
                    }
                })
                exceptionsFound++
            }

            // Discrepancy: Check out today but pending payment
            const isCheckingOutToday = new Date(booking.checkOut).toDateString() === today.toDateString()
            if (isCheckingOutToday && booking.paymentStatus === 'PENDING') {
                await prisma.auditException.create({
                    data: {
                        propertyId: property.id,
                        auditRunId: auditRun.id,
                        type: "UNPAID_CHECKOUT",
                        severity: "HIGH",
                        bookingId: booking.id,
                    }
                })
                exceptionsFound++
            }
        }

        // 3. Find any unauthorized voids today
        const voidedTxs = await prisma.ledgerTransaction.findMany({
            where: { 
                propertyId: property.id, 
                status: 'VOIDED',
                timestamp: { gte: today }
            }
        })

        for (const tx of voidedTxs) {
            await prisma.auditException.create({
                data: {
                    propertyId: property.id,
                    auditRunId: auditRun.id,
                    type: "UNAUTHORIZED_VOID",
                    severity: "HIGH",
                    transactionId: tx.id
                }
            })
            exceptionsFound++
        }

        // Update audit run with exception count
        await prisma.auditRun.update({
            where: { id: auditRun.id },
            data: { exceptionsFound }
        })

        return NextResponse.json({ 
            message: "Night audit run initiated.", 
            auditRunId: auditRun.id, 
            exceptionsFound 
        })

    } catch (error) {
        console.error('Failed to run night audit:', error)
        return NextResponse.json({ error: "Failed to run night audit" }, { status: 500 })
    }
}
