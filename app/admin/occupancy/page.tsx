'use client'

import { useState, useMemo } from 'react'
import useSWR from 'swr'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { buildContextUrl } from '@/lib/admin-context'
import { formatCurrency } from '@/lib/utils'
import { 
  BedDouble, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  Wrench, 
  UserCheck, 
  LogIn, 
  XOctagon,
  Building2,
  X,
  Sparkles,
  ArrowRight,
  Phone,
  Calendar,
  AlertTriangle,
  User,
  LogOut,
  Edit3
} from 'lucide-react'
import { cn } from '@/lib/utils'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function RoomOccupancyPage() {
  const router = useRouter()
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'OCCUPIED' | 'READY' | 'SERVICE' | 'OUT_OF_ORDER'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRoom, setSelectedRoom] = useState<any | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [actionSuccess, setActionSuccess] = useState('')

  const apiUrl = buildContextUrl('/api/admin/occupancy')
  const { data: rawData, error, isLoading, mutate: revalidate } = useSWR(apiUrl, fetcher, { refreshInterval: 10000 })

  const responseData = rawData?.data ?? rawData
  const summary = responseData?.summary ?? { totalRooms: 0, occupiedCount: 0, readyCount: 0, serviceCount: 0, outOfOrderCount: 0, occupancyRate: 0, availableCount: 0, maintenanceCount: 0 }
  const allRooms: any[] = responseData?.rooms ?? []

  const filteredRooms = useMemo(() => {
    return allRooms.filter(room => {
      if (activeFilter === 'OCCUPIED' && !room.isOccupied) return false
      if (activeFilter === 'READY' && !room.isReady) return false
      if (activeFilter === 'SERVICE' && !room.isService) return false
      if (activeFilter === 'OUT_OF_ORDER' && !room.isOutOfOrder) return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const roomNumMatches = String(room.roomNumber).toLowerCase().includes(q)
        const typeMatches = String(room.type || room.category || '').toLowerCase().includes(q)
        const guestMatches = room.currentBooking?.guestName?.toLowerCase().includes(q)
        return roomNumMatches || typeMatches || guestMatches
      }

      return true
    })
  }, [allRooms, activeFilter, searchQuery])

  const handleUpdateStatus = async (newStatus: string, checkOutEarly = false) => {
    if (!selectedRoom) return
    setIsUpdating(true)
    setActionSuccess('')

    try {
      const res = await fetch('/api/admin/occupancy', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: selectedRoom.id,
          status: newStatus,
          bookingId: selectedRoom.currentBooking?.id,
          checkOutEarly
        })
      })

      if (res.ok) {
        toast.success('Status updated successfully!')
        setActionSuccess('Status updated successfully!')
        await revalidate()
        setTimeout(() => {
          setSelectedRoom(null)
          setActionSuccess('')
        }, 800)
      } else {
        toast.error('Failed to update room status.')
      }
    } catch (err) {
      console.error('Error updating room:', err)
      toast.error('Error updating room status.')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-blue-500" />
            </div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">Room Occupancy Command Center</h1>
          </div>
          <p className="text-xs text-text-secondary mt-1">Real-time room availability, live guest occupancy, and maintenance tracking.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => revalidate()}
            className="flex items-center gap-2 px-4 py-2 bg-surface hover:bg-surface/80 rounded-xl text-xs font-bold text-text-primary transition-all active:scale-95 shadow-sm border border-border"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 text-blue-500", isLoading && "animate-spin")} />
            Refresh Occupancy
          </button>
          <button
            onClick={() => router.push('/admin/bookings/new')}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-blue-500/20 active:scale-95"
          >
            <LogIn className="w-4 h-4" /> New Booking
          </button>
        </div>
      </div>

      {/* KPI Summary Cards — Solid Colours Matching Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Occupied */}
        <div 
          onClick={() => setActiveFilter('OCCUPIED')}
          className={cn(
            "relative overflow-hidden rounded-3xl p-5 group shadow-lg transition-all cursor-pointer select-none",
            "bg-[#581C87] text-white shadow-[0_12px_24px_rgba(88,28,135,0.4)]",
            activeFilter === 'OCCUPIED' && "ring-2 ring-purple-300 scale-[1.02]"
          )}
        >
          <div className="flex justify-between items-start mb-3 relative z-10">
            <p className="text-[10px] font-black text-purple-200 uppercase tracking-[0.2em]">Occupied</p>
            <div className="w-9 h-9 rounded-2xl bg-black/20 flex items-center justify-center">
              <UserCheck className="w-4 h-4 text-purple-200" />
            </div>
          </div>
          <p className="text-3xl font-black text-white tracking-tight">{summary.occupiedCount}</p>
          <p className="text-[11px] text-purple-200/90 font-semibold mt-2">Active Checked-in Guests</p>
        </div>

        {/* Ready */}
        <div 
          onClick={() => setActiveFilter('READY')}
          className={cn(
            "relative overflow-hidden rounded-3xl p-5 group shadow-lg transition-all cursor-pointer select-none",
            "bg-[#065F46] text-white shadow-[0_12px_24px_rgba(6,95,70,0.4)]",
            activeFilter === 'READY' && "ring-2 ring-emerald-300 scale-[1.02]"
          )}
        >
          <div className="flex justify-between items-start mb-3 relative z-10">
            <p className="text-[10px] font-black text-emerald-200 uppercase tracking-[0.2em]">Ready</p>
            <div className="w-9 h-9 rounded-2xl bg-black/20 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-200" />
            </div>
          </div>
          <p className="text-3xl font-black text-white tracking-tight">{summary.readyCount ?? summary.availableCount}</p>
          <p className="text-[11px] text-emerald-200/90 font-semibold mt-2">Ready for Immediate Booking</p>
        </div>

        {/* Service */}
        <div 
          onClick={() => setActiveFilter('SERVICE')}
          className={cn(
            "relative overflow-hidden rounded-3xl p-5 group shadow-lg transition-all cursor-pointer select-none",
            "bg-[#78350F] text-white shadow-[0_12px_24px_rgba(120,53,15,0.4)]",
            activeFilter === 'SERVICE' && "ring-2 ring-amber-300 scale-[1.02]"
          )}
        >
          <div className="flex justify-between items-start mb-3 relative z-10">
            <p className="text-[10px] font-black text-amber-200 uppercase tracking-[0.2em]">Service</p>
            <div className="w-9 h-9 rounded-2xl bg-black/20 flex items-center justify-center">
              <Wrench className="w-4 h-4 text-amber-200" />
            </div>
          </div>
          <p className="text-3xl font-black text-white tracking-tight">{summary.serviceCount ?? 0}</p>
          <p className="text-[11px] text-amber-200/90 font-semibold mt-2">Under Cleaning / Housekeeping</p>
        </div>

        {/* Out of Order */}
        <div 
          onClick={() => setActiveFilter('OUT_OF_ORDER')}
          className={cn(
            "relative overflow-hidden rounded-3xl p-5 group shadow-lg transition-all cursor-pointer select-none",
            "bg-[#7F1D1D] text-white shadow-[0_12px_24px_rgba(127,29,29,0.4)]",
            activeFilter === 'OUT_OF_ORDER' && "ring-2 ring-rose-300 scale-[1.02]"
          )}
        >
          <div className="flex justify-between items-start mb-3 relative z-10">
            <p className="text-[10px] font-black text-rose-200 uppercase tracking-[0.2em]">Out of Order</p>
            <div className="w-9 h-9 rounded-2xl bg-black/20 flex items-center justify-center">
              <XOctagon className="w-4 h-4 text-rose-200" />
            </div>
          </div>
          <p className="text-3xl font-black text-white tracking-tight">{summary.outOfOrderCount ?? 0}</p>
          <p className="text-[11px] text-rose-200/90 font-semibold mt-2">Maintenance / Blocked</p>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-[#1E293B] border border-white/5 p-3 rounded-2xl shadow-lg">
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
          {[
            { id: 'ALL', label: 'All Rooms', count: summary.totalRooms },
            { id: 'OCCUPIED', label: 'Occupied', count: summary.occupiedCount },
            { id: 'READY', label: 'Ready', count: summary.readyCount ?? summary.availableCount },
            { id: 'SERVICE', label: 'Service', count: summary.serviceCount ?? 0 },
            { id: 'OUT_OF_ORDER', label: 'Out of Order', count: summary.outOfOrderCount ?? 0 },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id as any)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2",
                activeFilter === tab.id 
                  ? "bg-[#2563EB] text-white shadow-md shadow-blue-500/20" 
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              )}
            >
              <span>{tab.label}</span>
              <span className={cn(
                "px-1.5 py-0.5 rounded-full text-[10px] font-extrabold",
                activeFilter === tab.id ? "bg-white/20 text-white" : "bg-white/10 text-gray-300"
              )}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search room, category or guest..."
            className="w-full bg-[#0f172a] border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white outline-none focus:border-blue-500 transition-colors placeholder:text-gray-500"
          />
        </div>
      </div>

      {/* Rooms Occupancy Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-60 bg-[#1E293B] rounded-[28px] animate-pulse p-6 space-y-4 shadow-lg border border-white/5" />
          ))}
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="py-16 text-center bg-[#1E293B] border border-white/5 rounded-3xl p-8 space-y-3 shadow-lg">
          <BedDouble className="w-12 h-12 text-gray-500 mx-auto" />
          <h3 className="text-base font-bold text-white uppercase tracking-wider">No Rooms Found</h3>
          <p className="text-xs text-gray-400 max-w-sm mx-auto">No rooms match the selected filter query. Try selecting a different tab or clearing your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredRooms.map(room => {
            const isOccupied = room.isOccupied
            const isService = room.isService
            const isOutOfOrder = room.isOutOfOrder
            const isReady = !isOccupied && !isService && !isOutOfOrder
            const booking = room.currentBooking

            return (
              <div
                key={room.id}
                onClick={() => setSelectedRoom(room)}
                className={cn(
                  "relative rounded-[28px] p-6 flex flex-col justify-between transition-all duration-300 hover:scale-[1.02] cursor-pointer overflow-hidden border-0 h-60 shadow-lg select-none group",
                  isOccupied
                    ? "bg-[#581C87] text-white shadow-[0_12px_24px_rgba(88,28,135,0.4)] hover:bg-[#4c1d95]"
                    : isService
                      ? "bg-[#78350F] text-white shadow-[0_12px_24px_rgba(120,53,15,0.35)] hover:bg-[#92400e]"
                      : isOutOfOrder
                        ? "bg-[#7F1D1D] text-white shadow-[0_12px_24px_rgba(127,29,29,0.35)] hover:bg-[#991b1b]"
                        : "bg-[#065F46] text-white shadow-[0_12px_24px_rgba(6,95,70,0.35)] hover:bg-[#047857]"
                )}
              >
                {/* Header */}
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-3xl font-black tracking-tight text-white leading-none">
                      {room.roomNumber}
                    </h3>
                    <p className="text-xs font-bold uppercase tracking-wider mt-2 opacity-80">
                      {room.type || room.category || 'Standard Room'}
                    </p>
                  </div>
                  
                  {/* Status Indicator Badge */}
                  <div className="flex items-center gap-1.5">
                    {isOccupied && (
                      <span className="px-3 py-1 bg-black/25 text-purple-200 rounded-full text-[10px] font-black tracking-widest uppercase">
                        Occupied
                      </span>
                    )}
                    {isService && (
                      <span className="px-3 py-1 bg-black/25 text-amber-200 rounded-full text-[10px] font-black tracking-widest uppercase">
                        Cleaning
                      </span>
                    )}
                    {isOutOfOrder && (
                      <span className="px-3 py-1 bg-black/25 text-rose-200 rounded-full text-[10px] font-black tracking-widest uppercase">
                        Maintenance
                      </span>
                    )}
                    {isReady && (
                      <span className="px-3 py-1 bg-black/25 text-emerald-200 rounded-full text-[10px] font-black tracking-widest uppercase">
                        Ready
                      </span>
                    )}
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-white/10 rounded-lg">
                      <Edit3 className="w-3.5 h-3.5 text-white" />
                    </span>
                  </div>
                </div>

                {/* Bottom Body */}
                <div className="mt-auto">
                  {isOccupied ? (
                    <div>
                      <div className="text-2xl font-black tracking-tight text-white truncate">
                        {booking?.guestName || 'Occupied Room'}
                      </div>
                      <div className="text-xs font-bold text-purple-200/90 uppercase tracking-wider mt-1">
                        {booking ? `Out: ${new Date(booking.checkOut).toLocaleDateString('en-US', { day: '2-digit', month: 'short' })}` : 'In House'}
                      </div>
                    </div>
                  ) : isService ? (
                    <div>
                      <div className="text-2xl font-black tracking-tight text-amber-100">
                        Cleaning
                      </div>
                      <div className="text-xs font-bold text-amber-200/90 uppercase tracking-wider mt-1">
                        Tap to change status
                      </div>
                    </div>
                  ) : isOutOfOrder ? (
                    <div>
                      <div className="text-2xl font-black tracking-tight text-rose-100">
                        Maintenance
                      </div>
                      <div className="text-xs font-bold text-rose-200/90 uppercase tracking-wider mt-1">
                        Tap to change status
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-3xl font-black tracking-tight text-white">
                        {formatCurrency(room.basePrice || 2500)}
                      </div>
                      <div className="text-xs font-bold text-emerald-200 uppercase tracking-wider mt-1">
                        Tap to Book or Edit ↗
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* QUICK STATUS EDIT & ACTIONS MODAL */}
      {selectedRoom && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[#1E293B] border border-white/10 rounded-3xl w-full max-w-lg flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-white/10 bg-[#0F172A] flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-white">Room {selectedRoom.roomNumber}</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 text-gray-300 font-bold uppercase">
                    {selectedRoom.type || selectedRoom.category || 'Standard'}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">Manage room status, housekeeping, and active guest</p>
              </div>
              <button 
                onClick={() => setSelectedRoom(null)} 
                className="p-2 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5"/>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {actionSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-xl text-center flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  {actionSuccess}
                </div>
              )}

              {/* Guest Details if Occupied */}
              {selectedRoom.isOccupied && selectedRoom.currentBooking && (
                <div className="bg-[#0F172A] border border-white/10 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-purple-400">Current In-House Guest</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold">Checked In</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-base">{selectedRoom.currentBooking.guestName}</h4>
                      <p className="text-xs text-gray-400 flex items-center gap-2 mt-0.5">
                        {selectedRoom.currentBooking.guestPhone && (
                          <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {selectedRoom.currentBooking.guestPhone}</span>
                        )}
                        <span>• Guests: {selectedRoom.currentBooking.numberOfGuests}</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 pt-2 border-t border-white/5 flex justify-between">
                    <span>Stay Duration:</span>
                    <span className="font-semibold text-white">
                      {new Date(selectedRoom.currentBooking.checkIn).toLocaleDateString('en-US', { day: '2-digit', month: 'short' })} — {new Date(selectedRoom.currentBooking.checkOut).toLocaleDateString('en-US', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>

                  <div className="pt-2 flex gap-2">
                    <button
                      onClick={() => handleUpdateStatus('CLEANING', true)}
                      disabled={isUpdating}
                      className="flex-1 py-2.5 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Check Out & Send to Cleaning
                    </button>
                    <button
                      onClick={() => router.push(`/admin/bookings?search=${selectedRoom.currentBooking.guestName}`)}
                      className="px-3 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl text-xs font-bold transition-all"
                    >
                      View Booking
                    </button>
                  </div>
                </div>
              )}

              {/* Status Switcher Buttons */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-3 block">
                  Select Room Availability Status
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {/* Ready */}
                  <button
                    onClick={() => handleUpdateStatus('AVAILABLE')}
                    disabled={isUpdating}
                    className={cn(
                      "p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all",
                      selectedRoom.isReady 
                        ? "bg-[#065F46] border-emerald-400 text-white shadow-lg" 
                        : "bg-[#0F172A] border-white/10 text-gray-300 hover:border-emerald-500/50 hover:bg-emerald-950/20"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      {selectedRoom.isReady && <span className="text-[10px] font-black uppercase text-emerald-200">Current</span>}
                    </div>
                    <span className="text-sm font-bold text-white">Ready / Available</span>
                    <span className="text-[10px] text-emerald-300 mt-1">Ready for immediate check-in</span>
                  </button>

                  {/* Cleaning / Service */}
                  <button
                    onClick={() => handleUpdateStatus('CLEANING')}
                    disabled={isUpdating}
                    className={cn(
                      "p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all",
                      selectedRoom.isService 
                        ? "bg-[#78350F] border-amber-400 text-white shadow-lg" 
                        : "bg-[#0F172A] border-white/10 text-gray-300 hover:border-amber-500/50 hover:bg-amber-950/20"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Wrench className="w-4 h-4 text-amber-400" />
                      {selectedRoom.isService && <span className="text-[10px] font-black uppercase text-amber-200">Current</span>}
                    </div>
                    <span className="text-sm font-bold text-white">Housekeeping</span>
                    <span className="text-[10px] text-amber-300 mt-1">Cleaning & sanitization</span>
                  </button>

                  {/* Out of Order / Maintenance */}
                  <button
                    onClick={() => handleUpdateStatus('MAINTENANCE')}
                    disabled={isUpdating}
                    className={cn(
                      "p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all",
                      selectedRoom.isOutOfOrder 
                        ? "bg-[#7F1D1D] border-rose-400 text-white shadow-lg" 
                        : "bg-[#0F172A] border-white/10 text-gray-300 hover:border-rose-500/50 hover:bg-rose-950/20"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                      {selectedRoom.isOutOfOrder && <span className="text-[10px] font-black uppercase text-rose-200">Current</span>}
                    </div>
                    <span className="text-sm font-bold text-white">Out of Order</span>
                    <span className="text-[10px] text-rose-300 mt-1">Blocked / Under repairs</span>
                  </button>

                  {/* New Booking shortcut */}
                  <button
                    onClick={() => router.push(`/admin/bookings/new?roomId=${selectedRoom.id}`)}
                    className="p-3.5 rounded-2xl border border-blue-500/30 bg-blue-600/10 hover:bg-blue-600/20 text-left flex flex-col justify-between transition-all group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <LogIn className="w-4 h-4 text-blue-400" />
                      <ArrowRight className="w-3.5 h-3.5 text-blue-400 group-hover:translate-x-1 transition-transform" />
                    </div>
                    <span className="text-sm font-bold text-white">Create Booking</span>
                    <span className="text-[10px] text-blue-300 mt-1">Book new guest into this room</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#0F172A] border-t border-white/10 flex justify-end">
              <button
                onClick={() => setSelectedRoom(null)}
                className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
