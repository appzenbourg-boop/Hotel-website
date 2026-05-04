'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { 
    Award, Plus, Search, Filter, Trash2, Calendar, 
    User, IndianRupee, Clock, CheckCircle2, AlertTriangle,
    ArrowUpRight, Loader2, ChevronRight, X, Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { format } from 'date-fns'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Textarea from '@/components/ui/Textarea'

export default function StaffPerksPage() {
    const { data: session } = useSession()
    const [loading, setLoading] = useState(true)
    const [adjustments, setAdjustments] = useState<any[]>([])
    const [staffList, setStaffList] = useState<any[]>([])
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showAddModal, setShowAddModal] = useState(false)

    // Filters
    const [search, setSearch] = useState('')
    const [typeFilter, setTypeFilter] = useState('ALL')
    const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'MMMM'))
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())

    // New Adjustment Data
    const [newData, setNewData] = useState({
        staffId: '',
        type: 'INCENTIVE',
        amount: '',
        reason: '',
        month: format(new Date(), 'MMMM'),
        year: new Date().getFullYear().toString()
    })

    const fetchAdjustments = useCallback(async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams({
                month: selectedMonth,
                year: selectedYear
            })
            const res = await fetch(`/api/admin/staff/adjustments?${params}`)
            if (res.ok) {
                const json = await res.json()
                setAdjustments(json.data || [])
            }
        } catch { toast.error('Failed to fetch adjustments') }
        finally { setLoading(false) }
    }, [selectedMonth, selectedYear])

    const fetchStaff = async () => {
        try {
            const res = await fetch('/api/admin/staff')
            if (res.ok) {
                const json = await res.json()
                setStaffList(json.data || [])
            }
        } catch { }
    }

    useEffect(() => {
        fetchAdjustments()
        fetchStaff()
    }, [fetchAdjustments])

    const openModalForStaff = (staff: any) => {
        setNewData(prev => ({ ...prev, staffId: staff.id }))
        setShowAddModal(true)
    }

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newData.staffId || !newData.amount || !newData.month) {
            return toast.error('Please fill in all required fields')
        }

        setIsSubmitting(true)
        try {
            const res = await fetch('/api/admin/staff/adjustments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newData)
            })

            if (res.ok) {
                toast.success('Adjustment added successfully')
                setShowAddModal(false)
                fetchAdjustments()
                setNewData({ ...newData, staffId: '', amount: '', reason: '' })
            } else {
                toast.error('Failed to add adjustment')
            }
        } catch (error) {
            toast.error('An error occurred')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to remove this adjustment?')) return
        try {
            const res = await fetch(`/api/admin/staff/adjustments?id=${id}`, { method: 'DELETE' })
            if (res.ok) {
                toast.success('Removed successfully')
                fetchAdjustments()
            }
        } catch { toast.error('Failed to delete') }
    }

    const filteredAdjustments = adjustments.filter(a => {
        const matchesSearch = a.staff?.user?.name.toLowerCase().includes(search.toLowerCase()) ||
                            a.reason?.toLowerCase().includes(search.toLowerCase())
        const matchesType = typeFilter === 'ALL' || a.type === typeFilter
        return matchesSearch && matchesType
    })

    const filteredStaff = staffList.filter(s => 
        s.name.toLowerCase().includes(search.toLowerCase()) || 
        s.department.toLowerCase().includes(search.toLowerCase())
    )

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ]

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] bg-[#0d1117] overflow-hidden">
            {/* Header */}
            <div className="shrink-0 p-8 border-b border-white/[0.06] bg-gradient-to-b from-[#161b22] to-[#0d1117]">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                                <Award className="w-5 h-5 text-blue-400" />
                            </div>
                            <h1 className="text-2xl font-black text-white tracking-tight">Staff Incentives & Bonuses</h1>
                        </div>
                        <p className="text-sm text-gray-500 font-medium">Click on a staff member to reward them or view recent records below.</p>
                    </div>
                </div>

                {/* Staff Selection Grid */}
                <div className="mt-8">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Select Employee to Reward</h2>
                        <span className="text-[10px] font-bold text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-full">{filteredStaff.length} Team Members</span>
                    </div>
                    <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x">
                        {filteredStaff.map((staff) => (
                            <button
                                key={staff.id}
                                onClick={() => openModalForStaff(staff)}
                                className="w-40 shrink-0 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 flex flex-col items-center text-center group hover:bg-blue-500/10 hover:border-blue-500/30 transition-all hover:-translate-y-1 snap-start"
                            >
                                <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20 mb-3 group-hover:scale-110 transition-transform overflow-hidden shadow-xl">
                                    {staff.profilePhoto ? (
                                        <img src={staff.profilePhoto} className="w-full h-full object-cover" alt="" />
                                    ) : (
                                        <span className="text-xs font-black text-blue-400">{staff.name.charAt(0)}</span>
                                    )}
                                </div>
                                <p className="text-xs font-black text-white truncate w-full">{staff.name}</p>
                                <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest mt-1">{staff.department}</p>
                                <div className="mt-3 px-3 py-1 rounded-full bg-white/[0.05] text-[8px] font-black text-gray-500 uppercase tracking-tighter group-hover:bg-blue-500 group-hover:text-white transition-all">
                                    Reward Now
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="shrink-0 flex flex-wrap items-center gap-4 px-8 py-4 border-b border-white/[0.06] bg-[#11151c]">
                <div className="relative flex-1 min-w-[250px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                    <input
                        type="text"
                        placeholder="Search records..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-white/[0.02] border border-white/[0.06] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-gray-700 outline-none focus:border-blue-500/40 transition-all shadow-inner"
                    />
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-white/[0.02] border border-white/[0.06] rounded-xl p-1 shadow-lg">
                        <select 
                            value={typeFilter} 
                            onChange={e => setTypeFilter(e.target.value)}
                            className="bg-transparent text-[10px] font-black uppercase tracking-widest text-gray-400 outline-none px-3 py-2 cursor-pointer hover:text-white transition-colors border-none"
                        >
                            <option value="ALL">All Types</option>
                            <option value="INCENTIVE">Incentives</option>
                            <option value="BONUS">Bonuses</option>
                            <option value="ALLOWANCE">Allowances</option>
                        </select>
                        <div className="w-[1px] h-4 bg-white/[0.06]" />
                        <select 
                            value={selectedMonth} 
                            onChange={e => setSelectedMonth(e.target.value)}
                            className="bg-transparent text-[10px] font-black uppercase tracking-widest text-gray-400 outline-none px-3 py-2 cursor-pointer hover:text-white transition-colors border-none"
                        >
                            {months.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <div className="w-[1px] h-4 bg-white/[0.06]" />
                        <select 
                            value={selectedYear} 
                            onChange={e => setSelectedYear(e.target.value)}
                            className="bg-transparent text-[10px] font-black uppercase tracking-widest text-gray-400 outline-none px-3 py-2 cursor-pointer hover:text-white transition-colors border-none"
                        >
                            {['2024', '2025', '2026'].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto custom-scrollbar bg-[#0d1117]">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-[#0d1117] z-10 border-b border-white/[0.06]">
                        <tr>
                            <th className="px-8 py-5 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Staff Member</th>
                            <th className="px-6 py-5 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Type</th>
                            <th className="px-6 py-5 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Reason / Note</th>
                            <th className="px-6 py-5 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Period</th>
                            <th className="px-6 py-5 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Amount</th>
                            <th className="px-8 py-5 text-right text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03]">
                        {loading ? (
                            <tr><td colSpan={6} className="py-20 text-center"><Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto" /></td></tr>
                        ) : filteredAdjustments.length === 0 ? (
                            <tr><td colSpan={6} className="py-20 text-center text-gray-600 font-medium italic">No historical records found for this criteria.</td></tr>
                        ) : filteredAdjustments.map(item => (
                            <tr key={item.id} className="group hover:bg-white/[0.01] transition-all">
                                <td className="px-8 py-5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-white/[0.05] flex items-center justify-center border border-white/[0.1] overflow-hidden">
                                            {item.staff?.profilePhoto ? (
                                                <img src={item.staff.profilePhoto} className="w-full h-full object-cover opacity-80" alt="" />
                                            ) : (
                                                <span className="text-[10px] font-black text-gray-500">{item.staff?.user?.name.charAt(0)}</span>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-gray-200">{item.staff?.user?.name}</p>
                                            <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest mt-0.5">{item.staff?.department}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-5">
                                    <span className={cn(
                                        "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border shadow-sm",
                                        item.type === 'INCENTIVE' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                        item.type === 'BONUS' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                        item.type === 'ALLOWANCE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                        'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                    )}>
                                        {item.type}
                                    </span>
                                </td>
                                <td className="px-6 py-5">
                                    <p className="text-xs text-gray-500 font-medium truncate max-w-[200px] group-hover:text-gray-300 transition-colors">{item.reason || '—'}</p>
                                </td>
                                <td className="px-6 py-5">
                                    <div className="flex items-center gap-2 text-gray-600 group-hover:text-gray-400 transition-colors">
                                        <Calendar className="w-3 h-3" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">{item.month} &apos;{item.year.toString().slice(-2)}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-5">
                                    <span className={cn(
                                        "text-sm font-black tracking-tighter",
                                        item.type === 'DEDUCTION' ? 'text-rose-500' : 'text-emerald-500'
                                    )}>
                                        {item.type === 'DEDUCTION' ? '−' : '+'} ₹{item.amount.toLocaleString()}
                                    </span>
                                </td>
                                <td className="px-8 py-5 text-right">
                                    <button 
                                        onClick={() => handleDelete(item.id)}
                                        className="p-2 text-gray-700 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Create Modal */}
            <Modal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                title="Staff Adjustment"
                description="Assign extra allowance or performance bonus."
            >
                <form onSubmit={handleCreate} className="space-y-6 pt-4">
                    <div className="space-y-4">
                        <Select
                            label="Employee"
                            value={newData.staffId}
                            onChange={e => setNewData({ ...newData, staffId: e.target.value })}
                            required
                            options={[
                                { value: '', label: 'Select Employee...' },
                                ...staffList.map(s => ({ value: s.id, label: s.name }))
                            ]}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <Select
                                label="Type"
                                value={newData.type}
                                onChange={e => setNewData({ ...newData, type: e.target.value })}
                                options={[
                                    { value: 'INCENTIVE', label: 'Incentive' },
                                    { value: 'BONUS', label: 'Performance Bonus' },
                                    { value: 'ALLOWANCE', label: 'Extra Allowance' },
                                    { value: 'DEDUCTION', label: 'Penalty' },
                                ]}
                            />
                            <Input
                                label="Amount (₹)"
                                type="number"
                                placeholder="0"
                                value={newData.amount}
                                onChange={e => setNewData({ ...newData, amount: e.target.value })}
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Select
                                label="Month"
                                value={newData.month}
                                onChange={e => setNewData({ ...newData, month: e.target.value })}
                                options={months.map(m => ({ value: m, label: m }))}
                            />
                            <Select
                                label="Year"
                                value={newData.year}
                                onChange={e => setNewData({ ...newData, year: e.target.value })}
                                options={['2024', '2025', '2026'].map(y => ({ value: y, label: y }))}
                            />
                        </div>
                        <Textarea
                            label="Notes"
                            placeholder="Reason for reward..."
                            value={newData.reason}
                            onChange={e => setNewData({ ...newData, reason: e.target.value })}
                            rows={2}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-white/[0.06]">
                        <Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
                        <Button type="submit" loading={isSubmitting}>Apply Reward</Button>
                    </div>
                </form>
            </Modal>
        </div>
    )
}
