'use client'

import React, { useState, useRef, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import {
  Utensils, LayoutGrid, BellRing, UtensilsCrossed, ReceiptText, LogOut,
  CreditCard, Banknote, Bed, AlertCircle, Sparkles, CheckCircle2,
  Search, ArrowLeft, Printer, Download, Filter, Calendar, TrendingUp,
  DollarSign, Check, X, Percent, QrCode, Smartphone, Plus
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { buildContextUrl } from '@/lib/admin-context'
import { useSession } from 'next-auth/react'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function POSTransactionsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryOrderId = searchParams.get('orderId')

  const apiUrl = typeof window !== 'undefined' ? buildContextUrl('/api/admin/pos/orders') : '/api/admin/pos/orders'
  const { data: allOrders, isLoading, mutate } = useSWR(apiUrl, fetcher, { refreshInterval: 5000 })

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(queryOrderId || null)
  const [activeTab, setActiveTab] = useState<'ALL' | 'SETTLED' | 'ACTIVE'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [invoiceModalOrder, setInvoiceModalOrder] = useState<any | null>(null)

  // Payment Form State
  const [paymentMethod, setPaymentMethod] = useState('Credit / Debit Card')
  const [roomNumber, setRoomNumber] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)

  // Active Rooms for Room Charge verification
  const [activeRooms, setActiveRooms] = useState<any[]>([])
  const [loadingActiveRooms, setLoadingActiveRooms] = useState(false)
  const [verifiedBooking, setVerifiedBooking] = useState<any | null>(null)
  const [roomError, setRoomError] = useState<string | null>(null)

  // Discount State
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false)
  const [discountType, setDiscountType] = useState('Percentage')
  const [discountValue, setDiscountValue] = useState(0)
  const [discountReason, setDiscountReason] = useState('Staff Discount')
  const [authKey, setAuthKey] = useState('')
  const [appliedDiscountAmt, setAppliedDiscountAmt] = useState(0)

  // Digital Signature Canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)

  useEffect(() => {
    if (queryOrderId) {
      setSelectedOrderId(queryOrderId)
    }
  }, [queryOrderId])

  const selectedOrder = useMemo(() => {
    if (!selectedOrderId || !Array.isArray(allOrders)) return null
    return allOrders.find((o: any) => o.id === selectedOrderId) || null
  }, [selectedOrderId, allOrders])

  // Fetch active checked-in rooms when Room Charge is selected
  useEffect(() => {
    if (paymentMethod === 'Room Charge') {
      setLoadingActiveRooms(true)
      const url = typeof window !== 'undefined' ? buildContextUrl('/api/admin/pos/active-rooms') : '/api/admin/pos/active-rooms'
      fetch(url)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data?.rooms)) {
            setActiveRooms(data.rooms)
          } else {
            setActiveRooms([])
          }
        })
        .catch(err => {
          console.error('Error fetching active rooms:', err)
          setActiveRooms([])
        })
        .finally(() => setLoadingActiveRooms(false))
    }
  }, [paymentMethod])

  // Auto-fill roomNumber if selectedOrder table looks like a room
  useEffect(() => {
    if (selectedOrder?.table && !roomNumber) {
      const match = selectedOrder.table.match(/^(?:Room\s*)?(\w+)$/i)
      if (match && selectedOrder.table.toLowerCase().includes('room')) {
        setRoomNumber(match[1])
      }
    }
  }, [selectedOrder])

  // Validate room number when it changes
  useEffect(() => {
    if (paymentMethod !== 'Room Charge') {
      setVerifiedBooking(null)
      setRoomError(null)
      return
    }

    const cleanInput = roomNumber.trim().replace(/^room\s*/i, '')
    if (!cleanInput) {
      setVerifiedBooking(null)
      setRoomError(null)
      return
    }

    const match = activeRooms.find(r => r.roomNumber.toLowerCase() === cleanInput.toLowerCase())
    if (match) {
      setVerifiedBooking(match)
      setRoomError(null)
      return
    }

    if (!loadingActiveRooms && activeRooms.length > 0) {
      setVerifiedBooking(null)
      setRoomError(`Room ${cleanInput} has no active checked-in booking. Room charge cannot be accepted.`)
      return
    }

    if (!loadingActiveRooms) {
      const verifyUrl = typeof window !== 'undefined'
        ? buildContextUrl(`/api/admin/pos/active-rooms?roomNumber=${encodeURIComponent(cleanInput)}`)
        : `/api/admin/pos/active-rooms?roomNumber=${encodeURIComponent(cleanInput)}`
      
      let isSubscribed = true
      fetch(verifyUrl)
        .then(res => res.json())
        .then(data => {
          if (!isSubscribed) return
          if (data.valid && data.booking) {
            setVerifiedBooking(data.booking)
            setRoomError(null)
          } else {
            setVerifiedBooking(null)
            setRoomError(data.error || `Room ${cleanInput} has no active checked-in booking.`)
          }
        })
        .catch(() => {
          if (!isSubscribed) return
          setVerifiedBooking(null)
          setRoomError(`Could not verify room ${cleanInput}`)
        })

      return () => { isSubscribed = false }
    }
  }, [roomNumber, activeRooms, paymentMethod, loadingActiveRooms])

  // Canvas initialization
  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.strokeStyle = '#FFFFFF'
        ctx.lineWidth = 3
        ctx.lineCap = 'round'
      }
    }
  }, [selectedOrder, isDiscountModalOpen])

  // Signature drawing methods
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    setIsDrawing(true)
    const rect = canvas.getBoundingClientRect()
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = () => setIsDrawing(false)
  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  // Filtered transactions for the history dashboard
  const ordersList = Array.isArray(allOrders) ? allOrders : []

  const filteredOrders = useMemo(() => {
    return ordersList.filter((order: any) => {
      // Tab filter
      if (activeTab === 'SETTLED' && order.status !== 'SERVED') return false
      if (activeTab === 'ACTIVE' && order.status === 'SERVED') return false

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchTable = String(order.table || '').toLowerCase().includes(q)
        const matchGuest = String(order.guestName || '').toLowerCase().includes(q)
        const matchOrderNo = String(order.orderNumber || '').toLowerCase().includes(q)
        const matchTags = Array.isArray(order.tags) && order.tags.some((t: string) => t.toLowerCase().includes(q))
        return matchTable || matchGuest || matchOrderNo || matchTags
      }

      return true
    })
  }, [ordersList, activeTab, searchQuery])

  // KPI Calculations
  const stats = useMemo(() => {
    const settled = ordersList.filter((o: any) => o.status === 'SERVED')
    const active = ordersList.filter((o: any) => o.status !== 'SERVED' && o.status !== 'CANCELLED')
    const totalRev = settled.reduce((acc: number, o: any) => acc + (o.total || 0), 0)
    const avgBill = settled.length > 0 ? totalRev / settled.length : 0

    return {
      totalRev,
      settledCount: settled.length,
      activeCount: active.length,
      avgBill
    }
  }, [ordersList])

  // Calculation for current checkout order
  const subtotal = selectedOrder?.subtotal || 0
  const postDiscountSubtotal = Math.max(0, subtotal - appliedDiscountAmt)
  const serviceCharge = postDiscountSubtotal * 0.10 // 10%
  const vat = postDiscountSubtotal * 0.07 // 7%
  const total = postDiscountSubtotal + serviceCharge + vat

  const handleApplyDiscount = async () => {
    if (!authKey) {
      toast.error('Please enter Manager Authorization PIN')
      return
    }

    try {
      const activePropertyId = (session?.user as any)?.propertyId || 
        (typeof window !== 'undefined' ? localStorage.getItem('super_admin_property_context') : undefined)

      const res = await fetch('/api/admin/pos/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin: authKey.trim(),
          propertyId: activePropertyId && activePropertyId !== 'ALL' ? activePropertyId : undefined
        })
      })
      const data = await res.json().catch(() => ({}))
      if (!data.valid) {
        toast.error(data.error || 'Invalid Manager Authorization PIN')
        return
      }
    } catch {
      if (authKey.trim() !== '1234') {
        toast.error('Invalid Manager Authorization PIN')
        return
      }
    }

    let amt = 0
    if (discountType === 'Percentage') {
      amt = subtotal * (discountValue / 100)
    } else {
      amt = discountValue
    }

    setAppliedDiscountAmt(amt)
    setIsDiscountModalOpen(false)
    toast.success(`Discount of ₹${amt.toFixed(2)} applied`)
  }

  const handleProcessPayment = async () => {
    if (!selectedOrder) return
    if (paymentMethod === 'Room Charge' && !verifiedBooking) {
      toast.error('Cannot settle via Room Charge without a verified checked-in guest')
      return
    }
    setIsProcessing(true)

    try {
      const res = await fetch(`/api/admin/pos/orders/${selectedOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'SERVED',
          paymentMethod,
          roomNumber: paymentMethod === 'Room Charge' ? (verifiedBooking?.roomNumber || roomNumber) : undefined,
          bookingId: paymentMethod === 'Room Charge' ? verifiedBooking?.bookingId : undefined,
          discountAmt: appliedDiscountAmt,
          discountReason
        })
      })

      const data = await res.json().catch(() => ({}))

      if (res.ok) {
        setPaymentSuccess(true)
        mutate()
        toast.success(paymentMethod === 'Room Charge' ? `Charged to Room ${verifiedBooking?.roomNumber} (${verifiedBooking?.guestName})` : 'Bill settled successfully')
        setTimeout(() => {
          setPaymentSuccess(false)
          setSelectedOrderId(null)
          router.push('/admin/pos/transactions')
        }, 1600)
      } else {
        toast.error(data.error || 'Failed to settle bill')
      }
    } catch (e: any) {
      toast.error(e?.message || 'Error processing settlement')
    } finally {
      setIsProcessing(false)
    }
  }

  // Print Invoice / Receipt
  const handlePrintReceipt = (orderToPrint: any) => {
    if (!orderToPrint) return
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      toast.error('Please allow popups to print receipt')
      return
    }

    const itemsHtml = (orderToPrint.items || []).map((it: any) => `
      <tr>
        <td style="padding: 6px 0;">${it.name} x${it.quantity}</td>
        <td style="text-align: right; padding: 6px 0;">₹${(it.price * it.quantity).toFixed(2)}</td>
      </tr>
    `).join('')

    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt - Order ${orderToPrint.orderNumber}</title>
          <style>
            body { font-family: monospace; padding: 24px; max-width: 320px; margin: 0 auto; color: #111; }
            h2 { text-align: center; margin-bottom: 2px; }
            p { margin: 3px 0; font-size: 12px; }
            hr { border: 1px dashed #444; margin: 10px 0; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
          </style>
        </head>
        <body>
          <h2>ZENBOURG RESORT & POS</h2>
          <p style="text-align: center; font-size: 11px;">Official Tax Invoice / Receipt</p>
          <hr/>
          <p><strong>Table / Outlet:</strong> ${orderToPrint.table}</p>
          <p><strong>Order #:</strong> ${orderToPrint.orderNumber}</p>
          <p><strong>Date & Time:</strong> ${new Date(orderToPrint.createdAt || Date.now()).toLocaleString()}</p>
          <p><strong>Server:</strong> ${orderToPrint.serverName || 'Staff'}</p>
          <p><strong>Guest:</strong> ${orderToPrint.guestName || 'Walk-in'}</p>
          <hr/>
          <table>${itemsHtml}</table>
          <hr/>
          <p>Subtotal: <span style="float: right;">₹${(orderToPrint.subtotal || 0).toFixed(2)}</span></p>
          <p>Tax / GST: <span style="float: right;">₹${(orderToPrint.tax || 0).toFixed(2)}</span></p>
          <p style="font-size: 14px; font-weight: bold; margin-top: 6px;">
            Total Paid: <span style="float: right;">₹${(orderToPrint.total || 0).toFixed(2)}</span>
          </p>
          <hr/>
          <p style="text-align: center; font-size: 11px; margin-top: 12px;">Thank you for dining with us!</p>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  if (isLoading && !allOrders) {
    return (
      <div className="flex h-full min-h-[calc(100vh-100px)] bg-background items-center justify-center text-text-primary">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#3B82F6] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-text-secondary font-medium">Loading POS Transactions...</p>
        </div>
      </div>
    )
  }

  // MODE A: ORDER BILL SETTLEMENT (When an order is selected for checkout)
  if (selectedOrder) {
    if (paymentSuccess) {
      return (
        <div className="flex h-full min-h-[calc(100vh-100px)] bg-background items-center justify-center text-text-primary p-6">
          <div className="text-center bg-surface border border-border rounded-3xl p-8 sm:p-12 max-w-md shadow-2xl animate-in zoom-in-95">
            <div className="w-20 h-20 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <CheckCircle2 className="w-10 h-10 animate-bounce" />
            </div>
            <h2 className="text-3xl font-black mb-2 tracking-tight text-white">Payment Verified</h2>
            <p className="text-text-secondary text-sm mb-6">
              Table {selectedOrder.table} has been settled. Order marked as completed.
            </p>
            <div className="text-2xl font-black text-[#3B82F6] mb-4">
              ₹{(selectedOrder.total || 0).toFixed(2)}
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="flex flex-col lg:flex-row h-full min-h-[calc(100vh-100px)] bg-background text-text-primary -mx-4 sm:-mx-6 md:-mx-8 -my-6 md:-my-8 overflow-y-auto lg:overflow-hidden font-sans">
        
        {/* Left / Middle: Bill Details */}
        <div className="flex-1 bg-background border-r-0 lg:border-r border-border flex flex-col relative z-0">
          <div className="p-6 sm:p-8 pb-4 border-b border-border bg-surface/30">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setSelectedOrderId(null)
                    router.push('/admin/pos/transactions')
                  }}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-border text-text-primary transition-all"
                  title="Back to Transaction History"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <div className="text-[10px] font-black text-text-tertiary tracking-widest uppercase mb-0.5">
                    Table {selectedOrder.table} • Guest Settlement
                  </div>
                  <h1 className="text-2xl font-black text-text-primary">Review Bill & Settle</h1>
                </div>
              </div>
              <span className="text-xs font-bold text-text-secondary px-3 py-1 rounded-lg bg-white/5 border border-border">
                Order #{selectedOrder.orderNumber}
              </span>
            </div>
          </div>

          {/* Ordered Item List */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-3">
            {selectedOrder.items && selectedOrder.items.length > 0 ? (
              selectedOrder.items.map((item: any, idx: number) => (
                <div key={idx} className="flex gap-4 items-center justify-between p-3.5 rounded-2xl bg-surface border border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-surface-light border border-border overflow-hidden shrink-0 flex items-center justify-center">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <Utensils className="w-4 h-4 text-text-tertiary" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-text-primary text-sm">{item.name}</h3>
                      <p className="text-[10px] text-text-tertiary">{item.course || 'Mains'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-black text-text-secondary px-2 py-0.5 bg-white/5 rounded-lg border border-border">
                      x{item.quantity}
                    </span>
                    <span className="text-sm font-black text-text-primary min-w-[70px] text-right">
                      ₹{(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-text-tertiary">No items found</div>
            )}
          </div>

          {/* Breakdown Summary */}
          <div className="p-6 sm:p-8 border-t border-border bg-surface-light space-y-3">
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-xs font-black text-text-tertiary uppercase tracking-widest">Bill Summary</h3>
              {appliedDiscountAmt === 0 && (
                <button 
                  onClick={() => setIsDiscountModalOpen(true)}
                  className="text-xs font-bold text-[#3B82F6] hover:underline flex items-center gap-1"
                >
                  <Percent className="w-3.5 h-3.5" /> Apply Discount
                </button>
              )}
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-text-secondary">
                <span>Subtotal</span>
                <span className="font-bold text-text-primary">₹{subtotal.toFixed(2)}</span>
              </div>
              {appliedDiscountAmt > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Discount ({discountReason})</span>
                  <span className="font-bold">-₹{appliedDiscountAmt.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-text-secondary">
                <span>Service Charge (10%)</span>
                <span className="font-bold text-text-primary">₹{serviceCharge.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-text-secondary">
                <span>VAT / GST (7%)</span>
                <span className="font-bold text-text-primary">₹{vat.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-end pt-3 border-t border-border mt-2">
                <span className="text-sm font-black text-text-secondary uppercase tracking-wider">Total Due</span>
                <span className="text-3xl font-black text-[#3B82F6]">₹{total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Payment Method & Signature */}
        <div className="w-full lg:w-[380px] xl:w-[420px] bg-background border-t lg:border-t-0 border-border flex flex-col p-6 sm:p-8 overflow-y-auto">
          <h2 className="text-base font-black text-text-primary mb-4">Payment Method</h2>
          
          <div className="space-y-2.5 mb-6">
            {[
              { name: 'Credit / Debit Card', desc: 'Swipe, Chip or Contactless', icon: <CreditCard className="w-4 h-4 text-blue-400" /> },
              { name: 'Cash Payment', desc: 'Direct cash drawer receipt', icon: <Banknote className="w-4 h-4 text-emerald-400" /> },
              { name: 'UPI / QR Payment', desc: 'Instant GPay, PhonePe, Paytm', icon: <QrCode className="w-4 h-4 text-purple-400" /> },
              { name: 'Room Charge', desc: 'Post to Hotel Guest Folio', icon: <Bed className="w-4 h-4 text-amber-400" /> }
            ].map(method => (
              <div
                key={method.name}
                onClick={() => setPaymentMethod(method.name)}
                className={cn(
                  "flex items-center gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all",
                  paymentMethod === method.name
                    ? "bg-[#2563EB]/10 border-[#2563EB] text-text-primary shadow-sm"
                    : "bg-surface border-border text-text-primary hover:bg-white/5"
                )}
              >
                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center bg-white/5 shrink-0")}>
                  {method.icon}
                </div>
                <div>
                  <div className="text-sm font-bold">{method.name}</div>
                  <div className="text-[10px] text-text-tertiary">{method.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {paymentMethod === 'Room Charge' && (
            <div className="space-y-3 mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-amber-200 flex items-center gap-1.5">
                  <Bed className="w-3.5 h-3.5" />
                  Room Charge Verification *
                </label>
                {loadingActiveRooms && (
                  <span className="text-[10px] text-amber-300 animate-pulse">Checking active bookings...</span>
                )}
              </div>

              {/* Quick Select from Active Checked-in Rooms */}
              {activeRooms.length > 0 ? (
                <div>
                  <label className="text-[10px] uppercase font-bold text-text-tertiary mb-1 block">
                    Select Active Checked-In Room
                  </label>
                  <select
                    value={verifiedBooking ? verifiedBooking.roomNumber : ''}
                    onChange={e => {
                      const selected = activeRooms.find(r => r.roomNumber === e.target.value)
                      if (selected) {
                        setRoomNumber(selected.roomNumber)
                        setVerifiedBooking(selected)
                        setRoomError(null)
                      } else {
                        setRoomNumber(e.target.value)
                      }
                    }}
                    className="w-full bg-background border border-amber-500/40 rounded-xl py-2 px-3 text-sm text-text-primary outline-none focus:border-amber-400 font-semibold"
                  >
                    <option value="">-- Choose active checked-in room --</option>
                    {activeRooms.map(r => (
                      <option key={r.bookingId} value={r.roomNumber}>
                        Room {r.roomNumber} ({r.roomType || 'Standard'}) - {r.guestName}
                      </option>
                    ))}
                  </select>
                </div>
              ) : !loadingActiveRooms ? (
                <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>No guests currently checked in. Room Charge requires an active checked-in booking.</span>
                </div>
              ) : null}

              {/* Manual Room Number Input */}
              <div>
                <label className="text-[10px] uppercase font-bold text-text-tertiary mb-1 block">
                  Or Type Room Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. 101 or 202"
                  value={roomNumber}
                  onChange={e => setRoomNumber(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl py-2 px-4 text-sm outline-none text-text-primary focus:border-amber-400 font-medium"
                />
              </div>

              {/* Verification Feedback Badge */}
              {verifiedBooking && (
                <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200">
                  <div className="flex items-center gap-2 font-bold text-xs text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Verified Resident Guest</span>
                  </div>
                  <div className="mt-1 text-xs text-text-secondary pl-6 space-y-0.5">
                    <div><strong className="text-text-primary">{verifiedBooking.guestName}</strong> (Room {verifiedBooking.roomNumber} • {verifiedBooking.roomType || 'Standard'})</div>
                    {verifiedBooking.guestPhone && <div className="text-[10px] text-text-tertiary">Phone: {verifiedBooking.guestPhone}</div>}
                    <div className="text-[10px] text-emerald-400/80 font-mono">Folio Booking: {verifiedBooking.bookingId.slice(-8).toUpperCase()}</div>
                  </div>
                </div>
              )}

              {roomError && (
                <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-xs text-red-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">Cannot Post Room Charge</div>
                    <div className="text-[11px] text-red-200/90">{roomError}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Digital Signature */}
          <div className="space-y-2 mb-6">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-text-secondary">Guest Signature (Optional)</label>
              <button onClick={clearSignature} className="text-[10px] text-text-tertiary hover:text-text-primary font-bold">
                Clear
              </button>
            </div>
            <div className="bg-surface border border-border rounded-2xl overflow-hidden relative h-[100px] flex">
              <canvas
                ref={canvasRef}
                width={360}
                height={100}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-full cursor-crosshair"
              />
            </div>
          </div>

          {/* Settle Button */}
          <button
            onClick={handleProcessPayment}
            disabled={isProcessing || (paymentMethod === 'Room Charge' && !verifiedBooking)}
            className={cn(
              "w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2",
              (paymentMethod === 'Room Charge' && !verifiedBooking)
                ? "bg-gray-800 text-gray-500 cursor-not-allowed border border-border"
                : "bg-[#2563EB] hover:bg-[#3B82F6] text-white active:scale-95"
            )}
          >
            {isProcessing ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>Settle & Close Bill <Check className="w-4 h-4" /></>
            )}
          </button>
        </div>

        {/* DISCOUNT MODAL */}
        {isDiscountModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-surface border border-border rounded-3xl w-full max-w-sm p-6 shadow-2xl relative">
              <button 
                onClick={() => setIsDiscountModalOpen(false)}
                className="absolute top-5 right-5 text-text-secondary hover:text-text-primary"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-lg font-black mb-4">Apply POS Discount</h3>
              
              <div className="space-y-4">
                <div className="flex gap-2 p-1 bg-background rounded-xl border border-border">
                  {['Percentage', 'Amount'].map(type => (
                    <button
                      key={type}
                      onClick={() => setDiscountType(type)}
                      className={cn(
                        "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all",
                        discountType === type ? "bg-[#2563EB] text-white" : "text-text-tertiary"
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">Discount Value</label>
                  <input
                    type="number"
                    value={discountValue || ''}
                    onChange={e => setDiscountValue(parseFloat(e.target.value) || 0)}
                    placeholder={discountType === 'Percentage' ? 'e.g. 10 (%)' : 'e.g. 200 (₹)'}
                    className="w-full bg-background border border-border rounded-xl py-2.5 px-4 text-sm font-bold text-text-primary outline-none focus:border-[#3B82F6]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">Reason</label>
                  <select
                    value={discountReason}
                    onChange={e => setDiscountReason(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary outline-none"
                  >
                    <option value="Staff Discount">Staff Discount</option>
                    <option value="Management Comp">Management Comp</option>
                    <option value="Guest Recovery">Guest Recovery (Service Issue)</option>
                    <option value="Promotional Voucher">Promotional Voucher</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">Manager PIN</label>
                  <input
                    type="password"
                    placeholder="Enter PIN (e.g. 1234)"
                    value={authKey}
                    onChange={e => setAuthKey(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary outline-none text-center font-black tracking-widest"
                  />
                </div>

                <button
                  onClick={handleApplyDiscount}
                  className="w-full py-3 bg-[#2563EB] hover:bg-[#3B82F6] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md"
                >
                  Verify & Apply
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    )
  }

  // MODE B: FULL TRANSACTION HISTORY DASHBOARD
  return (
    <div className="space-y-6 pb-12 animate-fade-in font-sans">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-text-primary tracking-tight">Transaction History & Billing</h1>
          <p className="text-xs text-text-secondary mt-1">Audit settled restaurant bills, room charges, and pending POS receipts</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/admin/pos/create-order')}
            className="px-5 py-2.5 rounded-2xl bg-[#2563EB] hover:bg-[#3B82F6] text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-blue-500/20 active:scale-95 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> New Order
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface border border-border rounded-3xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-text-tertiary">Total POS Revenue</span>
            <div className="w-9 h-9 rounded-2xl bg-blue-500/10 flex items-center justify-center text-primary">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-text-primary">₹{stats.totalRev.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          <p className="text-[11px] text-primary font-semibold mt-1">All settled receipts</p>
        </div>

        <div className="bg-surface border border-border rounded-3xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-text-tertiary">Settled Bills</span>
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-text-primary">{stats.settledCount}</div>
          <p className="text-[11px] text-emerald-500 font-semibold mt-1">Closed & paid tickets</p>
        </div>

        <div className="bg-surface border border-border rounded-3xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-text-tertiary">Active Unsettled</span>
            <div className="w-9 h-9 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
              <Utensils className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-text-primary">{stats.activeCount}</div>
          <p className="text-[11px] text-amber-500 font-semibold mt-1">Tables currently dining</p>
        </div>

        <div className="bg-surface border border-border rounded-3xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-text-tertiary">Average Bill Size</span>
            <div className="w-9 h-9 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-text-primary">₹{stats.avgBill.toFixed(2)}</div>
          <p className="text-[11px] text-purple-500 font-semibold mt-1">Average guest ticket</p>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-surface border border-border p-3 rounded-2xl shadow-xs">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'ALL', label: 'All Transactions' },
            { id: 'SETTLED', label: 'Settled / Closed' },
            { id: 'ACTIVE', label: 'Pending Settlement' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                activeTab === tab.id ? "bg-primary text-white shadow-md shadow-primary/20" : "text-text-secondary hover:text-text-primary hover:bg-surface-light"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 text-text-tertiary absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search order #, table, guest or tag..."
            className="w-full bg-surface-light border border-border rounded-xl pl-9 pr-4 py-2 text-xs text-text-primary outline-none focus:border-primary placeholder:text-text-tertiary transition-colors"
          />
        </div>
      </div>

      {/* Transactions Table / List */}
      <div className="bg-surface border border-border rounded-3xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-light border-b border-border uppercase text-text-tertiary font-black tracking-wider text-[10px]">
              <tr>
                <th className="py-4 px-6">Order #</th>
                <th className="py-4 px-6">Table</th>
                <th className="py-4 px-6">Guest</th>
                <th className="py-4 px-6">Time</th>
                <th className="py-4 px-6">Server</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Total Amount</th>
                <th className="py-4 px-6 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-text-tertiary">
                    <ReceiptText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="font-bold text-sm text-text-primary">No transactions found</p>
                    <p className="text-xs text-text-tertiary mt-1">No orders match the selected criteria.</p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order: any) => {
                  const isSettled = order.status === 'SERVED'

                  return (
                    <tr key={order.id} className="hover:bg-surface-light/50 transition-colors">
                      <td className="py-4 px-6 font-bold text-text-primary">
                        {order.orderNumber}
                      </td>
                      <td className="py-4 px-6 font-bold text-text-primary">
                        {order.table}
                      </td>
                      <td className="py-4 px-6 text-text-secondary">
                        {order.guestName || 'Walk-in'}
                      </td>
                      <td className="py-4 px-6 text-text-tertiary">
                        {new Date(order.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}{' '}
                        {new Date(order.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-4 px-6 text-text-tertiary">
                        {order.serverName || 'Staff'}
                      </td>
                      <td className="py-4 px-6">
                        <span className={cn(
                          "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider",
                          isSettled ? "bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border border-emerald-500/20" : "bg-amber-500/15 text-amber-500 dark:text-amber-300 border border-amber-500/20"
                        )}>
                          {isSettled ? 'Paid / Closed' : order.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right font-black text-text-primary text-sm">
                        ₹{(order.total || 0).toFixed(2)}
                      </td>
                      <td className="py-4 px-6 text-center">
                        {isSettled ? (
                          <button
                            onClick={() => setInvoiceModalOrder(order)}
                            className="px-3.5 py-1.5 rounded-xl bg-surface-light hover:bg-surface text-text-primary font-bold text-[11px] transition-all border border-border flex items-center gap-1.5 mx-auto shadow-xs"
                          >
                            <ReceiptText className="w-3.5 h-3.5 text-primary" /> View Invoice
                          </button>
                        ) : (
                          <button
                            onClick={() => setSelectedOrderId(order.id)}
                            className="px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-[11px] transition-all shadow-md shadow-primary/20 flex items-center gap-1.5 mx-auto active:scale-95"
                          >
                            <CreditCard className="w-3.5 h-3.5" /> Settle Bill
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* VIEW INVOICE MODAL */}
      {invoiceModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="bg-[#1E293B] border border-white/10 rounded-3xl w-full max-w-lg p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setInvoiceModalOrder(null)}
              className="absolute top-6 right-6 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center pb-4 border-b border-white/5">
              <h3 className="text-xl font-black text-white tracking-tight">Tax Invoice & Receipt</h3>
              <p className="text-xs text-gray-400 mt-1">Official Guest POS Receipt</p>
            </div>

            <div className="py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs bg-[#0F172A] p-4 rounded-2xl border border-white/5">
                <div>
                  <span className="text-gray-500 text-[10px] uppercase font-bold block">Order #</span>
                  <span className="font-bold text-white">{invoiceModalOrder.orderNumber}</span>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px] uppercase font-bold block">Table / Location</span>
                  <span className="font-bold text-white">{invoiceModalOrder.table}</span>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px] uppercase font-bold block">Guest</span>
                  <span className="font-bold text-white">{invoiceModalOrder.guestName || 'Walk-in'}</span>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px] uppercase font-bold block">Date & Time</span>
                  <span className="font-bold text-white">{new Date(invoiceModalOrder.createdAt || Date.now()).toLocaleString()}</span>
                </div>
              </div>

              {/* Items */}
              <div className="space-y-2">
                <div className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Ordered Items</div>
                <div className="divide-y divide-white/5 bg-[#0F172A] rounded-2xl p-4 border border-white/5">
                  {(invoiceModalOrder.items || []).map((it: any, i: number) => (
                    <div key={i} className="flex justify-between items-center py-2 text-xs">
                      <span className="text-white font-medium">{it.name} <strong className="text-[#3B82F6]">x{it.quantity}</strong></span>
                      <span className="font-bold text-white">₹{(it.price * it.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="space-y-2 text-xs bg-[#0F172A] p-4 rounded-2xl border border-white/5">
                <div className="flex justify-between text-gray-400">
                  <span>Subtotal</span>
                  <span className="font-bold text-white">₹{(invoiceModalOrder.subtotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Tax / VAT</span>
                  <span className="font-bold text-white">₹{(invoiceModalOrder.tax || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base font-black text-white pt-2 border-t border-white/5">
                  <span>Grand Total Paid</span>
                  <span className="text-[#3B82F6]">₹{(invoiceModalOrder.total || 0).toFixed(2)}</span>
                </div>
              </div>

              {/* Tags / Payment Method */}
              {invoiceModalOrder.tags && invoiceModalOrder.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {invoiceModalOrder.tags.map((t: string, idx: number) => (
                    <span key={idx} className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-white/5 text-gray-300 border border-white/5">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => handlePrintReceipt(invoiceModalOrder)}
                className="flex-1 py-3 bg-[#2563EB] hover:bg-[#3B82F6] text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-md flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" /> Print Tax Receipt
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
