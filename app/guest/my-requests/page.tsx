'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Clock, CheckCircle2, AlertCircle, Loader2, Utensils, Sparkles, CalendarCheck, Droplets, ConciergeBell, RotateCw, Wrench } from 'lucide-react'

interface ServiceRequest {
    id: string
    title: string
    description?: string
    status: string
    createdAt: string
    type: string
    amount?: number
    priority?: string
}

export default function MyRequestsPage() {
    const router = useRouter()
    const [requests, setRequests] = useState<ServiceRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [activeTab, setActiveTab] = useState<'ALL' | 'FOOD' | 'STAY' | 'SERVICES'>('ALL')

    const fetchRequests = async () => {
        try {
            const guestId = localStorage.getItem('zenbourg_guest_id')
            if (!guestId) {
                setLoading(false)
                return
            }
            const res = await fetch(`/api/guest/services/my-requests?guestId=${guestId}`)
            if (res.ok) {
                const data = await res.json()
                setRequests(Array.isArray(data) ? data : [])
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    useEffect(() => {
        fetchRequests()
    }, [])

    const handleRefresh = () => {
        setRefreshing(true)
        fetchRequests()
    }

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'COMPLETED': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
            case 'IN_PROGRESS':
            case 'ACCEPTED': return 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]'
            case 'CANCELLED': return 'bg-rose-500/10 text-rose-400 border-rose-500/20'
            case 'OVERDUE': return 'bg-red-500/10 text-red-400 border-red-500/20'
            default: return 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]'
        }
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'COMPLETED': return <CheckCircle2 className="w-3.5 h-3.5" />
            case 'IN_PROGRESS':
            case 'ACCEPTED': return <Clock className="w-3.5 h-3.5" />
            case 'CANCELLED': return <AlertCircle className="w-3.5 h-3.5" />
            default: return <Clock className="w-3.5 h-3.5" />
        }
    }

    const getTypeIcon = (req: ServiceRequest) => {
        const titleLower = req.title.toLowerCase()
        if (req.type === 'FOOD_ORDER' || titleLower.includes('dining') || titleLower.includes('food')) {
            return <Utensils className="w-4 h-4 text-orange-400" />
        }
        if (titleLower.includes('upgrade')) {
            return <Sparkles className="w-4 h-4 text-amber-400" />
        }
        if (titleLower.includes('extension') || titleLower.includes('extend')) {
            return <CalendarCheck className="w-4 h-4 text-[#4A9EFF]" />
        }
        if (req.type === 'HOUSEKEEPING') {
            return <Droplets className="w-4 h-4 text-purple-400" />
        }
        if (req.type === 'MAINTENANCE') {
            return <Wrench className="w-4 h-4 text-yellow-400" />
        }
        return <ConciergeBell className="w-4 h-4 text-emerald-400" />
    }

    const filteredRequests = requests.filter(req => {
        const titleLower = req.title.toLowerCase()
        if (activeTab === 'FOOD') return req.type === 'FOOD_ORDER' || titleLower.includes('dining') || titleLower.includes('food')
        if (activeTab === 'STAY') return titleLower.includes('upgrade') || titleLower.includes('extend') || titleLower.includes('extension')
        if (activeTab === 'SERVICES') return req.type !== 'FOOD_ORDER' && !titleLower.includes('upgrade') && !titleLower.includes('extension')
        return true
    })

    return (
        <div className="min-h-screen bg-[#0A0E1A] text-white pb-20 font-sans selection:bg-[#4A9EFF]/30 relative overflow-hidden">
            {/* Background Glows */}
            <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#4A9EFF15] blur-[120px] rounded-full pointer-events-none" />
            <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#805ad515] blur-[120px] rounded-full pointer-events-none" />

            <div className="p-4 sm:p-5 flex items-center justify-between bg-white/[0.02] backdrop-blur-2xl sticky top-0 z-20 border-b border-white/[0.05]">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push('/guest/dashboard')}
                        className="p-2.5 rounded-xl hover:bg-white/[0.06] bg-white/[0.03] transition-all border border-white/[0.05]"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-300" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                            My Requests
                        </h1>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                            Live Guest Tracking
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="p-2.5 rounded-xl hover:bg-white/[0.06] bg-white/[0.03] transition-all border border-white/[0.05] text-gray-300 hover:text-white"
                    title="Refresh"
                >
                    <RotateCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#4A9EFF]' : ''}`} />
                </button>
            </div>

            <main className="p-4 sm:p-6 space-y-4 max-w-md mx-auto relative z-10">
                {/* Filter Tabs */}
                <div className="flex gap-1.5 p-1 bg-white/[0.03] border border-white/10 rounded-2xl">
                    {(['ALL', 'FOOD', 'STAY', 'SERVICES'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all ${
                                activeTab === tab
                                    ? 'bg-[#4A9EFF] text-white shadow-md'
                                    : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            {tab === 'ALL' ? 'All' : tab === 'FOOD' ? 'Dining' : tab === 'STAY' ? 'Stay' : 'Services'}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-28 gap-3">
                        <Loader2 className="w-8 h-8 text-[#4A9EFF] animate-spin" />
                        <p className="text-xs font-bold uppercase tracking-widest text-[#4A9EFF] animate-pulse">
                            Loading Your Requests...
                        </p>
                    </div>
                ) : filteredRequests.length === 0 ? (
                    <div className="text-center py-24 space-y-5">
                        <div className="w-16 h-16 bg-white/[0.03] rounded-2xl flex items-center justify-center mx-auto border border-white/10 shadow-xl">
                            <Clock className="w-7 h-7 text-gray-500" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold mb-1">No Active Requests</h2>
                            <p className="text-gray-400 text-xs max-w-[220px] mx-auto leading-relaxed">
                                You have not placed any {activeTab !== 'ALL' ? activeTab.toLowerCase() : ''} requests yet.
                            </p>
                        </div>
                        <button
                            className="px-5 py-2.5 bg-[#4A9EFF]/10 text-[#4A9EFF] border border-[#4A9EFF]/30 font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-[#4A9EFF]/20 transition-all"
                            onClick={() => router.push('/guest/dashboard')}
                        >
                            Return to Dashboard
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3.5">
                        {filteredRequests.map((req, index) => (
                            <div
                                key={req.id}
                                className="bg-white/[0.02] border border-white/[0.08] p-4 sm:p-5 rounded-2xl backdrop-blur-md hover:border-white/20 transition-all shadow-xl"
                            >
                                <div className="flex items-start justify-between gap-2 mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center shadow-inner shrink-0">
                                            {getTypeIcon(req)}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white text-sm">{req.title}</h3>
                                            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">
                                                #{req.id.slice(-6).toUpperCase()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border shrink-0 ${getStatusStyle(req.status)}`}>
                                        {getStatusIcon(req.status)}
                                        <span>{req.status.replace('_', ' ')}</span>
                                    </div>
                                </div>

                                {req.description && (
                                    <div className="bg-black/40 p-3 rounded-xl border border-white/5 mb-3">
                                        <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-line">
                                            {req.description}
                                        </p>
                                    </div>
                                )}

                                <div className="flex items-center justify-between pt-3 border-t border-white/[0.05] text-[10px]">
                                    <div className="flex items-center gap-2">
                                        {req.amount && req.amount > 0 ? (
                                            <span className="font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                                Bill: ₹{req.amount.toLocaleString('en-IN')}
                                            </span>
                                        ) : (
                                            <span className="text-gray-500 font-semibold uppercase tracking-wider">
                                                Room Service
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-gray-400 font-medium">
                                        {new Date(req.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })},{' '}
                                        {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    )
}
