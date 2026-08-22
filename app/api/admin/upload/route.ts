import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'

export const dynamic = 'force-dynamic'

// Max 5MB file upload limit
const MAX_SIZE = 5 * 1024 * 1024

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const formData = await request.formData()
        const file = formData.get('file') as File

        if (!file) {
            return new NextResponse('File is required', { status: 400 })
        }

        if (file.size > MAX_SIZE) {
            return NextResponse.json({ error: 'File too large. Max 5MB.' }, { status: 400 })
        }

        // Convert file buffer to base64 data URL
        const bytes = await file.arrayBuffer()
        const base64 = Buffer.from(bytes).toString('base64')
        const mimeType = file.type || 'image/jpeg'
        const dataUrl = `data:${mimeType};base64,${base64}`

        return NextResponse.json({ url: dataUrl, success: true })
    } catch (error) {
        console.error('[UPLOAD_FILE]', error)
        return new NextResponse('Upload failed', { status: 500 })
    }
}
