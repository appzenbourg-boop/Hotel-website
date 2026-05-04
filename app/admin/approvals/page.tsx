'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { 
    CheckCircle2, XCircle, Clock, ArrowUp, Calendar, 
    User, Search, Loader2, RefreshCw, AlertCircle,
    Building2, Hash, CreditCard
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils'
import { buildContextUrl } from '@/lib/admin-context'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Avatar from '@/components/common/Avatar'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function ApprovalsPage() {
    const [statusFilter, setStatusFilter] = useState('PENDING')
    const [processingId, setProcessingId] = useState<string | null>(null)

    const apiUrl = buildContextUrl('/api/admin/bookings/requests', { status: statusFilter })
    const { data: raw, error, isLoading, mutate } = useSWR(apiUrl, fetcher)
    const requests = raw?.data ?? []

    const handleProcess = async (requestId: string, action: 'APPROVE' | 'REJECT', reason?: string) => {
        setProcessingId(requestId)
        try {
            const res = await fetch('/api/admin/bookings/requests', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestId, action, rejectionReason: reason })
            })
            if (res.ok) {
                toast.success(`Request ${action.toLowerCase()}d successfully`)
                mutate()
            } else {
                const err = await res.json()
                toast.error(err.error || 'Failed to process request')
            }
        } catch {
            toast.error('Something went wrong')
        } finally {
            setProcessingId(null)
        }
    }

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Operation Approvals</h1>
                    <p className="text-text-secondary mt-1 text-sm font-medium">Review and authorize room upgrades and stay extensions</p>
                </div>
                <div className="flex items-center gap-2 bg-surface-light border border-border p-1 rounded-xl">
                    {(['PENDING', 'APPROVED', 'REJECTED'] as const).map(s => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={cn(
                                "px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                                statusFilter === s 
                                    ? "bg-primary text-white shadow-lg" 
                                    : "text-text-tertiary hover:text-text-secondary"
                            )}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            {/* List */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-xs font-black uppercase tracking-widest text-text-tertiary">Synchronizing requests...</p>
                </div>
            ) : requests.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-[400px] bg-surface border border-dashed border-border rounded-[40px] p-12 text-center">
                    <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mb-6 border border-primary/10">
                        <CheckCircle2 className="w-8 h-8 text-primary opacity-20" />
                    </div>
                    <h3 className="text-lg font-bold text-white uppercase tracking-tight">Queue Clear</h3>
                    <p className="text-xs text-text-tertiary uppercase tracking-widest max-w-xs mx-auto mt-2 leading-relaxed">
                        There are no {statusFilter.toLowerCase()} requests at the moment. High five! 
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {requests.map((req: any) => (
                        <Card key={req.id} className="relative overflow-hidden group hover:border-primary/30 transition-all duration-300">
                            {/* Accent Line */}
                            <div className={cn(
                                "absolute top-0 left-0 w-full h-1",
                                req.type === 'UPGRADE' ? "bg-blue-500" : "bg-emerald-500"
                            )} />

                            <div className="p-6">
                                <div className="flex items-start justify-between mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "w-12 h-12 rounded-2xl flex items-center justify-center border",
                                            req.type === 'UPGRADE' ? "bg-blue-500/10 border-blue-500/20 text-blue-400" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                        )}>
                                            {req.type === 'UPGRADE' ? <ArrowUp className="w-6 h-6" /> : <Calendar className="w-6 h-6" />}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-white uppercase tracking-tight">
                                                {req.type} REQUEST
                                            </h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge variant="outline" className="text-[9px] py-0 px-2 font-black tracking-[0.1em]">
                                                    ID: #{req.id.slice(-6)}
                                                </Badge>
                                                <span className="text-[10px] text-text-tertiary flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {format(new Date(req.createdAt), 'MMM dd, hh:mm a')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] font-black text-text-tertiary uppercase tracking-widest mb-1">Total Extra</p>
                                        <p className="text-lg font-black text-emerald-400">
                                            +{formatCurrency(req.details.extraCharge)}
                                        </p>
                                    </div>
                                </div>

                                {/* Details Grid */}
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-[9px] font-black text-text-tertiary uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                                <User className="w-3 h-3" /> Guest Details
                                            </p>
                                            <p className="text-sm font-bold text-white">{req.booking?.guest?.name}</p>
                                            <p className="text-[11px] text-text-secondary mt-0.5">Room {req.booking?.room?.roomNumber} ({req.booking?.room?.type})</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-text-tertiary uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                                <RefreshCw className="w-3 h-3" /> Requested By
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <Avatar name={req.requestedBy?.name} size="xs" />
                                                <span className="text-xs font-semibold text-text-secondary">{req.requestedBy?.name}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-black/20 rounded-2xl p-4 border border-white/5 flex flex-col justify-center">
                                        {req.type === 'UPGRADE' ? (
                                            <>
                                                <p className="text-[9px] font-black text-text-tertiary uppercase tracking-widest mb-2">Target Room</p>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                                        <Building2 className="w-4 h-4 text-blue-400" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-white">Room {req.details.newRoomId?.slice(-3)}</p>
                                                        <p className="text-[9px] text-text-tertiary uppercase font-bold">Premium Tier</p>
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <p className="text-[9px] font-black text-text-tertiary uppercase tracking-widest mb-2">New Checkout</p>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                                        <Calendar className="w-4 h-4 text-emerald-400" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-white">
                                                            {format(new Date(req.details.newCheckOut), 'EEE, MMM dd')}
                                                        </p>
                                                        <p className="text-[9px] text-text-tertiary uppercase font-bold">Extended Stay</p>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                {req.status === 'PENDING' ? (
                                    <div className="flex gap-3 pt-4 border-t border-white/[0.05]">
                                        <button
                                            disabled={processingId === req.id}
                                            onClick={() => handleProcess(req.id, 'APPROVE')}
                                            className="flex-1 h-11 bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                            {processingId === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                            Approve Request
                                        </button>
                                        <button
                                            disabled={processingId === req.id}
                                            onClick={() => {
                                                const reason = window.prompt('Enter rejection reason:')
                                                if (reason !== null) handleProcess(req.id, 'REJECT', reason)
                                            }}
                                            className="h-11 px-6 bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/20 text-text-tertiary hover:text-red-400 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                            Reject
                                        </button>
                                    </div>
                                ) : (
                                    <div className="pt-4 border-t border-white/[0.05] flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            {req.status === 'APPROVED' ? (
                                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                            ) : (
                                                <XCircle className="w-4 h-4 text-red-500" />
                                            )}
                                            <span className={cn(
                                                "text-[10px] font-black uppercase tracking-widest",
                                                req.status === 'APPROVED' ? "text-emerald-500" : "text-red-500"
                                            )}>
                                                {req.status}
                                            </span>
                                        </div>
                                        {req.rejectionReason && (
                                            <p className="text-[10px] text-text-tertiary italic">
                                                &quot;{req.rejectionReason}&quot;
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
