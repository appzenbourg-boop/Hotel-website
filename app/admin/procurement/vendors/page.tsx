'use client'

import React, { useState, useMemo } from 'react'
import useSWR from 'swr'
import { buildContextUrl } from '@/lib/admin-context'
import { Search, Filter, Star, Plus, Mail, Phone, Loader2, CheckCircle2, X, Trash2, UploadCloud } from 'lucide-react'
import { cn } from '@/lib/utils'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function VendorsPage() {
    const [search, setSearch] = useState('')
    const [activeTab, setActiveTab] = useState('ALL VENDORS')
    
    // Onboard Modal States
    const [showModal, setShowModal] = useState(false)
    const [isCreating, setIsCreating] = useState(false)
    const [isCategoryOpen, setIsCategoryOpen] = useState(false)
    const [newVendor, setNewVendor] = useState({ name: '', category: 'Linen & Textiles', contactName: '', email: '', phone: '', image: '' })
    const [isUploading, setIsUploading] = useState(false)

    // Edit Modal States
    const [showEditModal, setShowEditModal] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [selectedVendor, setSelectedVendor] = useState<any>(null)
    const [isEditCategoryOpen, setIsEditCategoryOpen] = useState(false)
    
    // Edit Form Fields
    const [editName, setEditName] = useState('')
    const [editCategory, setEditCategory] = useState('Linen & Textiles')
    const [editContactName, setEditContactName] = useState('')
    const [editEmail, setEditEmail] = useState('')
    const [editPhone, setEditPhone] = useState('')
    const [editImage, setEditImage] = useState('')
    const [isEditUploading, setIsEditUploading] = useState(false)

    const [sortOrder, setSortOrder] = useState<'ELITE_FIRST' | 'NAME_A_Z' | 'NAME_Z_A'>('ELITE_FIRST')

    const CATEGORIES = ['Linen & Textiles', 'Gastronomy', 'Wellness & Spa', 'Furniture & Decor', 'Other']

    // Fetch Vendors
    const { data: rawData, isLoading, mutate } = useSWR(
        buildContextUrl('/api/admin/procurement/vendors'),
        fetcher
    )

    const vendors = rawData?.data || []

    const TABS = ['ALL VENDORS', 'LINEN & TEXTILES', 'GASTRONOMY', 'WELLNESS & SPA']

    const filteredVendors = useMemo(() => {
        let filtered = vendors.filter((v: any) => {
            const matchesSearch = v.name.toLowerCase().includes(search.toLowerCase())
            const matchesTab = activeTab === 'ALL VENDORS' || v.category.toUpperCase() === activeTab
            return matchesSearch && matchesTab
        })

        if (sortOrder === 'ELITE_FIRST') {
            filtered = filtered.sort((a: any, b: any) => b.rating - a.rating)
        } else if (sortOrder === 'NAME_A_Z') {
            filtered = filtered.sort((a: any, b: any) => a.name.localeCompare(b.name))
        } else if (sortOrder === 'NAME_Z_A') {
            filtered = filtered.sort((a: any, b: any) => b.name.localeCompare(a.name))
        }
        return filtered
    }, [vendors, search, activeTab, sortOrder])

    // Handle uploading the image for onboarding vendor
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isEditForm = false) => {
        const file = e.target.files?.[0]
        if (!file) return
        
        if (isEditForm) setIsEditUploading(true)
        else setIsUploading(true)

        const formData = new FormData()
        formData.append('file', file)
        try {
            const res = await fetch('/api/admin/upload', {
                method: 'POST',
                body: formData
            })
            if (res.ok) {
                const data = await res.json()
                if (isEditForm) {
                    setEditImage(data.url)
                } else {
                    setNewVendor(prev => ({ ...prev, image: data.url }))
                }
            }
        } catch (err) {
            console.error('Upload Error:', err)
        } finally {
            if (isEditForm) setIsEditUploading(false)
            else setIsUploading(false)
        }
    }

    const handleCreateVendor = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newVendor.name || !newVendor.category) return
        setIsCreating(true)
        await fetch(buildContextUrl('/api/admin/procurement/vendors'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newVendor)
        })
        await mutate()
        setIsCreating(false)
        setShowModal(false)
        setNewVendor({ name: '', category: 'Linen & Textiles', contactName: '', email: '', phone: '', image: '' })
    }

    const openEditModal = (vendor: any) => {
        setSelectedVendor(vendor)
        setEditName(vendor.name)
        setEditCategory(vendor.category)
        setEditContactName(vendor.contactName || '')
        setEditEmail(vendor.email || '')
        setEditPhone(vendor.phone || '')
        setEditImage(vendor.image || '')
        setShowEditModal(true)
    }

    const handleEditVendor = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedVendor) return
        setIsEditing(true)

        await fetch(buildContextUrl('/api/admin/procurement/vendors'), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: selectedVendor.id,
                name: editName,
                category: editCategory,
                contactName: editContactName,
                email: editEmail,
                phone: editPhone,
                image: editImage
            })
        })

        await mutate()
        setIsEditing(false)
        setShowEditModal(false)
        setSelectedVendor(null)
    }

    const handleDeleteVendor = async () => {
        if (!selectedVendor || !confirm(`Are you sure you want to remove ${selectedVendor.name}?`)) return
        setIsEditing(true)

        await fetch(buildContextUrl(`/api/admin/procurement/vendors?id=${selectedVendor.id}`), {
            method: 'DELETE'
        })

        await mutate()
        setIsEditing(false)
        setShowEditModal(false)
        setSelectedVendor(null)
    }

    return (
        <div className="min-h-screen bg-[#0F172A] pb-24 font-sans text-gray-200 -mx-6 md:-mx-8 -my-6 md:-my-8 p-8 overflow-y-auto">

            <main className="max-w-7xl mx-auto py-6">
                {/* Hero Section */}
                <div className="mb-10">

                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                        <div>
                            <h1 className="text-5xl font-black text-white leading-tight">The Artisan<br/><span className="text-[#3B82F6]">Collective</span></h1>
                            <p className="mt-4 text-sm text-gray-400 max-w-lg leading-relaxed font-medium">
                                Our vendor ecosystem is a meticulously vetted network of partners dedicated to the standard of Zenbourg.
                            </p>
                        </div>
                        <div className="flex flex-col items-start sm:items-end gap-4">
                            <button 
                                onClick={() => setShowModal(true)}
                                className="bg-[#3B82F6] hover:bg-[#2563EB] text-white px-6 py-3.5 rounded-2xl font-bold text-xs tracking-wider uppercase transition-colors shadow-lg shadow-blue-500/20 flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" /> Onboard New Partner
                            </button>
                            <div className="flex items-center gap-6 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                <div><span className="text-[#3B82F6] text-xs mr-2">{vendors.length}</span> Active Partners</div>
                                <div className="w-1.5 h-1.5 rounded-full bg-white/10"></div>
                                <div><span className="text-[#3B82F6] text-xs mr-2">08</span> Pending Review</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs & Filters */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-white/10 pb-4">
                    <div className="flex gap-8 overflow-x-auto pb-2 md:pb-0">
                        {TABS.map(tab => (
                            <button 
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={cn(
                                    "text-[10px] font-black uppercase tracking-widest pb-4 relative transition-colors whitespace-nowrap",
                                    activeTab === tab ? "text-[#3B82F6]" : "text-gray-500 hover:text-gray-300"
                                )}
                            >
                                {tab}
                                {activeTab === tab && (
                                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#3B82F6]"></div>
                                )}
                            </button>
                        ))}
                    </div>
                    <button 
                        onClick={() => {
                            if (sortOrder === 'ELITE_FIRST') setSortOrder('NAME_A_Z')
                            else if (sortOrder === 'NAME_A_Z') setSortOrder('NAME_Z_A')
                            else setSortOrder('ELITE_FIRST')
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-xs font-semibold text-gray-300 hover:bg-white/10 transition-colors w-fit"
                    >
                        <Filter className="w-3.5 h-3.5" /> 
                        Sort: {sortOrder === 'ELITE_FIRST' ? 'Elite First' : sortOrder === 'NAME_A_Z' ? 'A to Z' : 'Z to A'}
                    </button>
                </div>

                {/* Vendor Grid */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 text-[#3B82F6] animate-spin" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                         {filteredVendors.map((vendor: any) => (
                            <div 
                                key={vendor.id} 
                                onClick={() => openEditModal(vendor)}
                                className="bg-[#1E293B] rounded-2xl overflow-hidden border border-white/5 shadow-xl hover:shadow-2xl transition-all duration-300 group flex flex-col h-full cursor-pointer"
                            >
                                <div className="h-48 bg-[#0F172A] relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#1E293B] to-transparent z-10" />
                                    {vendor.image && vendor.image.startsWith('data:') ? (
                                        <img 
                                            src={vendor.image}
                                            alt={vendor.name}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-[#1E293B] to-[#0F172A] flex items-center justify-center border-b border-white/5">
                                            <span className="text-6xl font-black text-white/20 select-none uppercase">
                                                {vendor.name.charAt(0)}
                                            </span>
                                        </div>
                                    )}
                                    <div className="absolute top-4 right-4 bg-[#1E293B]/90 backdrop-blur-sm p-1.5 rounded-full z-20 border border-white/10">
                                        <CheckCircle2 className="w-4 h-4 text-[#3B82F6]" />
                                    </div>
                                </div>
                                
                                <div className="p-6 flex-1 flex flex-col">
                                    <div className="flex items-start justify-between mb-2">
                                        <h3 className="text-xl font-black text-white leading-tight">{vendor.name}</h3>
                                        <div className="flex items-center gap-0.5 mt-1">
                                            {[1,2,3,4,5].map(i => (
                                                <Star key={i} className={cn("w-3 h-3", i <= Math.round(vendor.rating) ? "fill-[#3B82F6] text-[#3B82F6]" : "text-white/10")} />
                                            ))}
                                        </div>
                                    </div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-6">{vendor.category}</p>
                                    
                                    <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-[9px] font-bold text-gray-400 border border-white/10">
                                                {vendor.contactName ? vendor.contactName.substring(0, 2).toUpperCase() : 'VN'}
                                            </div>
                                            <span className="text-[11px] text-gray-400 font-medium">Contact: {vendor.contactName || 'Support Team'}</span>
                                        </div>
                                        <div className="bg-[#3B82F6]/10 text-[#3B82F6] text-[9px] font-black px-2 py-1 rounded uppercase tracking-wider">
                                            Premium Partner
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Empty State */}
                        {filteredVendors.length === 0 && (
                            <div className="col-span-full py-20 text-center bg-[#1E293B] rounded-3xl border border-white/5 border-dashed">
                                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
                                    <Search className="w-6 h-6 text-gray-400" />
                                </div>
                                <h3 className="text-lg font-bold text-white">No vendors found</h3>
                                <p className="text-gray-400 text-sm mt-1">Try adjusting your search or filters.</p>
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* ONBOARD NEW PARTNER MODAL */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                    <div className="bg-[#1E293B] border border-white/10 rounded-2xl w-full max-w-md p-8 shadow-2xl relative">
                        <button 
                            onClick={() => setShowModal(false)}
                            className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        
                        <h2 className="text-2xl font-black text-white mb-6">Onboard New Partner</h2>
                        <form onSubmit={handleCreateVendor} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Company Name *</label>
                                <input type="text" required className="w-full border border-white/10 rounded-xl p-3 text-sm bg-white/5 focus:border-[#3B82F6] text-white outline-none" value={newVendor.name} onChange={e => setNewVendor({...newVendor, name: e.target.value})} />
                            </div>
                            <div className="relative">
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Category *</label>
                                <div className="relative">
                                    <input 
                                        type="text"
                                        required 
                                        placeholder="Type or select a category"
                                        className="w-full border border-white/10 rounded-xl p-3 text-sm bg-white/5 focus:border-[#3B82F6] focus:bg-[#233648] text-white outline-none transition-colors"
                                        value={newVendor.category} 
                                        onChange={e => setNewVendor({...newVendor, category: e.target.value})}
                                        onFocus={() => setIsCategoryOpen(true)}
                                        onBlur={() => setTimeout(() => setIsCategoryOpen(false), 200)}
                                    />
                                    <div 
                                        className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-gray-500"
                                        onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                                    >
                                        ▼
                                    </div>
                                </div>
                                {isCategoryOpen && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-[#233648] border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden max-h-48 overflow-y-auto">
                                        {CATEGORIES.map(cat => (
                                            <div 
                                                key={cat}
                                                className={cn(
                                                    "px-4 py-2.5 text-sm cursor-pointer transition-colors border-b border-white/5 last:border-0",
                                                    newVendor.category === cat 
                                                        ? "bg-[#3B82F6] text-white font-bold" 
                                                        : "text-gray-300 hover:bg-white/10"
                                                )}
                                                onClick={() => {
                                                    setNewVendor({...newVendor, category: cat})
                                                    setIsCategoryOpen(false)
                                                }}
                                            >
                                                {cat}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Contact Name</label>
                                <input type="text" className="w-full border border-white/10 rounded-xl p-3 text-sm bg-white/5 focus:border-[#3B82F6] text-white outline-none" value={newVendor.contactName} onChange={e => setNewVendor({...newVendor, contactName: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Email</label>
                                    <input type="email" className="w-full border border-white/10 rounded-xl p-3 text-sm bg-white/5 focus:border-[#3B82F6] text-white outline-none" value={newVendor.email} onChange={e => setNewVendor({...newVendor, email: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Phone</label>
                                    <input type="text" className="w-full border border-white/10 rounded-xl p-3 text-sm bg-white/5 focus:border-[#3B82F6] text-white outline-none" value={newVendor.phone} onChange={e => setNewVendor({...newVendor, phone: e.target.value})} />
                                </div>
                            </div>
                            
                            {/* Vendor Photo Upload Option */}
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Vendor Logo / Photo</label>
                                {newVendor.image ? (
                                    <div className="w-20 h-20 rounded-xl bg-white/5 border border-white/5 overflow-hidden relative group">
                                        <img src={newVendor.image} alt="Logo Preview" className="w-full h-full object-cover" />
                                        <button 
                                            type="button" 
                                            onClick={() => setNewVendor(prev => ({ ...prev, image: '' }))}
                                            className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-md transition-colors"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ) : (
                                    <label className="flex flex-col items-center justify-center border border-dashed border-white/10 rounded-xl p-6 bg-white/[0.02] hover:bg-white/[0.04] transition-colors cursor-pointer text-center group">
                                        <div className="w-8 h-8 rounded-lg bg-[#3B82F6]/10 text-[#3B82F6] flex items-center justify-center mb-2">
                                            <Plus className="w-4 h-4" />
                                        </div>
                                        <span className="text-[11px] text-gray-400 font-bold">
                                            {isUploading ? 'Uploading Logo...' : 'Click to Upload Logo'}
                                        </span>
                                        <span className="text-[9px] text-gray-500 mt-0.5">PNG, JPG up to 5MB</span>
                                        <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, false)} className="hidden" />
                                    </label>
                                )}
                            </div>

                            <div className="flex gap-3 pt-4 mt-6 border-t border-white/10">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 bg-white/5 text-gray-300 border border-white/10 rounded-lg font-bold text-xs uppercase tracking-wider hover:bg-white/10 transition-colors">Cancel</button>
                                <button type="submit" disabled={isCreating} className="flex-1 py-2.5 bg-[#3B82F6] hover:bg-[#2563EB] transition-colors text-white rounded-lg font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2">
                                    {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Partner'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* EDIT VENDOR MODAL */}
            {showEditModal && selectedVendor && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                    <div className="bg-[#1E293B] border border-white/10 rounded-2xl w-full max-w-md p-8 shadow-2xl relative">
                        <button 
                            onClick={() => setShowEditModal(false)}
                            className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-black text-white">Edit Partner Details</h2>
                            <button 
                                onClick={handleDeleteVendor}
                                className="w-10 h-10 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 flex items-center justify-center transition-colors"
                                title="Remove Vendor"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleEditVendor} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Company Name *</label>
                                <input type="text" required className="w-full border border-white/10 rounded-xl p-3 text-sm bg-white/5 focus:border-[#3B82F6] text-white outline-none" value={editName} onChange={e => setEditName(e.target.value)} />
                            </div>
                            <div className="relative">
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Category *</label>
                                <div className="relative">
                                    <input 
                                        type="text"
                                        required 
                                        placeholder="Type or select a category"
                                        className="w-full border border-white/10 rounded-xl p-3 text-sm bg-white/5 focus:border-[#3B82F6] focus:bg-[#233648] text-white outline-none transition-colors"
                                        value={editCategory} 
                                        onChange={e => setEditCategory(e.target.value)}
                                        onFocus={() => setIsEditCategoryOpen(true)}
                                        onBlur={() => setTimeout(() => setIsEditCategoryOpen(false), 200)}
                                    />
                                    <div 
                                        className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-gray-500"
                                        onClick={() => setIsEditCategoryOpen(!isEditCategoryOpen)}
                                    >
                                        ▼
                                    </div>
                                </div>
                                {isEditCategoryOpen && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-[#233648] border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden max-h-48 overflow-y-auto">
                                        {CATEGORIES.map(cat => (
                                            <div 
                                                key={cat}
                                                className={cn(
                                                    "px-4 py-2.5 text-sm cursor-pointer transition-colors border-b border-white/5 last:border-0",
                                                    editCategory === cat 
                                                        ? "bg-[#3B82F6] text-white font-bold" 
                                                        : "text-gray-300 hover:bg-white/10"
                                                )}
                                                onClick={() => {
                                                    setEditCategory(cat)
                                                    setIsEditCategoryOpen(false)
                                                }}
                                            >
                                                {cat}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Contact Name</label>
                                <input type="text" className="w-full border border-white/10 rounded-xl p-3 text-sm bg-white/5 focus:border-[#3B82F6] text-white outline-none" value={editContactName} onChange={e => setEditContactName(e.target.value)} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Email</label>
                                    <input type="email" className="w-full border border-white/10 rounded-xl p-3 text-sm bg-white/5 focus:border-[#3B82F6] text-white outline-none" value={editEmail} onChange={e => setEditEmail(e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Phone</label>
                                    <input type="text" className="w-full border border-white/10 rounded-xl p-3 text-sm bg-white/5 focus:border-[#3B82F6] text-white outline-none" value={editPhone} onChange={e => setEditPhone(e.target.value)} />
                                </div>
                            </div>
                            
                            {/* Vendor Photo Upload Option inside Edit modal */}
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Vendor Logo / Photo</label>
                                {editImage ? (
                                    <div className="w-20 h-20 rounded-xl bg-white/5 border border-white/5 overflow-hidden relative group">
                                        <img src={editImage} alt="Logo Preview" className="w-full h-full object-cover" />
                                        <button 
                                            type="button" 
                                            onClick={() => setEditImage('')}
                                            className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-md transition-colors"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ) : (
                                    <label className="flex flex-col items-center justify-center border border-dashed border-white/10 rounded-xl p-6 bg-white/[0.02] hover:bg-white/[0.04] transition-colors cursor-pointer text-center group">
                                        <div className="w-8 h-8 rounded-lg bg-[#3B82F6]/10 text-[#3B82F6] flex items-center justify-center mb-2">
                                            <Plus className="w-4 h-4" />
                                        </div>
                                        <span className="text-[11px] text-gray-400 font-bold">
                                            {isEditUploading ? 'Uploading Logo...' : 'Click to Upload Logo'}
                                        </span>
                                        <span className="text-[9px] text-gray-500 mt-0.5">PNG, JPG up to 5MB</span>
                                        <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, true)} className="hidden" />
                                    </label>
                                )}
                            </div>

                            <div className="flex gap-3 pt-4 mt-6 border-t border-white/10">
                                <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 py-2.5 bg-white/5 text-gray-300 border border-white/10 rounded-lg font-bold text-xs uppercase tracking-wider hover:bg-white/10 transition-colors">Cancel</button>
                                <button type="submit" disabled={isEditing} className="flex-1 py-2.5 bg-[#3B82F6] hover:bg-[#2563EB] transition-colors text-white rounded-lg font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2">
                                    {isEditing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
