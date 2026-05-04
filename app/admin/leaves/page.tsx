'use client'

import { useState, useEffect, useCallback } from 'react'
import {
    CheckCircle2, XCircle, Clock,
    Calendar, User, Filter,
    ChevronRight, Search, Loader2,
    CalendarDays, Umbrella, Stethoscope, Briefcase, Camera
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { toast } from 'sonner'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'

export default function LeavesManagementPage() {
    const [loading, setLoading] = useState(true)
    const [requests, setRequests] = useState<any[]>([])
    const [filterStatus, setFilterStatus] = useState('PENDING')
    const [selectedRequest, setSelectedRequest] = useState<any>(null)
    const [showProcessModal, setShowProcessModal] = useState(false)
    const [rejectionReason, setRejectionReason] = useState('')
    const [isProcessing, setIsProcessing] = useState(false)

    const fetchRequests = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/admin/leaves?status=${filterStatus}`)
            if (res.ok) {
                const json = await res.json()
                setRequests(Array.isArray(json) ? json : (json?.data ?? []))
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }, [filterStatus])

    useEffect(() => {
        fetchRequests()
    }, [fetchRequests])

    const handleProcess = async (status: 'APPROVED' | 'REJECTED') => {
        if (status === 'REJECTED' && !rejectionReason) {
            toast.error('Please provide a reason for rejection')
            return
        }

        setIsProcessing(true)
        try {
            const res = await fetch('/api/admin/leaves', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    requestId: selectedRequest.id,
                    status,
                    rejectionReason: status === 'REJECTED' ? rejectionReason : null
                })
            })

            if (res.ok) {
                toast.success(`Leave request ${status.toLowerCase()}`)
                setShowProcessModal(false)
                setSelectedRequest(null)
                setRejectionReason('')
                fetchRequests()
            } else {
                toast.error('Failed to update request')
            }
        } catch (error) {
            toast.error('Something went wrong')
        } finally {
            setIsProcessing(false)
        }
    }

    const getLeaveIcon = (type: string) => {
        switch (type) {
            case 'ANNUAL': return Umbrella;
            case 'SICK': return Stethoscope;
            case 'CASUAL': return Briefcase;
            default: return Calendar;
        }
    }

    return (
        <div className="space-y-8 animate-fade-in max-w-[1400px] mx-auto pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight ">Leave Approvals</h1>
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mt-1">Manage staff absence and time-off requests</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                        {['PENDING', 'APPROVED', 'REJECTED', 'ALL'].map((s) => (
                            <button
                                key={s}
                                onClick={() => setFilterStatus(s)}
                                className={cn(
                                    "px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                                    filterStatus === s ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-gray-500 hover:text-gray-300"
                                )}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {loading ? (
                    <div className="py-20 flex flex-col items-center gap-4">
                        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                        <p className="text-xs font-bold uppercase tracking-widest text-gray-700">Fetching requests...</p>
                    </div>
                ) : requests.length === 0 ? (
                    <div className="py-32 text-center bg-white/[0.02] border border-dashed border-white/10 rounded-[3rem]">
                        <CalendarDays className="w-16 h-16 text-gray-800 mx-auto mb-6" />
                        <p className="text-lg font-bold text-gray-600 ">No pending leave requests found</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {requests.map((req) => {
                            const Icon = getLeaveIcon(req.leaveType)
                            return (
                                <Card
                                    key={req.id}
                                    className="bg-[#161b22] border-white/5 rounded-[2.5rem] p-6 hover:border-blue-500/20 transition-all cursor-pointer group relative overflow-hidden"
                                    onClick={() => {
                                        setSelectedRequest(req)
                                        setShowProcessModal(true)
                                    }}
                                >
                                    <div className={cn(
                                        "absolute top-0 bottom-0 left-0 w-1",
                                        req.status === 'PENDING' ? 'bg-amber-500' :
                                            req.status === 'APPROVED' ? 'bg-emerald-500' : 'bg-rose-500'
                                    )} />

                                    <div className="flex items-start justify-between mb-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                                <Icon className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-white  tracking-tight">{req.staff.user.name}</h3>
                                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{req.staff.designation}</p>
                                            </div>
                                        </div>
                                        <Badge variant={req.status === 'PENDING' ? 'warning' : req.status === 'APPROVED' ? 'success' : 'danger'}>
                                            {req.status}
                                        </Badge>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="bg-black/20 rounded-2xl p-4 border border-white/5">
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Type</p>
                                                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">{req.leaveType}</p>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Duration</p>
                                                <p className="text-sm font-bold text-white ">{req.totalDays} Days</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 px-2">
                                            <div className="flex-1">
                                                <p className="text-[9px] font-bold text-gray-600 uppercase tracking-[0.2em] mb-1">From</p>
                                                <p className="text-xs font-bold text-white">{format(new Date(req.startDate), 'MMM dd, yyyy')}</p>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-gray-800" />
                                            <div className="flex-1 text-right">
                                                <p className="text-[9px] font-bold text-gray-600 uppercase tracking-[0.2em] mb-1">To</p>
                                                <p className="text-xs font-bold text-white">{format(new Date(req.endDate), 'MMM dd, yyyy')}</p>
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t border-white/5">
                                            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-2">Reason</p>
                                            <p className="text-xs font-medium text-gray-400 line-clamp-2 leading-relaxed ">&ldquo;{req.reason}&rdquo;</p>
                                        </div>

                                        {req.evidence && (
                                            <div className="pt-4 border-t border-white/5 flex items-center justify-between group/evidence">
                                                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Evidence Attached</p>
                                                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                                                    <Camera className="w-4 h-4 text-blue-500" />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {req.status === 'PENDING' && (
                                        <div className="mt-6 flex gap-3">
                                            <Button
                                                className="flex-1 bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500 hover:text-white h-11 text-[10px]"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setSelectedRequest(req)
                                                    handleProcess('APPROVED')
                                                }}
                                            >
                                                Approve
                                            </Button>
                                            <Button
                                                className="flex-1 bg-rose-500/10 border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white h-11 text-[10px]"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setSelectedRequest(req)
                                                    setShowProcessModal(true)
                                                }}
                                            >
                                                Reject
                                            </Button>
                                        </div>
                                    )}
                                </Card>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Process Modal */}
            <Modal
                isOpen={showProcessModal}
                onClose={() => !isProcessing && setShowProcessModal(false)}
                title="Process Leave Request"
                description={`Reviewing ${selectedRequest?.staff?.user?.name}'s request for ${selectedRequest?.totalDays} days.`}
                size="md"
            >
                <div className="space-y-6">
                    <div className="bg-white/5 rounded-2xl p-5 space-y-4">
                        <div className="flex justify-between">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Leave Type</span>
                            <span className="text-xs font-bold text-white">{selectedRequest?.leaveType}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Dates</span>
                            <span className="text-xs font-bold text-white">
                                {selectedRequest && format(new Date(selectedRequest.startDate), 'MMM dd')} - {selectedRequest && format(new Date(selectedRequest.endDate), 'MMM dd, yyyy')}
                            </span>
                        </div>
                        <div className="pt-3 border-t border-white/5">
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Employee Statement</p>
                            <p className="text-sm font-medium text-gray-300 leading-relaxed ">&ldquo;{selectedRequest?.reason}&rdquo;</p>
                        </div>

                        {selectedRequest?.evidence && (
                            <div className="pt-4 border-t border-white/5">
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Proof Documentation</p>
                                <div className="w-full h-48 rounded-2xl overflow-hidden border border-white/10 bg-black/40 relative group">
                                    <img 
                                        src={selectedRequest.evidence} 
                                        className="w-full h-full object-contain cursor-zoom-in transition-transform group-hover:scale-105" 
                                        alt="evidence" 
                                        onClick={() => window.open(selectedRequest.evidence, '_blank')}
                                    />
                                    <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-[9px] font-black text-white uppercase tracking-widest">Click to enlarge</span>
                                        <Camera className="w-3.5 h-3.5 text-blue-400" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Rejection Reason (If rejecting)</label>
                        <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="e.g. Operational requirement during peak dates..."
                            className="w-full bg-black/30 border border-white/10 rounded-2xl p-4 text-sm text-white outline-none focus:border-blue-500 transition-all min-h-[100px] resize-none"
                        ></textarea>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <Button
                            variant="secondary"
                            className="flex-1 h-14"
                            onClick={() => setShowProcessModal(false)}
                            disabled={isProcessing}
                        >
                            Cancel
                        </Button>
                        <div className="flex-[2] flex gap-3">
                            <Button
                                variant="primary"
                                className="flex-1 h-14 bg-emerald-600 hover:bg-emerald-500 border-none shadow-lg shadow-emerald-600/20"
                                onClick={() => handleProcess('APPROVED')}
                                loading={isProcessing}
                            >
                                Approve Request
                            </Button>
                            <Button
                                variant="secondary"
                                className="flex-1 h-14 bg-rose-600/10 border-rose-600/20 text-rose-500 hover:bg-rose-600 hover:text-white"
                                onClick={() => handleProcess('REJECTED')}
                                loading={isProcessing}
                            >
                                Reject
                            </Button>
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    )
}

