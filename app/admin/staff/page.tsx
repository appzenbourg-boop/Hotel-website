'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import Link from 'next/link'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Avatar from '@/components/common/Avatar'
import { Plus, Search, MapPin, Phone, Mail, FileText, XCircle, Filter, Download, Info, Camera, Loader2, Edit2, Sun, Sunset, Moon, Clock, Trash2, AlertTriangle } from 'lucide-react'
import { useSession } from 'next-auth/react'

import { cn, getApiErrorMessage, formatSafeINR } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { toast } from 'sonner'
import { buildContextUrl, getAdminContext } from '@/lib/admin-context'
import { downloadCSV } from '@/lib/csv'

export default function StaffPage() {
    const router = useRouter()
    const { data: session } = useSession()
    const userRole = session?.user?.role || 'STAFF'

    const [showAddModal, setShowAddModal] = useState(false)
    const [showDetailModal, setShowDetailModal] = useState(false)
    const [selectedStaff, setSelectedStaff] = useState<any>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Edit Staff State
    const [showEditModal, setShowEditModal] = useState(false)
    const [editingStaff, setEditingStaff] = useState<any | null>(null)
    const [editFormData, setEditFormData] = useState({
        name: '',
        email: '',
        phone: '',
        department: 'FRONT_DESK',
        designation: '',
        workShift: 'Day Shift',
        salary: '0',
        allowance: '0',
        status: 'ACTIVE',
    })
    const [isSavingEdit, setIsSavingEdit] = useState(false)

    // Custom Delete Confirmation Modal State
    const [deleteConfirmStaff, setDeleteConfirmStaff] = useState<any | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    // Filtering States
    const [searchQuery, setSearchQuery] = useState('')
    const [filterDept, setFilterDept] = useState('ALL')
    const [activeTab, setActiveTab] = useState<'ALL' | 'VERIFICATION'>('ALL')
    const [idProofModal, setIdProofModal] = useState<string | null>(null)
    const [photoUploading, setPhotoUploading] = useState(false)

    const searchParams = useSearchParams()

    // React to inbound query tab overrides (e.g. navigation from notifications)
    useEffect(() => {
        const t = searchParams.get('tab')
        if (t === 'verification') {
            setActiveTab('VERIFICATION')
        }
    }, [searchParams])

    // Form State for Add
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        department: 'FRONT_DESK',
        designation: 'Receptionist',
        workShift: 'Day Shift',
        salary: '0',
        allowance: '0',
        password: '',
        userRole: 'STAFF',
        profilePhoto: ''
    })

    const { data: rawStaff, mutate, isLoading: initialLoading, isValidating } = useSWR(buildContextUrl('/api/admin/staff'), (url) => fetch(url).then(res => res.json()))

    // Only show full loading skeleton on initial load (no cached data yet)
    const loading = initialLoading && !rawStaff

    const staffList = Array.isArray(rawStaff) ? rawStaff : (rawStaff?.data ?? [])

    const fetchStaff = () => mutate()

    // Derived filtered list
    const filteredStaff = useMemo(() => {
        return staffList.filter((s: any) => {
            const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (s.designation || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (s.department || '').toLowerCase().includes(searchQuery.toLowerCase());
            const matchesDept = filterDept === 'ALL' || s.department === filterDept;
            const matchesTab = activeTab === 'ALL' || (activeTab === 'VERIFICATION' && s.verificationRequested);
            return matchesSearch && matchesDept && matchesTab;
        });
    }, [staffList, searchQuery, filterDept, activeTab]);

    const renderShiftBadge = (shift?: string) => {
        const s = (shift || 'Day Shift').toLowerCase()
        if (s.includes('night')) {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <Moon className="w-3 h-3 text-purple-400" />
                    Night Shift
                </span>
            )
        }
        if (s.includes('evening')) {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Sunset className="w-3 h-3 text-amber-400" />
                    Evening Shift
                </span>
            )
        }
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Sun className="w-3 h-3 text-sky-400" />
                Day Shift
            </span>
        )
    }

    const handleAddStaff = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        // Use session propertyId for non-super-admins, localStorage for super-admin
        const propertyId = session?.user?.role === 'SUPER_ADMIN'
            ? getAdminContext().propertyId
            : session?.user?.propertyId

        try {
            const res = await fetch('/api/admin/staff', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    salary: parseFloat(formData.salary) || 0,
                    allowance: parseFloat(formData.allowance) || 0,
                    workShift: formData.workShift || 'Day Shift',
                    propertyId: propertyId && propertyId !== 'ALL' ? propertyId : undefined
                })
            })

            if (res.ok) {
                toast.success('Staff member added successfully')
                setShowAddModal(false)
                fetchStaff()
                setFormData({
                    name: '', email: '', phone: '', department: 'FRONT_DESK', designation: 'Receptionist', workShift: 'Day Shift', salary: '0', allowance: '0', password: '', userRole: 'STAFF', profilePhoto: ''
                })
            } else {
                const error = await getApiErrorMessage(res, 'Failed to add staff')
                toast.error(error)
            }
        } catch (error) {
            toast.error('Something went wrong')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleOpenEdit = (staff: any) => {
        setEditingStaff(staff)
        setEditFormData({
            name: staff.name || '',
            email: staff.email || '',
            phone: staff.phone || '',
            department: staff.department || 'FRONT_DESK',
            designation: staff.designation || '',
            workShift: staff.workShift || 'Day Shift',
            salary: String(staff.salary ?? 0),
            allowance: String(staff.allowance ?? 0),
            status: staff.status || 'ACTIVE',
        })
        setShowEditModal(true)
    }

    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingStaff) return
        setIsSavingEdit(true)
        try {
            const res = await fetch(`/api/admin/staff/${editingStaff.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: editFormData.name,
                    phone: editFormData.phone,
                    department: editFormData.department,
                    designation: editFormData.designation,
                    workShift: editFormData.workShift,
                    baseSalary: parseFloat(editFormData.salary) || 0,
                    allowance: parseFloat(editFormData.allowance) || 0,
                    status: editFormData.status,
                })
            })
            if (res.ok) {
                toast.success('Staff member updated successfully')
                setShowEditModal(false)
                setEditingStaff(null)
                fetchStaff()
            } else {
                const error = await getApiErrorMessage(res, 'Failed to update staff')
                toast.error(error)
            }
        } catch (error) {
            toast.error('Something went wrong')
        } finally {
            setIsSavingEdit(false)
        }
    }

    const handleConfirmDelete = async () => {
        if (!deleteConfirmStaff) return
        setIsDeleting(true)
        try {
            const res = await fetch(`/api/admin/staff/${deleteConfirmStaff.id}`, { method: 'DELETE' })
            if (res.ok) {
                toast.success('Staff member removed successfully')
                setDeleteConfirmStaff(null)
                fetchStaff()
            } else {
                toast.error(await getApiErrorMessage(res, 'Failed to remove staff'))
            }
        } catch (error) {
            toast.error('Something went wrong')
        } finally {
            setIsDeleting(false)
        }
    }

    const handleExport = () => {
        if (filteredStaff.length === 0) {
            toast.error('No data to export');
            return;
        }
        downloadCSV(filteredStaff.map((s: any) => ({
            Name: s.name,
            Email: s.email,
            Phone: s.phone,
            Department: s.department,
            Role: s.designation,
            Shift: s.workShift || 'Day Shift',
            Salary: s.salary,
            Allowance: s.allowance ?? 0,
            Status: s.dutyStatus
        })), 'Staff_Directory');
        toast.success('Staff list exported to CSV');
    };

    const handleVerifyAction = async (staffId: string, action: 'APPROVE' | 'REJECT') => {
        try {
            const res = await fetch('/api/admin/staff/verify', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ staffId, action })
            })
            if (res.ok) {
                toast.success(`Staff verification ${action === 'APPROVE' ? 'approved' : 'rejected'}`)
                fetchStaff()
            } else {
                toast.error(await getApiErrorMessage(res, 'Failed to verify staff'))
            }
        } catch (error) {
            toast.error('Failed to verify staff')
        }
    }


    return (
        <>
            <div className="space-y-6 animate-fade-in">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-text-primary tracking-tight">Staff Management</h1>
                        <p className="text-text-secondary mt-1">Manage employees, departments, and roles</p>
                    </div>
                    <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowAddModal(true)}>
                        Add Employee
                    </Button>
                </div>

                {/* Add Employee Modal */}
                <Modal
                    isOpen={showAddModal}
                    onClose={() => !isSubmitting && setShowAddModal(false)}
                    title="Add New Employee"
                    description="Create a new staff account and profile"
                    size="lg"
                >
                    <form onSubmit={handleAddStaff} className="space-y-4">
                        {/* Photo Upload Section */}
                        <div className="flex flex-col items-center justify-center py-2">
                            <div className="relative group/add-avatar">
                                <div className="w-24 h-24 rounded-2xl bg-surface-light border-2 border-dashed border-border flex items-center justify-center overflow-hidden group-hover/add-avatar:border-primary/50 transition-all">
                                    {formData.profilePhoto ? (
                                        <img src={formData.profilePhoto} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <Camera className="w-8 h-8 text-text-tertiary group-hover/add-avatar:text-primary transition-colors" />
                                    )}
                                    {photoUploading && (
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                            <Loader2 className="w-6 h-6 text-text-primary animate-spin" />
                                        </div>
                                    )}
                                </div>
                                <label className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary rounded-xl flex items-center justify-center cursor-pointer shadow-lg hover:scale-110 transition-all">
                                    <Plus className="w-4 h-4 text-text-primary" />
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0]
                                            if (!file) return
                                            setPhotoUploading(true)
                                            try {
                                                const { uploadToCloudinary } = await import('@/lib/cloudinary')
                                                const result = await uploadToCloudinary(file, 'staff-profiles')
                                                setFormData(p => ({ ...p, profilePhoto: result.url }))
                                                toast.success('Photo uploaded')
                                            } catch (error) {
                                                toast.error('Failed to upload photo')
                                            } finally {
                                                setPhotoUploading(false)
                                            }
                                        }}
                                    />
                                </label>
                            </div>
                            <p className="text-[10px] text-text-tertiary mt-2 uppercase tracking-widest font-bold">Profile Photo (Optional)</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Full Name"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="John Doe"
                                required
                            />
                            <Input
                                label="Email"
                                type="email"
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                placeholder="john@zenbourg.com"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Phone"
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="9876543210"
                                required
                            />
                            <Input
                                label="Password (Default: 123456)"
                                type="password"
                                value={formData.password}
                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                placeholder="••••••"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Select
                                label="Department"
                                value={formData.department}
                                onChange={e => setFormData({ ...formData, department: e.target.value })}
                                options={[
                                    { value: 'FRONT_DESK', label: 'Front Desk' },
                                    { value: 'HOUSEKEEPING', label: 'Housekeeping' },
                                    { value: 'KITCHEN', label: 'Kitchen' },
                                    { value: 'ROOM_SERVICE', label: 'Room Service' },
                                    { value: 'MAINTENANCE', label: 'Maintenance' },
                                    { value: 'SPA', label: 'Spa & Wellness' },
                                    { value: 'LAUNDRY', label: 'Laundry Service' },
                                    { value: 'SECURITY', label: 'Security' },
                                    { value: 'ACCOUNTS', label: 'Accounts' },
                                    { value: 'MANAGEMENT', label: 'Management' },
                                ]}
                            />
                            <Input
                                label="Designation/Role"
                                value={formData.designation}
                                onChange={e => setFormData({ ...formData, designation: e.target.value })}
                                placeholder="Chef / Manager / Waiter"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Select
                                label="Work Shift"
                                value={formData.workShift}
                                onChange={e => setFormData({ ...formData, workShift: e.target.value })}
                                options={[
                                    { value: 'Day Shift', label: '☀️ Day Shift (09:00 - 18:00)' },
                                    { value: 'Evening Shift', label: '🌆 Evening Shift (14:00 - 23:00)' },
                                    { value: 'Night Shift', label: '🌙 Night Shift (22:00 - 07:00)' },
                                ]}
                            />
                            <Input
                                label="Extra Allowance (₹)"
                                type="number"
                                min="0"
                                max="99999999"
                                value={formData.allowance}
                                onChange={e => setFormData({ ...formData, allowance: e.target.value.slice(0, 10) })}
                                placeholder="0"
                            />
                        </div>

                        {['SUPER_ADMIN', 'HOTEL_ADMIN'].includes(userRole) && (
                            <div className="grid grid-cols-2 gap-4">
                                <Select
                                    label="System Role (Permissions)"
                                    value={formData.userRole}
                                    onChange={e => setFormData({ ...formData, userRole: e.target.value })}
                                    options={[
                                        { value: 'MANAGER', label: 'Hotel Manager / Reception' },
                                        { value: 'STAFF', label: 'General Staff' },
                                    ]}
                                />
                                <Input
                                    label="Monthly Base Salary"
                                    type="number"
                                    min="0"
                                    max="99999999"
                                    value={formData.salary}
                                    onChange={e => setFormData({ ...formData, salary: e.target.value.slice(0, 10) })}
                                    placeholder="5000"
                                />
                            </div>
                        )}

                        <div className="flex justify-end gap-3 mt-6">
                            <Button variant="secondary" type="button" onClick={() => setShowAddModal(false)}>Cancel</Button>
                            <Button variant="primary" type="submit" loading={isSubmitting}>Create Account</Button>
                        </div>
                    </form>
                </Modal>

                {/* Edit Employee Modal */}
                <Modal
                    isOpen={showEditModal}
                    onClose={() => !isSavingEdit && setShowEditModal(false)}
                    title={`Edit Employee - ${editingStaff?.name || ''}`}
                    description="Update shift timings, extra allowances, department, and salary"
                    size="lg"
                >
                    <form onSubmit={handleSaveEdit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Full Name"
                                value={editFormData.name}
                                onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                                required
                            />
                            <Input
                                label="Phone"
                                value={editFormData.phone}
                                onChange={e => setEditFormData({ ...editFormData, phone: e.target.value })}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Select
                                label="Department"
                                value={editFormData.department}
                                onChange={e => setEditFormData({ ...editFormData, department: e.target.value })}
                                options={[
                                    { value: 'FRONT_DESK', label: 'Front Desk' },
                                    { value: 'HOUSEKEEPING', label: 'Housekeeping' },
                                    { value: 'KITCHEN', label: 'Kitchen' },
                                    { value: 'ROOM_SERVICE', label: 'Room Service' },
                                    { value: 'MAINTENANCE', label: 'Maintenance' },
                                    { value: 'SPA', label: 'Spa & Wellness' },
                                    { value: 'LAUNDRY', label: 'Laundry Service' },
                                    { value: 'SECURITY', label: 'Security' },
                                    { value: 'ACCOUNTS', label: 'Accounts' },
                                    { value: 'MANAGEMENT', label: 'Management' },
                                ]}
                            />
                            <Input
                                label="Designation/Role"
                                value={editFormData.designation}
                                onChange={e => setEditFormData({ ...editFormData, designation: e.target.value })}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Select
                                label="Work Shift (Night / Day / Evening)"
                                value={editFormData.workShift}
                                onChange={e => setEditFormData({ ...editFormData, workShift: e.target.value })}
                                options={[
                                    { value: 'Day Shift', label: '☀️ Day Shift (09:00 - 18:00)' },
                                    { value: 'Evening Shift', label: '🌆 Evening Shift (14:00 - 23:00)' },
                                    { value: 'Night Shift', label: '🌙 Night Shift (22:00 - 07:00)' },
                                ]}
                            />
                            <Select
                                label="Duty / Account Status"
                                value={editFormData.status}
                                onChange={e => setEditFormData({ ...editFormData, status: e.target.value })}
                                options={[
                                    { value: 'ACTIVE', label: 'Active' },
                                    { value: 'ON_LEAVE', label: 'On Leave' },
                                    { value: 'INACTIVE', label: 'Inactive' },
                                ]}
                            />
                        </div>

                        {['SUPER_ADMIN', 'HOTEL_ADMIN'].includes(userRole) && (
                            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-surface-light border border-border">
                                <Input
                                    label="Monthly Base Salary (₹)"
                                    type="number"
                                    min="0"
                                    max="99999999"
                                    value={editFormData.salary}
                                    onChange={e => setEditFormData({ ...editFormData, salary: e.target.value.slice(0, 10) })}
                                    placeholder="0"
                                />
                                <Input
                                    label="Extra Allowance (₹)"
                                    type="number"
                                    min="0"
                                    max="99999999"
                                    value={editFormData.allowance}
                                    onChange={e => setEditFormData({ ...editFormData, allowance: e.target.value.slice(0, 10) })}
                                    placeholder="0"
                                />
                            </div>
                        )}

                        <div className="flex justify-end gap-3 mt-6">
                            <Button variant="secondary" type="button" onClick={() => setShowEditModal(false)}>Cancel</Button>
                            <Button variant="primary" type="submit" loading={isSavingEdit}>Save Changes</Button>
                        </div>
                    </form>
                </Modal>

                {/* Delete Confirmation Popup Modal */}
                <Modal
                    isOpen={!!deleteConfirmStaff}
                    onClose={() => !isDeleting && setDeleteConfirmStaff(null)}
                    size="sm"
                    showClose={!isDeleting}
                >
                    <div className="flex flex-col items-center text-center p-2">
                        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-4 shadow-lg shadow-rose-500/5">
                            <Trash2 className="w-7 h-7" />
                        </div>
                        <h3 className="text-xl font-bold text-text-primary tracking-tight">
                            Remove Staff Member?
                        </h3>
                        <p className="text-sm text-text-secondary mt-2 leading-relaxed">
                            Are you sure you want to remove <span className="font-semibold text-text-primary">{deleteConfirmStaff?.name}</span>? This action cannot be undone and will revoke all system access.
                        </p>

                        {deleteConfirmStaff && (
                            <div className="w-full mt-4 p-3 rounded-xl bg-surface-light border border-border flex items-center justify-between text-left">
                                <div className="min-w-0 pr-2">
                                    <p className="text-xs font-bold text-text-primary truncate">{deleteConfirmStaff.name}</p>
                                    <p className="text-[11px] text-text-tertiary truncate">{deleteConfirmStaff.department} • {deleteConfirmStaff.designation}</p>
                                </div>
                                <div className="shrink-0">
                                    {renderShiftBadge(deleteConfirmStaff.workShift)}
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-3 w-full mt-6">
                            <Button
                                variant="secondary"
                                className="flex-1"
                                type="button"
                                disabled={isDeleting}
                                onClick={() => setDeleteConfirmStaff(null)}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="danger"
                                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold"
                                type="button"
                                loading={isDeleting}
                                onClick={handleConfirmDelete}
                            >
                                Remove
                            </Button>
                        </div>
                    </div>
                </Modal>



                {/* Staff List */}
                <Card className="bg-surface border-border overflow-hidden">
                    <div className="flex gap-4 border-b border-border bg-surface-light">
                        <button
                            onClick={() => setActiveTab('ALL')}
                            className={cn(
                                "px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative",
                                activeTab === 'ALL' ? "text-primary border-b-2 border-primary" : "text-text-tertiary hover:text-text-secondary"
                            )}
                        >
                            Staff
                        </button>
                        <button
                            onClick={() => setActiveTab('VERIFICATION')}
                            className={cn(
                                "px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative flex items-center gap-2",
                                activeTab === 'VERIFICATION' ? "text-primary border-b-2 border-primary" : "text-text-tertiary hover:text-text-secondary"
                            )}
                        >
                            Verification Tasks
                            {staffList.filter((s: any) => s.verificationRequested).length > 0 && (
                                <span className="w-5 h-5 bg-blue-600 text-white text-[10px] rounded-full flex items-center justify-center animate-pulse">
                                    {staffList.filter((s: any) => s.verificationRequested).length}
                                </span>
                            )}
                        </button>
                    </div>
                    <div className="p-4 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="relative w-full md:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                            <input
                                placeholder="Search staff by name or role..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-surface-light border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-text-primary placeholder:text-text-tertiary transition-all"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Select
                                value={filterDept}
                                onChange={(e) => setFilterDept(e.target.value)}
                                options={[
                                    { value: 'ALL', label: 'All Departments' },
                                    { value: 'FRONT_DESK', label: 'Front Desk' },
                                    { value: 'HOUSEKEEPING', label: 'Housekeeping' },
                                    { value: 'KITCHEN', label: 'Kitchen' },
                                    { value: 'ROOM_SERVICE', label: 'Room Service' },
                                    { value: 'MAINTENANCE', label: 'Maintenance' },
                                    { value: 'SPA', label: 'Spa' },
                                    { value: 'LAUNDRY', label: 'Laundry' },
                                    { value: 'SECURITY', label: 'Security' },
                                    { value: 'ACCOUNTS', label: 'Accounts' },
                                    { value: 'MANAGEMENT', label: 'Management' },
                                ]}
                                className="w-40 h-9 text-xs"
                            />
                            <Button
                                variant="secondary"
                                className="bg-surface-light border-border hover:bg-white/[0.1] h-9"
                                leftIcon={<Download className="w-4 h-4" />}
                                onClick={handleExport}
                            >
                                Export
                            </Button>
                        </div>
                    </div>

                    <div className="divide-y divide-white/[0.04]">
                        {/* Subtle top bar showing background refresh */}
                        {isValidating && !loading && (
                            <div className="h-0.5 bg-gradient-to-r from-transparent via-primary/40 to-transparent animate-pulse" />
                        )}
                        {loading ? (
                            <div className="divide-y divide-white/[0.04]">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <div key={i} className="p-4 flex items-center justify-between animate-pulse">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-white/[0.06]" />
                                            <div className="space-y-2">
                                                <div className="h-4 w-32 bg-white/[0.06] rounded-lg" />
                                                <div className="flex items-center gap-2">
                                                    <div className="h-3 w-20 bg-surface-light rounded-md" />
                                                    <div className="h-3 w-16 bg-surface-light rounded-md" />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-8">
                                            <div className="hidden lg:flex flex-col gap-2">
                                                <div className="h-3 w-28 bg-surface-light rounded-md" />
                                                <div className="h-3 w-36 bg-surface-light rounded-md" />
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                <div className="h-3 w-16 bg-surface-light rounded-md" />
                                                <div className="h-3 w-10 bg-surface-light rounded-md" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : filteredStaff.length === 0 ? (
                            <div className="p-12 text-center text-text-tertiary ">
                                No staff members found matching your search.
                            </div>
                        ) : (
                            filteredStaff.map((staff: any) => (
                                <div
                                    key={staff.id}
                                    className="relative group border-b border-border last:border-0 hover:bg-surface-light transition-colors"
                                >
                                    {/* Main Data Row - Navigates to detail on click */}
                                    <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <Link
                                            href={`/admin/staff/${staff.id}`}
                                            className="flex-1 flex items-center gap-4 group/link cursor-pointer min-w-0"
                                        >
                                            <Avatar name={staff.name} src={staff.profilePhoto} className="group-hover/link:ring-2 ring-primary/30 transition-all" />
                                            <div className="min-w-0">
                                                <h3 className="font-semibold text-text-primary group-hover/link:text-primary transition-colors">{staff.name}</h3>
                                                <div className="flex items-center flex-wrap gap-2 mt-1">
                                                    <span className="text-[10px] uppercase tracking-wider bg-surface-light text-text-secondary px-2 py-0.5 rounded-md font-bold border border-border">{staff.department}</span>
                                                    <span className="text-xs text-text-tertiary">• {staff.designation}</span>
                                                    {renderShiftBadge(staff.workShift)}
                                                    {staff.isVerified && <Badge variant="success" className="text-[8px] h-4">Verified</Badge>}
                                                    {staff.verificationRequested && activeTab === 'VERIFICATION' && <Badge variant="warning" className="text-[8px] h-4">Awaiting Action</Badge>}
                                                </div>
                                            </div>
                                        </Link>

                                        {/* Metadata Grid */}
                                        <div className="flex items-center gap-6 flex-wrap md:flex-nowrap shrink-0">
                                            <div className="hidden lg:flex flex-col gap-1 w-48">
                                                <div className="flex items-center gap-2 text-xs text-text-secondary">
                                                    <Phone className="w-3 h-3 opacity-50" /> {staff.phone || 'N/A'}
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-text-secondary truncate">
                                                    <Mail className="w-3 h-3 opacity-50" /> {staff.email}
                                                </div>
                                            </div>

                                            <div className="text-right min-w-[100px]">
                                                <div className="flex items-center gap-2 mb-1 justify-end">
                                                    <span className={`w-1.5 h-1.5 rounded-full shadow-[0_0_8px] ${staff.dutyStatus === 'ON_DUTY'
                                                        ? 'bg-emerald-500 shadow-emerald-500/50'
                                                        : staff.dutyStatus === 'PUNCHED_OUT'
                                                            ? 'bg-amber-500 shadow-amber-500/50'
                                                            : 'bg-gray-500 shadow-gray-500/50'
                                                        }`} />
                                                    <span className="text-xs font-bold tracking-wide text-text-secondary whitespace-nowrap">
                                                        {staff.dutyStatus === 'ON_DUTY' ? 'ON DUTY' : staff.dutyStatus === 'PUNCHED_OUT' ? 'PUNCHED OUT' : 'OFF DUTY'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1 text-[10px] text-text-tertiary justify-end uppercase tracking-wider">
                                                    <MapPin className="w-3 h-3" />
                                                    {staff.location || 'HQ'}
                                                </div>
                                            </div>

                                            {['SUPER_ADMIN', 'HOTEL_ADMIN'].includes(userRole) && (
                                                <div className="text-right border-l border-border pl-6 min-w-[110px] max-w-[160px] hidden sm:block">
                                                    <p className="text-[10px] text-text-tertiary uppercase tracking-wider mb-0.5">Salary</p>
                                                    <p className="font-bold text-text-primary font-mono text-sm truncate" title={`₹${Number(staff.salary || 0).toLocaleString('en-IN')}`}>
                                                        {formatSafeINR(staff.salary)}
                                                    </p>
                                                    {Number(staff.allowance || 0) > 0 && (
                                                        <p className="text-[10px] text-emerald-400 font-semibold font-mono whitespace-nowrap truncate" title={`+₹${Number(staff.allowance || 0).toLocaleString('en-IN')} allowance`}>
                                                            +{formatSafeINR(staff.allowance)} allowance
                                                        </p>
                                                    )}
                                                </div>
                                            )}

                                            {/* Static persistent action utility strip */}
                                            <div className="flex items-center gap-1 ml-2 pl-4 border-l border-border">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 rounded-lg bg-surface-light hover:bg-white/[0.08] border border-border text-primary hover:text-primary-light"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleOpenEdit(staff);
                                                    }}
                                                    title="Edit Employee (Shift, Allowance, Role)"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </Button>
                                                <Link href={`/admin/staff/${staff.id}`} title="View Record">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 rounded-lg bg-surface-light hover:bg-white/[0.08] border border-border text-text-secondary hover:text-text-primary"
                                                    >
                                                        <FileText className="w-4 h-4" />
                                                    </Button>
                                                </Link>
                                                {(session?.user.role === 'SUPER_ADMIN' || session?.user.role === 'HOTEL_ADMIN') && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 rounded-lg bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 text-rose-400/70 hover:text-rose-400"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setDeleteConfirmStaff(staff);
                                                        }}
                                                        title="Remove Employee"
                                                    >
                                                        <XCircle className="w-4 h-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* FORMAL BOTTOM VERIFICATION PANEL (Only visible in verification tab) */}
                                    {activeTab === 'VERIFICATION' && staff.verificationRequested && (
                                        <div className="mx-5 mb-5 p-4 bg-blue-500/[0.03] border border-blue-500/10 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                                                    <Info className="w-5 h-5 text-blue-400" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-text-primary">Identity Verification Required</p>
                                                    <p className="text-[10px] text-text-tertiary uppercase font-semibold tracking-wider mt-0.5">Please review documents and assign validation status.</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                                                {(staff.documents as any)?.idProofImage && (
                                                    <button
                                                        onClick={() => setIdProofModal((staff.documents as any).idProofImage)}
                                                        className="flex items-center gap-2 h-9 px-4 rounded-xl bg-surface-light border border-border hover:bg-white/[0.06] transition-all shrink-0"
                                                    >
                                                        <div className="w-5 h-5 rounded-md overflow-hidden border border-border shadow-inner">
                                                            <img src={(staff.documents as any).idProofImage} alt="Doc" className="w-full h-full object-cover" />
                                                        </div>
                                                        <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">View Document</span>
                                                    </button>
                                                )}
                                                
                                                <div className="h-9 w-[1px] bg-white/[0.08] hidden sm:block" />

                                                <Button
                                                    size="sm"
                                                    className="h-9 px-5 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 font-bold text-[10px] uppercase tracking-wider rounded-xl shrink-0"
                                                    onClick={() => handleVerifyAction(staff.id, 'REJECT')}
                                                >
                                                    Reject
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    className="h-9 px-6 bg-emerald-600 text-white hover:bg-emerald-500 border-none font-bold text-[10px] uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-900/20 shrink-0"
                                                    onClick={() => handleVerifyAction(staff.id, 'APPROVE')}
                                                >
                                                    Approve Verification
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </Card>
            </div>

            {/* ID Proof Image Modal */}
            {idProofModal && (
                <div
                    className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={() => setIdProofModal(null)}
                >
                    <div
                        className="relative max-w-2xl w-full bg-background rounded-3xl overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.8)] border border-border"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Subtle gradient accent at top */}
                        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />

                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 bg-surface border-b border-border">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                                    <FileText className="w-4 h-4 text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-text-primary tracking-tight">Identity Document</p>
                                    <p className="text-[10px] text-text-tertiary font-semibold uppercase tracking-wider mt-0.5">Staff Verification Proof</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <a
                                    href={idProofModal}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-light border border-border rounded-lg text-[10px] font-bold text-text-secondary hover:text-text-primary hover:bg-white/[0.08] transition-all uppercase tracking-wider"
                                    onClick={e => e.stopPropagation()}
                                >
                                    <Download className="w-3 h-3" />
                                    Open
                                </a>
                                <button
                                    onClick={() => setIdProofModal(null)}
                                    className="w-8 h-8 flex items-center justify-center hover:bg-white/[0.06] rounded-lg transition-colors text-text-tertiary hover:text-text-primary"
                                >
                                    <XCircle className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Image container */}
                        <div className="p-6 bg-background">
                            <div className="relative rounded-2xl overflow-hidden bg-black/40 border border-border shadow-inner">
                                <img
                                    src={idProofModal}
                                    alt="ID Proof Document"
                                    className="w-full object-contain max-h-[65vh] mx-auto"
                                />
                                {/* Subtle vignette */}
                                <div className="absolute inset-0 pointer-events-none rounded-2xl shadow-[inset_0_0_60px_rgba(0,0,0,0.3)]" />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between px-6 py-4 bg-surface border-t border-border">
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Encrypted Document · Secure Viewer</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setIdProofModal(null)}
                                    className="px-4 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary bg-surface-light hover:bg-white/[0.08] border border-border rounded-xl transition-all"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
