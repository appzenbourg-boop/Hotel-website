'use client'

import React, { useState, useMemo, useEffect } from 'react'
import useSWR from 'swr'
import { useRouter } from 'next/navigation'
import {
  Utensils, LayoutGrid, BellRing, UtensilsCrossed, ReceiptText, LogOut,
  Edit3, CheckCircle2, Printer, CreditCard, AlertTriangle, User, Plus,
  Search, ArrowLeft, Clock, ChefHat, Sparkles, X, Trash2
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { buildContextUrl } from '@/lib/admin-context'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function POSDashboard() {
  const router = useRouter()
  const apiUrl = typeof window !== 'undefined' ? buildContextUrl('/api/admin/pos/orders') : '/api/admin/pos/orders'
  const { data: orders, error, isLoading, mutate } = useSWR(apiUrl, fetcher, { refreshInterval: 5000 })

  const [activeTab, setActiveTab] = useState<'ALL' | 'PREPARING' | 'READY' | 'SERVED'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [showMobileDetails, setShowMobileDetails] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  const isOrdersEmpty = !Array.isArray(orders) || orders.length === 0

  const filteredOrders = useMemo(() => {
    if (!Array.isArray(orders)) return []
    return orders.filter((order: any) => {
      // Tab filter
      if (activeTab === 'PREPARING' && order.status !== 'PREPARING') return false
      if (activeTab === 'READY' && order.status !== 'READY') return false
      if (activeTab === 'SERVED' && order.status !== 'SERVED') return false

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchTable = String(order.table || '').toLowerCase().includes(q)
        const matchGuest = String(order.guestName || '').toLowerCase().includes(q)
        const matchOrderNo = String(order.orderNumber || '').toLowerCase().includes(q)
        return matchTable || matchGuest || matchOrderNo
      }

      return true
    })
  }, [orders, activeTab, searchQuery])

  // Auto-select first order if none selected or current is gone
  useEffect(() => {
    if (filteredOrders.length > 0) {
      if (!selectedOrderId || !filteredOrders.some(o => o.id === selectedOrderId)) {
        setSelectedOrderId(filteredOrders[0].id)
      }
    } else {
      setSelectedOrderId(null)
    }
  }, [filteredOrders, selectedOrderId])

  const selectedOrder = Array.isArray(orders) ? orders.find((o: any) => o.id === selectedOrderId) : null

  // Group items by course for neat kitchen display
  const getGroupedItems = (items: any[]) => {
    if (!items || !Array.isArray(items)) return []
    const groups: { [key: string]: any[] } = {}
    items.forEach(item => {
      const course = item.course || 'MAINS'
      if (!groups[course]) groups[course] = []
      groups[course].push(item)
    })
    return Object.entries(groups).map(([name, groupItems]) => ({ name, items: groupItems }))
  }

  // Handle status transitions
  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedOrder) return
    setIsUpdatingStatus(true)
    try {
      const res = await fetch(`/api/admin/pos/orders/${selectedOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (res.ok) {
        toast.success(`Order status updated to ${newStatus}`)
        mutate()
      } else {
        toast.error('Failed to update status')
      }
    } catch (e) {
      toast.error('Error updating status')
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  // Handle Void / Cancel Order
  const handleCancelOrder = async () => {
    if (!selectedOrder) return
    if (!confirm(`Are you sure you want to cancel order ${selectedOrder.orderNumber} for Table ${selectedOrder.table}?`)) return

    try {
      const res = await fetch(`/api/admin/pos/orders/${selectedOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' })
      })

      if (res.ok) {
        toast.success('Order cancelled')
        mutate()
      } else {
        toast.error('Failed to cancel order')
      }
    } catch {
      toast.error('Error cancelling order')
    }
  }

  // Print KOT
  const handlePrintKOT = () => {
    if (!selectedOrder) return
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      toast.error('Please allow popups to print KOT')
      return
    }

    const itemsHtml = (selectedOrder.items || []).map((it: any) => `
      <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px;">
        <span><strong>${it.quantity}x</strong> ${it.name}</span>
        <span>₹${(it.price * it.quantity).toFixed(2)}</span>
      </div>
      ${it.allergy ? `<div style="font-size: 11px; color: red;">⚠️ Allergy: ${it.allergy}</div>` : ''}
    `).join('')

    printWindow.document.write(`
      <html>
        <head>
          <title>KOT - ${selectedOrder.table} - ${selectedOrder.orderNumber}</title>
          <style>
            body { font-family: monospace; padding: 20px; max-width: 300px; margin: 0 auto; }
            h2 { text-align: center; margin-bottom: 4px; font-size: 18px; }
            p { margin: 2px 0; font-size: 12px; }
            hr { border: 1px dashed #000; margin: 8px 0; }
          </style>
        </head>
        <body>
          <h2>KITCHEN ORDER TICKET (KOT)</h2>
          <hr/>
          <p><strong>Table:</strong> ${selectedOrder.table}</p>
          <p><strong>Order #:</strong> ${selectedOrder.orderNumber}</p>
          <p><strong>Server:</strong> ${selectedOrder.serverName || 'Staff'}</p>
          <p><strong>Time:</strong> ${new Date(selectedOrder.createdAt || Date.now()).toLocaleTimeString()}</p>
          ${selectedOrder.kitchenNotes ? `<p><strong>Note:</strong> ${selectedOrder.kitchenNotes}</p>` : ''}
          <hr/>
          ${itemsHtml}
          <hr/>
          <p style="text-align: right;"><strong>Total: ₹${(selectedOrder.total || 0).toFixed(2)}</strong></p>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  if (isLoading && !orders) {
    return (
      <div className="flex h-full min-h-[calc(100vh-100px)] bg-background items-center justify-center text-text-primary">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#3B82F6] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-text-secondary font-medium">Loading POS Live Orders...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-[calc(100vh-100px)] bg-background text-text-primary -mx-4 sm:-mx-6 md:-mx-8 -my-6 md:-my-8 overflow-hidden font-sans">
      
      {/* Left Column - Orders List */}
      <div className={cn(
        "w-full lg:w-[380px] xl:w-[420px] bg-surface-light border-r border-border flex flex-col z-0 h-full",
        showMobileDetails && "hidden lg:flex"
      )}>
        {/* Header & Tabs */}
        <div className="p-4 sm:p-6 border-b border-border space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-black text-text-primary tracking-tight">Active Orders</h2>
              <p className="text-xs text-text-secondary mt-0.5">Live restaurant & room service tickets</p>
            </div>
            <button
              onClick={() => router.push('/admin/pos/create-order')}
              className="px-3.5 py-2 rounded-xl bg-[#2563EB] hover:bg-[#3B82F6] text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 active:scale-95"
            >
              <Plus className="w-4 h-4" /> New Order
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-text-tertiary absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search table, guest or order #..."
              className="w-full bg-background border border-border rounded-xl pl-9 pr-4 py-2 text-xs text-text-primary outline-none focus:border-[#3B82F6] transition-colors"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex p-1 bg-surface rounded-xl border border-border">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'PREPARING', label: 'Preparing' },
              { id: 'READY', label: 'Ready' },
              { id: 'SERVED', label: 'Served' }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all",
                  activeTab === tab.id 
                    ? "bg-[#2563EB] text-white shadow-sm" 
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Orders Scrollable List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12 px-4 bg-surface/50 border border-border border-dashed rounded-2xl">
              <UtensilsCrossed className="w-10 h-10 text-text-tertiary mx-auto mb-3 opacity-40" />
              <p className="text-sm font-bold text-text-primary">No matching orders</p>
              <p className="text-xs text-text-secondary mt-1 max-w-xs mx-auto">
                {searchQuery ? 'Try modifying your search filter.' : 'Create a walk-in or takeout order to get started.'}
              </p>
              <button 
                onClick={() => router.push('/admin/pos/create-order')} 
                className="mt-4 px-4 py-2 bg-white/5 hover:bg-white/10 border border-border rounded-xl text-xs font-bold transition-all text-text-primary"
              >
                Create Order
              </button>
            </div>
          ) : (
            filteredOrders.map((order: any) => {
              const isSelected = selectedOrderId === order.id
              const isPreparing = order.status === 'PREPARING'
              const isReady = order.status === 'READY'
              const isServed = order.status === 'SERVED'

              return (
                <div 
                  key={order.id}
                  onClick={() => {
                    setSelectedOrderId(order.id)
                    setShowMobileDetails(true)
                  }}
                  className={cn(
                    "p-4 rounded-2xl cursor-pointer transition-all duration-200 border",
                    isSelected
                      ? "bg-[#2563EB]/10 border-[#2563EB] text-text-primary shadow-sm"
                      : "bg-surface border-border hover:bg-white/5 text-text-primary"
                  )}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="text-base font-black text-text-primary flex items-center gap-2">
                        {order.table}
                        <span className="text-[10px] font-bold text-text-tertiary">#{order.orderNumber}</span>
                      </div>
                      <div className="text-xs text-text-secondary font-medium mt-0.5">
                        {order.guestName || 'Walk-in'} • {order.items?.length || 0} items
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-black text-[#3B82F6]">₹{(order.total || 0).toFixed(2)}</div>
                      <span className={cn(
                        "inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider mt-1",
                        isPreparing && "bg-amber-500/10 text-amber-400 border border-amber-500/20",
                        isReady && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse",
                        isServed && "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                      )}>
                        {order.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-text-tertiary pt-2 border-t border-border/40 mt-2 font-semibold">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(order.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span>Server: {order.serverName || 'Staff'}</span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Right Column - Order Details */}
      <div className={cn(
        "flex-1 bg-background flex flex-col z-0 h-full overflow-hidden",
        !showMobileDetails && "hidden lg:flex"
      )}>
        {selectedOrder ? (
          <div className="flex flex-col h-full overflow-hidden">
            
            {/* Details Top Bar */}
            <div className="px-6 py-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border bg-surface/30">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowMobileDetails(false)}
                  className="lg:hidden p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-border text-text-primary"
                  title="Back to Orders"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h1 className="text-2xl font-black text-text-primary tracking-tight">{selectedOrder.table}</h1>
                    <span className="text-xs font-bold text-text-tertiary px-2 py-0.5 rounded bg-white/5 border border-border">
                      #{selectedOrder.orderNumber}
                    </span>
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full",
                      selectedOrder.status === 'PREPARING' && "bg-amber-500/20 text-amber-300",
                      selectedOrder.status === 'READY' && "bg-emerald-500/20 text-emerald-300 animate-pulse",
                      selectedOrder.status === 'SERVED' && "bg-blue-500/20 text-blue-300"
                    )}>
                      {selectedOrder.status}
                    </span>
                  </div>
                  <div className="text-xs text-text-secondary mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-medium">
                    <span>Server: <strong>{selectedOrder.serverName || 'Staff'}</strong></span>
                    <span>•</span>
                    <span>Placed: <strong>{new Date(selectedOrder.createdAt || Date.now()).toLocaleTimeString()}</strong></span>
                    <span>•</span>
                    <span>Guest: <strong>{selectedOrder.guestName || 'Walk-in'}</strong></span>
                  </div>
                </div>
              </div>

              {/* Action Buttons in Header */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
                <button
                  onClick={handlePrintKOT}
                  className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-border text-xs font-bold text-text-primary transition-all flex items-center gap-1.5"
                  title="Print KOT Slip"
                >
                  <Printer className="w-3.5 h-3.5 text-blue-400" /> Print KOT
                </button>

                <button
                  onClick={() => router.push(`/admin/pos/create-order?table=${encodeURIComponent(selectedOrder.table)}`)}
                  className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-border text-xs font-bold text-text-primary transition-all flex items-center gap-1.5"
                  title="Add Items to this table"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-400" /> Add Items
                </button>

                {selectedOrder.status === 'PREPARING' && (
                  <button
                    onClick={() => handleUpdateStatus('READY')}
                    disabled={isUpdatingStatus}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider transition-all shadow-md flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Ready for Service
                  </button>
                )}

                {selectedOrder.status === 'READY' && (
                  <button
                    onClick={() => handleUpdateStatus('SERVED')}
                    disabled={isUpdatingStatus}
                    className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#3B82F6] text-white text-xs font-black uppercase tracking-wider transition-all shadow-md flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Mark Served
                  </button>
                )}

                <button
                  onClick={handleCancelOrder}
                  className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-bold transition-all"
                  title="Cancel / Void Order"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Order Items Body */}
            <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6 space-y-6">
              
              {/* Kitchen Note Alert or Add Input */}
              <div className="bg-surface border border-border rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-text-tertiary flex items-center gap-1.5">
                    <ChefHat className="w-3.5 h-3.5 text-amber-400" /> Kitchen Instructions
                  </span>
                </div>
                {selectedOrder.kitchenNotes ? (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-200 text-xs flex gap-2 items-start font-medium">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>{selectedOrder.kitchenNotes}</div>
                  </div>
                ) : (
                  <input
                    type="text"
                    placeholder="Add kitchen note (e.g., Less spicy, no peanuts) — press Enter to save"
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-xs text-text-primary outline-none focus:border-[#3B82F6] transition-colors"
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
                          toast.success('Kitchen note saved')
                          input.value = ''
                          mutate()
                        }
                      }
                    }}
                  />
                )}
              </div>

              {/* Grouped Courses & Items */}
              {selectedOrder.items && selectedOrder.items.length > 0 ? (
                <div className="space-y-6">
                  {getGroupedItems(selectedOrder.items).map((course: any, idx: number) => (
                    <div key={idx} className="space-y-3">
                      <div className="text-[11px] font-black text-text-tertiary uppercase tracking-widest flex items-center gap-2">
                        <Utensils className="w-3.5 h-3.5 text-blue-400" />
                        {course.name}
                      </div>
                      <div className="grid gap-2.5">
                        {course.items.map((item: any, i: number) => (
                          <div key={i} className="flex justify-between items-center p-4 rounded-2xl bg-surface border border-border hover:border-white/10 transition-colors">
                            <div className="flex items-center gap-3">
                              {item.image && (
                                <img src={item.image} alt={item.name} className="w-10 h-10 rounded-xl object-cover border border-border shrink-0" />
                              )}
                              <div>
                                <div className="text-sm font-bold text-text-primary">{item.name}</div>
                                {item.description && (
                                  <div className="text-[11px] text-text-tertiary line-clamp-1">{item.description}</div>
                                )}
                                {item.allergy && (
                                  <div className="text-[10px] font-bold text-red-400 mt-1 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" /> {item.allergy}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-5 text-sm shrink-0">
                              <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-white/5 border border-border text-text-secondary">
                                x{item.quantity}
                              </span>
                              <span className="text-base font-black text-text-primary">
                                ₹{(item.price * item.quantity).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center text-text-tertiary">
                  <p className="font-medium text-sm">No items in this order.</p>
                </div>
              )}
            </div>

            {/* Bottom Checkout & Settlement Bar */}
            <div className="px-6 sm:px-8 py-4 border-t border-border bg-surface-light flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
              <div className="flex items-center gap-6">
                <div>
                  <div className="text-text-tertiary text-[10px] uppercase font-bold tracking-wider">Subtotal</div>
                  <div className="font-bold text-text-primary mt-0.5 text-sm">₹{(selectedOrder.subtotal || 0).toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-text-tertiary text-[10px] uppercase font-bold tracking-wider">Taxes / GST</div>
                  <div className="font-bold text-text-primary mt-0.5 text-sm">₹{(selectedOrder.tax || 0).toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-text-tertiary text-[10px] uppercase font-bold tracking-wider">Net Amount</div>
                  <div className="text-2xl font-black text-[#3B82F6]">₹{(selectedOrder.total || 0).toFixed(2)}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => router.push(`/admin/pos/transactions?orderId=${selectedOrder.id}`)}
                  className="flex-1 sm:flex-none px-7 py-3 rounded-2xl bg-[#2563EB] hover:bg-[#3B82F6] text-white font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 active:scale-95"
                >
                  <CreditCard className="w-4 h-4" /> Settle Bill & Checkout
                </button>
              </div>
            </div>

          </div>
        ) : (
          <div className="flex-1 bg-background flex flex-col items-center justify-center p-8 text-center text-text-tertiary">
            <Utensils className="w-16 h-16 mb-4 opacity-20" />
            <p className="font-bold text-base text-text-primary">Select an order from the list</p>
            <p className="text-xs text-text-secondary mt-1 max-w-sm">
              Click any active order on the left to inspect courses, update kitchen progress, print KOT, or finalize guest checkout.
            </p>
          </div>
        )}
      </div>

    </div>
  )
}
