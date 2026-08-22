'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import {
  Utensils, LayoutGrid, BellRing, UtensilsCrossed, ReceiptText, LogOut,
  CreditCard, Banknote, Bed, AlertCircle, Sparkles, CheckCircle2
} from 'lucide-react'
import { cn } from '@/lib/utils'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function ReviewBillPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderId = searchParams.get('orderId')

  const { data: order, isLoading, mutate } = useSWR(
    orderId ? `/api/admin/pos/orders/${orderId}` : null,
    fetcher
  )

  // Fetch all orders for interactive list selection
  const { data: allOrders } = useSWR('/api/admin/pos/orders', fetcher)
  
  // Filter active dining orders (not yet served/checked out)
  const activeOrders = React.useMemo(() => {
    if (!allOrders || !Array.isArray(allOrders)) return []
    return allOrders.filter((o: any) => o.status !== 'SERVED')
  }, [allOrders])

  const [paymentMethod, setPaymentMethod] = useState('Credit / Debit Card')
  const [roomNumber, setRoomNumber] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)

  // Signature Canvas Drawing Logic
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)

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
  }, [isLoading, order])

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    setIsDrawing(true)
    const rect = canvas.getBoundingClientRect()
    
    // Support mouse or touch events
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

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  const handleProcessPayment = async () => {
    if (!orderId) return
    setIsProcessing(true)

    try {
      const res = await fetch(`/api/admin/pos/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'SERVED',
          paymentMethod,
          roomNumber: paymentMethod === 'Room Charge' ? roomNumber : undefined
        })
      })

      if (res.ok) {
        setPaymentSuccess(true)
        setTimeout(() => {
          router.push('/admin/pos')
        }, 1500)
      }
    } catch (error) {
      console.error('Error processing payment:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  // Calculate bill parameters based on reference screenshot
  const subtotal = order?.subtotal || 0
  const serviceCharge = subtotal * 0.10 // 10%
  const vat = subtotal * 0.07 // 7%
  const total = subtotal + serviceCharge + vat

  if (isLoading) {
    return (
      <div className="flex h-full min-h-[calc(100vh-100px)] bg-[#0B1120] items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#3B82F6] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-gray-400 font-medium">Loading Bill details...</p>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="flex h-full min-h-[calc(100vh-100px)] bg-[#0B1120] items-center justify-center text-white p-8">
        <div className="w-full max-w-xl bg-[#1E293B] border border-white/5 rounded-3xl p-10 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-[#3B82F6]/10 text-[#3B82F6] flex items-center justify-center mx-auto mb-4">
              <ReceiptText className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-black mb-2 tracking-tight">No Order Selected</h2>
            <p className="text-gray-400 text-sm">Please select an active dining order below or go to the floor plan to process checkout.</p>
          </div>

          {/* Active Orders List Selector */}
          <div className="space-y-4 mb-8">
            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Active Dining Orders ({activeOrders.length})</h3>
            
            {activeOrders.length > 0 ? (
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {activeOrders.map((o: any) => (
                  <button
                    key={o.id}
                    onClick={() => router.push(`/admin/pos/transactions?orderId=${o.id}`)}
                    className="w-full flex items-center justify-between p-5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all text-left group"
                  >
                    <div>
                      <div className="font-bold text-white text-base group-hover:text-[#3B82F6] transition-colors">Table {o.table}</div>
                      <div className="text-xs text-gray-400 mt-1">Order {o.orderNumber} • Guest: {o.guestName}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-white text-base">₹{(o.total || 0).toLocaleString('en-IN')}</div>
                      <div className="text-[10px] font-black uppercase tracking-wider text-blue-400 mt-1">{o.status}</div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 border border-white/5 border-dashed rounded-3xl bg-white/[0.01]">
                <AlertCircle className="w-8 h-8 text-gray-600 mx-auto mb-2 opacity-40" />
                <p className="text-xs text-gray-500 font-semibold">No active orders found in the system.</p>
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <button 
              onClick={() => router.push('/admin/pos/floor-plan')} 
              className="flex-1 py-4 bg-[#3B82F6] hover:bg-[#2563EB] text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-colors shadow-lg shadow-blue-500/10 text-center"
            >
              Go to Floor Plan
            </button>
            <button 
              onClick={() => router.push('/admin/pos')} 
              className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-colors text-center"
            >
              POS Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (paymentSuccess) {
    return (
      <div className="flex h-full min-h-[calc(100vh-100px)] bg-[#0B1120] items-center justify-center text-white p-8">
        <div className="text-center bg-[#1E293B] border border-white/5 rounded-3xl p-12 max-w-md shadow-2xl scale-[1.02] transition-transform duration-300">
          <div className="w-20 h-20 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner shadow-green-500/5">
            <CheckCircle2 className="w-10 h-10 animate-bounce" />
          </div>
          <h2 className="text-3xl font-black mb-2 tracking-tight">Payment Verified</h2>
          <p className="text-gray-400 text-sm">Table {order.table} has been cleared. Returning to Dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-[calc(100vh-100px)] bg-[#0B1120] text-white -mx-6 md:-mx-8 -my-6 md:-my-8 overflow-hidden font-sans">
      
      {/* Middle Column - Review Bill */}
      <div className="flex-1 bg-[#0F172A] border-r border-white/5 flex flex-col relative z-0">
        <div className="p-10 pb-6 border-b border-white/5">
          <div className="text-xs font-bold text-[#3B82F6] tracking-widest uppercase">Table {order.table} • Dinner Service</div>
          <div className="flex justify-between items-end mt-2">
            <h1 className="text-4xl font-black tracking-tight text-white">Review Bill</h1>
            <span className="text-xs text-gray-500 font-bold uppercase">Order ID {order.orderNumber}</span>
          </div>
        </div>

        {/* Ordered Item List */}
        <div className="flex-1 overflow-y-auto p-10 space-y-6">
          {order.items?.map((item: any, idx: number) => (
            <div key={idx} className="flex gap-5 items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-white/5 border border-white/5 overflow-hidden flex-shrink-0 relative">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover opacity-80" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600"><Utensils className="w-5 h-5" /></div>
                  )}
                  <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-[#3B82F6] flex items-center justify-center text-[10px] font-black text-white shadow-md">
                    {item.quantity}
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">{item.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{item.course}</p>
                </div>
              </div>
              <span className="text-lg font-black text-white">₹{(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>

        {/* Breakdown Stats */}
        <div className="p-10 border-t border-white/5 bg-[#0F172A] flex flex-col gap-4">
          <div className="space-y-3 bg-[#1E293B]/30 border border-white/5 rounded-3xl p-6">
            <div className="flex justify-between text-sm text-gray-400">
              <span>Subtotal</span>
              <span className="font-bold text-white">₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-400">
              <span>Service Charge (10%)</span>
              <span className="font-bold text-white">₹{serviceCharge.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-400">
              <span>VAT (7%)</span>
              <span className="font-bold text-white">₹{vat.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-end pt-3 border-t border-white/5">
              <span className="text-sm font-black text-gray-400 uppercase tracking-widest">Total Amount</span>
              <span className="text-4xl font-black text-[#3B82F6] tracking-tighter">₹{total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column - Payment Method Selection */}
      <div className="w-[420px] bg-[#0B1120] flex flex-col p-8 z-0 overflow-y-auto">
        <h2 className="text-lg font-black tracking-tight uppercase text-gray-400 mb-6">Payment Method</h2>
        
        {/* Method Selectors */}
        <div className="space-y-4 mb-8">
          {[
            { name: 'Credit / Debit Card', desc: 'Visa, Mastercard, AMEX', icon: <CreditCard className="w-5 h-5" /> },
            { name: 'Cash Payment', desc: 'Physical currency terminal', icon: <Banknote className="w-5 h-5" /> },
            { name: 'Room Charge', desc: 'Post to guest folio', icon: <Bed className="w-5 h-5" /> }
          ].map(method => (
            <div
              key={method.name}
              onClick={() => setPaymentMethod(method.name)}
              className={cn(
                "flex items-center gap-4 p-5 rounded-3xl border cursor-pointer transition-all duration-300",
                paymentMethod === method.name
                  ? "bg-[#0A4186] border-transparent text-white shadow-lg shadow-blue-500/10 scale-[1.02]"
                  : "bg-[#1E293B] border-white/5 text-white hover:bg-[#233648] hover:border-white/10"
              )}
            >
              <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center shadow-inner", paymentMethod === method.name ? "bg-white/10 text-white" : "bg-[#0B1120] text-gray-400")}>
                {method.icon}
              </div>
              <div>
                <div className="text-sm font-bold">{method.name}</div>
                <div className={cn("text-[10px] font-semibold", paymentMethod === method.name ? "text-white/60" : "text-gray-500")}>{method.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Guest Room Number - Show if Room Charge is selected */}
        {paymentMethod === 'Room Charge' && (
          <div className="space-y-2 mb-8 animate-fadeIn">
            <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Guest Room Number</label>
            <input
              type="text"
              placeholder="e.g. 402"
              value={roomNumber}
              onChange={e => setRoomNumber(e.target.value)}
              className="w-full bg-[#1E293B] border border-white/5 rounded-2xl py-4 px-6 text-sm outline-none text-white focus:border-[#3B82F6] transition-colors"
            />
          </div>
        )}

        {/* Digital Signature */}
        <div className="space-y-2 mb-8 flex-1 flex flex-col">
          <div className="flex justify-between items-center mb-1">
            <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Digital Signature</label>
            <button onClick={clearSignature} className="text-[10px] text-[#3B82F6] font-black uppercase tracking-widest hover:underline">
              Clear
            </button>
          </div>
          <div className="flex-1 bg-[#1E293B] border border-white/5 rounded-3xl overflow-hidden relative shadow-inner min-h-[160px] flex">
            <canvas
              ref={canvasRef}
              width={356}
              height={180}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="absolute inset-0 w-full h-full cursor-crosshair"
            />
          </div>
        </div>

        {/* Process Payment Button */}
        <button
          onClick={handleProcessPayment}
          disabled={isProcessing || (paymentMethod === 'Room Charge' && !roomNumber)}
          className={cn(
            "w-full h-[60px] rounded-3xl font-black text-sm tracking-wide transition-all shadow-lg flex items-center justify-center gap-2",
            (paymentMethod === 'Room Charge' && !roomNumber)
              ? "bg-gray-800 text-gray-600 border border-white/5 cursor-not-allowed"
              : "bg-[#2563EB] hover:bg-[#3B82F6] text-white shadow-blue-500/20 hover:-translate-y-0.5 active:translate-y-0"
          )}
        >
          {isProcessing ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>Process Payment <ArrowRight className="w-4 h-4" /></>
          )}
        </button>

      </div>

    </div>
  )
}

// Simple Arrow icon fallback if Lucide is missing it
function ArrowRight(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
  )
}
