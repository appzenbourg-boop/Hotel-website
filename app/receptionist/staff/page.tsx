'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, ArrowLeft, Phone, Mail, BadgeCheck, X } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Modal from '@/components/ui/Modal'
import { toast } from 'sonner'
import Avatar from '@/components/common/Avatar'

export default function ReceptionistStaffPage() {
    const router = useRouter()
    const [staffList, setStaffList] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showAddModal, setShowAddModal] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        department: 'FRONT_DESK',
        designation: 'Receptionist',
        password: '',
        employeeId: ''
    })

    const fetchStaff = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/receptionist/staff')
            if (res.ok) {
                const data = await res.json()
                setStaffList(data.staff || [])
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchStaff()
    }, [])

    const handleAddStaff = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        try {
            const res = await fetch('/api/receptionist/staff/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    baseSalary: 5000 // Default salary for receptionist-added staff
                })
            })

            if (res.ok) {
                toast.success('Staff member onboarded successfully')
                setShowAddModal(false)
                fetchStaff()
                setFormData({
                    name: '', email: '', phone: '', department: 'FRONT_DESK', designation: 'Receptionist', password: '', employeeId: ''
                })
            } else {
                const data = await res.json()
                toast.error(data.error || 'Failed to onboard staff')
            }
        } catch (error) {
            toast.error('Something went wrong')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#0A0E1A] text-white p-6 lg:p-12">
            <header className="flex items-center justify-between mb-12">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push('/receptionist/dashboard')} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold">Staff Directory</h1>
                        <p className="text-gray-400 mt-1">Manage and onboard operational staff</p>
                    </div>
                </div>
                <Button
                    className="bg-purple-600 hover:bg-purple-700 h-12 px-6"
                    leftIcon={<Plus className="w-5 h-5" />}
                    onClick={() => setShowAddModal(true)}
                >
                    Onboard New Staff
                </Button>
            </header>

            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row gap-4 mb-8">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                        placeholder="Search by name, role, or ID..."
                        className="w-full pl-12 pr-4 py-3 bg-[#141824] border border-white/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600/50"
                    />
                </div>
                <div className="flex gap-4">
                    <select className="bg-[#141824] border border-white/5 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-purple-600/50">
                        <option>All Departments</option>
                        <option>Housekeeping</option>
                        <option>Kitchen</option>
                    </select>
                </div>
            </div>

            {/* Staff Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    Array(6).fill(0).map((_, i) => (
                        <div key={i} className="h-64 bg-[#141824] rounded-2xl animate-pulse border border-white/5" />
                    ))
                ) : staffList.map(staff => (
                    <Card key={staff.id} className="p-6 bg-[#141824] border-white/5 group hover:border-purple-600/40 transition-all relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4">
                            <BadgeCheck className={`w-5 h-5 ${staff.user?.status === 'ACTIVE' ? 'text-emerald-500' : 'text-gray-600'}`} />
                        </div>

                        <div className="flex flex-col items-center text-center">
                            <Avatar name={staff.user?.name} className="w-20 h-20 mb-4 border-2 border-purple-600/20 group-hover:scale-105 transition-transform" />
                            <h3 className="text-lg font-bold truncate w-full">{staff.user?.name}</h3>
                            <p className="text-purple-400 text-sm font-medium mb-4">{staff.designation}</p>

                            <div className="w-full space-y-3 pt-6 border-t border-white/5">
                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                    <Phone className="w-3.5 h-3.5" /> {staff.user?.phone}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-400 truncate">
                                    <Mail className="w-3.5 h-3.5" /> {staff.user?.email}
                                </div>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Onboard Modal */}
            <Modal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                title="Staff Onboarding"
                description="Enter details to create a new staff account"
                size="lg"
            >
                <form onSubmit={handleAddStaff} className="space-y-6 pt-4 text-white">
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Full Name"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            placeholder="John Doe"
                            className="bg-[#0A0E1A] border-white/10"
                            required
                        />
                        <Input
                            label="Employee ID"
                            value={formData.employeeId}
                            onChange={e => setFormData({ ...formData, employeeId: e.target.value })}
                            placeholder="ZEN-001"
                            className="bg-[#0A0E1A] border-white/10"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Email Address"
                            type="email"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                            placeholder="john@example.com"
                            className="bg-[#0A0E1A] border-white/10"
                            required
                        />
                        <Input
                            label="Password"
                            type="password"
                            value={formData.password}
                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                            placeholder="••••••••"
                            className="bg-[#0A0E1A] border-white/10"
                            required
                        />
                    </div>
                    <Input
                        label="Phone Number"
                        value={formData.phone}
                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="9876543210"
                        className="bg-[#0A0E1A] border-white/10"
                        required
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <Select
                            label="Department"
                            value={formData.department}
                            onChange={e => setFormData({ ...formData, department: e.target.value })}
                            options={[
                                { value: 'HOUSEKEEPING', label: 'Housekeeping' },
                                { value: 'KITCHEN', label: 'Kitchen' },
                                { value: 'MAINTENANCE', label: 'Maintenance' },
                                { value: 'SECURITY', label: 'Security' },
                            ]}
                            className="bg-[#0A0E1A] border-white/10"
                        />
                        <Input
                            label="Designation"
                            value={formData.designation}
                            onChange={e => setFormData({ ...formData, designation: e.target.value })}
                            placeholder="Helper / Cleaner"
                            className="bg-[#0A0E1A] border-white/10"
                            required
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-white/5">
                        <Button variant="ghost" type="button" onClick={() => setShowAddModal(false)} className="text-gray-400">Cancel</Button>
                        <Button variant="primary" type="submit" loading={isSubmitting} className="bg-purple-600 hover:bg-purple-700">Complete Onboarding</Button>
                    </div>
                </form>
            </Modal>
        </div>
    )
}
