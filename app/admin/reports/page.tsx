'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Legend, PieChart, Pie, Cell
} from 'recharts'
import { ArrowUpRight, ArrowDownRight, Calendar, Lock, Download, ChevronDown, Star, Loader2 } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Avatar from '@/components/common/Avatar'
import { cn, formatCurrency } from '@/lib/utils'
import { buildContextUrl } from '@/lib/admin-context'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { downloadCSV } from '@/lib/csv'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import html2canvas from 'html2canvas'

const SENTIMENT_COLORS = ['#10b981', '#f59e0b', '#ef4444']

export default function ReportsPage() {
    const { data: session } = useSession()
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [exporting, setExporting] = useState(false)
    const [trendView, setTrendView] = useState<'Daily' | 'Weekly' | 'Monthly'>('Daily')
    const [range, setRange] = useState<'this_month' | 'last_month' | 'last_3_months' | 'this_year'>('this_month')
    const [showRangePicker, setShowRangePicker] = useState(false)
    const chartRef = useRef<HTMLDivElement>(null)

    const RANGE_LABELS: Record<string, string> = {
        this_month: 'This Month',
        last_month: 'Last Month',
        last_3_months: 'Last 3 Months',
        this_year: 'This Year',
    }

    const fetchReports = async (selectedRange = range) => {
        setLoading(true)
        try {
            const res = await fetch(buildContextUrl(`/api/admin/reports?range=${selectedRange}`))
            if (res.ok) {
                const json = await res.json()
                setData(json?.data ?? json)
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (session && ['SUPER_ADMIN', 'HOTEL_ADMIN', 'MANAGER', 'RECEPTIONIST'].includes(session.user.role)) {
            fetchReports(range)
        }
    }, [session, range])

    const handleExport = () => {
        if (!data) return
        const reportData = [
            { Metric: 'Total Revenue', Value: `₹${data.totalRevenue}` },
            { Metric: 'Avg Occupancy', Value: `${data.avgOccupancy}%` },
            { Metric: 'Net Promoter Score', Value: data.nps },
            { Metric: 'SLA Breaches', Value: data.slaBreaches },
        ]
        downloadCSV(reportData, 'Reports_Analytics')
        toast.success('Report exported to CSV')
    }

    const handleExportPDF = async () => {
        if (!data) return
        setExporting(true)
        try {
            const doc = new jsPDF()
            const date = new Date().toLocaleDateString()

            // Header
            doc.setFontSize(22)
            doc.setTextColor(40, 40, 40)
            doc.text("Zenbourg Hotel - Performance Report", 14, 22)
            
            doc.setFontSize(10)
            doc.setTextColor(100, 100, 100)
            doc.text(`Generated on: ${date}`, 14, 30)
            const pLabel = data
                ? `${new Date(data.periodStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(data.periodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                : 'Current Month'
            doc.text(`Reporting Period: ${pLabel}`, 14, 35)

            // Capture Graph
            if (chartRef.current) {
                const canvas = await html2canvas(chartRef.current, {
                    backgroundColor: '#111827', // Match the dashboard theme
                    scale: 2 // High resolution
                })
                const imgData = canvas.toDataURL('image/png')
                const imgWidth = 180
                const imgHeight = (canvas.height * imgWidth) / canvas.width
                doc.addImage(imgData, 'PNG', 14, 45, imgWidth, imgHeight)
            }

            const tableStartY = 135 // Move tables down to make room for graph

            // KPI Table
            const kpiData = [
                ["Total Revenue", formatCurrency(data.totalRevenue)],
                ["Average Occupancy", `${data.avgOccupancy}%`],
                ["Net Promoter Score", data.nps.toString()],
                ["SLA Breaches", data.slaBreaches.toString()]
            ]

            autoTable(doc, {
                startY: tableStartY,
                head: [['Metric', 'Value']],
                body: kpiData,
                theme: 'striped',
                headStyles: { fillColor: [74, 158, 255] }
            })

            // Departmental SLA Table
            if (data.slaByDept) {
                const slaData = data.slaByDept.map((d: any) => [d.department, `${d.compliance}%`])
                autoTable(doc, {
                    startY: (doc as any).lastAutoTable.finalY + 15,
                    head: [['Department', 'SLA Compliance']],
                    body: slaData,
                    theme: 'grid',
                    headStyles: { fillColor: [16, 185, 129] }
                })
            }

            doc.save(`Hotel_Performance_Report_${new Date().toISOString().split('T')[0]}.pdf`)
            toast.success('Professional PDF Report generated with charts')
        } catch (err) {
            console.error(err)
            toast.error('Failed to generate professional PDF')
        } finally {
            setExporting(false)
        }
    }

    if (!['SUPER_ADMIN', 'HOTEL_ADMIN', 'MANAGER', 'RECEPTIONIST'].includes(session?.user?.role || '')) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center p-6 animate-fade-in">
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 text-red-500 animate-pulse">
                    <Lock className="w-10 h-10" />
                </div>
                <h1 className="text-3xl font-bold text-text-primary mb-3">Restricted Access</h1>
                <p className="text-lg text-text-secondary max-w-md">
                    Analytics and Reports are restricted to Property Administrators.
                </p>
                <Button variant="secondary" className="mt-8" onClick={() => window.history.back()}>Go Back</Button>
            </div>
        )
    }

    const periodLabel = data
        ? `${new Date(data.periodStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(data.periodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
        : '...'

    // Aggregate trend data for weekly/monthly views
    const getAggregatedTrend = () => {
        if (!data?.trendData) return []
        if (trendView === 'Daily') return data.trendData

        const chunkSize = trendView === 'Weekly' ? 7 : 30
        const result: any[] = []
        for (let i = 0; i < data.trendData.length; i += chunkSize) {
            const chunk = data.trendData.slice(i, i + chunkSize)
            const avgRev = Math.round(chunk.reduce((s: number, d: any) => s + d.revenue, 0) / chunk.length)
            const avgOcc = Math.round(chunk.reduce((s: number, d: any) => s + d.occupancy, 0) / chunk.length)
            result.push({ name: chunk[0].name, revenue: avgRev, occupancy: avgOcc })
        }
        return result
    }

    const sentimentData = data?.sentimentBreakdown ? [
        { name: 'Positive', value: data.sentimentBreakdown.positive },
        { name: 'Neutral', value: data.sentimentBreakdown.neutral },
        { name: 'Negative', value: data.sentimentBreakdown.negative },
    ] : []

    const formatTimeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime()
        const hours = Math.floor(diff / (1000 * 60 * 60))
        const days = Math.floor(hours / 24)
        if (days > 0) return `${days}d ago`
        if (hours > 0) return `${hours}h ago`
        return 'Just now'
    }

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-text-primary tracking-tight">Reports & Analytics</h1>
                    <p className="text-text-secondary mt-1 text-xs md:text-sm">Overview of key hotel performance metrics</p>
                </div>
                <div className="flex gap-2 md:gap-3 items-center overflow-x-auto pb-1 sm:pb-0">
                    <div className="relative">
                        <button
                            onClick={() => setShowRangePicker(v => !v)}
                            className="flex items-center gap-2 px-3 md:px-4 py-2 bg-white/[0.03] border border-white/[0.08] rounded-xl text-xs md:text-sm font-bold text-text-secondary hover:bg-white/[0.06] transition-all whitespace-nowrap"
                        >
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{RANGE_LABELS[range]}</span>
                            <ChevronDown className="w-3.5 h-3.5 opacity-50" />
                        </button>
                        {showRangePicker && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowRangePicker(false)} />
                                <div className="absolute right-0 mt-2 w-44 bg-surface border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                                    {Object.entries(RANGE_LABELS).map(([key, label]) => (
                                        <button
                                            key={key}
                                            onClick={() => { setRange(key as any); setShowRangePicker(false) }}
                                            className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${range === key ? 'bg-primary text-white' : 'text-text-secondary hover:bg-surface-light hover:text-white'}`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                    <div className="flex bg-white/[0.03] border border-white/[0.08] rounded-xl overflow-hidden p-1">
                        <button 
                            onClick={handleExport}
                            className="px-3 md:px-4 py-2 text-[10px] font-black uppercase tracking-widest text-text-secondary hover:text-white transition-all flex items-center gap-2"
                        >
                            <Download className="w-3.5 h-3.5" /> CSV
                        </button>
                        <div className="w-[1px] bg-white/10 my-1" />
                        <button 
                            onClick={handleExportPDF}
                            disabled={exporting}
                            className="px-3 md:px-4 py-2 text-[10px] font-black uppercase tracking-widest text-primary hover:brightness-125 transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PDF
                        </button>
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                    {[1, 2, 3, 4].map(i => (
                        <Card key={i} className="h-28 animate-pulse bg-surface border-white/[0.05]" />
                    ))}
                </div>
            ) : data && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                    {/* Total Revenue */}
                    <Card className="p-4 md:p-5 border-white/[0.05] hover:border-primary/20 transition-all">
                        <div className="flex items-center justify-between mb-3 md:mb-4">
                            <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Total Revenue</p>
                            <span className={`flex items-center text-[10px] font-bold px-2 py-0.5 rounded-lg ${data.revenueTrend >= 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'}`}>
                                {data.revenueTrend >= 0 ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                                {Math.abs(data.revenueTrend)}%
                            </span>
                        </div>
                        <p className="text-xl md:text-2xl font-bold text-text-primary tracking-tight">{formatCurrency(data.totalRevenue)}</p>
                        <p className="text-[10px] font-bold text-text-tertiary mt-1">vs. last month</p>
                    </Card>

                    {/* Avg Occupancy */}
                    <Card className="p-4 md:p-5 border-white/[0.05] hover:border-primary/20 transition-all">
                        <div className="flex items-center justify-between mb-3 md:mb-4">
                            <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Avg Occupancy</p>
                            <span className={`flex items-center text-[10px] font-bold px-2 py-0.5 rounded-lg ${data.occTrend >= 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'}`}>
                                {data.occTrend >= 0 ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                                {Math.abs(data.occTrend)}%
                            </span>
                        </div>
                        <p className="text-xl md:text-2xl font-bold text-text-primary tracking-tight">{data.avgOccupancy}%</p>
                        <p className="text-[10px] font-bold text-text-tertiary mt-1">vs. last month</p>
                    </Card>

                    {/* Net Promoter Score */}
                    <Card className="p-4 md:p-5 border-white/[0.05] hover:border-primary/20 transition-all">
                        <div className="flex items-center justify-between mb-3 md:mb-4">
                            <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Net Promoter S.</p>
                            <span className="flex items-center text-[10px] font-bold px-2 py-0.5 rounded-lg text-emerald-400 bg-emerald-500/10">
                                <ArrowUpRight className="w-3 h-3 mr-0.5" />2
                            </span>
                        </div>
                        <p className="text-xl md:text-2xl font-bold text-text-primary tracking-tight">{data.nps}</p>
                        <p className="text-[10px] font-bold text-text-tertiary mt-1">Top 10% Industry</p>
                    </Card>

                    {/* SLA Breaches */}
                    <Card className="p-4 md:p-5 border-white/[0.05] hover:border-primary/20 transition-all">
                        <div className="flex items-center justify-between mb-3 md:mb-4">
                            <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">SLA Breaches</p>
                            <span className={`flex items-center text-[10px] font-bold px-2 py-0.5 rounded-lg ${data.slaTrend >= 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'}`}>
                                {data.slaTrend >= 0 ? <ArrowDownRight className="w-3 h-3 mr-0.5" /> : <ArrowUpRight className="w-3 h-3 mr-0.5" />}
                                {Math.abs(data.slaTrend)}
                            </span>
                        </div>
                        <p className="text-xl md:text-2xl font-bold text-text-primary tracking-tight">{data.slaBreaches}</p>
                        <p className="text-[10px] font-bold text-text-tertiary mt-1">Response &gt; 30m</p>
                    </Card>
                </div>
            )}

            {/* Charts Row */}
            {data && (
                <div className="grid grid-cols-1 xl:grid-cols-[1.7fr,1fr] gap-4 md:gap-6">
                    {/* Revenue vs Occupancy Trends */}
                    <Card ref={chartRef} className="p-4 md:p-6 border-white/[0.05] bg-surface">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                            <div>
                                <h3 className="text-lg font-bold text-text-primary tracking-tight">Revenue vs. Occupancy</h3>
                                <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest mt-0.5">Performance Hub</p>
                            </div>
                            <div className="flex bg-white/[0.03] border border-white/[0.08] rounded-xl overflow-hidden self-start">
                                {(['Daily', 'Weekly', 'Monthly'] as const).map(v => (
                                    <button
                                        key={v}
                                        onClick={() => setTrendView(v)}
                                        className={`px-3 md:px-4 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all ${trendView === v ? 'bg-primary text-white shadow-lg' : 'text-text-secondary hover:text-white'}`}
                                    >
                                        {v}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="h-[240px] md:h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={getAggregatedTrend()}>
                                    <defs>
                                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#4A9EFF" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#4A9EFF" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorOcc" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                                    <XAxis dataKey="name" stroke="#64748b" fontSize={9} fontWeight="bold" tickLine={false} axisLine={false} />
                                    <YAxis yAxisId="left" stroke="#64748b" fontSize={9} fontWeight="bold" tickLine={false} axisLine={false} tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`} />
                                    <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={9} fontWeight="bold" tickLine={false} axisLine={false} tickFormatter={(val) => `${val}%`} />
                                    <Tooltip
                                        contentStyle={{ background: 'rgba(22, 27, 34, 0.95)', border: '1px solid #374151', borderRadius: 12, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
                                        itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: '600' }}
                                        labelStyle={{ color: '#9ca3af', marginBottom: '4px' }}
                                        formatter={(val: number, name: string) => name === 'Revenue' ? [`₹${val.toLocaleString()}`, name] : [`${val}%`, name]}
                                    />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: 10, fontWeight: 'bold', paddingTop: 20 }} />
                                    <Area yAxisId="left" type="monotone" dataKey="revenue" name="Revenue" stroke="#4A9EFF" fillOpacity={1} fill="url(#colorRev)" strokeWidth={2.5} dot={false} />
                                    <Area yAxisId="right" type="monotone" dataKey="occupancy" name="Occupancy" stroke="#f59e0b" fillOpacity={1} fill="url(#colorOcc)" strokeWidth={2.5} strokeDasharray="6 3" dot={false} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                    {/* Right Column: SLA + Sentiment */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-4 md:gap-6">
                        {/* SLA Compliance */}
                        <Card className="p-4 md:p-6 border-white/[0.05] bg-surface flex flex-col justify-between">
                            <div className="mb-5">
                                <h3 className="text-lg font-bold text-text-primary tracking-tight">Departmental SLA</h3>
                                <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest mt-0.5">Compliance Level</p>
                            </div>
                            <div className="space-y-4">
                                {data.slaByDept?.map((dept: any) => {
                                    const color = dept.compliance === null ? '#475569' : dept.compliance >= 95 ? '#10b981' : dept.compliance >= 85 ? '#f59e0b' : '#ef4444'
                                    return (
                                        <div key={dept.department} className="space-y-1.5">
                                            <div className="flex justify-between items-center px-0.5">
                                                <span className="text-[10px] font-black text-text-secondary uppercase tracking-tighter">{dept.department}</span>
                                                <span className="text-[10px] font-black text-text-primary">
                                                    {dept.compliance === null ? 'No Data' : `${dept.compliance}%`}
                                                </span>
                                            </div>
                                            <div className="h-1.5 w-full bg-white/[0.04] rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-1000"
                                                    style={{ width: `${dept.compliance ?? 0}%`, backgroundColor: color }}
                                                />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </Card>

                        {/* Guest Sentiment */}
                        <Card className="p-4 md:p-6 border-white/[0.05] bg-surface">
                            <div className="mb-4">
                                <h3 className="text-lg font-bold text-text-primary tracking-tight">Guest Sentiment</h3>
                            </div>
                            <div className="flex items-center gap-4 md:gap-6 justify-between sm:justify-start">
                                <div className="relative w-24 h-24 md:w-28 md:h-28 shrink-0">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={sentimentData}
                                                cx="50%" cy="50%"
                                                innerRadius={30} outerRadius={46}
                                                paddingAngle={4}
                                                dataKey="value"
                                                strokeWidth={0}
                                            >
                                                {sentimentData.map((_: any, index: number) => (
                                                    <Cell key={`cell-${index}`} fill={SENTIMENT_COLORS[index]} />
                                                ))}
                                            </Pie>
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-lg md:text-xl font-black text-text-primary">{data.sentimentBreakdown?.avgRating || '0'}</span>
                                    </div>
                                </div>
                                <div className="space-y-2 md:space-y-3 text-[10px] font-black uppercase tracking-widest">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
                                        <span className="text-text-secondary truncate">Pos ({data.sentimentBreakdown?.positive || 0}%)</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]" />
                                        <span className="text-text-secondary truncate">Neu ({data.sentimentBreakdown?.neutral || 0}%)</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]" />
                                        <span className="text-text-secondary truncate">Neg ({data.sentimentBreakdown?.negative || 0}%)</span>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            )}

            {/* Bottom Row: Leaderboard + Feedback */}
            {data && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Staff Leaderboard */}
                    <Card className="p-6 border-white/[0.05] bg-surface">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-text-primary">Staff Leaderboard</h3>
                            <button className="text-xs font-bold text-primary hover:brightness-125 transition-all uppercase tracking-widest">View All</button>
                        </div>
                        <div className="space-y-4">
                            {data.leaderboard?.length > 0 ? data.leaderboard.map((staff: any, i: number) => (
                                <div key={i} className="flex items-center gap-4 group">
                                    <Avatar name={staff.name} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-text-primary truncate">{staff.name}</p>
                                        <p className="text-[11px] text-text-tertiary font-bold capitalize">
                                            {staff.department} • {staff.tasksCompleted} Task{staff.tasksCompleted !== 1 ? 's' : ''}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        {staff.rating !== null && staff.rating !== undefined ? (
                                            <>
                                                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                                                <span className="text-sm font-bold text-text-primary">{staff.rating}</span>
                                            </>
                                        ) : (
                                            <span className="text-[10px] text-text-tertiary font-medium px-2 py-0.5 bg-white/5 rounded-md">No data</span>
                                        )}
                                    </div>
                                </div>
                            )) : (
                                <p className="text-sm text-text-tertiary py-4">No staff data available yet.</p>
                            )}
                        </div>
                    </Card>

                    {/* Recent Guest Feedback */}
                    <Card className="p-6 border-white/[0.05] bg-surface">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-text-primary">Recent Guest Feedback</h3>
                            <button className="text-xs font-bold text-primary hover:brightness-125 transition-all uppercase tracking-widest">View All</button>
                        </div>
                        <div className="space-y-5">
                            {data.feedback?.length > 0 ? data.feedback.map((fb: any, i: number) => (
                                <div key={i} className="space-y-2.5 pb-5 border-b border-white/[0.04] last:border-0 last:pb-0">
                                    <div className="flex items-center justify-between">
                                        <div className="flex gap-0.5">
                                            {Array.from({ length: 5 }).map((_: any, s: number) => (
                                                <Star key={s} className={`w-3.5 h-3.5 ${s < fb.rating ? 'fill-amber-500 text-amber-500' : 'text-gray-700'}`} />
                                            ))}
                                        </div>
                                        <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{formatTimeAgo(fb.createdAt)}</span>
                                    </div>
                                    <p className={cn("text-sm leading-relaxed", !fb.comment && "text-text-tertiary italic")}>
                                        &ldquo;{fb.comment || 'No comment provided'}&rdquo;
                                    </p>
                                    <p className="text-[11px] font-bold text-text-tertiary">
                                        - {fb.guestName}, Room {fb.room}
                                    </p>
                                </div>
                            )) : (
                                <p className="text-sm text-text-tertiary  py-4">No guest feedback available yet.</p>
                            )}
                        </div>
                    </Card>
                </div>
            )}
        </div>
    )
}
