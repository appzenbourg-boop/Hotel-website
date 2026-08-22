'use client'

import React, { useState } from 'react'
import useSWR from 'swr'
import { useRouter } from 'next/navigation'
import {
  Utensils, LayoutGrid, BellRing, UtensilsCrossed, ReceiptText, LogOut,
  Edit3, Camera, CheckCircle2, Printer, CreditCard, AlertTriangle, User
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Fetcher for SWR
const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function POSDashboard() {
  const router = useRouter()
  const { data: orders, error, isLoading, mutate } = useSWR('/api/admin/pos/orders', fetcher)

  const [activeTab, setActiveTab] = useState('All Orders')
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)

  // Seed function if DB is empty
  const handleSeed = async () => {
    const res = await fetch('/api/admin/pos/seed', { method: 'POST' })
    if (res.ok) {
      mutate()
    }
  }

  const isOrdersEmpty = !Array.isArray(orders) || orders.length === 0

  const filteredOrders = Array.isArray(orders) ? orders.filter((order: any) => {
    if (activeTab === 'All Orders') return true
    if (activeTab === 'Preparing') return order.status === 'PREPARING' || order.status === 'READY'
    if (activeTab === 'Delivered') return order.status === 'SERVED'
    return true
  }) : []

  // Ensure we have a selected order if data loads
  React.useEffect(() => {
    if (filteredOrders.length > 0 && !selectedOrderId) {
      setSelectedOrderId(filteredOrders[0].id)
    }
  }, [filteredOrders, selectedOrderId])

  const selectedOrder = Array.isArray(orders) ? orders.find((o: any) => o.id === selectedOrderId) : null

  // Reconstruct timeline logic based on status
  const getTimeline = (status: string) => {
    return [
      { label: 'Order Confirmed', completed: true },
      { label: 'Kitchen Received', completed: true },
      { label: 'Preparing Mains', active: status === 'PREPARING', completed: status === 'READY' || status === 'SERVED' },
      { label: 'Ready for Service', active: status === 'READY', completed: status === 'SERVED' }
    ]
  }

  // Group items by course for the view
  const getGroupedItems = (items: any[]) => {
    if (!items) return []
    const groups: { [key: string]: any[] } = {}
    items.forEach(item => {
      const course = item.course || 'OTHER'
      if (!groups[course]) groups[course] = []
      groups[course].push(item)
    })
    return Object.entries(groups).map(([name, items]) => ({ name, items }))
  }

  if (isLoading && !orders) {
    return (
      <div className="flex h-full min-h-[calc(100vh-100px)] bg-[#0B1120] items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#3B82F6] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-gray-400 font-medium">Loading POS live dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-[calc(100vh-100px)] bg-[#0B1120] text-white -mx-6 md:-mx-8 -my-6 md:-my-8 overflow-hidden font-sans">
      
      {/* Middle Column - Orders List */}
      <div className="w-full lg:w-[400px] xl:w-[420px] bg-[#0F172A] border-r border-white/5 flex flex-col relative z-0">
        <div className="p-8 pb-4">
          <div className="flex justify-between items-end mb-8">
            <div>
              <div className="text-[10px] font-black text-[#3B82F6] tracking-[0.2em] uppercase mb-1">Live Operations</div>
              <h2 className="text-3xl font-black text-white tracking-tight">Active Orders</h2>
            </div>
            <div className="text-right">
              <div className="text-3xl font-light text-gray-400">{filteredOrders.length}</div>
              <div className="text-[10px] font-black text-gray-500 tracking-widest uppercase">Pending</div>
            </div>
          </div>

          <div className="flex items-center bg-[#1E293B] p-1.5 rounded-full w-full shadow-inner">
            {['All Orders', 'Preparing', 'Delivered'].map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex-1 py-2.5 text-xs font-bold rounded-full transition-all duration-300",
                  activeTab === tab 
                    ? "bg-white text-black shadow-md" 
                    : "text-gray-400 hover:text-white"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 pt-2 space-y-4">
          {isOrdersEmpty && (
            <div className="text-center p-8 bg-[#1E293B] rounded-3xl border border-white/5 shadow-lg">
              <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                {orders?.error 
                  ? `Database Error: ${orders.error}` 
                  : "No active orders found in the database. Start by seeding the default orders."}
              </p>
              <button 
                onClick={handleSeed} 
                className="px-6 py-3.5 bg-[#3B82F6] hover:bg-[#2563EB] text-white font-bold rounded-2xl shadow-lg shadow-blue-500/20 transition-all w-full flex items-center justify-center gap-2"
              >
                <Utensils className="w-4 h-4" /> Seed Live Data
              </button>
            </div>
          )}

          {!isOrdersEmpty && filteredOrders.map((order: any) => {
            const isSelected = selectedOrderId === order.id
            const isReady = order.status === 'READY'
            const isServed = order.status === 'SERVED'

            return (
              <div 
                key={order.id}
                onClick={() => setSelectedOrderId(order.id)}
                className={cn(
                  "relative p-6 rounded-3xl cursor-pointer transition-all duration-300 group overflow-hidden border",
                  isSelected
                    ? "bg-[#0A4186] border-transparent text-white shadow-[0_12px_24px_rgba(10,65,134,0.4)] scale-[1.02]"
                    : isReady
                      ? "bg-[#1D4ED8] border-transparent text-white shadow-[0_8px_16px_rgba(29,78,216,0.3)]"
                      : isServed
                        ? "bg-transparent border-white/5 text-gray-500 opacity-50 hover:opacity-100"
                        : "bg-[#1E293B] border-white/5 text-white hover:bg-[#233648] hover:border-white/10"
                )}
              >
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className={cn("text-[10px] font-black tracking-widest uppercase mb-1", (isSelected || isReady) ? "opacity-70 text-white" : "text-gray-500")}>Table</div>
                    <div className="text-3xl font-black italic tracking-tighter">{order.table}</div>
                  </div>
                  {order.status === 'PREPARING' && (
                    <div className={cn(
                      "px-3 py-1.5 rounded-full text-[10px] font-bold shadow-inner",
                      isSelected ? "bg-[#073064] text-white" : "bg-[#0B1120] text-gray-400 border border-white/5"
                    )}>
                      {isSelected ? "14m 22s" : "5m 10s"}
                    </div>
                  )}
                  {isReady && (
                    <div className="px-3 py-1.5 rounded-full text-[10px] font-bold bg-[#F59E0B] text-white shadow-sm">
                      READY
                    </div>
                  )}
                  {isServed && (
                    <div className="px-3 py-1.5 rounded-full text-[10px] font-bold bg-white/5 text-gray-500">
                      SERVED
                    </div>
                  )}
                </div>
                
                <div className="flex items-center justify-between">
                  <div className={cn("text-sm font-semibold", (isSelected || isReady) ? "opacity-90" : "text-gray-400")}>
                    {order.items?.reduce((a: number, b: any) => a + b.quantity, 0) || 0} Items • Guest: {order.guestName}
                  </div>
                  
                  {order.status === 'PREPARING' && <Utensils className={cn("w-5 h-5", isSelected ? "opacity-50 text-white" : "text-gray-600")} />}
                  {isReady && <CheckCircle2 className="w-5 h-5 opacity-50 text-white" />}
                  {isServed && <CheckCircle2 className="w-5 h-5 opacity-30 text-gray-500" />}
                </div>
                
                <div className="mt-5 flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full", isSelected ? "bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" : isReady ? "bg-white" : isServed ? "bg-gray-600" : "bg-[#3B82F6]")}></div>
                  <div className={cn("text-[10px] font-bold tracking-[0.15em] uppercase", (isSelected || isReady) ? "opacity-90" : "text-gray-400")}>{order.status}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Right Column - Order Details */}
      {selectedOrder ? (
        <div className="flex-1 bg-[#0B1120] flex flex-col relative z-0">
          <div className="absolute top-0 right-0 p-8 w-96 h-96 bg-gradient-to-bl from-white/5 to-transparent pointer-events-none rounded-bl-full opacity-50"></div>
          
          <div className="px-10 pt-10 pb-6 flex justify-between items-start border-b border-white/5">
            <div className="flex items-center gap-8">
              <h1 className="text-4xl font-bold tracking-tight text-white">{selectedOrder.table}</h1>
              <div className="space-y-1.5 mt-2">
                <div className="text-xs font-bold text-[#3B82F6] tracking-widest uppercase">Order {selectedOrder.orderNumber}</div>
                <div className="text-sm text-gray-400 font-semibold">Server: {selectedOrder.serverName} • 12:45 PM</div>
                <div className="flex gap-2 mt-4 pt-2">
                  {selectedOrder.tags?.map((tag: string) => (
                    <span key={tag} className={cn(
                      "px-2.5 py-1 rounded-md text-[9px] font-black tracking-widest border shadow-sm",
                      tag === 'RUSH ORDER' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"
                    )}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 w-72">
              <input
                type="text"
                placeholder="Write order note / issue... (Enter to save)"
                className="w-full bg-[#1E293B] border border-white/5 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-gray-500 outline-none focus:border-[#3B82F6] transition-colors"
                onKeyDown={async (e) => {
                  if (e.key === 'Enter') {
                    const input = e.currentTarget
                    const val = input.value.trim()
                    if (!val) return
                    const res = await fetch(`/api/admin/pos/orders/${selectedOrder.id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ kitchenNotes: val })
                    })
                    if (res.ok) {
                      input.value = ''
                      mutate()
                    }
                  }
                }}
              />
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 overflow-y-auto px-10 py-8">
              {selectedOrder.items && selectedOrder.items.length > 0 ? (
                <div className="space-y-12">
                  {getGroupedItems(selectedOrder.items).map((course: any, idx: number) => (
                    <div key={idx}>
                      <div className="text-[10px] font-black tracking-[0.2em] text-gray-500 mb-6 uppercase">{course.name}</div>
                      <div className="space-y-6">
                        {course.items.map((item: any, i: number) => (
                          <div key={i} className="flex gap-6 items-start group p-4 -mx-4 rounded-2xl hover:bg-[#1E293B]/40 transition-colors border border-transparent hover:border-white/5">
                            <div className="w-20 h-20 rounded-2xl bg-[#1A2634] overflow-hidden flex-shrink-0 shadow-sm border border-white/5">
                              {item.image ? (
                                <img src={item.image} alt={item.name} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500 opacity-80" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center"><Utensils className="w-6 h-6 text-gray-600" /></div>
                              )}
                            </div>
                            <div className="flex-1 pt-1">
                              <h3 className="text-lg font-bold text-white leading-tight">{item.name}</h3>
                              <p className="text-sm text-gray-400 mt-1 font-medium">{item.description}</p>
                              {item.allergy && (
                                <div className="flex items-center gap-1.5 mt-2.5 text-[#EF4444] text-xs font-bold tracking-wide">
                                  <AlertTriangle className="w-3.5 h-3.5" /> {item.allergy}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-8 pt-1">
                              <div className="text-gray-500 text-sm font-bold">x{item.quantity}</div>
                              <div className="text-sm font-bold text-white w-20 text-right">₹{item.price.toFixed(2)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 flex-col gap-4">
                  <ReceiptText className="w-16 h-16 opacity-20 mb-2" />
                  <p className="font-semibold text-lg text-gray-400">No item details available for this order.</p>
                </div>
              )}
            </div>

            {/* Order Status Timeline Sidebar */}
            <div className="w-72 p-10 bg-[#0F172A] border-l border-white/5 overflow-y-auto hidden md:block">
              <div className="text-[10px] font-black tracking-[0.2em] text-gray-500 mb-10 uppercase">Order Status</div>
              <div className="space-y-8 relative pl-6 before:absolute before:inset-y-1 before:left-[11px] before:w-0.5 before:bg-white/5">
                {getTimeline(selectedOrder.status).map((step: any, idx: number) => (
                  <div key={idx} className="relative flex items-start gap-4">
                    <div className={cn(
                      "absolute -left-[21px] flex items-center justify-center w-5 h-5 rounded-full border-[3px] shadow-sm z-10 transition-all",
                      step.completed 
                        ? "bg-[#3B82F6] border-[#0F172A] text-white" 
                        : step.active 
                          ? "bg-[#0F172A] border-[#3B82F6] text-[#3B82F6]" 
                          : "bg-[#1E293B] border-[#0F172A]"
                    )}>
                      {step.completed && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
                      {step.active && <div className="w-1.5 h-1.5 bg-[#3B82F6] rounded-full animate-ping" />}
                    </div>
                    <div className="space-y-1">
                      <div className={cn(
                        "text-xs font-bold transition-colors",
                        step.active || step.completed ? "text-white" : "text-gray-500"
                      )}>
                        {step.label}
                      </div>
                      <div className="text-[9px] font-black tracking-widest uppercase text-gray-500">
                        {step.completed ? "Completed" : step.active ? "In Progress" : "Pending"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Total Bar */}
          <div className="px-10 py-8 border-t border-white/5 bg-[#0F172A] flex justify-between items-end shadow-lg">
            <div className="flex-1 pr-12 hidden md:block">
              {selectedOrder.kitchenNotes && (
                <div className="bg-gradient-to-r from-[#78350F] to-[#92400E] border border-amber-500/20 rounded-2xl p-5 w-72 mb-6 shadow-lg shadow-amber-900/10 text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <ReceiptText className="w-16 h-16 transform rotate-12" />
                  </div>
                  <div className="text-[9px] font-black tracking-widest uppercase mb-2 opacity-80 text-amber-300">Order Notes / Issues</div>
                  <div className="text-sm font-semibold italic leading-relaxed relative z-10 text-amber-100">{selectedOrder.kitchenNotes}</div>
                </div>
              )}
              <div className="flex items-center gap-5 pl-2">
                <span className="text-gray-400 font-bold text-sm tracking-wide">Subtotal</span>
                <span className="text-lg font-bold text-white">₹{selectedOrder.subtotal.toFixed(2)}</span>
                <span className="text-gray-500 text-xs ml-4">+ Tax ₹{selectedOrder.tax.toFixed(2)}</span>
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-5 w-full md:w-auto">
              <div className="text-right flex items-end gap-6 mb-2">
                <div className="text-[10px] font-black tracking-[0.2em] text-gray-500 uppercase mb-2">Total Due</div>
                <div className="text-3xl font-black text-[#3B82F6] tracking-tighter">₹{selectedOrder.total.toFixed(2)}</div>
              </div>
              <div className="flex gap-4 w-full h-[60px]">
                <button className="flex-1 px-8 rounded-2xl bg-[#1E293B] hover:bg-[#233648] text-white font-bold text-sm tracking-wide transition-all shadow-sm flex items-center justify-center gap-3 border border-white/5">
                  <Printer className="w-5 h-5 text-gray-400" /> Print Bill
                </button>
                <button 
                  onClick={() => router.push(`/admin/pos/transactions?orderId=${selectedOrder.id}`)}
                  className="flex-[2] px-8 rounded-2xl bg-[#2563EB] hover:bg-[#3B82F6] hover:-translate-y-0.5 active:translate-y-0 text-white font-black text-sm tracking-wide transition-all shadow-[0_8px_20px_rgba(37,99,235,0.3)] flex items-center justify-center gap-3"
                >
                  <CreditCard className="w-5 h-5" /> Pay Now
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 bg-[#0B1120] flex flex-col items-center justify-center text-gray-500">
          <Utensils className="w-20 h-20 opacity-20 mb-6 text-[#3B82F6]" />
          <h2 className="text-2xl font-black text-white mb-3 tracking-tight">No Order Selected</h2>
          <p className="font-medium text-lg text-gray-400">Select an order from the list to view details.</p>
        </div>
      )}
    </div>
  )
}
