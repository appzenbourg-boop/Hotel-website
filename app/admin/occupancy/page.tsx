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
  Calendar, 
  ArrowUpRight,
  Sparkles,
  Building2,
  LogIn,
  LogOut,
  ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import Avatar from '@/components/common/Avatar'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function RoomOccupancyPage() {
  const router = useRouter()
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'OCCUPIED' | 'AVAILABLE' | 'MAINTENANCE'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  const apiUrl = buildContextUrl('/api/admin/occupancy')
  const { data: rawData, error, isLoading, mutate: revalidate } = useSWR(apiUrl, fetcher, { refreshInterval: 10000 })

  const responseData = rawData?.data ?? rawData
  const summary = responseData?.summary ?? { totalRooms: 0, occupiedCount: 0, availableCount: 0, maintenanceCount: 0, occupancyRate: 0 }
  const allRooms: any[] = responseData?.rooms ?? []

  const filteredRooms = useMemo(() => {
    return allRooms.filter(room => {
      // Filter tab
      if (activeFilter === 'OCCUPIED' && !room.isOccupied) return false
      if (activeFilter === 'AVAILABLE' && (room.isOccupied || room.isMaintenance)) return false
      if (activeFilter === 'MAINTENANCE' && !room.isMaintenance) return false

      // Search query
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
            className="flex items-center gap-2 px-4 py-2 bg-surface-light border border-white/[0.08] hover:border-primary/40 rounded-xl text-xs font-bold text-white transition-all active:scale-95 shadow-sm"
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

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Occupancy Rate */}
        <div className="bg-[#161b22] border border-white/[0.08] p-5 rounded-2xl relative overflow-hidden group">
          <div className="flex justify-between items-start mb-3">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Live Occupancy Rate</p>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
              <BedDouble className="w-4 h-4 text-[#3B82F6]" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-black text-white tracking-tight">{summary.occupancyRate}%</p>
            <span className="text-xs text-gray-400 font-medium">({summary.occupiedCount}/{summary.totalRooms} Rooms)</span>
          </div>
          <div className="h-1.5 bg-white/[0.08] rounded-full overflow-hidden mt-4">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-1000" 
              style={{ width: `${summary.occupancyRate}%` }} 
            />
          </div>
        </div>

        {/* Occupied Rooms */}
        <div className="bg-[#161b22] border border-white/[0.08] p-5 rounded-2xl relative overflow-hidden group">
          <div className="flex justify-between items-start mb-3">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Occupied Rooms</p>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
              <UserCheck className="w-4 h-4 text-purple-400" />
            </div>
          </div>
          <p className="text-3xl font-black text-white tracking-tight">{summary.occupiedCount}</p>
          <p className="text-[11px] text-purple-400 font-semibold mt-2">Active Checked-in Guests</p>
        </div>

        {/* Available Rooms */}
        <div className="bg-[#161b22] border border-white/[0.08] p-5 rounded-2xl relative overflow-hidden group">
          <div className="flex justify-between items-start mb-3">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Ready / Available</p>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <p className="text-3xl font-black text-white tracking-tight">{summary.availableCount}</p>
          <p className="text-[11px] text-emerald-400 font-semibold mt-2">Ready for Immediate Booking</p>
        </div>

        {/* Maintenance / Cleaning */}
        <div className="bg-[#161b22] border border-white/[0.08] p-5 rounded-2xl relative overflow-hidden group">
          <div className="flex justify-between items-start mb-3">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Maintenance & Service</p>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
              <Wrench className="w-4 h-4 text-amber-400" />
            </div>
          </div>
          <p className="text-3xl font-black text-white tracking-tight">{summary.maintenanceCount}</p>
          <p className="text-[11px] text-amber-400 font-semibold mt-2">Blocked or Under Cleaning</p>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-[#161b22] border border-white/[0.08] p-3 rounded-2xl">
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
          {[
            { id: 'ALL', label: 'All Rooms', count: summary.totalRooms },
            { id: 'OCCUPIED', label: 'Occupied', count: summary.occupiedCount },
            { id: 'AVAILABLE', label: 'Available', count: summary.availableCount },
            { id: 'MAINTENANCE', label: 'Maintenance', count: summary.maintenanceCount },
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
            <div key={i} className="h-44 bg-[#161b22] border border-white/[0.08] rounded-2xl animate-pulse p-5 space-y-4" />
          ))}
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="py-16 text-center bg-[#161b22] border border-dashed border-white/[0.08] rounded-3xl p-8 space-y-3">
          <BedDouble className="w-12 h-12 text-gray-600 mx-auto" />
          <h3 className="text-base font-bold text-white uppercase tracking-wider">No Rooms Found</h3>
          <p className="text-xs text-gray-400 max-w-sm mx-auto">No rooms match the selected filter query. Try selecting a different tab or clearing your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredRooms.map(room => {
            const isOccupied = room.isOccupied
            const isMaintenance = room.isMaintenance
            const booking = room.currentBooking

            return (
              <div
                key={room.id}
                className={cn(
                  "bg-[#161b22] border rounded-2xl p-5 space-y-4 transition-all hover:scale-[1.01] relative group flex flex-col justify-between shadow-md",
                  isOccupied ? "border-purple-500/30 hover:border-purple-500/50 bg-gradient-to-b from-purple-500/5 to-transparent" :
                  isMaintenance ? "border-amber-500/30 hover:border-amber-500/50 bg-gradient-to-b from-amber-500/5 to-transparent" :
                  "border-emerald-500/30 hover:border-emerald-500/50 bg-gradient-to-b from-emerald-500/5 to-transparent"
                )}
              >
                {/* Room Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-black text-white tracking-tight">Room {room.roomNumber}</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{room.type || room.category || 'Standard Suite'}</p>
                  </div>
                  <span className={cn(
                    "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border",
                    isOccupied ? "bg-purple-500/15 text-purple-400 border-purple-500/30" :
                    isMaintenance ? "bg-amber-500/15 text-amber-400 border-amber-500/30" :
                    "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                  )}>
                    {isOccupied ? 'Occupied' : isMaintenance ? 'Maintenance' : 'Available'}
                  </span>
                </div>

                {/* Body Details */}
                {isOccupied && booking ? (
                  <div className="bg-[#0d1117]/80 border border-white/[0.05] rounded-xl p-3.5 space-y-2.5">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={booking.guestName} size="sm" />
                      <div className="overflow-hidden">
                        <p className="text-xs font-bold text-white truncate">{booking.guestName}</p>
                        <p className="text-[10px] text-purple-400 font-mono font-medium">{booking.guestPhone || 'Phone hidden'}</p>
                      </div>
                    </div>
                    <div className="border-t border-white/[0.05] pt-2 flex items-center justify-between text-[10px] text-gray-400 font-medium">
                      <span>Check-out:</span>
                      <span className="text-white font-bold">{new Date(booking.checkOut).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                    </div>
                  </div>
                ) : isMaintenance ? (
                  <div className="bg-[#0d1117]/80 border border-white/[0.05] rounded-xl p-3.5 text-center">
                    <p className="text-xs font-bold text-amber-400">Under Cleaning / Maintenance</p>
                    <p className="text-[10px] text-gray-500 mt-1">Temporarily offline for guest assignment</p>
                  </div>
                ) : (
                  <div className="bg-[#0d1117]/80 border border-white/[0.05] rounded-xl p-3.5 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Base Nightly Rate</p>
                      <p className="text-sm font-extrabold text-white mt-0.5">{formatCurrency(room.basePrice || 2500)}</p>
                    </div>
                    <span className="text-[9px] font-black text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-md border border-emerald-400/20 uppercase">
                      Ready
                    </span>
                  </div>
                )}

                {/* Footer Action */}
                <div className="pt-1">
                  {isOccupied && booking ? (
                    <button
                      onClick={() => router.push(`/admin/bookings?search=${booking.guestName}`)}
                      className="w-full py-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-400 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      <span>Manage Booking</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  ) : isMaintenance ? (
                    <button
                      onClick={() => router.push('/admin/rooms')}
                      className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      <span>View Room Settings</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => router.push(`/admin/bookings/new?roomId=${room.id}`)}
                      className="w-full py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Book Room {room.roomNumber}</span>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
