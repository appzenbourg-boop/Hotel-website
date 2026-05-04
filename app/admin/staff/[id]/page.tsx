'use client'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import {
    Mail,
    Phone,
    MapPin,
    Calendar,
    User,
    CreditCard,
    TrendingUp,
    Clock,
    ArrowLeft,
    CheckCircle2,
    Star,
    Edit2,
    Eye,
    EyeOff,
    MoreHorizontal,
    FileText,
    Download,
    CalendarDays,
    Plus,
    Save,
    Loader2,
    X,
    ChevronDown,
    Building2,
    Banknote,
    Send,
    Camera,
    ShieldCheck,
    ArrowRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'

type TabType = 'PERSONAL' | 'PAYROLL' | 'PERFORMANCE' | 'LEAVE' | 'BANK'

export default function StaffDetailPage() {
    const params = useParams()
    const router = useRouter()
    const [staff, setStaff] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<TabType>('PERSONAL')
    const [showSalary, setShowSalary] = useState(false)
    const [isEditModalOpen, setEditModalOpen] = useState(false)
    const [isUpdating, setIsUpdating] = useState(false)
    const [editingAttendance, setEditingAttendance] = useState<any>(null)
    const [attForm, setAttForm] = useState({ punchIn: '', punchOut: '', status: 'PRESENT', notes: '' })
    const [savingAtt, setSavingAtt] = useState(false)
    const [photoUploading, setPhotoUploading] = useState(false)

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (file.size > 5 * 1024 * 1024) { toast.error('Photo must be under 5MB'); return }
        setPhotoUploading(true)
        try {
            const { uploadToCloudinary } = await import('@/lib/cloudinary')
            const result = await uploadToCloudinary(file, 'staff-profiles')
            // Save to DB
            const res = await fetch(`/api/admin/staff/${params.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ profilePhoto: result.url })
            })
            if (res.ok) {
                setStaff((prev: any) => ({ ...prev, profilePhoto: result.url }))
                toast.success('Profile photo updated')
            } else {
                toast.error('Failed to save photo')
            }
        } catch (error) {
            console.error('[ADMIN_STAFF_PHOTO_ERROR]', error)
            toast.error('Failed to upload photo')
        } finally {
            setPhotoUploading(false)
        }
    }
    
    const [editForm, setEditForm] = useState({
        name: '', email: '', phone: '',
        designation: '', department: '',
        employeeId: '', baseSalary: '',
        dateOfJoining: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        address: '',
        contractType: '',
        workShift: '',
        managerName: '',
        status: 'ACTIVE',
        password: ''
    })

    const [leaveSubmitting, setLeaveSubmitting] = useState(false)
    const [leaveForm, setLeaveForm] = useState({
        leaveType: 'CASUAL',
        startDate: '',
        endDate: '',
        reason: ''
    })

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsUpdating(true)
        try {
            const res = await fetch(`/api/admin/staff/${params.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm)
            })
            if (res.ok) {
                toast.success('Personnel record updated')
                setEditModalOpen(false)
                setEditForm(prev => ({ ...prev, password: '' }))
                // Refresh data
                const updated = await fetch(`/api/admin/staff/${params.id}`)
                if (updated.ok) setStaff(await updated.json())
            } else {
                toast.error('Failed to update record')
            }
        } catch (error) {
            toast.error('Error updating record')
        } finally {
            setIsUpdating(false)
        }
    }

    const leaveDays = leaveForm.startDate && leaveForm.endDate
        ? Math.max(1, Math.ceil((new Date(leaveForm.endDate).getTime() - new Date(leaveForm.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1)
        : 0

    const openAttEdit = (att: any) => {
        setEditingAttendance(att)
        // Convert stored UTC datetime to local time string for input[type=time]
        const toTimeStr = (dt: string | null) => {
            if (!dt) return ''
            const d = new Date(dt)
            return d.toTimeString().slice(0, 5) // HH:MM
        }
        setAttForm({
            punchIn: toTimeStr(att.punchIn),
            punchOut: toTimeStr(att.punchOut),
            status: att.status || 'PRESENT',
            notes: att.notes || '',
        })
    }

    const handleAttSave = async () => {
        if (!editingAttendance) return
        setSavingAtt(true)
        try {
            // Build full datetime from date + time input
            const buildDT = (dateStr: string, timeStr: string) => {
                if (!timeStr) return null
                const [h, m] = timeStr.split(':').map(Number)
                const d = new Date(dateStr)
                d.setHours(h, m, 0, 0)
                return d.toISOString()
            }
            const dateStr = editingAttendance.date

            const punchIn  = buildDT(dateStr, attForm.punchIn)
            const punchOut = buildDT(dateStr, attForm.punchOut)

            // Calculate hours worked
            let hoursWorked = 0
            if (punchIn && punchOut) {
                hoursWorked = Math.round(((new Date(punchOut).getTime() - new Date(punchIn).getTime()) / 3600000) * 100) / 100
            }

            const res = await fetch(`/api/admin/staff/${params.id}/attendance`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    attendanceId: editingAttendance.id,
                    punchIn,
                    punchOut,
                    hoursWorked,
                    status: attForm.status,
                    notes: attForm.notes,
                }),
            })

            if (res.ok) {
                toast.success('Attendance record updated')
                setEditingAttendance(null)
                // Refresh staff data
                const updated = await fetch(`/api/admin/staff/${params.id}`)
                if (updated.ok) {
                    const json = await updated.json()
                    setStaff(json?.data ?? json)
                }
            } else {
                const err = await res.json().catch(() => ({}))
                toast.error(err?.error ?? 'Failed to update')
            }
        } catch { toast.error('Connection error') } finally { setSavingAtt(false) }
    }

    const handleLeaveSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!leaveForm.startDate || !leaveForm.endDate || !leaveForm.reason) {
            toast.error('Please fill all leave fields')
            return
        }
        setLeaveSubmitting(true)
        try {
            const res = await fetch(`/api/admin/staff/${params.id}/leave`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    leaveType: leaveForm.leaveType,
                    startDate: leaveForm.startDate,
                    endDate: leaveForm.endDate,
                    totalDays: leaveDays,
                    reason: leaveForm.reason
                })
            })
            if (res.ok) {
                toast.success('Leave request submitted successfully')
                setLeaveForm({ leaveType: 'CASUAL', startDate: '', endDate: '', reason: '' })
                // Refresh staff data
                const updated = await fetch(`/api/admin/staff/${params.id}`)
                if (updated.ok) setStaff(await updated.json())
            } else {
                toast.error('Failed to submit leave request')
            }
        } catch (error) {
            toast.error('Something went wrong')
        } finally {
            setLeaveSubmitting(false)
        }
    }

    useEffect(() => {
        const fetchStaff = async () => {
            try {
                const res = await fetch(`/api/admin/staff/${params.id}`)
                if (res.ok) {
                    const json = await res.json()
                    const data = json?.data ?? json
                    setStaff(data)
                    // Prefill edit form
                    setEditForm({
                        name: data.user.name || '',
                        email: data.user.email || '',
                        phone: data.user.phone || '',
                        designation: data.designation || '',
                        department: data.department || '',
                        employeeId: data.employeeId || '',
                        baseSalary: String(data.baseSalary || ''),
                        dateOfJoining: data.dateOfJoining ? new Date(data.dateOfJoining).toISOString().split('T')[0] : '',
                        emergencyContactName: data.emergencyContactName || '',
                        emergencyContactPhone: data.emergencyContactPhone || '',
                        address: data.address || '',
                        contractType: data.contractType || 'Full-Time Permanent',
                        workShift: data.workShift || 'Morning (06:00 - 14:00)',
                        managerName: data.managerName || 'Michael Scott',
                        status: data.user.status || 'ACTIVE'
                    })
                } else {
                    toast.error('Failed to load staff details')
                    router.push('/admin/staff')
                }
            } catch (error) {
                console.error(error)
                toast.error('Something went wrong')
            } finally {
                setLoading(false)
            }
        }
        fetchStaff()
    }, [params.id, router])

    const exportToPDF = () => {
        const doc = new jsPDF() as any
        
        // Header
        doc.setFillColor(35, 54, 72)
        doc.rect(0, 0, 210, 40, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(22)
        doc.text("PERSONNEL RECORD", 15, 25)
        
        doc.setFontSize(10)
        doc.text(`Report Generated: ${new Date().toLocaleString()}`, 140, 25)
        
        // Profile Info
        doc.setTextColor(33, 33, 33)
        doc.setFontSize(14)
        doc.text("Primary Employee Data", 15, 55)
        
        const profileData = [
            ["Full Name", staff.user.name],
            ["Employee ID", staff.employeeId],
            ["Designation", staff.designation],
            ["Department", staff.department.replace('_', ' ')],
            ["Joining Date", new Date(staff.dateOfJoining).toLocaleDateString()],
            ["Work Shift", staff.workShift || 'Morning (06:00 - 14:00)'],
            ["Contract", staff.contractType || 'Full-Time Permanent']
        ]
        
        autoTable(doc, {
            startY: 62,
            head: [['Field', 'Information']],
            body: profileData,
            theme: 'striped',
            headStyles: { fillColor: [44, 62, 80] }
        })
        
        // Contact Info
        doc.setFontSize(14)
        doc.text("Contact Information", 15, (doc as any).lastAutoTable.finalY + 15)
        
        const contactData = [
            ["Email", staff.user.email],
            ["Phone", staff.user.phone || 'N/A'],
            ["Emergency Contact", staff.emergencyContactName || 'N/A'],
            ["Emergency Phone", staff.emergencyContactPhone || 'N/A'],
            ["Home Address", staff.address || 'N/A']
        ]
        
        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 10,
            head: [['Contact Type', 'Details']],
            body: contactData,
            theme: 'grid',
            headStyles: { fillColor: [52, 73, 94] }
        })
        
        // Payment History (Top 5)
        if (staff.payrolls && staff.payrolls.length > 0) {
            doc.setFontSize(14)
            doc.text("Recent Payment Profile (Last 5 Cycles)", 15, (doc as any).lastAutoTable.finalY + 15)
            
            const paymentData = staff.payrolls.slice(0, 5).map((p: any) => [
                `${p.month} ${p.year}`,
                `Rs. ${p.baseSalary}`,
                `Rs. ${p.incentives + (p.bonuses || 0)}`,
                `Rs. ${p.netSalary}`,
                p.status
            ])
            
            autoTable(doc, {
                startY: (doc as any).lastAutoTable.finalY + 10,
                head: [['Period', 'Base', 'Added', 'Net Salary', 'Status']],
                body: paymentData,
                theme: 'striped',
                headStyles: { fillColor: [16, 185, 129] }
            })
        }

        // Attendance History (Last 30)
        if (staff.attendances && staff.attendances.length > 0) {
            doc.addPage()
            doc.setFillColor(35, 54, 72)
            doc.rect(0, 0, 210, 20, 'F')
            doc.setTextColor(255, 255, 255)
            doc.setFontSize(14)
            doc.text("Attendance & Continuity Record", 15, 13)
            
            doc.setTextColor(33, 33, 33)
            const attendanceData = staff.attendances.slice(0, 30).map((a: any) => [
                new Date(a.date).toLocaleDateString(),
                a.punchIn ? new Date(a.punchIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--',
                a.punchOut ? new Date(a.punchOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--',
                `${a.hoursWorked || '0.0'} hrs`,
                a.status
            ])
            
            autoTable(doc, {
                startY: 25,
                head: [['Date', 'Punch In', 'Punch Out', 'Duration', 'Status']],
                body: attendanceData,
                theme: 'grid',
                headStyles: { fillColor: [52, 73, 94] }
            })
        }
        
        doc.save(`${staff.user.name.replace(/\s+/g, '_')}_comprehensive_record.pdf`)
        toast.success('Comprehensive Personnel PDF generated successfully')
    }

    if (loading) return <div className="p-8 space-y-8 animate-pulse">
        <div className="flex gap-8">
            <div className="w-80 h-[600px] bg-white/5 rounded-3xl" />
            <div className="flex-1 space-y-8">
                <div className="h-16 bg-white/5 rounded-2xl w-full" />
                <div className="h-[400px] bg-white/5 rounded-3xl w-full" />
            </div>
        </div>
    </div>

    if (!staff) return null

    const tabs = [
        { id: 'PERSONAL',    label: 'Personal & Employment',  icon: User },
        { id: 'PAYROLL',     label: 'Payroll & Compensation', icon: CreditCard },
        { id: 'PERFORMANCE', label: 'Performance',            icon: TrendingUp },
        { id: 'LEAVE',       label: 'Leave & Attendance',     icon: CalendarDays },
        { id: 'BANK',        label: 'Bank Details',           icon: Building2 },
    ]

    return (
        <div className="max-w-[1600px] mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors group"
                >
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10">
                        <ArrowLeft className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-bold uppercase tracking-widest">Back to Directory</span>
                </button>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <Button 
                            onClick={exportToPDF}
                            variant="primary" size="sm" leftIcon={<FileText className="w-4 h-4" />}
                            className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20"
                        >
                            Export Personnel Record (PDF)
                        </Button>
                    </div>
                    <Button onClick={() => setEditModalOpen(true)} className="bg-white/5 border-white/10 hover:bg-primary hover:text-white" size="sm" leftIcon={<Edit2 className="w-4 h-4" />}>Update Records</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[380px,1fr] gap-8">
                {/* SIDEBAR */}
                <div className="space-y-6">
                    {/* Main Profile Card */}
                    <Card className="bg-[#233648]/50 border-white/5 rounded-[2.5rem] p-8 space-y-8 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/10 transition-colors" />

                        <div className="relative flex flex-col items-center text-center space-y-6">
                            <div className="relative">
                                <div className="w-32 h-32 rounded-[2.5rem] overflow-hidden border-4 border-white/5 ring-4 ring-primary/10 shadow-2xl relative group/avatar">
                                    <Image
                                        src={staff.profilePhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${staff.user.name}`}
                                        alt="" width={128} height={128} className="object-cover w-full h-full" unoptimized
                                    />
                                    {/* Photo upload overlay */}
                                    <label className="absolute inset-0 bg-black/60 opacity-0 group-hover/avatar:opacity-100 transition-all duration-200 flex flex-col items-center justify-center cursor-pointer z-10">
                                        {photoUploading ? (
                                            <Loader2 className="w-6 h-6 text-white animate-spin" />
                                        ) : (
                                            <>
                                                <Camera className="w-6 h-6 text-white mb-1" />
                                                <span className="text-[9px] font-bold text-white/80 uppercase tracking-widest">Change</span>
                                            </>
                                        )}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handlePhotoUpload}
                                            disabled={photoUploading}
                                        />
                                    </label>
                                </div>
                                <div className="absolute top-2 right-2 w-4 h-4 bg-emerald-500 rounded-full border-4 border-[#233648] shadow-[0_0_15px_rgba(16,185,129,0.5)] z-20" />
                            </div>

                            <div>
                                <h1 className="text-2xl font-bold text-white tracking-tight">{staff.user.name}</h1>
                                <p className="text-primary text-[11px] font-bold uppercase tracking-[0.2em] mt-1">
                                    {staff.designation} • {staff.department.replace('_', ' ')}
                                </p>
                                <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-xl border border-white/5 shadow-inner">
                                    <Badge className="w-3 h-3 p-0" variant="secondary" />
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">ID: {staff.employeeId}</span>
                                </div>
                            </div>

                            <div className="flex gap-3 w-full">
                                <Button 
                                    className="flex-1 bg-white/5 border-white/10 hover:bg-white/10 h-12 rounded-2xl" 
                                    leftIcon={<Mail className="w-4 h-4" />}
                                    onClick={() => window.location.href = `mailto:${staff.user.email}`}
                                >
                                    Email
                                </Button>
                                <Button 
                                    className="flex-1 bg-white/5 border-white/10 hover:bg-white/10 h-12 rounded-2xl" 
                                    leftIcon={<Phone className="w-4 h-4" />}
                                    onClick={() => {
                                        if (staff.user.phone) {
                                            window.location.href = `tel:${staff.user.phone}`
                                        } else {
                                            toast.error('No phone number available')
                                        }
                                    }}
                                >
                                    Call
                                </Button>
                            </div>
                        </div>
                    </Card>

                    {/* Contact Info Card */}
                    <Card className="bg-[#233648]/50 border-white/5 rounded-[2.5rem] p-8 space-y-6">
                        <h3 className="text-[11px] font-bold text-gray-600 uppercase tracking-[0.2em] ml-1">Contact Information</h3>

                        <div className="space-y-6">
                            <div className="flex items-start gap-4 group cursor-pointer">
                                <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5 group-hover:border-primary/30 transition-all">
                                    <Mail className="w-4 h-4 text-gray-500 group-hover:text-primary" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-0.5">Email Address</p>
                                    <p className="text-sm font-bold text-white group-hover:text-primary transition-colors">{staff.user.email}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4 group cursor-pointer">
                                <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5 group-hover:border-primary/30 transition-all">
                                    <Phone className="w-4 h-4 text-gray-500 group-hover:text-primary" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-0.5">Mobile Phone</p>
                                    <p className="text-sm font-bold text-white group-hover:text-primary transition-colors">{staff.user.phone || 'Not provided'}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4 group cursor-pointer">
                                <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5 group-hover:border-primary/30 transition-all">
                                    <MapPin className="w-4 h-4 text-gray-500 group-hover:text-primary" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-0.5">Home Address</p>
                                    <p className="text-sm font-bold text-white leading-relaxed group-hover:text-primary transition-colors whitespace-pre-wrap">{staff.address || 'Address not listed'}</p>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Performance Metrics Sidebar Card */}
                    <Card className="bg-[#233648]/50 border-white/5 rounded-[2.5rem] p-8 space-y-6">
                        <h3 className="text-[11px] font-bold text-gray-600 uppercase tracking-[0.2em] ml-1">Current Month Performance</h3>

                        <div className="space-y-6">
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <p className="text-xs font-bold text-gray-400">Task Completion</p>
                                    <p className="text-xs font-bold text-white">92%</p>
                                </div>
                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-primary rounded-full w-[92%] shadow-[0_0_10px_rgba(74,158,255,0.5)]" />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <p className="text-xs font-bold text-gray-400">SLA Adherence</p>
                                    <p className="text-xs font-bold text-white">98%</p>
                                </div>
                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 rounded-full w-[98%] shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Security & Access Sidebar Card */}
                    <Card className="bg-rose-500/5 border-rose-500/10 rounded-[2.5rem] p-8 space-y-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 blur-3xl rounded-full" />
                        
                        <div className="flex items-center justify-between">
                            <h3 className="text-[11px] font-bold text-rose-500/60 uppercase tracking-[0.2em] ml-1">Security & Access</h3>
                            <ShieldCheck className="w-4 h-4 text-rose-500/40" />
                        </div>

                        <div className="space-y-4">
                            <button 
                                onClick={() => {
                                    setEditModalOpen(true)
                                    // Smoothly scroll to the password section in the modal if possible, 
                                    // but opening the modal is the priority
                                }}
                                className="w-full h-14 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500 text-rose-400 hover:text-white rounded-[1.2rem] flex items-center justify-between px-6 transition-all group/btn"
                            >
                                <div className="flex items-center gap-3">
                                    <Edit2 className="w-4 h-4" />
                                    <span className="text-xs font-bold uppercase tracking-widest">Override Password</span>
                                </div>
                                <ArrowRight className="w-4 h-4 opacity-0 group-hover/btn:opacity-100 transition-all translate-x-[-10px] group-hover/btn:translate-x-0" />
                            </button>

                            <div className="p-4 bg-[#0d1117]/40 rounded-[1.2rem] border border-white/[0.03]">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Account Status</span>
                                    <span className={cn(
                                        "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md",
                                        staff.user.status === 'ACTIVE' ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                                    )}>
                                        {staff.user.status}
                                    </span>
                                </div>
                                <p className="text-[9px] text-gray-600 leading-relaxed font-bold uppercase tracking-tight">
                                    Passwords can only be overridden by administrators. Changes are logged in the security audit trail.
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* MAIN CONTENT AREA */}
                <div className="space-y-8">
                    {/* Tabs Navigation */}
                    <div className="bg-[#182433]/40 border border-white/[0.04] p-1 rounded-2xl flex items-center gap-1 shadow-sm backdrop-blur-sm">
                        {tabs.map((tab) => {
                            const active = activeTab === tab.id
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as TabType)}
                                    className={cn(
                                        "relative flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[9px] font-bold transition-all duration-200 uppercase tracking-tighter",
                                        active
                                            ? "bg-[#4A9EFF] text-white shadow-md shadow-[#4A9EFF]/10"
                                            : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.02]"
                                    )}
                                >
                                    <tab.icon className={cn("w-3.5 h-3.5 transition-opacity duration-200", active ? "opacity-100" : "opacity-30")} />
                                    <span className="hidden lg:inline whitespace-nowrap">{tab.label}</span>
                                </button>
                            )
                        })}
                    </div>

                    {/* Tab Panels */}
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {activeTab === 'PERSONAL' && (
                            <div className="space-y-8">
                                <Card className="bg-[#233648]/50 border-white/5 rounded-[2.5rem] p-10 space-y-12">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-2xl font-bold text-white tracking-tight">Employment Information</h2>
                                        <button onClick={() => setEditModalOpen(true)} className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] hover:brightness-125 transition-all">Update Details</button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-x-12 gap-y-10">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest ml-1">Department</label>
                                            <div className="p-4 bg-black/30 border border-white/5 rounded-2xl shadow-inner">
                                                <p className="text-sm font-bold text-white">{staff.department.replace('_', ' ')}</p>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest ml-1">Job Title</label>
                                            <div className="p-4 bg-black/30 border border-white/5 rounded-2xl shadow-inner">
                                                <p className="text-sm font-bold text-white">{staff.designation}</p>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest ml-1">Date of Joining</label>
                                            <div className="p-4 bg-black/30 border border-white/5 rounded-2xl shadow-inner">
                                                <p className="text-sm font-bold text-white">{new Date(staff.dateOfJoining).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest ml-1">Contract Type</label>
                                            <div className="p-4 bg-black/30 border border-white/5 rounded-2xl shadow-inner">
                                                <p className="text-sm font-bold text-white">{staff.contractType || 'Full-Time Permanent'}</p>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest ml-1">Reporting Manager</label>
                                            <div className="flex items-center gap-3 p-4 bg-black/30 border border-white/5 rounded-2xl shadow-inner">
                                                <div className="w-6 h-6 rounded-full overflow-hidden border border-white/10">
                                                    <Image src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${staff.managerName || 'manager'}`} alt="" width={24} height={24} unoptimized />
                                                </div>
                                                <p className="text-sm font-bold text-white">{staff.managerName || 'Michael Scott'}</p>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest ml-1">Work Shift</label>
                                            <div className="p-4 bg-black/30 border border-white/5 rounded-2xl shadow-inner">
                                                <p className="text-sm font-bold text-white">{staff.workShift || 'Morning (06:00 - 14:00)'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-12 border-t border-white/5 space-y-10">
                                        <h2 className="text-xl font-bold text-white tracking-tight">Emergency Contact</h2>
                                        <div className="grid grid-cols-2 gap-x-12 gap-y-10">
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest ml-1">Contact Name</label>
                                                <div className="p-4 bg-black/30 border border-white/5 rounded-2xl shadow-inner">
                                                    <p className="text-sm font-bold text-white">{staff.emergencyContactName || 'Robert Jenkins'}</p>
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest ml-1">Relationship</label>
                                                <div className="p-4 bg-black/30 border border-white/5 rounded-2xl shadow-inner">
                                                    <p className="text-sm font-bold text-white">Spouse</p>
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest ml-1">Emergency Phone</label>
                                                <div className="p-4 bg-black/30 border border-white/5 rounded-2xl shadow-inner">
                                                    <p className="text-sm font-bold text-white">{staff.emergencyContactPhone || '+1 (555) 987-6543'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Card>

                                <div className="grid grid-cols-2 gap-8">
                                    <Card className="bg-[#233648]/50 border-white/5 rounded-[2.5rem] p-8 space-y-6">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-sm font-bold text-white tracking-tight">Current Salary</h3>
                                            <button
                                                onClick={() => setShowSalary(!showSalary)}
                                                className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center border border-white/5 hover:bg-white/10 transition-colors"
                                            >
                                                {showSalary ? <EyeOff className="w-4 h-4 text-gray-500" /> : <Eye className="w-4 h-4 text-gray-500" />}
                                            </button>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1">Monthly gross income</p>
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-3xl font-bold text-white tracking-tighter">
                                                    {showSalary ? `₹${staff.baseSalary.toLocaleString()}` : '•••• ••'}
                                                </span>
                                                <span className="text-xs font-bold text-gray-600 uppercase tracking-widest">INR</span>
                                            </div>
                                        </div>
                                    </Card>

                                    <Card className="bg-[#233648]/50 border-white/5 rounded-[2.5rem] p-8 space-y-6">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-sm font-bold text-white tracking-tight">Upcoming Leave</h3>
                                            <Calendar className="w-5 h-5 text-gray-600" />
                                        </div>
                                        {staff.leaveRequests?.length > 0 ? (
                                            <div className="space-y-3">
                                                {staff.leaveRequests.slice(0, 3).map((lr: any) => (
                                                    <div key={lr.id} className="flex items-center gap-4 p-4 bg-black/30 border border-white/5 rounded-2xl shadow-inner relative group cursor-pointer hover:border-primary/20 transition-all">
                                                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border", lr.status === 'APPROVED' ? 'bg-emerald-500/10 border-emerald-500/20' : lr.status === 'REJECTED' ? 'bg-red-500/10 border-red-500/20' : 'bg-amber-500/10 border-amber-500/20')}>
                                                            <Clock className={cn("w-5 h-5", lr.status === 'APPROVED' ? 'text-emerald-500' : lr.status === 'REJECTED' ? 'text-red-500' : 'text-amber-500')} />
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex justify-between items-start">
                                                                <p className="text-sm font-bold text-white">{lr.leaveType} Leave</p>
                                                                <Badge variant={lr.status === 'APPROVED' ? 'success' : lr.status === 'REJECTED' ? 'danger' : 'warning'} className="text-[8px] px-2 py-0">{lr.status}</Badge>
                                                            </div>
                                                            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mt-0.5">
                                                                {new Date(lr.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ({lr.totalDays} Day{lr.totalDays > 1 ? 's' : ''})
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-600  py-4">No leave requests found.</p>
                                        )}
                                    </Card>
                                </div>

                                {/* Recent Payments Table - Directly visible in Personal tab as requested by the admin */}
                                <Card className="bg-[#233648]/50 border-white/5 rounded-[2.5rem] p-10 space-y-8">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h2 className="text-xl font-bold text-white tracking-tight">Recent Payment Profile</h2>
                                            <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Directly showing last 5 payment cycles</p>
                                        </div>
                                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                            <TrendingUp className="w-5 h-5 text-emerald-500" />
                                        </div>
                                    </div>
                                    
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="border-b border-white/5">
                                                    <th className="pb-4 text-[10px] font-bold text-gray-600 uppercase tracking-widest pl-4">Pay Period</th>
                                                    <th className="pb-4 text-[10px] font-bold text-gray-600 uppercase tracking-widest">Base</th>
                                                    <th className="pb-4 text-[10px] font-bold text-gray-600 uppercase tracking-widest">Added</th>
                                                    <th className="pb-4 text-[10px] font-bold text-gray-600 uppercase tracking-widest">Net Total</th>
                                                    <th className="pb-4 text-[10px] font-bold text-gray-600 uppercase tracking-widest">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/[0.02]">
                                                {staff.payrolls?.slice(0, 5).map((payroll: any) => (
                                                    <tr key={payroll.id} className="group hover:bg-white/[0.01] transition-colors">
                                                        <td className="py-5 pl-4">
                                                            <p className="text-sm font-bold text-white">{payroll.month} {payroll.year}</p>
                                                        </td>
                                                        <td className="py-5">
                                                            <p className="text-sm font-bold text-gray-400">Rs. {payroll.baseSalary}</p>
                                                        </td>
                                                        <td className="py-5">
                                                            <p className="text-sm font-bold text-emerald-500">+Rs. {payroll.incentives + (payroll.bonuses || 0)}</p>
                                                        </td>
                                                        <td className="py-5">
                                                            <p className="text-sm font-bold text-white tracking-tight">Rs. {payroll.netSalary}</p>
                                                        </td>
                                                        <td className="py-5">
                                                            <Badge variant={payroll.status === 'PAID' ? 'success' : 'warning'}>{payroll.status}</Badge>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {(!staff.payrolls || staff.payrolls.length === 0) && (
                                                    <tr>
                                                        <td colSpan={5} className="py-12 text-center text-gray-600 ">No disbursement history found for this employee yet.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                    {staff.payrolls?.length > 5 && (
                                        <div className="pt-4 flex justify-center">
                                            <button 
                                                onClick={() => setActiveTab('PAYROLL')}
                                                className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] hover:text-primary transition-all underline underline-offset-4"
                                            >
                                                View All Disbursement History →
                                            </button>
                                        </div>
                                    )}
                                </Card>
                            </div>
                        )}

                        {activeTab === 'LEAVE' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right-4">

                                {/* ── Leave Balance Management ── */}
                                <LeaveBalanceCard staff={staff} staffId={params.id as string} onUpdate={(updated) => setStaff((prev: any) => ({ ...prev, ...updated }))} />

                                <Card className="bg-[#233648]/50 border-white/5 rounded-[2.5rem] p-10 space-y-8">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-2xl font-bold text-white tracking-tight">Attendance History</h2>
                                        <Button 
                                            onClick={exportToPDF}
                                            variant="secondary" size="sm" leftIcon={<FileText className="w-4 h-4" />}
                                            className="bg-white/5 border-white/5 hover:bg-white/10"
                                        >
                                            Export History (PDF)
                                        </Button>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="border-b border-white/5">
                                                    <th className="pb-4 text-[10px] font-bold text-gray-600 uppercase tracking-widest pl-4">Date</th>
                                                    <th className="pb-4 text-[10px] font-bold text-gray-600 uppercase tracking-widest">Punch In</th>
                                                    <th className="pb-4 text-[10px] font-bold text-gray-600 uppercase tracking-widest">Punch Out</th>
                                                    <th className="pb-4 text-[10px] font-bold text-gray-600 uppercase tracking-widest">Hours</th>
                                                    <th className="pb-4 text-[10px] font-bold text-gray-600 uppercase tracking-widest">Status</th>
                                                    <th className="pb-4 text-[10px] font-bold text-gray-600 uppercase tracking-widest w-24">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/[0.02]">
                                                {staff.attendances?.length > 0 ? staff.attendances.map((att: any) => {
                                                    const isEditing = editingAttendance?.id === att.id

                                                    // Calculate preview hours while editing
                                                    let previewHours = att.hoursWorked || '0.0'
                                                    if (isEditing && attForm.punchIn && attForm.punchOut) {
                                                        const [ih, im] = attForm.punchIn.split(':').map(Number)
                                                        const [oh, om] = attForm.punchOut.split(':').map(Number)
                                                        const mins = (oh * 60 + om) - (ih * 60 + im)
                                                        if (mins > 0) previewHours = (mins / 60).toFixed(2)
                                                    }

                                                    return (
                                                        <tr key={att.id} className={`transition-colors ${isEditing ? 'bg-primary/5 border-l-2 border-l-primary' : 'hover:bg-white/[0.01]'}`}>
                                                            {/* Date — never editable */}
                                                            <td className="py-3 pl-4">
                                                                <p className="text-sm font-bold text-white">{new Date(att.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                                            </td>

                                                            {/* Punch In */}
                                                            <td className="py-3">
                                                                {isEditing ? (
                                                                    <input
                                                                        type="time"
                                                                        value={attForm.punchIn}
                                                                        onChange={e => setAttForm(p => ({ ...p, punchIn: e.target.value }))}
                                                                        className="bg-black/40 border border-primary/40 rounded-lg px-2 py-1.5 text-sm text-white font-bold outline-none focus:border-primary w-28 [color-scheme:dark]"
                                                                    />
                                                                ) : (
                                                                    <p className="text-sm font-bold text-gray-400">{att.punchIn ? new Date(att.punchIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</p>
                                                                )}
                                                            </td>

                                                            {/* Punch Out */}
                                                            <td className="py-3">
                                                                {isEditing ? (
                                                                    <input
                                                                        type="time"
                                                                        value={attForm.punchOut}
                                                                        onChange={e => setAttForm(p => ({ ...p, punchOut: e.target.value }))}
                                                                        className="bg-black/40 border border-primary/40 rounded-lg px-2 py-1.5 text-sm text-white font-bold outline-none focus:border-primary w-28 [color-scheme:dark]"
                                                                    />
                                                                ) : (
                                                                    <p className={`text-sm font-bold ${!att.punchOut ? 'text-amber-400' : 'text-gray-400'}`}>
                                                                        {att.punchOut ? new Date(att.punchOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                                                    </p>
                                                                )}
                                                            </td>

                                                            {/* Hours */}
                                                            <td className="py-3">
                                                                <p className={`text-sm font-bold ${isEditing ? 'text-primary' : 'text-white'}`}>{previewHours} hrs</p>
                                                            </td>

                                                            {/* Status */}
                                                            <td className="py-3">
                                                                {isEditing ? (
                                                                    <select
                                                                        value={attForm.status}
                                                                        onChange={e => setAttForm(p => ({ ...p, status: e.target.value }))}
                                                                        className="bg-black/40 border border-primary/40 rounded-lg px-2 py-1.5 text-xs text-white font-bold outline-none focus:border-primary appearance-none cursor-pointer [color-scheme:dark]"
                                                                    >
                                                                        <option value="PRESENT">Present</option>
                                                                        <option value="ABSENT">Absent</option>
                                                                        <option value="LATE">Late</option>
                                                                        <option value="HALF_DAY">Half Day</option>
                                                                        <option value="ON_LEAVE">On Leave</option>
                                                                    </select>
                                                                ) : (
                                                                    <Badge variant={att.status === 'PRESENT' ? 'success' : att.status === 'LATE' ? 'warning' : 'danger'} className="text-[10px] font-bold">
                                                                        {att.status}
                                                                    </Badge>
                                                                )}
                                                            </td>

                                                            {/* Action */}
                                                            <td className="py-3">
                                                                {isEditing ? (
                                                                    <div className="flex items-center gap-1.5">
                                                                        <button
                                                                            onClick={handleAttSave}
                                                                            disabled={savingAtt}
                                                                            className="flex items-center gap-1 px-2.5 py-1.5 bg-primary text-white text-[11px] font-bold rounded-lg hover:bg-primary/90 transition-all disabled:opacity-50"
                                                                        >
                                                                            {savingAtt ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                                                            Save
                                                                        </button>
                                                                        <button
                                                                            onClick={() => setEditingAttendance(null)}
                                                                            className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg transition-all"
                                                                        >
                                                                            <X className="w-3.5 h-3.5 text-gray-400" />
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => openAttEdit(att)}
                                                                        className="flex items-center gap-1 px-2.5 py-1.5 bg-white/5 hover:bg-primary/20 hover:text-primary border border-white/5 hover:border-primary/30 rounded-lg text-[11px] font-bold text-gray-500 transition-all"
                                                                    >
                                                                        <Edit2 className="w-3 h-3" /> Edit
                                                                    </button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    )
                                                }) : (
                                                    <tr>
                                                        <td colSpan={6} className="py-12 text-center text-gray-600">No attendance records found.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </Card>

                                <Card className="bg-[#233648]/50 border-white/5 rounded-[2.5rem] p-10 space-y-8">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-2xl font-bold text-white tracking-tight">Apply for Leave</h2>
                                        <FileText className="w-5 h-5 text-gray-600" />
                                    </div>
                                    <form className="grid grid-cols-2 gap-8" onSubmit={handleLeaveSubmit}>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest ml-1">Leave Type</label>
                                            <div className="relative group">
                                                <select
                                                    value={leaveForm.leaveType}
                                                    onChange={(e) => setLeaveForm({ ...leaveForm, leaveType: e.target.value })}
                                                    className="w-full bg-[#0a0f14] border border-white/5 rounded-2xl py-4 pl-6 pr-12 text-white font-bold outline-none focus:border-primary/50 transition-all appearance-none cursor-pointer [color-scheme:dark] shadow-inner"
                                                >
                                                    <option value="CASUAL">Casual Leave</option>
                                                    <option value="SICK">Sick Leave</option>
                                                    <option value="EARNED">Earned Leave</option>
                                                    <option value="UNPAID">Unpaid Leave</option>
                                                </select>
                                                <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none group-hover:text-primary transition-colors" />
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest ml-1">Start Date</label>
                                            <input
                                                type="date"
                                                value={leaveForm.startDate}
                                                onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                                                className="w-full bg-black/30 border border-white/10 rounded-2xl py-4 px-6 text-white font-bold outline-none focus:border-primary transition-all [color-scheme:dark]"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest ml-1">End Date</label>
                                            <input
                                                type="date"
                                                value={leaveForm.endDate}
                                                min={leaveForm.startDate}
                                                onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                                                className="w-full bg-black/30 border border-white/10 rounded-2xl py-4 px-6 text-white font-bold outline-none focus:border-primary transition-all [color-scheme:dark]"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest ml-1">Reason for Leave</label>
                                            <textarea
                                                value={leaveForm.reason}
                                                onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                                                className="w-full bg-black/30 border border-white/10 rounded-2xl py-4 px-6 text-white font-bold outline-none focus:border-primary transition-all min-h-[120px] resize-none"
                                                placeholder="Explain your leave requirement..."
                                                required
                                            />
                                        </div>
                                        <div className="col-span-2 flex items-center justify-between pt-4">
                                            {leaveDays > 0 && (
                                                <p className="text-sm font-bold text-gray-400">Duration: <span className="text-white">{leaveDays} day{leaveDays > 1 ? 's' : ''}</span></p>
                                            )}
                                            <Button variant="primary" type="submit" loading={leaveSubmitting} className="px-12 h-14 rounded-2xl shadow-xl shadow-primary/20 ml-auto">Submit Request</Button>
                                        </div>
                                    </form>
                                </Card>
                            </div>
                        )}

                        {activeTab === 'BANK' && (
                            <BankDetailsTab
                                staff={staff}
                                staffId={params.id as string}
                                onUpdate={(updated: any) => setStaff((prev: any) => ({ ...prev, ...updated }))}
                            />
                        )}

                        {activeTab === 'PAYROLL' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                                <Card className="bg-[#233648]/50 border-white/5 rounded-[2.5rem] p-10 space-y-8">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-2xl font-bold text-white tracking-tight">Payroll History</h2>
                                        <button 
                                            onClick={exportToPDF}
                                            className="p-2 hover:bg-white/5 rounded-full transition-colors group flex items-center gap-2"
                                            title="Export disbursement record to PDF"
                                        >
                                            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Export PDF</span>
                                            <FileText className="w-5 h-5 text-gray-600 group-hover:text-primary transition-colors" />
                                        </button>
                                    </div>

                                    {/* Bank details warning if missing */}
                                    {(!staff.bankName || !staff.accountNumber || !staff.ifscCode) && (
                                        <div className="flex items-start gap-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
                                            <Building2 className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                                            <div>
                                                <p className="text-xs font-bold text-amber-400">Bank details missing</p>
                                                <p className="text-[11px] text-gray-500 mt-0.5">
                                                    Add bank account details in the <button onClick={() => setActiveTab('BANK')} className="text-primary underline">Bank Details</button> tab before processing payouts.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="border-b border-white/5">
                                                    <th className="pb-4 text-[10px] font-bold text-gray-600 uppercase tracking-widest pl-4">Pay Period</th>
                                                    <th className="pb-4 text-[10px] font-bold text-gray-600 uppercase tracking-widest">Base</th>
                                                    <th className="pb-4 text-[10px] font-bold text-gray-600 uppercase tracking-widest">Incentives</th>
                                                    <th className="pb-4 text-[10px] font-bold text-gray-600 uppercase tracking-widest">Net Salary</th>
                                                    <th className="pb-4 text-[10px] font-bold text-gray-600 uppercase tracking-widest">Status</th>
                                                    <th className="pb-4 text-[10px] font-bold text-gray-600 uppercase tracking-widest">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/[0.02]">
                                                {staff.payrolls?.length > 0 ? staff.payrolls.map((payroll: any) => (
                                                    <tr key={payroll.id} className="group hover:bg-white/[0.01] transition-colors">
                                                        <td className="py-5 pl-4">
                                                            <p className="text-sm font-bold text-white">{payroll.month} {payroll.year}</p>
                                                        </td>
                                                        <td className="py-5">
                                                            <p className="text-sm font-bold text-gray-400">₹{payroll.baseSalary}</p>
                                                        </td>
                                                        <td className="py-5">
                                                            <p className="text-sm font-bold text-emerald-500">+₹{payroll.incentives + (payroll.bonuses || 0)}</p>
                                                        </td>
                                                        <td className="py-5">
                                                            <p className="text-sm font-bold text-white tracking-tight">₹{payroll.netSalary}</p>
                                                        </td>
                                                        <td className="py-5">
                                                            <Badge variant={payroll.status === 'PAID' ? 'success' : 'warning'}>{payroll.status}</Badge>
                                                        </td>
                                                        <td className="py-5">
                                                            {payroll.status !== 'PAID' ? (
                                                                <PayButton
                                                                    payroll={payroll}
                                                                    staff={staff}
                                                                    onPaid={() => {
                                                                        // Refresh staff data
                                                                        fetch(`/api/admin/staff/${params.id}`)
                                                                            .then(r => r.json())
                                                                            .then(j => setStaff(j?.data ?? j))
                                                                    }}
                                                                />
                                                            ) : (
                                                                <span className="text-[10px] text-gray-600 font-medium">
                                                                    {payroll.paidAt ? new Date(payroll.paidAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Paid'}
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                )) : (
                                                    <tr>
                                                        <td colSpan={6} className="py-12 text-center text-gray-600">No payroll records found.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </Card>
                            </div>
                        )}

                        {activeTab === 'PERFORMANCE' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                                {staff.performanceScores?.length > 0 ? (
                                    <div className="grid grid-cols-3 gap-8">
                                        <div className="col-span-1 space-y-8">
                                            <Card className="bg-[#233648]/50 border-white/5 rounded-[2.5rem] p-8 space-y-4">
                                                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Overall Rating</p>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-4xl font-bold text-white tracking-tight">
                                                        {(staff.performanceScores.reduce((acc: any, curr: any) => acc + (curr.avgRating || 0), 0) / staff.performanceScores.length).toFixed(1)}
                                                    </span>
                                                    <div className="flex gap-1">
                                                        {[1, 2, 3, 4, 5].map(s => {
                                                            const avg = (staff.performanceScores.reduce((acc: any, curr: any) => acc + (curr.avgRating || 0), 0) / staff.performanceScores.length);
                                                            return <Star key={s} className={cn("w-4 h-4", s <= Math.round(avg) ? "fill-amber-500 text-amber-500" : "fill-white/10 text-white/10")} />
                                                        })}
                                                    </div>
                                                </div>
                                                <p className="text-[10px] font-bold text-emerald-500">Based on last {staff.performanceScores.length} months</p>
                                            </Card>
                                            <Card className="bg-[#233648]/50 border-white/5 rounded-[2.5rem] p-8 space-y-4">
                                                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Tasks Completed (MTD)</p>
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-4xl font-bold text-white tracking-tight">{staff.performanceScores[0].tasksCompleted}</span>
                                                    <span className="text-xs font-bold text-gray-500">/ {staff.performanceScores[0].tasksCompleted + (staff.performanceScores[0].slaBreaches || 0)}</span>
                                                </div>
                                                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full bg-primary" 
                                                        style={{ width: `${(staff.performanceScores[0].tasksCompleted / (staff.performanceScores[0].tasksCompleted + (staff.performanceScores[0].slaBreaches || 0)) * 100) || 0}%` }} 
                                                    />
                                                </div>
                                            </Card>
                                        </div>
                                        <Card className="col-span-2 bg-[#233648]/50 border-white/5 rounded-[2.5rem] p-10 flex flex-col justify-between">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="text-xl font-bold text-white tracking-tight">Performance Analysis</h3>
                                                    <p className="text-xs text-gray-500 font-bold mt-1 uppercase tracking-widest">Monthly Growth Trend</p>
                                                </div>
                                                <button className="text-gray-600 hover:text-white"><MoreHorizontal /></button>
                                            </div>
                                            <div className="flex items-end gap-12 h-40 pt-10 px-4">
                                                {[...staff.performanceScores].reverse().map((score: any, i: number) => (
                                                    <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
                                                        <div className="w-full relative">
                                                            <div 
                                                                className="w-full rounded-t-xl bg-gradient-to-t from-primary/50 to-primary shadow-lg shadow-primary/20 group-hover:brightness-125 transition-all duration-700"
                                                                style={{ height: `${(score.overallScore || score.avgRating * 20 || 0)}%` }}
                                                            >
                                                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white text-black text-[10px] font-black px-2 py-1 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    {score.overallScore || (score.avgRating * 20).toFixed(0)}%
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">{score.month.split('-')[1]}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </Card>
                                    </div>
                                ) : (
                                    <div className="p-20 text-center space-y-4">
                                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto border border-white/5">
                                            <TrendingUp className="w-8 h-8 text-gray-600" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-white">No Performance Data</h3>
                                            <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">Performance metrics will be automatically generated once the employee begins task processing and service delivery.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {/* EDIT STAFF MODAL */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 overflow-y-auto bg-black/40 backdrop-blur-sm">
                    <div className="absolute inset-0 bg-[#0a0f14]/80" onClick={() => setEditModalOpen(false)} />
                    <Card className="relative w-full max-w-2xl bg-[#101922] border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl animate-in slide-in-from-top-10 duration-300 my-8">
                        <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                            <div>
                                <h2 className="text-xl font-bold text-white">Update Personnel Record</h2>
                                <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Editing primary employee data</p>
                            </div>
                            <button onClick={() => setEditModalOpen(false)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        <form onSubmit={handleUpdate} className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-2 gap-8">
                                {/* Basic Identity */}
                                <div className="space-y-4 col-span-2">
                                    <h3 className="text-[11px] font-bold text-primary uppercase tracking-widest">Primary Identity</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest ml-1">Full Legal Name</label>
                                            <input 
                                                value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})}
                                                className="w-full bg-black/30 border border-white/10 rounded-2xl py-3 px-5 text-sm text-white font-bold focus:border-primary transition-all shadow-inner" 
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest ml-1">Employee ID</label>
                                            <input 
                                                value={editForm.employeeId} onChange={e => setEditForm({...editForm, employeeId: e.target.value})}
                                                className="w-full bg-black/30 border border-white/10 rounded-2xl py-3 px-5 text-sm text-white font-bold focus:border-primary transition-all shadow-inner" 
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Contact & Comms */}
                                <div className="space-y-4 col-span-2">
                                    <h3 className="text-[11px] font-bold text-primary uppercase tracking-widest">Communication</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest ml-1">Email Address</label>
                                            <input 
                                                value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})}
                                                className="w-full bg-black/30 border border-white/10 rounded-2xl py-3 px-5 text-sm text-white font-bold focus:border-primary transition-all shadow-inner" 
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest ml-1">Mobile Phone</label>
                                            <input 
                                                value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})}
                                                className="w-full bg-black/30 border border-white/10 rounded-2xl py-3 px-5 text-sm text-white font-bold focus:border-primary transition-all shadow-inner" 
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Employment Details */}
                                <div className="space-y-4 col-span-2">
                                    <h3 className="text-[11px] font-bold text-primary uppercase tracking-widest">Employment Scope</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest ml-1">Designation / Role</label>
                                            <input 
                                                value={editForm.designation} onChange={e => setEditForm({...editForm, designation: e.target.value})}
                                                className="w-full bg-black/30 border border-white/10 rounded-2xl py-3 px-5 text-sm text-white font-bold focus:border-primary transition-all shadow-inner" 
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest ml-1">Department</label>
                                            <div className="relative group">
                                                <select 
                                                    value={editForm.department} onChange={e => setEditForm({...editForm, department: e.target.value})}
                                                    className="w-full bg-black/30 border border-white/10 rounded-2xl py-3 pl-5 pr-10 text-sm text-white font-bold focus:border-primary transition-all appearance-none cursor-pointer [color-scheme:dark]"
                                                >
                                                    <option value="MANAGEMENT">Management</option>
                                                    <option value="FRONT_DESK">Front Desk / Reception</option>
                                                    <option value="HOUSEKEEPING">Housekeeping</option>
                                                    <option value="KITCHEN">Kitchen</option>
                                                    <option value="ROOM_SERVICE">Room Service</option>
                                                    <option value="MAINTENANCE">Maintenance</option>
                                                    <option value="SPA">Spa & Wellness</option>
                                                    <option value="LAUNDRY">Laundry</option>
                                                    <option value="SECURITY">Security</option>
                                                    <option value="ACCOUNTS">Accounts</option>
                                                </select>
                                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none group-hover:text-primary transition-colors" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest ml-1">Monthly Base Salary (₹)</label>
                                            <input 
                                                type="number" value={editForm.baseSalary} onChange={e => setEditForm({...editForm, baseSalary: e.target.value})}
                                                className="w-full bg-black/30 border border-white/10 rounded-2xl py-3 px-5 text-sm text-white font-bold focus:border-primary transition-all shadow-inner" 
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest ml-1">Joining Date</label>
                                            <input 
                                                type="date" value={editForm.dateOfJoining} onChange={e => setEditForm({...editForm, dateOfJoining: e.target.value})}
                                                className="w-full bg-black/30 border border-white/10 rounded-2xl py-3 px-5 text-sm text-white font-bold focus:border-primary transition-all shadow-inner [color-scheme:dark]" 
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Address & Location */}
                                <div className="space-y-4 col-span-2">
                                    <h3 className="text-[11px] font-bold text-primary uppercase tracking-widest">Localization</h3>
                                    <div className="space-y-2">
                                         <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest ml-1">Personal Home Address</label>
                                         <textarea 
                                             value={editForm.address} onChange={e => setEditForm({...editForm, address: e.target.value})}
                                             rows={2}
                                             className="w-full bg-black/30 border border-white/10 rounded-2xl py-3 px-5 text-sm text-white font-bold focus:border-primary transition-all shadow-inner resize-none" 
                                             placeholder="Enter full residential address..."
                                         />
                                    </div>
                                </div>

                                {/* Operational Status */}
                                <div className="space-y-4 col-span-2">
                                    <h3 className="text-[11px] font-bold text-primary uppercase tracking-widest">Operational Status</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest ml-1">Contract Type</label>
                                            <input 
                                                value={editForm.contractType} onChange={e => setEditForm({...editForm, contractType: e.target.value})}
                                                className="w-full bg-black/30 border border-white/10 rounded-2xl py-3 px-5 text-sm text-white font-bold focus:border-primary transition-all shadow-inner" 
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest ml-1">Work Shift</label>
                                            <input 
                                                value={editForm.workShift} onChange={e => setEditForm({...editForm, workShift: e.target.value})}
                                                className="w-full bg-black/30 border border-white/10 rounded-2xl py-3 px-5 text-sm text-white font-bold focus:border-primary transition-all shadow-inner" 
                                            />
                                        </div>
                                        <div className="space-y-2 col-span-2">
                                            <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest ml-1">Reporting Manager Name</label>
                                            <input 
                                                value={editForm.managerName} onChange={e => setEditForm({...editForm, managerName: e.target.value})}
                                                className="w-full bg-black/30 border border-white/10 rounded-2xl py-3 px-5 text-sm text-white font-bold focus:border-primary transition-all shadow-inner" 
                                            />
                                        </div>
                                        <div className="space-y-2 col-span-2">
                                            <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest ml-1">Account Status</label>
                                            <div className="relative group">
                                                <select 
                                                    value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})}
                                                    className="w-full bg-black/30 border border-white/10 rounded-2xl py-3 pl-5 pr-10 text-sm text-white font-bold focus:border-primary transition-all appearance-none cursor-pointer [color-scheme:dark]"
                                                >
                                                    <option value="ACTIVE">Active</option>
                                                    <option value="INACTIVE">Inactive</option>
                                                    <option value="SUSPENDED">Suspended</option>
                                                </select>
                                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none group-hover:text-primary transition-colors" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Emergency Protocol */}
                                <div className="space-y-4 col-span-2">
                                    <h3 className="text-[11px] font-bold text-primary uppercase tracking-widest">Emergency Protocol</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest ml-1">Emergency Contact Name</label>
                                            <input 
                                                value={editForm.emergencyContactName} onChange={e => setEditForm({...editForm, emergencyContactName: e.target.value})}
                                                className="w-full bg-black/30 border border-white/10 rounded-2xl py-3 px-5 text-sm text-white font-bold focus:border-primary transition-all shadow-inner" 
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest ml-1">Emergency Contact Phone</label>
                                            <input 
                                                value={editForm.emergencyContactPhone} onChange={e => setEditForm({...editForm, emergencyContactPhone: e.target.value})}
                                                className="w-full bg-black/30 border border-white/10 rounded-2xl py-3 px-5 text-sm text-white font-bold focus:border-primary transition-all shadow-inner" 
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Security & Credentials */}
                                <div className="space-y-4 col-span-2">
                                    <h3 className="text-[11px] font-bold text-rose-500 uppercase tracking-widest">Security & Credentials</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2 col-span-2">
                                            <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest ml-1">Reset Password</label>
                                            <input 
                                                type="password"
                                                value={editForm.password} onChange={e => setEditForm({...editForm, password: e.target.value})}
                                                placeholder="Enter new password to override (leave blank to keep current)"
                                                className="w-full bg-rose-500/5 border border-rose-500/10 rounded-2xl py-3 px-5 text-sm text-white font-bold focus:border-rose-500 transition-all shadow-inner placeholder:text-gray-600 placeholder:font-normal" 
                                            />
                                            <p className="text-[9px] text-gray-600 ml-1">Note: This will immediately change the employee's login credentials.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-4">
                                <Button type="button" variant="secondary" onClick={() => setEditModalOpen(false)} className="flex-1 h-14 rounded-2xl">Cancel</Button>
                                <Button type="submit" variant="primary" loading={isUpdating} className="flex-1 h-14 rounded-2xl shadow-xl shadow-primary/20" leftIcon={<Save className="w-4 h-4" />}>
                                    Save Record
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    )
}

// ─── Leave Balance Management Card ──────────────────────────────────────────
function LeaveBalanceCard({
    staff,
    staffId,
    onUpdate,
}: {
    staff: any
    staffId: string
    onUpdate: (updated: any) => void
}) {
    const [editing, setEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [balances, setBalances] = useState({
        annualLeaveBalance: staff.annualLeaveBalance ?? 15,
        sickLeaveBalance: staff.sickLeaveBalance ?? 10,
        casualLeaveBalance: staff.casualLeaveBalance ?? 7,
    })

    // Compute used days from approved leave requests
    const usedByType = (type: string) =>
        (staff.leaveRequests ?? [])
            .filter((l: any) => l.leaveType === type && l.status === 'APPROVED')
            .reduce((sum: number, l: any) => sum + (l.totalDays || 0), 0)

    const usedAnnual  = usedByType('EARNED')
    const usedSick    = usedByType('SICK')
    const usedCasual  = usedByType('CASUAL')

    const categories = [
        {
            key: 'annualLeaveBalance' as const,
            label: 'Annual / Earned Leave',
            color: 'bg-blue-500',
            trackColor: 'bg-blue-500/20',
            textColor: 'text-blue-400',
            used: usedAnnual,
            total: balances.annualLeaveBalance,
            icon: '🏖️',
        },
        {
            key: 'sickLeaveBalance' as const,
            label: 'Sick Leave',
            color: 'bg-amber-500',
            trackColor: 'bg-amber-500/20',
            textColor: 'text-amber-400',
            used: usedSick,
            total: balances.sickLeaveBalance,
            icon: '🏥',
        },
        {
            key: 'casualLeaveBalance' as const,
            label: 'Casual Leave',
            color: 'bg-emerald-500',
            trackColor: 'bg-emerald-500/20',
            textColor: 'text-emerald-400',
            used: usedCasual,
            total: balances.casualLeaveBalance,
            icon: '☀️',
        },
    ]

    const handleSave = async () => {
        setSaving(true)
        try {
            const res = await fetch(`/api/admin/staff/${staffId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(balances),
            })
            if (res.ok) {
                toast.success('Leave balances updated')
                onUpdate(balances)
                setEditing(false)
            } else {
                toast.error('Failed to update balances')
            }
        } catch {
            toast.error('Connection error')
        } finally {
            setSaving(false)
        }
    }

    return (
        <Card className="bg-[#233648]/50 border-white/5 rounded-[2.5rem] p-10 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Leave Balances</h2>
                    <p className="text-xs text-gray-500 mt-1">Allocated days per category for this staff member</p>
                </div>
                {editing ? (
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => {
                                setBalances({
                                    annualLeaveBalance: staff.annualLeaveBalance ?? 15,
                                    sickLeaveBalance: staff.sickLeaveBalance ?? 10,
                                    casualLeaveBalance: staff.casualLeaveBalance ?? 7,
                                })
                                setEditing(false)
                            }}
                            className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white bg-white/5 rounded-xl transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 px-5 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            Save Changes
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => setEditing(true)}
                        className="flex items-center gap-2 px-5 py-2 bg-white/5 border border-white/10 text-xs font-bold text-gray-300 rounded-xl hover:bg-white/10 transition-all"
                    >
                        <Edit2 className="w-3.5 h-3.5" /> Edit Balances
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {categories.map((cat) => {
                    const remaining = Math.max(0, cat.total - cat.used)
                    const pct = cat.total > 0 ? Math.min(100, Math.round((cat.used / cat.total) * 100)) : 0

                    return (
                        <div
                            key={cat.key}
                            className="bg-black/20 border border-white/[0.05] rounded-3xl p-6 space-y-5"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">{cat.icon}</span>
                                    <div>
                                        <p className="text-xs font-bold text-white">{cat.label}</p>
                                        <p className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${cat.textColor}`}>
                                            {remaining} days left
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Allocated days — editable */}
                            <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Total Allocated</p>
                                {editing ? (
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setBalances(b => ({ ...b, [cat.key]: Math.max(0, b[cat.key] - 1) }))}
                                            className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-all flex items-center justify-center text-lg leading-none"
                                        >−</button>
                                        <input
                                            type="number"
                                            min={0}
                                            max={365}
                                            value={balances[cat.key]}
                                            onChange={e => setBalances(b => ({ ...b, [cat.key]: Math.max(0, parseInt(e.target.value) || 0) }))}
                                            className="w-16 text-center bg-black/40 border border-primary/40 rounded-xl py-1.5 text-sm font-black text-white outline-none focus:border-primary [color-scheme:dark]"
                                        />
                                        <button
                                            onClick={() => setBalances(b => ({ ...b, [cat.key]: b[cat.key] + 1 }))}
                                            className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-all flex items-center justify-center text-lg leading-none"
                                        >+</button>
                                        <span className="text-xs text-gray-500 font-medium">days</span>
                                    </div>
                                ) : (
                                    <p className="text-2xl font-black text-white">{cat.total} <span className="text-sm font-bold text-gray-500">days</span></p>
                                )}
                            </div>

                            {/* Used / Remaining breakdown */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-white/[0.03] rounded-2xl p-3 text-center">
                                    <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-1">Used</p>
                                    <p className="text-lg font-black text-rose-400">{cat.used}</p>
                                </div>
                                <div className="bg-white/[0.03] rounded-2xl p-3 text-center">
                                    <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-1">Remaining</p>
                                    <p className={`text-lg font-black ${remaining === 0 ? 'text-rose-400' : cat.textColor}`}>{remaining}</p>
                                </div>
                            </div>

                            {/* Progress bar */}
                            <div className="space-y-1.5">
                                <div className={`h-2 w-full rounded-full ${cat.trackColor}`}>
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${cat.color}`}
                                        style={{ width: `${pct}%` }}
                                    />
                                </div>
                                <p className="text-[9px] text-gray-600 font-bold">{pct}% used</p>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Leave history summary */}
            {(staff.leaveRequests ?? []).length > 0 && (
                <div className="border-t border-white/[0.04] pt-6">
                    <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-4">Recent Leave Requests</p>
                    <div className="space-y-2">
                        {(staff.leaveRequests ?? []).slice(0, 5).map((req: any) => (
                            <div key={req.id} className="flex items-center justify-between py-2.5 px-4 bg-black/20 rounded-2xl">
                                <div className="flex items-center gap-3">
                                    <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${
                                        req.leaveType === 'SICK'   ? 'bg-amber-500/10 text-amber-400' :
                                        req.leaveType === 'CASUAL' ? 'bg-emerald-500/10 text-emerald-400' :
                                        'bg-blue-500/10 text-blue-400'
                                    }`}>{req.leaveType}</span>
                                    <p className="text-xs text-gray-400 font-medium">
                                        {new Date(req.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                        {' – '}
                                        {new Date(req.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </p>
                                    <p className="text-[10px] text-gray-600">{req.totalDays}d</p>
                                </div>
                                <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${
                                    req.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400' :
                                    req.status === 'REJECTED' ? 'bg-rose-500/10 text-rose-400' :
                                    'bg-amber-500/10 text-amber-400'
                                }`}>{req.status}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </Card>
    )
}

// ─── Bank Details Tab ────────────────────────────────────────────────────────
function BankDetailsTab({
    staff,
    staffId,
    onUpdate,
}: {
    staff: any
    staffId: string
    onUpdate: (updated: any) => void
}) {
    const [editing, setEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [showAccount, setShowAccount] = useState(false)
    const [form, setForm] = useState({
        bankName:      staff.bankName      || '',
        accountNumber: staff.accountNumber || '',
        ifscCode:      staff.ifscCode      || '',
    })

    const hasBankDetails = !!(staff.bankName && staff.accountNumber && staff.ifscCode)

    const handleSave = async () => {
        setSaving(true)
        try {
            const res = await fetch(`/api/admin/staff/${staffId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            })
            if (res.ok) {
                toast.success('Bank details saved')
                onUpdate(form)
                setEditing(false)
            } else {
                toast.error('Failed to save bank details')
            }
        } catch {
            toast.error('Connection error')
        } finally {
            setSaving(false)
        }
    }

    const ic = 'w-full bg-black/30 border border-white/10 rounded-2xl py-3.5 px-5 text-sm text-white font-medium outline-none focus:border-primary transition-all'

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <Card className="bg-[#233648]/50 border-white/5 rounded-[2.5rem] p-10 space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-white tracking-tight">Bank Account Details</h2>
                        <p className="text-xs text-gray-500 mt-1">Used for salary payouts via Razorpay</p>
                    </div>
                    {editing ? (
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => { setForm({ bankName: staff.bankName || '', accountNumber: staff.accountNumber || '', ifscCode: staff.ifscCode || '' }); setEditing(false) }}
                                className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white bg-white/5 rounded-xl transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-2 px-5 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                Save
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setEditing(true)}
                            className="flex items-center gap-2 px-5 py-2 bg-white/5 border border-white/10 text-xs font-bold text-gray-300 rounded-xl hover:bg-white/10 transition-all"
                        >
                            <Edit2 className="w-3.5 h-3.5" /> {hasBankDetails ? 'Edit' : 'Add Details'}
                        </button>
                    )}
                </div>

                {!hasBankDetails && !editing && (
                    <div className="flex items-start gap-3 p-5 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
                        <Building2 className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-sm font-bold text-amber-400">No bank details added</p>
                            <p className="text-xs text-gray-500 mt-1">
                                Add bank account details to enable direct salary payouts via Razorpay.
                            </p>
                        </div>
                    </div>
                )}

                {editing ? (
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Bank Name</label>
                            <input
                                value={form.bankName}
                                onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))}
                                className={ic}
                                placeholder="e.g. HDFC Bank, SBI"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">IFSC Code</label>
                            <input
                                value={form.ifscCode}
                                onChange={e => setForm(f => ({ ...f, ifscCode: e.target.value.toUpperCase() }))}
                                className={ic}
                                placeholder="e.g. HDFC0001234"
                            />
                        </div>
                        <div className="col-span-2 space-y-2">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Account Number</label>
                            <input
                                value={form.accountNumber}
                                onChange={e => setForm(f => ({ ...f, accountNumber: e.target.value }))}
                                className={ic}
                                placeholder="Enter account number"
                                type="text"
                            />
                        </div>
                    </div>
                ) : hasBankDetails ? (
                    <div className="grid grid-cols-2 gap-6">
                        {[
                            { label: 'Bank Name',       value: staff.bankName },
                            { label: 'IFSC Code',       value: staff.ifscCode },
                            {
                                label: 'Account Number',
                                value: showAccount
                                    ? staff.accountNumber
                                    : '••••••' + (staff.accountNumber?.slice(-4) ?? ''),
                                action: (
                                    <button
                                        onClick={() => setShowAccount(v => !v)}
                                        className="ml-2 text-gray-500 hover:text-white transition-colors"
                                    >
                                        {showAccount ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    </button>
                                ),
                                colSpan: true,
                            },
                        ].map((item: any) => (
                            <div key={item.label} className={`space-y-2 ${item.colSpan ? 'col-span-2' : ''}`}>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{item.label}</p>
                                <div className="flex items-center gap-1 p-4 bg-black/20 border border-white/5 rounded-2xl">
                                    <p className="text-sm font-bold text-white font-mono">{item.value}</p>
                                    {item.action}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : null}

                {/* Razorpay payout info */}
                {hasBankDetails && !editing && (
                    <div className="flex items-start gap-3 p-5 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-sm font-bold text-emerald-400">Ready for payouts</p>
                            <p className="text-xs text-gray-500 mt-1">
                                Bank details are saved. Go to the <button onClick={() => {}} className="text-primary underline">Payroll tab</button> to process salary payments via Razorpay.
                            </p>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    )
}

// ─── Pay Button (Razorpay Payout) ────────────────────────────────────────────
function PayButton({
    payroll,
    staff,
    onPaid,
}: {
    payroll: any
    staff: any
    onPaid: () => void
}) {
    const [paying, setPaying] = useState(false)
    const hasBankDetails = !!(staff.bankName && staff.accountNumber && staff.ifscCode)

    const handlePay = async () => {
        if (!hasBankDetails) {
            toast.error('Add bank details in the Bank Details tab first')
            return
        }

        setPaying(true)
        try {
            const res = await fetch(`/api/admin/payroll/${payroll.id}/pay`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    staffId:       staff.id,
                    amount:        payroll.netSalary,
                    accountNumber: staff.accountNumber,
                    ifscCode:      staff.ifscCode,
                    bankName:      staff.bankName,
                    staffName:     staff.user?.name || 'Staff',
                    month:         payroll.month,
                    year:          payroll.year,
                }),
            })

            const data = await res.json()

            if (res.ok && data.success) {
                toast.success(`₹${payroll.netSalary.toLocaleString()} paid to ${staff.user?.name}`)
                onPaid()
            } else {
                toast.error(data.error || 'Payment failed')
            }
        } catch {
            toast.error('Connection error')
        } finally {
            setPaying(false)
        }
    }

    return (
        <button
            onClick={handlePay}
            disabled={paying || !hasBankDetails}
            title={!hasBankDetails ? 'Add bank details first' : `Pay ₹${payroll.netSalary.toLocaleString()}`}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500 border border-emerald-500/20 hover:border-emerald-500 text-emerald-400 hover:text-white text-[11px] font-bold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
            {paying
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <Banknote className="w-3 h-3" />
            }
            {paying ? 'Processing...' : 'Pay Now'}
        </button>
    )
}
