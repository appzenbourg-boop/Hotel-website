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
        const { propertyId, name, category, contactName, email, phone } = body

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
