'use client'

import React, { useState } from 'react'
import useSWR from 'swr'
import { useRouter } from 'next/navigation'
import {
  Utensils, LayoutGrid, BellRing, UtensilsCrossed, ReceiptText, LogOut,
  Plus, Calendar, Shield, Users, Activity, Sparkles, User, Trash2, X, ChevronRight, PhoneCall, ArrowRightLeft
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { buildContextUrl, getAdminContext } from '@/lib/admin-context'
import { toast } from 'sonner'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function FloorPlanPage() {
  const router = useRouter()
  
  // Fetch dynamic orders and tables from database scoped to current property
  const { data: orders, isLoading: isOrdersLoading, mutate: mutateOrders } = useSWR(buildContextUrl('/api/admin/pos/orders'), fetcher, { refreshInterval: 5000 })
  const { data: dbTables, isLoading: isTablesLoading, mutate: mutateTables } = useSWR(buildContextUrl('/api/admin/pos/tables'), fetcher, { refreshInterval: 5000 })
  const { data: staffData } = useSWR(buildContextUrl('/api/admin/staff', { activeOnly: 'true' }), fetcher)

  const staffMembers = staffData?.data || []
  const tables = Array.isArray(dbTables) ? dbTables : []

  // Outlets
  const OUTLETS = ['Restaurant', 'Mini Bar', 'Room Service', 'Banquet']
  const [activeOutlet, setActiveOutlet] = useState('Restaurant')

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isOccupiedModalOpen, setIsOccupiedModalOpen] = useState(false)
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false)
  const [selectedTable, setSelectedTable] = useState<any>(null)
  const [transferTargetId, setTransferTargetId] = useState('')

  // Add Table Form State
  const [newTableId, setNewTableId] = useState('')
  const [newTableSize, setNewTableSize] = useState(4)
  const [newTableIsBooth, setNewTableIsBooth] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Reservation form state
  const [reservationName, setReservationName] = useState('')
  const [reservationTime, setReservationTime] = useState('')
  const [showReservationForm, setShowReservationForm] = useState(false)

  // Map active orders to tables
  const activeOrdersMap = React.useMemo(() => {
    const map: { [key: string]: any } = {}
    if (Array.isArray(orders)) {
      orders.forEach(order => {
        if (order.status !== 'SERVED' && order.status !== 'CANCELLED' && order.table) {
          map[order.table] = order
        }
      })
    }
    return map
  }, [orders])

  const filteredTables = React.useMemo(() => {
    // In a real app we'd filter tables by outlet. 
    // Here we just display the same tables or a subset for demonstration.
    if (activeOutlet === 'Restaurant') return tables
    if (activeOutlet === 'Banquet') return []
    return tables.filter(t => t.tableId.includes('1')) // arbitrary filter for mock
  }, [tables, activeOutlet])

  const totalOccupied = Object.keys(activeOrdersMap).length
  const totalSeats = filteredTables.reduce((acc: number, t: any) => acc + t.size, 0)
  const occupiedSeats = filteredTables.reduce((acc: number, t: any) => {
    return acc + (activeOrdersMap[t.tableId] ? t.size : 0)
  }, 0)

  // Staff on duty memoized list
  const displayedStaff = React.useMemo(() => {
    if (Array.isArray(staffMembers) && staffMembers.length > 0) {
      return staffMembers.slice(0, 5).map((s: any, idx: number) => {
        const initials = s.name
          ? s.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
          : 'ST'
        
        let badgeText = 'Active'
        let badgeClass = 'bg-green-500/20 text-green-400'
        let avatarClass = 'bg-purple-500'

        if (s.dutyStatus === 'ON_DUTY') {
          badgeText = 'Active'
          badgeClass = 'bg-green-500/20 text-green-400'
          avatarClass = 'bg-purple-500'
        } else if (s.dutyStatus === 'OFF_DUTY' || s.dutyStatus === 'PUNCHED_OUT') {
          badgeText = 'Off Duty'
          badgeClass = 'bg-white/5 text-text-secondary'
          avatarClass = 'bg-gray-600'
        }

        const subtitle = s.designation || 'Wait Staff'

        return {
          id: s.id,
          initials,
          name: s.name,
          subtitle,
          badgeText,
          badgeClass,
          avatarClass
        }
      })
    }
    return []
  }, [staffMembers])

  const handleTableClick = (table: any) => {
    const activeOrder = activeOrdersMap[table.tableId]
    setSelectedTable(table)
    if (activeOrder) {
      setIsOccupiedModalOpen(true)
    } else {
      setReservationName(table.reservationName || '')
      setReservationTime(table.reservationTime || '')
      setShowReservationForm(table.status === 'RESERVED')
      setIsEditModalOpen(true)
    }
  }

  // Handle Add Table submission
  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    if (!newTableId.trim()) return

    const { propertyId } = getAdminContext()
    const res = await fetch('/api/admin/pos/tables', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tableId: newTableId.trim().toUpperCase(),
        size: newTableSize,
        isBooth: newTableIsBooth,
        propertyId: propertyId !== 'ALL' ? propertyId : undefined
      })
    })

    const data = await res.json()
    if (!res.ok) {
      setErrorMsg(data.error || 'Failed to add table')
      return
    }

    setNewTableId('')
    setIsAddModalOpen(false)
    mutateTables()
  }

  // Handle status update of a table
  const handleUpdateStatus = async (id: string, status: string, additionalData?: any) => {
    const data: any = { id, status }
    if (status === 'RESERVED' && additionalData) {
      data.reservationName = additionalData.reservationName
      data.reservationTime = additionalData.reservationTime
    }
    if (status !== 'RESERVED') {
      // Clear reservation data if changing to something else
      data.reservationName = null
      data.reservationTime = null
    }

    const res = await fetch('/api/admin/pos/tables', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (res.ok) {
      setIsEditModalOpen(false)
      mutateTables()
    }
  }

  // Handle Table Delete
  const handleDeleteTable = async (id: string) => {
    if (!confirm('Are you sure you want to remove this table?')) return

    const res = await fetch(`/api/admin/pos/tables?id=${id}`, {
      method: 'DELETE'
    })
    if (res.ok) {
      setIsEditModalOpen(false)
      mutateTables()
    }
  }

  // Handle Table Transfer
  const handleTransferTable = async () => {
    if (!transferTargetId) return
    const activeOrder = activeOrdersMap[selectedTable.tableId]
    if (!activeOrder) return

    const res = await fetch(`/api/admin/pos/orders/${activeOrder.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table: transferTargetId.toUpperCase() })
    })
    if (res.ok) {
      setIsTransferModalOpen(false)
      setIsOccupiedModalOpen(false)
      setSelectedTable(null)
      mutateOrders()
      mutateTables()
    }
  }

  if (isOrdersLoading || isTablesLoading) {
    return (
      <div className="flex h-full min-h-[calc(100vh-100px)] bg-background items-center justify-center text-text-primary">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#3B82F6] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-text-secondary font-medium">Loading Floor Plan...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col xl:flex-row h-full min-h-[calc(100vh-100px)] bg-background text-text-primary -mx-4 sm:-mx-6 md:-mx-8 -my-6 md:-my-8 overflow-y-auto xl:overflow-hidden font-sans">
      
      {/* Middle Column - Floor Plan Layout */}
      <div className="flex-1 bg-background border-r-0 xl:border-r border-border flex flex-col relative z-0 min-w-0">
        <div className="p-4 sm:p-6 md:p-8 pb-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {OUTLETS.map(outlet => (
                  <button
                    key={outlet}
                    onClick={() => setActiveOutlet(outlet)}
                    className={cn(
                      "px-4 py-1.5 rounded-full text-xs font-bold transition-all",
                      activeOutlet === outlet ? "bg-white text-black shadow-md" : "text-text-secondary hover:text-text-primary"
                    )}
                  >
                    {outlet}
                  </button>
                ))}
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-text-primary">{activeOutlet} Floor Plan</h1>
            </div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="w-full sm:w-auto justify-center bg-[#2563EB] hover:bg-[#3B82F6] text-white px-5 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all shadow-[0_4px_12px_rgba(37,99,235,0.2)] flex items-center gap-2 shrink-0 active:scale-95"
            >
              <Plus className="w-4 h-4" /> Add Table
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="flex items-center gap-4 bg-[#1E293B] border border-white/5 px-5 sm:px-6 py-4 rounded-3xl">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-[#3B82F6] shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">Occupancy</div>
                <div className="text-2xl font-black text-white">{occupiedSeats} <span className="text-sm font-normal text-gray-400">/{totalSeats} Seats</span></div>
              </div>
            </div>
            
            <div className="flex items-center gap-4 bg-[#1E293B] border border-white/5 px-5 sm:px-6 py-4 rounded-3xl">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                <Utensils className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">Active Tables</div>
                <div className="text-2xl font-black text-white">{totalOccupied} <span className="text-sm font-normal text-gray-400">/{tables.length} Tables</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Grid of Tables */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-4 gap-4 sm:gap-6 content-start">
          {filteredTables.map((table: any) => {
            const activeOrder = activeOrdersMap[table.tableId]
            const isOccupied = !!activeOrder
            const isCleaning = table.status === 'CLEANING'
            const isReserved = table.status === 'RESERVED'

            return (
              <div
                key={table.id}
                onClick={() => handleTableClick(table)}
                className={cn(
                  "relative flex flex-col justify-between p-6 rounded-3xl cursor-pointer transition-all duration-300 group overflow-hidden border h-60",
                  isOccupied
                    ? "bg-[#0A4186] border-transparent text-white shadow-[0_12px_24px_rgba(10,65,134,0.4)] scale-[1.02]"
                    : isCleaning
                      ? "bg-[#78350F] border-transparent text-white shadow-[0_8px_16px_rgba(120,53,15,0.2)]"
                      : isReserved
                        ? "bg-[#581C87] border-transparent text-white shadow-[0_8px_16px_rgba(88,28,135,0.2)]"
                        : "bg-[#1E293B] border-white/5 text-white hover:bg-[#233648] hover:border-white/10"
                )}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-2xl font-black tracking-tight text-white">{table.tableId}</div>
                    <div className={cn("text-xs font-bold mt-1", (isOccupied || isCleaning || isReserved) ? "opacity-70 text-white" : "text-gray-400")}>
                      {table.isBooth ? 'BOOTH' : 'TABLE'} FOR {table.size}
                    </div>
                  </div>
                  {isOccupied && (
                    <span className="px-2.5 py-1 bg-white/20 text-white rounded-lg text-[9px] font-black tracking-widest uppercase">
                      Occupied
                    </span>
                  )}
                  {isCleaning && (
                    <span className="px-2.5 py-1 bg-black/20 text-amber-300 rounded-lg text-[9px] font-black tracking-widest uppercase">
                      Cleaning
                    </span>
                  )}
                  {isReserved && (
                    <span className="px-2.5 py-1 bg-black/20 text-purple-300 rounded-lg text-[9px] font-black tracking-widest uppercase animate-pulse">
                      Reserved
                    </span>
                  )}
                  {!isOccupied && !isCleaning && !isReserved && (
                    <span className="px-2.5 py-1 bg-white/5 border border-white/10 text-gray-400 rounded-lg text-[9px] font-black tracking-widest uppercase">
                      Ready
                    </span>
                  )}
                </div>

                <div className="mt-auto">
                  {isOccupied ? (
                    <div>
                      <div className="text-3xl font-black tracking-tighter text-white">₹{activeOrder.total.toFixed(2)}</div>
                      <div className="flex justify-between items-center mt-2">
                        <div className="text-[10px] font-bold opacity-80 uppercase tracking-wider text-white">{activeOrder.status}</div>
                        <div className="text-[10px] font-bold opacity-80 text-white truncate max-w-[120px]">{activeOrder.guestName || 'Walk-in'}</div>
                      </div>
                    </div>
                  ) : isCleaning ? (
                    <div className="space-y-1">
                      <div className="text-xl font-bold tracking-tight text-amber-200">Resetting Table</div>
                      <div className="text-[10px] text-amber-300 font-semibold uppercase tracking-widest">Vacant Soon</div>
                    </div>
                  ) : isReserved ? (
                    <div className="space-y-1">
                      <div className="text-xl font-bold tracking-tight text-purple-200">{table.reservationTime || 'Reserved Slot'}</div>
                      <div className="text-[10px] text-purple-300 font-semibold uppercase tracking-widest truncate">{table.reservationName || 'Awaiting Guest'}</div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-3xl font-bold text-gray-500 tracking-tight">READY</div>
                      <div className="text-[10px] text-[#3B82F6] font-black uppercase tracking-widest mt-2 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                        Tap to Dine-in <ChevronRight className="w-3 h-3" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Occupancy Indicator Bar */}
                {isOccupied && (
                  <div className="absolute bottom-0 left-0 h-1.5 bg-gradient-to-r from-blue-400 to-indigo-500 w-full"></div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Right Column - Quick Actions & Staff */}
      <div className="w-full xl:w-[360px] 2xl:w-[400px] bg-background flex flex-col p-6 sm:p-8 z-0 border-t xl:border-t-0 border-border">
        
        {/* Quick Actions */}
        <div className="space-y-6 mb-10">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-black tracking-tight uppercase text-gray-400">Quick Actions</h2>
            <Activity className="w-5 h-5 text-[#3B82F6]" />
          </div>
          
          <div className="space-y-3">
            <button
              onClick={() => router.push('/admin/pos/create-order')}
              className="w-full flex items-center justify-between p-5 rounded-3xl bg-[#1E293B] border border-white/5 hover:bg-[#233648] hover:border-white/10 transition-all text-left shadow-sm hover:translate-y-[-2px]"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-500/10 rounded-2xl flex items-center justify-center text-[#3B82F6]">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">New Walk-In</div>
                  <div className="text-[10px] text-gray-500 font-semibold">Assign new table & order</div>
                </div>
              </div>
            </button>

            <button
              onClick={() => router.push('/admin/pos/create-order?type=takeout')}
              className="w-full flex items-center justify-between p-5 rounded-3xl bg-[#1E293B] border border-white/5 hover:bg-[#233648] hover:border-white/10 transition-all text-left shadow-sm hover:translate-y-[-2px]"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500">
                  <Utensils className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">Takeout Order</div>
                  <div className="text-[10px] text-gray-500 font-semibold">Self-pickup or counter sale</div>
                </div>
              </div>
            </button>

            <button
              onClick={() => router.push('/admin/pos/create-order?type=direct-call')}
              className="w-full flex items-center justify-between p-5 rounded-3xl bg-[#1E293B] border border-white/5 hover:bg-[#233648] hover:border-white/10 transition-all text-left shadow-sm hover:translate-y-[-2px]"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-green-500/10 rounded-2xl flex items-center justify-center text-green-500">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">Direct Call</div>
                  <div className="text-[10px] text-gray-500 font-semibold">Immediate counter billing</div>
                </div>
              </div>
            </button>

            <button className="w-full flex items-center justify-between p-5 rounded-3xl bg-[#1E293B] border border-white/5 hover:bg-[#233648] hover:border-white/10 transition-all text-left shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-400">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">Reservations</div>
                  <div className="text-[10px] text-gray-500 font-semibold">Track bookings & schedules</div>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Staff on Duty */}
        <div className="space-y-6 flex-1">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-black tracking-tight uppercase text-text-secondary">Staff On Duty</h2>
            <span className="text-xs font-bold text-text-tertiary">{displayedStaff.length} Online</span>
          </div>

          <div className="space-y-4 overflow-y-auto max-h-[300px] pr-1">
            {displayedStaff.length > 0 ? (
              displayedStaff.map((staff: any) => (
                <div key={staff.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-border">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center text-text-primary text-xs font-bold", staff.avatarClass)}>
                      {staff.initials}
                    </div>
                    <div>
                      <div className="text-sm font-bold">{staff.name}</div>
                      <div className="text-[10px] text-text-tertiary font-semibold">{staff.subtitle}</div>
                    </div>
                  </div>
                  <span className={cn("text-xs font-bold px-2 py-1 rounded", staff.badgeClass)}>{staff.badgeText}</span>
                </div>
              ))
            ) : (
              <div className="text-xs text-text-tertiary text-center py-6 border border-border border-dashed rounded-2xl bg-surface-light">
                No staff members on duty
              </div>
            )}
          </div>
        </div>
        
      </div>

      {/* MODAL 1: ADD TABLE */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="bg-surface border border-border rounded-3xl w-full max-w-md p-8 shadow-2xl relative">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black">Add New Dining Table</h3>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-text-secondary hover:text-text-primary flex items-center justify-center transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {errorMsg && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-xs font-bold mb-4">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleAddTable} className="space-y-5">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-text-secondary mb-2">Table ID / Number</label>
                <input
                  type="text"
                  placeholder="e.g. T-09"
                  value={newTableId}
                  onChange={e => setNewTableId(e.target.value)}
                  className="w-full bg-background border border-border rounded-2xl px-5 py-4 text-sm text-text-primary outline-none focus:border-[#3B82F6] transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-text-secondary mb-2">Seating Capacity</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={newTableSize}
                  onChange={e => setNewTableSize(parseInt(e.target.value) || 4)}
                  className="w-full bg-background border border-border rounded-2xl px-5 py-4 text-sm text-text-primary outline-none focus:border-[#3B82F6] transition-colors"
                  required
                />
              </div>

              <div className="flex items-center gap-3 py-2">
                <input
                  type="checkbox"
                  id="is-booth-check"
                  checked={newTableIsBooth}
                  onChange={e => setNewTableIsBooth(e.target.checked)}
                  className="w-4 h-4 rounded border-border bg-background text-[#3B82F6] focus:ring-0"
                />
                <label htmlFor="is-booth-check" className="text-xs font-semibold text-text-secondary cursor-pointer select-none">
                  Booth seating layout
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-surface hover:bg-surface text-text-primary font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg shadow-blue-500/20"
              >
                Create Table
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: MANAGE TABLE (VACANT) */}
      {isEditModalOpen && selectedTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="bg-surface border border-border rounded-3xl w-full max-w-md p-8 shadow-2xl relative">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-black leading-none">{selectedTable.tableId}</h3>
                <span className="text-xs font-bold text-text-tertiary uppercase tracking-widest mt-1.5 block">
                  {selectedTable.isBooth ? 'BOOTH' : 'TABLE'} FOR {selectedTable.size}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleDeleteTable(selectedTable.id)}
                  className="w-10 h-10 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 flex items-center justify-center transition-colors"
                  title="Remove Table"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setIsEditModalOpen(false)}
                  className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-text-secondary hover:text-text-primary flex items-center justify-center transition-colors"
                  title="Close Modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="space-y-6">
              {/* Quick Dine-in */}
              <button
                onClick={() => {
                  setIsEditModalOpen(false)
                  router.push(`/admin/pos/create-order?table=${selectedTable.tableId}`)
                }}
                className="w-full p-5 rounded-2xl bg-background hover:bg-background text-text-primary font-bold text-sm tracking-wide transition-all shadow-md flex items-center justify-between group"
              >
                <span className="flex items-center gap-2">
                  <Utensils className="w-4 h-4" /> Start Dine-in Order
                </span>
                <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
              </button>

              {/* Status Toggles */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-text-tertiary mb-3">Change Operational Status</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: 'READY', label: 'Ready', color: 'bg-background border-border text-text-secondary hover:text-text-primary' },
                    { key: 'CLEANING', label: 'Cleaning', color: 'bg-surface/20 border-[#78350F]/30 text-amber-300' },
                    { key: 'RESERVED', label: 'Reserve', color: 'bg-surface/20 border-[#581C87]/30 text-purple-300' }
                  ].map(statusOpt => {
                    const isActive = selectedTable.status === statusOpt.key
                    return (
                      <button
                        key={statusOpt.key}
                        onClick={() => {
                          if (statusOpt.key === 'RESERVED') {
                            setShowReservationForm(true)
                          } else {
                            setShowReservationForm(false)
                            handleUpdateStatus(selectedTable.id, statusOpt.key)
                          }
                        }}
                        className={cn(
                          "py-3.5 rounded-xl border text-xs font-bold uppercase transition-all",
                          isActive && !showReservationForm
                            ? "bg-surface border-transparent text-text-primary shadow-sm scale-105" 
                            : statusOpt.color
                        )}
                      >
                        {statusOpt.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Reservation Form */}
              {showReservationForm && (
                <div className="mt-4 p-5 rounded-2xl bg-black/20 border border-purple-500/20 space-y-4 animate-in slide-in-from-top-2 fade-in duration-200">
                  <h4 className="text-xs font-black uppercase text-purple-300 tracking-wider">Reservation Details</h4>
                  
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-text-tertiary mb-1.5">Guest Name</label>
                    <input 
                      type="text" 
                      value={reservationName}
                      onChange={e => setReservationName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-purple-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-text-tertiary mb-1.5">Time / Details</label>
                    <input 
                      type="text" 
                      value={reservationTime}
                      onChange={e => setReservationTime(e.target.value)}
                      placeholder="e.g. 8:00 PM or Tonight"
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-purple-500/50"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setShowReservationForm(false)}
                      className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-text-secondary transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(selectedTable.id, 'RESERVED', { reservationName, reservationTime })}
                      className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl text-xs font-black text-white uppercase tracking-wider shadow-lg shadow-purple-500/20 transition-all"
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: OCCUPIED TABLE ACTIONS */}
      {isOccupiedModalOpen && selectedTable && activeOrdersMap[selectedTable.tableId] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="bg-surface border border-border rounded-3xl w-full max-w-md p-8 shadow-2xl relative">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-black leading-none">{selectedTable.tableId}</h3>
                <span className="text-xs font-bold text-text-tertiary uppercase tracking-widest mt-1.5 block">
                  Occupied by {activeOrdersMap[selectedTable.tableId].guestName}
                </span>
              </div>
              <button 
                onClick={() => setIsOccupiedModalOpen(false)}
                className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-text-secondary hover:text-text-primary flex items-center justify-center transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => {
                  setIsOccupiedModalOpen(false)
                  router.push(`/admin/pos/create-order?table=${selectedTable.tableId}`)
                }}
                className="w-full p-5 rounded-2xl bg-surface-light border border-border hover:bg-white/5 text-text-primary font-bold text-sm tracking-wide transition-all shadow-sm flex items-center justify-between group"
              >
                <span className="flex items-center gap-3">
                  <Utensils className="w-5 h-5 text-amber-500" /> Add to Order
                </span>
                <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => {
                  setIsOccupiedModalOpen(false)
                  router.push(`/admin/pos/transactions?orderId=${activeOrdersMap[selectedTable.tableId].id}`)
                }}
                className="w-full p-5 rounded-2xl bg-surface-light border border-border hover:bg-white/5 text-text-primary font-bold text-sm tracking-wide transition-all shadow-sm flex items-center justify-between group"
              >
                <span className="flex items-center gap-3">
                  <ReceiptText className="w-5 h-5 text-blue-500" /> Settle Bill / View KOT
                </span>
                <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => {
                  setIsOccupiedModalOpen(false)
                  setIsTransferModalOpen(true)
                }}
                className="w-full p-5 rounded-2xl bg-surface-light border border-border hover:bg-white/5 text-text-primary font-bold text-sm tracking-wide transition-all shadow-sm flex items-center justify-between group"
              >
                <span className="flex items-center gap-3">
                  <ArrowRightLeft className="w-5 h-5 text-purple-400" /> Table Transfer / Link
                </span>
                <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: TABLE TRANSFER */}
      {isTransferModalOpen && selectedTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="bg-surface border border-border rounded-3xl w-full max-w-md p-8 shadow-2xl relative">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-black">Transfer Table</h3>
                <span className="text-xs font-bold text-text-tertiary uppercase mt-1 block">
                  Moving Order from {selectedTable.tableId}
                </span>
              </div>
              <button 
                onClick={() => setIsTransferModalOpen(false)}
                className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-text-secondary hover:text-text-primary flex items-center justify-center transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-text-secondary mb-2">Select Destination Table</label>
                <select
                  value={transferTargetId}
                  onChange={e => setTransferTargetId(e.target.value)}
                  className="w-full bg-background border border-border rounded-2xl px-5 py-4 text-sm text-text-primary outline-none focus:border-[#3B82F6] transition-colors"
                >
                  <option value="">-- Select Vacant Table --</option>
                  {tables.filter(t => !activeOrdersMap[t.tableId] && t.tableId !== selectedTable.tableId).map(t => (
                    <option key={t.id} value={t.tableId}>{t.tableId} (Seats: {t.size})</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleTransferTable}
                disabled={!transferTargetId}
                className="w-full py-4 mt-2 bg-[#3B82F6] disabled:bg-gray-800 disabled:text-gray-500 hover:bg-blue-600 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg"
              >
                Confirm Transfer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
