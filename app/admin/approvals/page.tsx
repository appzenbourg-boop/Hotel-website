'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { 
    CheckCircle2, XCircle, Clock, ArrowUp, Calendar, 
    User, Search, Loader2, RefreshCw, AlertCircle,
    Building2, Hash, CreditCard, X
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
    const [rejectingRequest, setRejectingRequest] = useState<any | null>(null)
    const [rejectionReason, setRejectionReason] = useState('')

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
                    <h1 className="text-3xl font-bold text-text-primary tracking-tight">Operation Approvals</h1>
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
                                    ? "bg-primary text-text-primary shadow-lg" 
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
                    <h3 className="text-lg font-bold text-text-primary uppercase tracking-tight">Queue Clear</h3>
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
                                            <h3 className="text-lg font-black text-text-primary uppercase tracking-tight">
                                                {req.type} REQUEST
                                            </h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge variant="secondary" className="text-[9px] py-0 px-2 font-black tracking-[0.1em]">
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
                                            <p className="text-sm font-bold text-text-primary">{req.booking?.guest?.name}</p>
                                            <p className="text-[11px] text-text-secondary mt-0.5">Room {req.booking?.room?.roomNumber} ({req.booking?.room?.type})</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-text-tertiary uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                                <RefreshCw className="w-3 h-3" /> Requested By
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <Avatar name={req.requestedBy?.name} size="sm" />
                                                <span className="text-xs font-semibold text-text-secondary">{req.requestedBy?.name}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-black/20 rounded-2xl p-4 border border-border flex flex-col justify-center">
                                        {req.type === 'UPGRADE' ? (
                                            <>
                                                <p className="text-[9px] font-black text-text-tertiary uppercase tracking-widest mb-2">Target Room</p>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                                        <Building2 className="w-4 h-4 text-blue-400" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-text-primary">Room {req.details.newRoomId?.slice(-3)}</p>
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
                                                        <p className="text-sm font-black text-text-primary">
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
                                    <div className="flex gap-3 pt-4 border-t border-border">
                                        <button
                                            disabled={processingId === req.id}
                                            onClick={() => handleProcess(req.id, 'APPROVE')}
                                            className="flex-1 h-11 bg-emerald-600 text-white text-[11px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                            {processingId === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                            Approve Request
                                        </button>
                                        <button
                                            disabled={processingId === req.id}
                                            onClick={() => {
                                                setRejectingRequest(req)
                                                setRejectionReason('')
                                            }}
                                            className="h-11 px-6 bg-white/5 hover:bg-red-500/10 border border-border/50 hover:border-red-500/20 text-text-tertiary hover:text-red-400 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                            Reject
                                        </button>
                                    </div>
                                ) : (
                                    <div className="pt-4 border-t border-border flex items-center justify-between">
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

            {/* Rejection Modal Popup */}
            {rejectingRequest && (
                <div 
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={(e) => {
                        if (e.target === e.currentTarget && processingId !== rejectingRequest.id) {
                            setRejectingRequest(null)
                        }
                    }}
                >
                    <div className="bg-surface border border-border rounded-3xl w-full max-w-md flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="p-6 border-b border-border bg-surface-light flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shrink-0">
                                    <XCircle className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-text-primary tracking-tight">Reject Request</h2>
                                    <p className="text-xs text-text-secondary mt-0.5">
                                        {rejectingRequest.type} #{rejectingRequest.id.slice(-6)} • {rejectingRequest.booking?.guest?.name || 'Guest'}
                                    </p>
                                </div>
                            </div>
                            <button 
                                type="button"
                                onClick={() => setRejectingRequest(null)}
                                disabled={processingId === rejectingRequest.id}
                                className="p-2 hover:bg-surface rounded-xl text-text-tertiary hover:text-text-primary transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase text-text-tertiary tracking-widest mb-2 block">
                                    Quick Reasons
                                </label>
                                <div className="flex flex-wrap gap-1.5">
                                    {[
                                        'Room unavailable',
                                        'Housekeeping delay',
                                        'Rate discrepancy',
                                        'Guest cancelled',
                                        'Operational conflict'
                                    ].map(r => (
                                        <button
                                            key={r}
                                            type="button"
                                            onClick={() => setRejectionReason(r)}
                                            className={cn(
                                                "px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all",
                                                rejectionReason === r
                                                    ? "bg-red-500/20 border-red-500/40 text-red-400"
                                                    : "bg-surface-light border-border text-text-secondary hover:text-text-primary hover:bg-surface"
                                            )}
                                        >
                                            {r}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase text-text-tertiary tracking-widest mb-1.5 block">
                                    Rejection Reason / Note
                                </label>
                                <textarea
                                    value={rejectionReason}
                                    onChange={e => setRejectionReason(e.target.value)}
                                    placeholder="Enter rejection reason for the guest & audit log..."
                                    rows={3}
                                    autoFocus
                                    className="w-full bg-surface-light border border-border rounded-xl p-3 text-xs text-text-primary outline-none focus:border-red-500/50 resize-none transition-all placeholder:text-text-tertiary"
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                            handleProcess(
                                                rejectingRequest.id,
                                                'REJECT',
                                                rejectionReason.trim() || 'Request rejected by management'
                                            ).then(() => setRejectingRequest(null))
                                        }
                                    }}
                                />
                                <p className="text-[10px] text-text-tertiary mt-1">Press Ctrl+Enter or click below to submit</p>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-border bg-surface-light/50 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setRejectingRequest(null)}
                                disabled={processingId === rejectingRequest.id}
                                className="px-4 py-2.5 rounded-xl bg-surface hover:bg-surface-light text-text-secondary text-xs font-bold transition-colors border border-border"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={processingId === rejectingRequest.id}
                                onClick={async () => {
                                    await handleProcess(
                                        rejectingRequest.id, 
                                        'REJECT', 
                                        rejectionReason.trim() || 'Request rejected by management'
                                    )
                                    setRejectingRequest(null)
                                }}
                                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shadow-lg shadow-red-500/20 flex items-center gap-2 disabled:opacity-50"
                            >
                                {processingId === rejectingRequest.id ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Rejecting...</span>
                                    </>
                                ) : (
                                    <>
                                        <XCircle className="w-4 h-4" />
                                        <span>Confirm Rejection</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
