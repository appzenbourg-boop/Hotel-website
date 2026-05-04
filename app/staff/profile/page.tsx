'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useCallback, useRef } from 'react'
import {
    User, Mail, Phone, LogOut, Camera,
    FileText, Calendar, CreditCard,
    Umbrella, Clock, ChevronRight,
    ShieldCheck, Briefcase, Edit2, Save, X,
    Loader2, Star, Lock, Key
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { usePwaInstall } from '@/lib/hooks/usePwaInstall'

export default function StaffProfilePage() {
    const { data: session } = useSession()
    const router = useRouter()
    const { isInstallable, installPwa } = usePwaInstall()
    const [loading, setLoading] = useState(true)
    const [staffData, setStaffData] = useState<any>(null)
    const [editing, setEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [editForm, setEditForm] = useState({ phone: '', address: '', emergencyContactName: '', emergencyContactPhone: '' })
    const [changingPassword, setChangingPassword] = useState(false)
    const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' })
    const [savingPw, setSavingPw] = useState(false)
    const photoRef = useRef<HTMLInputElement>(null)
    const [profilePhoto, setProfilePhoto] = useState<string | null>(null)

    const fetchProfile = useCallback(async () => {
        try {
            const res = await fetch('/api/staff/me')
            if (res.ok) {
                const data = await res.json()
                setStaffData(data)
                const p = data?.profile || {}
                setEditForm({
                    phone: p.user?.phone || '',
                    address: p.address || '',
                    emergencyContactName: p.emergencyContactName || '',
                    emergencyContactPhone: p.emergencyContactPhone || '',
                })
            }
        } catch { /* silent */ } finally { setLoading(false) }
    }, [])

    useEffect(() => {
        fetchProfile()
    }, [fetchProfile])

    const [photoUploading, setPhotoUploading] = useState(false)

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (file.size > 5 * 1024 * 1024) { toast.error('Photo must be under 5MB'); return }
        setPhotoUploading(true)
        try {
            const { uploadToCloudinary } = await import('@/lib/cloudinary')
            const result = await uploadToCloudinary(file, 'staff-profiles')
            // Persist to database
            const res = await fetch('/api/staff/me', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ profilePhoto: result.url }),
            })
            if (res.ok) {
                setProfilePhoto(result.url)
                toast.success('Profile photo updated')
            } else {
                toast.error('Failed to save photo to profile')
            }
        } catch (error) {
            console.error('[PROFILE_PHOTO_ERROR]', error)
            toast.error('Failed to upload photo')
        } finally {
            setPhotoUploading(false)
        }
    }

    const handleSaveProfile = async () => {
        setSaving(true)
        try {
            const res = await fetch('/api/staff/me', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm),
            })
            if (res.ok) {
                toast.success('Profile updated')
                setEditing(false)
                fetchProfile()
            } else toast.error('Failed to save')
        } catch { toast.error('Error') } finally { setSaving(false) }
    }

    const handleChangePassword = async () => {
        if (!pwForm.current || !pwForm.newPw) { toast.error('Fill all fields'); return }
        if (pwForm.newPw !== pwForm.confirm) { toast.error('Passwords do not match'); return }
        if (pwForm.newPw.length < 8) { toast.error('Password must be at least 8 characters'); return }
        setSavingPw(true)
        try {
            const res = await fetch('/api/staff/me', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.newPw }),
            })
            const data = await res.json()
            if (res.ok) {
                toast.success('Password changed successfully')
                setChangingPassword(false)
                setPwForm({ current: '', newPw: '', confirm: '' })
            } else toast.error(data.error ?? 'Failed to change password')
        } catch { toast.error('Error') } finally { setSavingPw(false) }
    }

    const [showVerifyForm, setShowVerifyForm] = useState(false)
    const [verifyForm, setVerifyForm] = useState({ idType: '', idNumber: '', idProofImage: '' })
    const [submittingVerify, setSubmittingVerify] = useState(false)
    const verifyImageRef = useRef<HTMLInputElement>(null)

    const handleRequestVerification = async () => {
        if (!verifyForm.idProofImage) { toast.error('Please upload your ID proof image'); return }
        if (!verifyForm.idType) { toast.error('Please select ID type'); return }
        setSubmittingVerify(true)
        try {
            const res = await fetch('/api/staff/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(verifyForm),
            })
            if (res.ok) {
                toast.success('Verification request sent to manager')
                setShowVerifyForm(false)
                setVerifyForm({ idType: '', idNumber: '', idProofImage: '' })
                fetchProfile()
            } else {
                toast.error('Failed to send request')
            }
        } catch { toast.error('Error') } finally { setSubmittingVerify(false) }
    }

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
    )

    const profile = staffData?.profile || {}
    const user = profile?.user || session?.user || {}
    const displayPhoto = profilePhoto || profile.profilePhoto

    const ic = 'w-full bg-[#0d1117] border border-white/[0.06] rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500/50 transition-all'

    return (
        <div className="space-y-6 animate-fade-in pb-16">

            {/* ── Profile Card ── */}
            <div className="bg-[#161b22] border border-white/[0.05] rounded-[40px] p-8 flex flex-col items-center relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/5 blur-[80px] rounded-full translate-x-16 -translate-y-16 pointer-events-none" />

                {/* Status badge */}
                <div className="absolute top-5 right-6 flex items-center gap-1.5 px-3 py-1 bg-white/[0.03] border border-white/[0.05] rounded-full">
                    <div className={cn('w-1.5 h-1.5 rounded-full animate-pulse', profile.isVerified ? 'bg-emerald-500' : 'bg-amber-500')} />
                    <span className={cn('text-[9px] font-bold uppercase tracking-widest', profile.isVerified ? 'text-emerald-500' : 'text-amber-500')}>
                        {profile.isVerified ? 'Verified' : 'Unverified'}
                    </span>
                </div>

                {/* Avatar with upload */}
                <div className="relative mb-5">
                    <div className="w-28 h-28 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 p-[2px] shadow-xl shadow-blue-500/20">
                        <div className="w-full h-full rounded-full bg-[#0d1117] overflow-hidden border-4 border-[#161b22]">
                            {displayPhoto ? (
                                <img src={displayPhoto} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-blue-600/10">
                                    <User className="w-10 h-10 text-blue-500" />
                                </div>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={() => photoRef.current?.click()}
                        className="absolute bottom-0 right-0 w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center border-2 border-[#161b22] shadow-lg hover:bg-blue-500 transition-all active:scale-95"
                    >
                        <Camera className="w-4 h-4 text-white" />
                    </button>
                    <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                </div>

                <h2 className="text-2xl font-bold text-white">{user.name || 'Staff'}</h2>
                <p className="text-sm text-gray-500 mt-1">
                    {profile.designation || 'Staff'} · {profile.department?.replace('_', ' ') || 'Operations'}
                </p>
                <p className="text-xs text-gray-600 mt-0.5">ID: {profile.employeeId || '—'}</p>

                {/* Action buttons */}
                <div className="grid grid-cols-2 gap-3 w-full mt-6">
                    <button
                        onClick={() => setEditing(true)}
                        className="h-12 bg-white/[0.04] border border-white/[0.08] rounded-2xl text-xs font-semibold text-white flex items-center justify-center gap-2 hover:bg-white/[0.08] transition-all active:scale-95"
                    >
                        <Edit2 className="w-4 h-4" /> Edit Profile
                    </button>
                    {profile.isVerified ? (
                        <div className="h-12 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl text-xs font-semibold flex items-center justify-center gap-2">
                            <ShieldCheck className="w-4 h-4" /> ID Verified
                        </div>
                    ) : profile.verificationRequested ? (
                        <div className="h-12 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl text-xs font-semibold flex items-center justify-center gap-2">
                            <Clock className="w-4 h-4" /> Pending Review
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowVerifyForm(true)}
                            className="h-12 bg-blue-600 text-white rounded-2xl text-xs font-semibold flex items-center justify-center gap-2 hover:bg-blue-500 transition-all active:scale-95"
                        >
                            <ShieldCheck className="w-4 h-4" /> Verify ID
                        </button>
                    )}
                </div>
            </div>

            {/* ── ID Verification Form ── */}
            {showVerifyForm && (
                <div className="bg-[#161b22] border border-blue-500/20 rounded-[35px] p-6 space-y-4">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-bold text-white">Submit ID for Verification</h3>
                        <button onClick={() => setShowVerifyForm(false)} className="p-1.5 hover:bg-white/5 rounded-lg transition-colors">
                            <X className="w-4 h-4 text-gray-400" />
                        </button>
                    </div>

                    {/* ID Type */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block">ID Type</label>
                        <select
                            value={verifyForm.idType}
                            onChange={e => setVerifyForm(p => ({ ...p, idType: e.target.value }))}
                            className={cn(ic, 'appearance-none')}
                        >
                            <option value="">Select ID type</option>
                            <option value="Aadhaar Card">Aadhaar Card</option>
                            <option value="PAN Card">PAN Card</option>
                            <option value="Passport">Passport</option>
                            <option value="Voter ID">Voter ID</option>
                            <option value="Driving Licence">Driving Licence</option>
                        </select>
                    </div>

                    {/* ID Number */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block">ID Number</label>
                        <input
                            value={verifyForm.idNumber}
                            onChange={e => setVerifyForm(p => ({ ...p, idNumber: e.target.value }))}
                            className={ic}
                            placeholder="e.g. XXXX XXXX XXXX"
                        />
                    </div>

                    {/* ID Proof Image */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block">
                            ID Proof Photo <span className="text-rose-400">*</span>
                        </label>
                        <input
                            ref={verifyImageRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async e => {
                                const file = e.target.files?.[0]
                                if (!file) return
                                if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return }
                                try {
                                    toast.info('Uploading ID proof...')
                                    const { uploadToCloudinary } = await import('@/lib/cloudinary')
                                    const result = await uploadToCloudinary(file, 'staff-id-proofs')
                                    setVerifyForm(p => ({ ...p, idProofImage: result.url }))
                                    toast.success('ID proof uploaded')
                                } catch (error) {
                                    console.error('[ID_PROOF_UPLOAD_ERROR]', error)
                                    toast.error('Failed to upload ID proof')
                                }
                            }}
                        />
                        {verifyForm.idProofImage ? (
                            <div className="relative rounded-2xl overflow-hidden border border-white/[0.06]">
                                <img src={verifyForm.idProofImage} alt="ID proof" className="w-full h-40 object-cover" />
                                <button
                                    onClick={() => setVerifyForm(p => ({ ...p, idProofImage: '' }))}
                                    className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center"
                                >
                                    <X className="w-3.5 h-3.5 text-white" />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => verifyImageRef.current?.click()}
                                className="w-full h-28 bg-[#0d1117] border border-dashed border-white/[0.08] rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-blue-500/40 transition-all"
                            >
                                <Camera className="w-6 h-6 text-gray-600" />
                                <span className="text-xs text-gray-600">Tap to upload ID photo</span>
                            </button>
                        )}
                    </div>

                    <button
                        onClick={handleRequestVerification}
                        disabled={submittingVerify}
                        className="w-full h-12 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                        {submittingVerify ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                        Submit for Verification
                    </button>
                </div>
            )}

            {/* ── Edit Profile Form ── */}
            {editing && (
                <div className="bg-[#161b22] border border-white/[0.05] rounded-[35px] p-6 space-y-4">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-bold text-white">Edit Profile</h3>
                        <button onClick={() => setEditing(false)} className="p-1.5 hover:bg-white/5 rounded-lg transition-colors">
                            <X className="w-4 h-4 text-gray-400" />
                        </button>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block">Phone Number</label>
                        <input value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} className={ic} placeholder="+91 98765 43210" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block">Home Address</label>
                        <input value={editForm.address} onChange={e => setEditForm(p => ({ ...p, address: e.target.value }))} className={ic} placeholder="Your home address" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block">Emergency Contact Name</label>
                        <input value={editForm.emergencyContactName} onChange={e => setEditForm(p => ({ ...p, emergencyContactName: e.target.value }))} className={ic} placeholder="e.g. Rahul Sharma" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block">Emergency Contact Phone</label>
                        <input value={editForm.emergencyContactPhone} onChange={e => setEditForm(p => ({ ...p, emergencyContactPhone: e.target.value }))} className={ic} placeholder="+91 98765 43210" />
                    </div>
                    <button onClick={handleSaveProfile} disabled={saving}
                        className="w-full h-12 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Changes
                    </button>
                </div>
            )}

            {/* ── My Details ── */}
            <div className="bg-[#161b22] border border-white/[0.05] rounded-[35px] overflow-hidden">
                <div className="px-6 py-4 border-b border-white/[0.04]">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">My Details</h3>
                </div>
                <div className="divide-y divide-white/[0.03]">
                    {[
                        { label: 'Email', value: user.email || '—', icon: Mail },
                        { label: 'Phone', value: user.phone || editForm.phone || '—', icon: Phone },
                        { label: 'Department', value: profile.department?.replace('_', ' ') || '—', icon: Briefcase },
                        { label: 'Joined', value: profile.dateOfJoining ? format(new Date(profile.dateOfJoining), 'dd MMM yyyy') : '—', icon: Calendar },
                        { label: 'Work Shift', value: profile.workShift || '—', icon: Clock },
                        { label: 'Emergency Contact', value: profile.emergencyContactName ? `${profile.emergencyContactName} · ${profile.emergencyContactPhone || ''}` : '—', icon: Phone },
                    ].map((item, i) => (
                        <div key={i} className="px-6 py-4 flex items-center gap-4">
                            <div className="w-9 h-9 rounded-xl bg-white/[0.03] flex items-center justify-center shrink-0">
                                <item.icon className="w-4 h-4 text-gray-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold">{item.label}</p>
                                <p className="text-sm text-white font-medium truncate mt-0.5">{item.value}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Quick Links ── */}
            <div className="bg-[#161b22] border border-white/[0.05] rounded-[35px] overflow-hidden">
                <div className="px-6 py-4 border-b border-white/[0.04]">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Quick Access</h3>
                </div>
                <div className="divide-y divide-white/[0.03]">
                    {[
                        { label: 'Leave Requests', icon: Umbrella, href: '/staff/leave', color: 'text-amber-400', bg: 'bg-amber-500/10' },
                        { label: 'My Payslips', icon: CreditCard, href: '/staff/payroll', color: 'text-blue-400', bg: 'bg-blue-500/10' },
                        { label: 'Attendance History', icon: Calendar, href: '/staff/attendance', color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
                        { label: 'My Tasks', icon: FileText, href: '/staff/tasks', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                    ].map((item, i) => (
                        <button key={i} onClick={() => router.push(item.href)}
                            className="w-full px-6 py-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors active:scale-[0.98]">
                            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', item.bg)}>
                                <item.icon className={cn('w-4 h-4', item.color)} />
                            </div>
                            <span className="flex-1 text-sm font-medium text-white text-left">{item.label}</span>
                            <ChevronRight className="w-4 h-4 text-gray-700" />
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Change Password ── */}
            <div className="bg-[#161b22] border border-white/[0.05] rounded-[35px] overflow-hidden">
                <button
                    onClick={() => setChangingPassword(v => !v)}
                    className="w-full px-6 py-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors"
                >
                    <div className="w-9 h-9 rounded-xl bg-slate-500/10 flex items-center justify-center shrink-0">
                        <Key className="w-4 h-4 text-slate-400" />
                    </div>
                    <span className="flex-1 text-sm font-medium text-white text-left">Change Password</span>
                    <ChevronRight className={cn('w-4 h-4 text-gray-700 transition-transform', changingPassword && 'rotate-90')} />
                </button>
                {changingPassword && (
                    <div className="px-6 pb-6 space-y-3 border-t border-white/[0.04] pt-4">
                        <input type="password" value={pwForm.current} onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))}
                            className={ic} placeholder="Current password" />
                        <input type="password" value={pwForm.newPw} onChange={e => setPwForm(p => ({ ...p, newPw: e.target.value }))}
                            className={ic} placeholder="New password (min 8 chars)" />
                        <input type="password" value={pwForm.confirm} onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))}
                            className={ic} placeholder="Confirm new password" />
                        <button onClick={handleChangePassword} disabled={savingPw}
                            className="w-full h-11 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold rounded-2xl flex items-center justify-center gap-2 transition-all">
                            {savingPw ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                            Update Password
                        </button>
                    </div>
                )}
            </div>

            {/* ── Install App ── */}
            {isInstallable && (
                <button onClick={installPwa}
                    className="w-full p-5 bg-[#161b22] border border-blue-500/20 rounded-[35px] flex items-center gap-4 hover:bg-blue-600/5 transition-all active:scale-[0.98]">
                    <div className="w-11 h-11 rounded-2xl bg-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-600/30">
                        <Star className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                        <p className="text-sm font-bold text-white">Install App</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">Save to home screen for quick access</p>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center">
                        <ChevronRight className="w-4 h-4 text-blue-400" />
                    </div>
                </button>
            )}

            {/* ── Sign Out ── */}
            <button
                onClick={() => signOut({ callbackUrl: '/staff/login' })}
                className="w-full h-14 bg-rose-500/5 text-rose-400 border border-rose-500/10 rounded-[25px] text-sm font-semibold flex items-center justify-center gap-3 hover:bg-rose-500/10 transition-all active:scale-[0.98]"
            >
                <LogOut className="w-4 h-4" /> Sign Out
            </button>
        </div>
    )
}
