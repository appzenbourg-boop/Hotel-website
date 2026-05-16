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
    FileText
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
                setAttendance(data.attendances || data || [])

                // Update stats
                const present = data.attendances.filter((a: any) => a.status === 'PRESENT').length
                const late = data.attendances.filter((a: any) => a.status === 'LATE').length
                const absent = data.attendances.filter((a: any) => a.status === 'ABSENT').length
                const onLeave = data.attendances.filter((a: any) => a.status === 'ON_LEAVE').length
                
                setStats({
                    present,
                    late,
                    onLeave: absent + onLeave,
                    total: data.attendances.length
                })

                // If staff, find our own record for today
                if (userRole === 'STAFF') {
                    const myRecord = data.attendances.find((a: any) => a.staff?.userId === session?.user?.id)
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
            const matchesSearch = a.staff?.user?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                a.staff?.department.toLowerCase().includes(searchQuery.toLowerCase());
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

    const viewDetails = (record: any) => {
        setSelectedRecord(record);
        setShowDetailModal(true);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-text-primary tracking-tight">Attendance Tracking</h1>
                    <p className="text-text-secondary mt-1">Real-time monitoring of staff presence and shifts</p>
                </div>
                <div className="flex items-center gap-3">
                    <input
                        type="date"
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                        className="bg-surface border border-white/10 rounded-xl px-4 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all [color-scheme:dark]"
                    />
                    <div className="flex items-center gap-2">
                        <Button
                            variant="secondary"
                            size="sm"
                            leftIcon={<Download className="w-4 h-4" />}
                            className="bg-white/5 border-white/5 hover:bg-white/10"
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
                    <Card key={idx} className="p-3 md:p-4 border-white/[0.05] bg-surface-light/30">
                        <div className="flex flex-col md:flex-row md:justify-between items-start md:items-center gap-2">
                            <div>
                                <p className="text-[9px] md:text-xs font-bold text-text-tertiary uppercase tracking-wider">{item.label}</p>
                                <p className="text-xl md:text-2xl font-black text-white mt-0.5">{item.value}</p>
                            </div>
                            <div className={cn("p-1.5 md:p-2 rounded-xl bg-surface-light", item.color)}>
                                <item.icon className="w-4 h-4 md:w-5 md:h-5" />
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Main List */}
            <Card className="bg-surface border-white/[0.08]">
                <div className="p-4 border-b border-white/[0.08] flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative w-full md:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                        <input
                            placeholder="Search staff members..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-text-primary transition-all"
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
                            ]}
                            className="w-40 h-9"
                        />
                    </div>
                </div>

                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/[0.04] bg-white/[0.02]">
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
                                    <td colSpan={6} className="px-6 py-12 text-center text-text-tertiary animate-pulse">
                                        Synchronizing attendance records...
                                    </td>
                                </tr>
                            ) : filteredAttendance.length > 0 ? (
                                filteredAttendance.map((record) => (
                                    <tr key={record.id} className="group hover:bg-white/[0.02] transition-all">
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
                                        <td className="px-6 py-4">
                                            <div className={cn(
                                                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase border",
                                                record.status === 'PRESENT' ? "bg-success/10 text-success border-success/20" : "bg-danger/10 text-danger border-danger/20"
                                            )}>
                                                <div className={cn("w-1 h-1 rounded-full", record.status === 'PRESENT' ? "bg-success" : "bg-danger")} />
                                                {record.status}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="opacity-0 group-hover:opacity-100 transition-opacity h-8 px-2 hover:bg-white/10"
                                                onClick={() => viewDetails(record)}
                                            >
                                                <Eye className="w-4 h-4 mr-2" />
                                                Details
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-text-tertiary ">
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
                            <div key={record.id} className="p-4 space-y-4 active:bg-white/[0.03] transition-colors">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Avatar name={record.staff?.user?.name} size="md" />
                                        <div>
                                            <p className="font-bold text-text-primary text-sm">{record.staff?.user?.name}</p>
                                            <p className="text-[10px] text-text-tertiary font-bold uppercase tracking-wider">{record.staff?.department}</p>
                                        </div>
                                    </div>
                                    <div className={cn(
                                        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[9px] font-black tracking-widest uppercase border",
                                        record.status === 'PRESENT' ? "bg-success/10 text-success border-success/20" : "bg-danger/10 text-danger border-danger/20"
                                    )}>
                                        {record.status}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 bg-black/10 rounded-xl p-3 border border-white/5">
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
                                        <button 
                                            onClick={() => viewDetails(record)}
                                            className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center justify-end gap-1"
                                        >
                                            Details <Eye className="w-3 h-3" />
                                        </button>
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

            {/* Attendance Detail Modal */}
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

                        {selectedRecord.note && (
                            <div className="p-4 border border-dashed border-border rounded-xl">
                                <p className="text-xs font-bold text-text-tertiary uppercase mb-2">Internal Note</p>
                                <p className="text-sm text-text-secondary ">&quot;{selectedRecord.note}&quot;</p>
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    )
}
