'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Plus, Edit2, Trash2, Tag, IndianRupee, Image as ImageIcon, ChevronLeft, ChevronRight, Utensils, X, Loader2 } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Badge from '@/components/ui/Badge'
import { toast } from 'sonner'
import { formatCurrency, cn } from '@/lib/utils'

export default function MenuPage() {
    const [menuItems, setMenuItems] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedCategory, setSelectedCategory] = useState('All')
    const [showForm, setShowForm] = useState(false)
    const [formData, setFormData] = useState({
        id: '' as string | undefined,
        name: '',
        description: '',
        price: '',
        margin: '',
        category: 'Main Course',
        isVeg: true,
        images: [] as string[]
    })

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 6

    const categories = ['All', 'Breakfast', 'Main Course', 'Appetizers', 'Desserts', 'Beverages']

    const fetchMenu = async () => {
        try {
            const res = await fetch('/api/admin/content/menu')
            if (res.ok) {
                const data = await res.json()
                setMenuItems(Array.isArray(data.menuItems) ? data.menuItems : [])
            } else {
                setMenuItems([])
            }
        } catch (error) {
            console.error('[MENU_FETCH_ERROR]', error)
            setMenuItems([])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchMenu()
    }, [])

    const [imageUploading, setImageUploading] = useState(false)

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        if (files.length === 0) return
        setImageUploading(true)
        try {
            const { uploadToCloudinary } = await import('@/lib/cloudinary')
            const uploadPromises = files.map(file => uploadToCloudinary(file, 'menu'))
            const results = await Promise.all(uploadPromises)
            setFormData(prev => ({
                ...prev,
                images: [...prev.images, ...results.map(r => r.url)]
            }))
            toast.success(`${results.length} image(s) uploaded`)
        } catch (error) {
            console.error('[MENU_IMAGE_UPLOAD_ERROR]', error)
            toast.error('Failed to upload image(s)')
        } finally {
            setImageUploading(false)
        }
    }

    const removeImage = (index: number) => {
        setFormData(prev => ({
            ...prev,
            images: prev.images.filter((_, i) => i !== index)
        }))
    }

    // CRUD Operations
    const handleSubmit = async () => {
        if (!formData.name || !formData.price) {
            toast.error('Item name and price are required')
            return
        }

        setLoading(true)
        try {
            const res = await fetch('/api/admin/content/menu', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            if (res.ok) {
                toast.success(formData.id ? 'Item updated successfully' : 'New item created')
                setShowForm(false)
                fetchMenu()
                setFormData({ id: '', name: '', description: '', price: '', margin: '', category: 'Main Course', isVeg: true, images: [] })
            } else {
                toast.error('Failed to save menu item')
            }
        } catch (error) {
            toast.error('Network error. Failed to save.')
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this item?')) return

        try {
            const res = await fetch(`/api/admin/content/menu?id=${id}`, {
                method: 'DELETE'
            })

            if (res.ok) {
                toast.success('Item removed')
                fetchMenu()
            } else {
                toast.error('Failed to delete item')
            }
        } catch (error) {
            toast.error('Error deleting item')
        }
    }

    const handleEdit = (item: any) => {
        setFormData({
            id: item.id,
            name: item.name,
            description: item.description,
            price: item.price.toString(),
            margin: item.margin ? item.margin.toString() : '0',
            category: item.category,
            isVeg: item.isVeg,
            images: item.images || []
        })
        setShowForm(true)
    }

    // Filter and Pagination Logic
    const filteredItems = menuItems.filter(i => {
        const matchesCategory = selectedCategory === 'All' || i.category === selectedCategory
        return matchesCategory
    })

    const totalPages = Math.ceil(filteredItems.length / itemsPerPage)
    const paginatedItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

    useEffect(() => {
        setCurrentPage(1) // Reset to page 1 when filter changes
    }, [selectedCategory])

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-text-primary">Restaurant Menu</h1>
                    <p className="text-text-secondary mt-1">Curate your digital dining experience</p>
                </div>
                <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowForm(true)}>
                    Add Item
                </Button>
            </div>

            {/* Category Filter */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${selectedCategory === cat
                            ? 'bg-primary text-white shadow-lg shadow-primary/25'
                            : 'bg-surface border border-white/10 text-text-secondary hover:bg-surface-hover'
                            }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Side Panel Drawer */}
            <div className={cn(
                "fixed inset-0 z-[100] transition-all duration-500",
                showForm ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            )}>
                {/* Backdrop */}
                <div 
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    onClick={() => {
                        setShowForm(false)
                        setFormData({ id: '', name: '', description: '', price: '', margin: '', category: 'Main Course', isVeg: true, images: [] })
                    }}
                />
                
                {/* Drawer */}
                <div className={cn(
                    "absolute top-0 right-0 h-full w-full max-w-lg bg-[#0d1117] border-l border-white/10 shadow-2xl transition-transform duration-500 transform flex flex-col",
                    showForm ? "translate-x-0" : "translate-x-full"
                )}>
                    {/* Header */}
                    <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-[#161b22]">
                        <div>
                            <h2 className="text-xl font-bold text-white tracking-tight">
                                {formData.id ? 'Edit Menu Item' : 'Add New Item'}
                            </h2>
                            <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mt-1">Culinary Registry / {formData.category}</p>
                        </div>
                        <button 
                            onClick={() => setShowForm(false)}
                            className="p-3 hover:bg-white/5 rounded-2xl text-gray-500 hover:text-white transition-all"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                        {/* Section: Basic Info */}
                        <div className="space-y-6">
                            <h3 className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em] px-1">Basic Identification</h3>
                            <Input 
                                label="Item Name" 
                                placeholder="e.g., Truffle Mushroom Risotto"
                                value={formData.name} 
                                onChange={e => setFormData({ ...formData, name: e.target.value })} 
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Sale Price (₹)" type="number" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} />
                                <Input label="Profit Margin (₹)" type="number" value={formData.margin} onChange={e => setFormData({ ...formData, margin: e.target.value })} />
                            </div>
                        </div>

                        {/* Section: Categorization */}
                        <div className="space-y-6">
                            <h3 className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em] px-1">Classification</h3>
                            <div className="grid grid-cols-1 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-400 uppercase tracking-widest mb-3 ml-1">Category</label>
                                    <div className="relative group">
                                        <select
                                            className="w-full bg-black/30 border border-white/10 rounded-2xl py-4 px-6 text-white font-bold outline-none focus:border-primary transition-all appearance-none cursor-pointer [color-scheme:dark]"
                                            value={formData.category}
                                            onChange={e => setFormData({ ...formData, category: e.target.value })}
                                        >
                                            {categories.filter(c => c !== 'All').map(c => (
                                                <option key={c} value={c} className="bg-[#111827]">
                                                    {c}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronRight className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none group-hover:text-primary transition-colors rotate-90" />
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-4 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
                                    <input
                                        type="checkbox"
                                        checked={formData.isVeg}
                                        onChange={e => setFormData({ ...formData, isVeg: e.target.checked })}
                                        id="veg-check-drawer"
                                        className="w-5 h-5 rounded-lg border-white/10 bg-black/40 text-primary focus:ring-0 focus:ring-offset-0"
                                    />
                                    <label htmlFor="veg-check-drawer" className="text-sm font-bold text-gray-300 cursor-pointer">Vegetarian Item</label>
                                </div>
                            </div>
                        </div>

                        {/* Section: Visuals */}
                        <div className="space-y-6">
                            <h3 className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em] px-1">Visual Assets</h3>
                            <div className="grid grid-cols-3 gap-3">
                                {formData.images.map((img, idx) => (
                                    <div key={idx} className="relative aspect-square border border-white/10 rounded-2xl overflow-hidden group shadow-lg">
                                        <Image src={img} alt={`Preview ${idx}`} fill className="object-cover" unoptimized />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <button
                                                onClick={() => removeImage(idx)}
                                                className="w-10 h-10 bg-rose-500 rounded-2xl flex items-center justify-center text-white shadow-xl transform scale-75 group-hover:scale-100 transition-transform"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                <div className="border-2 border-dashed border-white/10 rounded-2xl aspect-square flex items-center justify-center relative overflow-hidden group hover:border-primary/50 hover:bg-primary/5 transition-all">
                                    <div className="text-center text-gray-600 group-hover:text-primary transition-colors">
                                        {imageUploading ? (
                                            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                                        ) : (
                                            <>
                                                <Plus className="w-6 h-6 mx-auto mb-1" />
                                                <p className="text-[10px] font-bold uppercase tracking-widest">Add Photo</p>
                                            </>
                                        )}
                                    </div>
                                    <input type="file" multiple className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={handleImageUpload} disabled={imageUploading} />
                                </div>
                            </div>
                        </div>

                        {/* Section: Description */}
                        <div className="space-y-6">
                            <h3 className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em] px-1">Gastronomic Description</h3>
                            <textarea
                                placeholder="Describe the flavors, ingredients, and presentation..."
                                className="w-full bg-black/30 border border-white/10 rounded-2xl p-6 text-sm text-white font-medium outline-none focus:border-primary transition-all min-h-[120px] resize-none"
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="px-8 py-8 border-t border-white/5 bg-[#161b22] flex gap-4">
                        <button 
                            className="flex-1 py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-[11px] font-bold uppercase tracking-widest text-gray-400 hover:text-white transition-all border border-white/5"
                            onClick={() => setShowForm(false)}
                        >
                            Discard Changes
                        </button>
                        <button 
                            className="flex-[1.5] py-4 bg-primary hover:bg-primary-hover rounded-2xl text-[11px] font-bold uppercase tracking-widest text-white transition-all shadow-xl shadow-primary/20 active:scale-95"
                            onClick={handleSubmit}
                        >
                            {formData.id ? 'Synchronize Updates' : 'Commit to Menu'}
                        </button>
                    </div>
                </div>
            </div>


            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {loading ? (
                    // Premium Skeleton Loader
                    Array.from({ length: 8 }).map((_, idx) => (
                        <div key={idx} className="bg-[#0D1117] rounded-3xl border border-white/[0.05] overflow-hidden flex flex-col h-full animate-pulse">
                            <div className="h-44 w-full bg-white/5" />
                            <div className="p-6 flex-1 space-y-4">
                                <div className="flex justify-between items-start">
                                    <div className="h-6 w-2/3 bg-white/5 rounded-lg" />
                                    <div className="h-6 w-1/4 bg-white/5 rounded-lg" />
                                </div>
                                <div className="space-y-2">
                                    <div className="h-3 w-full bg-white/5 rounded-md" />
                                    <div className="h-3 w-4/5 bg-white/5 rounded-md" />
                                </div>
                                <div className="pt-4 border-t border-white/[0.05] flex gap-2">
                                    <div className="h-10 flex-1 bg-white/5 rounded-xl" />
                                    <div className="h-10 w-11 bg-white/5 rounded-xl" />
                                </div>
                            </div>
                        </div>
                    ))
                ) : paginatedItems.map(item => (
                    <div key={item.id} className="group bg-[#0D1117] rounded-3xl border border-white/[0.05] overflow-hidden transition-all duration-300 hover:border-primary/50 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] flex flex-col h-full">
                        {/* Compact Image Canvas */}
                        <div className="relative h-44 w-full overflow-hidden bg-white/[0.02]">
                            {item.images && item.images.length > 0 ? (
                                <Image 
                                    src={item.images[0]} 
                                    alt={item.name} 
                                    fill 
                                    className="object-cover transition-transform duration-500 group-hover:scale-110" 
                                    unoptimized 
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <Utensils className="w-10 h-10 text-gray-800 opacity-20" />
                                </div>
                            )}
                            
                            {/* High-Contrast Badge */}
                            <div className="absolute top-4 left-4 z-10">
                                <div className={cn(
                                    "px-2.5 py-1 rounded-lg text-[8px] font-black tracking-[0.1em] border backdrop-blur-md shadow-lg",
                                    item.isVeg 
                                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" 
                                        : "bg-rose-500/20 text-rose-400 border-rose-500/30"
                                )}>
                                    {item.isVeg ? 'VEG' : 'NON-VEG'}
                                </div>
                            </div>

                            {/* Stronger Bottom Overlay for Category Readability */}
                            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#0D1117] to-transparent opacity-90" />
                            
                            <div className="absolute bottom-4 left-5 flex items-center gap-2">
                                <span className="w-4 h-[1px] bg-primary" />
                                <p className="text-[10px] font-black text-primary-light uppercase tracking-[0.2em]">{item.category}</p>
                            </div>
                        </div>

                        {/* Formal Content Body with Better Highlights */}
                        <div className="p-6 flex-1 flex flex-col">
                            <div className="flex justify-between items-start gap-3 mb-3">
                                <h3 className="font-bold text-white text-lg tracking-tight leading-tight group-hover:text-primary transition-colors">
                                    {item.name}
                                </h3>
                                <div className="text-right shrink-0">
                                    <span className="text-base font-black text-primary-light block">₹{item.price}</span>
                                    {item.margin && <span className="text-[9px] font-bold text-emerald-500/80">+{item.margin} margin</span>}
                                </div>
                            </div>

                            <p className="text-[12px] text-gray-400 leading-relaxed line-clamp-2 mb-6 flex-1 font-medium opacity-80 group-hover:opacity-100 transition-opacity">
                                {item.description || "Curated for the refined digital dining experience."}
                            </p>

                            {/* Refined Action System */}
                            <div className="flex items-center gap-2 pt-4 border-t border-white/[0.05]">
                                <button 
                                    onClick={() => handleEdit(item)}
                                    className="flex-1 h-11 rounded-xl bg-primary/5 border border-primary/10 hover:bg-primary hover:border-primary text-primary-light hover:text-white text-[10px] font-black uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2 shadow-sm"
                                >
                                    <Edit2 className="w-3.5 h-3.5" />
                                    Edit Item
                                </button>
                                <button 
                                    onClick={() => handleDelete(item.id)}
                                    className="w-11 h-11 rounded-xl bg-rose-500/5 border border-rose-500/10 flex items-center justify-center text-rose-500/40 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
                                    title="Delete"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Pagination UI */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-8 py-12">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="w-12 h-12 rounded-2xl bg-surface border border-white/10 flex items-center justify-center text-text-secondary hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent transition-all shadow-inner"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    
                    <div className="flex items-center gap-2">
                        {Array.from({ length: totalPages }).map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentPage(idx + 1)}
                                className={cn(
                                    "w-10 h-10 rounded-xl text-xs font-black transition-all",
                                    currentPage === idx + 1 
                                        ? "bg-primary text-white shadow-lg shadow-primary/20" 
                                        : "text-gray-500 hover:text-white hover:bg-white/5"
                                )}
                            >
                                {idx + 1}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="w-12 h-12 rounded-2xl bg-surface border border-white/10 flex items-center justify-center text-text-secondary hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent transition-all shadow-inner"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            )}
        </div>
    )
}

