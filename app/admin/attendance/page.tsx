'use client'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Avatar from '@/components/common/Avatar'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import Select from '@/components/ui/Select'
import {
    Clock,
    MapPin,
    Calendar,
    Search,
    Filter,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Download,
    Eye,
    FileText,
    Edit3,
    Check,
    Save,
    UserCheck,
    X
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { downloadCSV } from '@/lib/csv'
import { buildContextUrl } from '@/lib/admin-context'

export default function AttendancePage() {
    const { data: session } = useSession()
    const userRole = session?.user?.role

    const [attendance, setAttendance] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [filterDate, setFilterDate] = useState(format(new Date(), 'yyyy-MM-dd'))
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState('ALL')

    // Detailed View State
    const [selectedRecord, setSelectedRecord] = useState<any>(null)
    const [showDetailModal, setShowDetailModal] = useState(false)

    // Regularize / Edit Attendance State
    const [editRecord, setEditRecord] = useState<any>(null)
    const [showEditModal, setShowEditModal] = useState(false)
    const [editStatus, setEditStatus] = useState<string>('PRESENT')
    const [editPunchIn, setEditPunchIn] = useState<string>('')
    const [editPunchOut, setEditPunchOut] = useState<string>('')
    const [editLocation, setEditLocation] = useState<string>('')
    const [editHours, setEditHours] = useState<string>('')
    const [editNotes, setEditNotes] = useState<string>('')
    const [isSaving, setIsSaving] = useState(false)

    const [stats, setStats] = useState({
        present: 0,
        late: 0,
        onLeave: 0,
        total: 0
    })

    // Staff specific state
    const [todayRecord, setTodayRecord] = useState<any>(null)
    const [isPunching, setIsPunching] = useState(false)

    const fetchAttendance = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch(buildContextUrl('/api/attendance', { date: filterDate }))
            if (res.ok) {
                const json = await res.json()
                const data = json?.data ?? json
                const list = data.attendances || data || []
                setAttendance(list)

                // Update stats
                const present = list.filter((a: any) => a.status === 'PRESENT').length
                const late = list.filter((a: any) => a.status === 'LATE').length
                const absent = list.filter((a: any) => a.status === 'ABSENT').length
                const onLeave = list.filter((a: any) => a.status === 'ON_LEAVE' || a.status === 'HALF_DAY').length
                
                setStats({
                    present,
                    late,
                    onLeave: absent + onLeave,
                    total: list.length
                })

                // If staff, find our own record for today
                if (userRole === 'STAFF') {
                    const myRecord = list.find((a: any) => a.staff?.userId === session?.user?.id)
                    setTodayRecord(myRecord || null)
                }
            }
        } catch (error) {
            toast.error('Failed to load attendance records')
        } finally {
            setLoading(false)
        }
    }, [filterDate, userRole, session?.user?.id])

    useEffect(() => {
        fetchAttendance()
    }, [fetchAttendance])

    // Filtered attendance list
    const filteredAttendance = useMemo(() => {
        return attendance.filter(a => {
            const matchesSearch = (a.staff?.user?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (a.staff?.department || '').toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = statusFilter === 'ALL' || a.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [attendance, searchQuery, statusFilter]);

    const handlePunch = async (action: 'PUNCH_IN' | 'PUNCH_OUT') => {
        setIsPunching(true)
        try {
            const res = await fetch('/api/attendance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, location: 'Main Entrance' })
            })

            if (res.ok) {
                toast.success(action === 'PUNCH_IN' ? 'Checked in successfully' : 'Checked out successfully')
                fetchAttendance()
            } else {
                const err = await res.json()
                toast.error(err.error || 'Failed to record attendance')
            }
        } catch (error) {
            toast.error('Network error. Try again.')
        } finally {
            setIsPunching(false)
        }
    }

    // Opens Edit / Regularization Modal
    const openEditModal = (record: any) => {
        setEditRecord(record)
        const currentStatus = record.status || 'PRESENT'
        setEditStatus(currentStatus === 'ABSENT' ? 'PRESENT' : currentStatus)
        
        const formatTimeInput = (dt: any) => {
            if (!dt) return ''
            try {
                const d = new Date(dt)
                if (isNaN(d.getTime())) return ''
                const h = String(d.getHours()).padStart(2, '0')
                const m = String(d.getMinutes()).padStart(2, '0')
                return `${h}:${m}`
            } catch {
                return ''
            }
        }

        const inTime = formatTimeInput(record.punchIn)
        const outTime = formatTimeInput(record.punchOut)

        // Default 09:00 - 18:00 if absent or not set
        setEditPunchIn(inTime || (record.status === 'ABSENT' ? '09:00' : '09:00'))
        setEditPunchOut(outTime || (record.status === 'ABSENT' ? '18:00' : '18:00'))
        setEditLocation(record.punchInLocation || 'Main Lobby')
        setEditHours(record.hoursWorked ? String(record.hoursWorked) : (record.status === 'ABSENT' ? '9' : '9'))
        setEditNotes(record.notes || record.note || '')
        setShowEditModal(true)
    }

    // Quick Mark Present Handler (09:00 AM - 06:00 PM)
    const handleQuickMarkPresent = async (record: any) => {
        try {
            const staffId = record.staffId || record.staff?.id
            if (!staffId) {
                toast.error('Staff ID not found')
                return
            }

            const buildDateTime = (dateStr: string, timeStr: string) => {
                const [h, m] = timeStr.split(':').map(Number)
                const d = new Date(dateStr)
                d.setHours(h, m, 0, 0)
                return d.toISOString()
            }

            const punchIn = buildDateTime(filterDate, '09:00')
            const punchOut = buildDateTime(filterDate, '18:00')

            const res = await fetch('/api/attendance', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    staffId,
                    date: filterDate,
                    status: 'PRESENT',
                    punchIn,
                    punchOut,
                    hoursWorked: 9,
                    location: 'Main Lobby',
                    notes: 'Marked PRESENT (09:00 AM - 06:00 PM) by HR Admin'
                })
            })

            if (res.ok) {
                toast.success(`Marked ${record.staff?.user?.name || 'Staff'} as PRESENT`)
                fetchAttendance()
            } else {
                const err = await res.json().catch(() => ({}))
                toast.error(err?.error || 'Failed to mark present')
            }
        } catch (e) {
            toast.error('Error updating attendance')
        }
    }

    // Save Attendance Regularization
    const handleSaveAttendance = async () => {
        if (!editRecord) return
        setIsSaving(true)
        try {
            const staffId = editRecord.staffId || editRecord.staff?.id
            if (!staffId) {
                toast.error('Staff ID not found')
                return
            }

            const buildDateTime = (dateStr: string, timeStr: string) => {
                if (!timeStr) return null
                const [h, m] = timeStr.split(':').map(Number)
                const d = new Date(dateStr)
                d.setHours(h, m, 0, 0)
                return d.toISOString()
            }

            const punchInIso = editStatus !== 'ABSENT' && editPunchIn ? buildDateTime(filterDate, editPunchIn) : null
            const punchOutIso = editStatus !== 'ABSENT' && editPunchOut ? buildDateTime(filterDate, editPunchOut) : null

            let hours = parseFloat(editHours)
            if (isNaN(hours) || hours <= 0) {
                if (punchInIso && punchOutIso) {
                    hours = parseFloat(((new Date(punchOutIso).getTime() - new Date(punchInIso).getTime()) / (1000 * 60 * 60)).toFixed(2))
                    if (hours < 0) hours = 0
                } else {
                    hours = editStatus === 'PRESENT' ? 9 : (editStatus === 'HALF_DAY' ? 4.5 : 0)
                }
            }

            const res = await fetch('/api/attendance', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    staffId,
                    date: filterDate,
                    status: editStatus,
                    punchIn: punchInIso,
                    punchOut: punchOutIso,
                    hoursWorked: editStatus === 'ABSENT' ? 0 : hours,
                    location: editLocation || 'Main Lobby',
                    notes: editNotes || `Regularized as ${editStatus} by HR`
                })
            })

            if (res.ok) {
                const data = await res.json()
                toast.success(data.message || `Attendance updated to ${editStatus}`)
                setShowEditModal(false)
                fetchAttendance()
            } else {
                const err = await res.json().catch(() => ({}))
                toast.error(err?.error || 'Failed to update attendance')
            }
        } catch (e) {
            console.error('Error regularizing attendance', e)
            toast.error('Network error updating attendance')
        } finally {
            setIsSaving(false)
        }
    }

    const viewDetails = (record: any) => {
        setSelectedRecord(record);
        setShowDetailModal(true);
    };

    return (
        <div className="space-y-6 animate-fade-in font-sans">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-text-primary tracking-tight">Attendance Tracking</h1>
                    <p className="text-text-secondary mt-1">Real-time monitoring of staff presence, shifts &amp; manual HR regularizations</p>
                </div>
                <div className="flex items-center gap-3">
                    <input
                        type="date"
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                        className="bg-surface border border-border/50 rounded-xl px-4 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all [color-scheme:dark]"
                    />
                    <div className="flex items-center gap-2">
                        <Button
                            variant="secondary"
                            size="sm"
                            leftIcon={<Download className="w-4 h-4" />}
                            className="bg-white/5 border-border hover:bg-white/10"
                            onClick={() => {
                                if (!filteredAttendance || filteredAttendance.length === 0) {
                                    toast.error('No records available to export')
                                    return
                                }
                                
                                const exportData = filteredAttendance.map(a => ({
                                    Employee: a.staff?.user?.name || 'N/A',
                                    Department: a.staff?.department || 'N/A',
                                    Date: a.date ? format(new Date(a.date), 'dd-MM-yyyy') : 'N/A',
                                    PunchIn: a.punchIn ? format(new Date(a.punchIn), 'hh:mm a') : 'N/A',
                                    PunchOut: a.punchOut ? format(new Date(a.punchOut), 'hh:mm a') : 'N/A',
                                    Hours: a.hoursWorked || 0,
                                    Status: a.status || 'ABSENT'
                                }))

                                downloadCSV(exportData, `Daily_Attendance_${filterDate}`)
                                toast.success('Attendance records exported to CSV')
                            }}
                        >
                            Export CSV
                        </Button>
                    </div>
                </div>
            </div>

            {/* Staff Self-Service Card */}
            {userRole === 'STAFF' && (
                <Card className="relative overflow-hidden border-primary/20 bg-surface">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Clock className="w-24 h-24 text-primary" />
                    </div>
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 p-2">
                        <div>
                            <h2 className="text-xl font-bold text-text-primary">Daily Time Clock</h2>
                            <p className="text-text-secondary mt-1">Record your presence for today: {format(new Date(), 'MMMM do, yyyy')}</p>

                            <div className="flex items-center gap-6 mt-4">
                                <div className="space-y-1">
                                    <p className="text-[10px] uppercase font-bold text-text-tertiary tracking-widest">Clock In</p>
                                    <p className="text-lg font-mono font-bold text-text-primary">
                                        {todayRecord?.punchIn ? format(new Date(todayRecord.punchIn), 'hh:mm a') : '--:--'}
                                    </p>
                                </div>
                                <div className="w-px h-8 bg-white/10" />
                                <div className="space-y-1">
                                    <p className="text-[10px] uppercase font-bold text-text-tertiary tracking-widest">Clock Out</p>
                                    <p className="text-lg font-mono font-bold text-text-primary">
                                        {todayRecord?.punchOut ? format(new Date(todayRecord.punchOut), 'hh:mm a') : '--:--'}
                                    </p>
                                </div>
                                <div className="w-px h-8 bg-white/10" />
                                <div className="space-y-1">
                                    <p className="text-[10px] uppercase font-bold text-text-tertiary tracking-widest">Total Hours</p>
                                    <p className="text-lg font-mono font-bold text-primary">
                                        {todayRecord?.hoursWorked ? `${todayRecord.hoursWorked}h` : '0h'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            {!todayRecord?.punchIn ? (
                                <Button
                                    variant="primary"
                                    size="lg"
                                    className="px-8 shadow-lg shadow-primary/20"
                                    onClick={() => handlePunch('PUNCH_IN')}
                                    loading={isPunching}
                                >
                                    Punch In
                                </Button>
                            ) : !todayRecord?.punchOut ? (
                                <Button
                                    variant="danger"
                                    size="lg"
                                    className="px-8 shadow-lg shadow-danger/20"
                                    onClick={() => handlePunch('PUNCH_OUT')}
                                    loading={isPunching}
                                >
                                    Punch Out
                                </Button>
                            ) : (
                                <div className="flex items-center gap-2 bg-success/10 text-success px-6 py-3 rounded-2xl border border-success/20">
                                    <CheckCircle2 className="w-5 h-5" />
                                    <span className="font-bold">Shift Completed</span>
                                </div>
                            )}
                        </div>
                    </div>
                </Card>
            )}

            {/* Admin Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                {[
                    { label: 'Scheduled', value: stats.total, icon: Calendar, color: 'text-primary' },
                    { label: 'Present', value: stats.present, icon: CheckCircle2, color: 'text-success' },
                    { label: 'Late', value: stats.late, icon: AlertCircle, color: 'text-warning' },
                    { label: 'Absent', value: stats.onLeave, icon: XCircle, color: 'text-danger' },
                ].map((item, idx) => (
                    <Card key={idx} className="p-3 md:p-4 border-border bg-surface-light/30">
                        <div className="flex flex-col md:flex-row md:justify-between items-start md:items-center gap-2">
                            <div>
                                <p className="text-[9px] md:text-xs font-bold text-text-tertiary uppercase tracking-wider">{item.label}</p>
                                <p className="text-xl md:text-2xl font-black text-text-primary mt-0.5">{item.value}</p>
                            </div>
                            <div className={cn("p-1.5 md:p-2 rounded-xl bg-surface-light", item.color)}>
                                <item.icon className="w-4 h-4 md:w-5 md:h-5" />
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Main List */}
            <Card className="bg-surface border-border">
                <div className="p-4 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative w-full md:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                        <input
                            placeholder="Search staff members..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-surface-light border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-text-primary transition-all"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            options={[
                                { value: 'ALL', label: 'All Status' },
                                { value: 'PRESENT', label: 'Present' },
                                { value: 'ABSENT', label: 'Absent' },
                                { value: 'LATE', label: 'Late' },
                                { value: 'HALF_DAY', label: 'Half Day' },
                                { value: 'ON_LEAVE', label: 'On Leave' },
                            ]}
                            className="w-40 h-9"
                        />
                    </div>
                </div>

                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-border bg-surface-light">
                                <th className="px-6 py-4 text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Employee</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Punch In/Out</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-text-tertiary uppercase tracking-widest text-center">Working Hours</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-text-tertiary uppercase tracking-widest text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-text-tertiary animate-pulse">
                                        Synchronizing attendance records...
                                    </td>
                                </tr>
                            ) : filteredAttendance.length > 0 ? (
                                filteredAttendance.map((record) => (
                                    <tr key={record.id} className="group hover:bg-surface-light transition-all">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <Avatar name={record.staff?.user?.name} size="sm" />
                                                <div>
                                                    <p className="font-bold text-text-primary text-sm leading-none">{record.staff?.user?.name}</p>
                                                    <p className="text-[10px] text-text-tertiary font-bold uppercase tracking-wider mt-1">{record.staff?.department}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 text-xs font-mono">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-success shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                                    <span className="text-text-secondary">
                                                        {record.punchIn ? format(new Date(record.punchIn), 'hh:mm a') : '--:--'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs font-mono opacity-50">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-danger shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                                                    <span className="text-text-secondary">
                                                        {record.punchOut ? format(new Date(record.punchOut), 'hh:mm a') : '--:--'}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex flex-col items-center">
                                                <div className="text-sm font-bold text-text-primary">{record.hoursWorked || 0}h</div>
                                                <div className="flex items-center gap-1 text-[10px] text-text-tertiary mt-1">
                                                    <MapPin className="w-2.5 h-2.5" />
                                                    {record.punchInLocation || 'Main Lobby'}
                                                </div>
                                            </div>
                                        </td>
                                        {/* Status Column - Clickable Badge */}
                                        <td className="px-6 py-4">
                                            <button
                                                type="button"
                                                id={`status-badge-${record.staffId || record.staff?.id}`}
                                                onClick={() => openEditModal(record)}
                                                title="Click to regularize / edit status"
                                                className={cn(
                                                    "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase border cursor-pointer hover:scale-105 transition-all shadow-sm active:scale-95",
                                                    record.status === 'PRESENT' ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25" :
                                                    record.status === 'HALF_DAY' ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/25" :
                                                    record.status === 'LATE' ? "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/25" :
                                                    record.status === 'ON_LEAVE' ? "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30 hover:bg-purple-500/25" :
                                                    "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/25"
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-1.5 h-1.5 rounded-full",
                                                    record.status === 'PRESENT' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" :
                                                    record.status === 'HALF_DAY' ? "bg-amber-500" :
                                                    record.status === 'LATE' ? "bg-yellow-500" :
                                                    record.status === 'ON_LEAVE' ? "bg-purple-500" :
                                                    "bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                                                )} />
                                                <span>{record.status}</span>
                                                <Edit3 className="w-2.5 h-2.5 opacity-60 ml-0.5" />
                                            </button>
                                        </td>
                                        {/* Action Column - Always Visible & Functional */}
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {record.status === 'ABSENT' && (
                                                    <button
                                                        type="button"
                                                        id={`btn-mark-present-${record.staffId || record.staff?.id}`}
                                                        onClick={() => handleQuickMarkPresent(record)}
                                                        className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 transition-all flex items-center gap-1 active:scale-95 cursor-pointer shadow-sm"
                                                        title="Quick 1-Click: Mark as Present (09:00 AM - 06:00 PM)"
                                                    >
                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                        <span>Mark Present</span>
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    id={`btn-regularize-${record.staffId || record.staff?.id}`}
                                                    onClick={() => openEditModal(record)}
                                                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-surface-light hover:bg-white/10 text-text-primary border border-border transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-sm"
                                                    title="Adjust Punch In/Out Time, Hours & Status"
                                                >
                                                    <Edit3 className="w-3.5 h-3.5 text-[#4A9EFF]" />
                                                    <span>Regularize / Edit</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-text-tertiary">
                                        No records found for this date or criteria.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-white/[0.04]">
                    {loading ? (
                        <div className="px-6 py-12 text-center text-text-tertiary animate-pulse">
                            Synchronizing attendance records...
                        </div>
                    ) : filteredAttendance.length > 0 ? (
                        filteredAttendance.map((record) => (
                            <div key={record.id} className="p-4 space-y-4 active:bg-surface-light transition-colors">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Avatar name={record.staff?.user?.name} size="md" />
                                        <div>
                                            <p className="font-bold text-text-primary text-sm">{record.staff?.user?.name}</p>
                                            <p className="text-[10px] text-text-tertiary font-bold uppercase tracking-wider">{record.staff?.department}</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => openEditModal(record)}
                                        className={cn(
                                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black tracking-widest uppercase border",
                                            record.status === 'PRESENT' ? "bg-success/10 text-success border-success/20" : "bg-danger/10 text-danger border-danger/20"
                                        )}
                                    >
                                        <span>{record.status}</span>
                                        <Edit3 className="w-2.5 h-2.5" />
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-3 bg-black/10 rounded-xl p-3 border border-border">
                                    <div className="space-y-1">
                                        <p className="text-[9px] text-text-tertiary font-bold uppercase tracking-tighter">Punch In / Out</p>
                                        <div className="flex flex-col gap-0.5">
                                            <div className="flex items-center gap-1.5 text-[11px] font-mono text-success">
                                                <span className="w-1 h-1 rounded-full bg-current" />
                                                {record.punchIn ? format(new Date(record.punchIn), 'hh:mm a') : '--:--'}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[11px] font-mono text-danger opacity-70">
                                                <span className="w-1 h-1 rounded-full bg-current" />
                                                {record.punchOut ? format(new Date(record.punchOut), 'hh:mm a') : '--:--'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right flex flex-col justify-between">
                                        <div>
                                            <p className="text-[9px] text-text-tertiary font-bold uppercase tracking-tighter">Hours</p>
                                            <p className="text-sm font-black text-text-primary">{record.hoursWorked || 0}h</p>
                                        </div>
                                        <div className="flex items-center justify-end gap-1.5 mt-2">
                                            {record.status === 'ABSENT' && (
                                                <button 
                                                    onClick={() => handleQuickMarkPresent(record)}
                                                    className="text-[10px] font-black text-emerald-500 uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30"
                                                >
                                                    Present
                                                </button>
                                            )}
                                            <button 
                                                onClick={() => openEditModal(record)}
                                                className="text-[10px] font-black text-[#4A9EFF] uppercase tracking-wider px-2 py-0.5 rounded bg-[#4A9EFF]/10 border border-[#4A9EFF]/30 flex items-center gap-1"
                                            >
                                                Edit <Edit3 className="w-2.5 h-2.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="px-6 py-12 text-center text-text-tertiary">
                            No records found
                        </div>
                    )}
                </div>
            </Card>

            {/* ── EDIT / REGULARIZE ATTENDANCE MODAL ── */}
            <Modal
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
                title="Regularize Attendance & Change Time"
                description={`Adjust presence, status, and punch timings for ${editRecord?.staff?.user?.name || 'Staff'}`}
                size="lg"
            >
                {editRecord && (
                    <div className="space-y-5 pt-3">
                        {/* Employee Banner */}
                        <div className="flex items-center justify-between p-4 bg-surface-light rounded-2xl border border-border">
                            <div className="flex items-center gap-3">
                                <Avatar name={editRecord.staff?.user?.name} size="lg" />
                                <div>
                                    <h3 className="text-base font-bold text-text-primary">{editRecord.staff?.user?.name}</h3>
                                    <p className="text-xs text-text-tertiary font-medium">{editRecord.staff?.department} • {editRecord.staff?.role || 'Staff Member'}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] uppercase font-bold text-text-tertiary tracking-wider">Shift Date</p>
                                <p className="text-sm font-bold text-text-primary">{format(new Date(filterDate), 'dd MMM yyyy')}</p>
                            </div>
                        </div>

                        {/* Status Selector Chips */}
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider block">
                                Select Attendance Status
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                {[
                                    { id: 'PRESENT', label: 'Present', color: 'emerald' },
                                    { id: 'ABSENT', label: 'Absent', color: 'rose' },
                                    { id: 'HALF_DAY', label: 'Half Day', color: 'amber' },
                                    { id: 'LATE', label: 'Late', color: 'yellow' },
                                    { id: 'ON_LEAVE', label: 'On Leave', color: 'purple' },
                                ].map((item) => {
                                    const isSelected = editStatus === item.id
                                    return (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => {
                                                setEditStatus(item.id)
                                                if (item.id === 'ABSENT') {
                                                    setEditPunchIn('')
                                                    setEditPunchOut('')
                                                    setEditHours('0')
                                                } else if (item.id === 'PRESENT' && !editPunchIn) {
                                                    setEditPunchIn('09:00')
                                                    setEditPunchOut('18:00')
                                                    setEditHours('9')
                                                } else if (item.id === 'HALF_DAY' && !editPunchIn) {
                                                    setEditPunchIn('09:00')
                                                    setEditPunchOut('13:30')
                                                    setEditHours('4.5')
                                                }
                                            }}
                                            className={cn(
                                                "py-2.5 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm",
                                                isSelected 
                                                    ? item.id === 'PRESENT' ? "bg-emerald-600 text-white border-emerald-500 shadow-emerald-500/20" :
                                                      item.id === 'ABSENT' ? "bg-rose-600 text-white border-rose-500 shadow-rose-500/20" :
                                                      item.id === 'HALF_DAY' ? "bg-amber-600 text-white border-amber-500 shadow-amber-500/20" :
                                                      item.id === 'LATE' ? "bg-yellow-600 text-white border-yellow-500 shadow-yellow-500/20" :
                                                      "bg-purple-600 text-white border-purple-500 shadow-purple-500/20"
                                                    : "bg-surface-light border-border text-text-secondary hover:text-text-primary hover:border-border/80"
                                            )}
                                        >
                                            {isSelected && <Check className="w-3.5 h-3.5" />}
                                            <span>{item.label}</span>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Shift Times (Only shown if not ABSENT / ON_LEAVE) */}
                        {editStatus !== 'ABSENT' && editStatus !== 'ON_LEAVE' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Punch In Card */}
                                <div className="p-4 bg-surface border border-border rounded-2xl space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Punch In Time
                                        </label>
                                        <span className="text-[10px] text-text-tertiary font-mono">24h format</span>
                                    </div>
                                    <input 
                                        type="time" 
                                        value={editPunchIn}
                                        onChange={(e) => setEditPunchIn(e.target.value)}
                                        className="w-full bg-surface-light border border-border rounded-xl px-3 py-2 text-base font-mono font-bold text-text-primary outline-none focus:border-[#4A9EFF] transition-colors [color-scheme:dark]"
                                    />
                                    <div className="flex gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => setEditPunchIn('09:00')}
                                            className="px-2 py-0.5 rounded text-[10px] font-bold bg-surface-light hover:bg-white/10 text-text-secondary border border-border"
                                        >
                                            09:00 AM
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setEditPunchIn('10:00')}
                                            className="px-2 py-0.5 rounded text-[10px] font-bold bg-surface-light hover:bg-white/10 text-text-secondary border border-border"
                                        >
                                            10:00 AM
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const now = new Date()
                                                setEditPunchIn(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`)
                                            }}
                                            className="px-2 py-0.5 rounded text-[10px] font-bold bg-surface-light hover:bg-white/10 text-text-secondary border border-border"
                                        >
                                            Now
                                        </button>
                                    </div>
                                </div>

                                {/* Punch Out Card */}
                                <div className="p-4 bg-surface border border-border rounded-2xl space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-rose-500" /> Punch Out Time
                                        </label>
                                        <span className="text-[10px] text-text-tertiary font-mono">24h format</span>
                                    </div>
                                    <input 
                                        type="time" 
                                        value={editPunchOut}
                                        onChange={(e) => setEditPunchOut(e.target.value)}
                                        className="w-full bg-surface-light border border-border rounded-xl px-3 py-2 text-base font-mono font-bold text-text-primary outline-none focus:border-[#4A9EFF] transition-colors [color-scheme:dark]"
                                    />
                                    <div className="flex gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => setEditPunchOut('18:00')}
                                            className="px-2 py-0.5 rounded text-[10px] font-bold bg-surface-light hover:bg-white/10 text-text-secondary border border-border"
                                        >
                                            06:00 PM
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setEditPunchOut('19:00')}
                                            className="px-2 py-0.5 rounded text-[10px] font-bold bg-surface-light hover:bg-white/10 text-text-secondary border border-border"
                                        >
                                            07:00 PM
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const now = new Date()
                                                setEditPunchOut(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`)
                                            }}
                                            className="px-2 py-0.5 rounded text-[10px] font-bold bg-surface-light hover:bg-white/10 text-text-secondary border border-border"
                                        >
                                            Now
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Working Hours & Location */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider">
                                    Working Hours (Hours Logged)
                                </label>
                                <input 
                                    type="number"
                                    step="0.5"
                                    placeholder="e.g. 9"
                                    value={editHours}
                                    onChange={(e) => setEditHours(e.target.value)}
                                    className="w-full bg-surface-light border border-border rounded-xl px-3 py-2 text-sm text-text-primary outline-none focus:border-[#4A9EFF] transition-colors"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider">
                                    Punch In Location
                                </label>
                                <input 
                                    type="text"
                                    placeholder="e.g. Main Lobby / Kitchen / Manual Entry"
                                    value={editLocation}
                                    onChange={(e) => setEditLocation(e.target.value)}
                                    className="w-full bg-surface-light border border-border rounded-xl px-3 py-2 text-sm text-text-primary outline-none focus:border-[#4A9EFF] transition-colors"
                                />
                            </div>
                        </div>

                        {/* Internal Note / Regularization Reason */}
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider">
                                Regularization Reason / HR Note
                            </label>
                            <input 
                                type="text"
                                placeholder="e.g. Biometric device offline / Manager approved present"
                                value={editNotes}
                                onChange={(e) => setEditNotes(e.target.value)}
                                className="w-full bg-surface-light border border-border rounded-xl px-3 py-2 text-sm text-text-primary outline-none focus:border-[#4A9EFF] transition-colors"
                            />
                            {/* Preset Reason Chips */}
                            <div className="flex flex-wrap gap-1.5">
                                {[
                                    'Biometric missed / Marked present',
                                    'Manager approved shift timing',
                                    'Half-day approved by HOD',
                                    'Outdoor hotel operational duty'
                                ].map((note) => (
                                    <button
                                        key={note}
                                        type="button"
                                        onClick={() => setEditNotes(note)}
                                        className="px-2 py-0.5 rounded text-[10px] font-medium bg-surface-light hover:bg-white/10 text-text-secondary border border-border transition-colors cursor-pointer"
                                    >
                                        + {note}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Footer Buttons */}
                        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                            <Button
                                id="btn-cancel-regularize"
                                variant="secondary"
                                onClick={() => setShowEditModal(false)}
                                disabled={isSaving}
                            >
                                Cancel
                            </Button>
                            <Button
                                id="btn-save-regularize"
                                variant="primary"
                                onClick={handleSaveAttendance}
                                loading={isSaving}
                                leftIcon={<Save className="w-4 h-4" />}
                                className="bg-[#4A9EFF] hover:bg-[#3B82F6] px-6 shadow-lg shadow-[#4A9EFF]/20"
                            >
                                Save &amp; Regularize Attendance
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Attendance Detail Modal (Read-Only) */}
            <Modal
                isOpen={showDetailModal}
                onClose={() => setShowDetailModal(false)}
                title="Attendance Records"
                description={`Shift details for ${selectedRecord?.staff?.user?.name}`}
                size="md"
            >
                {selectedRecord && (
                    <div className="space-y-6 pt-4">
                        <div className="flex items-center gap-4 p-4 bg-surface-light rounded-2xl border border-border">
                            <Avatar name={selectedRecord.staff?.user?.name} size="xl" />
                            <div>
                                <h3 className="text-xl font-bold text-text-primary">{selectedRecord.staff?.user?.name}</h3>
                                <p className="text-sm text-text-tertiary">{selectedRecord.staff?.department} • {selectedRecord.staff?.role}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Card className="p-4 flex flex-col items-center border-emerald-500/20 bg-surface">
                                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1">Punched In</p>
                                <p className="text-2xl font-mono font-bold text-text-primary">
                                    {selectedRecord.punchIn ? format(new Date(selectedRecord.punchIn), 'hh:mm a') : '--:--'}
                                </p>
                                <p className="text-[10px] text-text-tertiary mt-2">Location: {selectedRecord.punchInLocation || 'N/A'}</p>
                            </Card>
                            <Card className="p-4 flex flex-col items-center border-rose-500/20 bg-surface">
                                <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest mb-1">Punched Out</p>
                                <p className="text-2xl font-mono font-bold text-text-primary">
                                    {selectedRecord.punchOut ? format(new Date(selectedRecord.punchOut), 'hh:mm a') : '--:--'}
                                </p>
                                <p className="text-[10px] text-text-tertiary mt-2">Location: {selectedRecord.punchOutLocation || 'N/A'}</p>
                            </Card>
                        </div>

                        <div className="p-4 bg-surface-light border border-border rounded-2xl flex justify-between items-center">
                            <div>
                                <p className="text-xs font-bold text-text-tertiary uppercase tracking-wider">Total Time Logged</p>
                                <p className="text-3xl font-bold text-primary mt-1">{selectedRecord.hoursWorked || 0} Hours</p>
                            </div>
                            <Badge variant={selectedRecord.status === 'PRESENT' ? 'success' : 'danger'}>
                                {selectedRecord.status}
                            </Badge>
                        </div>

                        {selectedRecord.notes && (
                            <div className="p-4 border border-dashed border-border rounded-xl">
                                <p className="text-xs font-bold text-text-tertiary uppercase mb-2">Internal Note</p>
                                <p className="text-sm text-text-secondary ">&quot;{selectedRecord.notes}&quot;</p>
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    )
}
