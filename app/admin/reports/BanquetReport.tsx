'use client'

import { useState, useEffect, useMemo } from 'react'
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns'
import { Loader2, Download, Calendar, Users, IndianRupee, FileText, BarChart3 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  ENQUIRY: { label: 'Enquiry', color: 'text-blue-400' },
  LEAD_GENERATION: { label: 'Lead', color: 'text-amber-400' },
  CONFIRMED: { label: 'Confirmed', color: 'text-emerald-400' },
  WAITLIST: { label: 'Waitlist', color: 'text-purple-400' },
  CANCELLED: { label: 'Cancelled', color: 'text-red-400' },
  COMPLETED: { label: 'Completed', color: 'text-gray-400' },
}

export default function BanquetReport() {
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'))
  const [statusFilter, setStatusFilter] = useState('ALL')

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/banquet/bookings')
      const data = await res.json()
      setBookings(Array.isArray(data) ? data : [])
    } catch {
      toast.error('Failed to load banquet data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const filtered = useMemo(() => {
    return bookings.filter(b => {
      if (statusFilter !== 'ALL' && b.status !== statusFilter) return false
      if (dateFrom || dateTo) {
        const hasEventInRange = b.events?.some((e: any) => {
          const d = e.eventDate?.split('T')[0]
          if (dateFrom && d < dateFrom) return false
          if (dateTo && d > dateTo) return false
          return true
        })
        if (!hasEventInRange && b.events?.length > 0) return false
      }
      return true
    })
  }, [bookings, statusFilter, dateFrom, dateTo])

  const stats = useMemo(() => ({
    totalBookings: filtered.length,
    totalRevenue: filtered.reduce((s, b) => s + (b.totalAmount || 0), 0),
    totalPaid: filtered.reduce((s, b) => s + (b.paidAmount || 0), 0),
    totalPending: filtered.reduce((s, b) => s + (b.balanceDue || 0), 0),
    totalPax: filtered.reduce((s, b) => s + (b.events?.reduce((es: number, e: any) => es + (e.guaranteedPax || 0), 0) || 0), 0),
    byStatus: Object.keys(STATUS_CONFIG).map(k => ({
      status: k,
      count: filtered.filter(b => b.status === k).length,
      revenue: filtered.filter(b => b.status === k).reduce((s, b) => s + (b.totalAmount || 0), 0)
    })).filter(s => s.count > 0),
    byEventType: [...new Set(filtered.flatMap(b => b.events?.map((e: any) => e.eventType) || []))].map(t => ({
      type: t,
      count: filtered.filter(b => b.events?.some((e: any) => e.eventType === t)).length,
      revenue: filtered.filter(b => b.events?.some((e: any) => e.eventType === t)).reduce((s, b) => s + (b.totalAmount || 0), 0)
    })),
    byHall: [...new Set(filtered.flatMap(b => b.events?.map((e: any) => e.hallName) || []))].map(h => ({
      hall: h,
      events: filtered.reduce((s, b) => s + (b.events?.filter((e: any) => e.hallName === h).length || 0), 0),
      revenue: filtered.filter(b => b.events?.some((e: any) => e.hallName === h)).reduce((s, b) => s + (b.totalAmount || 0), 0)
    }))
  }), [filtered])

  const downloadCSV = () => {
    const rows = [
      ['Booking #', 'Guest Name', 'Mobile', 'Event Type', 'Hall', 'Event Date', 'Time', 'Pax (A/C)', 'Per Plate', 'Hall Rent', 'Total Amount', 'Paid', 'Balance', 'Status'],
      ...filtered.flatMap(b =>
        (b.events || [{ eventType: '-', hallName: '-', eventDate: '', startTime: '', endTime: '', guaranteedPax: 0, childPax: 0, perPlateRate: 0, hallRent: 0 }]).map((ev: any) => [
          b.bookingNumber, `${b.firstName} ${b.lastName}`, b.mobile,
          ev.eventType, ev.hallName,
          ev.eventDate ? format(parseISO(ev.eventDate), 'dd-MMM-yyyy') : '',
          `${ev.startTime || ''}-${ev.endTime || ''}`,
          `${ev.guaranteedPax || 0}/${ev.childPax || 0}`,
          ev.perPlateRate || 0, ev.hallRent || 0,
          b.totalAmount || 0, b.paidAmount || 0, b.balanceDue || 0, b.status
        ])
      )
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `banquet-report-${dateFrom}-${dateTo}.csv`; a.click()
    URL.revokeObjectURL(url)
    toast.success('Banquet report exported!')
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-[#4A9EFF]" />
    </div>
  )

  return (
    <div className="p-6 space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-[10px] font-black text-text-tertiary uppercase tracking-widest block mb-1">From</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="bg-black/30 border border-border/50 rounded-xl px-3 py-2 text-xs text-text-primary outline-none focus:border-[#4A9EFF]" />
        </div>
        <div>
          <label className="text-[10px] font-black text-text-tertiary uppercase tracking-widest block mb-1">To</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="bg-black/30 border border-border/50 rounded-xl px-3 py-2 text-xs text-text-primary outline-none focus:border-[#4A9EFF]" />
        </div>
        <div>
          <label className="text-[10px] font-black text-text-tertiary uppercase tracking-widest block mb-1">Status</label>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="bg-black/30 border border-border/50 rounded-xl px-3 py-2 text-xs text-text-primary outline-none focus:border-[#4A9EFF]">
            <option value="ALL">All Status</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <button onClick={downloadCSV}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-xl border border-emerald-500/20 transition-all">
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Bookings', value: stats.totalBookings, icon: Calendar, color: 'text-[#4A9EFF]', bg: 'bg-[#4A9EFF]/10' },
          { label: 'Total Revenue', value: `₹${stats.totalRevenue.toLocaleString('en-IN')}`, icon: IndianRupee, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Collected', value: `₹${stats.totalPaid.toLocaleString('en-IN')}`, icon: IndianRupee, color: 'text-green-400', bg: 'bg-green-500/10' },
          { label: 'Pending', value: `₹${stats.totalPending.toLocaleString('en-IN')}`, icon: IndianRupee, color: 'text-red-400', bg: 'bg-red-500/10' },
          { label: 'Total Pax', value: stats.totalPax, icon: Users, color: 'text-purple-400', bg: 'bg-purple-500/10' },
        ].map((s, i) => (
          <div key={i} className="bg-surface border border-border/50 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className={cn('p-2 rounded-xl', s.bg)}><s.icon className={cn('w-4 h-4', s.color)} /></div>
              <div>
                <p className="text-[9px] font-black text-text-tertiary uppercase tracking-widest">{s.label}</p>
                <p className={cn('text-lg font-black', s.color)}>{s.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Breakdown by Status, Event Type, and Hall */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* By Status */}
        <div className="bg-surface border border-border/50 rounded-2xl p-5">
          <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mb-3">By Status</p>
          <div className="space-y-2">
            {stats.byStatus.map(s => (
              <div key={s.status} className="flex items-center justify-between text-xs">
                <span className={STATUS_CONFIG[s.status]?.color || 'text-text-secondary'}>{STATUS_CONFIG[s.status]?.label || s.status}</span>
                <div className="flex items-center gap-3">
                  <span className="text-text-tertiary">{s.count} bookings</span>
                  <span className="font-mono font-bold text-text-primary">₹{s.revenue.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By Event Type */}
        <div className="bg-surface border border-border/50 rounded-2xl p-5">
          <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mb-3">By Event Type</p>
          <div className="space-y-2">
            {stats.byEventType.map(t => (
              <div key={t.type} className="flex items-center justify-between text-xs">
                <span className="text-text-primary font-semibold">{t.type}</span>
                <div className="flex items-center gap-3">
                  <span className="text-text-tertiary">{t.count} events</span>
                  <span className="font-mono font-bold text-[#4A9EFF]">₹{t.revenue.toLocaleString()}</span>
                </div>
              </div>
            ))}
            {stats.byEventType.length === 0 && <p className="text-text-tertiary text-xs">No events in period</p>}
          </div>
        </div>

        {/* By Hall */}
        <div className="bg-surface border border-border/50 rounded-2xl p-5">
          <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mb-3">By Hall</p>
          <div className="space-y-2">
            {stats.byHall.map(h => (
              <div key={h.hall} className="flex items-center justify-between text-xs">
                <span className="text-text-primary font-semibold">{h.hall}</span>
                <div className="flex items-center gap-3">
                  <span className="text-text-tertiary">{h.events} events</span>
                  <span className="font-mono font-bold text-amber-400">₹{h.revenue.toLocaleString()}</span>
                </div>
              </div>
            ))}
            {stats.byHall.length === 0 && <p className="text-text-tertiary text-xs">No halls used</p>}
          </div>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-surface border border-border/50 rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border/50 flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#4A9EFF]" />
          <h3 className="text-sm font-bold text-text-primary">Detailed Booking Report</h3>
          <span className="text-[10px] text-text-tertiary ml-auto">{filtered.length} records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-black/20 border-b border-border/30">
              <tr>
                {['Booking #', 'Guest', 'Event', 'Hall', 'Date', 'Pax', 'Per Plate', 'Hall Rent', 'Total', 'Paid', 'Balance', 'Status'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-[10px] font-black text-text-tertiary uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {filtered.length === 0 ? (
                <tr><td colSpan={12} className="text-center py-10 text-text-tertiary">No bookings match the selected filters.</td></tr>
              ) : filtered.map(b => {
                const ev = b.events?.[0]
                return (
                  <tr key={b.id} className="hover:bg-white/[0.02]">
                    <td className="px-3 py-2 font-mono font-bold text-[#4A9EFF]">{b.bookingNumber}</td>
                    <td className="px-3 py-2 font-semibold text-text-primary whitespace-nowrap">{b.firstName} {b.lastName}</td>
                    <td className="px-3 py-2 text-text-secondary">{ev?.eventType || '—'}</td>
                    <td className="px-3 py-2 text-text-secondary">{ev?.hallName || '—'}</td>
                    <td className="px-3 py-2 text-text-secondary whitespace-nowrap">{ev ? format(parseISO(ev.eventDate), 'dd MMM yy') : '—'}</td>
                    <td className="px-3 py-2 text-text-secondary">{ev?.guaranteedPax || 0}</td>
                    <td className="px-3 py-2 font-mono text-text-primary">₹{(ev?.perPlateRate || 0).toLocaleString()}</td>
                    <td className="px-3 py-2 font-mono text-text-secondary">₹{(ev?.hallRent || 0).toLocaleString()}</td>
                    <td className="px-3 py-2 font-mono font-bold text-text-primary">₹{(b.totalAmount || 0).toLocaleString()}</td>
                    <td className="px-3 py-2 font-mono text-emerald-400">₹{(b.paidAmount || 0).toLocaleString()}</td>
                    <td className={cn('px-3 py-2 font-mono font-bold', b.balanceDue > 0 ? 'text-red-400' : 'text-emerald-400')}>
                      {b.balanceDue > 0 ? `₹${b.balanceDue.toLocaleString()}` : 'Paid'}
                    </td>
                    <td className="px-3 py-2">
                      <span className={cn('text-[10px] font-bold', STATUS_CONFIG[b.status]?.color)}>{STATUS_CONFIG[b.status]?.label || b.status}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
