'use client'

import React, { useState } from 'react'
import useSWR from 'swr'
import { useRouter } from 'next/navigation'
import {
  Utensils, LayoutGrid, BellRing, UtensilsCrossed, ReceiptText, LogOut,
  Plus, Calendar, Shield, Users, Activity, Sparkles, User, Trash2, X, ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function FloorPlanPage() {
  const router = useRouter()
  
  // Fetch dynamic orders and tables from database
  const { data: orders, isLoading: isOrdersLoading } = useSWR('/api/admin/pos/orders', fetcher)
  const { data: dbTables, isLoading: isTablesLoading, mutate: mutateTables } = useSWR('/api/admin/pos/tables', fetcher)
  const { data: staffData } = useSWR('/api/admin/staff?activeOnly=true', fetcher)

  const staffMembers = staffData?.data || []
  const tables = dbTables || []

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedTable, setSelectedTable] = useState<any>(null)

  // Add Table Form State
  const [newTableId, setNewTableId] = useState('')
  const [newTableSize, setNewTableSize] = useState(4)
  const [newTableIsBooth, setNewTableIsBooth] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

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

  const totalOccupied = Object.keys(activeOrdersMap).length
  const totalSeats = tables.reduce((acc: number, t: any) => acc + t.size, 0)
  const occupiedSeats = tables.reduce((acc: number, t: any) => {
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
          badgeClass = 'bg-white/5 text-gray-400'
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
    if (activeOrder) {
      // If table is occupied, go directly to transactions settlement page
      router.push(`/admin/pos/transactions?orderId=${activeOrder.id}`)
    } else {
      // If table is vacant, open Edit/Manage Modal
      setSelectedTable(table)
      setIsEditModalOpen(true)
    }
  }

  // Handle Add Table submission
  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    if (!newTableId.trim()) return

    const res = await fetch('/api/admin/pos/tables', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tableId: newTableId.trim().toUpperCase(),
        size: newTableSize,
        isBooth: newTableIsBooth
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
  const handleUpdateStatus = async (id: string, status: string) => {
    const res = await fetch('/api/admin/pos/tables', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status })
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

  if (isOrdersLoading || isTablesLoading) {
    return (
      <div className="flex h-full min-h-[calc(100vh-100px)] bg-[#0B1120] items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#3B82F6] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-gray-400 font-medium">Loading Floor Plan...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-[calc(100vh-100px)] bg-[#0B1120] text-white -mx-6 md:-mx-8 -my-6 md:-my-8 overflow-hidden font-sans">
      
      {/* Middle Column - Floor Plan Layout */}
      <div className="flex-1 bg-[#0F172A] border-r border-white/5 flex flex-col relative z-0">
        <div className="p-8 pb-4">
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="text-[10px] font-black text-[#3B82F6] tracking-[0.2em] uppercase mb-1">Live Status</div>
              <h1 className="text-4xl font-black tracking-tight text-white">Main Dining Hall</h1>
            </div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-[#2563EB] hover:bg-[#3B82F6] text-white px-5 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all shadow-[0_4px_12px_rgba(37,99,235,0.2)] flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Table
            </button>
          </div>
          
          <div className="flex gap-4">
            <div className="flex items-center gap-4 bg-[#1E293B] border border-white/5 px-6 py-4 rounded-3xl">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-[#3B82F6]">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">Occupancy</div>
                <div className="text-2xl font-black">{occupiedSeats} <span className="text-sm font-normal text-gray-500">/{totalSeats} Seats</span></div>
              </div>
            </div>
            
            <div className="flex items-center gap-4 bg-[#1E293B] border border-white/5 px-6 py-4 rounded-3xl">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                <Utensils className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">Active Tables</div>
                <div className="text-2xl font-black">{totalOccupied} <span className="text-sm font-normal text-gray-500">/{tables.length} Tables</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Grid of Tables */}
        <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 content-start">
          {tables.map((table: any) => {
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
                    <div className="text-2xl font-black tracking-tight">{table.tableId}</div>
                    <div className={cn("text-xs font-bold mt-1", (isOccupied || isCleaning || isReserved) ? "opacity-70" : "text-gray-400")}>
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
                      <div className="text-3xl font-black tracking-tighter">₹{activeOrder.total.toFixed(2)}</div>
                      <div className="flex justify-between items-center mt-2">
                        <div className="text-[10px] font-bold opacity-80 uppercase tracking-wider">{activeOrder.status}</div>
                        <div className="text-[10px] font-bold opacity-80">{activeOrder.guestName}</div>
                      </div>
                    </div>
                  ) : isCleaning ? (
                    <div className="space-y-1">
                      <div className="text-xl font-bold tracking-tight text-amber-200">Resetting Table</div>
                      <div className="text-[10px] text-amber-300 font-semibold uppercase tracking-widest">Vacant Soon</div>
                    </div>
                  ) : isReserved ? (
                    <div className="space-y-1">
                      <div className="text-xl font-bold tracking-tight text-purple-200">Reserved Slot</div>
                      <div className="text-[10px] text-purple-300 font-semibold uppercase tracking-widest">Awaiting Guest</div>
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
      <div className="w-[380px] bg-[#0B1120] flex flex-col p-8 z-0">
        
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
            <h2 className="text-lg font-black tracking-tight uppercase text-gray-400">Staff On Duty</h2>
            <span className="text-xs font-bold text-gray-500">{displayedStaff.length} Online</span>
          </div>

          <div className="space-y-4 overflow-y-auto max-h-[300px] pr-1">
            {displayedStaff.length > 0 ? (
              displayedStaff.map((staff: any) => (
                <div key={staff.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center text-white text-xs font-bold", staff.avatarClass)}>
                      {staff.initials}
                    </div>
                    <div>
                      <div className="text-sm font-bold">{staff.name}</div>
                      <div className="text-[10px] text-gray-500 font-semibold">{staff.subtitle}</div>
                    </div>
                  </div>
                  <span className={cn("text-xs font-bold px-2 py-1 rounded", staff.badgeClass)}>{staff.badgeText}</span>
                </div>
              ))
            ) : (
              <div className="text-xs text-gray-500 text-center py-6 border border-white/5 border-dashed rounded-2xl bg-white/[0.01]">
                No staff members on duty
              </div>
            )}
          </div>
        </div>
        
      </div>

      {/* MODAL 1: ADD TABLE */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="bg-[#1E293B] border border-white/5 rounded-3xl w-full max-w-md p-8 shadow-2xl relative">
            <button 
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-2xl font-black mb-6">Add New Dining Table</h3>
            
            {errorMsg && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-xs font-bold mb-4">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleAddTable} className="space-y-5">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2">Table ID / Number</label>
                <input
                  type="text"
                  placeholder="e.g. T-09"
                  value={newTableId}
                  onChange={e => setNewTableId(e.target.value)}
                  className="w-full bg-[#0F172A] border border-white/5 rounded-2xl px-5 py-4 text-sm text-white outline-none focus:border-[#3B82F6] transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2">Seating Capacity</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={newTableSize}
                  onChange={e => setNewTableSize(parseInt(e.target.value) || 4)}
                  className="w-full bg-[#0F172A] border border-white/5 rounded-2xl px-5 py-4 text-sm text-white outline-none focus:border-[#3B82F6] transition-colors"
                  required
                />
              </div>

              <div className="flex items-center gap-3 py-2">
                <input
                  type="checkbox"
                  id="is-booth-check"
                  checked={newTableIsBooth}
                  onChange={e => setNewTableIsBooth(e.target.checked)}
                  className="w-4 h-4 rounded border-white/5 bg-[#0F172A] text-[#3B82F6] focus:ring-0"
                />
                <label htmlFor="is-booth-check" className="text-xs font-semibold text-gray-300 cursor-pointer select-none">
                  Booth seating layout
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-[#2563EB] hover:bg-[#3B82F6] text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg shadow-blue-500/20"
              >
                Create Table
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: MANAGE TABLE */}
      {isEditModalOpen && selectedTable && (
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
                <h3 className="text-2xl font-black leading-none">{selectedTable.tableId}</h3>
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1.5 block">
                  {selectedTable.isBooth ? 'BOOTH' : 'TABLE'} FOR {selectedTable.size}
                </span>
              </div>
              <button 
                onClick={() => handleDeleteTable(selectedTable.id)}
                className="w-10 h-10 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 flex items-center justify-center transition-colors"
                title="Remove Table"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Quick Dine-in */}
              <button
                onClick={() => {
                  setIsEditModalOpen(false)
                  router.push(`/admin/pos/create-order?table=${selectedTable.tableId}`)
                }}
                className="w-full p-5 rounded-2xl bg-[#0A4186] hover:bg-[#0d4f9f] text-white font-bold text-sm tracking-wide transition-all shadow-md flex items-center justify-between group"
              >
                <span className="flex items-center gap-2">
                  <Utensils className="w-4 h-4" /> Start Dine-in Order
                </span>
                <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
              </button>

              {/* Status Toggles */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-3">Change Operational Status</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: 'READY', label: 'Ready', color: 'bg-[#0F172A] border-white/5 text-gray-400 hover:text-white' },
                    { key: 'CLEANING', label: 'Cleaning', color: 'bg-[#78350F]/20 border-[#78350F]/30 text-amber-300' },
                    { key: 'RESERVED', label: 'Reserve', color: 'bg-[#581C87]/20 border-[#581C87]/30 text-purple-300' }
                  ].map(statusOpt => {
                    const isActive = selectedTable.status === statusOpt.key
                    return (
                      <button
                        key={statusOpt.key}
                        onClick={() => handleUpdateStatus(selectedTable.id, statusOpt.key)}
                        className={cn(
                          "py-3.5 rounded-xl border text-xs font-bold uppercase transition-all",
                          isActive 
                            ? "bg-[#2563EB] border-transparent text-white shadow-sm scale-105" 
                            : statusOpt.color
                        )}
                      >
                        {statusOpt.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
