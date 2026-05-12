'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import useSWR from 'swr'
import { useSession } from 'next-auth/react'
import { buildContextUrl, getAdminContext } from '@/lib/admin-context'
import {
    Plus, Search, Clock, AlertTriangle, CheckCircle2,
    Users, LayoutGrid, Filter, ChevronRight, RefreshCw, User,
    Utensils, Brush, Settings as Tools, Shirt, AlertCircle, Loader2, Zap
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { format, differenceInMinutes, differenceInSeconds } from 'date-fns'
import { useRouter } from 'next/navigation'
import Modal from '@/components/ui/Modal'
import Select from '@/components/ui/Select'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import Button from '@/components/ui/Button'

/* ───────────────── types ───────────────── */
type ServiceStatus = 'PENDING' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'OVERDUE'
type ServiceType = 'HOUSEKEEPING' | 'FOOD_ORDER' | 'MAINTENANCE' | 'CONCIERGE' | 'LAUNDRY'

/* ───────────────── helpers ───────────────── */
const getServiceIcon = (type: string) => {
    switch (type) {
        case 'FOOD_ORDER': return <Utensils className="w-4 h-4" />
        case 'HOUSEKEEPING': return <Brush className="w-4 h-4" />
        case 'MAINTENANCE': return <Tools className="w-4 h-4" />
        case 'LAUNDRY': return <Shirt className="w-4 h-4" />
        default: return <AlertCircle className="w-4 h-4" />
    }
}

const getServiceColor = (type: string) => {
    switch (type) {
        case 'FOOD_ORDER': return 'bg-purple-500/10 text-purple-400 border-purple-500/20'
        case 'HOUSEKEEPING': return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
        case 'MAINTENANCE': return 'bg-orange-500/10 text-orange-400 border-orange-500/20'
        case 'LAUNDRY': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
        default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
    }
}

const getStatusStyle = (status: string) => {
    switch (status) {
        case 'OVERDUE': return 'bg-rose-500/10 text-rose-500 border-rose-500/20'
        case 'IN_PROGRESS': return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
        case 'COMPLETED': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
        case 'PENDING': return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
        case 'ACCEPTED': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
        default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
    }
}

const getElapsedTime = (timeStr: string) => {
    const start = new Date(timeStr)
    const now = new Date()
    const mins = differenceInMinutes(now, start)
    const secs = differenceInSeconds(now, start) % 60
    return `${mins}m ${secs}s`
}

const getSLAPrecent = (timeStr: string, limit: number) => {
    const start = new Date(timeStr)
    const now = new Date()
    const mins = differenceInMinutes(now, start)
    return Math.min(100, (mins / (limit || 30)) * 100)
}

const SkeletonRow = () => (
    <tr className="border-b border-white/[0.03] animate-pulse">
        <td className="px-8 py-5">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/[0.05] border border-white/[0.05]" />
                <div className="space-y-2">
                    <div className="w-32 h-4 bg-white/[0.05] rounded" />
                    <div className="w-20 h-3 bg-white/[0.03] rounded" />
                </div>
            </div>
        </td>
        <td className="px-6 py-5"><div className="w-12 h-6 bg-white/[0.05] rounded" /></td>
        <td className="px-6 py-5"><div className="w-28 h-4 bg-white/[0.05] rounded" /></td>
        <td className="px-6 py-5"><div className="w-24 h-8 bg-white/[0.05] rounded-xl" /></td>
        <td className="px-6 py-5">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/[0.05]" />
                <div className="w-24 h-4 bg-white/[0.05] rounded" />
            </div>
        </td>
        <td className="px-4 py-5 text-right pr-10">
            <div className="w-20 h-6 bg-white/[0.05] rounded-full ml-auto" />
        </td>
    </tr>
)

/* ───────────────── Components ───────────────── */
function KpiSection({ stats, requests }: { stats: any, requests: any[] }) {
    const kpiData = [
        { label: 'Pending Approval', value: stats.pending, color: 'text-amber-500', icon: Clock },
        { label: 'Active Work', value: stats.active, color: 'text-blue-500', icon: AlertTriangle },
        { label: 'Critical SLA', value: stats.overdue, color: 'text-rose-500', icon: AlertTriangle },
        {
            label: 'Completed Today',
            value: (requests || []).filter((r: any) => {
                if (r.status !== 'COMPLETED') return false;
                const dateToUse = r.completedAt || r.updatedAt || r.createdAt;
                if (!dateToUse) return false;
                const completedDate = new Date(dateToUse);
                const today = new Date();
                return completedDate.getDate() === today.getDate() &&
                    completedDate.getMonth() === today.getMonth() &&
                    completedDate.getFullYear() === today.getFullYear();
            }).length,
            color: 'text-emerald-500',
            icon: CheckCircle2
        },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {kpiData.map((s, i) => {
                const Icon = s.icon;
                return (
                    <div key={i} className="bg-white/[0.02] border border-white/[0.04] rounded-2xl p-4 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">{s.label}</p>
                            <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
                        </div>
                        <Icon className={cn("w-5 h-5 opacity-20", s.color)} />
                    </div>
                );
            })}
        </div>
    );
}

export default function ServicesPage() {
    const router = useRouter();
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [staffFilter, setStaffFilter] = useState('ALL');

    const [showAddModal, setShowAddModal] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [newRequestData, setNewRequestData] = useState({
        type: 'HOUSEKEEPING',
        roomNumber: '',
        title: '',
        description: '',
        priority: 'NORMAL'
    });

    const [selectedConfigType, setSelectedConfigType] = useState<ServiceType>('FOOD_ORDER');
    const [configSteps, setConfigSteps] = useState<{ name: string, duration: number }[]>([]);
    const [configOptions, setConfigOptions] = useState<{ label: string, icon: string, desc: string }[]>([]);
    const [isSavingConfig, setIsSavingConfig] = useState(false);

    const { data: session } = useSession();

    const currentPropertyId = useMemo(() => {
        if (session?.user?.role === 'SUPER_ADMIN') return getAdminContext().propertyId;
        return session?.user?.propertyId;
    }, [session]);

    const fetcher = (url: string) => fetch(url).then(res => res.json()).then(json => json?.data ?? json);

    const {
        data: requests = [],
        isLoading: reqLoading,
        mutate: mutateRequests
    } = useSWR(currentPropertyId ? buildContextUrl('/api/admin/services', { status: 'ALL' }) : null, fetcher, {
        refreshInterval: 10000
    });

    const { data: rooms = [] } = useSWR(
        currentPropertyId ? buildContextUrl('/api/admin/rooms') : null,
        fetcher
    );

    const { data: serviceConfigs = [], mutate: mutateConfigs } = useSWR(
        currentPropertyId ? buildContextUrl('/api/admin/service-configs') : null,
        fetcher
    );

    const stats = useMemo(() => ({
        pending: requests.filter((r: any) => r.status === 'PENDING').length,
        active: requests.filter((r: any) => ['ACCEPTED', 'IN_PROGRESS'].includes(r.status)).length,
        overdue: requests.filter((r: any) => r.status === 'OVERDUE').length
    }), [requests]);

    const handleNewRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newRequestData.roomNumber || !newRequestData.title) return toast.error('Please fill required fields');

        setIsSubmitting(true);
        try {
            const room = rooms.find((r: any) => r.roomNumber === newRequestData.roomNumber);
            if (!room) throw new Error('Selected room not found');

            const res = await fetch('/api/admin/services', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...newRequestData, roomId: room.id })
            });

            if (res.ok) {
                toast.success('Service request created successfully');
                setShowAddModal(false);
                mutateRequests();
            } else {
                const err = await res.json();
                throw new Error(err.error || 'Failed to create request');
            }
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSaveConfig = async () => {
        setIsSavingConfig(true);
        try {
            const res = await fetch(buildContextUrl('/api/admin/service-configs'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: selectedConfigType,
                    steps: configSteps,
                    options: configOptions
                })
            });

            if (res.ok) {
                toast.success('Configuration updated');
                mutateConfigs();
            } else {
                toast.error('Failed to update configuration');
            }
        } catch (error) {
            toast.error('Error saving configuration');
        } finally {
            setIsSavingConfig(false);
        }
    };

    useEffect(() => {
        const config = serviceConfigs.find((c: any) => c.type === selectedConfigType);
        if (config) {
            setConfigSteps(config.steps.map((s: any) => ({ name: s.name, duration: s.duration })));
            setConfigOptions(config.options || []);
        } else {
            setConfigSteps([{ name: '', duration: 10 }]);
            setConfigOptions([]);
        }
    }, [selectedConfigType, serviceConfigs]);

    const filtered = useMemo(() => {
        if (!Array.isArray(requests)) return [];
        return requests.filter((r: any) => {
            const matchesSearch = r.title.toLowerCase().includes(search.toLowerCase()) ||
                r.room.toLowerCase().includes(search.toLowerCase()) ||
                r.guest.toLowerCase().includes(search.toLowerCase());
            const matchesType = typeFilter === 'ALL' || r.type === typeFilter;
            const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
            const matchesStaff = staffFilter === 'ALL' || (r.assignedTo?.id === staffFilter);
            return matchesSearch && matchesType && matchesStatus && matchesStaff;
        });
    }, [requests, search, typeFilter, statusFilter, staffFilter]);

    return (
        <div className="flex flex-col bg-[#101922] w-full min-h-screen animate-fade-in pb-20">
            <div className="shrink-0 p-6 sm:px-8 bg-[#101922] border-b border-white/[0.06]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">Service Operations</h1>
                        <p className="text-sm text-gray-500 mt-1">Manage and track guest requests in real-time</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="secondary" className="bg-white/[0.04] border-white/[0.1] hover:bg-white/[0.08]" onClick={() => router.push('/admin/rooms')}>
                            <LayoutGrid className="w-4 h-4 mr-2" /> Room Config
                        </Button>
                        <Button variant="secondary" className="bg-white/[0.04] border-white/[0.1] hover:bg-white/[0.08]" onClick={() => setShowSettingsModal(true)}>
                            <Tools className="w-4 h-4 mr-2" /> Edit Timers
                        </Button>
                        <Button onClick={() => setShowAddModal(true)} className="shadow-lg shadow-blue-500/20">
                            <Plus className="w-4 h-4 mr-2" /> Create New Request
                        </Button>
                    </div>
                </div>
                <KpiSection stats={stats} requests={requests} />
            </div>

            <div className="flex-1 flex flex-col min-w-0 bg-[#101922]">
                <div className="shrink-0 flex flex-wrap items-center gap-3 p-4 sm:px-8 py-3 border-b border-white/[0.06]">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                        <input
                            type="text"
                            placeholder="Search by room, guest or item..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full bg-white/[0.02] border border-white/[0.06] rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder:text-gray-700 outline-none focus:border-blue-500/40 transition-colors"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-3 py-2 text-xs text-gray-400 font-bold outline-none cursor-pointer hover:border-white/10">
                            <option value="ALL">All Services</option>
                            <option value="HOUSEKEEPING">Housekeeping</option>
                            <option value="FOOD_ORDER">Food & Bv.</option>
                            <option value="MAINTENANCE">Maintenance</option>
                            <option value="LAUNDRY">Laundry</option>
                        </select>
                        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-3 py-2 text-xs text-gray-400 font-bold outline-none cursor-pointer hover:border-white/10">
                            <option value="ALL">All Status</option>
                            <option value="PENDING">Pending</option>
                            <option value="ACCEPTED">Accepted</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="COMPLETED">Completed</option>
                        </select>
                        <button onClick={() => mutateRequests()} className="p-2 hover:bg-white/[0.04] rounded-xl transition-colors">
                            <RefreshCw className={cn("w-4 h-4 text-gray-600", reqLoading && "animate-spin")} />
                        </button>
                    </div>
                </div>

                <div className="w-full">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-[#0f1115] z-20 border-b border-white/[0.06]">
                            <tr>
                                <th className="px-8 py-4 text-[10px] font-bold text-gray-600 uppercase tracking-widest">Request Type</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-600 uppercase tracking-widest">Room #</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-600 uppercase tracking-widest">Guest Name</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-600 uppercase tracking-widest">Time Elapsed (SLA)</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-600 uppercase tracking-widest">Assigned Staff</th>
                                <th className="px-6 py-4 text-right pr-10 text-[10px] font-bold text-gray-600 uppercase tracking-widest">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reqLoading && requests.length === 0 ? (
                                Array(6).fill(0).map((_: any, i: number) => <SkeletonRow key={i} />)
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={6} className="py-20 text-center text-gray-500">No requests found matching filters</td></tr>
                            ) : (
                                filtered.map((req: any) => (
                                    <tr key={req.id} onClick={() => router.push(`/admin/services/${req.id}`)} className="group cursor-pointer border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors relative">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-lg", getServiceColor(req.type))}>{getServiceIcon(req.type)}</div>
                                                <div><p className="text-[15px] font-bold text-white leading-tight">{req.title}</p><p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">{req.type.toLowerCase().replace('_', ' ')}</p></div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5"><span className="text-lg font-bold text-white">{req.room}</span></td>
                                        <td className="px-6 py-5 text-[14px] font-bold text-gray-300">{req.guest}</td>
                                        <td className="px-6 py-5"><div className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[12px] font-bold border", req.status === 'OVERDUE' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : getSLAPrecent(req.requestTime, req.slaLimit) > 75 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-[#1db954]/10 text-[#1db954] border-[#1db954]/20')}><Clock className="w-3.5 h-3.5" />{getElapsedTime(req.requestTime)}</div></td>
                                        <td className="px-6 py-5">{req.assignedTo ? (<div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center overflow-hidden border border-blue-500/30">{req.assignedTo.photo ? <img src={req.assignedTo.photo} alt="" className="w-full h-full object-cover" /> : <User className="w-4 h-4 text-blue-400" />}</div><span className="text-[13px] font-bold text-gray-300">{req.assignedTo.name || 'Staff Member'}</span></div>) : (<div className="flex items-center gap-3 text-gray-600"><div className="w-8 h-8 rounded-full bg-white/[0.03] border border-white/[0.05] flex items-center justify-center"><Users className="w-4 h-4" /></div><span className="text-[13px] font-medium">Unassigned</span></div>)}</td>
                                        <td className="px-4 py-5 text-right pr-10"><span className={cn('px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] rounded-full border', getStatusStyle(req.status))}>{req.status === 'ACCEPTED' ? 'OPEN' : req.status.replace('_', ' ')}</span></td>
                                    </tr>
                                )))}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Create Service Request" description="Manually log a request for a room">
                <form onSubmit={handleNewRequest} className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Select label="Service Type" value={newRequestData.type} onChange={e => setNewRequestData({ ...newRequestData, type: e.target.value })} options={[{ value: 'HOUSEKEEPING', label: 'Housekeeping' }, { value: 'FOOD_ORDER', label: 'Food & Beverage' }, { value: 'MAINTENANCE', label: 'Maintenance' }, { value: 'LAUNDRY', label: 'Laundry' }]} />
                        <Select label="Room" value={newRequestData.roomNumber} onChange={e => setNewRequestData({ ...newRequestData, roomNumber: e.target.value })} options={[{ value: '', label: 'Select Room' }, ...rooms.map((r: any) => ({ value: r.roomNumber, label: `Room ${r.roomNumber}` }))]} />
                    </div>
                    <Input label="Title / Item" placeholder="e.g. AC Repair, Morning Cleaning" value={newRequestData.title} onChange={e => setNewRequestData({ ...newRequestData, title: e.target.value })} required />
                    <Select label="Priority" value={newRequestData.priority} onChange={e => setNewRequestData({ ...newRequestData, priority: e.target.value })} options={[{ value: 'LOW', label: 'Low' }, { value: 'NORMAL', label: 'Normal' }, { value: 'HIGH', label: 'High' }, { value: 'URGENT', label: 'Urgent' }]} />
                    <Textarea label="Internal Notes" placeholder="Any specific details for staff..." value={newRequestData.description} onChange={e => setNewRequestData({ ...newRequestData, description: e.target.value })} rows={3} />
                    <div className="flex justify-end gap-3 mt-8"><Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button><Button type="submit" loading={isSubmitting}>Create Request</Button></div>
                </form>
            </Modal>

            <Modal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} title="Service SLA & Flow Settings" description="Define path and time for each service type">
                <div className="space-y-6 pt-4">
                    <Select label="Service Type" value={selectedConfigType} onChange={e => setSelectedConfigType(e.target.value as ServiceType)} options={[{ value: 'FOOD_ORDER', label: 'Food Order' }, { value: 'HOUSEKEEPING', label: 'Housekeeping' }, { value: 'ROOM_SERVICE', label: 'Room Service' }, { value: 'LAUNDRY', label: 'Laundry' }, { value: 'MAINTENANCE', label: 'Maintenance' }]} />
                    <div className="space-y-4">
                        <div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-widest text-gray-400">Path Steps & Durations</p><Button variant="secondary" size="sm" className="h-7 px-2 text-[10px]" onClick={() => setConfigSteps([...configSteps, { name: '', duration: 5 }])}><Plus className="w-3 h-3 mr-1" /> Add Step</Button></div>
                        {configSteps.map((step, i) => (
                            <div key={i} className="flex gap-3 items-end bg-white/[0.02] p-3 rounded-xl border border-white/[0.05]">
                                <div className="flex-1"><Input label={i === 0 ? "Step Name" : ""} placeholder="e.g. Cooking, Staff Transfer" value={step.name} onChange={e => { const next = [...configSteps]; next[i].name = e.target.value; setConfigSteps(next); }} /></div>
                                <div className="w-24"><Input type="number" label={i === 0 ? "Mins" : ""} value={step.duration.toString()} onChange={e => { const next = [...configSteps]; next[i].duration = parseInt(e.target.value) || 0; setConfigSteps(next); }} /></div>
                                <button onClick={() => setConfigSteps(configSteps.filter((_, idx) => idx !== i))} className="p-2 mb-1 h-9 rounded-lg hover:bg-rose-500/10 text-rose-500"><AlertCircle className="w-4 h-4 rotate-45" /></button>
                            </div>
                        ))}
                        <div className="bg-blue-500/5 p-4 rounded-xl border border-blue-500/10 flex justify-between items-center"><span className="text-sm font-bold text-blue-400">Total SLA Duration</span><span className="text-lg font-bold text-blue-400">{configSteps.reduce((acc, s) => acc + s.duration, 0)} Minutes</span></div>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-widest text-gray-400">Guest Options (App Display)</p><Button variant="secondary" size="sm" className="h-7 px-2 text-[10px]" onClick={() => setConfigOptions([...configOptions, { label: '', icon: '✨', desc: '' }])}><Plus className="w-3 h-3 mr-1" /> Add Option</Button></div>
                        {configOptions.map((opt, i) => (
                            <div key={i} className="space-y-3 bg-white/[0.02] p-4 rounded-xl border border-white/[0.04]">
                                <div className="flex gap-3">
                                    <div className="w-16"><Input label="Emoji" value={opt.icon} onChange={e => { const next = [...configOptions]; next[i].icon = e.target.value; setConfigOptions(next); }} /></div>
                                    <div className="flex-1"><Input label="Label" placeholder="e.g. Full Clean" value={opt.label} onChange={e => { const next = [...configOptions]; next[i].label = e.target.value; setConfigOptions(next); }} /></div>
                                    <button onClick={() => setConfigOptions(configOptions.filter((_, idx) => idx !== i))} className="p-2 h-9 mt-6 rounded-lg hover:bg-rose-500/10 text-rose-500"><AlertCircle className="w-4 h-4 rotate-45" /></button>
                                </div>
                                <Input label="Guest Description" placeholder="Brief description for the guest..." value={opt.desc} onChange={e => { const next = [...configOptions]; next[i].desc = e.target.value; setConfigOptions(next); }} />
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-end gap-3 mt-8"><Button variant="secondary" onClick={() => setShowSettingsModal(false)}>Cancel</Button><Button onClick={handleSaveConfig} loading={isSavingConfig}>Save Changes</Button></div>
                </div>
            </Modal>
        </div>
    );
}
