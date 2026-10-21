'use client'

import { useState, useEffect, useMemo } from 'react'
import { format, addDays, addMonths, startOfWeek, parseISO, isSameDay, getDaysInMonth } from 'date-fns'
import { Plus, ChevronLeft, ChevronRight, Calendar, UtensilsCrossed, Building2, Clock, Users, BarChart3, FileText, Search, Filter, CheckCircle2, AlertCircle, XCircle, Loader2, X, Eye, Edit3, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { buildContextUrl } from '@/lib/admin-context'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  ENQUIRY:         { label: 'Enquiry',          color: 'text-blue-400',    bg: 'bg-blue-500/20 border-blue-500/30',   dot: 'bg-blue-400' },
  LEAD_GENERATION: { label: 'Lead Generation',  color: 'text-amber-400',   bg: 'bg-amber-500/20 border-amber-500/30', dot: 'bg-amber-400' },
  CONFIRMED:       { label: 'Confirmed',         color: 'text-emerald-400', bg: 'bg-emerald-500/20 border-emerald-500/30', dot: 'bg-emerald-400' },
  WAITLIST:        { label: 'Waitlist',          color: 'text-purple-400',  bg: 'bg-purple-500/20 border-purple-500/30',  dot: 'bg-purple-400' },
  CANCELLED:       { label: 'Cancelled',         color: 'text-red-400',     bg: 'bg-red-500/20 border-red-500/30',    dot: 'bg-red-400' },
  COMPLETED:       { label: 'Completed',         color: 'text-gray-400',    bg: 'bg-gray-500/20 border-gray-500/30',  dot: 'bg-gray-400' },
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  Wedding:          'bg-pink-500/80',
  Reception:        'bg-purple-500/80',
  Corporate:        'bg-blue-500/80',
  Conference:       'bg-indigo-500/80',
  Birthday:         'bg-amber-500/80',
  Anniversary:      'bg-rose-500/80',
  Exhibition:       'bg-teal-500/80',
  Other:            'bg-gray-500/80',
}

export default function BanquetPage() {
  const [bookings, setBookings] = useState<any[]>([])
  const [halls, setHalls] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [searchQ, setSearchQ] = useState('')
  const [selectedBooking, setSelectedBooking] = useState<any>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [hoveredCard, setHoveredCard] = useState<{ ev: any; rect: DOMRect } | null>(null)

  const startDate = useMemo(() => {
    if (viewMode === 'week') return startOfWeek(currentDate, { weekStartsOn: 1 })
    return new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  }, [currentDate, viewMode])

  const days = useMemo(() => {
    const count = viewMode === 'week' ? 7 : getDaysInMonth(startDate)
    return Array.from({ length: count }, (_, i) => addDays(startDate, i))
  }, [startDate, viewMode])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [bRes, hRes] = await Promise.all([
        fetch(buildContextUrl('/api/admin/banquet/bookings')),
        fetch(buildContextUrl('/api/admin/banquet/halls'))
      ])
      const bData = await bRes.json()
      const hData = await hRes.json()
      setBookings(Array.isArray(bData) ? bData : [])
      setHalls(Array.isArray(hData) ? hData : [])
    } catch {
      toast.error('Failed to load banquet data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      if (statusFilter !== 'ALL' && b.status !== statusFilter) return false
      const q = searchQ.toLowerCase()
      if (q && !`${b.firstName} ${b.lastName} ${b.bookingNumber} ${b.mobile}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [bookings, statusFilter, searchQ])

  // Group events by hall for the calendar
  const hallNames = useMemo(() => {
    const names = new Set<string>()
    bookings.forEach(b => b.events?.forEach((e: any) => names.add(e.hallName)))
    halls.forEach(h => names.add(h.name))
    return Array.from(names)
  }, [bookings, halls])

  const getEventsForHallAndDay = (hallName: string, day: Date) => {
    const result: any[] = []
    bookings.forEach(b => {
      b.events?.forEach((e: any) => {
        if (e.hallName === hallName && isSameDay(parseISO(e.eventDate), day)) {
          result.push({ ...e, booking: b })
        }
      })
    })
    return result
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/admin/banquet/bookings?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Booking deleted')
        setShowDetail(false)
        setSelectedBooking(null)
        fetchData()
      } else toast.error('Failed to delete')
    } catch { toast.error('Error deleting') }
    finally { setDeletingId(null) }
  }

  const stats = useMemo(() => ({
    total: bookings.length,
    confirmed: bookings.filter(b => b.status === 'CONFIRMED').length,
    enquiry: bookings.filter(b => b.status === 'ENQUIRY').length,
    revenue: bookings.filter(b => b.status === 'CONFIRMED').reduce((s, b) => s + (b.totalAmount || 0), 0)
  }), [bookings])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-text-primary tracking-tight flex items-center gap-2">
            <UtensilsCrossed className="w-6 h-6 text-[#4A9EFF]" />
            Banquet Management
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">Manage halls, events, bookings &amp; billing</p>
        </div>
        <Link href="/admin/banquet/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-[#4A9EFF] hover:bg-[#4A9EFF]/80 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-[#4A9EFF]/20">
          <Plus className="w-4 h-4" />
          New Booking
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Bookings', value: stats.total, icon: Calendar, color: 'text-[#4A9EFF]', bg: 'bg-[#4A9EFF]/10' },
          { label: 'Confirmed', value: stats.confirmed, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Enquiries', value: stats.enquiry, icon: AlertCircle, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'Confirmed Revenue', value: `₹${stats.revenue.toLocaleString('en-IN')}`, icon: BarChart3, color: 'text-purple-400', bg: 'bg-purple-500/10' },
        ].map((s, i) => (
          <div key={i} className="bg-surface border border-border/50 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className={cn('p-2.5 rounded-xl', s.bg)}>
                <s.icon className={cn('w-5 h-5', s.color)} />
              </div>
              <div>
                <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">{s.label}</p>
                <p className={cn('text-xl font-black mt-0.5', s.color)}>{s.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Booking Calendar */}
      <div className="bg-surface border border-border/50 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
          <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#4A9EFF]" />
            Booking Calendar
          </h2>
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentDate(viewMode === 'week' ? addDays(currentDate, -7) : addMonths(currentDate, -1))}
              className="p-1.5 hover:bg-white/10 rounded-lg text-text-secondary transition-colors"
              title="Previous">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-text-primary min-w-[140px] text-center select-none">
              {viewMode === 'week'
                ? `${format(startDate, 'dd MMM')} – ${format(days[days.length - 1], 'dd MMM yyyy')}`
                : format(startDate, 'MMMM yyyy')}
            </span>
            <button onClick={() => setCurrentDate(viewMode === 'week' ? addDays(currentDate, 7) : addMonths(currentDate, 1))}
              className="p-1.5 hover:bg-white/10 rounded-lg text-text-secondary transition-colors"
              title="Next">
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="flex bg-slate-100 dark:bg-black/30 border border-border rounded-xl p-0.5 ml-2">
              {(['week', 'month'] as const).map(m => (
                <button key={m} onClick={() => setViewMode(m)}
                  className={cn('px-3 py-1 text-[10px] font-black uppercase rounded-lg transition-all',
                    viewMode === m ? 'bg-[#4A9EFF] text-white shadow-sm' : 'text-text-secondary hover:text-text-primary')}>
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className={cn("w-full border-collapse table-fixed text-left",
            viewMode === 'month' ? "min-w-[1720px]" : "min-w-[850px]")}>
            <colgroup>
              <col style={{ width: '150px' }} />
              {days.map(d => (
                <col key={d.toString()} style={{ width: viewMode === 'week' ? `${(100 - 15) / 7}%` : '52px' }} />
              ))}
            </colgroup>
            <thead>
              <tr className="border-b border-border bg-slate-100/80 dark:bg-black/30">
                <th className="sticky left-0 z-20 bg-slate-100 dark:bg-surface px-3 py-2.5 text-[10px] font-black text-text-secondary uppercase tracking-widest border-r border-border select-none">
                  Hall
                </th>
                {days.map(d => {
                  const isToday = isSameDay(d, new Date())
                  return (
                    <th key={d.toString()} className={cn("py-2 px-1 text-center border-l border-border/20 font-normal select-none overflow-hidden",
                      isToday ? "bg-[#4A9EFF]/15 text-[#4A9EFF]" : "")}>
                      <p className={cn("text-[9px] font-black uppercase leading-tight", isToday ? "text-[#4A9EFF]" : "text-text-tertiary")}>
                        {format(d, 'EEE')}
                      </p>
                      <p className={cn("text-xs font-black leading-tight mt-0.5", isToday ? "text-[#4A9EFF]" : "text-text-secondary")}>
                        {format(d, 'd')}
                      </p>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={days.length + 1} className="py-16 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-[#4A9EFF] mx-auto" />
                  </td>
                </tr>
              ) : hallNames.length === 0 ? (
                <tr>
                  <td colSpan={days.length + 1} className="text-center py-12 text-text-tertiary text-sm">
                    No halls configured yet.
                    <Link href="/admin/banquet/halls" className="text-[#4A9EFF] ml-1 hover:underline">Add a hall →</Link>
                  </td>
                </tr>
              ) : (
                hallNames.map(hallName => (
                  <tr key={hallName} className="border-b border-border/20 hover:bg-white/[0.01]">
                    <td className="sticky left-0 z-10 bg-surface px-3 py-3 border-r border-border align-middle">
                      <p className="text-xs font-bold text-text-primary truncate" title={hallName}>{hallName}</p>
                      <p className="text-[9px] text-text-tertiary">Banquet Hall</p>
                    </td>
                    {days.map(day => {
                      const dayEvents = getEventsForHallAndDay(hallName, day)
                      const isToday = isSameDay(day, new Date())
                      const isMonth = viewMode === 'month'
                      return (
                        <td key={day.toString()} className={cn("border-l border-border/20 p-1 align-top h-[70px] max-w-0 overflow-hidden relative",
                          isToday ? "bg-[#4A9EFF]/5" : "")}>
                          {dayEvents.map((ev, i) => {
                            return (
                              <button
                                key={i}
                                onClick={() => { setSelectedBooking(ev.booking); setShowDetail(true) }}
                                onMouseEnter={(e) => {
                                  const rect = e.currentTarget.getBoundingClientRect()
                                  setHoveredCard({ ev, rect })
                                }}
                                onMouseLeave={() => setHoveredCard(null)}
                                className={cn(
                                  "w-full text-left rounded-md shadow-sm transition-all hover:opacity-90 active:scale-95 block overflow-hidden cursor-pointer",
                                  isMonth ? "p-1 mb-1" : "p-1.5 mb-1",
                                  EVENT_TYPE_COLORS[ev.eventType] || 'bg-[#4A9EFF]/80'
                                )}
                              >
                                {isMonth ? (
                                  <div className="w-full text-center overflow-hidden">
                                    <p className="text-[9px] font-black text-white leading-tight truncate">
                                      {ev.eventType}
                                    </p>
                                    <p className="text-[8px] font-medium text-white/90 leading-tight truncate mt-0.5">
                                      {ev.booking.firstName}
                                    </p>
                                  </div>
                                ) : (
                                  <div className="w-full overflow-hidden">
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="text-[10px] font-black text-white truncate">
                                        {ev.booking.firstName} {ev.booking.lastName}
                                      </span>
                                      {ev.startTime && (
                                        <span className="text-[8px] text-white/80 font-medium shrink-0">
                                          {ev.startTime}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[9px] text-white/90 truncate mt-0.5 flex items-center gap-1 font-medium">
                                      <span>{ev.eventType}</span>
                                      {ev.guaranteedPax > 0 && <span>· {ev.guaranteedPax}p</span>}
                                    </div>
                                  </div>
                                )}
                              </button>
                            )
                          })}
                        </td>
                      )
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Hover Card for Calendar Events */}
      {hoveredCard && (
        <div
          style={{
            position: 'fixed',
            top: hoveredCard.rect.top > 280
              ? Math.max(12, hoveredCard.rect.top - 245)
              : hoveredCard.rect.bottom + 8,
            left: Math.max(16, Math.min(typeof window !== 'undefined' ? window.innerWidth - 304 : 800, hoveredCard.rect.left + hoveredCard.rect.width / 2 - 144)),
            zIndex: 99999,
          }}
          className="w-72 bg-[#0c1220]/95 backdrop-blur-2xl border border-white/20 rounded-2xl p-4 shadow-[0_20px_60px_rgba(0,0,0,0.85)] pointer-events-none animate-in fade-in zoom-in-95 duration-150 ring-1 ring-white/10"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className={cn('w-2 h-2 rounded-full', STATUS_CONFIG[hoveredCard.ev.booking.status]?.dot || 'bg-[#4A9EFF]')} />
              <span className="font-mono font-bold text-xs text-[#4A9EFF]">
                #{hoveredCard.ev.booking.bookingNumber}
              </span>
            </div>
            <span className={cn('px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider',
              STATUS_CONFIG[hoveredCard.ev.booking.status]?.bg, STATUS_CONFIG[hoveredCard.ev.booking.status]?.color)}>
              {STATUS_CONFIG[hoveredCard.ev.booking.status]?.label}
            </span>
          </div>

          {/* Guest Name & Contact */}
          <div className="mb-3">
            <h4 className="text-sm font-black text-white leading-tight">
              {hoveredCard.ev.booking.firstName} {hoveredCard.ev.booking.lastName}
            </h4>
            <p className="text-[11px] text-gray-400 font-medium mt-0.5">
              {hoveredCard.ev.booking.mobile || 'No contact provided'}
            </p>
          </div>

          {/* Event Specs Grid */}
          <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-black/40 border border-white/5 text-[11px] mb-3">
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Event</p>
              <p className="font-bold text-white mt-0.5 flex items-center gap-1.5">
                <span className={cn('w-2 h-2 rounded-sm shrink-0', EVENT_TYPE_COLORS[hoveredCard.ev.eventType] || 'bg-[#4A9EFF]')} />
                <span className="truncate">{hoveredCard.ev.eventType}</span>
              </p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Hall</p>
              <p className="font-bold text-white mt-0.5 truncate">{hoveredCard.ev.hallName}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Timing</p>
              <p className="font-bold text-gray-200 mt-0.5">
                {hoveredCard.ev.startTime || '---'} – {hoveredCard.ev.endTime || '---'}
              </p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Guaranteed</p>
              <p className="font-bold text-gray-200 mt-0.5">
                {hoveredCard.ev.guaranteedPax || 0} Guests
              </p>
            </div>
          </div>

          {/* Financials & Hint */}
          <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
            <div>
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Total Amount</p>
              <p className="font-black text-[#4A9EFF] text-sm">
                ₹{(hoveredCard.ev.booking.totalAmount || 0).toLocaleString('en-IN')}
              </p>
            </div>
            <span className="text-[9px] text-gray-400 font-semibold bg-white/[0.05] px-2 py-1 rounded-lg">
              Click to view details ↗
            </span>
          </div>
        </div>
      )}

      {/* Bookings List */}
      <div className="bg-surface border border-border/50 rounded-2xl overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-5 py-4 border-b border-border/50">
          <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#4A9EFF]" />
            All Bookings
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
              <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
                className="pl-8 pr-3 py-2 bg-slate-50 dark:bg-black/30 border border-border hover:border-border/80 rounded-xl text-xs text-text-primary placeholder:text-text-tertiary outline-none focus:border-[#4A9EFF] w-48 shadow-xs transition-colors"
                placeholder="Search bookings..." />
            </div>
            {/* Status filter */}
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="bg-slate-50 dark:bg-black/40 hover:bg-slate-100 dark:hover:bg-black/60 border border-border rounded-xl pl-3 pr-8 py-2 text-xs font-semibold text-text-primary outline-none focus:border-[#4A9EFF] cursor-pointer transition-all shadow-xs">
              <option value="ALL" >All Status</option>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <option key={k} value={k} >{v.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-100/90 dark:bg-black/20 border-b border-border">
              <tr>
                {['Booking #', 'Guest Name', 'Mobile', 'Event', 'Hall', 'Date', 'Pax', 'Amount', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-text-secondary uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {loading ? (
                <tr><td colSpan={10} className="text-center py-12 text-text-tertiary">
                  <Loader2 className="w-5 h-5 animate-spin inline mr-2" />Loading...
                </td></tr>
              ) : filteredBookings.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-12 text-text-tertiary">
                  No bookings found. <Link href="/admin/banquet/new" className="text-[#4A9EFF] hover:underline">Create one →</Link>
                </td></tr>
              ) : filteredBookings.map(b => {
                const cfg = STATUS_CONFIG[b.status] || STATUS_CONFIG.ENQUIRY
                const firstEvent = b.events?.[0]
                return (
                  <tr key={b.id} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-[#4A9EFF]">{b.bookingNumber}</td>
                    <td className="px-4 py-3 font-semibold text-text-primary">{b.firstName} {b.lastName}</td>
                    <td className="px-4 py-3 text-text-secondary">{b.mobile}</td>
                    <td className="px-4 py-3 text-text-secondary">{firstEvent?.eventType || '—'}</td>
                    <td className="px-4 py-3 text-text-secondary">{firstEvent?.hallName || '—'}</td>
                    <td className="px-4 py-3 text-text-secondary">
                      {firstEvent ? format(parseISO(firstEvent.eventDate), 'dd MMM yyyy') : '—'}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {b.events?.reduce((s: number, e: any) => s + (e.guaranteedPax || 0), 0) || 0}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-text-primary">₹{(b.totalAmount || 0).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold', cfg.bg, cfg.color)}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setSelectedBooking(b); setShowDetail(true) }}
                          className="p-1.5 hover:bg-white/10 rounded-lg text-text-secondary hover:text-[#4A9EFF] transition-all">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <Link href={`/admin/banquet/new?id=${b.id}`}
                          className="p-1.5 hover:bg-white/10 rounded-lg text-text-secondary hover:text-amber-400 transition-all">
                          <Edit3 className="w-3.5 h-3.5" />
                        </Link>
                        <button onClick={() => handleDelete(b.id)}
                          disabled={deletingId === b.id}
                          className="p-1.5 hover:bg-red-500/10 rounded-lg text-text-secondary hover:text-red-400 transition-all">
                          {deletingId === b.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetail && selectedBooking && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-border/50 rounded-3xl w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-[#4A9EFF]/10">
              <div>
                <h2 className="text-lg font-black text-text-primary">Booking #{selectedBooking.bookingNumber}</h2>
                <p className="text-xs text-text-secondary">{selectedBooking.firstName} {selectedBooking.lastName} · {selectedBooking.mobile}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn('px-3 py-1 rounded-full border text-xs font-bold',
                  STATUS_CONFIG[selectedBooking.status]?.bg, STATUS_CONFIG[selectedBooking.status]?.color)}>
                  {STATUS_CONFIG[selectedBooking.status]?.label}
                </span>
                <button onClick={() => setShowDetail(false)} className="p-1.5 hover:bg-white/10 rounded-full text-text-secondary">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {/* Guest Info */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                {[
                  ['Email', selectedBooking.email],
                  ['Address', selectedBooking.address],
                  ['City / State', `${selectedBooking.city || ''} ${selectedBooking.state || ''}`],
                  ['Event Name', selectedBooking.eventName],
                  ['Pay Mode', selectedBooking.payMode],
                  ['Market Segment', selectedBooking.marketSegment],
                  ['Business Source', selectedBooking.businessSource],
                  ['Billing', selectedBooking.billingInstruction],
                ].filter(([, v]) => v).map(([k, v]) => (
                  <div key={k as string} className="bg-slate-100/70 dark:bg-black/20 border border-border rounded-xl p-3">
                    <p className="text-[9px] font-black text-text-tertiary uppercase tracking-widest">{k}</p>
                    <p className="text-text-primary font-semibold mt-0.5">{v}</p>
                  </div>
                ))}
              </div>

              {/* Events */}
              <div>
                <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mb-3">Event Details</p>
                <div className="border border-border/50 rounded-xl overflow-hidden">
                  <table className="w-full text-[11px]">
                    <thead className="bg-[#4A9EFF]/10 border-b border-border/30">
                      <tr>
                        {['Hall', 'Event', 'Date', 'Time', 'Pax', 'Per Plate', 'Hall Rent', 'Total'].map(h => (
                          <th key={h} className="px-3 py-2 text-left font-black text-text-tertiary">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                      {selectedBooking.events?.map((ev: any, i: number) => (
                        <tr key={i} className="hover:bg-white/[0.02]">
                          <td className="px-3 py-2 font-semibold text-text-primary">{ev.hallName}</td>
                          <td className="px-3 py-2 text-text-secondary">{ev.eventType}</td>
                          <td className="px-3 py-2 text-text-secondary">{format(parseISO(ev.eventDate), 'dd-MMM-yyyy')}</td>
                          <td className="px-3 py-2 text-text-secondary">{ev.startTime}–{ev.endTime}</td>
                          <td className="px-3 py-2 text-text-secondary">A:{ev.guaranteedPax} C:{ev.childPax}</td>
                          <td className="px-3 py-2 font-mono text-text-primary">₹{(ev.perPlateRate || 0).toLocaleString()}</td>
                          <td className="px-3 py-2 font-mono text-text-secondary">₹{(ev.hallRent || 0).toLocaleString()}</td>
                          <td className="px-3 py-2 font-mono font-bold text-[#4A9EFF]">₹{(ev.amount || 0).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t border-border/50 bg-black/20">
                      <tr>
                        <td colSpan={7} className="px-3 py-2 text-right font-black text-text-primary text-xs">Grand Total</td>
                        <td className="px-3 py-2 font-black text-[#4A9EFF] font-mono text-sm">₹{(selectedBooking.totalAmount || 0).toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <Link href={`/admin/banquet/new?id=${selectedBooking.id}`}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-bold rounded-2xl text-xs transition-all border border-amber-500/20">
                  <Edit3 className="w-4 h-4" /> Edit Booking
                </Link>
                <Link href={`/admin/banquet/billing?id=${selectedBooking.id}`}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#4A9EFF]/10 hover:bg-[#4A9EFF]/20 text-[#4A9EFF] font-bold rounded-2xl text-xs transition-all border border-[#4A9EFF]/20">
                  <FileText className="w-4 h-4" /> View Bill
                </Link>
                <button onClick={() => handleDelete(selectedBooking.id)}
                  className="flex items-center justify-center gap-2 py-3 px-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold rounded-2xl text-xs transition-all border border-red-500/20">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
