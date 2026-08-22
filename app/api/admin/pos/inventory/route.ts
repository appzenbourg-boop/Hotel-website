import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/options'

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const propertyId = (session.user as any)?.propertyId || '6a7c467e80ab868749620999'

    const items = await prisma.inventoryItem.findMany({
      where: { propertyId },
      orderBy: { name: 'asc' }
    })

    // Dynamic stats computation
    const totalStockValue = items.reduce((acc, item) => acc + (item.stockLevel * item.unitPrice), 0)
    const criticalCount = items.filter(item => item.stockLevel <= item.reorderPoint).length

    // Seed default vendors if empty
    let vendors = await prisma.vendor.findMany({
      where: { propertyId, status: 'ACTIVE' },
      orderBy: { name: 'asc' }
    })

    if (vendors.length === 0) {
      const defaultVendors = [
        { name: 'Artisan Logistics Collective', category: 'Food & Beverage', rating: 4.8, status: 'ACTIVE', contactName: 'Nikos K.', email: 'procurement@artisan.com', propertyId },
        { name: 'Zenbourg Textiles Supplier', category: 'Housekeeping', rating: 4.7, status: 'ACTIVE', contactName: 'Sarah M.', email: 'textiles@zenbourg.com', propertyId },
        { name: 'EcoCare Maintenance Ltd', category: 'Maintenance', rating: 4.5, status: 'ACTIVE', contactName: 'David L.', email: 'ecocare@maintenance.com', propertyId }
      ]
      await prisma.vendor.createMany({
        data: defaultVendors
      })
      vendors = await prisma.vendor.findMany({
        where: { propertyId, status: 'ACTIVE' },
        orderBy: { name: 'asc' }
      })
    }

    // Dynamic Pending orders count from DB
    const pendingOrdersCount = await prisma.purchaseOrder.count({
      where: { 
        propertyId,
        status: { in: ['PENDING_APPROVAL', 'SENT'] }
      }
    })

    // Dynamic Active vendors count from DB
    const activeVendorsCount = vendors.length

    return NextResponse.json({
      items,
      vendors,
      stats: {
        totalStockValue,
        criticalCount,
        pendingOrdersCount,
        activeVendorsCount
      }
    })
  } catch (error) {
    console.error('Error fetching POS inventory:', error)
    return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const propertyId = (session.user as any)?.propertyId || '6a7c467e80ab868749620999'

    const { searchParams } = new URL(req.url)
    const isReorder = searchParams.get('reorder') === 'true'

    if (isReorder) {
      // Smart Reorder Trigger: Automatically restock all low stock items by creating purchase orders in the database!
      const lowStockItems = await prisma.inventoryItem.findMany({
        where: {
          propertyId,
          stockLevel: { lte: prisma.inventoryItem.fields.reorderPoint } // stockLevel <= reorderPoint
        }
      })

      if (lowStockItems.length === 0) {
        return NextResponse.json({ success: true, message: 'No items require reordering.' })
      }

      // Group items by category to assign to vendors
      const categories = Array.from(new Set(lowStockItems.map(item => item.category)))
      
      for (const category of categories) {
        // Find active vendor for this category
        let vendor = await prisma.vendor.findFirst({
          where: { propertyId, category: { contains: category, mode: 'insensitive' } }
        })

        // If no vendor exists for category, find any vendor
        if (!vendor) {
          vendor = await prisma.vendor.findFirst({
            where: { propertyId }
          })
        }

        // If absolutely no vendor exists in the system, seed a default one
        if (!vendor) {
          vendor = await prisma.vendor.create({
            data: {
              name: 'Artisan Logistics Collective',
              category: 'Gastronomy & Textiles',
              rating: 4.8,
              status: 'ACTIVE',
              contactName: 'Nikos K.',
              email: 'procurement@artisan.com',
              propertyId
            }
          })
        }

        const itemsForVendor = lowStockItems.filter(item => item.category === category)
        const poNumber = 'PO-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000)

        let subtotal = 0
        const orderItemsData = itemsForVendor.map(item => {
          const qtyToOrder = Math.max(100, item.reorderPoint * 2 - item.stockLevel)
          const price = item.unitPrice
          const total = qtyToOrder * price
          subtotal += total

          return {
            description: `Restock: ${item.name} (${item.sku})`,
            quantity: qtyToOrder,
            unitPrice: price,
            total
          }
        })

        // Create Purchase Order in the database
        const po = await prisma.purchaseOrder.create({
          data: {
            poNumber,
            vendorId: vendor.id,
            status: 'PENDING_APPROVAL',
            subtotal,
            tax: subtotal * 0.18,
            totalAmount: subtotal * 1.18,
            propertyId,
            items: {
              create: orderItemsData
            }
          }
        })

        // Update the stockLevel in the database to simulate order receipt
        for (const item of itemsForVendor) {
          const qtyToOrder = Math.max(100, item.reorderPoint * 2 - item.stockLevel)
          await prisma.inventoryItem.update({
            where: { id: item.id },
            data: {
              stockLevel: { increment: qtyToOrder }
            }
          })
        }
      }

      return NextResponse.json({ success: true, message: `Successfully created restock purchase orders.` })
    } else {
      // Create new inventory item OR process manual restock order
      const body = await req.json()
      const { itemId, vendorId, quantity, name, sku, category, stockLevel, unit, reorderPoint, unitPrice, image } = body

      // If manual purchase restock order
      if (itemId && vendorId && quantity !== undefined) {
        const qty = parseInt(quantity)
        if (isNaN(qty) || qty <= 0) {
          return NextResponse.json({ error: 'Quantity must be a positive number' }, { status: 400 })
        }

        const item = await prisma.inventoryItem.findUnique({
          where: { id: itemId }
        })
        if (!item) {
          return NextResponse.json({ error: 'Item not found' }, { status: 404 })
        }

        const vendor = await prisma.vendor.findUnique({
          where: { id: vendorId }
        })
        if (!vendor) {
          return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
        }

        const price = item.unitPrice
        const total = qty * price
        const poNumber = 'PO-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000)

        // Create Purchase Order in the database
        const po = await prisma.purchaseOrder.create({
          data: {
            poNumber,
            vendorId: vendor.id,
            status: 'PENDING_APPROVAL',
            subtotal: total,
            tax: total * 0.18,
            totalAmount: total * 1.18,
            propertyId,
            items: {
              create: [{
                description: `Restock: ${item.name} (${item.sku})`,
                quantity: qty,
                unitPrice: price,
                total: total
              }]
            }
          }
        })

        // Increment inventory item stock level to reflect order receipt
        await prisma.inventoryItem.update({
          where: { id: item.id },
          data: {
            stockLevel: { increment: qty }
          }
        })

        return NextResponse.json({ success: true, message: `Successfully created Purchase Order ${poNumber} for ${qty} ${item.unit} of ${item.name}.` })
      }

      if (!name || !sku) {
        return NextResponse.json({ error: 'Name and SKU are required' }, { status: 400 })
      }

      const exists = await prisma.inventoryItem.findFirst({
        where: { sku, propertyId }
      })
      if (exists) {
        return NextResponse.json({ error: `SKU ${sku} already exists` }, { status: 400 })
      }

      const item = await prisma.inventoryItem.create({
        data: {
          name,
          sku: sku.toUpperCase(),
          category: category || 'Housekeeping',
          stockLevel: parseInt(stockLevel) || 0,
          unit: unit || 'units',
          reorderPoint: parseInt(reorderPoint) || 0,
          unitPrice: parseFloat(unitPrice) || 0,
          image: image || 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=200&q=80',
          propertyId
        }
      })
      return NextResponse.json(item)
    }
  } catch (error) {
    console.error('Error generating smart orders:', error)
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { id, name, category, stockLevel, reorderPoint, unit, unitPrice } = body

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const item = await prisma.inventoryItem.update({
      where: { id },
      data: {
        name: name || undefined,
        category: category || undefined,
        stockLevel: stockLevel !== undefined ? parseInt(stockLevel) : undefined,
        reorderPoint: reorderPoint !== undefined ? parseInt(reorderPoint) : undefined,
        unitPrice: unitPrice !== undefined ? parseFloat(unitPrice) : undefined,
        unit: unit || undefined
      }
    })

    return NextResponse.json(item)
  } catch (error) {
    console.error('Error updating inventory item:', error)
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    await prisma.inventoryItem.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting inventory item:', error)
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 })
  }
}
