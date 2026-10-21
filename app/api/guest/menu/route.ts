import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

const DEFAULT_MENU_ITEMS = [
    {
        name: 'Club Sandwich Supreme',
        description: 'Triple-decker toasted sandwich with grilled chicken or paneer, cheese, crisp lettuce, tomato, and hand-cut fries',
        category: 'Snacks',
        cuisine: 'Continental',
        price: 320,
        isVeg: false,
        isAvailable: true,
        prepTime: 20,
        images: ['https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500&auto=format&fit=crop&q=60']
    },
    {
        name: 'Paneer Tikka Roll',
        description: 'Char-grilled cottage cheese cubes with peppers and onions rolled in whole wheat paratha with mint relish',
        category: 'Snacks',
        cuisine: 'Indian',
        price: 280,
        isVeg: true,
        isAvailable: true,
        prepTime: 15,
        images: ['https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&auto=format&fit=crop&q=60']
    },
    {
        name: 'Continental Breakfast Tray',
        description: 'Warm croissants, blueberry muffin, butter & jam, seasonal fruit bowl, fresh orange juice, and choice of coffee',
        category: 'Breakfast',
        cuisine: 'Continental',
        price: 450,
        isVeg: true,
        isAvailable: true,
        prepTime: 25,
        images: ['https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=500&auto=format&fit=crop&q=60']
    },
    {
        name: 'Classic Eggs Benedict',
        description: 'Poached farm eggs on toasted English muffin with smoked ham/spinach and rich hollandaise sauce',
        category: 'Breakfast',
        cuisine: 'Continental',
        price: 380,
        isVeg: false,
        isAvailable: true,
        prepTime: 20,
        images: ['https://images.unsplash.com/photo-1608039829572-78524f79c4c7?w=500&auto=format&fit=crop&q=60']
    },
    {
        name: 'Butter Chicken with Butter Naan',
        description: 'Tender chicken simmered in rich velvety tomato-cashew gravy served with 2 freshly baked butter naans',
        category: 'Lunch & Dinner',
        cuisine: 'North Indian',
        price: 520,
        isVeg: false,
        isAvailable: true,
        prepTime: 30,
        images: ['https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500&auto=format&fit=crop&q=60']
    },
    {
        name: 'Dal Makhani & Jeera Rice',
        description: 'Slow-cooked black lentils simmered overnight with cream, butter, served with fragrant cumin basmati rice',
        category: 'Lunch & Dinner',
        cuisine: 'North Indian',
        price: 420,
        isVeg: true,
        isAvailable: true,
        prepTime: 25,
        images: ['https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&auto=format&fit=crop&q=60']
    },
    {
        name: 'Wild Mushroom Risotto',
        description: 'Creamy Arborio rice with porcini and button mushrooms, parmesan reggiano, and truffle oil drizzle',
        category: 'Lunch & Dinner',
        cuisine: 'Italian',
        price: 490,
        isVeg: true,
        isAvailable: true,
        prepTime: 30,
        images: ['https://images.unsplash.com/photo-1633964913295-ceb43826e7c9?w=500&auto=format&fit=crop&q=60']
    },
    {
        name: 'Artisan Margherita Pizza',
        description: 'San Marzano tomato sauce, fresh mozzarella di bufala, basil leaves, extra virgin olive oil on hand-stretched crust',
        category: 'Lunch & Dinner',
        cuisine: 'Italian',
        price: 460,
        isVeg: true,
        isAvailable: true,
        prepTime: 25,
        images: ['https://images.unsplash.com/photo-1604382355076-af4b0eb60143?w=500&auto=format&fit=crop&q=60']
    },
    {
        name: 'Classic Belgian Chocolate Brownie',
        description: 'Warm fudge brownie served with vanilla bean ice cream and warm chocolate ganache drizzle',
        category: 'Desserts',
        cuisine: 'Bakery',
        price: 260,
        isVeg: true,
        isAvailable: true,
        prepTime: 10,
        images: ['https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=500&auto=format&fit=crop&q=60']
    },
    {
        name: 'Fresh Cold-Pressed Juice',
        description: 'Choice of fresh orange, watermelon-mint, or detox green apple & cucumber juice',
        category: 'Beverages',
        cuisine: 'Beverages',
        price: 180,
        isVeg: true,
        isAvailable: true,
        prepTime: 10,
        images: ['https://images.unsplash.com/photo-1613478223719-2ab802602423?w=500&auto=format&fit=crop&q=60']
    },
    {
        name: 'Signature Cappuccino / Latte',
        description: 'Freshly ground Arabica coffee beans brewed to perfection with silky textured milk foam',
        category: 'Beverages',
        cuisine: 'Beverages',
        price: 160,
        isVeg: true,
        isAvailable: true,
        prepTime: 8,
        images: ['https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=500&auto=format&fit=crop&q=60']
    }
]

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        let propertyId = searchParams.get('propertyId')

        // If no propertyId supplied, find from first available property
        if (!propertyId || propertyId === 'undefined' || propertyId === 'null') {
            const prop = await prisma.property.findFirst({ select: { id: true } })
            if (prop) propertyId = prop.id
        }

        let menuItems: any[] = []

        if (propertyId) {
            menuItems = await prisma.menuItem.findMany({
                where: {
                    propertyId,
                    isAvailable: true
                },
                orderBy: { category: 'asc' }
            })
        }

        // If no property-specific menu items found, look for any menu items in database
        if (menuItems.length === 0) {
            menuItems = await prisma.menuItem.findMany({
                where: { isAvailable: true },
                take: 50,
                orderBy: { category: 'asc' }
            })
        }

        // If still empty, return rich fallback default menu items
        if (menuItems.length === 0) {
            menuItems = DEFAULT_MENU_ITEMS.map((item, idx) => ({
                id: `default-menu-${idx + 1}`,
                propertyId: propertyId || 'default-property',
                margin: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                ...item
            }))
        }

        // Collect distinct categories
        const categories = Array.from(new Set(menuItems.map(item => item.category || 'General')))

        return NextResponse.json({
            success: true,
            categories: ['All', ...categories],
            menuItems
        })

    } catch (error: any) {
        console.error('[GUEST_MENU_GET_ERROR]', error)
        // Fallback gracefully on any DB glitch
        return NextResponse.json({
            success: true,
            categories: ['All', 'Breakfast', 'Lunch & Dinner', 'Snacks', 'Beverages', 'Desserts'],
            menuItems: DEFAULT_MENU_ITEMS.map((item, idx) => ({
                id: `default-menu-${idx + 1}`,
                propertyId: 'default',
                margin: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                ...item
            }))
        })
    }
}
