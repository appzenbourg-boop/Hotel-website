'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Image from 'next/image'
import { useSession } from 'next-auth/react'
import {
    Plus, Utensils, Coffee, Edit2, Lock,
    Image as ImageIcon, Upload, X, Check,
    AlertCircle, Search, Filter, Trash2,
    Info, Waves, HeartPulse, ShieldCheck,
    GripVertical, Eye, Save, ChevronRight,
    Loader2, MapPin, Phone, Mail, Clock, Building2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Switch from '@/components/ui/Switch'
import { toast } from 'sonner'
import { buildContextUrl, getAdminContext } from '@/lib/admin-context'

const TABS = [
    { id: 'general', label: 'General Info', icon: Info },
    { id: 'gallery', label: 'Media Gallery', icon: ImageIcon },
    { id: 'amenities', label: 'Amenities', icon: Waves },
    { id: 'dining', label: 'Dining', icon: Utensils },
    { id: 'wellness', label: 'Wellness', icon: HeartPulse },
    { id: 'policies', label: 'Policies', icon: ShieldCheck },
]

const MENU_CATEGORIES = ['All Items', 'Breakfast', 'Lunch', 'Dinner', 'Bar & Spirits']
const AMENITY_CATEGORIES = ['General', 'Recreation', 'Services', 'Room', 'Wellness']

export default function ContentManagementPage() {
    const { data: session, status } = useSession()
    const [activeTab, setActiveTab] = useState('dining')
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [uploading, setUploading] = useState(false)

    // Data States
    const [menuItems, setMenuItems] = useState<any[]>([])
    const [amenities, setAmenities] = useState<any[]>([])
    const [wellnessItems, setWellnessItems] = useState<any[]>([])
    const [galleryImages, setGalleryImages] = useState<string[]>([])
    const [propertyInfo, setPropertyInfo] = useState<any>({
        name: '', description: '', address: '', phone: '', email: '', checkInTime: '14:00', checkOutTime: '11:00'
    })
    const [policies, setPolicies] = useState<any>({
        cancellationPolicy: '', houseRules: ''
    })

    // UI States
    const [selectedCategory, setSelectedCategory] = useState('All Items')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedItem, setSelectedItem] = useState<any>(null)
    const [formData, setFormData] = useState<any>({})

    // Unified Property Context
    const currentPropertyId = useMemo(() => {
        if (!session?.user) return 'ALL'
        // If not a Super Admin, always use their assigned property
        if (session.user.role !== 'SUPER_ADMIN') {
            return session.user.propertyId || 'ALL'
        }
        // If Super Admin, use the selected context from localStorage
        return getAdminContext()?.propertyId || 'ALL'
    }, [session])

    // ── DATA FETCHING ──

    const fetchData = useCallback(async () => {
        if (!currentPropertyId) return
        setLoading(true)
        try {
            const contextParams = { propertyId: currentPropertyId }
            if (activeTab === 'dining') {
                const res = await fetch(buildContextUrl('/api/admin/content/menu', contextParams))
                const data = await res.json()
                if (data.success) setMenuItems(data.menuItems || [])
            } else if (activeTab === 'amenities') {
                const res = await fetch(buildContextUrl('/api/admin/content/amenities', contextParams))
                const data = await res.json()
                setAmenities(Array.isArray(data) ? data : [])
            } else if (activeTab === 'wellness') {
                const res = await fetch(buildContextUrl('/api/admin/content/wellness', contextParams))
                const data = await res.json()
                setWellnessItems(Array.isArray(data) ? data : [])
            } else if (activeTab === 'gallery') {
                const res = await fetch(buildContextUrl('/api/admin/content/gallery', contextParams))
                const data = await res.json()
                setGalleryImages(data || [])
            } else if (activeTab === 'general') {
                const res = await fetch(buildContextUrl('/api/admin/content/general', contextParams))
                const data = await res.json()
                if (data) setPropertyInfo(data)
            } else if (activeTab === 'policies') {
                const res = await fetch(buildContextUrl('/api/admin/content/policies', contextParams))
                const data = await res.json()
                setPolicies({
                    cancellationPolicy: data.cancellationPolicy || '',
                    houseRules: data.policies?.houseRules || ''
                })
            }
        } catch (error) {
            toast.error(`Failed to fetch ${activeTab} data`)
        } finally {
            setLoading(false)
        }
    }, [activeTab, currentPropertyId])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    // ── ACTIONS ──

    const handleSaveGeneral = async () => {
        setSaving(true)
        try {
            const res = await fetch('/api/admin/content/general', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...propertyInfo, propertyId: currentPropertyId })
            })
            if (res.ok) toast.success('General info updated')
            else toast.error('Failed to update general info')
        } catch { toast.error('Error saving') }
        finally { setSaving(false) }
    }

    const handleSavePolicies = async () => {
        setSaving(true)
        try {
            const res = await fetch('/api/admin/content/policies', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    propertyId: currentPropertyId,
                    cancellationPolicy: policies.cancellationPolicy,
                    policies: { houseRules: policies.houseRules }
                })
            })
            if (res.ok) toast.success('Policies updated')
            else toast.error('Failed to update policies')
        } catch { toast.error('Error saving') }
        finally { setSaving(false) }
    }

    const handleSaveModalItem = async () => {
        setSaving(true)
        let endpoint = ''
        if (activeTab === 'dining') endpoint = '/api/admin/content/menu'
        else if (activeTab === 'amenities') endpoint = '/api/admin/content/amenities'
        else if (activeTab === 'wellness') endpoint = '/api/admin/content/wellness'

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, propertyId: currentPropertyId })
            })
            if (res.ok) {
                toast.success('Successfully saved')
                setIsModalOpen(false)
                fetchData()
            } else {
                toast.error('Failed to save')
            }
        } catch { toast.error('Error saving') }
        finally { setSaving(false) }
    }

    const handleDeleteAmenity = async (id: string) => {
        if (!confirm('Are you sure you want to delete this amenity?')) return
        try {
            const res = await fetch(`/api/admin/content/amenities?id=${id}`, { method: 'DELETE' })
            if (res.ok) {
                toast.success('Amenity deleted')
                fetchData()
            }
        } catch { toast.error('Failed to delete') }
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'formData' | 'gallery') => {
        const file = e.target.files?.[0]
        if (!file) return
        if (file.size > 10 * 1024 * 1024) { toast.error('File must be under 10MB'); return }
        setUploading(true)
        try {
            const { uploadToCloudinary } = await import('@/lib/cloudinary')
            const folder = target === 'gallery' ? 'gallery' : activeTab
            const result = await uploadToCloudinary(file, folder)
            const imageUrl = result.url

            if (target === 'formData') {
                setFormData((prev: any) => ({ ...prev, images: [imageUrl], image: imageUrl }))
            } else {
                const newImages = [...galleryImages, imageUrl]
                setGalleryImages(newImages)
                // Persist gallery change immediately
                fetch('/api/admin/content/gallery', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ propertyId: currentPropertyId, images: newImages })
                })
            }
            toast.success('Photo uploaded to cloud!')
        } catch (error) {
            console.error('[UPLOAD_ERROR]', error)
            toast.error('Failed to upload photo. Please try again.')
        } finally {
            setUploading(false)
        }
    }

    const removeGalleryImage = async (img: string) => {
        const newList = galleryImages.filter(i => i !== img)
        setGalleryImages(newList)
        await fetch('/api/admin/content/gallery', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ propertyId: currentPropertyId, images: newList })
        })
        toast.info('Image removed from gallery')
    }

    // ── FILTERED DATA ──
    const filteredMenu = useMemo(() => {
        return menuItems.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase())
            const matchesCategory = selectedCategory === 'All Items' || item.category === selectedCategory
            return matchesSearch && matchesCategory
        })
    }, [menuItems, search, selectedCategory])

    const filteredAmenities = useMemo(() => {
        return amenities.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase())
            const matchesCategory = selectedCategory === 'All Items' || item.category === selectedCategory
            return matchesSearch && matchesCategory
        })
    }, [amenities, search, selectedCategory])

    // ── RENDERERS ──

    if (status === 'loading') {
        return (
            <div className="h-[80vh] flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-[#4A9EFF] animate-spin" />
            </div>
        )
    }

    if (!['SUPER_ADMIN', 'HOTEL_ADMIN', 'MANAGER'].includes(session?.user?.role || '')) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] text-center p-6 text-white">
                <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mb-6 text-rose-500">
                    <Lock className="w-10 h-10" />
                </div>
                <h1 className="text-3xl font-bold mb-3  tracking-tighter uppercase">Restricted Access</h1>
                <p className="text-gray-500 max-w-md font-medium">This module is reserved for Content Administrators and Managers.</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full bg-[#101922] text-white">
            {/* ── HEADER ── */}
            <div className="p-8 pb-4">
                <div className="flex items-center gap-2 text-[11px] text-gray-500 font-bold uppercase tracking-[0.2em] mb-4">
                    <span>Dashboard</span>
                    <ChevronRight className="w-3 h-3" />
                    <span>Settings</span>
                    <ChevronRight className="w-3 h-3" />
                    <span className="text-[#4A9EFF]">Content Management</span>
                </div>

                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tighter text-white mb-2">Content Management</h1>
                        <p className="text-sm text-gray-500 font-medium ">Manage hotel branding, media, amenities, and guest services.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="flex items-center gap-2 px-6 py-2.5 bg-white/[0.04] border border-white/[0.1] hover:bg-white/[0.08] text-white text-[13px] font-bold rounded-xl transition-all">
                            <Eye className="w-4 h-4" /> Preview Site
                        </button>
                        {(activeTab === 'general' || activeTab === 'policies') && (
                            <button
                                onClick={activeTab === 'general' ? handleSaveGeneral : handleSavePolicies}
                                disabled={saving}
                                className="flex items-center gap-2 px-6 py-2.5 bg-[#4A9EFF] hover:bg-[#3b8ae6] text-white text-[13px] font-bold uppercase tracking-widest rounded-xl shadow-lg shadow-[#4A9EFF]/20 transition-all active:scale-95 disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Updates
                            </button>
                        )}
                    </div>
                </div>

                {/* ── TABS ── */}
                <div className="flex items-center gap-8 border-b border-white/[0.06] overflow-x-auto no-scrollbar">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            disabled={currentPropertyId === 'ALL'}
                            onClick={() => { setActiveTab(tab.id); setSelectedCategory('All Items'); }}
                            className={cn(
                                "flex items-center gap-2.5 pb-4 text-[13px] font-bold whitespace-nowrap transition-all border-b-2",
                                activeTab === tab.id
                                    ? "text-white border-[#4A9EFF]"
                                    : "text-gray-500 border-transparent hover:text-gray-300",
                                currentPropertyId === 'ALL' && "opacity-30 cursor-not-allowed"
                            )}
                        >
                            <tab.icon className={cn("w-4 h-4", activeTab === tab.id ? "text-[#4A9EFF]" : "text-gray-600")} />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── CONTENT AREA ── */}
            <div className="flex-1 overflow-y-auto p-8 pt-4 no-scrollbar pb-24">
                {currentPropertyId === 'ALL' ? (
                    <div className="h-full flex flex-col items-center justify-center text-center animate-in fade-in duration-700">
                        <div className="w-24 h-24 bg-[#4A9EFF]/5 border border-[#4A9EFF]/10 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-2xl">
                            <Building2 className="w-10 h-10 text-[#4A9EFF] opacity-40" />
                        </div>
                        <h2 className="text-3xl font-bold text-white  tracking-tighter uppercase mb-4">Select a Property</h2>
                        <p className="text-gray-500 max-w-sm font-medium leading-relaxed">
                            Content Management is property-specific. Please select a specific hotel from the sidebar to manage its assets, menus, and amenities.
                        </p>
                    </div>
                ) : (
                    <>

                        {/* 1. GENERAL INFO TAB */}
                        {activeTab === 'general' && (
                            <div className="max-w-4xl space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-6">
                                        <h3 className="text-xl font-bold text-white flex items-center gap-3">
                                            <Building2 className="w-5 h-5 text-[#4A9EFF]" /> Basic Identity
                                        </h3>
                                        <div className="space-y-4">
                                            <Input
                                                label="Hotel Name"
                                                value={propertyInfo.name}
                                                onChange={e => setPropertyInfo({ ...propertyInfo, name: e.target.value })}
                                                className="bg-white/[0.02] border-white/[0.08]"
                                            />
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest block ml-1">About Hotel</label>
                                                <textarea
                                                    value={propertyInfo.description || ''}
                                                    onChange={e => setPropertyInfo({ ...propertyInfo, description: e.target.value })}
                                                    className="w-full bg-white/[0.02] border border-white/[0.08] rounded-xl p-4 text-sm text-white outline-none focus:border-[#4A9EFF]/40 min-h-[120px] resize-none"
                                                    placeholder="Write a brief overview of the property..."
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <h3 className="text-xl font-bold text-white flex items-center gap-3">
                                            <MapPin className="w-5 h-5 text-[#4A9EFF]" /> Contact & location
                                        </h3>
                                        <div className="space-y-4">
                                            <Input label="Site Address" value={propertyInfo.address} onChange={e => setPropertyInfo({ ...propertyInfo, address: e.target.value })} />
                                            <div className="grid grid-cols-2 gap-4">
                                                <Input label="Phone" value={propertyInfo.phone} onChange={e => setPropertyInfo({ ...propertyInfo, phone: e.target.value })} />
                                                <Input label="Email" value={propertyInfo.email} onChange={e => setPropertyInfo({ ...propertyInfo, email: e.target.value })} />
                                            </div>
                                        </div>

                                        <h3 className="text-xl font-bold text-white pt-4 flex items-center gap-3">
                                            <Clock className="w-5 h-5 text-[#4A9EFF]" /> Operating times
                                        </h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <Input type="time" label="Check-in from" value={propertyInfo.checkInTime} onChange={e => setPropertyInfo({ ...propertyInfo, checkInTime: e.target.value })} />
                                            <Input type="time" label="Check-out until" value={propertyInfo.checkOutTime} onChange={e => setPropertyInfo({ ...propertyInfo, checkOutTime: e.target.value })} />
                                        </div>
                                    </div>
                                </section>
                            </div>
                        )}

                        {/* 2. GALLERY TAB */}
                        {activeTab === 'gallery' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-2xl font-bold text-white">Media Assets Library</h2>
                                        <p className="text-sm text-gray-500 font-medium  mt-1">Stately photography for listings and digital concierge.</p>
                                    </div>
                                    <label className="flex items-center gap-2 px-6 py-2.5 bg-[#4A9EFF] hover:bg-[#3b8ae6] text-white text-[13px] font-bold uppercase tracking-widest rounded-xl cursor-pointer transition-all active:scale-95">
                                        <Upload className="w-4 h-4" /> {uploading ? 'Processing...' : 'Upload Photos'}
                                        <input type="file" className="hidden" onChange={e => handleFileUpload(e, 'gallery')} accept="image/*" disabled={uploading} />
                                    </label>
                                </div>

                                <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                                    {galleryImages.map((img, idx) => (
                                        <div key={idx} className="aspect-[4/3] rounded-[2rem] overflow-hidden group relative bg-white/[0.02] border border-white/[0.06] shadow-2xl">
                                            <Image src={img} alt="" fill className="object-cover group-hover:scale-110 transition-all duration-1000" unoptimized />
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-4">
                                                <button className="w-12 h-12 bg-white text-slate-900 rounded-2xl flex items-center justify-center hover:scale-110 transition-all shadow-xl">
                                                    <Eye className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => removeGalleryImage(img)}
                                                    className="w-12 h-12 bg-rose-500 text-white rounded-2xl flex items-center justify-center hover:scale-110 transition-all shadow-lg"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                            {idx === 0 && <span className="absolute top-4 left-4 px-3 py-1 bg-[#4A9EFF] rounded-full text-[9px] font-bold uppercase tracking-widest">Cover</span>}
                                        </div>
                                    ))}
                                    {galleryImages.length === 0 && Array(5).fill(0).map((_: any, i: number) => (
                                        <div key={i} className="aspect-[4/3] rounded-[2rem] border-2 border-dashed border-white/[0.04] flex items-center justify-center text-gray-800">
                                            <ImageIcon className="w-10 h-10" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 3. AMENITIES TAB */}
                        {activeTab === 'amenities' && (
                            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-2xl font-bold text-white tracking-tight">Hotel Amenities</h2>
                                        <p className="text-sm text-gray-500 font-medium  mt-1">Define what makes your property unique.</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="relative w-[280px]">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                                            <input
                                                type="text"
                                                placeholder="Search amenities..."
                                                value={search}
                                                onChange={e => setSearch(e.target.value)}
                                                className="w-full bg-white/[0.02] border border-white/[0.08] rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder:text-gray-700 outline-none"
                                            />
                                        </div>
                                        <button
                                            onClick={() => {
                                                setSelectedItem(null);
                                                setFormData({ name: '', category: 'General', icon: 'Waves', description: '', isActive: true });
                                                setIsModalOpen(true);
                                            }}
                                            className="flex items-center gap-2 px-6 py-2 bg-[#4A9EFF] text-white text-[12px] font-bold uppercase tracking-widest rounded-xl transition-all active:scale-95"
                                        >
                                            <Plus className="w-4 h-4" /> New Amenity
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    {['All Items', ...AMENITY_CATEGORIES].map(cat => (
                                        <button key={cat} onClick={() => setSelectedCategory(cat)} className={cn("px-5 py-2 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all border", selectedCategory === cat ? "bg-[#4A9EFF]/10 text-[#4A9EFF] border-[#4A9EFF]/20" : "bg-white/[0.02] text-gray-500 border-white/[0.06] hover:bg-white/[0.04]")}>
                                            {cat}
                                        </button>
                                    ))}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {filteredAmenities.map(amenity => (
                                        <div key={amenity.id} className="group p-6 bg-white/[0.01] border border-white/[0.06] rounded-[2rem] hover:bg-white/[0.03] transition-all relative overflow-hidden">
                                            <div className="flex items-start justify-between">
                                                <div className="w-14 h-14 bg-[#4A9EFF]/10 rounded-2xl flex items-center justify-center text-[#4A9EFF] shadow-inner ring-1 ring-[#4A9EFF]/20">
                                                    <Waves className="w-7 h-7" />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedItem(amenity);
                                                            setFormData(amenity);
                                                            setIsModalOpen(true);
                                                        }}
                                                        className="p-2.5 bg-white/[0.04] rounded-xl text-gray-500 hover:text-white transition-all transform group-hover:scale-110"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleDeleteAmenity(amenity.id)} className="p-2.5 bg-rose-500/10 rounded-xl text-rose-500/50 hover:text-rose-500 transition-all transform group-hover:scale-110">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="mt-6">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="text-xl font-bold text-white">{amenity.name}</h4>
                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#4A9EFF]">{amenity.category}</span>
                                                </div>
                                                <p className="text-sm text-gray-500 mt-2 font-medium  leading-relaxed line-clamp-2">{amenity.description || 'No description available for this amenity.'}</p>
                                            </div>
                                            {!amenity.isActive && <div className="absolute inset-0 bg-[#101922]/60 backdrop-blur-sm flex items-center justify-center font-bold text-xs uppercase tracking-[0.3em] text-gray-600">Archived</div>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 4. DINING TAB (Standard Table) */}
                        {activeTab === 'dining' && (
                            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {/* RESTAURANT HEADING */}
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-2xl font-bold text-white tracking-tight">Restaurant & Bar Menus</h2>
                                        <p className="text-sm text-gray-500 font-medium  mt-1">Manage dishes, pricing, and availability for guest ordering.</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="relative w-[280px]">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                                            <input
                                                type="text"
                                                placeholder="Search dishes..."
                                                value={search}
                                                onChange={e => setSearch(e.target.value)}
                                                className="w-full bg-white/[0.02] border border-white/[0.08] rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder:text-gray-700 outline-none focus:border-[#4A9EFF]/40 transition-all"
                                            />
                                        </div>
                                        <button
                                            onClick={() => {
                                                setSelectedItem(null)
                                                setFormData({ id: '', name: '', category: 'Lunch', price: 0, isAvailable: true, isVeg: true, description: '', images: [] })
                                                setIsModalOpen(true)
                                            }}
                                            className="flex items-center gap-2 px-6 py-2 bg-[#4A9EFF] text-white text-[12px] font-bold uppercase tracking-widest rounded-xl"
                                        >
                                            <Plus className="w-4 h-4" /> Add Dish
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    {MENU_CATEGORIES.map(cat => (
                                        <button key={cat} onClick={() => setSelectedCategory(cat)} className={cn("px-5 py-2 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all border", selectedCategory === cat ? "bg-[#4A9EFF]/10 text-[#4A9EFF] border-[#4A9EFF]/20" : "bg-white/[0.02] text-gray-500 border-white/[0.06] hover:bg-white/[0.04]")}>
                                            {cat}
                                        </button>
                                    ))}
                                </div>

                                <div className="bg-white/[0.01] border border-white/[0.06] rounded-[2rem] overflow-hidden shadow-2xl">
                                    <table className="w-full text-left">
                                        <thead className="bg-white/[0.03] border-b border-white/[0.06]">
                                            <tr>
                                                <th className="px-8 py-4 text-[10px] font-bold text-gray-600 uppercase tracking-widest">Dish Details</th>
                                                <th className="px-6 py-4 text-[10px] font-bold text-gray-600 uppercase tracking-widest">Category</th>
                                                <th className="px-6 py-4 text-[10px] font-bold text-gray-600 uppercase tracking-widest text-center">Price</th>
                                                <th className="px-6 py-4 text-[10px] font-bold text-gray-600 uppercase tracking-widest text-center">In Menu</th>
                                                <th className="px-6 py-4 text-[10px] font-bold text-gray-600 uppercase tracking-widest text-right pr-10">Edit</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/[0.04]">
                                            {loading ? (
                                                <tr><td colSpan={5} className="py-20 text-center uppercase tracking-widest font-bold text-xs text-gray-700">Loading Menu...</td></tr>
                                            ) : filteredMenu.length === 0 ? (
                                                <tr><td colSpan={5} className="py-20 text-center  text-gray-700">No dishes matched filter</td></tr>
                                            ) : filteredMenu.map(item => (
                                                <tr key={item.id} className="group hover:bg-white/[0.02] transition-colors">
                                                    <td className="px-8 py-5">
                                                        <div className="flex items-center gap-5">
                                                            <div className="w-16 h-16 rounded-2xl overflow-hidden ring-1 ring-white/[0.08] shadow-lg relative">
                                                                <Image src={item.images?.[0] || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c'} alt="" fill className="object-cover" unoptimized />
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <h4 className="text-[15px] font-bold text-white">{item.name}</h4>
                                                                    {item.isVeg && <div className="w-3 h-3 border border-emerald-500 p-[1px] flex items-center justify-center"><div className="w-full h-full bg-emerald-500 rounded-full" /></div>}
                                                                </div>
                                                                <p className="text-[11px] text-gray-500 mt-1  line-clamp-1">{item.description}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 text-[11px] font-bold uppercase text-gray-400 tracking-widest">{item.category}</td>
                                                    <td className="px-6 py-5 text-center font-bold text-white">${item.price.toFixed(2)}</td>
                                                    <td className="px-6 py-5">
                                                        <div className="flex justify-center">
                                                            <Switch checked={item.isAvailable} onChange={async (val) => {
                                                                const res = await fetch('/api/admin/content/menu', {
                                                                    method: 'POST',
                                                                    headers: { 'Content-Type': 'application/json' },
                                                                    body: JSON.stringify({ ...item, isAvailable: val, propertyId: currentPropertyId })
                                                                });
                                                                if (res.ok) setMenuItems(prev => prev.map(i => i.id === item.id ? { ...i, isAvailable: val } : i));
                                                            }} />
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 text-right pr-10">
                                                        <button onClick={() => { setSelectedItem(item); setFormData(item); setIsModalOpen(true); }} className="p-2 opacity-0 group-hover:opacity-100 transition-all text-gray-600 hover:text-[#4A9EFF]">
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* 5. WELLNESS TAB (Spa Services) */}
                        {activeTab === 'wellness' && (
                            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-2xl font-bold text-white tracking-tight">Spa & Wellness Services</h2>
                                        <p className="text-sm text-gray-500 font-medium  mt-1">Manage treatments, massages, and therapy durations.</p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setSelectedItem(null);
                                            setFormData({ name: '', duration: 60, price: 100, description: '', isAvailable: true });
                                            setIsModalOpen(true);
                                        }}
                                        className="flex items-center gap-2 px-6 py-2 bg-[#4A9EFF] text-white text-[12px] font-bold uppercase tracking-widest rounded-xl transition-all active:scale-95"
                                    >
                                        <Plus className="w-4 h-4" /> Add Treatment
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {wellnessItems.map(item => (
                                        <div key={item.id} className="group bg-white/[0.01] border border-white/[0.06] rounded-[2.5rem] overflow-hidden hover:bg-white/[0.02] transition-all shadow-2xl">
                                            <div className="aspect-[4/3] relative">
                                                <Image src={item.image || item.images?.[0] || 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80'} alt="" fill className="object-cover group-hover:scale-110 transition-all duration-1000" unoptimized />
                                                <div className="absolute top-4 right-4 z-10">
                                                    <Switch checked={item.isAvailable} onChange={async (val) => {
                                                        const res = await fetch('/api/admin/content/wellness', {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({ ...item, isAvailable: val, propertyId: currentPropertyId })
                                                        });
                                                        if (res.ok) setWellnessItems(prev => prev.map(i => i.id === item.id ? { ...i, isAvailable: val } : i));
                                                    }} />
                                                </div>
                                                <div className="absolute bottom-4 left-4 px-4 py-2 bg-black/40 backdrop-blur-md rounded-2xl flex items-center gap-2 border border-white/[0.08]">
                                                    <Clock className="w-3.5 h-3.5 text-[#4A9EFF]" />
                                                    <span className="text-[11px] font-bold tracking-widest">{item.duration} MIN</span>
                                                </div>
                                            </div>
                                            <div className="p-8">
                                                <div className="flex items-center justify-between mb-2">
                                                    <h4 className="text-xl font-bold text-white">{item.name}</h4>
                                                    <p className="text-2xl font-bold text-[#4A9EFF] tracking-tighter">${item.price}</p>
                                                </div>
                                                <p className="text-sm text-gray-500 font-medium  mb-8 leading-relaxed line-clamp-2">{item.description || 'Pamper your guests with a world-class spa experience.'}</p>
                                                <button
                                                    onClick={() => { setSelectedItem(item); setFormData(item); setIsModalOpen(true); }}
                                                    className="w-full flex items-center justify-center gap-2 py-3 bg-white/[0.04] border border-white/[0.08] rounded-2xl text-[11px] font-bold uppercase tracking-widest hover:bg-[#4A9EFF] hover:text-white transition-all shadow-inner"
                                                >
                                                    <Edit2 className="w-4 h-4" /> Modify Service
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 6. POLICIES TAB */}
                        {activeTab === 'policies' && (
                            <div className="max-w-4xl space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <section className="space-y-10">
                                    <div className="space-y-4">
                                        <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                                            <ShieldCheck className="w-7 h-7 text-[#4A9EFF]" /> Cancellation & refund Policy
                                        </h3>
                                        <p className="text-sm text-gray-500 ">This will be displayed prominently on the checkout and booking details pages.</p>
                                        <textarea
                                            value={policies.cancellationPolicy}
                                            onChange={e => setPolicies({ ...policies, cancellationPolicy: e.target.value })}
                                            className="w-full bg-white/[0.02] border border-white/[0.08] rounded-[2rem] p-8 text-[15px] leading-relaxed text-white outline-none focus:border-[#4A9EFF]/40 min-h-[160px] shadow-2xl "
                                            placeholder="Enter cancellation rules (e.g., Free cancellation up to 24 hours before check-in)..."
                                        />
                                    </div>

                                    <div className="space-y-4">
                                        <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                                            <AlertCircle className="w-7 h-7 text-[#4A9EFF]" /> General House Rules
                                        </h3>
                                        <p className="text-sm text-gray-500 ">Standard policies around smoking, pets, noise, and guest behavior.</p>
                                        <textarea
                                            value={policies.houseRules}
                                            onChange={e => setPolicies({ ...policies, houseRules: e.target.value })}
                                            className="w-full bg-white/[0.02] border border-white/[0.08] rounded-[2rem] p-8 text-[15px] leading-relaxed text-white outline-none focus:border-[#4A9EFF]/40 min-h-[220px] shadow-2xl "
                                            placeholder="List the rules your guests must follow during their stay..."
                                        />
                                    </div>
                                </section>
                            </div>
                        )}

                        {loading && (
                            <div className="flex flex-col items-center justify-center h-[40vh] gap-4">
                                <Loader2 className="w-10 h-10 text-[#4A9EFF] animate-spin" />
                                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-500 animate-pulse">Syncing Cloud Content...</span>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ── SHARED MODAL FOR ITEM EDITING ── */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => !saving && setIsModalOpen(false)}
                title={selectedItem ? `Edit ${activeTab.slice(0, -1)}` : `New ${activeTab.slice(0, -1)}`}
                description={`Configure details for your ${activeTab} content.`}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                    <div className="space-y-5">
                        <Input label="Name" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} />

                        {activeTab === 'dining' && (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest block mb-2 px-1">Category</label>
                                    <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="w-full bg-white/[0.02] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white focus:border-[#4A9EFF]/40 outline-none">
                                        {MENU_CATEGORIES.filter(c => c !== 'All Items').map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <Input type="number" label="Price (₹)" value={formData.price} onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) })} />
                            </div>
                        )}

                        {activeTab === 'wellness' && (
                            <div className="grid grid-cols-2 gap-4">
                                <Input type="number" label="Duration (Min)" value={formData.duration} onChange={e => setFormData({ ...formData, duration: parseInt(e.target.value) })} />
                                <Input type="number" label="Price (₹)" value={formData.price} onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) })} />
                            </div>
                        )}

                        {activeTab === 'amenities' && (
                            <div>
                                <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest block mb-2 px-1">Category</label>
                                <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="w-full bg-white/[0.02] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white focus:border-[#4A9EFF]/40 outline-none">
                                    {AMENITY_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest block px-1">Description</label>
                            <textarea
                                value={formData.description || ''}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                className="w-full bg-white/[0.02] border border-white/[0.08] rounded-2xl p-4 text-sm text-white outline-none focus:border-[#4A9EFF]/40 min-h-[140px] resize-none "
                            />
                        </div>
                        <div className="flex justify-end gap-3 mt-4">
                            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                            <Button onClick={handleSaveModalItem} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Item'}</Button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.2em] block ml-1">Asset imagery</label>
                        <div className="aspect-square rounded-3xl bg-[#101922] border border-white/[0.08] overflow-hidden relative group shadow-inner">
                            {(formData.images?.length > 0 || formData.image) ? (
                                <>
                                    <Image src={formData.images?.[0] || formData.image} alt="" fill className="object-cover" unoptimized />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-4 transition-all">
                                        <label className="w-12 h-12 bg-white text-slate-900 rounded-2xl flex items-center justify-center cursor-pointer hover:scale-110 transition-all shadow-xl">
                                            <Upload className="w-5 h-5" />
                                            <input type="file" className="hidden" onChange={e => handleFileUpload(e, 'formData')} accept="image/*" />
                                        </label>
                                        <button onClick={() => setFormData({ ...formData, images: [], image: '' })} className="w-12 h-12 bg-rose-500 text-white rounded-2xl flex items-center justify-center hover:scale-110 transition-all shadow-lg"><X className="w-5 h-5" /></button>
                                    </div>
                                </>
                            ) : (
                                <label className="flex flex-col items-center justify-center h-full cursor-pointer hover:bg-white/[0.03] transition-all">
                                    <div className="w-16 h-16 bg-white/[0.04] rounded-full flex items-center justify-center mb-4 ring-1 ring-white/[0.08]">
                                        {uploading ? <Loader2 className="w-6 h-6 text-[#4A9EFF] animate-spin" /> : <ImageIcon className="w-6 h-6 text-gray-600" />}
                                    </div>
                                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Select Image</span>
                                    <input type="file" className="hidden" onChange={e => handleFileUpload(e, 'formData')} accept="image/*" />
                                </label>
                            )}
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    )
}

