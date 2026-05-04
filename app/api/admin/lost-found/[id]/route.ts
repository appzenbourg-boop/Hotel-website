import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const item = await prisma.lostItem.findUnique({
            where: { id: params.id },
            include: {
                room: true,
                reportedBy: {
                    include: { user: { select: { name: true } } }
                },
                guest: true,
                booking: true
            }
        })

        if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 })

        return NextResponse.json(item)
    } catch (error) {
        console.error('Error fetching lost item:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const body = await request.json()
        const { 
            status, claimerName, claimerPhone, claimNotes, 
            name, category, location, description, 
            image, appendImage, newNote 
        } = body
 
        const currentItem = await prisma.lostItem.findUnique({ 
            where: { id: params.id },
            select: { caseNotes: true, evidenceImages: true }
        })

        const updateData: any = {
            status,
            name,
            category,
            location,
            description,
        }
 
        if (image) updateData.image = image
        
        if (appendImage) {
            const images = currentItem?.evidenceImages || []
            updateData.evidenceImages = [...images, appendImage]
        }

        if (newNote) {
            const notes = (currentItem?.caseNotes as any[]) || []
            notes.push({
                content: newNote,
                author: session.user.name || 'System User',
                createdAt: new Date()
            })
            updateData.caseNotes = notes
        }

        if (status === 'CLAIMED') {
            updateData.claimerName = claimerName
            updateData.claimerPhone = claimerPhone
            updateData.claimNotes = claimNotes
            updateData.claimedAt = new Date()
        }

        const item = await prisma.lostItem.update({
            where: { id: params.id },
            data: updateData,
            include: {
                room: true,
                guest: true
            }
        })
 
        return NextResponse.json(item)
    } catch (error) {
        console.error('Error updating lost item:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        await prisma.lostItem.delete({
            where: { id: params.id }
        })

        return NextResponse.json({ message: 'Deleted successfully' })
    } catch (error) {
        console.error('Error deleting lost item:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
