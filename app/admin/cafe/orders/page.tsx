'use client'

import React, { useState, useMemo } from 'react'
import useSWR from 'swr'
import { useSession } from 'next-auth/react'
import { buildContextUrl } from '@/lib/admin-context'
import {
    Coffee, Plus, ShoppingBag, User, Clock,
    CheckCircle2, Loader2, X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'

export default function CafeOrdersPage() {
    const { data: session } = useSession()
    const [orderStatusFilter, setOrderStatusFilter] = useState('ALL')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showPosModal, setShowPosModal] = useState(false)

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

    const { data: rawData, mutate, isLoading } = useSWR(
        buildContextUrl('/api/admin/cafe'),
        (url) => fetch(url).then(res => res.json())
    )

    const cafeData = rawData?.data || {
        menu: [], buffetPackages: [], orders: [], hotelMenu: [], staffList: [],
        analytics: { todaySales: 0, todayOrdersCount: 0, avgOrderValue: 0, paymentBreakdown: [] }
    }

    const filteredOrders = useMemo(() => {
        if (orderStatusFilter === 'ALL') return cafeData.orders
        return cafeData.orders.filter((o: any) => o.status === orderStatusFilter)
    }, [cafeData.orders, orderStatusFilter])

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

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#101922]">
                <Loader2 className="w-8 h-8 text-[#4A9EFF] animate-spin" />
            </div>
        )
    }

    return (
        <div className="flex flex-col bg-[#101922] w-full min-h-screen animate-fade-in pb-24 text-gray-300 font-sans">
            {/* Header */}
            <div className="p-6 sm:px-8 bg-[#101922] border-b border-white/[0.06]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-[#4A9EFF]/10 flex items-center justify-center border border-[#4A9EFF]/20 shadow-lg shadow-[#4A9EFF]/10">
                                <ShoppingBag className="w-5 h-5 text-[#4A9EFF]" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-white tracking-tight">Cafe Orders & POS KDS</h1>
                                <p className="text-xs text-gray-400 mt-0.5">Track and manage all cafe POS orders in real-time</p>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowPosModal(true)}
                        className="px-5 py-2.5 bg-[#4A9EFF] hover:bg-[#3A8EEF] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-[#4A9EFF]/20 active:scale-95 flex items-center gap-2"
                    >
                        <ShoppingBag className="w-4 h-4" /> Place Cafe Order
                    </button>
                </div>
            </div>

            <div className="p-6 sm:px-8 space-y-6">
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

                {filteredOrders.length === 0 && (
                    <div className="text-center py-16">
                        <ShoppingBag className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-500 font-bold">No orders found</p>
                        <p className="text-xs text-gray-600 mt-1">Place a new cafe order to get started</p>
                    </div>
                )}
            </div>

            {/* POS ORDER MODAL */}
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
