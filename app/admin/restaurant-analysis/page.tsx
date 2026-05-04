'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import useSWR from 'swr'
import { formatCurrency } from '@/lib/utils'
import { Loader2, Calendar, Download, TrendingUp, Users, Clock, ArrowDownRight, MoreHorizontal, Star, AlertCircle, Search, Check, X, BarChart3, UtensilsCrossed, RefreshCw, IndianRupee } from 'lucide-react'
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
    }

    const apiUrl = buildContextUrl(`/api/admin/analytics/restaurant`, {
        tab: activeTab,
        range: rangeMap[timeRange],
    })

    const { data: raw, error, isLoading, mutate: revalidate } = useSWR(apiUrl, fetcher)
    const analysisData = raw?.data ?? raw

    // 1. Handle Hard Error (Network/Auth)
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <AlertCircle className="w-12 h-12 text-red-500 opacity-50" />
                <p className="text-text-secondary font-medium">Failed to connect to analysis engine</p>
                <button onClick={() => setRefreshSignal(Date.now())} className="text-primary text-sm font-bold hover:underline">
                    Try Again
                </button>
            </div>
        )
    }

    // 2. Handle Loading State
    if (isLoading) {
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
                        <h1 className="text-2xl font-bold text-white">Restaurant Sales & Menu Popularity</h1>
                        <p className="text-text-secondary text-sm mt-0.5">Detailed analytics on restaurant performance and menu item optimization.</p>
                    </div>
                </div>

                <div className="flex flex-col items-center justify-center min-h-[400px] bg-surface border border-dashed border-border rounded-[45px] p-12 text-center space-y-6">
                    <div className="w-24 h-24 bg-primary/5 rounded-[40px] flex items-center justify-center border border-primary/10 relative">
                        <UtensilsCrossed className="w-10 h-10 text-primary opacity-20" />
                        <div className="absolute inset-0 bg-primary/5 blur-2xl animate-pulse"></div>
                    </div>
                    <div className="max-w-xs space-y-2">
                        <h3 className="text-lg font-bold text-white uppercase tracking-tight">Data Accumulating</h3>
                        <p className="text-xs font-medium text-text-tertiary leading-relaxed uppercase tracking-widest">
                            {apiError ? `Error: ${apiError}` : "The restaurant analysis engine is active. Once your guests begin ordering from the menu, sales performance metrics will synchronize here."}
                        </p>
                    </div>
                    <button 
                        onClick={() => revalidate()}
                        className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-white transition-all active:scale-95"
                    >
                        <RefreshCw className="w-4 h-4" /> Refresh Analysis
                    </button>
                </div>
            </div>
        )
    }

    const handleExportPDF = async () => {
        setExporting(true)
        try {
            const jsPDF = (await import('jspdf')).default
            const autoTable = (await import('jspdf-autotable')).default
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

            const { stats, topSelling, poorPerforming, matrix, categories } = analysisData

            // Header
            doc.setFillColor(22, 27, 34)
            doc.rect(0, 0, 210, 30, 'F')
            doc.setTextColor(255, 255, 255)
            doc.setFontSize(16)
            doc.setFont('helvetica', 'bold')
            doc.text('Restaurant Sales & Menu Analysis', 14, 14)
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
                    ['Total Revenue', formatCurrency(stats.totalRevenue)],
                    ['Average Check Size', formatCurrency(stats.avgCheck)],
                    ['Total Covers', stats.totalCovers.toString()],
                    ['Peak Hours', stats.peakHours],
                ],
                theme: 'striped',
                headStyles: { fillColor: [37, 99, 235] },
                styles: { fontSize: 9 },
            })

            doc.save(`Restaurant_Analysis_${new Date().toISOString().split('T')[0]}.pdf`)
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
                body: JSON.stringify({ id: itemId, margin: newMargin }),
            })
            if (res.ok) {
                toast.success('Margin updated')
                setEditingId(null)
                revalidate()
            } else toast.error('Failed to update margin')
        } catch { toast.error('Error') }
    }

    const { stats, topSelling, poorPerforming, matrix, categories } = analysisData
    const barData = topSelling.map((i: any) => ({ name: i.name.length > 12 ? i.name.slice(0, 12) + '…' : i.name, units: i.units }))
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
                    <div key={item.id} className="flex items-center justify-between p-3 bg-surface-light rounded-xl border border-border group">
                        <div>
                            <p className="text-sm font-semibold text-white">{item.name}</p>
                            <p className="text-xs text-text-tertiary mt-0.5">{item.units} units sold</p>
                        </div>
                        <div className="text-right">
                            {editingId === item.id ? (
                                <div className="flex items-center gap-1.5">
                                    <input
                                        type="number"
                                        value={editingValue}
                                        onChange={e => setEditingValue(e.target.value)}
                                        className="w-20 bg-surface border border-primary rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
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
                                    <button
                                        onClick={() => { setEditingId(item.id); setEditingValue(item.margin.toString()) }}
                                        className="text-[10px] text-primary hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        Edit margin
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Restaurant Sales & Menu Popularity</h1>
                    <p className="text-text-secondary text-sm mt-0.5">Detailed analytics on restaurant performance and menu item optimization.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex bg-surface-light border border-border rounded-xl p-1">
                        {['All Day', 'Breakfast', 'Lunch', 'Dinner'].map((t) => (
                            <button
                                key={t}
                                onClick={() => setActiveTab(t)}
                                className={cn(
                                    "px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                                    activeTab === t ? "bg-primary text-white shadow-lg" : "text-text-tertiary hover:text-white"
                                )}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2 bg-surface-light border border-border rounded-xl px-3 py-1.5">
                        <Calendar className="w-4 h-4 text-text-tertiary" />
                        <select
                            value={timeRange}
                            onChange={(e) => setTimeRange(e.target.value)}
                            className="bg-transparent text-[10px] font-bold text-white focus:outline-none uppercase tracking-wider cursor-pointer"
                        >
                            {Object.keys(rangeMap).map(r => <option key={r} value={r} className="bg-surface">{r}</option>)}
                        </select>
                    </div>
                    <button
                        onClick={handleExportPDF}
                        disabled={exporting}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white text-black hover:bg-white/90 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
                    >
                        {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        Export PDF
                    </button>
                    <button 
                        onClick={() => revalidate()}
                        className="p-2.5 bg-surface-light border border-border hover:border-primary/50 rounded-xl text-text-secondary transition-all"
                    >
                        <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Revenue', value: formatCurrency(stats.totalRevenue), icon: IndianRupee, trend: '+12.5%', color: 'text-emerald-400' },
                    { label: 'Avg Check Size', value: formatCurrency(stats.avgCheck), icon: IndianRupee, trend: '+3.2%', color: 'text-primary' },
                    { label: 'Total Covers', value: stats.totalCovers, icon: Users, trend: '+8.4%', color: 'text-amber-400' },
                    { label: 'Peak Traffic', value: stats.peakHours, icon: Clock, trend: 'Stable', color: 'text-purple-400' },
                ].map((kpi, i) => (
                    <div key={i} className="bg-surface border border-border p-6 rounded-2xl hover:border-primary/30 transition-all group">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2.5 bg-surface-light rounded-xl group-hover:scale-110 transition-transform">
                                <kpi.icon className={cn('w-5 h-5', kpi.color)} />
                            </div>
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">{kpi.trend}</span>
                        </div>
                        <p className="text-xs font-medium text-text-tertiary uppercase tracking-widest">{kpi.label}</p>
                        <p className="text-2xl font-bold text-white mt-1">{kpi.value}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-surface border border-border rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-lg font-bold text-white">Popularity Matrix</h3>
                            <p className="text-xs text-text-tertiary">Performance distribution of menu items.</p>
                        </div>
                        <div className="flex items-center gap-4 text-[10px] font-bold text-text-tertiary uppercase tracking-widest">
                            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-primary"></div> Sales</div>
                            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-400"></div> Margin</div>
                        </div>
                    </div>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                                <XAxis dataKey="name" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '12px' }}
                                    itemStyle={{ fontSize: '12px' }}
                                />
                                <Bar dataKey="units" fill="#2563eb" radius={[6, 6, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-surface border border-border rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-white mb-1">Revenue by Category</h3>
                    <p className="text-xs text-text-tertiary mb-8">Contribution to total sales.</p>
                    <div className="h-[250px] relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                    {pieData.map((_, i) => <Cell key={`cell-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '12px' }}
                                />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MatrixCard title="Top Performers" items={matrix.stars} color="text-emerald-400" badge="High Sale • High Margin" />
                <MatrixCard title="Volume Drivers" items={matrix.plowhorses} color="text-primary" badge="High Sale • Low Margin" />
                <MatrixCard title="High Potential" items={matrix.puzzles} color="text-amber-400" badge="Low Sale • High Margin" />
                <MatrixCard title="Underperformers" items={matrix.dogs} color="text-red-400" badge="Low Sale • Low Margin" />
            </div>

            <div className="bg-surface border border-border rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-border bg-surface-light/30">
                    <h3 className="text-lg font-bold text-white">Underperforming Items</h3>
                    <p className="text-xs text-text-tertiary">Items requiring immediate menu engineering attention.</p>
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
                                                {item.id}
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-white">{item.name}</p>
                                                <p className="text-[10px] text-text-tertiary uppercase">{item.category}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-text-secondary">{item.sales} units</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1">
                                            {[...Array(5)].map((_, i) => (
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
