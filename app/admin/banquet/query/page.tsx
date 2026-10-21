'use client'

import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { Search, Filter, Download, Loader2, Calendar, Users, FileText } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { buildContextUrl } from '@/lib/admin-context'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  ENQUIRY:         { label: 'Enquiry',          color: 'text-blue-400',    bg: 'bg-blue-500/20 border-blue-500/30' },
  LEAD_GENERATION: { label: 'Lead Generation',  color: 'text-amber-400',   bg: 'bg-amber-500/20 border-amber-500/30' },
  CONFIRMED:       { label: 'Confirmed',         color: 'text-emerald-400', bg: 'bg-emerald-500/20 border-emerald-500/30' },
  WAITLIST:        { label: 'Waitlist',          color: 'text-purple-400',  bg: 'bg-purple-500/20 border-purple-500/30' },
  CANCELLED:       { label: 'Cancelled',         color: 'text-red-400',     bg: 'bg-red-500/20 border-red-500/30' },
  COMPLETED:       { label: 'Completed',         color: 'text-gray-400',    bg: 'bg-gray-500/20 border-gray-500/30' },
}

export default function BanquetQueryPage() {
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQ, setSearchQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [eventTypeFilter, setEventTypeFilter] = useState('ALL')

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(buildContextUrl('/api/admin/banquet/bookings'))
      const data = await res.json()
      setBookings(Array.isArray(data) ? data : [])
    } catch { toast.error('Failed to load bookings') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  const filtered = bookings.filter(b => {
    if (statusFilter !== 'ALL' && b.status !== statusFilter) return false
    const q = searchQ.toLowerCase()
    if (q && !`${b.firstName} ${b.lastName} ${b.bookingNumber} ${b.mobile} ${b.eventName || ''}`.toLowerCase().includes(q)) return false
    if (eventTypeFilter !== 'ALL') {
      const hasType = b.events?.some((e: any) => e.eventType === eventTypeFilter)
      if (!hasType) return false
    }
    if (dateFrom) {
      const hasEvent = b.events?.some((e: any) => e.eventDate >= dateFrom)
      if (!hasEvent) return false
    }
    if (dateTo) {
      const hasEvent = b.events?.some((e: any) => e.eventDate <= dateTo + 'T23:59:59')
      if (!hasEvent) return false
    }
    return true
  })

  const allEventTypes = [...new Set(bookings.flatMap(b => b.events?.map((e: any) => e.eventType) || []))]

  const downloadCSV = () => {
    const rows = [
      ['Booking #', 'Guest Name', 'Mobile', 'Email', 'Event Type', 'Hall', 'Event Date', 'Pax', 'Amount', 'Paid', 'Balance', 'Status'],
      ...filtered.map(b => {
        const ev = b.events?.[0]
        return [
          b.bookingNumber, `${b.firstName} ${b.lastName}`, b.mobile, b.email || '',
          ev?.eventType || '', ev?.hallName || '',
          ev ? format(parseISO(ev.eventDate), 'dd-MMM-yyyy') : '',
          ev?.guaranteedPax || 0, b.totalAmount || 0, b.paidAmount || 0,
          b.balanceDue || 0, b.status
        ]
      })
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'banquet-bookings.csv'; a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV downloaded!')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-text-primary flex items-center gap-2">
            <Search className="w-6 h-6 text-[#4A9EFF]" />
            Banquet Query
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">Search, filter and export banquet bookings</p>
        </div>
        <button onClick={downloadCSV}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-sm font-bold rounded-xl border border-emerald-500/20 transition-all">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-surface border border-border/50 rounded-2xl p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
            <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
              className="w-full pl-8 pr-3 py-2.5 bg-slate-50 dark:bg-black/30 border border-border/50 rounded-xl text-xs text-text-primary outline-none focus:border-[#4A9EFF]"
              placeholder="Search by name, booking#, mobile..." />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="bg-slate-50 dark:bg-black/40 hover:bg-slate-100 dark:bg-black/60 border border-border/60 hover:border-border rounded-xl pl-3 pr-8 py-2.5 text-xs font-semibold text-text-primary outline-none focus:border-[#4A9EFF] cursor-pointer  transition-all">
            <option value="ALL" >All Status</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k} >{v.label}</option>)}
          </select>
          <select value={eventTypeFilter} onChange={e => setEventTypeFilter(e.target.value)}
            className="bg-slate-50 dark:bg-black/40 hover:bg-slate-100 dark:bg-black/60 border border-border/60 hover:border-border rounded-xl pl-3 pr-8 py-2.5 text-xs font-semibold text-text-primary outline-none focus:border-[#4A9EFF] cursor-pointer  transition-all">
            <option value="ALL" >All Event Types</option>
            {allEventTypes.map(t => <option key={t} value={t} >{t}</option>)}
          </select>
          <div className="flex gap-2">
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="flex-1 bg-slate-50 dark:bg-black/30 border border-border/50 rounded-xl px-3 py-2.5 text-xs text-text-primary outline-none focus:border-[#4A9EFF]" />
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="flex-1 bg-slate-50 dark:bg-black/30 border border-border/50 rounded-xl px-3 py-2.5 text-xs text-text-primary outline-none focus:border-[#4A9EFF]" />
          </div>
        </div>
        <p className="text-[10px] text-text-tertiary mt-2">{filtered.length} booking{filtered.length !== 1 ? 's' : ''} found</p>
      </div>

      {/* Table */}
      <div className="bg-surface border border-border/50 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-100/90 dark:bg-black/20 border-b border-border">
              <tr>
                {['Booking #', 'Guest', 'Mobile', 'Event', 'Hall', 'Date & Time', 'Pax', 'Total', 'Paid', 'Balance', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-text-tertiary uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {loading ? (
                <tr><td colSpan={12} className="text-center py-12"><Loader2 className="w-5 h-5 animate-spin inline text-[#4A9EFF]" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={12} className="text-center py-12 text-text-tertiary">No bookings match your filters</td></tr>
              ) : filtered.map(b => {
                const cfg = STATUS_CONFIG[b.status] || STATUS_CONFIG.ENQUIRY
                const ev = b.events?.[0]
                const totalPax = b.events?.reduce((s: number, e: any) => s + (e.guaranteedPax || 0), 0) || 0
                return (
                  <tr key={b.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-[#4A9EFF]">{b.bookingNumber}</td>
                    <td className="px-4 py-3 font-semibold text-text-primary">{b.firstName} {b.lastName}</td>
                    <td className="px-4 py-3 text-text-secondary">{b.mobile}</td>
                    <td className="px-4 py-3 text-text-secondary">{ev?.eventType || '—'}</td>
                    <td className="px-4 py-3 text-text-secondary">{ev?.hallName || '—'}</td>
                    <td className="px-4 py-3 text-text-secondary whitespace-nowrap">
                      {ev ? `${format(parseISO(ev.eventDate), 'dd MMM')} ${ev.startTime}-${ev.endTime}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{totalPax}</td>
                    <td className="px-4 py-3 font-mono font-bold text-text-primary">₹{(b.totalAmount || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 font-mono text-emerald-400">₹{(b.paidAmount || 0).toLocaleString()}</td>
                    <td className={`px-4 py-3 font-mono font-bold ${b.balanceDue > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {b.balanceDue > 0 ? `₹${b.balanceDue.toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('px-2.5 py-1 rounded-full border text-[10px] font-bold', cfg.bg, cfg.color)}>{cfg.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link href={`/admin/banquet/billing?id=${b.id}`}
                          className="px-2 py-1 bg-[#4A9EFF]/10 hover:bg-[#4A9EFF]/20 text-[#4A9EFF] rounded-lg text-[10px] font-bold">Bill</Link>
                        <Link href={`/admin/banquet/new?id=${b.id}`}
                          className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-lg text-[10px] font-bold">Edit</Link>
                      </div>
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
