import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Max 5MB
const MAX_SIZE = 5 * 1024 * 1024

export async function POST(request: Request) {
    const session = await getServerSession(authOptions)
    const allowed = ['SUPER_ADMIN', 'HOTEL_ADMIN', 'MANAGER', 'RECEPTIONIST']
    if (!session || !allowed.includes(session.user.role)) {
        return new NextResponse('Unauthorized', { status: 401 })
    }

    try {
        const formData = await request.formData()
        const file = formData.get('file') as File
        const side = formData.get('side') as 'front' | 'back'
        const guestId = formData.get('guestId') as string

        if (!file || !side || !guestId) {
            return new NextResponse('Missing required fields', { status: 400 })
        }

        if (file.size > MAX_SIZE) {
            return NextResponse.json({ error: 'File too large. Max 5MB.' }, { status: 400 })
        }

        // Convert to base64 data URL — works on any hosting (Vercel, local, etc.)
        const bytes = await file.arrayBuffer()
        const base64 = Buffer.from(bytes).toString('base64')
        const mimeType = file.type || 'image/jpeg'
        const dataUrl = `data:${mimeType};base64,${base64}`

        // Update guest record
        await prisma.guest.update({
            where: { id: guestId },
            data: {
                ...(side === 'front'
                    ? { idDocumentFront: dataUrl }
                    : { idDocumentBack: dataUrl }),
                checkInStatus: 'LINK_OPENED',
            }
        })

        return NextResponse.json({ url: dataUrl, success: true })
    } catch (error) {
        console.error('[UPLOAD_DOC]', error)
        return new NextResponse('Upload failed', { status: 500 })
    }
}
