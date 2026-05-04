'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import {
    ChevronLeft, ChevronRight,
    CheckCircle2, XCircle, Clock,
    ArrowUpRight, ArrowDownRight,
    CalendarDays, Loader2, Calendar,
    AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, isSameMonth } from 'date-fns'
import {
    AreaChart, Area, XAxis, CartesianGrid,
    Tooltip, ResponsiveContainer
} from 'recharts'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const PAGE_SIZE = 10

export default function AttendancePage() {
    const router = useRouter()
    const [page, setPage] = useState(1)
    const [filterMonth, setFilterMonth] = useState<string>('') // 'YYYY-MM' or ''

    const { data: attRaw, isValidating: loading } = useSWR('/api/staff/attendance', fetcher, {
        revalidateOnFocus: true,
        dedupingInterval: 5000,
    })

    const { data: meRaw } = useSWR('/api/staff/me', fetcher, {
        revalidateOnFocus: false,
        dedupingInterval: 30000,
    })

    const allRecords: any[] = Array.isArray(attRaw) ? attRaw : []
    const staffInfo = meRaw?.profile || null

    // ── Filter by selected month ──────────────────────────────────────────────
    const filtered = useMemo(() => {
        if (!filterMonth) return allRecords
        return allRecords.filter(r => {
            const d = new Date(r.date)
            return format(d, 'yyyy-MM') === filterMonth
        })
    }, [allRecords, filterMonth])

    // ── Stats (on filtered set) ───────────────────────────────────────────────
    const stats = useMemo(() => ({
        present: filtered.filter(a => a.status === 'PRESENT').length,
        late:    filtered.filter(a => a.status === 'LATE').length,
        absent:  filtered.filter(a => a.status === 'ABSENT').length,
        totalHours: filtered.reduce((sum, a) => {
            if (a.hours && a.hours !== '-') {
                return sum + parseFloat(a.hours)
            }
            return sum
        }, 0),
    }), [filtered])

    // ── Chart: last 7 records (reversed = oldest first) ──────────────────────
    const chartData = useMemo(() => {
        return [...allRecords].slice(0, 7).reverse().map(item => ({
            name: format(new Date(item.date), 'dd MMM'),
            hours: item.hours !== '-' ? parseFloat(item.hours) : 0,
        }))
    }, [allRecords])

    // ── Pagination ────────────────────────────────────────────────────────────
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

    // Available months for filter dropdown
    const availableMonths = useMemo(() => {
        const months = new Set(allRecords.map(r => format(new Date(r.date), 'yyyy-MM')))
        return Array.from(months).sort().reverse()
    }, [allRecords])

    // Reset page when filter changes
    const handleMonthChange = (m: string) => {
        setFilterMonth(m)
        setPage(1)
    }

    // ── Loading skeleton ──────────────────────────────────────────────────────
    if (!attRaw && loading) return (
        <div className="space-y-6 animate-pulse px-1 pb-16">
            <div className="flex justify-between items-center">
                <div className="h-10 w-10 bg-white/5 rounded-xl" />
                <div className="h-6 w-40 bg-white/5 rounded-xl" />
                <div className="w-10" />
            </div>
            <div className="h-48 w-full bg-white/5 rounded-3xl" />
            <div className="grid grid-cols-3 gap-3">
                {[1,2,3].map(i => <div key={i} className="h-24 bg-white/5 rounded-3xl" />)}
            </div>
            {[1,2,3,4].map(i => <div key={i} className="h-20 bg-white/5 rounded-2xl" />)}
        </div>
    )

    return (
        <div className="space-y-6 animate-fade-in pb-20">

            {/* ── Header ── */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => router.back()}
                    className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-gray-400 hover:text-white transition-all active:scale-95"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="text-center">
                    <h1 className="text-xl font-black text-white tracking-tight">My Attendance</h1>
                    <p className="text-[10px] font-semibold text-blue-500 uppercase tracking-widest mt-0.5">
                        {staffInfo?.user?.name || 'Staff'} · {format(new Date(), 'MMMM yyyy')}
                    </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center">
                    <CalendarDays className="w-5 h-5 text-blue-500" />
                </div>
            </div>

            {/* ── Hours Chart ── */}
            {chartData.length > 0 && (
                <div className="bg-[#161b22] border border-white/[0.05] rounded-3xl p-5">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-sm font-bold text-white">Hours Worked</p>
                            <p className="text-[10px] text-gray-500 mt-0.5">Last 7 sessions</p>
                        </div>
                        <div className="text-right">
                            <p className="text-lg font-black text-white">{stats.totalHours.toFixed(1)}h</p>
                            <p className="text-[10px] text-gray-500">
                                {filterMonth ? format(new Date(filterMonth + '-01'), 'MMM yyyy') : 'All time'}
                            </p>
                        </div>
                    </div>
                    <div className="h-[140px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="hoursGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff06" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    stroke="#4b5563"
                                    fontSize={9}
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ dy: 8 }}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#161b22', border: '1px solid #ffffff10', borderRadius: '12px', fontSize: '11px' }}
                                    formatter={(v: any) => [`${v}h`, 'Hours']}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="hours"
                                    stroke="#3b82f6"
                                    strokeWidth={2.5}
                                    fill="url(#hoursGrad)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* ── Stats ── */}
            <div className="grid grid-cols-3 gap-3">
                {[
                    { label: 'Present', value: stats.present, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                    { label: 'Late',    value: stats.late,    icon: Clock,        color: 'text-amber-400',  bg: 'bg-amber-500/10'  },
                    { label: 'Absent',  value: stats.absent,  icon: XCircle,      color: 'text-rose-400',   bg: 'bg-rose-500/10'   },
                ].map((s, i) => (
                    <div key={i} className="bg-[#161b22] border border-white/[0.05] p-4 rounded-3xl text-center">
                        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-2', s.bg)}>
                            <s.icon className={cn('w-4 h-4', s.color)} />
                        </div>
                        <p className="text-2xl font-black text-white">{s.value}</p>
                        <p className="text-[9px] font-bold text-gray-600 uppercase tracking-wider mt-0.5">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* ── Filter + Pagination header ── */}
            <div className="flex items-center justify-between gap-3">
                <select
                    value={filterMonth}
                    onChange={e => handleMonthChange(e.target.value)}
                    className="flex-1 bg-[#161b22] border border-white/[0.06] rounded-2xl px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500/40 [color-scheme:dark] appearance-none"
                >
                    <option value="">All months</option>
                    {availableMonths.map(m => (
                        <option key={m} value={m}>
                            {format(new Date(m + '-01'), 'MMMM yyyy')}
                        </option>
                    ))}
                </select>
                <p className="text-xs text-gray-500 shrink-0 font-medium">
                    {filtered.length} record{filtered.length !== 1 ? 's' : ''}
                </p>
            </div>

            {/* ── Records List ── */}
            <div className="space-y-3">
                {paginated.length === 0 ? (
                    <div className="py-16 text-center bg-[#161b22] rounded-3xl border border-dashed border-white/5">
                        <Calendar className="w-10 h-10 text-gray-800 mx-auto mb-3" />
                        <p className="text-sm text-gray-600 font-medium">No records found</p>
                        {filterMonth && (
                            <button
                                onClick={() => handleMonthChange('')}
                                className="mt-3 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                            >
                                Clear filter
                            </button>
                        )}
                    </div>
                ) : (
                    paginated.map((item) => {
                        const checkIn  = item.checkIn  ? format(new Date(item.checkIn),  'HH:mm') : null
                        const checkOut = item.checkOut ? format(new Date(item.checkOut), 'HH:mm') : null

                        const statusColor = ({
                            PRESENT:  { stripe: 'bg-emerald-500', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
                            LATE:     { stripe: 'bg-amber-500',   badge: 'bg-amber-500/10  text-amber-400  border-amber-500/20'  },
                            ABSENT:   { stripe: 'bg-rose-500',    badge: 'bg-rose-500/10   text-rose-400   border-rose-500/20'   },
                            ON_LEAVE: { stripe: 'bg-blue-500',    badge: 'bg-blue-500/10   text-blue-400   border-blue-500/20'   },
                            HALF_DAY: { stripe: 'bg-purple-500',  badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
                        } as Record<string, { stripe: string; badge: string }>)[item.status] ?? { stripe: 'bg-gray-600', badge: 'bg-white/5 text-gray-400 border-white/10' }

                        return (
                            <div
                                key={item.id}
                                className="bg-[#161b22] border border-white/[0.05] rounded-2xl flex items-center gap-4 overflow-hidden"
                            >
                                {/* Status stripe */}
                                <div className={cn('w-1 self-stretch shrink-0', statusColor.stripe)} />

                                <div className="flex-1 py-4 pr-4 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <p className="text-sm font-bold text-white">
                                                {format(new Date(item.date), 'EEE, dd MMM yyyy')}
                                            </p>
                                            {/* Punch times */}
                                            <div className="flex items-center gap-3 mt-1.5">
                                                <div className="flex items-center gap-1">
                                                    <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                                                    <span className="text-xs text-gray-400 font-medium">
                                                        {checkIn ?? '—'}
                                                    </span>
                                                </div>
                                                <span className="text-gray-700">·</span>
                                                <div className="flex items-center gap-1">
                                                    <ArrowDownRight className="w-3 h-3 text-rose-400" />
                                                    <span className={cn('text-xs font-medium', checkOut ? 'text-gray-400' : 'text-amber-400')}>
                                                        {checkOut ?? 'Active'}
                                                    </span>
                                                </div>
                                                {item.hours && item.hours !== '-' && (
                                                    <>
                                                        <span className="text-gray-700">·</span>
                                                        <span className="text-xs text-gray-500">{item.hours}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <span className={cn(
                                            'text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border shrink-0',
                                            statusColor.badge
                                        )}>
                                            {item.status.replace('_', ' ')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            {/* ── Pagination ── */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-[#161b22] border border-white/[0.06] rounded-2xl text-xs font-semibold text-gray-400 hover:text-white disabled:opacity-30 transition-all active:scale-95"
                    >
                        <ChevronLeft className="w-4 h-4" /> Previous
                    </button>

                    {/* Page numbers */}
                    <div className="flex items-center gap-1.5">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                            <button
                                key={p}
                                onClick={() => setPage(p)}
                                className={cn(
                                    'w-8 h-8 rounded-xl text-xs font-bold transition-all',
                                    p === page
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                                        : 'bg-white/[0.03] text-gray-500 hover:text-white hover:bg-white/[0.06]'
                                )}
                            >
                                {p}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-[#161b22] border border-white/[0.06] rounded-2xl text-xs font-semibold text-gray-400 hover:text-white disabled:opacity-30 transition-all active:scale-95"
                    >
                        Next <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* ── Upcoming schedule note ── */}
            {staffInfo?.workShift && (
                <div className="bg-[#161b22] border border-white/[0.05] rounded-3xl p-5 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center shrink-0">
                        <AlertCircle className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-white">Your Shift</p>
                        <p className="text-xs text-gray-400 mt-0.5">{staffInfo.workShift}</p>
                        <p className="text-[10px] text-gray-600 mt-1">
                            Department: {staffInfo.department?.replace('_', ' ') || '—'}
                        </p>
                    </div>
                </div>
            )}
        </div>
    )
}
