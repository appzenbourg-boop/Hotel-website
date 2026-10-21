'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ArrowLeft, Clock, Send, Utensils, Search, Plus, Minus, ShoppingBag, X, Sparkles, ChefHat, Check, AlertCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface MenuItem {
    id: string
    name: string
    description?: string
    category: string
    cuisine?: string
    price: number
    isVeg: boolean
    isAvailable: boolean
    prepTime?: number
    images?: string[]
}

interface CartItem {
    item: MenuItem
    quantity: number
}

function ServiceRequestContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const category = (searchParams.get('category') || 'HOUSEKEEPING').toUpperCase()
    const roomId = searchParams.get('roomId')

    // Standard service request state
    const [request, setRequest] = useState({
        item: '',
        description: '',
        priority: 'NORMAL'
    })
    const [submitting, setSubmitting] = useState(false)

    // Dining / Menu state
    const [menuItems, setMenuItems] = useState<MenuItem[]>([])
    const [menuCategories, setMenuCategories] = useState<string[]>([])
    const [selectedCategory, setSelectedCategory] = useState<string>('All')
    const [searchQuery, setSearchQuery] = useState('')
    const [vegOnly, setVegOnly] = useState(false)
    const [cart, setCart] = useState<Record<string, CartItem>>({})
    const [showTrayModal, setShowTrayModal] = useState(false)
    const [diningNotes, setDiningNotes] = useState('')
    const [diningTiming, setDiningTiming] = useState<'ASAP' | 'LATER'>('ASAP')
    const [menuLoading, setMenuLoading] = useState(false)

    // Common requests by category for quick selection
    const quickOptions: Record<string, string[]> = {
        HOUSEKEEPING: ['Extra Towels', 'Room Cleaning', 'Toiletries Refill', 'Turn-down Service', 'Extra Pillows', 'Bed Linen Change'],
        CONCIERGE: ['Taxi Booking', 'Luggage Assistance', 'Wake-up Call', 'City Guide & Map', 'Airport Shuttle Inquiry'],
        MAINTENANCE: ['AC Temperature Issue', 'TV / Remote Not Working', 'Plumbing Issue', 'Light Bulb Replacement', 'Wi-Fi Connection Issue']
    }

    // Fetch hotel menu if category is DINING
    useEffect(() => {
        if (category === 'DINING') {
            setMenuLoading(true)
            fetch('/api/guest/menu')
                .then(res => res.json())
                .then(data => {
                    if (data.success && Array.isArray(data.menuItems)) {
                        setMenuItems(data.menuItems)
                        setMenuCategories(data.categories || ['All', 'Breakfast', 'Lunch & Dinner', 'Snacks', 'Beverages', 'Desserts'])
                    }
                })
                .catch(err => {
                    console.error('Error fetching guest menu:', err)
                    toast.error('Failed to load menu')
                })
                .finally(() => setMenuLoading(false))
        }
    }, [category])

    // Cart calculations
    const cartItemsList = useMemo(() => Object.values(cart), [cart])
    const cartTotalCount = useMemo(() => cartItemsList.reduce((acc, c) => acc + c.quantity, 0), [cartItemsList])
    const cartTotalPrice = useMemo(() => cartItemsList.reduce((acc, c) => acc + (c.quantity * c.item.price), 0), [cartItemsList])

    const handleAddToCart = (item: MenuItem) => {
        setCart(prev => {
            const current = prev[item.id]
            const newQty = (current?.quantity || 0) + 1
            return {
                ...prev,
                [item.id]: { item, quantity: newQty }
            }
        })
    }

    const handleRemoveFromCart = (itemId: string) => {
        setCart(prev => {
            const current = prev[itemId]
            if (!current) return prev
            if (current.quantity <= 1) {
                const next = { ...prev }
                delete next[itemId]
                return next
            }
            return {
                ...prev,
                [itemId]: { ...current, quantity: current.quantity - 1 }
            }
        })
    }

    // Filtered menu items
    const filteredMenuItems = useMemo(() => {
        return menuItems.filter(item => {
            if (selectedCategory !== 'All' && item.category !== selectedCategory) return false
            if (vegOnly && !item.isVeg) return false
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase()
                const matchesName = item.name.toLowerCase().includes(q)
                const matchesDesc = (item.description || '').toLowerCase().includes(q)
                const matchesCuisine = (item.cuisine || '').toLowerCase().includes(q)
                if (!matchesName && !matchesDesc && !matchesCuisine) return false
            }
            return true
        })
    }, [menuItems, selectedCategory, vegOnly, searchQuery])

    // Standard service request submission
    const handleStandardSubmit = async () => {
        if (!request.item) {
            toast.error('Please select or describe a service')
            return
        }

        setSubmitting(true)
        try {
            const guestId = localStorage.getItem('zenbourg_guest_id')
            const res = await fetch('/api/guest/services', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...request, category, guestId, roomId })
            })

            if (res.ok) {
                toast.success('Request received! Hotel team has been notified.')
                setTimeout(() => router.push('/guest/my-requests'), 1000)
            } else {
                toast.error('Failed to submit request')
            }
        } catch (e) {
            toast.error('Network error')
        } finally {
            setSubmitting(false)
        }
    }

    // Food Order submission
    const handlePlaceFoodOrder = async () => {
        if (cartTotalCount === 0) {
            toast.error('Your tray is empty. Please add items to order.')
            return
        }

        setSubmitting(true)
        try {
            const guestId = localStorage.getItem('zenbourg_guest_id')
            const itemsSummary = cartItemsList
                .map(c => `${c.quantity}x ${c.item.name} (₹${c.quantity * c.item.price})`)
                .join(', ')

            const res = await fetch('/api/guest/services', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    category: 'FOOD_ORDER',
                    item: `In-Room Dining (${cartTotalCount} items)`,
                    description: `Items: ${itemsSummary}${diningNotes ? `\nInstructions: ${diningNotes}` : ''}`,
                    amount: cartTotalPrice,
                    priority: diningTiming === 'ASAP' ? 'URGENT' : 'NORMAL',
                    guestId,
                    roomId,
                    notes: {
                        items: cartItemsList.map(c => ({
                            id: c.item.id,
                            name: c.item.name,
                            quantity: c.quantity,
                            price: c.item.price,
                            isVeg: c.item.isVeg
                        })),
                        instructions: diningNotes,
                        timing: diningTiming,
                        totalAmount: cartTotalPrice
                    }
                })
            })

            if (res.ok) {
                toast.success('Food order placed! Kitchen is preparing your dishes.')
                setCart({})
                setShowTrayModal(false)
                setTimeout(() => router.push('/guest/my-requests'), 1200)
            } else {
                toast.error('Failed to place food order. Please contact Front Desk.')
            }
        } catch (e) {
            toast.error('Network error')
        } finally {
            setSubmitting(false)
        }
    }

    const isDining = category === 'DINING'

    return (
        <div className="min-h-screen bg-[#0A0E1A] text-white pb-32 font-sans selection:bg-[#4A9EFF]/30 relative overflow-hidden">
            {/* Background Glows */}
            <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#4A9EFF15] blur-[120px] rounded-full pointer-events-none" />
            <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#805ad515] blur-[120px] rounded-full pointer-events-none" />

            {/* Top Navigation */}
            <div className="p-4 sm:p-5 flex items-center justify-between bg-white/[0.02] backdrop-blur-2xl sticky top-0 z-30 border-b border-white/[0.05]">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.back()}
                        className="p-2.5 rounded-xl hover:bg-white/[0.06] bg-white/[0.03] transition-all border border-white/[0.05]"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-300" />
                    </button>
                    <div>
                        <h1 className="text-lg sm:text-xl font-bold capitalize bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                            {isDining ? 'In-Room Dining' : `${category.toLowerCase()} Service`}
                        </h1>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                            {isDining ? 'Hotel Kitchen Menu' : 'Guest Request'}
                        </p>
                    </div>
                </div>

                {isDining && cartTotalCount > 0 && (
                    <button
                        onClick={() => setShowTrayModal(true)}
                        className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#4A9EFF] text-white text-xs font-black shadow-lg shadow-[#4A9EFF]/30 active:scale-95 transition-all"
                    >
                        <ShoppingBag className="w-4 h-4" />
                        <span>Tray ({cartTotalCount})</span>
                    </button>
                )}
            </div>

            <main className="p-4 sm:p-6 max-w-lg mx-auto relative z-10 space-y-6">
                {/* ── DINING / HOTEL FOOD MENU VIEW ── */}
                {isDining ? (
                    <div className="space-y-5">
                        {/* Chef Greeting */}
                        <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-slate-900/40 border border-white/10 flex items-center gap-3.5">
                            <div className="w-11 h-11 rounded-xl bg-[#4A9EFF]/20 border border-[#4A9EFF]/30 flex items-center justify-center text-[#4A9EFF] shrink-0">
                                <ChefHat className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-white">Fresh In-Room Dining</h3>
                                <p className="text-xs text-gray-400">Handcrafted by executive chefs, served warm to your door</p>
                            </div>
                        </div>

                        {/* Search & Veg Filter */}
                        <div className="space-y-3">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search dishes, drinks, cuisine..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-white/[0.03] border border-white/10 rounded-2xl text-xs font-medium text-white placeholder:text-gray-500 focus:outline-none focus:border-[#4A9EFF]/50 transition-all"
                                />
                            </div>

                            <div className="flex items-center justify-between px-1">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setVegOnly(!vegOnly)}
                                        className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all flex items-center gap-1.5 ${
                                            vegOnly
                                                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                                                : 'bg-white/[0.02] border-white/10 text-gray-400 hover:text-white'
                                        }`}
                                    >
                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                                        <span>Veg Only</span>
                                    </button>
                                </div>
                                <span className="text-[11px] text-gray-400 font-medium">
                                    {filteredMenuItems.length} dishes available
                                </span>
                            </div>
                        </div>

                        {/* Category Tabs */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                            {menuCategories.map(cat => {
                                const isSelected = selectedCategory === cat
                                return (
                                    <button
                                        key={cat}
                                        onClick={() => setSelectedCategory(cat)}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                                            isSelected
                                                ? 'bg-[#4A9EFF] text-white border-[#4A9EFF] shadow-lg shadow-[#4A9EFF]/20'
                                                : 'bg-white/[0.02] border-white/10 text-gray-400 hover:bg-white/[0.05] hover:text-white'
                                        }`}
                                    >
                                        {cat}
                                    </button>
                                )
                            })}
                        </div>

                        {/* Menu Items List */}
                        {menuLoading ? (
                            <div className="py-20 flex flex-col items-center justify-center gap-3">
                                <Loader2 className="w-8 h-8 text-[#4A9EFF] animate-spin" />
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Loading Hotel Menu...</p>
                            </div>
                        ) : filteredMenuItems.length === 0 ? (
                            <div className="text-center py-16 space-y-3">
                                <p className="text-sm font-bold text-gray-300">No dishes match your filter</p>
                                <p className="text-xs text-gray-500">Try changing your search query or category.</p>
                            </div>
                        ) : (
                            <div className="space-y-3.5">
                                {filteredMenuItems.map(item => {
                                    const inCart = cart[item.id]
                                    const qty = inCart?.quantity || 0

                                    return (
                                        <div
                                            key={item.id}
                                            className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-white/20 transition-all flex gap-3.5 backdrop-blur-md"
                                        >
                                            {/* Item Image */}
                                            {item.images?.[0] && (
                                                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden shrink-0 bg-white/5 border border-white/10 relative">
                                                    <img
                                                        src={item.images[0]}
                                                        alt={item.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                    {/* Veg / Non-Veg badge */}
                                                    <div className="absolute top-1.5 left-1.5 bg-black/60 backdrop-blur-sm p-1 rounded-md border border-white/10">
                                                        <div className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center ${
                                                            item.isVeg ? 'border-emerald-500' : 'border-rose-500'
                                                        }`}>
                                                            <div className={`w-1.5 h-1.5 rounded-full ${
                                                                item.isVeg ? 'bg-emerald-500' : 'bg-rose-500'
                                                            }`} />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Item Info */}
                                            <div className="flex-1 flex flex-col justify-between min-w-0">
                                                <div>
                                                    <div className="flex items-start justify-between gap-1 mb-1">
                                                        <h4 className="text-sm font-bold text-white leading-snug truncate pr-1">
                                                            {item.name}
                                                        </h4>
                                                        <span className="text-sm font-black text-white shrink-0">
                                                            ₹{item.price}
                                                        </span>
                                                    </div>

                                                    {item.description && (
                                                        <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed mb-2">
                                                            {item.description}
                                                        </p>
                                                    )}

                                                    <div className="flex items-center gap-2 text-[10px] text-gray-400 font-medium">
                                                        {item.cuisine && (
                                                            <span className="px-2 py-0.5 rounded-md bg-white/[0.04] text-gray-300">
                                                                {item.cuisine}
                                                            </span>
                                                        )}
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="w-3 h-3 text-[#4A9EFF]" />
                                                            {item.prepTime || 20}m
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Action Button */}
                                                <div className="pt-2 flex justify-end">
                                                    {qty === 0 ? (
                                                        <button
                                                            onClick={() => handleAddToCart(item)}
                                                            className="px-4 py-1.5 rounded-xl bg-[#4A9EFF]/15 hover:bg-[#4A9EFF] text-[#4A9EFF] hover:text-white border border-[#4A9EFF]/30 text-xs font-black uppercase tracking-wider transition-all active:scale-95 flex items-center gap-1 shadow-sm"
                                                        >
                                                            <Plus className="w-3.5 h-3.5" />
                                                            <span>Add</span>
                                                        </button>
                                                    ) : (
                                                        <div className="flex items-center bg-[#4A9EFF] text-white rounded-xl shadow-lg shadow-[#4A9EFF]/20 border border-[#4A9EFF] overflow-hidden">
                                                            <button
                                                                onClick={() => handleRemoveFromCart(item.id)}
                                                                className="px-2.5 py-1.5 hover:bg-black/20 active:scale-90 transition-all"
                                                            >
                                                                <Minus className="w-3 h-3" />
                                                            </button>
                                                            <span className="px-2 text-xs font-black min-w-[20px] text-center">
                                                                {qty}
                                                            </span>
                                                            <button
                                                                onClick={() => handleAddToCart(item)}
                                                                className="px-2.5 py-1.5 hover:bg-black/20 active:scale-90 transition-all"
                                                            >
                                                                <Plus className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                ) : (
                    /* ── STANDARD SERVICES VIEW (HOUSEKEEPING / CONCIERGE / MAINTENANCE) ── */
                    <div className="space-y-6">
                        <div className="flex items-start gap-4 mb-2">
                            <div className="w-12 h-12 bg-gradient-to-br from-[#4A9EFF] to-[#3A8EEF] rounded-2xl flex items-center justify-center shadow-lg shadow-[#4A9EFF]/20 shrink-0">
                                <span className="text-white font-bold">Z</span>
                            </div>
                            <div className="bg-white/[0.03] p-5 rounded-2xl rounded-tl-none border border-white/10 shadow-xl max-w-[85%] backdrop-blur-md">
                                <p className="text-sm text-gray-300 leading-relaxed">
                                    Hello! How can we assist you with <span className="text-[#4A9EFF] font-bold lowercase">{category}</span> today?
                                </p>
                            </div>
                        </div>

                        {/* Quick Options */}
                        {quickOptions[category] && (
                            <div>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-3 pl-1">
                                    Popular Requests
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {quickOptions[category].map(opt => (
                                        <button
                                            key={opt}
                                            onClick={() => setRequest({ ...request, item: opt })}
                                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                                                request.item === opt
                                                    ? 'bg-[#4A9EFF] text-white border-[#4A9EFF] shadow-[0_0_15px_rgba(74,158,255,0.3)] scale-105'
                                                    : 'bg-white/[0.02] border-white/10 text-gray-400 hover:bg-white/[0.06] hover:text-white'
                                            }`}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 pl-1">
                                    Describe your request
                                </label>
                                <input
                                    type="text"
                                    className="w-full bg-white/[0.02] border border-white/10 rounded-2xl px-5 py-3.5 text-white text-xs font-medium focus:ring-2 focus:ring-[#4A9EFF]/50 focus:border-[#4A9EFF]/50 outline-none transition-all placeholder:text-gray-600"
                                    placeholder="e.g. Extra blanket, luggage pick-up..."
                                    value={request.item}
                                    onChange={e => setRequest({ ...request, item: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 pl-1">
                                    Special Instructions (Optional)
                                </label>
                                <textarea
                                    className="w-full bg-white/[0.02] border border-white/10 rounded-2xl px-5 py-3 text-white text-xs font-medium focus:ring-2 focus:ring-[#4A9EFF]/50 focus:border-[#4A9EFF]/50 outline-none transition-all placeholder:text-gray-600 min-h-[90px] resize-none"
                                    placeholder="e.g. Please ring doorbell twice, do not disturb before 10 AM..."
                                    value={request.description}
                                    onChange={e => setRequest({ ...request, description: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 pl-1">
                                    Urgency
                                </label>
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setRequest({ ...request, priority: 'URGENT' })}
                                        className={`flex-1 py-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                                            request.priority === 'URGENT'
                                                ? 'bg-red-500/10 border-red-500/50 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.15)]'
                                                : 'bg-white/[0.02] border-white/10 text-gray-400 hover:text-white'
                                        }`}
                                    >
                                        <Clock className="w-3.5 h-3.5" /> Urgent
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setRequest({ ...request, priority: 'NORMAL' })}
                                        className={`flex-1 py-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                                            request.priority === 'NORMAL'
                                                ? 'bg-[#4A9EFF]/10 border-[#4A9EFF]/50 text-[#4A9EFF] shadow-[0_0_15px_rgba(74,158,255,0.15)]'
                                                : 'bg-white/[0.02] border-white/10 text-gray-400 hover:text-white'
                                        }`}
                                    >
                                        <Clock className="w-3.5 h-3.5" /> Normal
                                    </button>
                                </div>
                            </div>
                        </div>

                        <button
                            className="w-full bg-[#4A9EFF] text-white py-4 rounded-2xl font-bold text-sm shadow-[0_10px_30px_rgba(74,158,255,0.3)] hover:bg-[#3A8EEF] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-6"
                            onClick={handleStandardSubmit}
                            disabled={submitting}
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Submitting...</span>
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    <span>Submit Request</span>
                                </>
                            )}
                        </button>
                    </div>
                )}
            </main>

            {/* ── FLOATING TRAY BAR FOR IN-ROOM DINING ── */}
            {isDining && cartTotalCount > 0 && (
                <div className="fixed bottom-6 left-0 right-0 z-40 px-4 max-w-md mx-auto animate-in slide-in-from-bottom-5 duration-300">
                    <div className="p-3.5 rounded-2xl bg-[#0E1322] border border-[#4A9EFF]/40 shadow-2xl shadow-black/80 flex items-center justify-between backdrop-blur-xl">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#4A9EFF] flex items-center justify-center text-white shadow-md">
                                <ShoppingBag className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xs font-black text-white">{cartTotalCount} {cartTotalCount === 1 ? 'item' : 'items'} in Tray</p>
                                <p className="text-xs font-bold text-[#4A9EFF]">₹{cartTotalPrice.toLocaleString('en-IN')}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowTrayModal(true)}
                            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#4A9EFF] to-[#3A8EEF] hover:from-[#3A8EEF] hover:to-[#2A7EDF] text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-[#4A9EFF]/30 active:scale-95 transition-all"
                        >
                            Review & Order →
                        </button>
                    </div>
                </div>
            )}

            {/* ── TRAY / CHECKOUT REVIEW MODAL ── */}
            {showTrayModal && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="relative w-full max-w-md bg-[#0E1322] border border-white/10 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl max-h-[85vh] flex flex-col overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between pb-3.5 border-b border-white/10 shrink-0">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-[#4A9EFF]/20 border border-[#4A9EFF]/30 flex items-center justify-center text-[#4A9EFF]">
                                    <Utensils className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-white">Your Food Tray</h3>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                        Room {roomId || '---'} Delivery
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowTrayModal(false)}
                                className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 hover:text-white transition-all"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Items list */}
                        <div className="overflow-y-auto py-4 space-y-3 flex-1 pr-1">
                            {cartItemsList.map(c => (
                                <div key={c.item.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-white truncate">{c.item.name}</p>
                                        <p className="text-[11px] text-gray-400">₹{c.item.price} each</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center bg-white/[0.05] rounded-lg border border-white/10">
                                            <button
                                                onClick={() => handleRemoveFromCart(c.item.id)}
                                                className="px-2 py-1 hover:text-white text-gray-400"
                                            >
                                                <Minus className="w-3 h-3" />
                                            </button>
                                            <span className="px-1.5 text-xs font-bold text-white">{c.quantity}</span>
                                            <button
                                                onClick={() => handleAddToCart(c.item)}
                                                className="px-2 py-1 hover:text-white text-gray-400"
                                            >
                                                <Plus className="w-3 h-3" />
                                            </button>
                                        </div>
                                        <span className="text-xs font-black text-white min-w-[50px] text-right">
                                            ₹{c.quantity * c.item.price}
                                        </span>
                                    </div>
                                </div>
                            ))}

                            {/* Kitchen instructions */}
                            <div className="pt-2">
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                                    Special Kitchen Instructions
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Extra spicy, no onions, cutlery for 2..."
                                    value={diningNotes}
                                    onChange={e => setDiningNotes(e.target.value)}
                                    className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-[#4A9EFF]/50"
                                />
                            </div>

                            {/* Delivery timing */}
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                                    Delivery Timing
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setDiningTiming('ASAP')}
                                        className={`py-2.5 rounded-xl border text-xs font-bold transition-all ${
                                            diningTiming === 'ASAP'
                                                ? 'bg-[#4A9EFF]/20 border-[#4A9EFF] text-white shadow-sm'
                                                : 'bg-white/[0.02] border-white/10 text-gray-400'
                                        }`}
                                    >
                                        ⚡ ASAP (20-30 mins)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDiningTiming('LATER')}
                                        className={`py-2.5 rounded-xl border text-xs font-bold transition-all ${
                                            diningTiming === 'LATER'
                                                ? 'bg-[#4A9EFF]/20 border-[#4A9EFF] text-white shadow-sm'
                                                : 'bg-white/[0.02] border-white/10 text-gray-400'
                                        }`}
                                    >
                                        🕒 Schedule Later
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Order Summary & Submit */}
                        <div className="pt-4 border-t border-white/10 shrink-0 space-y-3">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-400">Total Food Bill</span>
                                <span className="text-base font-black text-white">₹{cartTotalPrice.toLocaleString('en-IN')}</span>
                            </div>
                            <p className="text-[10px] text-gray-500">
                                * Amount will be added to your room folio to be settled at checkout.
                            </p>
                            <button
                                type="button"
                                disabled={submitting}
                                onClick={handlePlaceFoodOrder}
                                className="w-full py-4 rounded-xl bg-gradient-to-r from-[#4A9EFF] to-[#3A8EEF] text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-[#4A9EFF]/30 hover:bg-[#3A8EEF] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Sending to Kitchen...</span>
                                    </>
                                ) : (
                                    <>
                                        <Utensils className="w-4 h-4" />
                                        <span>Confirm & Place Order</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default function ServiceRequestPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#0A0E1A] flex flex-col items-center justify-center text-gray-500 gap-4">
                <div className="w-8 h-8 border-2 border-[#4A9EFF] border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-bold uppercase tracking-widest animate-pulse text-[#4A9EFF]">Loading Services...</p>
            </div>
        }>
            <ServiceRequestContent />
        </Suspense>
    )
}
