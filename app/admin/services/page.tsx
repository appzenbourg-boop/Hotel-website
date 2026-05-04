'use client'

import { useState, useEffect, useMemo } from 'react'
import useSWR from 'swr'
import { useSession } from 'next-auth/react'
import { buildContextUrl, getAdminContext } from '@/lib/admin-context'
import {
    Plus, Search, Clock, AlertTriangle, CheckCircle2,
    Users, LayoutGrid, RefreshCw, User,
    Utensils, Brush, Settings as Tools, Shirt, AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { differenceInMinutes, differenceInSeconds } from 'date-fns'
import { useRouter } from 'next/navigation'
import Modal from '@/components/ui/Modal'
import Select from '@/components/ui/Select'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import Button from '@/components/ui/Button'

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
    try {
        const start = new Date(timeStr)
        const now = new Date()
        const mins = differenceInMinutes(now, start)
        const secs = differenceInSeconds(now, start) % 60
        return `${mins}m ${secs}s`
    } catch { return '0m 0s' }
}

const getSLAPrecent = (timeStr: string, limit: number) => {
    try {
        const start = new Date(timeStr)
        const now = new Date()
        const mins = differenceInMinutes(now, start)
        return Math.min(100, (mins / (limit || 30)) * 100)
    } catch { return 0 }
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

export default function ServicesPage() {
    const router = useRouter()
    const [search, setSearch] = useState('')
    const [typeFilter, setTypeFilter] = useState('ALL')
    const [statusFilter, setStatusFilter] = useState('ALL')
    const [staffFilter, setStaffFilter] = useState('ALL')

    const [showAddModal, setShowAddModal] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [newRequestData, setNewRequestData] = useState({
        type: 'HOUSEKEEPING', roomNumber: '', title: '', description: '', priority: 'NORMAL'
    })

    const [showSettingsModal, setShowSettingsModal] = useState(false)
    const [selectedConfigType, setSelectedConfigType] = useState('FOOD_ORDER')
    const [configSteps, setConfigSteps] = useState<{ name: string, duration: number }[]>([])
    const [configOptions, setConfigOptions] = useState<{ label: string, icon: string, desc: string }[]>([])
    const [isSavingConfig, setIsSavingConfig] = useState(false)

    const { data: session } = useSession()
    
    const currentPropertyId = useMemo(() => {
        if (session?.user?.role === 'SUPER_ADMIN') return getAdminContext().propertyId
        return session?.user?.propertyId
    }, [session])

    const fetcher = (url: string) => fetch(url).then(res => res.json()).then(json => Array.isArray(json) ? json : (json?.data ?? []))

    const { data: requests = [], isLoading: reqLoading, mutate: mutateRequests } = useSWR(
        currentPropertyId ? buildContextUrl('/api/admin/services', { status: 'ALL' }) : null,
        fetcher,
        { refreshInterval: 10000 }
    )

    const { data: rooms = [], mutate: mutateRooms } = useSWR(
        currentPropertyId ? buildContextUrl('/api/admin/rooms') : null,
        fetcher
    )

    const { data: serviceConfigs = [], mutate: mutateConfigs } = useSWR(
        currentPropertyId ? buildContextUrl('/api/admin/service-configs') : null,
        fetcher
    )

    const stats = useMemo(() => ({
        pending: requests.filter((r: any) => r.status === 'PENDING').length,
        active: requests.filter((r: any) => ['ACCEPTED', 'IN_PROGRESS'].includes(r.status)).length,
        overdue: requests.filter((r: any) => r.status === 'OVERDUE').length
    }), [requests])

    useEffect(() => {
        const config = serviceConfigs.find((c: any) => c.type === selectedConfigType)
        if (config) {
            setConfigSteps(config.steps.map((s: any) => ({ name: s.name, duration: s.duration })))
            setConfigOptions(config.options || [])
        } else {
            setConfigSteps([{ name: '', duration: 10 }])
            setConfigOptions([])
        }
    }, [selectedConfigType, serviceConfigs])

    const filtered = useMemo(() => {
        if (!Array.isArray(requests)) return []
        return requests.filter((r: any) => {
            const matchesSearch = r.title?.toLowerCase().includes(search.toLowerCase()) ||
                r.room?.toLowerCase().includes(search.toLowerCase()) ||
                r.guest?.toLowerCase().includes(search.toLowerCase())
            const matchesType = typeFilter === 'ALL' || r.type === typeFilter
            const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter
            const matchesStaff = staffFilter === 'ALL' || (r.assignedTo?.id === staffFilter)
            return matchesSearch && matchesType && matchesStatus && matchesStaff
        })
    }, [requests, search, typeFilter, statusFilter, staffFilter])

    const handleNewRequest = async (e: any) => {
        e.preventDefault()
        if (!newRequestData.roomNumber || !newRequestData.title) return toast.error('Required fields missing')
        setIsSubmitting(true)
        try {
            const room = rooms.find((r: any) => r.roomNumber === newRequestData.roomNumber)
            if (!room) throw new Error('Invalid room')
            const res = await fetch('/api/admin/services', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...newRequestData, roomId: room.id })
            })
            if (res.ok) {
                toast.success('Created')
                setShowAddModal(false)
                mutateRequests()
            }
        } catch (err: any) { toast.error(err.message) }
        finally { setIsSubmitting(false) }
    }

    const handleSaveConfig = async () => {
        setIsSavingConfig(true)
        try {
            const res = await fetch(buildContextUrl('/api/admin/service-configs'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: selectedConfigType, steps: configSteps, options: configOptions })
            })
            if (res.ok) {
                toast.success('Updated')
                mutateConfigs()
            }
        } catch { toast.error('Error') }
        finally { setIsSavingConfig(false) }
    }

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] bg-[#101922] overflow-hidden">
            <div className="shrink-0 p-6 sm:px-8 bg-[#101922] border-b border-white/[0.06]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">Service Operations</h1>
                        <p className="text-sm text-gray-500 mt-1">Manage guest requests</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="secondary" onClick={() => setShowSettingsModal(true)}>
                            <Tools className="w-4 h-4 mr-2" /> Settings
                        </Button>
                        <Button onClick={() => setShowAddModal(true)}>
                            <Plus className="w-4 h-4 mr-2" /> New Request
                        </Button>
                    </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Pending', value: stats.pending, color: 'text-amber-500', icon: Clock },
                        { label: 'Active', value: stats.active, color: 'text-blue-500', icon: AlertTriangle },
                        { label: 'Overdue', value: stats.overdue, color: 'text-rose-500', icon: AlertTriangle },
                        { label: 'Done Today', value: requests.filter((r: any) => r.status === 'COMPLETED').length, color: 'text-emerald-500', icon: CheckCircle2 },
                    ].map((s, i) => {
                        const Icon = s.icon
                        return (
                            <div key={i} className="bg-white/[0.02] border border-white/[0.04] rounded-2xl p-4 flex items-center justify-between">
                                <div><p className="text-[10px] font-bold uppercase text-gray-500 mb-1">{s.label}</p><p className={cn("text-2xl font-bold", s.color)}>{s.value}</p></div>
                                <Icon className={cn("w-5 h-5 opacity-20", s.color)} />
                            </div>
                        )
                    })}
                </div>
            </div>

            <div className="flex-1 flex flex-col min-w-0 bg-[#101922] overflow-auto">
                <div className="p-4 sm:px-8 border-b border-white/[0.06] flex gap-4">
                    <input className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-2 text-sm text-white flex-1" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
                    <button onClick={() => mutateRequests()} className="p-2 hover:bg-white/[0.04] rounded-xl"><RefreshCw className="w-4 h-4 text-gray-600" /></button>
                </div>
                <table className="w-full text-left">
                    <thead className="bg-[#0f1115] border-b border-white/[0.06] sticky top-0">
                        <tr>
                            <th className="px-8 py-4 text-[10px] font-bold text-gray-600 uppercase">Type</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-gray-600 uppercase">Room</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-gray-600 uppercase">Guest</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-gray-600 uppercase">SLA</th>
                            <th className="px-4 py-4 text-right pr-10 text-[10px] font-bold text-gray-600 uppercase">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reqLoading ? Array(5).fill(0).map((_, i) => <SkeletonRow key={i} />) : filtered.map((req: any) => (
                            <tr key={req.id} onClick={() => router.push(`/admin/services/${req.id}`)} className="border-b border-white/[0.03] hover:bg-white/[0.02] cursor-pointer">
                                <td className="px-8 py-5"><div className="flex items-center gap-4"><div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border", getServiceColor(req.type))}>{getServiceIcon(req.type)}</div><div><p className="text-sm font-bold text-white">{req.title}</p></div></div></td>
                                <td className="px-6 py-5 text-white font-bold">{req.room}</td>
                                <td className="px-6 py-5 text-gray-400 text-sm">{req.guest}</td>
                                <td className="px-6 py-5"><div className="text-xs text-emerald-400 font-bold">{getElapsedTime(req.requestTime)}</div></td>
                                <td className="px-4 py-5 text-right pr-10"><span className={cn('px-3 py-1 text-[10px] font-bold uppercase rounded-full border', getStatusStyle(req.status))}>{req.status}</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="New Request">
                <form onSubmit={handleNewRequest} className="space-y-4 pt-4">
                    <Select label="Type" value={newRequestData.type} onChange={e => setNewRequestData({ ...newRequestData, type: e.target.value })} options={[{ value: 'HOUSEKEEPING', label: 'Housekeeping' }, { value: 'FOOD_ORDER', label: 'Food & Beverage' }]} />
                    <Input label="Room" value={newRequestData.roomNumber} onChange={e => setNewRequestData({ ...newRequestData, roomNumber: e.target.value })} placeholder="Room Number" />
                    <Input label="Title" value={newRequestData.title} onChange={e => setNewRequestData({ ...newRequestData, title: e.target.value })} placeholder="Request Title" />
                    <div className="flex justify-end gap-3 pt-4"><Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button><Button type="submit" loading={isSubmitting}>Create</Button></div>
                </form>
            </Modal>
        </div>
    )
}
