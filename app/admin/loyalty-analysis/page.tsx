'use client'

import { useState, useMemo } from 'react'
import useSWR from 'swr'
import { formatCurrency } from '@/lib/utils'
import {
    Loader2, Users, IndianRupee, Award, Download,
    Calendar, Search, User, MoreHorizontal, CreditCard,
    Info, RefreshCw, TrendingUp, AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { buildContextUrl } from '@/lib/admin-context'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'

const PIE_COLORS = ['#2563eb', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

const TIER_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
    PLATINUM: { color: 'text-cyan-400',   bg: 'bg-cyan-400/10',   border: 'border-cyan-400/20' },
    GOLD:     { color: 'text-amber-400',  bg: 'bg-amber-400/10',  border: 'border-amber-400/20' },
    SILVER:   { color: 'text-slate-400',  bg: 'bg-slate-400/10',  border: 'border-slate-400/20' },
    BRONZE:   { color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/20' },
}

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function LoyaltyAnalysisPage() {
    const { data: session } = useSession()
    const [search, setSearch] = useState('')
    const [showFormula, setShowFormula] = useState(false)
    const [exporting, setExporting] = useState(false)

    const apiUrl = buildContextUrl('/api/admin/analytics/loyalty')
    const { data: raw, error, isLoading, mutate } = useSWR(apiUrl, fetcher)
    const loyaltyData = raw?.data ?? raw

    const filteredGuests = useMemo(() => {
        if (!loyaltyData?.topGuests) return []
        if (!search.trim()) return loyaltyData.topGuests
        const q = search.toLowerCase()
        return loyaltyData.topGuests.filter((g: any) =>
            g.name.toLowerCase().includes(q) || (g.email || '').toLowerCase().includes(q)
        )
    }, [loyaltyData?.topGuests, search])

    if (error) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
            <AlertCircle className="w-12 h-12 text-red-500 opacity-50" />
            <p className="text-text-secondary font-medium">Failed to load loyalty analytics</p>
            <button onClick={() => mutate()} className="text-primary text-sm font-bold hover:underline">Try again</button>
        </div>
    )

    if (isLoading) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
    )

    const handleExport = async () => {
        if (!loyaltyData) return
        setExporting(true)
        try {
            const jsPDF = (await import('jspdf')).default
            const autoTable = (await import('jspdf-autotable')).default
            const doc = new jsPDF()

            // Header
            doc.setFillColor(22, 27, 34)
            doc.rect(0, 0, 210, 28, 'F')
            doc.setTextColor(255, 255, 255)
            doc.setFontSize(16)
            doc.setFont('helvetica', 'bold')
            doc.text('Guest Loyalty & Retention Report', 14, 13)
            doc.setFontSize(9)
            doc.setFont('helvetica', 'normal')
            doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 14, 21)

            const { stats, topGuests, bookingSources } = loyaltyData

            // KPIs
            let y = 36
            autoTable(doc, {
                startY: y,
                head: [['Metric', 'Value']],
                body: [
                    ['Repeat Guest Rate', `${stats.repeatRate}%`],
                    ['Repeat Guest Count', stats.repeatGuestCount.toString()],
                    ['Loyalty Revenue', formatCurrency(stats.loyaltyRevenue)],
                    ['Loyalty Revenue %', `${stats.loyaltyRevenuePercent}% of total`],
                    ['Avg. Lifetime Value', formatCurrency(stats.avgLTV)],
                    ['Total Guests', stats.totalGuests.toString()],
                ],
                theme: 'striped',
                headStyles: { fillColor: [37, 99, 235] },
                styles: { fontSize: 9 },
            })

            // Loyalty Formula
            y = (doc as any).lastAutoTable.finalY + 10
            doc.setFontSize(10)
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(33, 33, 33)
            doc.text('Loyalty Tier Formula', 14, y)
            y += 5
            doc.setFontSize(8)
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(80, 80, 80)
            const formulaLines = [
                'PLATINUM: Total Spent > ₹50,000 OR Total Stays > 10',
                'GOLD:     Total Spent > ₹20,000 OR Total Stays > 5',
                'SILVER:   Total Spent > ₹10,000 OR Total Stays > 2',
                'BRONZE:   All other guests with at least 1 booking',
                '',
                'Repeat Rate = (Guests with 2+ stays / Total Guests) × 100',
                'Avg LTV = Total Revenue from all bookings / Total Unique Guests',
                'Loyalty Revenue = Revenue from guests with 2+ stays',
            ]
            formulaLines.forEach(line => {
                doc.text(line, 14, y)
                y += 5
            })

            // Top Guests
            y += 5
            doc.setFontSize(11)
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(33, 33, 33)
            doc.text('Top Loyal Guests', 14, y)
            y += 4

            autoTable(doc, {
                startY: y,
                head: [['Guest', 'Email', 'Stays', 'Total Spent', 'Last Visit', 'Tier']],
                body: topGuests.map((g: any) => [
                    g.name, g.email, g.stays.toString(),
                    formatCurrency(g.spent),
                    new Date(g.lastVisit).toLocaleDateString('en-IN'),
                    g.tier,
                ]),
                theme: 'grid',
                headStyles: { fillColor: [37, 99, 235] },
                styles: { fontSize: 8 },
            })

            // Booking Sources
            if (bookingSources?.length > 0) {
                y = (doc as any).lastAutoTable.finalY + 10
                doc.setFontSize(11)
                doc.setFont('helvetica', 'bold')
                doc.text('Booking Sources', 14, y)
                y += 4
                autoTable(doc, {
                    startY: y,
                    head: [['Source', 'Share %', 'Count']],
                    body: bookingSources.map((s: any) => [s.label, `${s.value}%`, s.count.toString()]),
                    theme: 'striped',
                    headStyles: { fillColor: [34, 197, 94] },
                    styles: { fontSize: 9 },
                })
            }

            doc.save(`Loyalty_Report_${new Date().toISOString().split('T')[0]}.pdf`)
            toast.success('PDF exported successfully')
        } catch (err) {
            console.error(err)
            toast.error('Export failed')
        } finally {
            setExporting(false) }
    }




    if (!loyaltyData || loyaltyData.error || !loyaltyData.stats) return (
        <div className="space-y-6 animate-fade-in">
             <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Guest Loyalty & Retention</h1>
                    <p className="text-text-secondary text-sm mt-0.5">Insights into repeat visitor behaviour and lifetime value.</p>
                </div>
            </div>

            <div className="flex flex-col items-center justify-center min-h-[400px] bg-surface border border-dashed border-border rounded-[45px] p-12 text-center space-y-6">
                <div className="w-24 h-24 bg-primary/5 rounded-[40px] flex items-center justify-center border border-primary/10 relative">
                    <Award className="w-10 h-10 text-primary opacity-20" />
                    <div className="absolute inset-0 bg-primary/5 blur-2xl animate-pulse"></div>
                </div>
                <div className="max-w-xs space-y-2">
                    <h3 className="text-lg font-bold text-white uppercase tracking-tight">Intelligence Pending</h3>
                    <p className="text-xs font-medium text-text-tertiary leading-relaxed uppercase tracking-widest">
                        The loyalty analysis engine is initialized and ready. Once you record your first bookings, visitor patterns and lifetime value metrics will synchronize here.
                    </p>
                </div>
                <button 
                    onClick={() => mutate()}
                    className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-white transition-all active:scale-95"
                >
                    <RefreshCw className="w-4 h-4" /> Sync Now
                </button>
            </div>
        </div>
    )

    const { stats, chartData, bookingSources } = loyaltyData

    if (stats.totalGuests === 0) {
        // ... (This part is already handled by the check above, but keeping it for structure)
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Guest Loyalty & Retention</h1>
                    <p className="text-text-secondary text-sm mt-0.5">Insights into repeat visitor behaviour and lifetime value.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowFormula(v => !v)}
                        className="flex items-center gap-2 px-3 py-2 bg-surface-light border border-border rounded-xl text-xs font-semibold text-text-secondary hover:text-white transition-all"
                    >
                        <Info className="w-4 h-4" /> How tiers work
                    </button>
                    <button onClick={() => mutate()} className="p-2 bg-surface-light border border-border rounded-xl text-text-secondary hover:text-white transition-all" title="Refresh">
                        <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                        onClick={handleExport}
                        disabled={exporting}
                        className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-50"
                    >
                        {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        Export PDF
                    </button>
                </div>
            </div>

            {/* Loyalty Formula Panel */}
            {showFormula && (
                <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 space-y-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Info className="w-4 h-4 text-primary" /> How Loyalty Tiers Are Calculated
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-text-secondary">
                        <div className="space-y-2">
                            <p className="font-semibold text-white">Tier Classification</p>
                            <div className="space-y-1.5">
                                {[
                                    { tier: 'PLATINUM', rule: 'Total Spent > ₹50,000  OR  Stays > 10', color: 'text-cyan-400' },
                                    { tier: 'GOLD',     rule: 'Total Spent > ₹20,000  OR  Stays > 5',  color: 'text-amber-400' },
                                    { tier: 'SILVER',   rule: 'Total Spent > ₹10,000  OR  Stays > 2',  color: 'text-slate-400' },
                                    { tier: 'BRONZE',   rule: 'All other guests with ≥ 1 booking',      color: 'text-orange-400' },
                                ].map(t => (
                                    <div key={t.tier} className="flex items-start gap-2">
                                        <span className={cn('font-bold w-16 shrink-0', t.color)}>{t.tier}</span>
                                        <span>{t.rule}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <p className="font-semibold text-white">Key Metrics Formulas</p>
                            <div className="space-y-1.5 font-mono text-[11px]">
                                <p><span className="text-primary">Repeat Rate</span> = (Guests with 2+ stays ÷ Total Guests) × 100</p>
                                <p><span className="text-primary">Avg LTV</span> = Total Revenue ÷ Total Unique Guests</p>
                                <p><span className="text-primary">Loyalty Revenue</span> = Revenue from guests with 2+ stays</p>
                                <p><span className="text-primary">Loyalty Rev %</span> = Loyalty Revenue ÷ Total Revenue × 100</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Repeat Guest Rate', value: `${stats.repeatRate}%`, sub: `${stats.repeatGuestCount} repeat guests`, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                    { label: 'Loyalty Revenue', value: formatCurrency(stats.loyaltyRevenue), sub: `${stats.loyaltyRevenuePercent}% of total revenue`, icon: IndianRupee, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                    { label: 'Avg. Lifetime Value', value: formatCurrency(stats.avgLTV), sub: 'Per unique guest', icon: CreditCard, color: 'text-purple-400', bg: 'bg-purple-500/10' },
                    { label: 'Total Guests', value: stats.totalGuests.toLocaleString(), sub: 'Unique profiles', icon: Award, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                ].map((s, i) => (
                    <div key={i} className="bg-surface border border-border rounded-2xl p-5">
                        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-3', s.bg)}>
                            <s.icon className={cn('w-4.5 h-4.5', s.color)} />
                        </div>
                        <p className="text-xs text-text-secondary mb-1">{s.label}</p>
                        <p className="text-xl font-bold text-white">{s.value}</p>
                        <p className="text-[11px] text-text-tertiary mt-0.5">{s.sub}</p>
                    </div>
                ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* First-time vs Repeat Visitors Bar Chart */}
                <div className="lg:col-span-8 bg-surface border border-border rounded-2xl p-6">
                    <h3 className="text-base font-semibold text-white mb-1">First-time vs. Repeat Visitors</h3>
                    <p className="text-xs text-text-secondary mb-5">Monthly breakdown over the last 6 months</p>
                    {chartData.every((d: any) => d.repeat === 0 && d.firstTime === 0) ? (
                        <div className="h-64 flex items-center justify-center text-text-tertiary text-sm">
                            No booking data available yet
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                                <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} />
                                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} allowDecimals={false} />
                                <Tooltip
                                    contentStyle={{ background: 'rgba(22, 27, 34, 0.95)', border: '1px solid #374151', borderRadius: 12, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
                                    itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: '600' }}
                                    labelStyle={{ color: '#9ca3af', marginBottom: '4px' }}
                                    formatter={(v: any, name: string) => [v, name === 'repeat' ? 'Repeat Visitors' : 'First-time Visitors']}
                                />
                                <Legend
                                    formatter={(v) => v === 'repeat' ? 'Repeat Visitors' : 'First-time Visitors'}
                                    wrapperStyle={{ fontSize: 11, color: '#9ca3af' }}
                                />
                                <Bar dataKey="repeat" fill="#2563eb" radius={[3, 3, 0, 0]} name="repeat" />
                                <Bar dataKey="firstTime" fill="#374151" radius={[3, 3, 0, 0]} name="firstTime" />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Booking Source Pie Chart — REAL DATA */}
                <div className="lg:col-span-4 bg-surface border border-border rounded-2xl p-6 flex flex-col">
                    <h3 className="text-base font-semibold text-white mb-1">Booking Source</h3>
                    <p className="text-xs text-text-secondary mb-4">Where your guests come from</p>
                    {!bookingSources || bookingSources.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center text-text-tertiary text-sm">
                            No booking source data
                        </div>
                    ) : (
                        <div className="flex-1">
                            <ResponsiveContainer width="100%" height={180}>
                                <PieChart>
                                    <Pie
                                        data={bookingSources}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={80}
                                        paddingAngle={3}
                                        dataKey="value"
                                        nameKey="label"
                                    >
                                        {bookingSources.map((_: any, i: number) => (
                                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ background: 'rgba(22, 27, 34, 0.95)', border: '1px solid #374151', borderRadius: 12, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
                                        itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: '600' }}
                                        labelStyle={{ color: '#9ca3af', marginBottom: '4px' }}
                                        formatter={(v: any, name: string) => [`${v}%`, name]}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="space-y-2 mt-2">
                                {bookingSources.map((s: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                                            <span className="text-text-secondary capitalize">{s.label.toLowerCase().replace(/_/g, ' ')}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-text-tertiary text-[10px]">{s.count}</span>
                                            <span className="font-semibold text-white w-8 text-right">{s.value}%</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Top Loyal Guests Table */}
            <div className="bg-surface border border-border rounded-2xl overflow-hidden">
                <div className="p-5 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-base font-semibold text-white">Top Loyal Guests</h3>
                        <p className="text-xs text-text-secondary mt-0.5">Ranked by total lifetime spend at this property</p>
                    </div>
                    <div className="relative w-full md:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search by name or email..."
                            className="w-full pl-9 pr-4 py-2 bg-surface-light border border-border rounded-xl text-sm text-white placeholder:text-text-tertiary focus:ring-1 focus:ring-primary outline-none"
                        />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-border bg-surface-light">
                                <th className="px-5 py-3 text-[10px] font-bold text-text-tertiary uppercase tracking-wider">Guest</th>
                                <th className="px-5 py-3 text-[10px] font-bold text-text-tertiary uppercase tracking-wider">Total Stays</th>
                                <th className="px-5 py-3 text-[10px] font-bold text-text-tertiary uppercase tracking-wider">Total Spent</th>
                                <th className="px-5 py-3 text-[10px] font-bold text-text-tertiary uppercase tracking-wider">Last Visit</th>
                                <th className="px-5 py-3 text-[10px] font-bold text-text-tertiary uppercase tracking-wider">Loyalty Tier</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredGuests.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-5 py-10 text-center text-text-tertiary text-sm">
                                        {search ? 'No guests match your search' : 'No guest data available'}
                                    </td>
                                </tr>
                            ) : filteredGuests.map((guest: any, i: number) => {
                                const tc = TIER_CONFIG[guest.tier] ?? TIER_CONFIG.BRONZE
                                return (
                                    <tr key={i} className="hover:bg-surface-light transition-colors">
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-surface-light border border-border flex items-center justify-center shrink-0">
                                                    <User className="w-4 h-4 text-text-tertiary" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-white">{guest.name}</p>
                                                    <p className="text-[11px] text-text-tertiary">{guest.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-sm text-text-secondary">{guest.stays} stays</td>
                                        <td className="px-5 py-4 text-sm font-semibold text-white">{formatCurrency(guest.spent)}</td>
                                        <td className="px-5 py-4 text-sm text-text-secondary">
                                            {new Date(guest.lastVisit).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className={cn('text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider', tc.color, tc.bg, tc.border)}>
                                                {guest.tier}
                                            </span>
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
