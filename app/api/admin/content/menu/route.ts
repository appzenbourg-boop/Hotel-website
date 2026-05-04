import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth/middleware'
import { redis } from '@/lib/redis'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/content/menu
 * Fetch menu items for the current property context
 */
export async function GET(req: NextRequest) {
    try {
        const authResult = await requireAuth(req, ['SUPER_ADMIN', 'HOTEL_ADMIN', 'MANAGER'])
        if (authResult instanceof NextResponse) return authResult

        const { searchParams } = new URL(req.url)
        const propertyId = searchParams.get('propertyId') || authResult.user.propertyId

        if (!propertyId || propertyId === 'ALL') {
            return NextResponse.json({ success: true, menuItems: [] })
        }

        const cacheKey = `menu:${propertyId}`
        const cached = await redis.get(cacheKey)
        if (cached) {
            return NextResponse.json({ success: true, menuItems: cached, fromCache: true })
        }

        const menuItems = await prisma.menuItem.findMany({
            where: { propertyId },
            orderBy: { category: 'asc' }
        })

        // Cache for 1 hour
        await redis.set(cacheKey, menuItems, { ex: 3600 })

        return NextResponse.json({ success: true, menuItems })

    } catch (error: any) {
        console.error('[MENU_GET_ERROR]', error)
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
    }
}

/**
 * POST /api/admin/content/menu
 * Create or Update a menu item
 */
export async function POST(req: NextRequest) {
    try {
        const authResult = await requireAuth(req, ['SUPER_ADMIN', 'HOTEL_ADMIN', 'MANAGER'])
        if (authResult instanceof NextResponse) return authResult

        const body = await req.json()
        const { id, propertyId, name, description, category, price, margin, isVeg, isAvailable, image, images } = body

        const targetPropertyId = propertyId || authResult.user.propertyId

        if (!targetPropertyId) {
            return NextResponse.json({ error: 'Property ID is required' }, { status: 400 })
        }

        // Verify propertyId is authorized for the user
        if (authResult.user.role !== 'SUPER_ADMIN' && authResult.user.propertyId !== targetPropertyId) {
            return NextResponse.json({ error: 'Unauthorized for this property' }, { status: 403 })
        }

        const data: any = {
            // Standard fields
        }

        if (name !== undefined) data.name = name
        if (description !== undefined) data.description = description
        if (category !== undefined) data.category = category
        if (price !== undefined) data.price = parseFloat(price.toString())
        if (margin !== undefined) data.margin = parseFloat(margin.toString())
        if (isVeg !== undefined) data.isVeg = !!isVeg
        if (isAvailable !== undefined) data.isAvailable = !!isAvailable
        if (images !== undefined) data.images = images
        else if (image !== undefined) data.images = [image]

        let menuItem
        if (id) {
            menuItem = await prisma.menuItem.update({
                where: { id },
                data
            })
        } else {
            // For new items, ensure required fields are there
            if (!name || !category || price === undefined) {
                return NextResponse.json({ error: 'Missing required fields for new item' }, { status: 400 })
            }

            // Prevent duplicate names in the same property
            const existing = await prisma.menuItem.findFirst({
                where: { propertyId: targetPropertyId, name: { equals: name, mode: 'insensitive' } }
            })
            if (existing) {
                return NextResponse.json({ error: `A menu item named "${name}" already exists. Edit the existing item instead.` }, { status: 409 })
            }

            menuItem = await prisma.menuItem.create({
                data: {
                    ...data,
                    property: { connect: { id: targetPropertyId } }
                }
            })
        }

        // Invalidate Cache
        await redis.del(`menu:${targetPropertyId}`)

        return NextResponse.json({ success: true, menuItem })

    } catch (error: any) {
        console.error('[MENU_POST_ERROR]', error)
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
    }
}

/**
 * DELETE /api/admin/content/menu
 * Remove a menu item
 */
export async function DELETE(req: NextRequest) {
    try {
        const authResult = await requireAuth(req, ['SUPER_ADMIN', 'HOTEL_ADMIN', 'MANAGER'])
        if (authResult instanceof NextResponse) return authResult

        const { searchParams } = new URL(req.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'Item ID is required' }, { status: 400 })
        }

        // Check ownership/authorization
        const existing = await prisma.menuItem.findUnique({ where: { id } })
        if (!existing) {
            return NextResponse.json({ error: 'Item not found' }, { status: 404 })
        }

        if (authResult.user.role !== 'SUPER_ADMIN' && authResult.user.propertyId !== existing.propertyId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        await prisma.menuItem.delete({ where: { id } })

        // Invalidate Cache
        await redis.del(`menu:${existing.propertyId}`)

        return NextResponse.json({ success: true, message: 'Item deleted' })

    } catch (error: any) {
        console.error('[MENU_DELETE_ERROR]', error)
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
    }
}
