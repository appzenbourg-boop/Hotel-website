'use client'

import React from 'react'
import useSWR from 'swr'
import { useSession } from 'next-auth/react'
import { buildContextUrl } from '@/lib/admin-context'
import {
    PieChart as PieIcon, Loader2, TrendingUp, ShoppingBag, IndianRupee
} from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { cn } from '@/lib/utils'
import Card from '@/components/ui/Card'

export default function CafeAnalyticsPage() {
    const { data: session } = useSession()

    const { data: rawData, isLoading } = useSWR(
        buildContextUrl('/api/admin/cafe'),
        (url) => fetch(url).then(res => res.json())
    )

    const cafeData = rawData?.data || {
        menu: [], buffetPackages: [], orders: [], hotelMenu: [], staffList: [],
        analytics: { todaySales: 0, todayOrdersCount: 0, avgOrderValue: 0, paymentBreakdown: [] }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#101922]">
                <Loader2 className="w-8 h-8 text-[#4A9EFF] animate-spin" />
            </div>
        )
    }

    return (
        <div className="flex flex-col bg-[#101922] w-full min-h-screen animate-fade-in pb-24 text-gray-300 font-sans">
            {/* Header */}
            <div className="p-6 sm:px-8 bg-[#101922] border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-lg shadow-emerald-500/10">
                        <PieIcon className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">Cafe Sales & Analytics</h1>
                        <p className="text-xs text-gray-400 mt-0.5">Revenue tracking, payment division, and performance insights</p>
                    </div>
                </div>
            </div>

            <div className="p-6 sm:px-8 space-y-6">
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="p-6 bg-surface border-white/[0.06] space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Today&apos;s Cafe Sales</p>
                            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                <IndianRupee className="w-4 h-4 text-emerald-400" />
                            </div>
                        </div>
                        <p className="text-3xl font-black text-white font-mono">₹{cafeData.analytics.todaySales.toLocaleString('en-IN')}</p>
                        <p className="text-xs text-emerald-400 font-bold flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Today&apos;s Revenue</p>
                    </Card>
                    <Card className="p-6 bg-surface border-white/[0.06] space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Today&apos;s Orders Count</p>
                            <div className="w-8 h-8 rounded-xl bg-[#4A9EFF]/10 flex items-center justify-center">
                                <ShoppingBag className="w-4 h-4 text-[#4A9EFF]" />
                            </div>
                        </div>
                        <p className="text-3xl font-black text-[#4A9EFF] font-mono">{cafeData.analytics.todayOrdersCount}</p>
                        <p className="text-xs text-gray-500 font-bold">Total orders placed today</p>
                    </Card>
                    <Card className="p-6 bg-surface border-white/[0.06] space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Avg Order Value</p>
                            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
                                <TrendingUp className="w-4 h-4 text-amber-400" />
                            </div>
                        </div>
                        <p className="text-3xl font-black text-emerald-400 font-mono">₹{cafeData.analytics.avgOrderValue.toLocaleString('en-IN')}</p>
                        <p className="text-xs text-gray-500 font-bold">Average per order</p>
                    </Card>
                </div>

                {/* Payment Mode Pie Chart */}
                <Card className="p-6 border-white/[0.06] bg-surface">
                    <h3 className="text-lg font-bold text-white mb-6">Payment Mode Division (Cash, Card, Online, Room Charge)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                        <div className="h-64 relative flex items-center justify-center">
                            {(cafeData.analytics.paymentBreakdown || []).length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={cafeData.analytics.paymentBreakdown || []}
                                            cx="50%" cy="50%"
                                            innerRadius={60} outerRadius={90}
                                            paddingAngle={4}
                                            dataKey="value"
                                            strokeWidth={0}
                                        >
                                            {(cafeData.analytics.paymentBreakdown || []).map((entry: any, index: number) => (
                                                <Cell key={`cell-cafe-pay-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ background: 'rgba(22, 27, 34, 0.95)', border: '1px solid #374151', borderRadius: 12 }}
                                            itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: '600' }}
                                            formatter={(val: number) => [`₹${val.toLocaleString()}`, 'Total Collected']}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="text-center">
                                    <PieIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                                    <p className="text-gray-500 font-bold text-sm">No analytics data yet</p>
                                    <p className="text-xs text-gray-600 mt-1">Place cafe orders to see payment breakdowns</p>
                                </div>
                            )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {(cafeData.analytics.paymentBreakdown || []).map((item: any) => (
                                <div key={item.name} className="p-4 rounded-2xl bg-black/30 border border-white/5 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                                            <span className="text-white font-bold text-xs truncate">{item.name}</span>
                                        </div>
                                        <span className="text-xs font-black text-[#4A9EFF]">{item.percentage}%</span>
                                    </div>
                                    <p className="text-xl font-black text-white font-mono">₹{item.value.toLocaleString('en-IN')}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    )
}
