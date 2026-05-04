'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import {
    ChevronLeft, Loader2, Calendar, 
    ArrowRight, CheckCircle2, XCircle,
    Info, Clock, Smartphone, Zap,
    LayoutGrid, ClipboardList, TrendingUp
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

export default function StayRequestsPage() {
    const router = useRouter()
    const { data, mutate, isValidating: loading } = useSWR('/api/staff/stay-requests', (url) => fetch(url).then(res => res.json()), {
        revalidateOnFocus: true,
        dedupingInterval: 5000
    })

    const requests = Array.isArray(data?.requests) ? data.requests : []

    const handleAction = async (requestId: string, action: 'APPROVE' | 'REJECT') => {
        try {
            const res = await fetch(`/api/staff/stay-requests/${requestId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED' })
            })
            if (res.ok) {
                toast.success(`Request ${action === 'APPROVE' ? 'approved' : 'rejected'} successfully`)
                mutate()
            } else {
                toast.error('Failed to process request')
            }
        } catch (error) {
            toast.error('Something went wrong')
        }
    }

    if (!data && loading) return (
        <div className="space-y-8 animate-pulse px-4">
            <div className="flex justify-between items-center">
                <div className="h-10 w-10 bg-white/5 rounded-xl" />
                <div className="h-10 w-48 bg-white/5 rounded-xl text-center" />
                <div className="h-10 w-10 bg-white/5 rounded-xl" />
            </div>
            {[1, 2].map(i => (
                <div key={i} className="h-64 w-full bg-white/5 rounded-[45px]" />
            ))}
        </div>
    )

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            {/* Header */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => router.back()}
                    className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-gray-400 hover:text-white transition-all"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex flex-col items-center px-4">
                    <h1 className="text-xl font-black text-white tracking-tight">Stay Requests</h1>
                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mt-0.5">Awaiting Verification</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-gray-400">
                    <Zap className="w-4 h-4" />
                </div>
            </div>

            {/* Requests Queue */}
            <div className="space-y-6">
                {requests.length === 0 ? (
                    <div className="py-24 text-center space-y-6">
                        <div className="w-24 h-24 bg-white/[0.02] rounded-[40px] flex items-center justify-center mx-auto border border-dashed border-white/10 opacity-20">
                            <TrendingUp className="w-10 h-10 text-gray-400" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-sm font-black text-white uppercase tracking-widest">Queue Clear</h3>
                            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest leading-loose">No pending extension or upgrade requests.<br/>New dispatches will appear here.</p>
                        </div>
                    </div>
                ) : (
                    requests.map((req: any) => (
                        <div
                            key={req.id}
                            className="bg-[#161b22] rounded-[45px] overflow-hidden border border-white/[0.05] group hover:border-blue-500/20 transition-all flex flex-col relative shadow-3xl shadow-black/60"
                        >
                            {/* Type Stripe */}
                            <div className={cn(
                                "absolute top-0 bottom-0 left-0 w-2",
                                req.type === 'UPGRADE' ? 'bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.4)]' : 'bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.4)]'
                            )}></div>

                            <div className="p-10">
                                <div className="flex items-start justify-between mb-8">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center">
                                            {req.type === 'UPGRADE' ? <TrendingUp className="w-7 h-7 text-amber-500" /> : <Calendar className="w-7 h-7 text-blue-500" />}
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-black text-white tracking-tight leading-none mb-2">Room {req.booking?.room?.roomNumber}</h4>
                                            <div className="flex items-center gap-3">
                                                <span className={cn(
                                                    "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border",
                                                    req.type === 'UPGRADE' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-blue-500/10 border-blue-500/20 text-blue-500'
                                                )}>
                                                    {req.type} REQUEST
                                                </span>
                                                <div className="flex items-center gap-1.5 opacity-40">
                                                    <Clock className="w-3 h-3 text-gray-500" />
                                                    <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">
                                                        {format(new Date(req.createdAt), 'hh:mm a')}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1">Guest</p>
                                        <p className="text-sm font-black text-white">{req.booking?.guest?.name || 'Guest'}</p>
                                    </div>
                                </div>

                                {/* Comparison Context */}
                                <div className="grid grid-cols-2 gap-4 mb-10">
                                    <div className="p-6 bg-white/[0.02] border border-white/[0.03] rounded-3xl">
                                        <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-3">Current</p>
                                        <p className="text-xs font-bold text-white mb-1">{req.booking?.room?.type}</p>
                                        <p className="text-[10px] font-medium text-gray-500">Out: {format(new Date(req.booking?.checkOut), 'dd MMM')}</p>
                                    </div>
                                    <div className="p-6 bg-blue-600/5 border border-blue-500/10 rounded-3xl">
                                        <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-3">Requested</p>
                                        <p className="text-xs font-bold text-white mb-1">{req.type === 'UPGRADE' ? req.targetRoom?.type : req.booking?.room?.type}</p>
                                        <p className="text-[10px] font-medium text-blue-400">
                                            {req.type === 'EXTEND' ? `New Out: ${format(new Date(req.newCheckOut), 'dd MMM')}` : `Upgrade Option`}
                                        </p>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => handleAction(req.id, 'APPROVE')}
                                        className="flex-1 h-16 bg-blue-600 hover:bg-blue-500 text-white rounded-[24px] flex items-center justify-center gap-3 font-black text-[11px] uppercase tracking-widest shadow-xl shadow-blue-600/20 active:scale-95 transition-all"
                                    >
                                        <CheckCircle2 className="w-5 h-5" />
                                        Approve
                                    </button>
                                    <button
                                        onClick={() => handleAction(req.id, 'REJECT')}
                                        className="h-16 px-8 bg-white/[0.03] border border-white/10 text-gray-500 hover:text-rose-500 hover:border-rose-500/30 rounded-[24px] flex items-center justify-center active:scale-95 transition-all"
                                    >
                                        <XCircle className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Info Footer */}
            <div className="p-6 bg-white/[0.02] rounded-[40px] border border-white/[0.05] flex items-start gap-4 mx-2">
                <Info className="w-5 h-5 text-gray-600 shrink-0 mt-0.5" />
                <p className="text-[10px] font-bold text-gray-700 leading-relaxed uppercase tracking-widest">
                    Approvals are final and will notify the guest to proceed with the payment for their requested stay adjustments.
                </p>
            </div>
        </div>
    )
}
