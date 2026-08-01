'use client'

import React, { useState, useEffect, useMemo } from 'react'
import useSWR from 'swr'
import { useSession } from 'next-auth/react'
import { buildContextUrl } from '@/lib/admin-context'
import {
    Coffee, Utensils, Download, Plus, Search, Filter, RefreshCw,
    Clock, CheckCircle2, AlertCircle, ShoppingBag, User, Building2,
    Banknote, CreditCard, Smartphone, Check, Eye, Trash2, ShieldCheck,
    ChefHat, Flame, PieChart as PieIcon, ArrowRight, Loader2, X
} from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { cn, formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Textarea from '@/components/ui/Textarea'

export default function HotelCafePage() {
    const { data: session } = useSession()
    const [activeTab, setActiveTab] = useState<'menu' | 'orders' | 'analytics'>('menu')
    const [menuFilter, setMenuFilter] = useState('ALL')
    const [orderStatusFilter, setOrderStatusFilter] = useState('ALL')

    // Modals
    const [showAddItemModal, setShowAddItemModal] = useState(false)
    const [showImportModal, setShowImportModal] = useState(false)
    const [showAddBuffetModal, setShowAddBuffetModal] = useState(false)
    const [showPosModal, setShowPosModal] = useState(false)

    // Form States
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [newItem, setNewItem] = useState({
        name: '', category: 'Coffee & Tea', price: '', isVeg: true, prepTime: '15', description: '', image: ''
    })
    const [newBuffet, setNewBuffet] = useState({
        name: '', price: '', description: '', dishesInput: ''
    })
    const [selectedImportIds, setSelectedImportIds] = useState<string[]>([])

    // POS Cart State
    const [posOrder, setPosOrder] = useState<{
        type: 'ROOM_GUEST' | 'WALK_IN'
        roomNumber: string
        guestName: string
        paymentMethod: 'CASH' | 'CARD' | 'ONLINE' | 'ROOM_BILL'
        assignedStaffId: string
        notes: string
        cart: Record<string, { item: any, quantity: number }>
    }>({
        type: 'ROOM_GUEST',
        roomNumber: '',
        guestName: '',
        paymentMethod: 'CASH',
        assignedStaffId: '',
        notes: '',
        cart: {}
    })

    // Fetch live Cafe data
    const { data: rawData, mutate, isLoading } = useSWR(
        buildContextUrl('/api/admin/cafe'),
        (url) => fetch(url).then(res => res.json())
    )

    const cafeData = rawData?.data || {
        menu: [], buffetPackages: [], orders: [], hotelMenu: [], staffList: [],
        analytics: { todaySales: 0, todayOrdersCount: 0, avgOrderValue: 0, paymentBreakdown: [] }
    }

    // Filtered Menu Items
    const filteredMenu = useMemo(() => {
        if (menuFilter === 'ALL') return cafeData.menu
        if (menuFilter === 'BUFFET') return cafeData.buffetPackages
        return cafeData.menu.filter((m: any) => m.category === menuFilter)
    }, [cafeData.menu, cafeData.buffetPackages, menuFilter])

    // Filtered Orders
    const filteredOrders = useMemo(() => {
        if (orderStatusFilter === 'ALL') return cafeData.orders
        return cafeData.orders.filter((o: any) => o.status === orderStatusFilter)
    }, [cafeData.orders, orderStatusFilter])

    // Handlers
    const handleCreateMenuItem = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newItem.name || !newItem.price) return toast.error('Item name and price are required')
        setIsSubmitting(true)
        try {
            const res = await fetch('/api/admin/cafe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'CREATE_MENU_ITEM', ...newItem })
            })
            if (res.ok) {
                toast.success('Cafe menu item added successfully')
                setShowAddItemModal(false)
                setNewItem({ name: '', category: 'Coffee & Tea', price: '', isVeg: true, prepTime: '15', description: '', image: '' })
                mutate()
            } else {
                toast.error('Failed to add menu item')
            }
        } catch {
            toast.error('Something went wrong')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleImportHotelMenu = async () => {
        setIsSubmitting(true)
        try {
            const res = await fetch('/api/admin/cafe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'IMPORT_HOTEL_MENU', itemIds: selectedImportIds })
            })
            if (res.ok) {
                const json = await res.json()
                toast.success(`Successfully imported ${json.count || 'all'} menu items from Hotel F&B`)
                setShowImportModal(false)
                setSelectedImportIds([])
                mutate()
            } else {
                toast.error('Failed to import hotel menu')
            }
        } catch {
            toast.error('Something went wrong')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleCreateBuffetPackage = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newBuffet.name || !newBuffet.price) return toast.error('Package name and price are required')
        setIsSubmitting(true)
        try {
            const dishes = newBuffet.dishesInput.split(',').map(d => d.trim()).filter(Boolean)
            const res = await fetch('/api/admin/cafe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'CREATE_BUFFET_PACKAGE', ...newBuffet, dishes })
            })
            if (res.ok) {
                toast.success('Buffet package created successfully')
                setShowAddBuffetModal(false)
                setNewBuffet({ name: '', price: '', description: '', dishesInput: '' })
                mutate()
            } else {
                toast.error('Failed to create buffet package')
            }
        } catch {
            toast.error('Something went wrong')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleToggleItemStatus = async (itemId: string, currentVal: boolean) => {
        try {
            const res = await fetch('/api/admin/cafe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'TOGGLE_ITEM_STATUS', itemId, isAvailable: !currentVal })
            })
            if (res.ok) {
                toast.success('Item availability updated')
                mutate()
            }
        } catch {
            toast.error('Failed to update status')
        }
    }

    const handleCreatePosOrder = async (e: React.FormEvent) => {
        e.preventDefault()
        const cartItems = Object.values(posOrder.cart).map(c => ({
            name: c.item.name,
            price: c.item.price,
            quantity: c.quantity
        }))

        if (!posOrder.guestName) return toast.error('Guest name is required')
        if (cartItems.length === 0) return toast.error('Please add at least one item to order')

        const selectedStaff = cafeData.staffList.find((s: any) => s.id === posOrder.assignedStaffId)
        const totalAmt = cartItems.reduce((sum, i) => sum + (i.price * i.quantity), 0)

        setIsSubmitting(true)
        try {
            const res = await fetch('/api/admin/cafe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'CREATE_ORDER',
                    type: posOrder.type,
                    roomNumber: posOrder.type === 'ROOM_GUEST' ? posOrder.roomNumber : null,
                    guestName: posOrder.guestName,
                    items: cartItems,
                    totalAmount: totalAmt,
                    paymentMethod: posOrder.paymentMethod,
                    assignedStaffId: posOrder.assignedStaffId || null,
                    assignedStaffName: selectedStaff?.user?.name || null,
                    notes: posOrder.notes
                })
            })
            if (res.ok) {
                toast.success('Cafe order created and assigned to staff successfully!')
                setShowPosModal(false)
                setPosOrder({
                    type: 'ROOM_GUEST', roomNumber: '', guestName: '', paymentMethod: 'CASH', assignedStaffId: '', notes: '', cart: {}
                })
                mutate()
            } else {
                toast.error('Failed to create cafe order')
            }
        } catch {
            toast.error('Something went wrong')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleUpdateOrderStatus = async (orderId: string, nextStatus: string) => {
        try {
            const res = await fetch('/api/admin/cafe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'UPDATE_ORDER_STATUS', orderId, status: nextStatus })
            })
            if (res.ok) {
                toast.success(`Order status updated to ${nextStatus}`)
                mutate()
            }
        } catch {
            toast.error('Failed to update order status')
        }
    }

    const addToCart = (item: any) => {
        setPosOrder(prev => {
            const existing = prev.cart[item.id]
            const qty = existing ? existing.quantity + 1 : 1
            return {
                ...prev,
                cart: { ...prev.cart, [item.id]: { item, quantity: qty } }
            }
        })
    }

    const removeFromCart = (itemId: string) => {
        setPosOrder(prev => {
            const copy = { ...prev.cart }
            if (copy[itemId]) {
                if (copy[itemId].quantity > 1) {
                    copy[itemId].quantity -= 1
                } else {
                    delete copy[itemId]
                }
            }
            return { ...prev, cart: copy }
        })
    }

    return (
        <div className="flex flex-col bg-[#101922] w-full min-h-screen animate-fade-in pb-24 text-gray-300 font-sans">
            {/* Top Header & Navigation */}
            <div className="p-6 sm:px-8 bg-[#101922] border-b border-white/[0.06]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-[#4A9EFF]/10 flex items-center justify-center border border-[#4A9EFF]/20 shadow-lg shadow-[#4A9EFF]/10">
                                <Coffee className="w-5 h-5 text-[#4A9EFF]" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-white tracking-tight">Zenbourg Hotel Cafe & Dining</h1>
                                <p className="text-xs text-gray-400 mt-0.5">Manage Cafe Menu, Buffet Packages, POS KDS Orders & Sales Analytics</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowPosModal(true)}
                            className="px-5 py-2.5 bg-[#4A9EFF] hover:bg-[#3A8EEF] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-[#4A9EFF]/20 active:scale-95 flex items-center gap-2"
                        >
                            <ShoppingBag className="w-4 h-4" /> Place Cafe Order
                        </button>
                    </div>
                </div>

                {/* Sub-tabs Navigation */}
                <div className="flex border-b border-white/10 gap-8">
                    {[
                        { id: 'menu', label: 'Cafe Menu & Offerings', icon: Utensils, badge: cafeData.menu.length },
                        { id: 'orders', label: 'Active POS Orders & KDS', icon: ShoppingBag, badge: cafeData.orders.filter((o: any) => o.status !== 'DELIVERED' && o.status !== 'CANCELLED').length },
                        { id: 'analytics', label: 'Cafe Sales & Payment Division', icon: PieIcon },
                    ].map(t => {
                        const Icon = t.icon
                        const isActive = activeTab === t.id
                        return (
                            <button
                                key={t.id}
                                onClick={() => setActiveTab(t.id as any)}
                                className={cn(
                                    "pb-4 font-bold text-sm flex items-center gap-2.5 transition-all relative",
                                    isActive ? "text-[#4A9EFF]" : "text-gray-400 hover:text-white"
                                )}
                            >
                                <Icon className="w-4 h-4" />
                                <span>{t.label}</span>
                                {t.badge !== undefined && (
                                    <span className={cn(
                                        "px-2 py-0.5 rounded-full text-[10px] font-black",
                                        isActive ? "bg-[#4A9EFF] text-white" : "bg-white/10 text-gray-400"
                                    )}>
                                        {t.badge}
                                    </span>
                                )}
                                {isActive && (
                                    <div className="absolute bottom-0 inset-x-0 h-0.5 bg-[#4A9EFF] shadow-[0_0_8px_#4A9EFF]" />
                                )}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* TAB CONTENT */}
            <div className="p-6 sm:px-8 space-y-6">

                {/* ========================================================================= */}
                {/* SUBTAB 1: MENU & OFFERINGS */}
                {/* ========================================================================= */}
                {activeTab === 'menu' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        {/* Subtab Bar */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/[0.02] border border-white/[0.06] p-4 rounded-2xl">
                            <div className="flex items-center gap-2 overflow-x-auto">
                                {[
                                    { id: 'ALL', label: 'All Offerings' },
                                    { id: 'Coffee & Tea', label: 'Coffee & Beverages' },
                                    { id: 'Breakfast & Bakery', label: 'Breakfast & Bakery' },
                                    { id: 'Quick Bites', label: 'Quick Bites & Snacks' },
                                    { id: 'Chef Meals', label: 'Chef Meals' },
                                    { id: 'BUFFET', label: 'Buffet Packages 🍲' },
                                ].map(c => (
                                    <button
                                        key={c.id}
                                        onClick={() => setMenuFilter(c.id)}
                                        className={cn(
                                            "px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all",
                                            menuFilter === c.id
                                                ? "bg-[#4A9EFF] text-white shadow-md shadow-[#4A9EFF]/20"
                                                : "bg-black/20 text-gray-400 hover:text-white border border-white/5"
                                        )}
                                    >
                                        {c.label}
                                    </button>
                                ))}
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setShowImportModal(true)}
                                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition-all border border-white/10 flex items-center gap-2"
                                >
                                    <Download className="w-3.5 h-3.5 text-[#4A9EFF]" /> Import Hotel F&B Menu
                                </button>
                                <button
                                    onClick={() => setShowAddBuffetModal(true)}
                                    className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-xl text-xs font-bold transition-all border border-amber-500/20 flex items-center gap-2"
                                >
                                    <ChefHat className="w-3.5 h-3.5" /> Add Buffet Package
                                </button>
                                <button
                                    onClick={() => setShowAddItemModal(true)}
                                    className="px-4 py-2 bg-[#4A9EFF] hover:bg-[#3A8EEF] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-[#4A9EFF]/20"
                                >
                                    <Plus className="w-4 h-4" /> Create Cafe Item
                                </button>
                            </div>
                        </div>

                        {/* Menu Items Grid */}
                        {menuFilter !== 'BUFFET' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {filteredMenu.map((item: any) => (
                                    <div key={item.id} className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 space-y-4 relative overflow-hidden group hover:border-[#4A9EFF]/40 transition-all shadow-xl">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-xl bg-black/40 border border-white/10 overflow-hidden shrink-0 relative flex items-center justify-center">
                                                    {item.image ? (
                                                        <img src={item.image} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Coffee className="w-6 h-6 text-[#4A9EFF]" />
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="text-base font-bold text-white tracking-tight">{item.name}</h3>
                                                        <span className={cn(
                                                            "w-2.5 h-2.5 rounded-full shrink-0",
                                                            item.isVeg ? "bg-emerald-500" : "bg-rose-500"
                                                        )} title={item.isVeg ? "Vegetarian" : "Non-Vegetarian"} />
                                                    </div>
                                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{item.category}</p>
                                                </div>
                                            </div>
                                            <span className="text-lg font-black text-[#4A9EFF]">₹{item.price}</span>
                                        </div>

                                        {item.description && (
                                            <p className="text-xs text-gray-400 line-clamp-2">{item.description}</p>
                                        )}

                                        <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs">
                                            <span className="text-gray-500 font-bold flex items-center gap-1">
                                                <Clock className="w-3.5 h-3.5 text-gray-400" /> {item.prepTime || 15} mins prep
                                            </span>

                                            <button
                                                onClick={() => handleToggleItemStatus(item.id, item.isAvailable)}
                                                className={cn(
                                                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border",
                                                    item.isAvailable
                                                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                                        : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                                                )}
                                            >
                                                {item.isAvailable ? 'Available' : 'Unavailable'}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Buffet Packages Grid */}
                        {(menuFilter === 'BUFFET' || menuFilter === 'ALL') && (
                            <div className="space-y-4 pt-4">
                                <div className="flex items-center gap-2">
                                    <ChefHat className="w-5 h-5 text-amber-400" />
                                    <h3 className="text-lg font-bold text-white">Hotel Buffet System & Meal Packages</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {cafeData.buffetPackages.map((pkg: any) => (
                                        <div key={pkg.id} className="bg-gradient-to-b from-amber-500/10 to-black/40 border border-amber-500/20 rounded-3xl p-6 space-y-4 shadow-2xl relative overflow-hidden">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <span className="px-3 py-1 bg-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-wider rounded-full border border-amber-500/30">BUFFET PACKAGE</span>
                                                    <h3 className="text-xl font-bold text-white tracking-tight mt-2">{pkg.name}</h3>
                                                    <p className="text-xs text-gray-400 mt-1">{pkg.description || 'Unlimited Buffet Spread'}</p>
                                                </div>
                                                <p className="text-2xl font-black text-amber-400">₹{pkg.price}</p>
                                            </div>

                                            {pkg.dishes && pkg.dishes.length > 0 && (
                                                <div className="space-y-2 pt-2 border-t border-white/10">
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Included Buffet Spread:</p>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {pkg.dishes.map((dish: string, i: number) => (
                                                            <span key={i} className="px-2.5 py-1 bg-black/40 border border-white/10 text-gray-300 text-xs rounded-lg font-semibold">
                                                                {dish}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ========================================================================= */}
                {/* SUBTAB 2: ORDERS & POS KDS */}
                {/* ========================================================================= */}
                {activeTab === 'orders' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        {/* Status Filter Pills */}
                        <div className="flex items-center justify-between gap-4 bg-white/[0.02] border border-white/[0.06] p-4 rounded-2xl">
                            <div className="flex items-center gap-2 overflow-x-auto">
                                {[
                                    { id: 'ALL', label: 'All Active Orders' },
                                    { id: 'PENDING', label: 'Pending KDS' },
                                    { id: 'PREPARING', label: 'Preparing / Kitchen' },
                                    { id: 'READY', label: 'Ready for Service' },
                                    { id: 'DELIVERED', label: 'Delivered' },
                                ].map(s => (
                                    <button
                                        key={s.id}
                                        onClick={() => setOrderStatusFilter(s.id)}
                                        className={cn(
                                            "px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all",
                                            orderStatusFilter === s.id
                                                ? "bg-[#4A9EFF] text-white shadow-md shadow-[#4A9EFF]/20"
                                                : "bg-black/20 text-gray-400 hover:text-white border border-white/5"
                                        )}
                                    >
                                        {s.label}
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={() => setShowPosModal(true)}
                                className="px-5 py-2.5 bg-[#4A9EFF] hover:bg-[#3A8EEF] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-[#4A9EFF]/20 flex items-center gap-2 shrink-0"
                            >
                                <Plus className="w-4 h-4" /> Place Cafe POS Order
                            </button>
                        </div>

                        {/* Orders List / Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredOrders.map((order: any) => (
                                <div key={order.id} className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 space-y-5 shadow-2xl relative">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="px-3 py-1 bg-[#4A9EFF]/15 text-[#4A9EFF] border border-[#4A9EFF]/30 text-[10px] font-black uppercase tracking-wider rounded-md">
                                                    CAFE ORDER
                                                </span>
                                                <span className="text-xs font-mono font-bold text-gray-400">#{order.orderNumber}</span>
                                            </div>
                                            <h3 className="text-lg font-bold text-white mt-2">{order.guestName}</h3>
                                            <p className="text-xs text-gray-400">{order.type === 'ROOM_GUEST' ? `Room ${order.roomNumber || 'N/A'}` : 'Walk-in Cafe Guest'}</p>
                                        </div>
                                        <p className="text-xl font-black text-[#4A9EFF]">₹{order.totalAmount}</p>
                                    </div>

                                    {/* Items List */}
                                    <div className="bg-black/40 p-4 rounded-2xl border border-white/5 space-y-2 text-xs">
                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Ordered Items:</p>
                                        {Array.isArray(order.items) && order.items.map((it: any, idx: number) => (
                                            <div key={idx} className="flex justify-between items-center text-gray-300">
                                                <span className="font-semibold">{it.quantity}x {it.name}</span>
                                                <span className="font-mono text-gray-400">₹{it.price * it.quantity}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Assigned Staff */}
                                    <div className="flex items-center justify-between text-xs pt-1">
                                        <span className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Assigned Staff:</span>
                                        <div className="flex items-center gap-2 bg-blue-500/10 px-3 py-1 rounded-xl border border-blue-500/20">
                                            <User className="w-3.5 h-3.5 text-blue-400" />
                                            <span className="text-blue-300 font-bold">{order.assignedStaffName || 'Kitchen Staff'}</span>
                                        </div>
                                    </div>

                                    {/* Payment Status & Order Transition */}
                                    <div className="flex items-center justify-between pt-3 border-t border-white/10">
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                                            Paid via {order.paymentMethod}
                                        </span>

                                        <div className="flex items-center gap-2">
                                            {order.status === 'PENDING' && (
                                                <button
                                                    onClick={() => handleUpdateOrderStatus(order.id, 'PREPARING')}
                                                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs rounded-xl transition-all"
                                                >
                                                    Start Preparing
                                                </button>
                                            )}
                                            {order.status === 'PREPARING' && (
                                                <button
                                                    onClick={() => handleUpdateOrderStatus(order.id, 'READY')}
                                                    className="px-3 py-1.5 bg-[#4A9EFF] hover:bg-[#3A8EEF] text-white font-bold text-xs rounded-xl transition-all"
                                                >
                                                    Mark Ready
                                                </button>
                                            )}
                                            {order.status === 'READY' && (
                                                <button
                                                    onClick={() => handleUpdateOrderStatus(order.id, 'DELIVERED')}
                                                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl transition-all"
                                                >
                                                    Mark Delivered
                                                </button>
                                            )}
                                            {order.status === 'DELIVERED' && (
                                                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                                                    <CheckCircle2 className="w-4 h-4" /> Delivered
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ========================================================================= */}
                {/* SUBTAB 3: SALES & PAYMENT ANALYTICS */}
                {/* ========================================================================= */}
                {activeTab === 'analytics' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        {/* KPI Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <Card className="p-6 bg-surface border-white/[0.06] space-y-2">
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Today&apos;s Cafe Sales</p>
                                <p className="text-3xl font-black text-white font-mono">₹{cafeData.analytics.todaySales.toLocaleString('en-IN')}</p>
                            </Card>
                            <Card className="p-6 bg-surface border-white/[0.06] space-y-2">
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Today&apos;s Orders Count</p>
                                <p className="text-3xl font-black text-[#4A9EFF] font-mono">{cafeData.analytics.todayOrdersCount}</p>
                            </Card>
                            <Card className="p-6 bg-surface border-white/[0.06] space-y-2">
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Avg Order Value</p>
                                <p className="text-3xl font-black text-emerald-400 font-mono">₹{cafeData.analytics.avgOrderValue.toLocaleString('en-IN')}</p>
                            </Card>
                        </div>

                        {/* Payment Mode Pie Chart */}
                        <Card className="p-6 border-white/[0.06] bg-surface">
                            <h3 className="text-lg font-bold text-white mb-6">Payment Mode Division (Cash, Card, Online, Room Charge)</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                                <div className="h-64 relative flex items-center justify-center">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={cafeData.analytics.paymentBreakdown || []}
                                                cx="50%" cy="50%"
                                                innerRadius={60} outerRadius={90}
                                                paddingAngle={4}
                                                dataKey="value"
                                                strokeWidth={0}
                                            >
                                                {(cafeData.analytics.paymentBreakdown || []).map((entry: any, index: number) => (
                                                    <Cell key={`cell-cafe-pay-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{ background: 'rgba(22, 27, 34, 0.95)', border: '1px solid #374151', borderRadius: 12 }}
                                                itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: '600' }}
                                                formatter={(val: number) => [`₹${val.toLocaleString()}`, 'Total Collected']}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {(cafeData.analytics.paymentBreakdown || []).map((item: any) => (
                                        <div key={item.name} className="p-4 rounded-2xl bg-black/30 border border-white/5 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                                                    <span className="text-white font-bold text-xs truncate">{item.name}</span>
                                                </div>
                                                <span className="text-xs font-black text-[#4A9EFF]">{item.percentage}%</span>
                                            </div>
                                            <p className="text-xl font-black text-white font-mono">₹{item.value.toLocaleString('en-IN')}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </Card>
                    </div>
                )}
            </div>

            {/* ========================================================================= */}
            {/* MODALS */}
            {/* ========================================================================= */}

            {/* 1. CREATE CAFE MENU ITEM MODAL */}
            <Modal isOpen={showAddItemModal} onClose={() => setShowAddItemModal(false)} title="Create Cafe Menu Item" description="Add a new item to the Hotel Cafe offerings">
                <form onSubmit={handleCreateMenuItem} className="space-y-4 pt-4">
                    <Input label="Item Name" placeholder="e.g. Hazelnut Cold Coffee, Cheese Croissant" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} required />
                    <div className="grid grid-cols-2 gap-4">
                        <Select label="Category" value={newItem.category} onChange={e => setNewItem({ ...newItem, category: e.target.value })} options={[
                            { value: 'Coffee & Tea', label: 'Coffee & Tea' },
                            { value: 'Breakfast & Bakery', label: 'Breakfast & Bakery' },
                            { value: 'Quick Bites', label: 'Quick Bites & Snacks' },
                            { value: 'Chef Meals', label: 'Chef Meals' },
                        ]} />
                        <Input label="Price (₹)" type="number" placeholder="250" value={newItem.price} onChange={e => setNewItem({ ...newItem, price: e.target.value })} required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Select label="Diet Type" value={newItem.isVeg ? 'VEG' : 'NON_VEG'} onChange={e => setNewItem({ ...newItem, isVeg: e.target.value === 'VEG' })} options={[
                            { value: 'VEG', label: '🟢 Vegetarian' },
                            { value: 'NON_VEG', label: '🔴 Non-Vegetarian' },
                        ]} />
                        <Input label="Prep Time (mins)" type="number" value={newItem.prepTime} onChange={e => setNewItem({ ...newItem, prepTime: e.target.value })} />
                    </div>
                    <Textarea label="Description" placeholder="Ingredients or taste notes..." value={newItem.description} onChange={e => setNewItem({ ...newItem, description: e.target.value })} rows={2} />
                    <div className="flex justify-end gap-3 mt-6">
                        <Button variant="secondary" onClick={() => setShowAddItemModal(false)}>Cancel</Button>
                        <Button type="submit" loading={isSubmitting}>Create Item</Button>
                    </div>
                </form>
            </Modal>

            {/* 2. IMPORT HOTEL MENU MODAL */}
            <Modal isOpen={showImportModal} onClose={() => setShowImportModal(false)} title="Import Menu from Hotel F&B" description="Select items from main hotel menu to import into Cafe">
                <div className="space-y-4 pt-4">
                    <p className="text-xs text-gray-400">Available F&B items found in Hotel Database ({cafeData.hotelMenu.length}):</p>
                    <div className="max-h-60 overflow-y-auto space-y-2 border border-white/10 rounded-2xl p-3 bg-black/30">
                        {cafeData.hotelMenu.map((hm: any) => {
                            const isChecked = selectedImportIds.length === 0 || selectedImportIds.includes(hm.id)
                            return (
                                <div key={hm.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => {
                                                if (selectedImportIds.includes(hm.id)) {
                                                    setSelectedImportIds(selectedImportIds.filter(id => id !== hm.id))
                                                } else {
                                                    setSelectedImportIds([...selectedImportIds, hm.id])
                                                }
                                            }}
                                            className="w-4 h-4 rounded text-[#4A9EFF]"
                                        />
                                        <div>
                                            <p className="text-sm font-bold text-white">{hm.name}</p>
                                            <p className="text-[10px] text-gray-500 uppercase">{hm.category}</p>
                                        </div>
                                    </div>
                                    <span className="text-sm font-bold text-[#4A9EFF]">₹{hm.price}</span>
                                </div>
                            )
                        })}
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <Button variant="secondary" onClick={() => setShowImportModal(false)}>Cancel</Button>
                        <Button onClick={handleImportHotelMenu} loading={isSubmitting}>
                            Import Selected Items
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* 3. ADD BUFFET PACKAGE MODAL */}
            <Modal isOpen={showAddBuffetModal} onClose={() => setShowAddBuffetModal(false)} title="Add Buffet System Package" description="Create a buffet package with included dishes">
                <form onSubmit={handleCreateBuffetPackage} className="space-y-4 pt-4">
                    <Input label="Buffet Package Name" placeholder="e.g. Grand Morning Breakfast Buffet" value={newBuffet.name} onChange={e => setNewBuffet({ ...newBuffet, name: e.target.value })} required />
                    <Input label="Package Price per Person (₹)" type="number" placeholder="499" value={newBuffet.price} onChange={e => setNewBuffet({ ...newBuffet, price: e.target.value })} required />
                    <Input label="Included Dishes (comma separated)" placeholder="Live Eggs Station, South Indian Dosa, Pancakes, Fresh Juice, Espresso" value={newBuffet.dishesInput} onChange={e => setNewBuffet({ ...newBuffet, dishesInput: e.target.value })} />
                    <Textarea label="Package Description" placeholder="Served from 07:00 AM to 10:30 AM in Cafe Dining area" value={newBuffet.description} onChange={e => setNewBuffet({ ...newBuffet, description: e.target.value })} rows={2} />
                    <div className="flex justify-end gap-3 mt-6">
                        <Button variant="secondary" onClick={() => setShowAddBuffetModal(false)}>Cancel</Button>
                        <Button type="submit" loading={isSubmitting}>Create Buffet Package</Button>
                    </div>
                </form>
            </Modal>

            {/* 4. PLACE CAFE POS ORDER MODAL */}
            <Modal isOpen={showPosModal} onClose={() => setShowPosModal(false)} title="Place Cafe POS Order" description="Create order, select payment mode and assign staff">
                <form onSubmit={handleCreatePosOrder} className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Select label="Order Type" value={posOrder.type} onChange={e => setPosOrder({ ...posOrder, type: e.target.value as any })} options={[
                            { value: 'ROOM_GUEST', label: 'Hotel Room Guest' },
                            { value: 'WALK_IN', label: 'Walk-in Cafe Guest' },
                        ]} />
                        {posOrder.type === 'ROOM_GUEST' ? (
                            <Input label="Room Number" placeholder="e.g. 102" value={posOrder.roomNumber} onChange={e => setPosOrder({ ...posOrder, roomNumber: e.target.value })} required />
                        ) : (
                            <Input label="Table / Desk #" placeholder="e.g. Table 4" value={posOrder.notes} onChange={e => setPosOrder({ ...posOrder, notes: e.target.value })} />
                        )}
                    </div>

                    <Input label="Guest Name" placeholder="e.g. Michael Scott" value={posOrder.guestName} onChange={e => setPosOrder({ ...posOrder, guestName: e.target.value })} required />

                    {/* Menu Item Quick Selector */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Select Cafe Menu Items & Quantities</label>
                        <div className="max-h-48 overflow-y-auto space-y-2 border border-white/10 rounded-2xl p-3 bg-black/30">
                            {cafeData.menu.map((it: any) => {
                                const qty = posOrder.cart[it.id]?.quantity || 0
                                return (
                                    <div key={it.id} className="flex items-center justify-between p-2.5 bg-white/5 rounded-xl border border-white/5">
                                        <div>
                                            <p className="text-xs font-bold text-white">{it.name}</p>
                                            <p className="text-[10px] font-mono text-[#4A9EFF]">₹{it.price}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {qty > 0 && (
                                                <button type="button" onClick={() => removeFromCart(it.id)} className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 font-bold hover:bg-rose-500/30 flex items-center justify-center">-</button>
                                            )}
                                            {qty > 0 && <span className="font-mono font-bold text-white text-xs px-1">{qty}</span>}
                                            <button type="button" onClick={() => addToCart(it)} className="w-7 h-7 rounded-lg bg-[#4A9EFF]/20 text-[#4A9EFF] font-bold hover:bg-[#4A9EFF]/30 flex items-center justify-center">+</button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Staff Assignment */}
                    <Select
                        label="Assign Staff Member"
                        value={posOrder.assignedStaffId}
                        onChange={e => setPosOrder({ ...posOrder, assignedStaffId: e.target.value })}
                        options={[
                            { value: '', label: 'Select Staff Member' },
                            ...cafeData.staffList.map((s: any) => ({
                                value: s.id,
                                label: `${s.user.name} (${s.department || 'Staff'})`
                            }))
                        ]}
                    />

                    {/* Payment Method Selector */}
                    <Select
                        label="Payment Mode"
                        value={posOrder.paymentMethod}
                        onChange={e => setPosOrder({ ...posOrder, paymentMethod: e.target.value as any })}
                        options={[
                            { value: 'CASH', label: 'Cash Payment' },
                            { value: 'CARD', label: 'Credit / Debit Card' },
                            { value: 'ONLINE', label: 'Online / UPI' },
                            { value: 'ROOM_BILL', label: 'Charge to Room Bill' },
                        ]}
                    />

                    <div className="flex justify-end gap-3 mt-6">
                        <Button variant="secondary" onClick={() => setShowPosModal(false)}>Cancel</Button>
                        <Button type="submit" loading={isSubmitting}>
                            Create Cafe Order
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    )
}
