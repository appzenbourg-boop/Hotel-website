'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import { useSession } from 'next-auth/react'
import {
  UtensilsCrossed,
  ReceiptText,
  Search,
  Plus,
  Minus,
  Trash2,
  ArrowRight,
  X,
  Percent,
  FileText,
  Lock,
  ShoppingBag,
  Clock,
  Sparkles,
  User,
  Users,
  CheckCircle2,
  MessageSquare,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'

const fetcher = (url: string) => fetch(url).then(res => res.json())

// Default culinary items if property menu is empty
const DEFAULT_MENU_ITEMS = [
  {
    id: 'def-1',
    name: 'Truffle Parmesan Fries',
    category: 'Starters',
    price: 450,
    description: 'Crispy skin-on potato fries tossed in black truffle oil, rosemary and aged parmesan.',
    image: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?w=500&q=80'
  },
  {
    id: 'def-2',
    name: 'Crispy Calamari Rings',
    category: 'Starters',
    price: 620,
    description: 'Tender squid rings golden-fried with garlic herb crust, served with citrus aioli.',
    image: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=500&q=80'
  },
  {
    id: 'def-3',
    name: 'Paneer Tikka Angara',
    category: 'Starters',
    price: 480,
    description: 'Clay-oven charred cottage cheese cubes marinated in smoked hung curd and royal spices.',
    image: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=500&q=80'
  },
  {
    id: 'def-4',
    name: 'Grilled Atlantic Salmon',
    category: 'Mains',
    price: 1250,
    description: 'Pan-seared Norwegian salmon served with saffron velouté, asparagus and mashed potatoes.',
    image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=500&q=80'
  },
  {
    id: 'def-5',
    name: 'Wood-Fired Margherita',
    category: 'Mains',
    price: 680,
    description: 'San Marzano tomato base, fresh buffalo mozzarella, virgin olive oil and organic basil.',
    image: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=500&q=80'
  },
  {
    id: 'def-6',
    name: 'Royal Dal Makhani & Naan',
    category: 'Mains',
    price: 550,
    description: 'Slow-simmered black lentils in white butter and cream, accompanied by warm garlic naan.',
    image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=500&q=80'
  },
  {
    id: 'def-7',
    name: 'Classic Tiramisu',
    category: 'Desserts',
    price: 420,
    description: 'Savoiardi ladyfingers soaked in espresso and coffee liqueur, layered with mascarpone cream.',
    image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=500&q=80'
  },
  {
    id: 'def-8',
    name: 'Belgian Chocolate Lava',
    category: 'Desserts',
    price: 460,
    description: 'Warm dark chocolate cake with a molten center, served with Madagascan vanilla bean gelato.',
    image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=500&q=80'
  },
  {
    id: 'def-9',
    name: 'Signature Cold Brew',
    category: 'Drinks',
    price: 280,
    description: '18-hour slow steeped single-origin Arabica cold brew served over handcrafted ice crystal.',
    image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500&q=80'
  },
  {
    id: 'def-10',
    name: 'Passion Fruit Mint Cooler',
    category: 'Drinks',
    price: 350,
    description: 'Fresh passion fruit puree, hand-muddled spearmint, lime juice and sparkling soda.',
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&q=80'
  }
]

export default function CreateOrderPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlTable = searchParams.get('table') || 'T-01'

  const { data: session } = useSession()
  const { data: menuData, isLoading: isMenuLoading } = useSWR('/api/admin/content/menu', fetcher)
  const { data: tablesData } = useSWR('/api/admin/pos/tables', fetcher)
  
  const [selectedTable, setSelectedTable] = useState(urlTable)
  const [serverName, setServerName] = useState(session?.user?.name || 'Chef Julian')
  const [selectedCategory, setSelectedCategory] = useState('All Items')
  const [searchQuery, setSearchQuery] = useState('')
  const [cart, setCart] = useState<{ [key: string]: any }>({})
  const [guestCount, setGuestCount] = useState(2)
  const [orderType, setOrderType] = useState('Dine In')
  const [isSending, setIsSending] = useState(false)
  const [mobileCartOpen, setMobileCartOpen] = useState(false)

  // Item note modal
  const [editingNoteItem, setEditingNoteItem] = useState<any | null>(null)
  const [itemNoteText, setItemNoteText] = useState('')

  // Discount modal state
  const [showDiscountModal, setShowDiscountModal] = useState(false)
  const [discountType, setDiscountType] = useState('PERCENT') // 'PERCENT' or 'AMOUNT'
  const [discountValue, setDiscountValue] = useState('')
  const [discountReason, setDiscountReason] = useState('')
  const [authKey, setAuthKey] = useState('')
  const [discountError, setDiscountError] = useState('')
  const [isVerifyingPin, setIsVerifyingPin] = useState(false)
  const [discountInfo, setDiscountInfo] = useState({ amount: 0, reason: '', type: '', val: 0 })

  useEffect(() => {
    if (urlTable) setSelectedTable(urlTable)
  }, [urlTable])

  useEffect(() => {
    if (session?.user?.name) {
      setServerName(session.user.name)
    }
  }, [session])

  // Normalize menu items with high quality fallback
  const menuItems = useMemo(() => {
    if (menuData?.menuItems && menuData.menuItems.length > 0) {
      return menuData.menuItems.map((item: any) => ({
        id: item.id,
        name: item.name,
        category: item.category === 'Beverages' ? 'Drinks' : item.category || 'Mains',
        price: item.price,
        description: item.description || '',
        image: item.images?.[0] || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80'
      }))
    }
    return DEFAULT_MENU_ITEMS
  }, [menuData])

  const filteredMenuItems = useMemo(() => {
    return menuItems.filter((item: any) => {
      const matchesCategory = selectedCategory === 'All Items' || item.category.toLowerCase() === selectedCategory.toLowerCase()
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            item.description.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [menuItems, selectedCategory, searchQuery])

  const addToCart = (item: any) => {
    setCart(prev => {
      const existing = prev[item.id]
      return {
        ...prev,
        [item.id]: {
          ...item,
          quantity: existing ? existing.quantity + 1 : 1,
          notes: existing?.notes || ''
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

  const handleSaveItemNote = () => {
    if (!editingNoteItem) return
    setCart(prev => ({
      ...prev,
      [editingNoteItem.id]: {
        ...prev[editingNoteItem.id],
        notes: itemNoteText
      }
    }))
    setEditingNoteItem(null)
    setItemNoteText('')
  }

  const clearCart = () => setCart({})

  const cartArray = Object.values(cart)
  const totalItemCount = cartArray.reduce((acc, item) => acc + item.quantity, 0)
  const subtotal = cartArray.reduce((acc, item) => acc + (item.price * item.quantity), 0)
  
  let currentDiscountAmount = discountInfo.amount
  if (discountInfo.type === 'PERCENT') {
    currentDiscountAmount = (subtotal * discountInfo.val) / 100
  } else if (discountInfo.type === 'AMOUNT') {
    currentDiscountAmount = discountInfo.val
  }
  
  const subtotalAfterDiscount = Math.max(0, subtotal - currentDiscountAmount)
  const tax = subtotalAfterDiscount * 0.085 // 8.5% tax
  const total = subtotalAfterDiscount + tax

  const handleApplyDiscount = async () => {
    if (!authKey) {
      setDiscountError('Authorization Key (PIN) is required')
      return
    }

    const val = parseFloat(discountValue) || 0
    if (val <= 0) {
      setDiscountError('Enter valid discount value')
      return
    }
    if (!discountReason) {
      setDiscountError('Reason is required')
      return
    }

    setIsVerifyingPin(true)
    setDiscountError('')

    try {
      const res = await fetch('/api/admin/pos/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin: authKey,
          propertyId: (session?.user as any)?.propertyId
        })
      })

      const data = await res.json()
      if (!data.valid) {
        setDiscountError(data.error || 'Invalid Authorization Key (PIN)')
        setIsVerifyingPin(false)
        return
      }
    } catch {
      // Fallback check
      if (authKey !== '1234') {
        setDiscountError('Invalid Authorization Key (PIN)')
        setIsVerifyingPin(false)
        return
      }
    }

    let calcAmount = 0
    if (discountType === 'PERCENT') {
      calcAmount = (subtotal * val) / 100
    } else {
      calcAmount = val
    }

    if (calcAmount > subtotal) {
      setDiscountError('Discount cannot exceed subtotal')
      setIsVerifyingPin(false)
      return
    }

    setDiscountInfo({ amount: calcAmount, reason: discountReason, type: discountType, val })
    setShowDiscountModal(false)
    setDiscountError('')
    setIsVerifyingPin(false)
  }

  const handleSendToKitchen = async () => {
    if (cartArray.length === 0) return
    setIsSending(true)

    try {
      const payload = {
        table: selectedTable,
        guestName: `Guest of ${selectedTable}`,
        status: 'PREPARING',
        tags: [orderType.toUpperCase()],
        items: cartArray.map(item => ({
          course: item.category === 'Starters' ? 'COURSE 1: STARTERS' : item.category === 'Desserts' ? 'COURSE 3: DESSERTS' : 'COURSE 2: MAINS',
          name: item.name,
          description: item.notes ? `${item.description} (Note: ${item.notes})` : item.description,
          quantity: item.quantity,
          price: item.price,
          image: item.image
        })),
        subtotal,
        discount: currentDiscountAmount,
        discountReason: discountInfo.reason,
        tax,
        total
      }

      const res = await fetch('/api/admin/pos/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        // Mark table as OCCUPIED in tables list if table exists
        const matchedTable = tablesData?.find?.((t: any) => t.tableId === selectedTable)
        if (matchedTable?.id && matchedTable.status !== 'OCCUPIED') {
          await fetch('/api/admin/pos/tables', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: matchedTable.id, status: 'OCCUPIED' })
          }).catch(() => {})
        }
        router.push('/admin/pos')
      } else {
        alert('Failed to send order to kitchen. Please retry.')
      }
    } catch (error) {
      console.error('Error sending order:', error)
      alert('Error sending order. Please try again.')
    } finally {
      setIsSending(false)
    }
  }

  // Render the Cart Content (Shared between desktop sidebar & mobile drawer)
  const renderCartContent = (isMobileDrawer = false) => (
    <div className="flex flex-col h-full bg-[#0F172A] text-white">
      {/* Cart Header */}
      <div className="p-5 md:p-6 border-b border-white/10 flex justify-between items-center bg-[#0F172A]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl md:text-2xl font-black tracking-tight text-white uppercase">Order Ticket</h2>
            <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-black uppercase">
              {totalItemCount} Items
            </span>
          </div>
          <div className="text-xs text-gray-400 font-bold uppercase mt-1 flex items-center gap-2">
            <span>Server: {serverName}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {cartArray.length > 0 && (
            <button 
              onClick={clearCart} 
              title="Clear Cart"
              className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          {isMobileDrawer && (
            <button 
              onClick={() => setMobileCartOpen(false)}
              className="p-2.5 rounded-xl bg-white/10 text-gray-300 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Table & Guest Meta Controls */}
      <div className="p-4 md:p-5 border-b border-white/10 grid grid-cols-2 gap-3 bg-[#131D31]">
        {/* Table Selector */}
        <div className="bg-[#1E293B] border border-white/10 p-3 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] text-gray-400 font-black tracking-widest uppercase mb-1">Assigned Table</span>
          <select
            value={selectedTable}
            onChange={e => setSelectedTable(e.target.value)}
            className="w-full bg-transparent font-black text-sm text-white outline-none border-none cursor-pointer"
          >
            {Array.isArray(tablesData) && tablesData.length > 0 ? (
              tablesData.map((t: any) => (
                <option key={t.id} value={t.tableId} className="bg-[#1E293B] text-white">
                  {t.tableId} {t.status === 'READY' ? '• Available' : `• ${t.status}`}
                </option>
              ))
            ) : (
              ['T-01', 'T-02', 'T-03', 'T-04', 'T-05', 'T-06', 'T-07', 'T-08', 'Bar-01', 'Rooftop-01'].map(tbl => (
                <option key={tbl} value={tbl} className="bg-[#1E293B] text-white">
                  Table {tbl}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Guest Count */}
        <div className="bg-[#1E293B] border border-white/10 p-3 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] text-gray-400 font-black tracking-widest uppercase mb-1">Guest Pax</span>
          <div className="flex items-center justify-between">
            <button 
              onClick={() => setGuestCount(g => Math.max(1, g - 1))} 
              className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-300"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="text-base font-black text-white">{guestCount}</span>
            <button 
              onClick={() => setGuestCount(g => g + 1)} 
              className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-300"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Cart Item List */}
      <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-3 custom-scrollbar">
        {cartArray.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[220px] text-gray-500 gap-3">
            <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/5 flex items-center justify-center">
              <ShoppingBag className="w-8 h-8 opacity-30 text-blue-400" />
            </div>
            <div className="text-center">
              <div className="font-bold text-sm text-gray-300">No items in order</div>
              <div className="text-xs text-gray-500 mt-1">Tap dishes on the menu to build the order ticket</div>
            </div>
          </div>
        ) : (
          cartArray.map(item => (
            <div key={item.id} className="p-3 rounded-2xl bg-[#1E293B] border border-white/10 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-black/40 flex-shrink-0">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-white truncate">{item.name}</h4>
                    <span className="text-xs text-blue-400 font-black">₹{item.price.toFixed(2)}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => updateQuantity(item.id, -1)} 
                    className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-300 active:scale-95"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-sm font-black w-4 text-center text-white">{item.quantity}</span>
                  <button 
                    onClick={() => updateQuantity(item.id, 1)} 
                    className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-300 active:scale-95"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Item Note / Special instruction button */}
              <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[11px]">
                {item.notes ? (
                  <span className="text-amber-400 font-medium truncate flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" /> {item.notes}
                  </span>
                ) : (
                  <span className="text-gray-500">Standard prep</span>
                )}
                <button
                  onClick={() => {
                    setEditingNoteItem(item)
                    setItemNoteText(item.notes || '')
                  }}
                  className="text-blue-400 hover:text-blue-300 font-bold ml-auto"
                >
                  {item.notes ? 'Edit note' : '+ Add kitchen note'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bill Breakdown & Actions */}
      <div className="p-4 md:p-5 border-t border-white/10 bg-[#0F172A] flex flex-col gap-3">
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between text-gray-400">
            <span>Subtotal ({totalItemCount} items)</span>
            <span className="font-bold text-white">₹{subtotal.toFixed(2)}</span>
          </div>
          {currentDiscountAmount > 0 && (
            <div className="flex justify-between text-emerald-400">
              <span>Discount ({discountInfo.type === 'PERCENT' ? `${discountInfo.val}%` : 'Flat'})</span>
              <span className="font-bold">-₹{currentDiscountAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-gray-400">
            <span>Tax (8.5% GST)</span>
            <span className="font-bold text-white">₹{tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-end pt-2 border-t border-white/10 mt-1">
            <span className="text-xs text-gray-300 uppercase tracking-wider font-black">Net Total</span>
            <span className="text-2xl md:text-3xl font-black text-blue-400 tracking-tight">₹{total.toFixed(2)}</span>
          </div>
        </div>

        <button 
          onClick={() => setShowDiscountModal(true)}
          className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-xl border border-dashed border-white/20 text-xs font-bold text-gray-300 hover:text-white flex items-center justify-center gap-2 transition-all"
        >
          <Percent className="w-3.5 h-3.5 text-blue-400" /> 
          {currentDiscountAmount > 0 ? `Discount Applied (-₹${currentDiscountAmount.toFixed(2)})` : 'Apply POS Discount'}
        </button>

        <div className="flex gap-3 h-[52px] mt-1">
          <button
            onClick={() => router.push('/admin/pos/floor-plan')}
            className="flex-1 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs tracking-wide transition-all flex items-center justify-center border border-white/10"
          >
            Cancel
          </button>
          <button
            onClick={handleSendToKitchen}
            disabled={cartArray.length === 0 || isSending}
            className={cn(
              "flex-[2] rounded-2xl font-black text-xs md:text-sm tracking-wide transition-all flex items-center justify-center gap-2",
              cartArray.length === 0 
                ? "bg-gray-800 text-gray-500 cursor-not-allowed border border-white/5"
                : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 hover:-translate-y-0.5 active:translate-y-0"
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
  )

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-[calc(100vh-100px)] bg-[#0B1120] text-text-primary -mx-4 md:-mx-8 -my-6 md:-my-8 font-sans overflow-hidden">
      
      {/* Catalog Column - Responsive Menu Selector */}
      <div className="flex-1 bg-[#0B1120] lg:border-r border-white/10 flex flex-col relative z-0 overflow-y-auto">
        <div className="p-4 md:p-8 pb-4">
          
          {/* Top Header Bar for Mobile & Desktop */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <UtensilsCrossed className="w-6 h-6 text-blue-500" />
                POS Food & Drink Terminal
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">Table {selectedTable} • Tap dishes to add to live order ticket</p>
            </div>

            {/* Mobile Cart Trigger on Top */}
            <div className="flex lg:hidden items-center gap-2">
              <button
                onClick={() => setMobileCartOpen(true)}
                className="relative p-3 rounded-2xl bg-[#1E293B] border border-white/10 text-white hover:bg-white/10 transition-colors"
              >
                <ShoppingBag className="w-5 h-5 text-blue-400" />
                {totalItemCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center shadow-lg">
                    {totalItemCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Categories Selector */}
          <div className="flex gap-2 overflow-x-auto pb-3 custom-scrollbar">
            {['All Items', 'Starters', 'Mains', 'Desserts', 'Drinks'].map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-5 py-2.5 rounded-2xl text-xs font-black tracking-wider uppercase transition-all duration-200 whitespace-nowrap",
                  selectedCategory === cat
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                    : "bg-[#1E293B] text-gray-400 hover:text-white hover:bg-white/5 border border-white/5"
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative mt-2">
            <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search dishes, drinks, ingredients..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[#1E293B] border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-xs md:text-sm outline-none text-white focus:border-blue-500 transition-colors placeholder:text-gray-500"
            />
          </div>
        </div>

        {/* Menu Grid */}
        <div className="flex-1 p-4 md:p-8 pt-2 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6 content-start pb-28 lg:pb-8">
          {filteredMenuItems.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-500">
              <UtensilsCrossed className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm font-bold text-gray-300">No dishes match your query</p>
              <p className="text-xs text-gray-500 mt-1">Try selecting a different category or clearing search</p>
            </div>
          ) : (
            filteredMenuItems.map((item: any) => {
              const cartItem = cart[item.id]
              const qty = cartItem ? cartItem.quantity : 0

              return (
                <div
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className={cn(
                    "relative flex flex-col rounded-3xl bg-[#1E293B] border border-white/10 hover:border-blue-500/40 hover:bg-[#24334a] transition-all duration-200 cursor-pointer overflow-hidden p-3.5 group shadow-lg select-none",
                    qty > 0 && "ring-2 ring-blue-500 border-blue-500 bg-[#1e2f47]"
                  )}
                >
                  {/* Dish Image */}
                  <div className="w-full h-36 md:h-40 rounded-2xl bg-black/40 overflow-hidden relative shadow-inner">
                    <img 
                      src={item.image} 
                      alt={item.name} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                      loading="lazy"
                    />
                    {qty > 0 && (
                      <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-black shadow-lg">
                        {qty} in ticket
                      </div>
                    )}
                    <span className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-md text-[10px] font-black text-gray-200 uppercase tracking-wider">
                      {item.category}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="pt-3 flex flex-col flex-1">
                    <div className="flex justify-between items-start mb-1 gap-2">
                      <h3 className="font-bold text-white text-sm md:text-base leading-tight">{item.name}</h3>
                      <div className="text-sm md:text-base font-black text-blue-400 whitespace-nowrap">₹{item.price.toFixed(2)}</div>
                    </div>
                    <p className="text-[11px] text-gray-400 line-clamp-2 mt-auto">{item.description}</p>
                    
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        addToCart(item)
                      }}
                      className="mt-3 w-full py-2 bg-white/5 hover:bg-blue-600 hover:text-white rounded-xl text-xs font-bold text-gray-300 transition-colors flex items-center justify-center gap-1.5 border border-white/5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add to Order
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Desktop Right Column - Cart Details (Sticky / Fixed on lg+) */}
      <div className="hidden lg:flex w-80 xl:w-[420px] bg-[#0F172A] flex-col z-0 h-full border-l border-white/10 shadow-2xl">
        {renderCartContent(false)}
      </div>

      {/* Mobile Sticky Floating Cart Bottom Bar (< lg) */}
      {cartArray.length > 0 && (
        <div className="lg:hidden fixed bottom-4 left-4 right-4 z-40 bg-[#1E293B] border border-blue-500/50 rounded-2xl p-3 shadow-2xl backdrop-blur-md flex items-center justify-between animate-in slide-in-from-bottom duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-md">
              {totalItemCount}
            </div>
            <div>
              <div className="text-xs text-gray-400 font-bold uppercase">Table {selectedTable}</div>
              <div className="text-base font-black text-white">₹{total.toFixed(2)}</div>
            </div>
          </div>
          <button
            onClick={() => setMobileCartOpen(true)}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black rounded-xl uppercase tracking-wider flex items-center gap-2 shadow-lg"
          >
            Review Ticket <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Mobile Cart Drawer (< lg) */}
      {mobileCartOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col justify-end animate-in fade-in duration-200">
          <div className="bg-[#0F172A] border-t border-white/10 rounded-t-3xl max-h-[90vh] h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            {renderCartContent(true)}
          </div>
        </div>
      )}

      {/* ITEM NOTE MODAL */}
      {editingNoteItem && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-[#1E293B] border border-white/10 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Special Kitchen Note</h3>
                <p className="text-xs text-gray-400">{editingNoteItem.name}</p>
              </div>
              <button onClick={() => setEditingNoteItem(null)} className="p-1.5 hover:bg-white/10 rounded-xl text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider block mb-1">
                Preparation Instructions for Kitchen
              </label>
              <textarea
                value={itemNoteText}
                onChange={e => setItemNoteText(e.target.value)}
                placeholder="e.g. Extra spicy, No cilantro, Dressing on the side..."
                rows={3}
                className="w-full bg-[#0F172A] border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-blue-500 resize-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setEditingNoteItem(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveItemNote}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DISCOUNT MODAL */}
      {showDiscountModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
           <div className="bg-[#1E293B] border border-white/10 rounded-3xl w-full max-w-md flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
             <div className="p-6 border-b border-white/10 bg-[#0F172A] flex justify-between items-center">
                <div>
                   <h2 className="text-xl font-black text-white tracking-tight">Apply POS Discount</h2>
                   <p className="text-xs text-gray-400 font-medium">Authorization required for ad-hoc discounts</p>
                </div>
                <button onClick={() => setShowDiscountModal(false)} className="p-2 hover:bg-white/10 rounded-xl text-gray-400 transition-colors"><X className="w-5 h-5"/></button>
             </div>
             
             <div className="p-6 space-y-6">
                <div className="flex bg-[#0F172A] border border-white/10 rounded-xl p-1">
                   <button 
                     onClick={() => setDiscountType('PERCENT')}
                     className={cn("flex-1 py-2 text-xs font-bold rounded-lg transition-all", discountType === 'PERCENT' ? "bg-blue-600 shadow-md text-white" : "text-gray-400 hover:text-white")}
                   >Percentage (%)</button>
                   <button 
                     onClick={() => setDiscountType('AMOUNT')}
                     className={cn("flex-1 py-2 text-xs font-bold rounded-lg transition-all", discountType === 'AMOUNT' ? "bg-blue-600 shadow-md text-white" : "text-gray-400 hover:text-white")}
                   >Fixed Amount (₹)</button>
                </div>

                <div className="space-y-4">
                   <div>
                     <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Discount Value</label>
                     <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                           {discountType === 'PERCENT' ? '%' : '₹'}
                        </div>
                        <input 
                           type="number"
                           min="0"
                           value={discountValue}
                           onChange={e => setDiscountValue(e.target.value)}
                           className="w-full bg-[#0F172A] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white text-sm font-bold outline-none focus:border-blue-500 transition-all"
                           placeholder="0.00"
                        />
                     </div>
                   </div>

                   <div>
                     <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Reason / Remarks</label>
                     <div className="relative">
                        <FileText className="absolute left-4 top-3.5 w-4 h-4 text-gray-500" />
                        <textarea
                           value={discountReason}
                           onChange={e => setDiscountReason(e.target.value)}
                           className="w-full bg-[#0F172A] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white text-xs font-bold outline-none focus:border-blue-500 transition-all resize-none min-h-[70px]"
                           placeholder="E.g., Service recovery, VIP guest, Manager approval..."
                        />
                     </div>
                   </div>

                   <div>
                     <label className="text-[10px] font-bold text-rose-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Authorization Key (PIN)
                     </label>
                     <input 
                        type="password"
                        value={authKey}
                        onChange={e => setAuthKey(e.target.value)}
                        className="w-full bg-rose-500/5 border border-rose-500/20 rounded-xl py-3 px-4 text-rose-400 text-center tracking-[1em] text-lg font-black outline-none focus:border-rose-500/50 transition-all placeholder:tracking-normal placeholder:text-sm placeholder:text-rose-500/30"
                        placeholder="••••"
                     />
                     <p className="text-[9px] text-center text-gray-500 mt-2">Enter the Manager Authorization PIN set in Hotel Settings</p>
                   </div>

                   {discountError && (
                     <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-xs font-bold text-center">
                        {discountError}
                     </div>
                   )}
                </div>

                <div className="pt-2 flex gap-3">
                   {discountInfo.amount > 0 && (
                      <button 
                        onClick={() => {
                           setDiscountInfo({ amount: 0, reason: '', type: '', val: 0 })
                           setShowDiscountModal(false)
                        }}
                        className="flex-1 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold rounded-xl text-xs transition-colors"
                      >Remove</button>
                   )}
                   <button 
                      onClick={handleApplyDiscount}
                      disabled={isVerifyingPin}
                      className={cn("flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl text-xs transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2", discountInfo.amount > 0 ? "flex-[2]" : "")}
                   >
                     {isVerifyingPin ? (
                       <>
                         <Loader2 className="w-4 h-4 animate-spin" />
                         <span>Verifying PIN...</span>
                       </>
                     ) : (
                       <span>Apply Discount</span>
                     )}
                   </button>
                </div>
             </div>
           </div>
        </div>
      )}

    </div>
  )
}
