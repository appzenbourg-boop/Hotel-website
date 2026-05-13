'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import useSWR from 'swr'
import { buildContextUrl as bcu, isGlobalContext as igc } from '@/lib/admin-context'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import Avatar from '@/components/common/Avatar'
import { cn, formatCurrency } from '@/lib/utils'
import {
  LogIn, LogOut, BedDouble, Plus, Bell, Search, Send, MoreHorizontal, MessageSquare, Sparkles, BarChart3, IndianRupee, Crown, Building2
} from 'lucide-react'

export default function AdminDashboard() {
  const router = useRouter()
  const { data: session } = useSession()

  const [showCheckInModal, setShowCheckInModal] = useState(false)
  const [showServiceModal, setShowServiceModal] = useState(false)
  const [drillDown, setDrillDown] = useState<{ type: string | null, title: string, data: any[] }>({ type: null, title: '', data: [] })
  const [searchQuery, setSearchQuery] = useState('')
  const [serviceForm, setServiceForm] = useState({
    roomId: '', type: 'HOUSEKEEPING', title: '', description: '', priority: 'NORMAL',
  })

  const requireHotel = (actionName = 'this action') => {
    if (session?.user?.role !== 'SUPER_ADMIN') return false
    if (igc()) {
      toast.error('Please select a hotel first', {
        description: `"${actionName}" requires a specific hotel.`,
      })
      return true
    }
    return false
  }

  const { data: stats, isLoading: loading, mutate: fetchStats } = useSWR(
    session ? bcu('/api/admin/dashboard') : null,
    (url: string) => fetch(url).then(res => res.json()),
    { refreshInterval: 60000 }
  )

  const { data: roomsRaw = [], isLoading: loadingRooms } = useSWR(
    session ? bcu('/api/admin/rooms', { status: 'ALL' }) : null,
    (url: string) => fetch(url).then(res => res.json()).then(r => Array.isArray(r) ? r : (r?.data ?? []))
  )
  const rooms = roomsRaw

  const { data: reservationsRaw } = useSWR(
    session ? bcu('/api/admin/bookings', { 
        start: new Date(new Date().setHours(0, 0, 0, 0)).toISOString(), 
        end: new Date(new Date().setHours(23, 59, 59, 999)).toISOString() 
    }) : null,
    (url: string) => fetch(url).then(res => res.json()).then(r => Array.isArray(r) ? r : (r?.data ?? []))
  )
  const reservations = Array.isArray(reservationsRaw) ? reservationsRaw : (reservationsRaw ?? [])

  const todayReservations = reservations.filter((b: any) => b.status === 'RESERVED')

  const handleRaiseService = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!serviceForm.roomId || !serviceForm.title) { toast.error('Please fill in required fields'); return }
    try {
      const res = await fetch('/api/admin/services', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serviceForm),
      })
      if (res.ok) {
        toast.success('Service ticket raised')
        setShowServiceModal(false)
        setServiceForm({ roomId: '', type: 'HOUSEKEEPING', title: '', description: '', priority: 'NORMAL' })
      } else toast.error('Failed to raise ticket')
    } catch { toast.error('Something went wrong') }
  }

  const handleCheckIn = async (bookingId: string) => {
    try {
      const res = await fetch('/api/admin/bookings/status', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, action: 'CHECK_IN' }),
      })
      if (res.ok) {
        toast.success('Guest checked in')
        setShowCheckInModal(false)
        fetchStats()
      } else toast.error('Failed to check in')
    } catch { toast.error('Something went wrong') }
  }

  const handleCheckOut = async (bookingId: string) => {
    try {
      const res = await fetch('/api/admin/bookings/status', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, action: 'CHECK_OUT' }),
      })
      if (res.ok) { toast.success('Guest checked out'); fetchStats() }
      else toast.error('Failed to check out')
    } catch { toast.error('Something went wrong') }
  }


  // Initial effect removed - now handled by SWR

  const statusBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string; label: string }> = {
      CHECKED_IN: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: 'Checked In' },
      RESERVED: { bg: 'bg-amber-500/15', text: 'text-amber-400', label: 'Pending' },
      CHECKED_OUT: { bg: 'bg-orange-500/15', text: 'text-orange-400', label: 'Checked Out' },
    }
    const s = map[status] || map.RESERVED
    return (
      <span className={cn('px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider', s.bg, s.text)}>
        {s.label}
      </span>
    )
  }

  const DrillDownModal = () => (
    <Modal
      isOpen={!!drillDown.type}
      onClose={() => setDrillDown({ type: null, title: '', data: [] })}
      title={drillDown.title}
      size="lg"
    >
      <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
        {drillDown.data.length > 0 ? (
          drillDown.data.map((item: any) => (
            <div key={item.id} className="flex items-center justify-between p-4 bg-surface-light rounded-xl border border-border group hover:border-primary/30 transition-all">
              <div className="flex items-center gap-3">
                <Avatar name={item.guest} size="md" />
                <div>
                  <p className="font-bold text-white text-sm">{item.guest}</p>
                  <p className="text-xs text-text-tertiary">Room {item.room} · {item.phone}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{item.roomType}</p>
                <p className="text-xs font-medium text-primary mt-1">{item.time || item.eta || 'Staying'}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="py-12 text-center text-text-tertiary">
            No active records found for this category.
          </div>
        )}
      </div>
    </Modal>
  )

  const isStatsLoading = loading && !stats;
  const safeStats = stats || { todayRevenue: 0, monthRevenue: 0, occupancyRate: 0, todayCheckIns: 0, todayCheckOuts: 0, recentCheckIns: [], housekeeping: { dirty: 0, inProgress: 0, clean: 0, priority: [] }, onDutyStaffDetails: [], activityLog: [] };

  return (
    <div className="space-y-4 animate-fade-in">
      
      {/* Super Admin Context Warning/Shortcut Widget */}
      {session?.user?.role === 'SUPER_ADMIN' && (
        <div className="bg-gradient-to-r from-[#4A9EFF]/10 to-purple-500/10 border border-[#4A9EFF]/20 shadow-xl shadow-[#4A9EFF]/5 rounded-2xl p-6 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-[#4A9EFF]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#4A9EFF] to-purple-500 flex items-center justify-center text-white shadow-lg">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white">Super Admin Workspace Activated</h3>
              <p className="text-sm text-text-secondary mt-1 leading-relaxed max-w-2xl">
                You are currently viewing the <span className="text-[#4A9EFF] font-bold">Global Network Context</span>. Operations, rooms, and analytics for specific hotels will appear here once you select a hotel using the **Property Switcher** in the top navigation bar.
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full md:w-auto">
            <button 
              onClick={() => router.push('/admin/properties')}
              className="w-full md:w-auto px-5 py-2.5 bg-white text-black hover:bg-gray-100 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95"
            >
              <Building2 className="w-4 h-4" /> Manage & Quote Properties
            </button>
            <button 
              onClick={() => router.push('/admin/subscription-plans')}
              className="w-full md:w-auto px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-amber-400" /> Plan Designer
            </button>
          </div>
        </div>
      )}

      {/* ===== 4 KPI CARDS ===== */}
      <div data-tour="stats-grid" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Today Revenue */}
        <div className={cn(
          "relative overflow-hidden bg-[#233648] border border-white/[0.08] rounded-[28px] p-6 hover:border-primary/30 transition-all group shadow-lg",
          isStatsLoading && "animate-pulse"
        )}>
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-all" />
          <div className="flex items-start justify-between mb-4 relative z-10">
            <p className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.2em]">Live Revenue</p>
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
              <IndianRupee className="w-5 h-5 text-primary" />
            </div>
          </div>
          <p className="text-3xl font-black text-white mb-1 tracking-tight truncate">{formatCurrency(safeStats.todayRevenue || 0)}</p>
          <div className="flex items-center gap-2 mt-4">
             <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Live</span>
             </div>
             <p className="text-[10px] text-text-tertiary font-bold tracking-wide uppercase">{loading ? 'Syncing...' : 'Real-time'}</p>
          </div>
        </div>

        {/* Month Revenue */}
        <div className={cn(
          "bg-[#233648] border border-white/[0.07] rounded-2xl p-5 hover:border-white/[0.12] transition-all",
          isStatsLoading && "animate-pulse"
        )}>
          <div className="flex items-start justify-between mb-4">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">MTD Revenue</p>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
              <IndianRupee className="w-4 h-4 text-purple-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white mb-1 tracking-tight truncate">{formatCurrency(safeStats.monthRevenue || 0)}</p>
          <p className="text-[10px] text-gray-500 font-medium">Month to date performance</p>
        </div>

        {/* Occupancy */}
        <div 
          onClick={() => setDrillDown({ type: 'OCCUPANCY', title: 'Current Occupancy', data: safeStats?.occupancyGuests || [] })}
          className={cn(
            "bg-[#233648] border border-white/[0.07] rounded-2xl p-5 hover:border-[#4A9EFF]/30 transition-all cursor-pointer group",
            isStatsLoading && "animate-pulse"
          )}
        >
          <div className="flex items-start justify-between mb-3">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest group-hover:text-white transition-colors">Occupancy</p>
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
              <BedDouble className="w-4 h-4 text-orange-400" />
            </div>
          </div>
          <div className="flex items-baseline gap-3 mb-2">
            <p className="text-2xl font-bold text-white">{safeStats.occupancyRate}%</p>
            <div className="flex flex-col">
               <span className="text-[9px] font-black text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded uppercase w-fit">
                 {safeStats.avgMonthlyOccupancy || 0}% Monthly Avg
               </span>
            </div>
          </div>
          <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden mt-3">
            <div className="h-full bg-orange-500 rounded-full transition-all duration-1000" style={{ width: `${safeStats.occupancyRate}%` }} />
          </div>
        </div>

        {/* Today Check-ins */}
        <div 
          onClick={() => setDrillDown({ type: 'ARRIVALS', title: 'Today Arrivals', data: safeStats?.recentCheckIns || [] })}
          className={cn(
            "bg-[#233648] border border-white/[0.07] rounded-2xl p-5 hover:border-[#4A9EFF]/30 transition-all cursor-pointer group",
            isStatsLoading && "animate-pulse"
          )}
        >
          <div className="flex items-start justify-between mb-4">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest group-hover:text-white transition-colors">Total Arrivals</p>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 group-hover:bg-emerald-500/20">
              <LogIn className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white mb-1 tracking-tight">{safeStats.todayCheckIns}</p>
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded uppercase w-fit">
              {safeStats.pendingArrivals || 0} Pending check-in
            </span>
          </div>
        </div>

        {/* Today Check-outs */}
        <div 
          onClick={() => setDrillDown({ type: 'DEPARTURES', title: 'Scheduled Departures', data: safeStats?.recentDepartures || [] })}
          className={cn(
            "bg-[#233648] border border-white/[0.07] rounded-2xl p-5 hover:border-[#4A9EFF]/30 transition-all cursor-pointer group sm:col-span-2 md:col-span-1 xl:col-span-1",
            isStatsLoading && "animate-pulse"
          )}
        >
          <div className="flex items-start justify-between mb-4">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest group-hover:text-white transition-colors">Departures</p>
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20 group-hover:bg-rose-500/20">
              <LogOut className="w-4 h-4 text-rose-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white mb-1 tracking-tight">{safeStats.todayCheckOuts}</p>
          <p className="text-[10px] text-gray-500 font-medium">{safeStats.remainingDepartures || 0} Rooms remaining</p>
        </div>
      </div>

      {/* ===== MAIN GRID ===== */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.6fr,1.1fr] gap-4">

        {/* LEFT COLUMN */}
        <div className="space-y-4">

          {/* Today's Arrivals Table */}
          <div className="bg-[#233648] border border-white/[0.07] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h2 className="text-[14px] font-semibold text-white">Today&apos;s Arrivals</h2>
              </div>
              <button 
                onClick={() => router.push('/admin/bookings')} 
                className="text-[12px] font-bold text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-widest"
              >
                View Hub
              </button>
            </div>
            {/* Arrivals - Responsive View */}
            <div className="overflow-hidden">
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-t border-white/[0.06] bg-black/10">
                      <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">GUEST NAME</th>
                      <th className="hidden lg:table-cell px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">ROOM TYPE</th>
                      <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">ETA</th>
                      <th className="hidden sm:table-cell px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">STATUS</th>
                      <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {safeStats.recentCheckIns?.length > 0 ? safeStats.recentCheckIns.map((g: any) => (
                      <tr key={g.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar name={g.guest} size="sm" src={g.guestAvatar} />
                            <div>
                              <p className="text-[13px] font-bold text-white leading-none mb-1">{g.guest}</p>
                              <p className="text-[10px] text-gray-500 font-bold tracking-tight uppercase">{g.guestId || 'ZEN-GUEST'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="hidden lg:table-cell px-5 py-4">
                          <p className="text-[13px] text-gray-200 font-medium">{g.roomType}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">Base Rate</p>
                        </td>
                        <td className="px-5 py-4 text-[13px] text-gray-400 font-bold text-center">{g.eta}</td>
                        <td className="hidden sm:table-cell px-5 py-4">{statusBadge(g.status)}</td>
                        <td className="px-5 py-4 text-right">
                          {g.status === 'RESERVED' ? (
                            <button 
                              onClick={() => handleCheckIn(g.id)} 
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                            >
                              Check-in
                            </button>
                          ) : (
                            <button className="p-2 text-gray-600 hover:text-white transition-all"><MoreHorizontal className="w-4 h-4" /></button>
                          )}
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan={5} className="text-center py-10 text-[12px] text-gray-500 font-bold uppercase tracking-widest">Sky is clear - No arrivals</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-white/[0.04] border-t border-white/[0.06]">
                {safeStats.recentCheckIns?.length > 0 ? safeStats.recentCheckIns.map((g: any) => (
                  <div key={g.id} className="p-4 flex flex-col gap-4 active:bg-white/[0.03] transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar name={g.guest} size="md" src={g.guestAvatar} />
                        <div>
                          <p className="text-[14px] font-bold text-white">{g.guest}</p>
                          <p className="text-[10px] text-gray-500 font-bold tracking-tight uppercase">{g.roomType}</p>
                        </div>
                      </div>
                      {statusBadge(g.status)}
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">ETA</p>
                        <p className="text-[13px] text-white font-bold">{g.eta}</p>
                      </div>
                      {g.status === 'RESERVED' ? (
                        <button 
                          onClick={() => handleCheckIn(g.id)} 
                          className="px-4 py-2 bg-blue-500 text-white text-[11px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-blue-500/20 active:scale-95"
                        >
                          Confirm Check-in
                        </button>
                      ) : (
                        <button className="p-2 text-gray-400"><MoreHorizontal className="w-5 h-5" /></button>
                      )}
                    </div>
                  </div>
                )) : (
                  <div className="py-12 text-center text-[12px] text-gray-500 font-bold uppercase tracking-widest">
                    No arrivals scheduled
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Housekeeping Status */}
          <div className="bg-[#233648] border border-white/[0.07] rounded-xl p-5">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <BedDouble className="w-4 h-4 text-blue-400" />
                <h2 className="text-[14px] font-semibold text-white">Housekeeping Status</h2>
              </div>
              <p className="text-[11px] text-gray-600">{loading ? 'Refreshing...' : 'Updated just now'}</p>
            </div>

            {/* 3 Status Cards */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="bg-[#182433] rounded-xl p-4 border border-white/[0.06]">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-red-500/15 flex items-center justify-center">
                    <BedDouble className="w-3.5 h-3.5 text-red-400" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-white">{safeStats.housekeeping?.dirty || 0}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Dirty Rooms</p>
              </div>
              <div className="bg-[#182433] rounded-xl p-4 border border-white/[0.06]">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center">
                    <BedDouble className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-white">{safeStats.housekeeping?.inProgress || 0}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">In Progress</p>
              </div>
              <div className="bg-[#182433] rounded-xl p-4 border border-white/[0.06]">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                    <BedDouble className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-white">{safeStats.housekeeping?.clean || 0}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Clean & Ready</p>
              </div>
            </div>

            {/* Priority Cleaning */}
            {safeStats.housekeeping?.priority?.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Priority Cleaning</p>
                {safeStats.housekeeping.priority.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-[#182433] rounded-lg border border-white/[0.06]">
                    <div className="flex items-center gap-3">
                      <span className="text-[13px] font-bold text-white">Room {p.room}</span>
                      <span className="px-2 py-0.5 bg-orange-500/15 text-orange-400 text-[10px] font-semibold rounded-full">{p.status === 'PENDING' ? 'Checked Out' : 'In Progress'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Avatar name={p.assignedTo} />
                      <span className="text-[11px] text-gray-400">Assigned to: {p.assignedTo}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-4">

          {/* Quick Actions */}
          <div data-tour="quick-actions" className="bg-[#233648] border border-white/[0.07] rounded-xl p-5">
            <h2 className="text-[14px] font-semibold text-white mb-4">Quick Actions</h2>
            <Button
              onClick={() => { if (requireHotel('New Booking')) return; router.push('/admin/bookings/new') }}
              className="w-full py-3.5 mb-4 shadow-lg shadow-[#4A9EFF]/20"
              leftIcon={<Plus className="w-4 h-4" />}
            >
              New Walk-in Booking
            </Button>
            <div className="grid grid-cols-2 gap-3">
              <button
                data-tour="guest-checkin"
                onClick={() => { 
                  if (requireHotel('Check-in Assistant')) return; 
                  router.push('/admin/checkin')
                }}
                className="flex flex-col items-center gap-2 p-4 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10 rounded-xl transition-all active:scale-95 group"
              >
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                </div>
                <span className="text-[11px] font-bold text-gray-300 text-center uppercase tracking-tight">Check-in Assistant</span>
              </button>
              <button
                data-tour="raise-service"
                onClick={() => { if (requireHotel('Add Service Request')) return; setShowServiceModal(true) }}
                className="flex flex-col items-center gap-2 p-4 bg-[#182433] hover:bg-[#202e40] border border-white/[0.06] rounded-xl transition-all active:scale-95"
              >
                <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Bell className="w-4 h-4 text-blue-400" />
                </div>
                <span className="text-[11px] font-medium text-gray-300 text-center">Add Service Request</span>
              </button>
            </div>
          </div>

          {/* On-Duty Staff */}
          <div className="bg-[#233648] border border-white/[0.07] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[14px] font-semibold text-white">On-Duty Staff</h2>
              <button onClick={() => router.push('/admin/support')} className="text-gray-500 hover:text-white transition-colors"><MoreHorizontal className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              {safeStats.onDutyStaffDetails?.length > 0 ? safeStats.onDutyStaffDetails.map((staff: any, i: number) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar name={staff.name} />
                    <div>
                      <p className="text-[13px] font-semibold text-white">{staff.name}</p>
                      <p className="text-[11px] text-gray-500 capitalize">{staff.department}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => router.push(`/admin/support?tab=messages&withUserId=${staff.userId}`)}
                    title={`Message ${staff.name}`}
                    className="text-gray-600 hover:text-blue-400 transition-colors active:scale-95"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                </div>
              )) : (
                <div className="py-5 text-center border border-dashed border-white/[0.08] rounded-xl">
                  <p className="text-[11px] text-gray-600">No staff currently clocked in</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-[#233648] border border-white/[0.07] rounded-xl p-5">
            <h2 className="text-[14px] font-semibold text-white mb-4">Recent Activity</h2>
            <div className="space-y-4">
              {safeStats.activityLog?.length > 0 ? safeStats.activityLog.map((log: any, i: number) => (
                <div key={i} className="flex gap-3 items-start">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-[7px] shrink-0" />
                  <div>
                    <p className="text-[11px] text-gray-500 font-medium">{log.time}</p>
                    <p className="text-[12px] text-white leading-snug mt-0.5">{log.action}</p>
                  </div>
                </div>
              )) : (
                <div className="py-5 text-center border border-dashed border-white/[0.08] rounded-xl">
                  <p className="text-[11px] text-gray-600">No recent activity</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ===== EXPRESS CHECK-IN MODAL ===== */}
      <Modal isOpen={showCheckInModal} onClose={() => setShowCheckInModal(false)} title="Express Check-in" description="Quickly check-in guests with reservations for today">
        <div className="space-y-4 pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input type="text" placeholder="Search guest name..." className="w-full pl-10 pr-4 py-2 bg-[#182433] border border-white/[0.1] rounded-lg text-sm text-white placeholder:text-gray-600 outline-none focus:border-[#4A9EFF]/50 transition-colors" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <div className="max-h-72 overflow-y-auto space-y-2">
            {todayReservations.filter((b: any) => b.guest?.name?.toLowerCase().includes(searchQuery.toLowerCase())).map((booking: any) => (
              <div key={booking.id} className="p-4 bg-[#182433] rounded-xl border border-white/[0.06] flex items-center justify-between group hover:border-[#4A9EFF]/30 transition-all">
                <div>
                  <p className="text-sm font-semibold text-white">{booking.guest.name}</p>
                  <p className="text-[11px] text-gray-500">Room {booking.room?.roomNumber} · {booking.source}</p>
                </div>
                <button onClick={() => handleCheckIn(booking.id)} className="opacity-0 group-hover:opacity-100 px-3 py-1.5 bg-[#4A9EFF] text-white text-[12px] font-semibold rounded-lg transition-all">Check-in</button>
              </div>
            ))}
            {todayReservations.length === 0 && <p className="text-center py-8 text-sm text-gray-500">No pending reservations.</p>}
          </div>
        </div>
      </Modal>


      {/* ===== RAISE SERVICE MODAL ===== */}
      <Modal isOpen={showServiceModal} onClose={() => setShowServiceModal(false)} title="Raise Service Ticket" description="Create a new housekeeping or maintenance request">
        <form onSubmit={handleRaiseService} className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <Select label="Target Room" value={serviceForm.roomId} onChange={(e) => setServiceForm({ ...serviceForm, roomId: e.target.value })} options={loadingRooms ? [{ value: '', label: 'Loading rooms...' }] : [{ value: '', label: 'Select Room' }, ...(rooms as any[]).map((r: any) => ({ value: r.id, label: `Room ${r.roomNumber}` }))]} required />
            <Select label="Ticket Type" value={serviceForm.type} onChange={(e) => setServiceForm({ ...serviceForm, type: e.target.value })} options={[
              { value: 'HOUSEKEEPING', label: 'Housekeeping' }, { value: 'MAINTENANCE', label: 'Maintenance' },
              { value: 'ROOM_SERVICE', label: 'Room Service' }, { value: 'FOOD_ORDER', label: 'Food & Beverage' },
              { value: 'LAUNDRY', label: 'Laundry' }, { value: 'CONCIERGE', label: 'Concierge' },
            ]} />
          </div>
          <Input label="Title" value={serviceForm.title} onChange={(e) => setServiceForm({ ...serviceForm, title: e.target.value })} placeholder="e.g. AC not working" required />
          <Input label="Description" value={serviceForm.description} onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })} placeholder="Provide details..." />
          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="secondary" onClick={() => setShowServiceModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Raise Ticket</Button>
          </div>
        </form>
      </Modal>
      <DrillDownModal />
    </div>
  )
}
