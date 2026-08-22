import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import prisma from '@/lib/db'

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

        const { searchParams } = new URL(req.url)
        const propertyId = searchParams.get('propertyId')
        
        if (!propertyId) {
            return NextResponse.json({ success: false, error: 'Property ID required' }, { status: 400 })
        }

        const vendors = await prisma.vendor.findMany({
            where: { propertyId },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json({ success: true, data: vendors })
    } catch (error) {
        console.error('Fetch Vendors Error:', error)
        return NextResponse.json({ success: false, error: 'Failed to fetch vendors' }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

        const body = await req.json()
        const { name, category, contactName, email, phone, image } = body

        const { searchParams } = new URL(req.url)
        const queryPropertyId = searchParams.get('propertyId')
        const propertyId = body.propertyId || queryPropertyId || (session.user as any)?.propertyId || '6a7c467e80ab868749620999'

        if (!propertyId || !name || !category) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
        }

        const newVendor = await prisma.vendor.create({
            data: {
                propertyId,
                name,
                category,
                contactName,
                email,
                phone,
                image: image || null,
                status: 'ACTIVE',
                rating: 5.0
            }
        })

        return NextResponse.json({ success: true, data: newVendor })
    } catch (error) {
        console.error('Create Vendor Error:', error)
        return NextResponse.json({ success: false, error: 'Failed to create vendor' }, { status: 500 })
    }
}

export async function PUT(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

        const body = await req.json()
        const { id, name, category, contactName, email, phone, image } = body

        if (!id) {
            return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 })
        }

        const updated = await prisma.vendor.update({
            where: { id },
            data: {
                name: name || undefined,
                category: category || undefined,
                contactName: contactName !== undefined ? contactName : undefined,
                email: email !== undefined ? email : undefined,
                phone: phone !== undefined ? phone : undefined,
                image: image !== undefined ? image : undefined
            }
        })

        return NextResponse.json({ success: true, data: updated })
    } catch (error) {
        console.error('Update Vendor Error:', error)
        return NextResponse.json({ success: false, error: 'Failed to update vendor' }, { status: 500 })
    }
}

export async function DELETE(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

        const { searchParams } = new URL(req.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 })
        }

        await prisma.vendor.delete({
            where: { id }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Delete Vendor Error:', error)
        return NextResponse.json({ success: false, error: 'Failed to delete vendor' }, { status: 500 })
    }
}
