'use client'

import { useState, useMemo } from 'react'
import useSWR from 'swr'
import { useRouter } from 'next/navigation'
import { buildContextUrl } from '@/lib/admin-context'
import { formatCurrency } from '@/lib/utils'
import { 
  BedDouble, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Wrench, 
  UserCheck, 
  ArrowUpRight,
  Building2,
  LogIn,
  ShieldAlert,
  XOctagon
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Avatar from '@/components/common/Avatar'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function RoomOccupancyPage() {
  const router = useRouter()
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'OCCUPIED' | 'READY' | 'SERVICE' | 'OUT_OF_ORDER'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

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

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#3B82F6]/10 border border-[#3B82F6]/20 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-[#3B82F6]" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Room Occupancy Command Center</h1>
          </div>
          <p className="text-xs text-text-secondary mt-1">Real-time room availability, live guest occupancy, and maintenance tracking.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => revalidate()}
            className="flex items-center gap-2 px-4 py-2 bg-[#233648] hover:bg-[#2a4058] rounded-xl text-xs font-bold text-white transition-all active:scale-95 shadow-sm"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 text-[#3B82F6]", isLoading && "animate-spin")} />
            Refresh Occupancy
          </button>
          <button
            onClick={() => router.push('/admin/bookings/new')}
            className="flex items-center gap-2 px-5 py-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-blue-500/20 active:scale-95"
          >
            <LogIn className="w-4 h-4" /> New Booking
          </button>
        </div>
      </div>

      {/* KPI Summary Cards — 4 Categories */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Occupied */}
        <div className="relative overflow-hidden bg-[#233648] rounded-[20px] p-5 group shadow-lg hover:shadow-xl transition-all">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-purple-500/8 rounded-full blur-2xl group-hover:bg-purple-500/15 transition-all" />
          <div className="flex justify-between items-start mb-3 relative z-10">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Occupied</p>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <UserCheck className="w-4 h-4 text-purple-400" />
            </div>
          </div>
          <p className="text-3xl font-black text-white tracking-tight">{summary.occupiedCount}</p>
          <p className="text-[11px] text-purple-400 font-semibold mt-2">Active Checked-in Guests</p>
        </div>

        {/* Ready */}
        <div className="relative overflow-hidden bg-[#233648] rounded-[20px] p-5 group shadow-lg hover:shadow-xl transition-all">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-emerald-500/8 rounded-full blur-2xl group-hover:bg-emerald-500/15 transition-all" />
          <div className="flex justify-between items-start mb-3 relative z-10">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Ready</p>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <p className="text-3xl font-black text-white tracking-tight">{summary.readyCount ?? summary.availableCount}</p>
          <p className="text-[11px] text-emerald-400 font-semibold mt-2">Ready for Immediate Booking</p>
        </div>

        {/* Service */}
        <div className="relative overflow-hidden bg-[#233648] rounded-[20px] p-5 group shadow-lg hover:shadow-xl transition-all">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-amber-500/8 rounded-full blur-2xl group-hover:bg-amber-500/15 transition-all" />
          <div className="flex justify-between items-start mb-3 relative z-10">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Service</p>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
              
            </div>
          </div>
          <p className="text-3xl font-black text-white tracking-tight">{summary.serviceCount ?? 0}</p>
          <p className="text-[11px] text-amber-400 font-semibold mt-2">Under Cleaning / Housekeeping</p>
        </div>

        {/* Out of Order */}
        <div className="relative overflow-hidden bg-[#233648] rounded-[20px] p-5 group shadow-lg hover:shadow-xl transition-all">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-rose-500/8 rounded-full blur-2xl group-hover:bg-rose-500/15 transition-all" />
          <div className="flex justify-between items-start mb-3 relative z-10">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Out of Order</p>
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center">
              <XOctagon className="w-4 h-4 text-rose-400" />
            </div>
          </div>
          <p className="text-3xl font-black text-white tracking-tight">{summary.outOfOrderCount ?? 0}</p>
          <p className="text-[11px] text-rose-400 font-semibold mt-2">Maintenance / Blocked</p>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-[#233648] p-3 rounded-2xl shadow-lg">
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
                  ? "bg-[#3B82F6] text-white shadow-md shadow-blue-500/20" 
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
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search room, category or guest..."
            className="w-full bg-[#0d1117] border border-white/[0.1] rounded-xl pl-9 pr-4 py-2 text-xs text-white outline-none focus:border-[#3B82F6] transition-colors"
          />
        </div>
      </div>

      {/* Rooms Occupancy Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-48 bg-[#233648] rounded-[20px] animate-pulse p-5 space-y-4 shadow-lg" />
          ))}
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="py-16 text-center bg-[#233648] rounded-3xl p-8 space-y-3 shadow-lg">
          <BedDouble className="w-12 h-12 text-gray-600 mx-auto" />
          <h3 className="text-base font-bold text-white uppercase tracking-wider">No Rooms Found</h3>
          <p className="text-xs text-gray-400 max-w-sm mx-auto">No rooms match the selected filter query. Try selecting a different tab or clearing your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredRooms.map(room => {
            const isOccupied = room.isOccupied
            const isService = room.isService
            const isOutOfOrder = room.isOutOfOrder
            const booking = room.currentBooking

            // Determine card accent
            const accentColor = isOccupied ? 'purple' : isService ? 'amber' : isOutOfOrder ? 'rose' : 'emerald'
            const statusColor = isOccupied ? 'text-purple-400' : isService ? 'text-amber-400' : isOutOfOrder ? 'text-rose-400' : 'text-emerald-400'
            const statusBg = isOccupied ? 'bg-purple-500/10' : isService ? 'bg-amber-500/10' : isOutOfOrder ? 'bg-rose-500/10' : 'bg-emerald-500/10'
            const statusLabel = isOccupied ? 'Occupied' : isService ? 'Service' : isOutOfOrder ? 'Out of Order' : 'Ready'

            return (
              <div
                key={room.id}
                className="group relative bg-[#233648] rounded-[20px] p-5 flex flex-col justify-between transition-all hover:-translate-y-1 hover:shadow-2xl overflow-hidden shadow-lg border border-white/[0.02]"
              >
                {/* Subtle top glow matching status */}
                <div className={cn(
                  "absolute top-0 left-0 w-full h-[2px] opacity-0 group-hover:opacity-100 transition-opacity",
                  isOccupied ? 'bg-purple-500' : isService ? 'bg-amber-500' : isOutOfOrder ? 'bg-rose-500' : 'bg-emerald-500'
                )} />

                {/* Header */}
                <div className="flex justify-between items-start mb-6 relative z-10">
                  <div>
                    <h3 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                      {room.roomNumber}
                    </h3>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1 font-bold">
                      {room.type || room.category || 'Standard Suite'}
                    </p>
                  </div>
                  
                  {/* Status Indicator */}
                  <div className={cn("flex items-center gap-1.5 rounded-full px-3 py-1", statusBg)}>
                    <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse bg-current", statusColor)} />
                    <span className={cn("text-[10px] font-black uppercase tracking-wider", statusColor)}>{statusLabel}</span>
                  </div>
                </div>

                {/* Content Body */}
                <div className="flex-1 mb-6 relative z-10">
                  {isOccupied ? (
                    <div className="bg-[#1a2a3a] rounded-xl p-4 space-y-3">
                       <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Guest Details</p>
                       {booking ? (
                         <div>
                            <p className="text-sm font-black text-white">{booking.guestName}</p>
                            <p className="text-xs text-gray-400 mt-1 font-medium">Out: {new Date(booking.checkOut).toLocaleDateString('en-US', { day: '2-digit', month: 'short' })}</p>
                         </div>
                       ) : (
                         <p className="text-sm text-gray-400 italic">Walk-in / No Profile</p>
                       )}
                    </div>
                  ) : isService ? (
                    <div className="bg-[#1a2a3a] rounded-xl p-4">
                      <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-2">Housekeeping</p>
                      <p className="text-sm font-black text-white">Service in progress</p>
                    </div>
                  ) : isOutOfOrder ? (
                    <div className="bg-[#1a2a3a] rounded-xl p-4">
                      <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-2">Maintenance</p>
                      <p className="text-sm font-black text-white">Room Blocked</p>
                    </div>
                  ) : (
                    <div className="bg-[#1a2a3a] rounded-xl p-4">
                      <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">Base Nightly Rate</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-white">{formatCurrency(room.basePrice || 2500)}</span>
                        <span className="text-[10px] text-gray-400 uppercase font-bold">/ nt</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Button */}
                <div className="relative z-10">
                  <button
                    onClick={() => {
                       if (isOccupied) booking ? router.push(`/admin/bookings?search=${booking.guestName}`) : router.push('/admin/rooms')
                       else if (isService) router.push('/admin/services')
                       else if (isOutOfOrder) router.push('/admin/rooms')
                       else router.push(`/admin/bookings/new?roomId=${room.id}`)
                    }}
                    className={cn(
                      "w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 active:scale-95",
                      statusBg, statusColor,
                      "hover:opacity-80"
                    )}
                  >
                    {isOccupied ? (
                      <>Manage {booking ? 'Booking' : 'Room'}<ArrowUpRight className="w-3.5 h-3.5" /></>
                    ) : isService ? (
                      'View Service Status'
                    ) : isOutOfOrder ? (
                      'View Room Settings'
                    ) : (
                      <>Book Room<ArrowUpRight className="w-3.5 h-3.5" /></>
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
