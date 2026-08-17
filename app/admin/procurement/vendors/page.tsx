'use client'

import React, { useState, useMemo } from 'react'
import useSWR from 'swr'
import { buildContextUrl } from '@/lib/admin-context'
import { Search, Bell, Settings, Filter, Star, Plus, MapPin, Mail, Phone, Loader2, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function VendorsPage() {
    const [search, setSearch] = useState('')
    const [activeTab, setActiveTab] = useState('ALL VENDORS')
    const [isCreating, setIsCreating] = useState(false)
    const [showModal, setShowModal] = useState(false)
    const [isCategoryOpen, setIsCategoryOpen] = useState(false)
    const [sortOrder, setSortOrder] = useState<'ELITE_FIRST' | 'NAME_A_Z' | 'NAME_Z_A'>('ELITE_FIRST')
    const [newVendor, setNewVendor] = useState({ name: '', category: 'Linen & Textiles', contactName: '', email: '', phone: '' })

    const CATEGORIES = ['Linen & Textiles', 'Gastronomy', 'Wellness & Spa', 'Furniture & Decor', 'Other']

    // Fetch Vendors
    const { data: rawData, isLoading, mutate } = useSWR(
        buildContextUrl('/api/admin/procurement/vendors'),
        (url) => fetch(url).then(r => r.json())
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
        setNewVendor({ name: '', category: 'Linen & Textiles', contactName: '', email: '', phone: '' })
    }

    return (
        <div className="min-h-screen bg-[#0F172A] pb-24 font-sans text-gray-200">


            <main className="max-w-7xl mx-auto px-8 py-10">
                {/* Hero Section */}
                <div className="mb-10">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="h-[1px] w-8 bg-[#3B82F6]"></div>
                        <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#3B82F6]">Procurement Network</span>
                    </div>
                    <div className="flex items-end justify-between">
                        <div>
                            <h1 className="text-5xl font-black text-white leading-tight">The Artisan<br/><span className="text-[#3B82F6]">Collective</span></h1>
                            <p className="mt-4 text-sm text-gray-400 max-w-lg leading-relaxed font-medium">
                                Curating the world&apos;s finest suppliers. Our vendor ecosystem is a meticulously vetted network of partners dedicated to the standard of StayIn Elite.
                            </p>
                        </div>
                        <div className="flex flex-col items-end gap-6">
                            <button 
                                onClick={() => setShowModal(true)}
                                className="bg-[#3B82F6] hover:bg-[#2563EB] text-white px-6 py-3 rounded-lg font-semibold text-xs tracking-wider uppercase transition-colors shadow-lg shadow-blue-500/20 flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" /> Onboard New Partner
                            </button>
                            <div className="flex items-center gap-6 text-xs font-semibold text-gray-400 uppercase tracking-widest">
                                <div><span className="text-[#3B82F6] font-black mr-2 text-sm">{vendors.length}</span> Active Partners</div>
                                <div className="w-1 h-1 rounded-full bg-white/20"></div>
                                <div><span className="text-[#3B82F6] font-black mr-2 text-sm">08</span> Pending Review</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs & Filters */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-white/10 pb-4">
                    <div className="flex gap-8">
                        {TABS.map(tab => (
                            <button 
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={cn(
                                    "text-[10px] font-black uppercase tracking-widest pb-4 relative transition-colors",
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
                        className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-xs font-semibold text-gray-300 mb-2 hover:bg-white/10 transition-colors"
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
                            <div key={vendor.id} className="bg-[#233648] rounded-2xl overflow-hidden border border-white/5 shadow-xl hover:shadow-2xl transition-all duration-300 group flex flex-col h-full">
                                <div className="h-48 bg-[#1A2634] relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#233648] to-transparent z-10" />
                                    {/* Placeholder Image mapped based on category */}
                                    <img 
                                        src={`https://images.unsplash.com/photo-${
                                            vendor.category.includes('Linen') ? '1615529328065-27a3a9ec1a7c' :
                                            vendor.category.includes('Gastronomy') ? '1414235077428-971145534394' :
                                            vendor.category.includes('Wellness') ? '1540555700885-745a5578dc44' :
                                            '1556228578-0d85b1a4d571'
                                        }?auto=format&fit=crop&w=800&q=80`}
                                        alt={vendor.name}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                    />
                                    <div className="absolute top-4 right-4 bg-[#233648]/90 backdrop-blur-sm p-1.5 rounded-full z-20 border border-white/10">
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
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-6">{vendor.category}</p>
                                    
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
                            <div className="col-span-full py-20 text-center bg-[#233648] rounded-3xl border border-white/5 border-dashed">
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

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                    <div className="bg-[#1A2634] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl">
                        <h2 className="text-xl font-black text-white mb-4">Onboard New Partner</h2>
                        <form onSubmit={handleCreateVendor} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Company Name *</label>
                                <input type="text" required className="w-full border border-white/10 rounded-lg p-2.5 text-sm bg-white/5 focus:border-[#3B82F6] text-white outline-none" value={newVendor.name} onChange={e => setNewVendor({...newVendor, name: e.target.value})} />
                            </div>
                            <div className="relative">
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Category *</label>
                                <div className="relative">
                                    <input 
                                        type="text"
                                        required 
                                        placeholder="Type or select a category"
                                        className="w-full border border-white/10 rounded-lg p-2.5 text-sm bg-white/5 focus:border-[#3B82F6] focus:bg-[#233648] text-white outline-none transition-colors"
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
                                <input type="text" className="w-full border border-white/10 rounded-lg p-2.5 text-sm bg-white/5 focus:border-[#3B82F6] text-white outline-none" value={newVendor.contactName} onChange={e => setNewVendor({...newVendor, contactName: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Email</label>
                                    <input type="email" className="w-full border border-white/10 rounded-lg p-2.5 text-sm bg-white/5 focus:border-[#3B82F6] text-white outline-none" value={newVendor.email} onChange={e => setNewVendor({...newVendor, email: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Phone</label>
                                    <input type="text" className="w-full border border-white/10 rounded-lg p-2.5 text-sm bg-white/5 focus:border-[#3B82F6] text-white outline-none" value={newVendor.phone} onChange={e => setNewVendor({...newVendor, phone: e.target.value})} />
                                </div>
                            </div>
                            
                            <div className="flex gap-3 pt-4 mt-6 border-t border-white/10">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 bg-white/5 text-gray-300 border border-white/10 rounded-lg font-bold text-xs uppercase tracking-wider hover:bg-white/10 transition-colors">Cancel</button>
                                <button type="submit" disabled={isCreating} className="flex-1 py-2.5 bg-[#1D4ED8] hover:bg-[#1E40AF] transition-colors text-white rounded-lg font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2">
                                    {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Partner'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
