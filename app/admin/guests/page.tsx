'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import useSWR from 'swr'
import Link from 'next/link'
import { useMemo } from 'react'
import { format } from 'date-fns'
import {
  Plus, Download, Search, CheckCircle2, Clock,
  ChevronLeft, ChevronRight, Calendar, SlidersHorizontal,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import Avatar from '@/components/common/Avatar'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'

/* ---- helpers ---- */
function getInitials(name: string) {
  return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
}
const AVATAR_COLORS = [
  'bg-[#4A9EFF]', 'bg-[#1db954]', 'bg-[#805ad5]', 'bg-[#d4aa00]', 'bg-[#e53e3e]', 'bg-[#ed8936]',
]
function avatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
}

const SOURCE_LABELS: Record<string, string> = {
  DIRECT: 'Direct', BOOKING_COM: 'Booking.com', MAKE_MY_TRIP: 'MakeMyTrip',
  AGODA: 'Agoda', EXPEDIA: 'Expedia', AIRBNB: 'Airbnb', WALK_IN: 'Walk-in', OTHER: 'Other',
}
const SOURCE_ICON: Record<string, string> = {
  BOOKING_COM: 'B', EXPEDIA: 'E', AIRBNB: 'A', AGODA: 'AG', MAKE_MY_TRIP: 'MMT', DIRECT: 'D', WALK_IN: 'W',
}

const PAGE_SIZE = 10

function GuestsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatus] = useState('ALL')
  const [sourceFilter, setSource] = useState('ALL')
  const [idFilter, setIdFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const [showAdd, setShowAdd] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [form, setForm] = useState({
    name: '', phone: '', email: '', idType: '', idNumber: '', address: '', dateOfBirth: '',
  })

  const { data: rawGuests, mutate, isValidating: loading } = useSWR('/api/admin/guests', (url) => fetch(url).then(res => res.json()), {
    revalidateOnFocus: true,
    dedupingInterval: 5000
  })

  const guests = useMemo(() => {
    const raw = Array.isArray(rawGuests) ? rawGuests : (rawGuests?.data ?? [])
    return raw.map((d: any) => ({
      ...d,
      checkIn: d.checkIn ? new Date(d.checkIn) : null,
      checkOut: d.checkOut ? new Date(d.checkOut) : null,
    }))
  }, [rawGuests])

  const fetchGuests = () => mutate()
  useEffect(() => {
    if (searchParams.get('addNew') === 'true') {
      setShowAdd(true)
      router.replace('/admin/guests')
    }
  }, [searchParams])

  // Filtered
  const filtered = guests.filter((g: any) => {
    const q = search.toLowerCase()
    const matchSearch = g.name.toLowerCase().includes(q) ||
      g.phone.includes(q) || (g.email || '').toLowerCase().includes(q) ||
      (g.roomNumber || '').includes(q)
    const matchStatus = statusFilter === 'ALL' || g.status === statusFilter
    const matchSource = sourceFilter === 'ALL' || g.source === sourceFilter
    const matchId = idFilter === 'ALL' ||
      (idFilter === 'VERIFIED' && g.idVerified) ||
      (idFilter === 'PENDING' && !g.idVerified)
    return matchSearch && matchStatus && matchSource && matchId
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  const handleSelectAll = () => {
    if (selected.size === pageItems.length) setSelected(new Set())
    else setSelected(new Set(pageItems.map((g: any) => g.id)))
  }

  const handleAddGuest = async () => {
    if (!form.name || !form.phone) { toast.error('Name and phone are required'); return }
    try {
      const res = await fetch('/api/admin/guests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        toast.success('Guest added successfully')
        setShowAdd(false)
        setForm({ name: '', phone: '', email: '', idType: '', idNumber: '', address: '', dateOfBirth: '' })
        fetchGuests()
      } else {
        toast.error(await res.text())
      }
    } catch { toast.error('Something went wrong') }
  }

  const handleExport = () => {
    if (filtered.length === 0) { toast.error('No guests to export'); return }

    const rows = filtered.map((g: any) => ({
      Name: g.name ?? '',
      Phone: g.phone ?? '',
      Email: g.email ?? '',
      Room: g.roomNumber ?? 'N/A',
      'Check-in': g.checkIn ? format(new Date(g.checkIn), 'dd MMM yyyy') : '',
      'Check-out': g.checkOut ? format(new Date(g.checkOut), 'dd MMM yyyy') : '',
      PAX: g.guestCount ?? 1,
      'ID Status': g.checkInStatus ?? '',
      Source: g.source ?? '',
      'Booking Status': g.status ?? '',
    }))

    const headers = Object.keys(rows[0])
    const csvContent = [
      headers.join(','),
      ...rows.map((row: Record<string, any>) =>
        headers.map(h => {
          const val = row[h]
          if (val === null || val === undefined) return '""'
          return `"${String(val).replace(/"/g, '""')}"`
        }).join(',')
      ),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `guests_${format(new Date(), 'yyyy-MM-dd')}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success(`Exported ${rows.length} guests`)
  }

  return (
    <div className="space-y-5 animate-fade-in">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Guest Management</h1>
          <p className="text-[13px] text-gray-400 mt-0.5">Manage current, past, and future guests</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#4A9EFF] hover:bg-[#3A8EEF] text-white text-[13px] font-semibold rounded-lg transition-colors shadow-lg shadow-[#4A9EFF]/20"
        >
          <Plus className="w-4 h-4" /> Add New Guest
        </button>
      </div>

      {/* FILTERS */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px] max-w-[360px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input
            type="text"
            placeholder="Search by guest name, room, or confirmation..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="w-full pl-9 pr-4 py-2 bg-[#233648] border border-white/[0.08] rounded-lg text-[13px] text-white placeholder:text-gray-600 focus:outline-none focus:border-[#4A9EFF]/40 transition-colors"
          />
        </div>

        {/* Status */}
        <select
          value={statusFilter}
          onChange={e => { setStatus(e.target.value); setPage(1) }}
          className="px-3 py-2 bg-[#233648] border border-white/[0.08] rounded-lg text-[13px] text-gray-300 focus:outline-none focus:border-[#4A9EFF]/40 cursor-pointer"
        >
          <option value="ALL">All Statuses</option>
          <option value="RESERVED">Reserved</option>
          <option value="CHECKED_IN">Checked In</option>
          <option value="CHECKED_OUT">Checked Out</option>
          <option value="CANCELLED">Cancelled</option>
        </select>

        {/* Source */}
        <select
          value={sourceFilter}
          onChange={e => { setSource(e.target.value); setPage(1) }}
          className="px-3 py-2 bg-[#233648] border border-white/[0.08] rounded-lg text-[13px] text-gray-300 focus:outline-none focus:border-[#4A9EFF]/40 cursor-pointer"
        >
          <option value="ALL">All Sources</option>
          <option value="DIRECT">Direct</option>
          <option value="BOOKING_COM">Booking.com</option>
          <option value="AIRBNB">Airbnb</option>
          <option value="EXPEDIA">Expedia</option>
          <option value="AGODA">Agoda</option>
          <option value="MAKE_MY_TRIP">MakeMyTrip</option>
          <option value="WALK_IN">Walk-in</option>
        </select>

        {/* ID Status */}
        <select
          value={idFilter}
          onChange={e => { setIdFilter(e.target.value); setPage(1) }}
          className="px-3 py-2 bg-[#233648] border border-white/[0.08] rounded-lg text-[13px] text-gray-300 focus:outline-none focus:border-[#4A9EFF]/40 cursor-pointer"
        >
          <option value="ALL">ID Status: All</option>
          <option value="VERIFIED">Verified</option>
          <option value="PENDING">Pending</option>
        </select>

        {/* Date range placeholder */}
        <button className="flex items-center gap-2 px-3 py-2 bg-[#233648] border border-white/[0.08] rounded-lg text-[13px] text-gray-400 hover:text-white hover:border-white/[0.15] transition-colors">
          <Calendar className="w-3.5 h-3.5" /> Select Dates
        </button>

        <button
          onClick={handleExport}
          className="ml-auto flex items-center gap-2 px-3 py-2 bg-[#233648] border border-white/[0.08] rounded-lg text-[13px] text-gray-400 hover:text-white hover:border-white/[0.15] transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* TABLE / CARD LIST */}
      <div className="bg-[#233648] border border-white/[0.07] rounded-xl overflow-hidden shadow-sm">
        {/* Desktop Table Header */}
        <div className="hidden md:grid md:grid-cols-[2rem_1fr_80px_120px_120px_100px_140px_140px] gap-3 px-4 py-3 border-b border-white/[0.06] bg-black/10">
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={selected.size === pageItems.length && pageItems.length > 0}
              onChange={handleSelectAll}
              className="w-3.5 h-3.5 accent-[#4A9EFF] cursor-pointer"
            />
          </div>
          {['GUEST NAME', 'ROOM', 'CHECK-IN', 'CHECK-OUT', 'PAX', 'ID STATUS', 'SOURCE'].map(h => (
            <span key={h} className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{h}</span>
          ))}
        </div>

        {/* Rows / Cards */}
        {loading ? (
          <div className="divide-y divide-white/[0.04] animate-pulse">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="px-4 py-4.5 flex items-center gap-4">
                <div className="w-8 h-8 bg-white/5 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/4 bg-white/5 rounded" />
                  <div className="h-3 w-1/6 bg-white/5 rounded" />
                </div>
                <div className="hidden md:block w-24 h-4 bg-white/5 rounded" />
                <div className="hidden md:block w-24 h-4 bg-white/5 rounded" />
                <div className="w-20 h-6 bg-white/5 rounded-lg" />
              </div>
            ))}
          </div>
        ) : pageItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 bg-black/5">
             <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center">
                <Search className="w-5 h-5 text-gray-600" />
             </div>
            <p className="text-[13px] font-bold text-gray-500 uppercase tracking-widest">No guests matching your criteria</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {pageItems.map((guest: any) => (
              <div key={guest.id} className="group transition-all duration-200">
                {/* Desktop Row */}
                <Link
                  href={`/admin/guests/${guest.id}`}
                  className="hidden md:grid md:grid-cols-[2rem_1fr_80px_120px_120px_100px_140px_140px] gap-3 px-4 py-3.5 hover:bg-white/[0.03] cursor-pointer"
                >
                  <div className="flex items-center" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(guest.id)}
                      onChange={() => handleSelect(guest.id)}
                      className="w-3.5 h-3.5 accent-[#4A9EFF] cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={guest.name} size="sm" className="shadow-lg shadow-[#4A9EFF]/10" />
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold text-white truncate group-hover:text-blue-400 transition-colors">{guest.name}</p>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">+{guest.phone}</p>
                    </div>
                  </div>
                  <p className="flex items-center text-[13px] font-black text-white">{guest.roomNumber || '—'}</p>
                  <div className="flex flex-col justify-center">
                    <p className="text-[12px] font-bold text-white">{guest.checkIn ? format(new Date(guest.checkIn), 'MMM dd') : '—'}</p>
                    <p className="text-[10px] text-gray-500 font-semibold">{guest.checkIn ? format(new Date(guest.checkIn), 'yyyy') : ''}</p>
                  </div>
                  <div className="flex flex-col justify-center">
                    <p className="text-[12px] font-bold text-white">{guest.checkOut ? format(new Date(guest.checkOut), 'MMM dd') : '—'}</p>
                    <p className="text-[10px] text-gray-500 font-semibold">{guest.checkOut ? format(new Date(guest.checkOut), 'yyyy') : ''}</p>
                  </div>
                  <p className="flex items-center text-[11px] font-bold text-gray-300 uppercase letter-spacing-1">
                    {guest.guestCount || 1} PAX
                  </p>
                  <div className="flex items-center">
                    {guest.idVerified ? (
                      <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-lg border border-emerald-500/20">
                        Verified
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 text-amber-400 text-[10px] font-black uppercase tracking-widest rounded-lg border border-amber-500/20">
                        Pending
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-white/5 border border-white/10 flex items-center justify-center text-[8px] font-black text-gray-400">
                      {SOURCE_ICON[guest.source] || '?'}
                    </div>
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-tighter">{SOURCE_LABELS[guest.source] || guest.source}</span>
                  </div>
                </Link>

                {/* Mobile Card */}
                <Link 
                  href={`/admin/guests/${guest.id}`}
                  className="md:hidden p-4 space-y-3 active:bg-white/[0.05] transition-colors cursor-pointer relative block"
                >
                   {/* Top: Avatar + Name + Room */}
                   <div className="flex items-start justify-between">
                      <div className="flex gap-3">
                         <Avatar name={guest.name} size="md" className="shadow-xl shadow-[#4A9EFF]/20" />
                         <div>
                            <h3 className="text-[15px] font-bold text-white leading-none mb-1.5">{guest.name}</h3>
                            <div className="flex items-center gap-2">
                               <span className="text-[10px] font-bold text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded uppercase tracking-widest border border-blue-400/20">
                                  Room {guest.roomNumber || 'N/A'}
                               </span>
                               <span className="text-[10px] font-bold text-gray-500 tracking-tight">+{guest.phone}</span>
                            </div>
                         </div>
                      </div>
                      <div className="pt-1">
                          {guest.idVerified ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          ) : (
                            <Clock className="w-5 h-5 text-amber-500" />
                          )}
                      </div>
                   </div>

                   {/* Mid: Dates */}
                   <div className="grid grid-cols-2 gap-4 bg-black/10 rounded-xl p-3 border border-white/5">
                      <div>
                         <p className="text-[9px] font-bold text-gray-500 uppercase tracking-tighter mb-1">Check-in</p>
                         <p className="text-[12px] font-bold text-white">{guest.checkIn ? format(new Date(guest.checkIn), 'MMM dd, yyyy') : '—'}</p>
                      </div>
                      <div>
                         <p className="text-[9px] font-bold text-gray-500 uppercase tracking-tighter mb-1">Check-out</p>
                         <p className="text-[12px] font-bold text-white">{guest.checkOut ? format(new Date(guest.checkOut), 'MMM dd, yyyy') : '—'}</p>
                      </div>
                   </div>

                   {/* Btm: Source + PAX */}
                   <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2">
                         <div className="w-7 h-7 bg-white/5 rounded-lg flex items-center justify-center text-[10px] font-black text-gray-400 border border-white/10">
                            {SOURCE_ICON[guest.source] || '?'}
                         </div>
                         <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{SOURCE_LABELS[guest.source] || guest.source}</span>
                      </div>
                      <span className="text-[11px] font-black text-gray-300 uppercase tracking-widest">{guest.guestCount || 1} PAX</span>
                   </div>
                   
                   {/* Checkbox Overlay (Optional or absolute) */}
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* Pagination footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06]">
          <p className="text-[12px] text-gray-500">
            Showing <span className="font-semibold text-white">{(page - 1) * PAGE_SIZE + 1}</span> to{' '}
            <span className="font-semibold text-white">{Math.min(page * PAGE_SIZE, filtered.length)}</span> of{' '}
            <span className="font-semibold text-white">{filtered.length}</span> guests
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-[12px] font-medium text-gray-400 hover:text-white bg-[#182433] hover:bg-[#202e40] rounded-lg border border-white/[0.06] disabled:opacity-40 transition-colors"
            >
              Previous
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={cn(
                  'w-8 h-8 text-[12px] font-medium rounded-lg border transition-colors',
                  page === p
                    ? 'bg-[#4A9EFF] text-white border-[#4A9EFF]'
                    : 'text-gray-400 hover:text-white bg-[#182433] hover:bg-[#202e40] border-white/[0.06]'
                )}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-[12px] font-medium text-gray-400 hover:text-white bg-[#182433] hover:bg-[#202e40] rounded-lg border border-white/[0.06] disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ADD GUEST MODAL */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add New Guest" description="Create a new guest profile manually">
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Full Name" placeholder="Enter full name" value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })} required />
            <Input label="Phone" type="tel" placeholder="10-digit mobile" value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Email" type="email" placeholder="guest@example.com" value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })} />
            <Input label="DOB" type="date" value={form.dateOfBirth}
              style={{ colorScheme: 'dark' }}
              onChange={e => setForm({ ...form, dateOfBirth: e.target.value })} />
          </div>
          <Input label="Address" placeholder="Full address" value={form.address}
            onChange={e => setForm({ ...form, address: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="ID Type" value={form.idType}
              onChange={e => setForm({ ...form, idType: e.target.value })}
              options={[
                { value: '', label: 'Select ID type' },
                { value: 'AADHAAR', label: 'Aadhaar Card' },
                { value: 'PASSPORT', label: 'Passport' },
                { value: 'DRIVING_LICENSE', label: 'Driving License' },
                { value: 'VOTER_ID', label: 'Voter ID' },
              ]}
            />
            <Input label="ID Number" placeholder="Enter ID number" value={form.idNumber}
              onChange={e => setForm({ ...form, idNumber: e.target.value })} />
          </div>
          <div className="flex justify-end gap-3 mt-2">
            <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleAddGuest}>Add Guest</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default function GuestsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64 text-gray-500 animate-pulse">Loading guests...</div>
    }>
      <GuestsContent />
    </Suspense>
  )
}
