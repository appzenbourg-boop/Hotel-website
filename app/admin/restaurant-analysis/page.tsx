'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import useSWR from 'swr'
import { formatCurrency } from '@/lib/utils'
import { 
    Loader2, Calendar, Download, TrendingUp, Users, Clock, 
    ArrowDownRight, MoreHorizontal, Star, AlertCircle, Search, 
    Check, X, BarChart3, UtensilsCrossed, RefreshCw, IndianRupee,
    ShoppingBag, BedDouble, ReceiptText
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { buildContextUrl } from '@/lib/admin-context'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts'

const PIE_COLORS = ['#2563eb', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function RestaurantAnalysisPage() {
    const [timeRange, setTimeRange] = useState('Current Month')
    const [activeTab, setActiveTab] = useState('All Day')
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editingValue, setEditingValue] = useState('')
    const [exporting, setExporting] = useState(false)

    const rangeMap: Record<string, string> = {
        'Current Month': 'month',
        'Last Month': 'lastMonth',
        '90 Days': 'quarter',
        'This Year': 'year',
        'All Time': 'all'
    }

    const apiUrl = typeof window !== 'undefined'
        ? buildContextUrl(`/api/admin/analytics/restaurant`, {
            tab: activeTab,
            range: rangeMap[timeRange]
        })
        : `/api/admin/analytics/restaurant?tab=${activeTab}&range=${rangeMap[timeRange]}`

    const { data: raw, error, isLoading, mutate: revalidate } = useSWR(apiUrl, fetcher, { refreshInterval: 15000 })
    const analysisData = raw?.data ?? raw

    // 1. Handle Hard Error (Network/Auth)
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <AlertCircle className="w-12 h-12 text-red-500 opacity-50" />
                <p className="text-text-secondary font-medium">Failed to connect to restaurant analytics engine</p>
                <button onClick={() => revalidate()} className="text-primary text-sm font-bold hover:underline">
                    Try Again
                </button>
            </div>
        )
    }

    // 2. Handle Loading State
    if (isLoading && !analysisData) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        )
    }

    // 3. Handle API Error or Empty Stats (Empty state)
    const apiError = analysisData?.error
    const hasStats = analysisData?.stats

    if (apiError || !hasStats) {
        return (
            <div className="space-y-6 animate-fade-in">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-text-primary">Restaurant Sales & POS Analysis</h1>
                        <p className="text-text-secondary text-sm mt-0.5">Comprehensive analytics covering POS orders, dine-in tables, takeaway, and menu popularity.</p>
                    </div>
                </div>

                <div className="flex flex-col items-center justify-center min-h-[400px] bg-surface border border-dashed border-border rounded-[45px] p-12 text-center space-y-6">
                    <div className="w-24 h-24 bg-primary/5 rounded-[40px] flex items-center justify-center border border-primary/10 relative">
                        <UtensilsCrossed className="w-10 h-10 text-primary opacity-20" />
                        <div className="absolute inset-0 bg-primary/5 blur-2xl animate-pulse"></div>
                    </div>
                    <div className="max-w-xs space-y-2">
                        <h3 className="text-lg font-bold text-text-primary uppercase tracking-tight">Data Accumulating</h3>
                        <p className="text-xs font-medium text-text-tertiary leading-relaxed uppercase tracking-widest">
                            {apiError ? `Error: ${apiError}` : "The restaurant and POS analysis engine is active. Once POS terminal orders or guest requests are placed, metrics will synchronize here."}
                        </p>
                    </div>
                    <button 
                        onClick={() => revalidate()}
                        className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-border/50 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-text-primary transition-all active:scale-95"
                    >
                        <RefreshCw className="w-4 h-4" /> Refresh Analysis
                    </button>
                </div>
            </div>
        )
    }

    const { stats, topSelling = [], poorPerforming = [], matrix = { stars: [], plowhorses: [], puzzles: [], dogs: [] }, categories = [], recentPOSOrders = [] } = analysisData

    const handleExportPDF = async () => {
        setExporting(true)
        try {
            const jsPDF = (await import('jspdf')).default
            const autoTable = (await import('jspdf-autotable')).default
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

            // Header
            doc.setFillColor(22, 27, 34)
            doc.rect(0, 0, 210, 30, 'F')
            doc.setTextColor(255, 255, 255)
            doc.setFontSize(16)
            doc.setFont('helvetica', 'bold')
            doc.text('Restaurant & POS Sales Analysis', 14, 14)
            doc.setFontSize(9)
            doc.setFont('helvetica', 'normal')
            doc.text(`${activeTab} • ${timeRange} • Generated ${new Date().toLocaleDateString('en-IN')}`, 14, 22)

            // KPI Stats
            let y = 40
            doc.setTextColor(33, 33, 33)
            doc.setFontSize(11)
            doc.setFont('helvetica', 'bold')
            doc.text('Key Performance Indicators', 14, y)
            y += 6

            autoTable(doc, {
                startY: y,
                head: [['Metric', 'Value']],
                body: [
                    ['Total Revenue (POS + Service)', formatCurrency(stats.totalRevenue)],
                    ['Average Check Size', formatCurrency(stats.avgCheck)],
                    ['Total Covers / Orders', (stats.totalCovers || 0).toString()],
                    ['Peak Hours', stats.peakHours || '19:30 - 21:00'],
                    ['Dine-In Orders', (stats.dineInCount || 0).toString()],
                    ['Takeaway POS Orders', (stats.takeawayCount || 0).toString()],
                    ['Room Service Delivery', (stats.roomDeliveryCount || 0).toString()],
                ],
                theme: 'striped',
                headStyles: { fillColor: [37, 99, 235] },
                styles: { fontSize: 9 }
            })

            doc.save(`Restaurant_POS_Analysis_${new Date().toISOString().split('T')[0]}.pdf`)
            toast.success('Report exported')
        } catch (err) {
            console.error(err)
            toast.error('Export failed')
        } finally {
            setExporting(false)
        }
    }

    const handleUpdateMargin = async (itemId: string, newMargin: number) => {
        try {
            const res = await fetch('/api/admin/content/menu', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: itemId, margin: newMargin })
            })
            if (res.ok) {
                toast.success('Margin updated')
                setEditingId(null)
                revalidate()
            } else toast.error('Failed to update margin')
        } catch { toast.error('Error updating margin') }
    }

    const barData = topSelling.map((i: any) => ({ 
        name: i.name.length > 14 ? i.name.slice(0, 14) + '…' : i.name, 
        units: i.units || 0 
    }))
    const pieData = categories.map((c: any) => ({ name: c.label, value: c.value }))

    const MatrixCard = ({ title, items, color, badge }: { title: string; items: any[]; color: string; badge: string }) => (
        <div className="bg-surface border border-border rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-5">
                <h4 className={cn('text-base font-bold', color)}>{title}</h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-light text-text-tertiary border border-border uppercase tracking-wider">{badge}</span>
            </div>
            <div className="space-y-3">
                {items.length === 0 ? (
                    <p className="text-xs text-text-tertiary py-4 text-center">No items in this category</p>
                ) : items.map((item: any) => (
                    <div key={item.id || item.name} className="flex items-center justify-between p-3 bg-surface-light rounded-xl border border-border group">
                        <div>
                            <p className="text-sm font-semibold text-text-primary">{item.name}</p>
                            <p className="text-xs text-text-tertiary mt-0.5">{item.units} units sold</p>
                        </div>
                        <div className="text-right">
                            {editingId === item.id ? (
                                <div className="flex items-center gap-1.5">
                                    <input
                                        type="number"
                                        value={editingValue}
                                        onChange={e => setEditingValue(e.target.value)}
                                        className="w-20 bg-surface border border-primary rounded-lg px-2 py-1 text-xs text-text-primary focus:outline-none"
                                        autoFocus
                                    />
                                    <button onClick={() => handleUpdateMargin(item.id, parseFloat(editingValue))} className="p-1 hover:bg-emerald-500/20 rounded text-emerald-400">
                                        <Check className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={() => setEditingId(null)} className="p-1 hover:bg-red-500/20 rounded text-red-400">
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    <p className="text-xs font-bold text-emerald-400">{formatCurrency(item.margin)} margin</p>
                                    {item.id && (
                                        <button
                                            onClick={() => { setEditingId(item.id); setEditingValue(item.margin.toString()) }}
                                            className="text-[10px] text-primary hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            Edit margin
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )

    return (
        <div className="space-y-6 animate-fade-in text-left pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-5">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold text-text-primary font-outfit uppercase tracking-tight">Restaurant Sales & POS Analysis</h1>
                        <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[9px] font-extrabold text-[#3B82F6] uppercase tracking-wider">POS & Dining Hub</span>
                    </div>
                    <p className="text-text-secondary text-xs mt-1">Detailed analytics on live POS tickets, dining room sales, takeaway, and menu popularity matrix.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex bg-surface-light border border-border rounded-xl p-1">
                        {['All Day', 'Breakfast', 'Lunch', 'Dinner'].map((t) => (
                            <button
                                key={t}
                                onClick={() => setActiveTab(t)}
                                className={cn(
                                    "px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer",
                                    activeTab === t ? "bg-primary text-text-primary shadow-lg" : "text-text-tertiary hover:text-text-primary"
                                )}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2 bg-surface border border-border/50 rounded-xl px-3 py-2 transition-all">
                        <Calendar className="w-4 h-4 text-text-secondary shrink-0" />
                        <select
                            value={timeRange}
                            onChange={(e) => setTimeRange(e.target.value)}
                            className="bg-transparent text-[11px] font-bold text-text-primary focus:outline-none focus:ring-0 outline-none border-none uppercase tracking-wider cursor-pointer shadow-none ring-0 appearance-none pr-2"
                            style={{ outline: 'none', border: 'none', boxShadow: 'none' }}
                        >
                            {Object.keys(rangeMap).map(r => <option key={r} value={r} className="bg-surface text-text-primary py-1">{r}</option>)}
                        </select>
                    </div>
                    <button
                        onClick={handleExportPDF}
                        disabled={exporting}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white text-black hover:bg-white/90 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                    >
                        {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        Export PDF
                    </button>
                    <button 
                        onClick={() => revalidate()}
                        className="p-2.5 bg-surface-light border border-border hover:border-primary/50 rounded-xl text-text-secondary hover:text-text-primary transition-all cursor-pointer"
                        title="Refresh POS Analysis"
                    >
                        <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total POS & Dining Revenue', value: formatCurrency(stats.totalRevenue), icon: IndianRupee, trend: '+14.2%', color: 'text-emerald-400', desc: 'Aggregate sales across all POS terminals and tables' },
                    { label: 'Avg Check Size', value: formatCurrency(stats.avgCheck), icon: IndianRupee, trend: '+3.5%', color: 'text-primary', desc: 'Average ticket size per order' },
                    { label: 'Total Covers / Orders', value: stats.totalCovers || 0, icon: Users, trend: '+8.4%', color: 'text-amber-400', desc: 'Completed and active dining tickets' },
                    { label: 'Peak Dining Traffic', value: stats.peakHours, icon: Clock, trend: 'Dynamic', color: 'text-purple-400', desc: 'Peak POS order dispatch window' },
                ].map((kpi, i) => (
                    <div key={i} className="bg-surface border border-border p-6 rounded-2xl hover:border-primary/30 transition-all group relative overflow-hidden">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2.5 bg-surface-light rounded-xl group-hover:scale-110 transition-transform">
                                <kpi.icon className={cn('w-5 h-5', kpi.color)} />
                            </div>
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">{kpi.trend}</span>
                        </div>
                        <p className="text-xs font-medium text-text-tertiary uppercase tracking-widest">{kpi.label}</p>
                        <p className="text-2xl font-bold text-text-primary mt-1 font-mono">{kpi.value}</p>
                        <p className="text-[10px] text-text-tertiary/60 mt-1 leading-tight">{kpi.desc}</p>
                    </div>
                ))}
            </div>

            {/* POS Channel Breakdown Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-surface/50 border border-border p-4 rounded-2xl">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm">
                        🍽️
                    </div>
                    <div>
                        <p className="text-[10px] text-text-tertiary font-bold uppercase tracking-wider">Dine-In Sales</p>
                        <p className="text-sm font-black text-text-primary">{stats.dineInCount || 0} Orders</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-sm">
                        🛍️
                    </div>
                    <div>
                        <p className="text-[10px] text-text-tertiary font-bold uppercase tracking-wider">Takeaway POS</p>
                        <p className="text-sm font-black text-text-primary">{stats.takeawayCount || 0} Orders</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-sm">
                        🛎️
                    </div>
                    <div>
                        <p className="text-[10px] text-text-tertiary font-bold uppercase tracking-wider">Room Delivery</p>
                        <p className="text-sm font-black text-text-primary">{stats.roomDeliveryCount || 0} Orders</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-sm">
                        🧾
                    </div>
                    <div>
                        <p className="text-[10px] text-text-tertiary font-bold uppercase tracking-wider">Total POS Tickets</p>
                        <p className="text-sm font-black text-text-primary">{stats.posOrdersCount || stats.totalCovers || 0} Tickets</p>
                    </div>
                </div>
            </div>

            {/* Popularity Matrix & Revenue by Category */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Popularity Bar Chart */}
                <div className="lg:col-span-2 bg-surface border border-border rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-lg font-bold text-text-primary">Popularity Matrix (POS Volume)</h3>
                            <p className="text-xs text-text-tertiary">Top performing dishes and drinks ranked by units sold in POS.</p>
                        </div>
                        <div className="flex items-center gap-4 text-[10px] font-bold text-text-tertiary uppercase tracking-widest">
                            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-primary"></div> Sold Units</div>
                        </div>
                    </div>
                    <div className="h-[300px]">
                        {barData.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center bg-background/40 rounded-2xl border border-dashed border-border">
                                <BarChart3 className="w-10 h-10 text-text-tertiary/30 mb-3" />
                                <h4 className="text-sm font-bold text-text-tertiary uppercase tracking-widest">No Analysis Data</h4>
                                <p className="text-[10px] text-gray-600 font-medium mt-1">Awaiting restaurant POS orders to begin calculating.</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#4A9EFF" stopOpacity={0.8} />
                                            <stop offset="100%" stopColor="#4A9EFF" stopOpacity={0.1} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                    <XAxis 
                                        dataKey="name" 
                                        stroke="#475569" 
                                        fontSize={10} 
                                        tickLine={false} 
                                        axisLine={false} 
                                        dy={10}
                                        fontFamily="inherit"
                                        fontWeight={600}
                                    />
                                    <YAxis 
                                        stroke="#475569" 
                                        fontSize={10} 
                                        tickLine={false} 
                                        axisLine={false} 
                                        fontFamily="inherit"
                                        fontWeight={600}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(255,255,255,0.03)', radius: 8 }}
                                        contentStyle={{ 
                                            backgroundColor: '#161b22', 
                                            border: '1px solid rgba(255,255,255,0.08)', 
                                            borderRadius: '12px',
                                            boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)' 
                                        }}
                                        itemStyle={{ fontSize: '12px', color: '#fff', fontWeight: 600 }}
                                        labelStyle={{ fontSize: '10px', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 700 }}
                                    />
                                    <Bar dataKey="units" fill="url(#salesGradient)" radius={[8, 8, 0, 0]} barSize={32} animationDuration={1500} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Category Pie Chart */}
                <div className="bg-surface border border-border rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-text-primary mb-1">Revenue by Category</h3>
                    <p className="text-xs text-text-tertiary mb-8">Share of sales contribution across menu courses.</p>
                    <div className="h-[250px] relative">
                        {pieData.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center bg-background/40 rounded-2xl border border-dashed border-border">
                                <TrendingUp className="w-8 h-8 text-text-tertiary/30 mb-3" />
                                <h4 className="text-sm font-bold text-text-tertiary uppercase tracking-widest">No Category Data</h4>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie 
                                        data={pieData} 
                                        innerRadius={65} 
                                        outerRadius={85} 
                                        paddingAngle={6} 
                                        cornerRadius={4}
                                        dataKey="value"
                                        stroke="none"
                                        animationDuration={1200}
                                    >
                                        {pieData.map((_: any, i: number) => <Cell key={`cell-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ 
                                            backgroundColor: '#161b22', 
                                            border: '1px solid rgba(255,255,255,0.08)', 
                                            borderRadius: '12px',
                                            boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)' 
                                        }}
                                        itemStyle={{ color: '#fff', fontWeight: 600, fontSize: '12px' }}
                                    />
                                    <Legend 
                                        verticalAlign="bottom" 
                                        height={36} 
                                        iconType="circle" 
                                        wrapperStyle={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }} 
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </div>

            {/* Menu Engineering Matrix Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MatrixCard title="Top Performers (Stars)" items={matrix.stars} color="text-emerald-400" badge="High Sale • High Margin" />
                <MatrixCard title="Volume Drivers (Plowhorses)" items={matrix.plowhorses} color="text-primary" badge="High Sale • Low Margin" />
                <MatrixCard title="High Potential (Puzzles)" items={matrix.puzzles} color="text-amber-400" badge="Low Sale • High Margin" />
                <MatrixCard title="Underperformers (Dogs)" items={matrix.dogs} color="text-red-400" badge="Low Sale • Low Margin" />
            </div>

            {/* Live POS Orders & Restaurant Sales Log */}
            {recentPOSOrders && recentPOSOrders.length > 0 && (
                <div className="bg-surface border border-border rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-border bg-surface-light/30 flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                                <ReceiptText className="w-5 h-5 text-primary" />
                                Recent POS Sales & Dining Order Stream
                            </h3>
                            <p className="text-xs text-text-tertiary">Real-time tickets placed through the POS terminal and active floor plan.</p>
                        </div>
                        <span className="text-[10px] font-mono font-bold bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-full uppercase">
                            {recentPOSOrders.length} Latest Orders
                        </span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-border bg-surface-light/10">
                                    <th className="px-6 py-4 text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Order #</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Table / Type</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Guest / Server</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Dishes & Drinks</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Amount</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Time</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border font-sans">
                                {recentPOSOrders.map((o: any) => (
                                    <tr key={o.id} className="hover:bg-surface-light/20 transition-colors">
                                        <td className="px-6 py-4 font-mono font-bold text-xs text-primary">
                                            {o.orderNumber}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={cn(
                                                "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase",
                                                o.table?.toLowerCase().includes('takeaway') 
                                                    ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" 
                                                    : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                            )}>
                                                {o.table}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-xs font-semibold text-text-primary">{o.guestName}</p>
                                            <p className="text-[10px] text-text-tertiary">Server: {o.serverName}</p>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-text-secondary max-w-xs truncate" title={o.itemsList}>
                                            <span className="font-semibold text-text-primary">({o.itemsCount} items)</span> {o.itemsList}
                                        </td>
                                        <td className="px-6 py-4 font-mono font-bold text-sm text-emerald-400">
                                            {formatCurrency(o.total)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={cn(
                                                "px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border",
                                                o.status === 'SERVED' || o.status === 'SETTLED' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                                                o.status === 'READY' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                                                "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                            )}>
                                                {o.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-text-tertiary font-mono">
                                            {o.time}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Underperforming Items Table */}
            <div className="bg-surface border border-border rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-border bg-surface-light/30">
                    <h3 className="text-lg font-bold text-text-primary">Underperforming Menu Items</h3>
                    <p className="text-xs text-text-tertiary">Items requiring immediate menu engineering or promotion attention.</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-border bg-surface-light/10">
                                <th className="px-6 py-4 text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Item Detail</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Monthly Sales</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Sentiment</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Action Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {poorPerforming.map((item: any) => (
                                <tr key={item.id} className="hover:bg-surface-light/20 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-surface-light flex items-center justify-center text-[10px] font-bold text-primary border border-border">
                                                {item.name?.substring(0, 2).toUpperCase() || 'IT'}
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-text-primary">{item.name}</p>
                                                <p className="text-[10px] text-text-tertiary uppercase">{item.category}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-text-secondary">{item.sales} units</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1">
                                            {[...Array(5)].map((_: any, i: number) => (
                                                <Star key={i} className={cn("w-3 h-3", i < Math.round(item.sentiment) ? "text-amber-400 fill-amber-400" : "text-text-tertiary")} />
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={cn(
                                            "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                                            item.status === 'REVIEW REQ.' ? "bg-red-400/10 text-red-400 border-red-400/20" : "bg-primary/10 text-primary border-primary/20"
                                        )}>
                                            {item.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
