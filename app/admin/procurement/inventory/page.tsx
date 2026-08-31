'use client'

import React, { useState } from 'react'
import useSWR from 'swr'
import { buildContextUrl } from '@/lib/admin-context'
import {
  Plus, Search, Filter, ArrowUpRight, TrendingUp,
  AlertTriangle, CheckCircle, Package, ArrowRight, Download, HelpCircle, X, Trash2, ChevronDown, Clock, ClipboardList
} from 'lucide-react'
import { cn } from '@/lib/utils'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function InventoryDashboard() {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('ALL')
  const [isGenerating, setIsGenerating] = useState(false)

  // Dynamic local hotel clock state
  const [timeStr, setTimeStr] = useState('12:00 PM')
  React.useEffect(() => {
    const update = () => {
      const now = new Date()
      setTimeStr(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }))
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [])

  // Fetch dynamic inventory items, vendors list, and stats
  const { data: inventoryData, isLoading: isInventoryLoading, mutate: mutateInventory } = useSWR('/api/admin/pos/inventory', fetcher)

  const inventoryList = inventoryData?.items || []
  const vendorsList = inventoryData?.vendors || []
  const stats = inventoryData?.stats || {
    totalStockValue: 0,
    criticalCount: 0,
    pendingOrdersCount: 0,
    activeVendorsCount: 0
  }

  // Fetch recently created Purchase Orders history from database
  const { data: procurementData, mutate: mutateProcurement } = useSWR(
    buildContextUrl('/api/admin/procurement'),
    fetcher
  )
  const purchaseOrdersHistory = procurementData?.data?.purchaseOrders || []

  // Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any>(null)
  
  // Edit Form Fields
  const [editName, setEditName] = useState('')
  const [editCategory, setEditCategory] = useState('Housekeeping')
  const [editStockLevel, setEditStockLevel] = useState(0)
  const [editReorderPoint, setEditReorderPoint] = useState(0)
  const [editTotalValue, setEditTotalValue] = useState(0)
  const [editUnit, setEditUnit] = useState('units')
  const [editImage, setEditImage] = useState<string | null>(null)

  // Add Form Fields
  const [addName, setAddName] = useState('')
  const [addSku, setAddSku] = useState('')
  const [addCategory, setAddCategory] = useState('Housekeeping')
  const [addStockLevel, setAddStockLevel] = useState(0)
  const [addReorderPoint, setAddReorderPoint] = useState(0)
  const [addTotalValue, setAddTotalValue] = useState(0)
  const [addUnit, setAddUnit] = useState('units')
  const [addImage, setAddImage] = useState<string | null>(null)
  const [addError, setAddError] = useState('')
  const [isUploading, setIsUploading] = useState(false)

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, mode: 'add' | 'edit') => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      if (data.url) {
        if (mode === 'add') {
          setAddImage(data.url)
        } else {
          setEditImage(data.url)
        }
      } else {
        alert('Failed to upload image')
      }
    } catch (err) {
      alert('Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  // Smart Reorder Form Fields
  const [orderItemId, setOrderItemId] = useState('')
  const [orderVendorId, setOrderVendorId] = useState('')
  const [orderQuantity, setOrderQuantity] = useState(100)
  const [orderError, setOrderError] = useState('')

  // Calculate distribution loads dynamically based on database items
  const distStats = React.useMemo(() => {
    const categoriesList = ['Housekeeping', 'Food & Beverage', 'Maintenance']
    const result: { [key: string]: number } = {
      'HOUSEKEEPING': 0,
      'F&B': 0,
      'MAINTENANCE': 0
    }
    
    categoriesList.forEach(cat => {
      const catItems = inventoryList.filter((item: any) => item.category === cat)
      if (catItems.length === 0) return
      
      const totalStock = catItems.reduce((sum: number, item: any) => sum + item.stockLevel, 0)
      const totalReorder = catItems.reduce((sum: number, item: any) => sum + (item.reorderPoint * 2), 0)
      
      const key = cat === 'Food & Beverage' ? 'F&B' : cat.toUpperCase()
      result[key] = Math.round(Math.min(100, (totalStock / (totalReorder || 100)) * 100))
    })
    
    return result
  }, [inventoryList])

  // Get low stock items dynamically
  const lowItems = React.useMemo(() => {
    return inventoryList.filter((item: any) => item.stockLevel <= item.reorderPoint)
  }, [inventoryList])

  const openOrderModal = () => {
    setOrderError('')
    if (inventoryList.length > 0) {
      const targetItem = lowItems.length > 0 ? lowItems[0] : inventoryList[0]
      setOrderItemId(targetItem.id)
      
      const discrepancy = Math.max(100, targetItem.reorderPoint * 2 - targetItem.stockLevel)
      setOrderQuantity(discrepancy)

      const catVendor = vendorsList.find((v: any) => v.category.toLowerCase().includes(targetItem.category.toLowerCase()))
      setOrderVendorId(catVendor ? catVendor.id : (vendorsList[0]?.id || ''))
    }
    setIsOrderModalOpen(true)
  }

  // Handle placing a dynamic Purchase Order from modal
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    setOrderError('')
    if (!orderItemId || !orderVendorId || orderQuantity <= 0) {
      setOrderError('Please fill out all order parameters')
      return
    }

    setIsGenerating(true)
    const res = await fetch('/api/admin/pos/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        itemId: orderItemId,
        vendorId: orderVendorId,
        quantity: orderQuantity
      })
    })

    const data = await res.json()
    setIsGenerating(false)

    if (!res.ok) {
      setOrderError(data.error || 'Failed to place order')
      return
    }

    setIsOrderModalOpen(false)
    mutateInventory() 
    mutateProcurement() 
  }

  const openEditModal = (item: any) => {
    setSelectedItem(item)
    setEditName(item.name)
    setEditCategory(item.category)
    setEditStockLevel(item.stockLevel)
    setEditReorderPoint(item.reorderPoint)
    
    // Total Value of Stock = Stock Level * Unit Price
    const totalVal = item.stockLevel * (item.unitPrice || 0)
    setEditTotalValue(totalVal)
    setEditUnit(item.unit)
    setEditImage(item.image || null)
    setIsEditModalOpen(true)
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedItem) return

    // Calculate unit price dynamically based on edited Total Stock Value and Stock Level
    const calculatedUnitPrice = editStockLevel > 0 ? editTotalValue / editStockLevel : 0

    const res = await fetch('/api/admin/pos/inventory', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: selectedItem.id,
        name: editName,
        category: editCategory,
        stockLevel: editStockLevel,
        reorderPoint: editReorderPoint,
        unitPrice: calculatedUnitPrice,
        unit: editUnit,
        image: editImage
      })
    })

    if (res.ok) {
      setIsEditModalOpen(false)
      mutateInventory()
    }
  }

  const handleDeleteItem = async () => {
    if (!selectedItem || !confirm('Are you sure you want to delete this inventory item?')) return

    const res = await fetch(`/api/admin/pos/inventory?id=${selectedItem.id}`, {
      method: 'DELETE'
    })

    if (res.ok) {
      setIsEditModalOpen(false)
      mutateInventory()
    }
  }

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddError('')
    if (!addName.trim() || !addSku.trim()) return

    // Calculate unit price dynamically based on input Total Value and Stock Level
    const calculatedUnitPrice = addStockLevel > 0 ? addTotalValue / addStockLevel : 0

    const res = await fetch('/api/admin/pos/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: addName.trim(),
        sku: addSku.trim().toUpperCase(),
        category: addCategory,
        stockLevel: addStockLevel,
        reorderPoint: addReorderPoint,
        unitPrice: calculatedUnitPrice,
        unit: addUnit,
        image: addImage
      })
    })

    const data = await res.json()
    if (!res.ok) {
      setAddError(data.error || 'Failed to add item')
      return
    }

    setAddName('')
    setAddSku('')
    setAddTotalValue(0)
    setAddStockLevel(0)
    setAddImage(null)
    setIsAddModalOpen(false)
    mutateInventory()
  }

  const handleExportCSV = () => {
    const headers = ['Item Name', 'SKU', 'Category', 'Stock Level', 'Unit', 'Reorder Point', 'Total Stock Value', 'Status']
    const rows = filteredInventory.map((item: any) => [
      `"${item.name.replace(/"/g, '""')}"`,
      item.sku,
      item.category,
      item.stockLevel,
      item.unit,
      item.reorderPoint,
      item.stockLevel * (item.unitPrice || 0),
      item.stockLevel <= item.reorderPoint ? 'LOW STOCK' : 'IN STOCK'
    ])
    
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(','), ...rows.map((e: any) => e.join(','))].join('\n')
    
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `zenbourg_inventory_report_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const filteredInventory = inventoryList.filter((item: any) => {
    const matchesCategory = activeCategory === 'ALL' || item.category.toUpperCase() === activeCategory.toUpperCase()
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || 
                          item.sku.toLowerCase().includes(search.toLowerCase())
    return matchesCategory && matchesSearch
  })

  // Format currency helper
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val)
  }

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'PENDING_APPROVAL': return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      case 'SENT': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
      case 'RECEIVED': return 'bg-green-500/10 text-green-400 border-green-500/20'
      case 'CANCELLED': return 'bg-red-500/10 text-red-400 border-red-500/20'
      default: return 'bg-white/5 text-gray-400 border-white/5'
    }
  }

  const formatStatus = (status: string) => {
    if (status === 'PENDING_APPROVAL') return 'PENDING APPROVAL'
    return status
  }

  if (isInventoryLoading && !inventoryData) {
    return (
      <div className="flex h-full min-h-[calc(100vh-100px)] bg-[#0F172A] items-center justify-center text-white -mx-6 md:-mx-8 -my-6 md:-my-8 p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#3B82F6] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-gray-400 font-medium">Loading inventory...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0F172A] pb-24 font-sans text-gray-200 -mx-6 md:-mx-8 -my-6 md:-my-8 p-8 overflow-y-auto">
      
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-10 gap-6">
        <div>

          <h1 className="text-5xl font-black text-white leading-tight">Inventory<br/><span className="text-[#3B82F6]">State of Zenbourg</span></h1>
        </div>
        
        <div className="text-right">
          <div className="text-3xl font-black tracking-tight text-white">{timeStr}</div>
          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Local Hotel Time</div>
        </div>
      </div>

      {/* Grid widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        
        {/* Widget 1 */}
        <div className="bg-[#1E293B] rounded-3xl p-6 border border-white/5 flex flex-col justify-between">
          <div>
            <div className="text-[10px] font-black tracking-[0.15em] uppercase text-gray-500 mb-2">Total Stock Value</div>
            <div className="text-xl font-bold text-white">{formatCurrency(stats.totalStockValue)}</div>
          </div>
          <div className="text-[10px] font-bold text-gray-400 mt-4">
            Valuation based on current stock levels
          </div>
        </div>

        {/* Widget 2 */}
        <div className="bg-[#1E293B] rounded-3xl p-6 border border-white/5 flex flex-col justify-between">
          <div>
            <div className="text-[10px] font-black tracking-[0.15em] uppercase text-gray-500 mb-2">Items Below Par</div>
            <div className="text-xl font-bold text-white">{stats.criticalCount} <span className="text-xs font-bold text-red-400 ml-1">CRITICAL</span></div>
          </div>
          <div className="text-[10px] font-bold text-gray-400 mt-4">Needs immediate reorder</div>
        </div>

        {/* Widget 3 */}
        <div className="bg-[#1E293B] rounded-3xl p-6 border border-white/5 flex flex-col justify-between">
          <div>
            <div className="text-[10px] font-black tracking-[0.15em] uppercase text-gray-500 mb-2">Pending Orders</div>
            <div className="text-xl font-bold text-white">{stats.pendingOrdersCount.toString().padStart(2, '0')}</div>
          </div>
          <div className="text-[10px] font-bold text-gray-400 mt-4">Expected delivery within 48h</div>
        </div>

        {/* Widget 4 */}
        <div className="bg-[#1E293B] rounded-3xl p-6 border border-white/5 flex flex-col justify-between">
          <div>
            <div className="text-[10px] font-black tracking-[0.15em] uppercase text-gray-500 mb-2">Active Vendors</div>
            <div className="text-xl font-bold text-white">{stats.activeVendorsCount}</div>
          </div>
          <div className="text-[10px] font-bold text-blue-400 mt-4 flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" /> VERIFIED PARTNERS
          </div>
        </div>

      </div>

      {/* Row 2: Charts and Smart assistant */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        
        {/* Stock Distribution CSS Chart */}
        <div className="lg:col-span-2 bg-[#1E293B] rounded-3xl p-8 border border-white/5 flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-black text-white tracking-tight mb-2">Stock Distribution</h2>
            <p className="text-xs text-gray-400 mb-8 font-medium">Consumption trends across primary concierge verticals over the last 30 operational days.</p>
          </div>
          
          <div className="space-y-6 pt-2">
            {[
              { label: 'HOUSEKEEPING', val: distStats['HOUSEKEEPING'], color: 'bg-[#3B82F6]' },
              { label: 'F&B', val: distStats['F&B'], color: 'bg-indigo-500' },
              { label: 'MAINTENANCE', val: distStats['MAINTENANCE'], color: 'bg-emerald-500' }
            ].map(vertical => (
              <div key={vertical.label} className="space-y-2">
                <div className="flex justify-between text-[10px] font-black tracking-widest text-gray-400">
                  <span>{vertical.label}</span>
                  <span>{vertical.val}% STOCK LEVEL</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-3">
                  <div className={cn("h-3 rounded-full shadow-lg transition-all duration-1000", vertical.color)} style={{ width: `${vertical.val}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI smart reorder assistance */}
        <div className="bg-[#2563EB] text-white rounded-3xl p-8 flex flex-col justify-between shadow-xl shadow-blue-600/10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Package className="w-32 h-32 transform rotate-12" />
          </div>
          <div className="relative z-10">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center mb-6">
              <Package className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-2xl font-black mb-4 tracking-tight leading-tight">Smart Reorder Assistance</h2>
            <p className="text-sm text-blue-100 font-semibold leading-relaxed mb-8">
              {lowItems.length > 0 ? (
                <>
                  Immediate procurement of <span className="font-bold text-white underline">{Math.max(100, lowItems[0].reorderPoint * 2 - lowItems[0].stockLevel)} {lowItems[0].unit} {lowItems[0].name}</span> is suggested to restock par levels.
                </>
              ) : (
                <>All items are currently well-stocked. No immediate reordering required.</>
              )}
            </p>
          </div>
          <button 
            onClick={openOrderModal}
            className="w-full py-4 bg-white text-[#0F172A] hover:bg-gray-100 font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-sm flex items-center justify-center gap-2"
          >
            Generate Orders <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* Row 3: Master Inventory Table */}
      <div className="bg-[#1E293B] border border-white/5 rounded-3xl p-8 overflow-hidden shadow-xl mb-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-black text-white tracking-tight">Master Inventory</h2>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-[#2563EB] hover:bg-[#3B82F6] text-white px-3 py-1.5 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all flex items-center gap-1 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Add Item
            </button>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative w-64">
              <Search className="w-4 h-4 text-gray-500 absolute left-4.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search inventory..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-[#0F172A] border border-white/5 rounded-2xl py-3 pl-11 pr-4 text-xs outline-none text-white focus:border-[#3B82F6] hover:border-white/10 transition-all placeholder-gray-500"
              />
            </div>

            <div className="relative">
              <select
                value={activeCategory}
                onChange={e => setActiveCategory(e.target.value)}
                className="appearance-none bg-[#0F172A] border border-white/5 hover:border-white/10 rounded-2xl py-3 pl-5 pr-10 text-xs font-bold text-gray-400 outline-none cursor-pointer focus:border-[#3B82F6] transition-colors"
              >
                <option value="ALL">ALL CATEGORIES</option>
                <option value="Housekeeping">HOUSEKEEPING</option>
                <option value="Food & Beverage">F&B</option>
                <option value="Maintenance">MAINTENANCE</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-gray-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <button 
              onClick={handleExportCSV}
              className="px-5 py-3 bg-white/5 hover:bg-white/10 text-white border border-white/5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2"
            >
              <Download className="w-4 h-4 text-gray-400" /> Export Report
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {filteredInventory.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-[10px] font-black uppercase tracking-widest text-gray-500">
                  <th className="py-4 px-2">Item Details</th>
                  <th className="py-4 px-4">Category</th>
                  <th className="py-4 px-4">Stock Level</th>
                  <th className="py-4 px-4">Reorder Pt.</th>
                  <th className="py-4 px-4">Total Stock Value</th>
                  <th className="py-4 px-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.map((item: any) => {
                  const isLow = item.stockLevel <= item.reorderPoint
                  const itemValue = item.stockLevel * (item.unitPrice || 0)
                  return (
                    <tr 
                      key={item.id} 
                      onClick={() => handleRowClick(item)}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <td className="py-5 px-2 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/5 overflow-hidden flex-shrink-0 relative">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover opacity-80" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-[#1A2634]"><Package className="w-5 h-5 text-gray-500" /></div>
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm">{item.name}</div>
                          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">SKU: {item.sku}</div>
                        </div>
                      </td>
                      <td className="py-5 px-4 text-xs font-semibold text-gray-400">
                        {item.category}
                      </td>
                      <td className={cn("py-5 px-4 font-black text-sm", isLow ? "text-red-400" : "text-white")}>
                        {item.stockLevel} <span className="text-[10px] text-gray-500 font-medium lowercase">{item.unit}</span>
                      </td>
                      <td className="py-5 px-4 text-xs font-bold text-gray-400">
                        {item.reorderPoint}
                      </td>
                      <td className="py-5 px-4 text-xs font-black text-white">
                        {formatCurrency(itemValue)}
                      </td>
                      <td className="py-5 px-4">
                        <span className={cn(
                          "inline-flex px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest",
                          isLow ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-blue-500/10 text-[#3B82F6] border border-blue-500/20"
                        )}>
                          {isLow ? 'LOW STOCK' : 'IN STOCK'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12 border border-white/5 border-dashed rounded-3xl bg-white/[0.01]">
              <Package className="w-12 h-12 text-gray-600 mx-auto mb-3 opacity-30" />
              <p className="text-sm text-gray-500 font-medium">No inventory items registered yet.</p>
            </div>
          )}
        </div>
      </div>


      {/* EDIT INVENTORY MODAL */}
      {isEditModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="bg-[#1E293B] border border-white/5 rounded-3xl w-full max-w-md p-8 shadow-2xl relative">
            <button 
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-black leading-none">Edit Inventory Item</h3>
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1.5 block">SKU: {selectedItem.sku}</span>
              </div>
              <button 
                onClick={handleDeleteItem}
                className="w-10 h-10 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 flex items-center justify-center transition-colors"
                title="Delete Item"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-5">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2">Item Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full bg-[#0F172A] border border-white/5 rounded-2xl px-5 py-4 text-sm text-white outline-none focus:border-[#3B82F6] transition-colors"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2">Stock Level</label>
                  <input
                    type="number"
                    min={0}
                    value={editStockLevel}
                    onChange={e => setEditStockLevel(parseInt(e.target.value) || 0)}
                    className="w-full bg-[#0F172A] border border-white/5 rounded-2xl px-5 py-4 text-sm text-white outline-none focus:border-[#3B82F6] transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2">Reorder Point</label>
                  <input
                    type="number"
                    min={0}
                    value={editReorderPoint}
                    onChange={e => setEditReorderPoint(parseInt(e.target.value) || 0)}
                    className="w-full bg-[#0F172A] border border-white/5 rounded-2xl px-5 py-4 text-sm text-white outline-none focus:border-[#3B82F6] transition-colors"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2">Category</label>
                  <select
                    value={editCategory}
                    onChange={e => setEditCategory(e.target.value)}
                    className="w-full bg-[#0F172A] border border-white/5 rounded-2xl px-5 py-4 text-sm text-white outline-none focus:border-[#3B82F6] transition-colors"
                  >
                    <option value="Housekeeping">Housekeeping</option>
                    <option value="Food & Beverage">Food & Beverage</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2">Unit</label>
                  <input
                    type="text"
                    value={editUnit}
                    onChange={e => setEditUnit(e.target.value)}
                    className="w-full bg-[#0F172A] border border-white/5 rounded-2xl px-5 py-4 text-sm text-white outline-none focus:border-[#3B82F6] transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2">Total Value of Complete Stock (₹)</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={editTotalValue}
                  onChange={e => setEditTotalValue(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#0F172A] border border-white/5 rounded-2xl px-5 py-4 text-sm text-white outline-none focus:border-[#3B82F6] transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2">Item Image</label>
                <div className="flex gap-4 items-center">
                  <div className="w-20 h-20 bg-[#0F172A] border border-white/5 rounded-2xl overflow-hidden flex items-center justify-center relative shrink-0">
                    {editImage ? (
                      <img src={editImage} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-8 h-8 text-gray-600" />
                    )}
                    {isUploading && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                  <label className="flex-1 flex flex-col items-center justify-center border border-dashed border-white/10 hover:border-[#3B82F6] rounded-2xl p-4 cursor-pointer transition-colors bg-[#0F172A]/50">
                    <span className="text-xs font-bold text-gray-300">Change Image</span>
                    <span className="text-[10px] text-gray-500 mt-1">PNG, JPG up to 5MB</span>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={e => handleImageUpload(e, 'edit')} 
                      className="hidden" 
                    />
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-[#2563EB] hover:bg-[#3B82F6] text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg shadow-blue-500/20"
              >
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ADD INVENTORY MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="bg-[#1E293B] border border-white/5 rounded-3xl w-full max-w-md p-8 shadow-2xl relative">
            <button 
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-2xl font-black mb-6">Add New Inventory Item</h3>
            
            {addError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-xs font-bold mb-4">
                {addError}
              </div>
            )}

            <form onSubmit={handleAddItem} className="space-y-5">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2">Item Name</label>
                <input
                  type="text"
                  placeholder="e.g. Lavender Hand Soap"
                  value={addName}
                  onChange={e => setAddName(e.target.value)}
                  className="w-full bg-[#0F172A] border border-white/5 rounded-2xl px-5 py-4 text-sm text-white outline-none focus:border-[#3B82F6] transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2">SKU Code</label>
                <input
                  type="text"
                  placeholder="e.g. ZNB-AMN-101"
                  value={addSku}
                  onChange={e => setAddSku(e.target.value)}
                  className="w-full bg-[#0F172A] border border-white/5 rounded-2xl px-5 py-4 text-sm text-white outline-none focus:border-[#3B82F6] transition-colors"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2">Stock Level</label>
                  <input
                    type="number"
                    min={0}
                    value={addStockLevel}
                    onChange={e => setAddStockLevel(parseInt(e.target.value) || 0)}
                    className="w-full bg-[#0F172A] border border-white/5 rounded-2xl px-5 py-4 text-sm text-white outline-none focus:border-[#3B82F6] transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2">Reorder Point</label>
                  <input
                    type="number"
                    min={0}
                    value={addReorderPoint}
                    onChange={e => setAddReorderPoint(parseInt(e.target.value) || 0)}
                    className="w-full bg-[#0F172A] border border-white/5 rounded-2xl px-5 py-4 text-sm text-white outline-none focus:border-[#3B82F6] transition-colors"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2">Category</label>
                  <select
                    value={addCategory}
                    onChange={e => setAddCategory(e.target.value)}
                    className="w-full bg-[#0F172A] border border-white/5 rounded-2xl px-5 py-4 text-sm text-white outline-none focus:border-[#3B82F6] transition-colors"
                  >
                    <option value="Housekeeping">Housekeeping</option>
                    <option value="Food & Beverage">Food & Beverage</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2">Unit</label>
                  <input
                    type="text"
                    value={addUnit}
                    onChange={e => setAddUnit(e.target.value)}
                    className="w-full bg-[#0F172A] border border-white/5 rounded-2xl px-5 py-4 text-sm text-white outline-none focus:border-[#3B82F6] transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2">Total Value of Complete Stock (₹)</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="e.g. 50000"
                  value={addTotalValue}
                  onChange={e => setAddTotalValue(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#0F172A] border border-white/5 rounded-2xl px-5 py-4 text-sm text-white outline-none focus:border-[#3B82F6] transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2">Item Image</label>
                <div className="flex gap-4 items-center">
                  <div className="w-20 h-20 bg-[#0F172A] border border-white/5 rounded-2xl overflow-hidden flex items-center justify-center relative shrink-0">
                    {addImage ? (
                      <img src={addImage} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-8 h-8 text-gray-600" />
                    )}
                    {isUploading && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                  <label className="flex-1 flex flex-col items-center justify-center border border-dashed border-white/10 hover:border-[#3B82F6] rounded-2xl p-4 cursor-pointer transition-colors bg-[#0F172A]/50">
                    <span className="text-xs font-bold text-gray-300">Upload Image</span>
                    <span className="text-[10px] text-gray-500 mt-1">PNG, JPG up to 5MB</span>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={e => handleImageUpload(e, 'add')} 
                      className="hidden" 
                    />
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-[#2563EB] hover:bg-[#3B82F6] text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg shadow-blue-500/20"
              >
                Create Item
              </button>
            </form>
          </div>
        </div>
      )}

      {/* GENERATE PURCHASE ORDER MODAL */}
      {isOrderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="bg-[#1E293B] border border-white/5 rounded-3xl w-full max-w-md p-8 shadow-2xl relative">
            <button 
              onClick={() => setIsOrderModalOpen(false)}
              className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-2xl font-black mb-6">Restock Acquisition</h3>
            
            {orderError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-xs font-bold mb-4">
                {orderError}
              </div>
            )}

            {inventoryList.length > 0 ? (
              <form onSubmit={handlePlaceOrder} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2">Select Item to Restock</label>
                  <div className="relative">
                    <select
                      value={orderItemId}
                      onChange={e => {
                        const item = inventoryList.find((i: any) => i.id === e.target.value)
                        setOrderItemId(e.target.value)
                        if (item) {
                          const discrepancy = Math.max(100, item.reorderPoint * 2 - item.stockLevel)
                          setOrderQuantity(discrepancy)

                          const catVendor = vendorsList.find((v: any) => v.category.toLowerCase().includes(item.category.toLowerCase()))
                          if (catVendor) setOrderVendorId(catVendor.id)
                        }
                      }}
                      className="w-full appearance-none bg-[#0F172A] border border-white/5 rounded-2xl px-5 py-4 text-sm text-white outline-none focus:border-[#3B82F6] transition-colors cursor-pointer pr-10"
                    >
                      {inventoryList.map((item: any) => (
                        <option key={item.id} value={item.id}>
                          {item.name} ({item.sku}) - Stock: {item.stockLevel} {item.unit}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-gray-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2">Assign Supplier Vendor</label>
                  <div className="relative">
                    <select
                      value={orderVendorId}
                      onChange={e => setOrderVendorId(e.target.value)}
                      className="w-full appearance-none bg-[#0F172A] border border-white/5 rounded-2xl px-5 py-4 text-sm text-white outline-none focus:border-[#3B82F6] transition-colors cursor-pointer pr-10"
                    >
                      {vendorsList.map((vendor: any) => (
                        <option key={vendor.id} value={vendor.id}>
                          {vendor.name} ({vendor.category})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-gray-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2">Quantity to Order</label>
                  <input
                    type="number"
                    min={1}
                    value={orderQuantity}
                    onChange={e => setOrderQuantity(parseInt(e.target.value) || 0)}
                    className="w-full bg-[#0F172A] border border-white/5 rounded-2xl px-5 py-4 text-sm text-white outline-none focus:border-[#3B82F6] transition-colors"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isGenerating}
                  className="w-full py-4 bg-[#2563EB] hover:bg-[#3B82F6] text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
                >
                  {isGenerating ? 'Acquiring...' : 'Confirm Purchase Order'}
                </button>
              </form>
            ) : (
              <div className="text-center py-6 text-xs text-gray-500">
                You must register at least one inventory item first.
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
