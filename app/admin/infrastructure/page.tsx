'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import {
    RefreshCw, AlertCircle, AlertTriangle, CheckCircle2,
    Loader2, Users, BedDouble, Bell, Clock,
    Wrench, CreditCard, MessageSquare, Database,
    ShieldCheck, Wifi, Activity, User
} from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { buildContextUrl as bcu, getAdminContext } from '@/lib/admin-context'
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer
} from 'recharts'

const STATUS_DOT: Record<string, string> = {
    Live: 'bg-emerald-400',
    'Not Configured': 'bg-slate-500',
    Offline: 'bg-red-400',
}
const STATUS_TEXT: Record<string, string> = {
    Live: 'text-emerald-400',
    'Not Configured': 'text-slate-400',
    Offline: 'text-red-400',
}
const GATEWAY_ICONS: Record<string, React.ElementType> = {
    Razorpay:       CreditCard,
    Twilio:         MessageSquare,
    Database:       Database,
    Authentication: ShieldCheck,
}

export default function InfrastructurePage() {
    const { data: session } = useSession()
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

    const fetchData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true)
        else setRefreshing(true)
        try {
            const res = await fetch(bcu('/api/admin/infrastructure'))
            if (res.ok) {
                const json = await res.json()
                setData(json?.data ?? json)
                setLastUpdated(new Date())
            }
        } catch {
            toast.error('Failed to load infrastructure data')
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [])

    useEffect(() => {
        fetchData()
        const interval = setInterval(() => fetchData(true), 30000)
        return () => clearInterval(interval)
    }, [fetchData])

    if (loading) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
    )

    if (!data) return null

    const { live, gateways, alerts, activityChart } = data

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Infrastructure Health</h1>
                    <p className="text-text-secondary text-sm mt-0.5">
                        Live status of hotel operations, staff, guests and integrations.
                        {lastUpdated && (
                            <span className="ml-2 text-text-tertiary">
                                Updated {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        )}
                    </p>
                </div>
                <button
                    onClick={() => fetchData(true)}
                    disabled={refreshing}
                    className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-50"
                >
                    {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    Refresh
                </button>
            </div>

            {/* Live KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    {
                        label: 'Staff On Duty',
                        value: live.staffOnDuty,
                        sub: live.staffOnDuty > 0 ? 'Currently clocked in' : 'No staff punched in',
                        icon: Users,
                        color: live.staffOnDuty > 0 ? 'text-emerald-400' : 'text-slate-400',
                        bg: live.staffOnDuty > 0 ? 'bg-emerald-500/10' : 'bg-slate-500/10',
                        dot: live.staffOnDuty > 0,
                    },
                    {
                        label: 'Guests In-House',
                        value: live.guestsInHouse,
                        sub: `${live.occupancyRate}% occupancy · ${live.totalRooms} rooms`,
                        icon: BedDouble,
                        color: live.occupancyRate > 70 ? 'text-blue-400' : 'text-amber-400',
                        bg: 'bg-blue-500/10',
                        dot: live.guestsInHouse > 0,
                    },
                    {
                        label: 'Service Requests',
                        value: live.pendingServices,
                        sub: live.slaBreaches > 0 ? `⚠ ${live.slaBreaches} SLA breach${live.slaBreaches > 1 ? 'es' : ''}` : 'All within SLA',
                        icon: Bell,
                        color: live.slaBreaches > 0 ? 'text-red-400' : live.pendingServices > 0 ? 'text-amber-400' : 'text-emerald-400',
                        bg: live.slaBreaches > 0 ? 'bg-red-500/10' : 'bg-amber-500/10',
                        dot: live.pendingServices > 0,
                    },
                    {
                        label: 'Rooms Status',
                        value: `${live.cleaningRooms + live.maintenanceRooms}`,
                        sub: `${live.cleaningRooms} cleaning · ${live.maintenanceRooms} maintenance`,
                        icon: Wrench,
                        color: live.maintenanceRooms > 0 ? 'text-amber-400' : 'text-slate-400',
                        bg: 'bg-slate-500/10',
                        dot: false,
                    },
                ].map((s, i) => (
                    <div key={i} className="bg-surface border border-border rounded-2xl p-5">
                        <div className="flex items-center justify-between mb-3">
                            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', s.bg)}>
                                <s.icon className={cn('w-4.5 h-4.5', s.color)} />
                            </div>
                            {s.dot && (
                                <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    LIVE
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-text-secondary mb-1">{s.label}</p>
                        <p className="text-2xl font-bold text-white">{s.value}</p>
                        <p className={cn('text-[11px] mt-1', s.color)}>{s.sub}</p>
                    </div>
                ))}
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Activity Chart */}
                <div className="lg:col-span-8 space-y-6">
                    <div className="bg-surface border border-border rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-5">
                            <div>
                                <h3 className="text-base font-semibold text-white">Booking Activity — Last 24 Hours</h3>
                                <p className="text-xs text-text-secondary mt-0.5">New bookings per 2-hour window</p>
                            </div>
                            <Activity className="w-4 h-4 text-text-tertiary" />
                        </div>
                        <ResponsiveContainer width="100%" height={180}>
                            <AreaChart data={activityChart} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                <defs>
                                    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                                <XAxis dataKey="time" tick={{ fill: '#6b7280', fontSize: 10 }} />
                                <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} allowDecimals={false} />
                                <Tooltip
                                    contentStyle={{ background: 'rgba(22, 27, 34, 0.95)', border: '1px solid #374151', borderRadius: 12, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
                                    itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: '600' }}
                                    labelStyle={{ color: '#9ca3af', marginBottom: '4px' }}
                                    formatter={(v: any) => [v, 'Bookings']}
                                />
                                <Area type="monotone" dataKey="bookings" stroke="#2563eb" strokeWidth={2} fill="url(#grad)" dot={false} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Staff On Duty */}
                    <div className="bg-surface border border-border rounded-2xl p-6">
                        <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                            <Users className="w-4 h-4 text-emerald-400" />
                            Staff On Duty
                            <span className="ml-auto text-xs font-normal text-text-secondary">{live.staffList.length} active</span>
                        </h3>
                        {live.staffList.length === 0 ? (
                            <p className="text-sm text-text-tertiary py-4 text-center">No staff currently clocked in</p>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {live.staffList.map((s: any, i: number) => (
                                    <div key={i} className="flex items-center gap-3 p-3 bg-surface-light border border-border rounded-xl">
                                        <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                                            <User className="w-4 h-4 text-emerald-400" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-white truncate">{s.name}</p>
                                            <p className="text-[11px] text-text-secondary">{s.department.replace('_', ' ')} · since {s.punchIn}</p>
                                        </div>
                                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Active Service Requests */}
                    {live.activeServices.length > 0 && (
                        <div className="bg-surface border border-border rounded-2xl p-6">
                            <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                                <Bell className="w-4 h-4 text-amber-400" />
                                Active Service Requests
                                <span className="ml-auto text-xs font-normal text-text-secondary">{live.activeServices.length} open</span>
                            </h3>
                            <div className="space-y-2">
                                {live.activeServices.map((s: any, i: number) => (
                                    <div key={i} className={cn(
                                        'flex items-center justify-between p-3 rounded-xl border',
                                        s.age > 60 ? 'bg-red-500/5 border-red-500/20' : 'bg-surface-light border-border'
                                    )}>
                                        <div>
                                            <p className="text-sm font-semibold text-white">{s.title}</p>
                                            <p className="text-[11px] text-text-secondary mt-0.5">
                                                Room {s.room} · {s.type.replace('_', ' ')} ·
                                                {s.assignedTo ? ` Assigned to ${s.assignedTo}` : ' Unassigned'}
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0 ml-3">
                                            <span className={cn(
                                                'text-[10px] font-bold px-2 py-0.5 rounded-full border',
                                                s.age > 60
                                                    ? 'bg-red-500/10 border-red-500/20 text-red-400'
                                                    : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                                            )}>
                                                {s.age}m ago
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column */}
                <div className="lg:col-span-4 space-y-6">
                    {/* Alerts */}
                    <div className="bg-surface border border-border rounded-2xl p-6">
                        <h3 className="text-base font-semibold text-white mb-4">Live Alerts</h3>
                        <div className="space-y-4">
                            {alerts.map((a: any, i: number) => (
                                <div key={i} className="flex gap-3">
                                    <div className={cn(
                                        'w-8 h-8 rounded-full flex items-center justify-center shrink-0 border',
                                        a.type === 'CRITICAL' ? 'border-red-500/20 bg-red-500/10 text-red-400' :
                                        a.type === 'WARNING'  ? 'border-amber-500/20 bg-amber-500/10 text-amber-400' :
                                                                'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                                    )}>
                                        {a.type === 'CRITICAL' ? <AlertCircle className="w-4 h-4" /> :
                                         a.type === 'WARNING'  ? <AlertTriangle className="w-4 h-4" /> :
                                                                 <CheckCircle2 className="w-4 h-4" />}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-white leading-tight">{a.message}</p>
                                        <p className="text-[11px] text-text-secondary mt-0.5 line-clamp-2">{a.description}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] text-text-tertiary">{a.time}</span>
                                            <span className="w-1 h-1 rounded-full bg-border" />
                                            <span className="text-[10px] text-text-tertiary">{a.category}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Integrations / Gateways */}
                    <div className="bg-surface border border-border rounded-2xl p-6">
                        <h3 className="text-base font-semibold text-white mb-4">Integrations</h3>
                        <div className="space-y-3">
                            {gateways.map((g: any, i: number) => {
                                const Icon = GATEWAY_ICONS[g.name] ?? Wifi
                                return (
                                    <div key={i} className="flex items-center gap-3 p-3 bg-surface-light border border-border rounded-xl">
                                        <div className="w-9 h-9 rounded-xl bg-surface border border-border flex items-center justify-center shrink-0">
                                            <Icon className="w-4 h-4 text-text-secondary" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-white">{g.name}</p>
                                            <p className="text-[11px] text-text-tertiary truncate">{g.detail}</p>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <span className={cn('w-2 h-2 rounded-full', STATUS_DOT[g.status] ?? 'bg-slate-500')} />
                                            <span className={cn('text-[10px] font-bold', STATUS_TEXT[g.status] ?? 'text-slate-400')}>
                                                {g.status}
                                            </span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Guests In-House */}
                    {live.guestList.length > 0 && (
                        <div className="bg-surface border border-border rounded-2xl p-6">
                            <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                                <BedDouble className="w-4 h-4 text-blue-400" />
                                Guests In-House
                                <span className="ml-auto text-xs font-normal text-text-secondary">{live.guestsInHouse} total</span>
                            </h3>
                            <div className="space-y-2">
                                {live.guestList.slice(0, 6).map((g: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-[10px] font-bold text-blue-400">
                                                {g.name.charAt(0)}
                                            </div>
                                            <span className="text-white font-medium truncate max-w-[120px]">{g.name}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xs text-text-secondary">Room {g.room}</span>
                                            <span className="text-[10px] text-text-tertiary ml-2">out {g.checkOut}</span>
                                        </div>
                                    </div>
                                ))}
                                {live.guestsInHouse > 6 && (
                                    <p className="text-xs text-text-tertiary text-center pt-1">+{live.guestsInHouse - 6} more guests</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Today's Schedule */}
                    <div className="bg-surface border border-border rounded-2xl p-6">
                        <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-text-secondary" />
                            Today&apos;s Schedule
                        </h3>
                        <div className="space-y-3">
                            {[
                                { label: 'Expected Arrivals', value: live.todayArrivals, color: 'text-emerald-400', icon: '→' },
                                { label: 'Expected Departures', value: live.todayDepartures, color: 'text-amber-400', icon: '←' },
                                { label: 'Rooms Cleaning', value: live.cleaningRooms, color: 'text-blue-400', icon: '⟳' },
                                { label: 'Under Maintenance', value: live.maintenanceRooms, color: 'text-red-400', icon: '⚠' },
                            ].map((item, i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <span className="text-sm text-text-secondary">{item.label}</span>
                                    <span className={cn('text-sm font-bold', item.color)}>
                                        {item.icon} {item.value}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
