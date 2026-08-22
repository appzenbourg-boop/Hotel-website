'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import {
  Utensils, LayoutGrid, BellRing, UtensilsCrossed, ReceiptText, LogOut,
  Search, Plus, Minus, Trash2, ArrowRight, Check
} from 'lucide-react'
import { cn } from '@/lib/utils'

const fetcher = (url: string) => fetch(url).then(res => res.json())

const FALLBACK_MENU_ITEMS = [
  { id: 'item-1', name: 'Truffle Arancini', category: 'Starters', price: 18.00, description: 'Wild mushroom, parmesan cheese', image: 'https://images.unsplash.com/photo-1541532713592-79a0317b6b77?w=300&q=80' },
  { id: 'item-2', name: 'Pan Seared Salmon', category: 'Mains', price: 34.50, description: 'Atlantic salmon, grilled asparagus', image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=300&q=80' },
  { id: 'item-3', name: 'Wagyu Beef Burger', category: 'Mains', price: 26.00, description: 'Aged cheddar, onion jam', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&q=80' },
  { id: 'item-4', name: 'Smoked Old Fashioned', category: 'Drinks', price: 16.00, description: 'Bourbon, maple, walnut bitters', image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=300&q=80' },
  { id: 'item-5', name: 'Yuzu Cheesecake', category: 'Desserts', price: 12.00, description: 'Japanese citrus, graham crust', image: 'https://images.unsplash.com/photo-1524351199679-46cddf530c04?w=300&q=80' },
  { id: 'item-6', name: 'Oysters Rockefeller', category: 'Starters', price: 24.00, description: 'Half dozen, herb butter, parmesan crumbs', image: 'https://images.unsplash.com/photo-1553618551-fba689030290?w=300&q=80' }
]

export default function CreateOrderPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlTable = searchParams.get('table') || 'T-01'

  const { data: menuData, isLoading: isMenuLoading } = useSWR('/api/admin/content/menu', fetcher)
  
  const [selectedCategory, setSelectedCategory] = useState('All Items')
  const [searchQuery, setSearchQuery] = useState('')
  const [cart, setCart] = useState<{ [key: string]: any }>({})
  const [guestCount, setGuestCount] = useState(4)
  const [orderType, setOrderType] = useState('Dine In')
  const [isSending, setIsSending] = useState(false)

  // Use database menu items or fallback if empty
  const menuItems = React.useMemo(() => {
    if (menuData?.menuItems && menuData.menuItems.length > 0) {
      // Normalize database structure to fit
      return menuData.menuItems.map((item: any) => ({
        id: item.id,
        name: item.name,
        category: item.category === 'Beverages' ? 'Drinks' : item.category || 'Mains',
        price: item.price,
        description: item.description || '',
        image: item.images?.[0] || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&q=80'
      }))
    }
    return FALLBACK_MENU_ITEMS
  }, [menuData])

  const filteredMenuItems = menuItems.filter((item: any) => {
    const matchesCategory = selectedCategory === 'All Items' || item.category.toLowerCase() === selectedCategory.toLowerCase()
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const addToCart = (item: any) => {
    setCart(prev => {
      const existing = prev[item.id]
      return {
        ...prev,
        [item.id]: {
          ...item,
          quantity: existing ? existing.quantity + 1 : 1
        }
      }
    })
  }

  const updateQuantity = (itemId: string, amount: number) => {
    setCart(prev => {
      const item = prev[itemId]
      if (!item) return prev
      const newQty = item.quantity + amount
      if (newQty <= 0) {
        const copy = { ...prev }
        delete copy[itemId]
        return copy
      }
      return {
        ...prev,
        [itemId]: {
          ...item,
          quantity: newQty
        }
      }
    })
  }

  const clearCart = () => setCart({})

  const cartArray = Object.values(cart)
  const subtotal = cartArray.reduce((acc, item) => acc + (item.price * item.quantity), 0)
  const tax = subtotal * 0.085 // 8.5% tax
  const total = subtotal + tax

  const handleSendToKitchen = async () => {
    if (cartArray.length === 0) return
    setIsSending(true)

    try {
      const payload = {
        table: urlTable,
        guestName: `Guest of ${urlTable}`,
        status: 'PREPARING',
        tags: [orderType.toUpperCase()],
        items: cartArray.map(item => ({
          course: item.category === 'Starters' ? 'COURSE 1: STARTERS' : 'COURSE 2: MAINS',
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          price: item.price,
          image: item.image
        })),
        subtotal,
        tax,
        total
      }

      const res = await fetch('/api/admin/pos/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        router.push('/admin/pos')
      }
    } catch (error) {
      console.error('Error sending order:', error)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="flex h-full min-h-[calc(100vh-100px)] bg-[#0B1120] text-white -mx-6 md:-mx-8 -my-6 md:-my-8 overflow-hidden font-sans">
      
      {/* Middle Column - Menu Selector */}
      <div className="flex-1 bg-[#0F172A] border-r border-white/5 flex flex-col relative z-0">
        <div className="p-8 pb-4">
          
          {/* Categories Selector */}
          <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-white/10">
            {['All Items', 'Starters', 'Mains', 'Desserts', 'Drinks'].map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-6 py-3 rounded-2xl text-xs font-black tracking-wider uppercase transition-all duration-300",
                  selectedCategory === cat
                    ? "bg-[#1D4ED8] text-white shadow-lg shadow-blue-500/20"
                    : "bg-[#1E293B] text-gray-400 hover:text-white"
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative mt-4">
            <Search className="w-5 h-5 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search menu items..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[#1E293B] border border-white/5 rounded-3xl py-4 pl-12 pr-6 text-sm outline-none text-white focus:border-[#3B82F6] transition-colors"
            />
          </div>
        </div>

        {/* Menu Grid */}
        <div className="flex-1 overflow-y-auto p-8 pt-2 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 content-start">
          {filteredMenuItems.map((item: any) => {
            const cartItem = cart[item.id]
            const qty = cartItem ? cartItem.quantity : 0

            return (
              <div
                key={item.id}
                onClick={() => addToCart(item)}
                className={cn(
                  "relative flex flex-col rounded-3xl bg-[#1E293B] border border-white/5 hover:border-white/10 hover:bg-[#233648] transition-all duration-300 cursor-pointer overflow-hidden p-4 group",
                  qty > 0 && "ring-2 ring-[#3B82F6]"
                )}
              >
                {/* Image */}
                <div className="w-full h-44 rounded-2xl bg-[#0B1120] overflow-hidden relative shadow-inner">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  {qty > 0 && (
                    <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-[#3B82F6] flex items-center justify-center text-xs font-black shadow-lg">
                      {qty}
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="pt-4 flex flex-col flex-1">
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <h3 className="font-black text-white text-base leading-tight tracking-tight">{item.name}</h3>
                    <div className="text-base font-black text-[#3B82F6]">₹{item.price.toFixed(2)}</div>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2 mt-auto">{item.description}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Right Column - Cart Details */}
      <div className="w-[420px] bg-[#0B1120] flex flex-col z-0">
        
        {/* Cart Header */}
        <div className="p-8 pb-4 border-b border-white/5 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-white uppercase">Current Order</h2>
            <div className="text-xs text-gray-500 font-bold uppercase mt-1">Table {urlTable} • Server: Chef Julian</div>
          </div>
          {cartArray.length > 0 && (
            <button onClick={clearCart} className="p-3 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Guest count & order type */}
        <div className="p-8 py-4 border-b border-white/5 grid grid-cols-2 gap-4">
          <div className="bg-[#1E293B] border border-white/5 p-4 rounded-3xl flex flex-col justify-between">
            <span className="text-[10px] text-gray-500 font-black tracking-widest uppercase mb-2">Guest Count</span>
            <div className="flex items-center justify-between">
              <button onClick={() => setGuestCount(g => Math.max(1, g - 1))} className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center"><Minus className="w-3.5 h-3.5" /></button>
              <span className="text-lg font-black">{guestCount}</span>
              <button onClick={() => setGuestCount(g => g + 1)} className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center"><Plus className="w-3.5 h-3.5" /></button>
            </div>
          </div>

          <div className="bg-[#1E293B] border border-white/5 p-4 rounded-3xl flex flex-col justify-between">
            <span className="text-[10px] text-gray-500 font-black tracking-widest uppercase mb-2">Order Type</span>
            <select
              value={orderType}
              onChange={e => setOrderType(e.target.value)}
              className="bg-transparent font-bold text-white outline-none border-none cursor-pointer w-full"
            >
              <option value="Dine In" className="bg-[#1E293B] text-white">Dine In</option>
              <option value="Takeout" className="bg-[#1E293B] text-white">Takeout</option>
              <option value="Delivery" className="bg-[#1E293B] text-white">Delivery</option>
            </select>
          </div>
        </div>

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto p-8 space-y-4">
          {cartArray.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-600 gap-4">
              <ReceiptText className="w-16 h-16 opacity-10" />
              <div className="text-center">
                <div className="font-bold text-base text-gray-400">No items added yet</div>
                <div className="text-xs text-gray-500 mt-1">Tap a menu item to start order</div>
              </div>
            </div>
          ) : (
            cartArray.map(item => (
              <div key={item.id} className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5 group">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white/5 overflow-hidden">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{item.name}</h4>
                    <span className="text-xs text-[#3B82F6] font-black">₹{item.price.toFixed(2)}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <button onClick={() => updateQuantity(item.id, -1)} className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center"><Minus className="w-3.5 h-3.5" /></button>
                  <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, 1)} className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center"><Plus className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Subtotal & Action Bar */}
        <div className="p-8 border-t border-white/5 bg-[#0F172A] flex flex-col gap-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-400">
              <span>Subtotal</span>
              <span className="font-bold text-white">₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-400">
              <span>Tax (8.5%)</span>
              <span className="font-bold text-white">₹{tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-end pt-2 border-t border-white/5">
              <span className="text-sm text-gray-400 uppercase tracking-wider font-black">Total</span>
              <span className="text-4xl font-black text-[#3B82F6] tracking-tighter">₹{total.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex gap-4 h-[60px] mt-2">
            <button
              onClick={() => router.push('/admin/pos/floor-plan')}
              className="flex-1 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2 border border-white/5"
            >
              Cancel
            </button>
            <button
              onClick={handleSendToKitchen}
              disabled={cartArray.length === 0 || isSending}
              className={cn(
                "flex-[2] rounded-2xl font-black text-sm tracking-wide transition-all flex items-center justify-center gap-2",
                cartArray.length === 0 
                  ? "bg-gray-800 text-gray-600 cursor-not-allowed border border-white/5"
                  : "bg-[#2563EB] hover:bg-[#3B82F6] text-white shadow-[0_8px_20px_rgba(37,99,235,0.3)] hover:-translate-y-0.5 active:translate-y-0"
              )}
            >
              {isSending ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>Send to Kitchen <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </div>
        </div>

      </div>

    </div>
  )
}
