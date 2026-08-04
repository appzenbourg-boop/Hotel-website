'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { startOfWeek, addDays, format, differenceInDays, isToday } from 'date-fns'
import { ChevronLeft, ChevronRight, Plus, Star, Download, Loader2, Calendar, FileText, Printer, Banknote, CreditCard, Smartphone, Building2, HelpCircle, X, ArrowRight, UtensilsCrossed, Edit2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { CheckCircle2, LogOut, XCircle } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { downloadCSV } from '@/lib/csv'
import { formatCurrency } from '@/lib/utils'
import { generateBookingPDFVoucher } from '@/lib/pdf-generator'
import { generateGuestDetailsPDFReport, GuestDetailsReportBooking } from '@/lib/guest-details-pdf'

// ---- Color/status helpers ----
const STATUS_CONFIG: Record<string, { bar: string; label: string; dot: string; text: string }> = {
  RESERVED: { bar: 'bg-[#5a5200] border-l-[3px] border-[#d4aa00]', label: 'RESERVED', dot: 'bg-[#d4aa00]', text: 'text-[#ffe066]' },
  CHECKED_IN: { bar: 'bg-[#0d3d1e] border-l-[3px] border-[#1db954]', label: 'CHECKED-IN', dot: 'bg-[#1db954]', text: 'text-[#4ade80]' },
  CHECKED_OUT: { bar: 'bg-[#1a1f2e] border-l-[3px] border-[#4a5568]', label: 'CHECKED-OUT', dot: 'bg-[#4a5568]', text: 'text-[#94a3b8]' },
  CANCELLED: { bar: 'bg-[#3d0d0d] border-l-[3px] border-[#e53e3e]', label: 'CANCELLED', dot: 'bg-[#e53e3e]', text: 'text-[#fc8181]' },
  AIRBNB: { bar: 'bg-[#2d1a47] border-l-[3px] border-[#805ad5]', label: 'AIRBNB', dot: 'bg-[#805ad5]', text: 'text-[#c084fc]' },
  BOOKING_COM: { bar: 'bg-[#002244] border-l-[3px] border-[#003580]', label: 'BOOKING.COM', dot: 'bg-[#003580]', text: 'text-[#80b3ff]' },
  MAKE_MY_TRIP: { bar: 'bg-[#4d0c10] border-l-[3px] border-[#ea2330]', label: 'MAKEMYTRIP', dot: 'bg-[#ea2330]', text: 'text-[#ff99a0]' },
  AGODA: { bar: 'bg-[#420507] border-l-[3px] border-[#ec1c24]', label: 'AGODA', dot: 'bg-[#ec1c24]', text: 'text-[#ff8084]' },
  GOIBIBO: { bar: 'bg-[#0b2447] border-l-[3px] border-[#2276e3]', label: 'GOIBIBO', dot: 'bg-[#2276e3]', text: 'text-[#82b1ff]' },
  EASEMYTRIP: { bar: 'bg-[#06283d] border-l-[3px] border-[#2196f3]', label: 'EASEMYTRIP', dot: 'bg-[#2196f3]', text: 'text-[#90caf9]' },
  YATRA: { bar: 'bg-[#3f1406] border-l-[3px] border-[#ea4c16]', label: 'YATRA', dot: 'bg-[#ea4c16]', text: 'text-[#ffab91]' },
  IXIGO: { bar: 'bg-[#441c00] border-l-[3px] border-[#ff6600]', label: 'IXIGO', dot: 'bg-[#ff6600]', text: 'text-[#ffcc80]' },
  TRIVAGO: { bar: 'bg-[#002f42] border-l-[3px] border-[#007faf]', label: 'TRIVAGO', dot: 'bg-[#007faf]', text: 'text-[#80d8ff]' },
  DIRECT: { bar: 'bg-[#1a3a5c] border-l-[3px] border-[#3b82f6]', label: 'DIRECT', dot: 'bg-[#3b82f6]', text: 'text-[#60a5fa]' },
}

function getBookingConfig(status: string, source: string, notes: string | null) {
  if (status === 'CANCELLED') return STATUS_CONFIG['CANCELLED']
  if (status === 'CHECKED_OUT') return STATUS_CONFIG['CHECKED_OUT']
  
  const cleanSource = (source || '').toUpperCase().trim()
  let finalSource = cleanSource

  if (cleanSource === 'OTHER' && notes) {
    const match = notes.match(/\[OTA_SOURCE:\s*([^\n\r\]]+)\]/)
    if (match) {
      finalSource = match[1].toUpperCase().trim()
    }
  }

  return STATUS_CONFIG[finalSource] || STATUS_CONFIG[status] || STATUS_CONFIG['RESERVED']
}

const ROOM_STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  CLEAN: { label: 'Clean', cls: 'bg-[#0d3d1e] text-[#4ade80] border border-[#1db954]/30' },
  DIRTY: { label: 'Dirty', cls: 'bg-[#3d0d0d] text-[#fc8181] border border-[#e53e3e]/30' },
  INSPECT: { label: 'Inspect', cls: 'bg-[#3d2800] text-[#fbbf24] border border-[#f59e0b]/30' },
}

const LEGEND = [
  { label: 'Reserved', cls: 'bg-[#d4aa00]' },
  { label: 'Checked-in', cls: 'bg-[#1db954]' },
  { label: 'Checked-out', cls: 'bg-[#4a5568]' },
  { label: 'Cancelled', cls: 'bg-[#e53e3e]' },
  { label: 'Block/OTA', cls: 'bg-[#805ad5]' },
]

const toLocalDateStr = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

function parseLocal(str: string) {
    if (!str) return new Date()
    // Ensure we parse as LOCAL midnight, not UTC
    if (str.includes('T')) str = str.split('T')[0]
    return new Date(str + 'T00:00:00')
}

export default function BookingsPage() {
  const { data: session } = useSession()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week')
  const [rooms, setRooms] = useState<any[]>([])
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBooking, setSelectedBooking] = useState<any>(null)
  const [fullBooking, setFullBooking] = useState<any>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [showInvoice, setShowInvoice] = useState(false)
  const [invoiceData, setInvoiceData] = useState<any>(null)
  const [roomFilter, setRoomFilter] = useState('All Rooms')
  const [floorFilter, setFloorFilter] = useState('All Floors')

  // Upgrade/Extend State
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [showExtendModal, setShowExtendModal] = useState(false)
  const [availableUpgrades, setAvailableUpgrades] = useState<any[]>([])
  const [extensionDays, setExtensionDays] = useState(1)
  const [requestLoading, setRequestLoading] = useState(false)

  // Checkout & Payment Modal State
  const [showCheckoutModal, setShowCheckoutModal] = useState(false)
  const [checkoutPaymentMethod, setCheckoutPaymentMethod] = useState<'CASH' | 'CARD' | 'ONLINE' | 'CORPORATE_CLEARANCE' | 'OTHER'>('CASH')
  const [checkoutPaidAmount, setCheckoutPaidAmount] = useState<string>('')
  const [checkoutNotes, setCheckoutNotes] = useState<string>('')

  // Edit Meal Plan & Add-ons Modal State
  const [showMealPlanModal, setShowMealPlanModal] = useState(false)
  const [editMealPlanType, setEditMealPlanType] = useState('EP')
  const [editMealPlanRate, setEditMealPlanRate] = useState(0)
  const [editExtraAddons, setEditExtraAddons] = useState<any[]>([])
  const [newAddonName, setNewAddonName] = useState('')
  const [newAddonPrice, setNewAddonPrice] = useState('')

  const handleSaveMealPlanAndAddons = async () => {
    if (!selectedBooking) return
    setIsUpdating(true)
    try {
      const res = await fetch('/api/admin/bookings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: selectedBooking.id,
          mealPlan: editMealPlanType,
          mealPlanPricePerDay: editMealPlanRate,
          extraAddons: editExtraAddons.filter((a: any) => (a.qty > 0 || a.price > 0) && a.name),
        })
      })
      const json = await res.json()
      if (json.success) {
        toast.success("Meal plan & extra add-ons updated successfully!")
        setShowMealPlanModal(false)
        if (typeof (window as any).refreshBookingsData === 'function') {
          (window as any).refreshBookingsData()
        }
        if (selectedBooking) {
          setSelectedBooking((prev: any) => ({
            ...prev,
            mealPlan: json.data.mealPlan,
            mealPlanPricePerDay: json.data.mealPlanPricePerDay,
            mealPlanAmount: json.data.mealPlanAmount,
            extraAddons: json.data.extraAddons,
            extraAddonsAmount: json.data.extraAddonsAmount,
            totalAmount: json.data.totalAmount,
            finalAmount: json.data.finalAmount,
          }))
        }
      } else {
        toast.error(json.error || "Failed to update meal plan")
      }
    } catch {
      toast.error("Failed to update meal plan")
    } finally {
      setIsUpdating(false)
    }
  }

  const startDate = useMemo(() => {
    let start: Date
    if (viewMode === 'day') start = currentDate
    else start = startOfWeek(currentDate, { weekStartsOn: 1 })
    return parseLocal(toLocalDateStr(start))
  }, [currentDate, viewMode])

  const days = useMemo(() => {
    const count = viewMode === 'day' ? 1 : viewMode === 'week' ? 7 : 30
    return Array.from({ length: count }).map((_: any, i: number) => addDays(startDate, i))
  }, [startDate, viewMode])

  const endDate = useMemo(() => days[days.length - 1], [days])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const roomsRes = await fetch('/api/admin/rooms?status=ALL')
      const roomsJson = await roomsRes.json()
      setRooms(Array.isArray(roomsJson) ? roomsJson : (roomsJson?.data ?? []))

      const bookingsRes = await fetch(`/api/admin/bookings?start=${startDate.toISOString()}&end=${endDate.toISOString()}`)
      const bookingsJson = await bookingsRes.json()
      const bookingsData = Array.isArray(bookingsJson) ? bookingsJson : (bookingsJson?.data ?? [])

      const formatted = bookingsData.map((b: any) => ({
        id: b.id,
        bookingReference: b.bookingReference || (b.id ? b.id.slice(-4).toUpperCase() : ''),
        guest: b.guest?.name ?? 'Guest',
        guestPhone: b.guest?.phone ?? '',
        guestAddress: b.guest?.address ?? '',
        idType: b.guest?.idType ?? 'Aadhar',
        idNumber: b.guest?.idNumber ?? '',
        room: b.room?.roomNumber ?? '',
        startDate: parseLocal(b.checkIn),
        endDate: parseLocal(b.checkOut),
        actualCheckIn: b.actualCheckIn,
        actualCheckOut: b.actualCheckOut,
        nights: differenceInDays(parseLocal(b.checkOut), parseLocal(b.checkIn)) || 1,
        status: b.status,
        source: b.source ?? '',
        notes: b.notes ?? '',
        isVip: b.isVip ?? false,
        totalAmount: b.totalAmount ?? 0,
        paidAmount: b.paidAmount ?? 0,
        paymentMethod: b.paymentMethod ?? 'CASH',
        paymentStatus: b.paymentStatus ?? 'PENDING',
        numberOfGuests: b.numberOfGuests ?? 1,
        raw: b
      }))
      setBookings(formatted)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate])

  const handleExportPDFReport = () => {
    if (bookings.length === 0) {
      toast.error('No bookings found for the selected period filter')
      return
    }

    let periodLabel = ''
    if (viewMode === 'day') {
      periodLabel = format(currentDate, 'dd MMMM yyyy')
    } else if (viewMode === 'week') {
      periodLabel = `${format(startDate, 'dd MMM')} - ${format(endDate, 'dd MMM yyyy')}`
    } else {
      periodLabel = format(currentDate, 'MMMM yyyy')
    }

    const reportBookings: GuestDetailsReportBooking[] = bookings.map(b => ({
      id: b.id,
      bookingReference: b.bookingReference,
      roomNumber: b.room,
      checkIn: b.startDate,
      checkOut: b.endDate,
      actualCheckIn: b.actualCheckIn,
      actualCheckOut: b.actualCheckOut,
      status: b.status,
      source: b.source,
      guestName: b.guest,
      guestAddress: b.guestAddress,
      idType: b.idType,
      idNumber: b.idNumber,
      contactNo: b.guestPhone,
      pax: b.numberOfGuests || 1,
      totalAmount: b.totalAmount || 0,
      paidAmount: b.paidAmount || 0,
      paymentMethod: b.paymentMethod,
      paymentStatus: b.paymentStatus
    }))

    const hotelName = session?.user?.name || 'Atlas Hotel'
    generateGuestDetailsPDFReport(hotelName, periodLabel, reportBookings)
    toast.success(`PDF Guest Details report downloaded for ${periodLabel}!`)
  }

  useEffect(() => { fetchData() }, [fetchData])

  const handleConfirmCheckoutPayment = async () => {
    if (!selectedBooking) return
    setIsUpdating(true)
    try {
      const res = await fetch('/api/admin/bookings/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: selectedBooking.id,
          action: 'CHECK_OUT',
          paymentMethod: checkoutPaymentMethod,
          paidAmount: parseFloat(checkoutPaidAmount) || 0,
          paymentNotes: checkoutNotes
        })
      })
      if (res.ok) {
        toast.success('Guest checked out & payment settled successfully')
        setShowCheckoutModal(false)

        // Fetch full booking details for invoice modal
        const allRes = await fetch(`/api/admin/bookings?status=ALL&limit=200`)
        if (allRes.ok) {
          const allJson = await allRes.json()
          const allBookings = Array.isArray(allJson) ? allJson : (allJson?.data ?? [])
          const full = allBookings.find((b: any) => b.id === selectedBooking.id)
          if (full) {
            setInvoiceData(full)
            setShowInvoice(true)
          }
        }
        setSelectedBooking(null)
        fetchData()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Failed to check out guest')
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleUpdateStatus = async (action: string) => {
    if (!selectedBooking) return
    setIsUpdating(true)
    try {
      const res = await fetch('/api/admin/bookings/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: selectedBooking.id, action })
      })
      if (res.ok) {
        toast.success(`Booking ${action.replace('_', ' ').toLowerCase()} successfully`)

        // On checkout — fetch full booking details and show invoice
        if (action === 'CHECK_OUT') {
          try {
            const allRes = await fetch(`/api/admin/bookings?status=ALL&limit=200`)
            if (allRes.ok) {
              const allJson = await allRes.json()
              const allBookings = Array.isArray(allJson) ? allJson : (allJson?.data ?? [])
              const full = allBookings.find((b: any) => b.id === selectedBooking.id)
              if (full) {
                setInvoiceData(full)
                setShowInvoice(true)
                setSelectedBooking(null)
              }
            }
          } catch { /* non-critical */ }
        } else {
          setSelectedBooking(null)
        }
        fetchData()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Failed to update booking')
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleRequestUpgrade = async (newRoomId: string, extraCharge: number) => {
    setRequestLoading(true)
    try {
      const res = await fetch('/api/admin/bookings/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: selectedBooking.id,
          type: 'UPGRADE',
          details: { newRoomId, extraCharge }
        })
      })
      if (res.ok) {
        toast.success('Upgrade request submitted for approval')
        setShowUpgradeModal(false)
        setSelectedBooking(null)
      } else {
        const err = await res.json()
        toast.error(err.error || 'Failed to submit request')
      }
    } catch {
      toast.error('Error submitting request')
    } finally {
      setRequestLoading(false)
    }
  }

  const handleRequestExtension = async (extraCharge: number) => {
    setRequestLoading(true)
    try {
      const newCheckOut = addDays(selectedBooking.endDate, extensionDays)
      const res = await fetch('/api/admin/bookings/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: selectedBooking.id,
          type: 'EXTENSION',
          details: { newCheckOut, extraCharge }
        })
      })
      if (res.ok) {
        toast.success('Extension request submitted for approval')
        setShowExtendModal(false)
        setSelectedBooking(null)
      } else {
        const err = await res.json()
        toast.error(err.error || 'Failed to submit request')
      }
    } catch {
      toast.error('Error submitting request')
    } finally {
      setRequestLoading(false)
    }
  }

  const fetchUpgrades = async () => {
    if (!selectedBooking) return
    try {
      // Find current room price
      const currentRoom = rooms.find(r => r.roomNumber === selectedBooking.room)
      const currentPrice = currentRoom?.basePrice || 0
      
      // Fetch all rooms and filter for higher price + same dates availability (simplified for now)
      const available = rooms.filter(r => 
        r.roomNumber !== selectedBooking.room && 
        r.basePrice > currentPrice &&
        r.status === 'AVAILABLE'
      )
      setAvailableUpgrades(available)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    if (showUpgradeModal) fetchUpgrades()
  }, [showUpgradeModal])

  const handlePrev = () => {
    const offset = viewMode === 'day' ? -1 : viewMode === 'week' ? -7 : -30
    setCurrentDate(addDays(currentDate, offset))
  }
  const handleNext = () => {
    const offset = viewMode === 'day' ? 1 : viewMode === 'week' ? 7 : 30
    setCurrentDate(addDays(currentDate, offset))
  }
  const handleToday = () => setCurrentDate(new Date())

  const getBookingStyle = (booking: any) => {
    const totalDays = days.length
    const startDiff = differenceInDays(booking.startDate, startDate)
    const leftOffset = Math.max(0, startDiff)

    // Booking spans from check-in to check-out (check-out day is the last column it occupies)
    const clampedStart = booking.startDate < startDate ? startDate : booking.startDate
    const clampedEnd   = booking.endDate   > addDays(endDate, 1) ? addDays(endDate, 1) : booking.endDate

    // Width = number of days the bar covers (check-in day through last night = endDate - startDate in days)
    const width = Math.max(0.5, Math.min(
      differenceInDays(clampedEnd, clampedStart),
      totalDays - leftOffset
    ))

    return {
      left:  `calc(${(leftOffset / totalDays) * 100}% + 1px)`,
      width: `calc(${(width   / totalDays) * 100}% - 2px)`,
    }
  }

  // Unique floors derived from room data
  const floors = useMemo(() => {
    const floorNums = [...new Set(rooms.map(r => Math.floor((parseInt(r.roomNumber) || 0) / 100)))].sort()
    return floorNums.map(f => `Floor ${f}`)
  }, [rooms])

  const filteredRooms = useMemo(() => {
    return rooms.filter(room => {
      // Room Filter
      if (roomFilter !== 'All Rooms') {
        if (`Room ${room.roomNumber}` !== roomFilter) return false
      }
      // Floor Filter
      if (floorFilter !== 'All Floors') {
        const floorNum = parseInt(floorFilter.replace('Floor ', ''))
        const roomFloor = Math.floor((parseInt(room.roomNumber) || 0) / 100)
        if (roomFloor !== floorNum) return false
      }
      return true
    })
  }, [rooms, floorFilter, roomFilter])

  const monthLabel = viewMode === 'day' ? format(currentDate, 'MMMM dd, yyyy') : format(startDate, 'MMMM yyyy')

  return (
    <div className="-mx-4 -my-4 md:-mx-6 md:-my-6 h-[calc(100vh-4rem)] flex flex-col min-h-0 gap-0 bg-[#101922] text-white overflow-hidden">
      {/* === TOP NAV BAR === */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between px-4 py-3 gap-3 border-b border-white/[0.07] bg-[#233648] shrink-0">
        {/* Left: title + Today */}
        <div className="flex items-center justify-between sm:justify-start gap-4">
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col gap-1 cursor-pointer opacity-60 hover:opacity-100 transition-opacity p-1">
              <span className="w-5 h-[2px] bg-white rounded-full" />
              <span className="w-4 h-[2px] bg-white rounded-full" />
              <span className="w-5 h-[2px] bg-white rounded-full" />
            </div>
            <span className="text-base font-bold text-white uppercase tracking-tight">Calendar</span>
          </div>
          
          <div className="flex items-center gap-1 bg-black/20 rounded-lg p-1">
            <button onClick={handlePrev} className="p-1.5 hover:bg-white/10 rounded-md transition-colors">
              <ChevronLeft className="w-3.5 h-3.5 text-gray-400" />
            </button>
            <span className="text-[11px] font-black text-white min-w-[100px] text-center uppercase tracking-widest">{monthLabel}</span>
            <button onClick={handleNext} className="p-1.5 hover:bg-white/10 rounded-md transition-colors">
              <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Center/Actions: Filters and View Toggle */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
          <button
            onClick={handleToday}
            className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-[#4A9EFF] hover:bg-[#4A9EFF]/10 rounded-lg transition-colors border border-[#4A9EFF]/30 shrink-0"
          >
            Today
          </button>

          <div className="h-4 w-px bg-white/10 shrink-0 mx-1" />

          {/* View Toggle */}
          <div className="flex items-center bg-[#182433] border border-white/[0.1] rounded-xl p-0.5 shrink-0">
            {(['day', 'week', 'month'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  'px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all',
                  viewMode === mode
                    ? 'bg-[#243047] text-white shadow-lg'
                    : 'text-gray-400 hover:bg-white/[0.08] hover:text-white'
                )}
              >
                {mode}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-white/10 shrink-0 mx-1" />

          {/* New Booking - Always visible as primary action */}
          <button
            onClick={() => window.location.href = '/admin/bookings/new'}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#4A9EFF] hover:bg-[#3A8EEF] text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-colors shadow-lg shadow-[#4A9EFF]/20 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Booking</span>
          </button>

          <button
            onClick={handleExportPDFReport}
            title="Download Formatted Guest Details PDF Sheet"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#233648] hover:bg-[#2a4058] border border-white/[0.1] rounded-xl text-white text-[10px] font-black uppercase tracking-wider transition-all shrink-0 active:scale-95 shadow-sm"
          >
            <FileText className="w-3.5 h-3.5 text-red-400" />
            <span className="hidden sm:inline">PDF Report</span>
          </button>

          <button
            onClick={() => downloadCSV(bookings, 'Bookings_Export')}
            title="Download CSV"
            className="p-1.5 bg-[#182433] border border-white/[0.1] rounded-xl text-gray-400 hover:text-white shrink-0"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>


      {/* === CALENDAR GRID (Desktop) / LIST (Mobile) === */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#101922] relative">
        {/* Desktop: scrollable container for month view */}
        <div className={cn(
          "hidden md:flex flex-col flex-1 min-h-0 overflow-hidden",
          viewMode === 'month' ? "overflow-x-auto" : ""
        )}>
          {/* Min width for month view so columns don't get crushed */}
          <div className={cn(
            "flex flex-col flex-1 min-h-0",
            viewMode === 'month' ? "min-w-[2000px]" : "w-full"
          )}>

        {/* Desktop Header */}
        <div className="flex border-b border-white/[0.07] shrink-0 bg-[#233648]">
          <div className="w-[180px] shrink-0 flex items-center px-4 py-3 border-r border-white/[0.07] sticky left-0 z-20 bg-[#233648]">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Inventory Hub</span>
          </div>
          <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}>
            {days.map((day) => (
              <div
                key={day.toString()}
                className={cn(
                  'py-3 px-1 text-center border-r border-white/[0.07] last:border-r-0',
                  isToday(day) ? 'bg-[#4A9EFF]/5' : '',
                )}
              >
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 mb-1">
                   {viewMode === 'day' ? format(day, 'EEEE') : format(day, 'EEE')}
                </p>
                <p className={cn(
                  'text-[13px] font-black inline-flex w-7 h-7 items-center justify-center rounded-lg transition-all',
                  isToday(day) ? 'bg-[#4A9EFF] text-white shadow-lg' : 'text-white'
                )}>{format(day, 'd')}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Desktop Rows */}
        <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
          {loading ? (
             <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
          ) : filteredRooms.map((room, idx) => {
              const roomBookings = bookings.filter(b => b.room === room.roomNumber)
              const statusCfg = ROOM_STATUS_CONFIG[room.status || 'CLEAN'] || ROOM_STATUS_CONFIG['CLEAN']
              return (
                <div key={room.id} className={cn('flex border-b border-white/[0.05] h-[80px] group transition-colors', idx % 2 === 0 ? 'bg-[#101922]' : 'bg-[#141d28]', 'hover:bg-white/[0.08]')}>
                  <div className="w-[180px] shrink-0 px-4 flex flex-col justify-center border-r border-white/[0.07] gap-1.5 sticky left-0 z-20 bg-inherit group-hover:bg-[#1c2631] transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black text-white">{room.roomNumber}</span>
                      <span className={cn('text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md', statusCfg.cls)}>{statusCfg.label}</span>
                    </div>
                    <span className="text-[10px] font-bold text-gray-500 capitalize tracking-tight">{(room.type || 'standard').replace('_', ' ')}</span>
                  </div>
                  <div className="flex-1 grid relative" style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}>
                    {days.map(day => (
                      <div key={day.toString()} className={cn('border-r border-white/[0.04] last:border-r-0 h-full', isToday(day) ? 'bg-blue-400/[0.02]' : '')} />
                    ))}
                    {roomBookings.map(booking => {
                      if (differenceInDays(booking.startDate, endDate) > 0 || differenceInDays(booking.endDate, startDate) < 0) return null
                      const cfg = getBookingConfig(booking.status, booking.source, booking.notes)
                      return (
                        <div
                          key={booking.id}
                          onClick={() => setSelectedBooking(booking)}
                          className={cn(
                            'absolute top-[10px] bottom-[10px] rounded-xl cursor-pointer transition-all z-10 flex flex-col justify-center overflow-hidden shadow-2xl border-l-[3px]',
                            viewMode === 'month' ? 'px-1.5' : 'px-3',
                            cfg.bar
                          )}
                          style={getBookingStyle(booking)}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <p className={cn(
                              "font-black text-white truncate uppercase tracking-tight",
                              viewMode === 'month' ? "text-[9px]" : "text-[11px]"
                            )}>{booking.guest}</p>
                            {booking.isVip && viewMode !== 'month' && <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />}
                          </div>
                          <p className={cn(
                            'font-black uppercase tracking-widest truncate',
                            viewMode === 'month' ? "text-[7px]" : "text-[9px]",
                            cfg.text
                          )}>
                            {viewMode === 'month' ? `${booking.nights}N` : `${cfg.label} • ${booking.nights}N`}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
          })}
        </div>

          </div>{/* end min-width wrapper */}
        </div>{/* end scrollable container */}

        {/* Mobile View: Vertical Booking List */}
        <div className="md:hidden flex-1 overflow-y-auto min-h-0 custom-scrollbar bg-[#0d1117]">
          {loading ? (
             <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
          ) : bookings.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-64 opacity-30 gap-3">
                <Calendar className="w-12 h-12" />
                <p className="text-sm font-black uppercase tracking-widest">No Bookings this week</p>
             </div>
          ) : (
            <div className="p-4 space-y-4">
               <h3 className="text-[11px] font-black text-gray-500 uppercase tracking-[0.3em] mb-4">Current Week Schedule</h3>
               {bookings.sort((a,b) => a.startDate.getTime() - b.startDate.getTime()).map(booking => {
                 const cfg = getBookingConfig(booking.status, booking.source, booking.notes)
                 return (
                   <div 
                     key={booking.id}
                     onClick={() => setSelectedBooking(booking)}
                     className={cn("p-4 rounded-2xl border transition-all active:scale-[0.98] relative overflow-hidden", cfg.bar)}
                   >
                      <div className="flex items-start justify-between mb-3">
                         <div>
                            <p className="text-[15px] font-black text-white leading-tight mb-1">{booking.guest}</p>
                            <div className="flex items-center gap-2">
                               <span className="text-[10px] font-black text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded border border-blue-400/20">ROOM {booking.room}</span>
                               <span className={cn("text-[10px] font-black uppercase tracking-widest", cfg.text)}>{cfg.label}</span>
                            </div>
                         </div>
                         {booking.isVip && <div className="w-8 h-8 bg-amber-500/10 rounded-full flex items-center justify-center border border-amber-500/20"><Star className="w-4 h-4 text-amber-500 fill-amber-500" /></div>}
                      </div>

                      <div className="grid grid-cols-2 gap-3 bg-black/20 rounded-xl p-3 border border-white/5">
                         <div>
                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Check-in</p>
                            <p className="text-[12px] font-bold text-white">{format(booking.startDate, 'MMM dd, EEE')}</p>
                         </div>
                         <div>
                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Check-out</p>
                            <p className="text-[12px] font-bold text-white">{format(booking.endDate, 'MMM dd, EEE')}</p>
                         </div>
                      </div>
                      
                      <div className="mt-3 flex items-center justify-between">
                         <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{booking.nights} Nights Stay</span>
                         <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{booking.source}</span>
                      </div>
                   </div>
                 )
               })}
            </div>
          )}
        </div>
      </div>

      {/* === LEGEND === */}
      <div className="flex items-center justify-center gap-4 md:gap-8 py-4 px-4 border-t border-white/[0.07] bg-[#233648] shrink-0 flex-wrap">
        {LEGEND.map(item => (
          <div key={item.label} className="flex items-center gap-2">
            <span className={cn('w-2.5 h-2.5 rounded-full shadow-lg shadow-black/20', item.cls)} />
            <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">{item.label}</span>
          </div>
        ))}
      </div>

      {/* === BOOKING DETAIL MODAL === */}
      {selectedBooking && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/70"
            onClick={() => setSelectedBooking(null)}
          />
          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div
              className="w-full max-w-md bg-[#233648] border border-white/[0.1] rounded-2xl shadow-2xl pointer-events-auto animate-fade-in"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start justify-between p-5 border-b border-white/[0.08]">
                <div>
                  <h2 className="text-base font-bold text-white">Booking Details</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Manage reservation for {selectedBooking.guest}</p>
                </div>
                <button
                  onClick={() => setSelectedBooking(null)}
                  className="p-1.5 hover:bg-white/[0.08] rounded-lg transition-colors"
                >
                  <XCircle className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4">
                {(() => {
                  const src = (selectedBooking.source || '').toUpperCase()
                  const isOta = src === 'AIRBNB' || src === 'BOOKING_COM' || src === 'MAKE_MY_TRIP' || src === 'AGODA' || src === 'EXPEDIA' || (src === 'OTHER' && selectedBooking.notes?.includes('[OTA_SOURCE:'))
                  
                  let otaLabel = src
                  if (src === 'OTHER' && selectedBooking.notes) {
                    const match = selectedBooking.notes.match(/\[OTA_SOURCE:\s*([^\n\r\]]+)\]/)
                    if (match) otaLabel = match[1].toUpperCase()
                  }

                  if (isOta) {
                    return (
                      <div className="bg-purple-500/10 border border-purple-500/20 text-purple-400 p-3 rounded-xl flex items-center gap-2 text-xs font-semibold">
                        <span>🔒 Synced from {otaLabel} (Modifications Locked)</span>
                      </div>
                    )
                  }
                  return null
                })()}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-[#182433] rounded-xl">
                    <p className="text-[9px] text-gray-500 uppercase font-bold mb-1">Guest</p>
                    <p className="text-sm font-semibold text-white">{selectedBooking.guest}</p>
                  </div>
                  <div className="p-3 bg-[#182433] rounded-xl">
                    <p className="text-[9px] text-gray-500 uppercase font-bold mb-1">Room</p>
                    <p className="text-sm font-semibold text-white">{selectedBooking.room}</p>
                  </div>
                  <div className="p-3 bg-[#182433] rounded-xl">
                    <p className="text-[9px] text-gray-500 uppercase font-bold mb-1">Check-In</p>
                    <p className="text-sm font-semibold text-white">{format(selectedBooking.startDate, 'MMM d, yyyy')}</p>
                  </div>
                  <div className="p-3 bg-[#182433] rounded-xl">
                    <p className="text-[9px] text-gray-500 uppercase font-bold mb-1">Check-Out</p>
                    <p className="text-sm font-semibold text-white">{format(selectedBooking.endDate, 'MMM d, yyyy')}</p>
                  </div>
                  <div className="p-3 bg-[#182433] rounded-xl">
                    <p className="text-[9px] text-gray-500 uppercase font-bold mb-1">Nights</p>
                    <p className="text-sm font-semibold text-white">{selectedBooking.nights}</p>
                  </div>
                  <div className="p-3 bg-[#182433] rounded-xl">
                    <p className="text-[9px] text-gray-500 uppercase font-bold mb-1">Status</p>
                    <span className={cn(
                      'text-xs font-bold uppercase',
                      getBookingConfig(selectedBooking.status, selectedBooking.source, selectedBooking.notes).text
                    )}>
                      {getBookingConfig(selectedBooking.status, selectedBooking.source, selectedBooking.notes).label}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  {selectedBooking.status === 'RESERVED' && (
                    <button
                      disabled={isUpdating}
                      onClick={() => handleUpdateStatus('CHECK_IN')}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#1db954] hover:bg-[#17a349] text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {isUpdating ? 'Updating...' : 'Check In Guest'}
                    </button>
                  )}
                  {selectedBooking.status === 'CHECKED_IN' && (
                    <button
                      disabled={isUpdating}
                      onClick={() => {
                        const total = selectedBooking.finalAmount ?? selectedBooking.totalAmount ?? 0
                        const rem = Math.max(0, total - (selectedBooking.paidAmount ?? 0))
                        setCheckoutPaidAmount(rem > 0 ? rem.toString() : total.toString())
                        setCheckoutPaymentMethod('CASH')
                        setCheckoutNotes('')
                        setShowCheckoutModal(true)
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#4A9EFF] hover:bg-[#3A8EEF] text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 shadow-lg shadow-[#4A9EFF]/20"
                    >
                      <LogOut className="w-4 h-4" />
                      Check Out & Clear Payment
                    </button>
                  )}
                  {selectedBooking.status !== 'CHECKED_OUT' && selectedBooking.status !== 'CANCELLED' && (
                    <button
                      disabled={isUpdating}
                      onClick={() => handleUpdateStatus('CANCEL')}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#1a1f2e] hover:bg-[#3d0d0d] text-[#fc8181] hover:text-white text-sm font-semibold rounded-xl border border-[#e53e3e]/30 transition-colors disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      Cancel Booking
                    </button>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setShowUpgradeModal(true)}
                      className="flex items-center justify-center gap-2 py-2.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-bold rounded-xl border border-blue-500/20 transition-all"
                    >
                      Request Upgrade
                    </button>
                    <button
                      onClick={() => setShowExtendModal(true)}
                      className="flex items-center justify-center gap-2 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-xl border border-emerald-500/20 transition-all"
                    >
                      Request Extension
                    </button>
                    <button
                      onClick={() => {
                        setEditMealPlanType(selectedBooking.mealPlan || 'EP')
                        setEditMealPlanRate(selectedBooking.mealPlanPricePerDay || (selectedBooking.mealPlan === 'CP' ? 500 : selectedBooking.mealPlan === 'MAP' ? 1200 : selectedBooking.mealPlan === 'AP' ? 1800 : 0))
                        setEditExtraAddons(Array.isArray(selectedBooking.extraAddons) ? selectedBooking.extraAddons : [
                          { id: 'extra_bed', name: 'Extra Bed', price: 500, qty: 0 },
                          { id: 'extra_mattress', name: 'Extra Mattress', price: 300, qty: 0 },
                        ])
                        setShowMealPlanModal(true)
                      }}
                      className="col-span-2 flex items-center justify-center gap-2 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-bold rounded-xl border border-amber-500/20 transition-all cursor-pointer"
                    >
                      <UtensilsCrossed className="w-4 h-4" />
                      Edit Meal Plan (EP/CP/MAP/AP) & Add-ons
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Upgrade Modal */}
      {showUpgradeModal && selectedBooking && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowUpgradeModal(false)} />
          <div className="relative w-full max-w-sm bg-[#233648] border border-white/[0.1] rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-white/[0.08]">
              <h3 className="text-lg font-bold text-white">Room Upgrade</h3>
              <p className="text-xs text-gray-400 mt-1">Select a premium room for {selectedBooking.guest}</p>
            </div>
            <div className="p-4 max-h-[400px] overflow-y-auto space-y-3 custom-scrollbar">
              {availableUpgrades.length === 0 ? (
                <div className="text-center py-8 opacity-40">
                  <p className="text-xs font-bold uppercase tracking-widest">No premium rooms available</p>
                </div>
              ) : availableUpgrades.map(room => (
                <button
                  key={room.id}
                  onClick={() => handleRequestUpgrade(room.id, (room.basePrice - rooms.find(r => r.roomNumber === selectedBooking.room)?.basePrice || 0) * selectedBooking.nights)}
                  className="w-full p-4 bg-[#182433] hover:bg-[#1c2a3c] border border-white/[0.05] rounded-2xl flex items-center justify-between group transition-all"
                >
                  <div className="text-left">
                    <p className="text-sm font-black text-white">Room {room.roomNumber}</p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{room.type}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-emerald-400">+{formatCurrency(room.basePrice - (rooms.find(r => r.roomNumber === selectedBooking.room)?.basePrice || 0))}/night</p>
                    <p className="text-[9px] text-gray-500">Upgrade Total: +{formatCurrency((room.basePrice - (rooms.find(r => r.roomNumber === selectedBooking.room)?.basePrice || 0)) * selectedBooking.nights)}</p>
                  </div>
                </button>
              ))}
            </div>
            <div className="p-4 bg-black/20">
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="w-full py-3 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] hover:text-white transition-colors"
              >
                Cancel Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extension Modal */}
      {showExtendModal && selectedBooking && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowExtendModal(false)} />
          <div className="relative w-full max-w-sm bg-[#233648] border border-white/[0.1] rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-white/[0.08]">
              <h3 className="text-lg font-bold text-white">Extend Stay</h3>
              <p className="text-xs text-gray-400 mt-1">Request additional nights for {selectedBooking.guest}</p>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between gap-4">
                <button 
                  onClick={() => setExtensionDays(Math.max(1, extensionDays - 1))}
                  className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-xl font-bold hover:bg-white/10"
                >-</button>
                <div className="text-center">
                  <p className="text-3xl font-black text-white">{extensionDays}</p>
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Nights</p>
                </div>
                <button 
                  onClick={() => setExtensionDays(extensionDays + 1)}
                  className="w-12 h-12 rounded-2xl bg-[#4A9EFF]/10 border border-[#4A9EFF]/20 flex items-center justify-center text-xl font-bold text-[#4A9EFF] hover:bg-[#4A9EFF]/20"
                >+</button>
              </div>

              <div className="p-4 bg-black/20 rounded-2xl border border-white/5">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">New Check-out</p>
                  <p className="text-sm font-bold text-white">{format(addDays(selectedBooking.endDate, extensionDays), 'EEE, MMM dd')}</p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Extension Cost</p>
                  <p className="text-sm font-bold text-emerald-400">+{formatCurrency(extensionDays * (rooms.find(r => r.roomNumber === selectedBooking.room)?.basePrice || 0))}</p>
                </div>
              </div>

              <button
                disabled={requestLoading}
                onClick={() => handleRequestExtension(extensionDays * (rooms.find(r => r.roomNumber === selectedBooking.room)?.basePrice || 0))}
                className="w-full py-4 bg-[#4A9EFF] hover:bg-[#3A8EEF] text-white text-sm font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-[#4A9EFF]/20 disabled:opacity-50"
              >
                {requestLoading ? 'Submitting...' : 'Submit Extension Request'}
              </button>
            </div>
            <button
              onClick={() => setShowExtendModal(false)}
              className="w-full py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] hover:text-white transition-colors bg-black/20"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Edit Meal Plan & Add-ons Modal */}
      {showMealPlanModal && selectedBooking && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowMealPlanModal(false)} />
          <div className="relative w-full max-w-lg bg-[#182433] border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <UtensilsCrossed className="w-5 h-5 text-amber-400" /> Edit Meal Plan & Add-ons
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">Guest: <span className="text-white font-bold">{selectedBooking.guest?.name || selectedBooking.guest}</span> (Room {selectedBooking.room?.roomNumber || selectedBooking.room})</p>
              </div>
              <button onClick={() => setShowMealPlanModal(false)} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
              {/* Meal Plan Select */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Select Meal Plan</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { type: 'EP', label: 'EP', desc: 'Room Only', price: 0 },
                    { type: 'CP', label: 'CP', desc: 'Breakfast Included', price: 500 },
                    { type: 'MAP', label: 'MAP', desc: 'Breakfast + Dinner', price: 1200 },
                    { type: 'AP', label: 'AP', desc: 'All 3 Meals', price: 1800 },
                  ].map(plan => (
                    <button
                      key={plan.type}
                      type="button"
                      onClick={() => {
                        setEditMealPlanType(plan.type)
                        setEditMealPlanRate(plan.price)
                      }}
                      className={cn(
                        "p-3 rounded-xl border text-left transition-all cursor-pointer",
                        editMealPlanType === plan.type
                          ? "bg-amber-500/15 border-amber-500 text-white shadow-lg shadow-amber-500/10"
                          : "bg-black/30 border-white/5 text-gray-400 hover:border-white/10"
                      )}
                    >
                      <div className="flex items-center justify-between font-bold text-xs">
                        <span className="text-white">{plan.label}</span>
                        <span className="text-amber-400 font-mono">{plan.price > 0 ? `₹${plan.price}/d` : 'Free'}</span>
                      </div>
                      <p className="text-[9px] text-gray-500 truncate mt-0.5">{plan.desc}</p>
                    </button>
                  ))}
                </div>

                {editMealPlanType !== 'EP' && (
                  <div className="p-3 bg-black/40 border border-white/10 rounded-xl flex items-center justify-between text-xs mt-2">
                    <span className="text-gray-400 font-medium">Per-day Rate (₹/guest):</span>
                    <div className="flex items-center gap-1 bg-black/60 border border-white/15 rounded-lg px-2 py-1">
                      <span className="text-amber-400 font-bold">₹</span>
                      <input
                        type="number"
                        min="0"
                        value={editMealPlanRate}
                        onChange={(e) => setEditMealPlanRate(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-20 bg-transparent text-right font-mono font-bold text-white outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Extra Requests & Add-ons */}
              <div className="space-y-3 pt-3 border-t border-white/10">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Extra Requests & Add-ons (Extra Bed, Mattress, etc.)</label>
                <div className="space-y-2">
                  {editExtraAddons.map((item: any, idx: number) => (
                    <div key={idx} className="p-3 bg-black/30 border border-white/5 rounded-xl flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-white truncate">{item.name}</p>
                        <div className="flex items-center gap-1 mt-1 text-[10px]">
                          <span className="text-gray-500">Rate: ₹</span>
                          <input
                            type="number"
                            min="0"
                            value={item.price}
                            onChange={(e) => {
                              const p = Math.max(0, parseFloat(e.target.value) || 0)
                              setEditExtraAddons((prev: any[]) => prev.map((a, i) => i === idx ? { ...a, price: p } : a))
                            }}
                            className="w-16 bg-black/60 border border-white/10 rounded px-1.5 py-0.5 text-right font-mono text-white text-[10px]"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 bg-black/60 border border-white/10 rounded-lg p-1">
                        <button
                          type="button"
                          onClick={() => setEditExtraAddons((prev: any[]) => prev.map((a, i) => i === idx ? { ...a, qty: Math.max(0, a.qty - 1) } : a))}
                          className="w-5 h-5 rounded bg-white/5 text-white font-bold text-xs flex items-center justify-center hover:bg-white/10"
                        >-</button>
                        <span className="text-xs font-bold text-white w-4 text-center">{item.qty}</span>
                        <button
                          type="button"
                          onClick={() => setEditExtraAddons((prev: any[]) => prev.map((a, i) => i === idx ? { ...a, qty: a.qty + 1 } : a))}
                          className="w-5 h-5 rounded bg-amber-500/20 text-amber-400 font-bold text-xs flex items-center justify-center hover:bg-amber-500/30"
                        >+</button>
                      </div>
                    </div>
                  ))}

                  {/* Add Custom Add-on */}
                  <div className="p-3 bg-black/20 border border-dashed border-white/10 rounded-xl space-y-2">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Add Custom Add-on / Fee</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Item Name (e.g. Extra Bed)"
                        value={newAddonName}
                        onChange={(e) => setNewAddonName(e.target.value)}
                        className="flex-1 bg-black/60 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                      />
                      <input
                        type="number"
                        placeholder="₹ Rate"
                        value={newAddonPrice}
                        onChange={(e) => setNewAddonPrice(e.target.value)}
                        className="w-20 bg-black/60 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!newAddonName) return toast.error("Enter item name")
                          const price = parseFloat(newAddonPrice) || 0
                          setEditExtraAddons((prev: any[]) => [...prev, { id: `addon_${Date.now()}`, name: newAddonName, price, qty: 1 }])
                          setNewAddonName('')
                          setNewAddonPrice('')
                        }}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs rounded-lg transition-all"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-black/30 border-t border-white/10 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowMealPlanModal(false)}
                className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isUpdating}
                onClick={handleSaveMealPlanAndAddons}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs rounded-xl shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === INVOICE MODAL === */}
      {/* CHECKOUT PAYMENT & CLEARANCE MODAL */}
      {showCheckoutModal && selectedBooking && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#101822] border border-white/10 rounded-3xl w-full max-w-lg p-6 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-[#4A9EFF]" />
                  Check-Out & Payment Settlement
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">Guest: <span className="text-white font-bold">{selectedBooking.guest?.name || selectedBooking.guest}</span> (Room {selectedBooking.room?.roomNumber || selectedBooking.room})</p>
              </div>
              <button onClick={() => setShowCheckoutModal(false)} className="p-1.5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Financial Summary Box */}
            <div className="grid grid-cols-3 gap-3 bg-black/40 p-4 rounded-2xl border border-white/5 text-center">
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Total Invoice</p>
                <p className="text-sm font-bold text-white mt-0.5">₹{(selectedBooking.finalAmount ?? selectedBooking.totalAmount ?? 0).toLocaleString('en-IN')}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Already Paid</p>
                <p className="text-sm font-bold text-emerald-400 mt-0.5">₹{(selectedBooking.paidAmount ?? 0).toLocaleString('en-IN')}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Outstanding</p>
                <p className="text-sm font-bold text-[#4A9EFF] mt-0.5">
                  ₹{Math.max(0, (selectedBooking.finalAmount ?? selectedBooking.totalAmount ?? 0) - (selectedBooking.paidAmount ?? 0)).toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Select Payment Mode</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: 'CASH', label: 'Cash', icon: Banknote, color: 'text-emerald-400 border-emerald-500/30' },
                  { id: 'CARD', label: 'Credit / Debit Card', icon: CreditCard, color: 'text-blue-400 border-blue-500/30' },
                  { id: 'ONLINE', label: 'Online / UPI', icon: Smartphone, color: 'text-purple-400 border-purple-500/30' },
                  { id: 'CORPORATE_CLEARANCE', label: 'Corporate Clearance', icon: Building2, color: 'text-amber-400 border-amber-500/30' },
                  { id: 'OTHER', label: 'Other', icon: HelpCircle, color: 'text-gray-400 border-gray-500/30' },
                ].map(m => {
                  const Icon = m.icon
                  const isSel = checkoutPaymentMethod === m.id
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setCheckoutPaymentMethod(m.id as any)}
                      className={cn(
                        "p-3 rounded-2xl border text-left flex flex-col justify-between gap-2 transition-all",
                        isSel
                          ? "bg-[#4A9EFF]/15 border-[#4A9EFF] ring-1 ring-[#4A9EFF]"
                          : "bg-black/20 border-white/5 hover:border-white/20 text-gray-400"
                      )}
                    >
                      <div className="flex items-center justify-between w-full">
                        <Icon className={cn("w-4 h-4", isSel ? "text-[#4A9EFF]" : m.color)} />
                        {isSel && <CheckCircle2 className="w-3.5 h-3.5 text-[#4A9EFF]" />}
                      </div>
                      <span className={cn("text-xs font-bold truncate", isSel ? "text-white" : "text-gray-300")}>
                        {m.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Amount Being Cleared / Settled */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Amount Cleared / Settled (₹)</label>
              <input
                type="number"
                value={checkoutPaidAmount}
                onChange={e => setCheckoutPaidAmount(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white font-mono font-bold text-base outline-none focus:border-[#4A9EFF]"
                placeholder="Enter amount"
              />
            </div>

            {/* Corporate Reference / Transaction Notes */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                {checkoutPaymentMethod === 'CORPORATE_CLEARANCE' ? 'Corporate Company Name / PO Number' : 'Payment Reference / Transaction Notes'}
              </label>
              <input
                type="text"
                value={checkoutNotes}
                onChange={e => setCheckoutNotes(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white text-xs font-semibold outline-none focus:border-[#4A9EFF]"
                placeholder={checkoutPaymentMethod === 'CORPORATE_CLEARANCE' ? 'e.g. Infosys Ltd - PO #8849 / Billing Ref' : 'e.g. HDFC Card Slip #4410 or UPI Ref ID'}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCheckoutModal(false)}
                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-gray-300 font-bold rounded-2xl text-xs uppercase tracking-wider transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isUpdating}
                onClick={handleConfirmCheckoutPayment}
                className="flex-1 py-3 bg-[#4A9EFF] hover:bg-[#3A8EEF] text-white font-bold rounded-2xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-[#4A9EFF]/20 active:scale-95 flex items-center justify-center gap-2"
              >
                {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Check-Out & Invoice</span> <ArrowRight className="w-4 h-4 stroke-[2.5]" /></>}
              </button>
            </div>
          </div>
        </div>
      )}

      {showInvoice && invoiceData && (
        <InvoiceModal
          booking={invoiceData}
          onClose={() => { setShowInvoice(false); setInvoiceData(null) }}
        />
      )}
    </div>
  )
}

// ─── Invoice Modal ────────────────────────────────────────────────────────────
function InvoiceModal({ booking, onClose }: { booking: any; onClose: () => void }) {
  const [hotelGstNumber, setHotelGstNumber] = useState<string>('')

  useEffect(() => {
    fetch('/api/admin/settings/financial')
      .then(res => res.json())
      .then(j => {
        if (j.data?.gstNumber) setHotelGstNumber(j.data.gstNumber)
      })
      .catch(() => {})
  }, [])

  const nights = differenceInDays(
    new Date(booking.checkOut),
    new Date(booking.checkIn)
  ) || 1

  const base       = booking.baseAmount       ?? booking.totalAmount ?? 0
  const gstAmt     = booking.gstAmount        ?? 0
  const scAmt      = booking.serviceChargeAmount ?? 0
  const ltAmt      = booking.luxuryTaxAmount  ?? 0
  const discAmt    = booking.discountAmount   ?? 0
  const finalAmt   = booking.finalAmount      ?? booking.totalAmount ?? 0
  const gstPct     = booking.gstPercent       ?? 0
  const scPct      = booking.serviceChargePercent ?? 0
  const ltPct      = booking.luxuryTaxPercent ?? 0
  const discPct    = booking.discountPercent  ?? 0
  const invoiceNo  = `INV-${booking.id?.slice(-6).toUpperCase() ?? '000000'}`
  const hotelName  = booking.property?.name ?? 'Hotel'
  const guestName  = booking.guest?.name ?? 'Guest'
  const guestGst   = booking.guestGstNumber || booking.guest?.gstNumber || ''
  const roomNo     = booking.room?.roomNumber ?? '—'
  const roomType   = booking.room?.type ?? ''

  const handleDownloadPDF = async () => {
    const toastId = toast.loading('Generating luxury PDF voucher...')
    try {
      await generateBookingPDFVoucher({
        id: booking.id,
        bookingNumber: invoiceNo,
        guestName: guestName,
        guestEmail: booking.guest?.email || '',
        guestPhone: booking.guest?.phone || '',
        roomType: roomType || 'Luxury Suite',
        roomNumber: String(roomNo),
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        nightsCount: nights,
        guestsCount: booking.numberOfGuests || 1,
        totalPrice: finalAmt,
        paymentStatus: booking.paymentStatus || 'PAID',
        status: booking.status,
        specialRequests: booking.specialRequests,
        createdAt: booking.createdAt,
      }, {
        name: hotelName,
        address: booking.property?.address || 'Main Hotel Boulevard',
        city: booking.property?.city || 'India',
        phone: booking.property?.phone || '',
        email: booking.property?.email || '',
        logo: booking.property?.logo || null,
        coverImage: booking.room?.images?.[0] || booking.property?.images?.[0] || booking.property?.coverImage || null,
      })
      toast.success('PDF Voucher downloaded successfully!', { id: toastId })
    } catch (err) {
      console.error('PDF generation error:', err)
      toast.error('Failed to generate PDF voucher', { id: toastId })
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="w-full max-w-lg bg-white text-slate-900 rounded-3xl shadow-2xl pointer-events-auto overflow-hidden max-h-[90vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
          {/* Invoice Header */}
          <div className="bg-[#C26A2C] px-6 py-6 text-white">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight">{hotelName}</h2>
                <p className="text-[#F2C4A7] text-xs mt-0.5">Guest Invoice · Checkout Receipt</p>
                {hotelGstNumber && (
                  <span className="inline-block mt-1.5 px-2 py-0.5 bg-white/20 backdrop-blur-md rounded text-[10px] font-mono font-bold tracking-wider text-white">
                    GSTIN: {hotelGstNumber}
                  </span>
                )}
              </div>
              <div className="text-right">
                <p className="text-[#E8A375] text-[10px] uppercase tracking-wider">{guestGst ? 'B2B TAX INVOICE' : 'Invoice No.'}</p>
                <p className="text-base font-mono font-bold">{invoiceNo}</p>
                <p className="text-[#F2C4A7] text-[10px] mt-1">{format(new Date(), 'dd MMM yyyy')}</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Guest + Stay Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-bold text-[#C26A2C] uppercase tracking-widest border-b border-[#C26A2C]/20 pb-1 mb-2">Guest & Tax Info</p>
                {[
                  ['Name',          guestName],
                  ['Room',          `${roomNo}${roomType ? ' · ' + roomType : ''}`],
                  ['Guest GSTIN',   guestGst || 'B2C / Retail'],
                  ['Payment Mode',  booking.paymentMethod === 'CORPORATE_CLEARANCE' ? 'Corporate Clearance' : booking.paymentMethod === 'CARD' ? 'Credit / Debit Card' : booking.paymentMethod === 'ONLINE' ? 'Online / UPI' : booking.paymentMethod === 'CASH' ? 'Cash Payment' : (booking.paymentMethod || 'Direct Settlement')],
                  ...(booking.notes ? [['Payment Notes', booking.notes]] : []),
                ].map(([l, v]) => (
                  <div key={l} className="flex justify-between text-xs mb-1.5 gap-2">
                    <span className="text-slate-400 shrink-0">{l}</span>
                    <span className={cn("font-semibold text-right", l === 'Guest GSTIN' && guestGst ? 'text-blue-600 font-mono font-bold' : l === 'Payment Mode' ? 'text-[#C26A2C] font-bold uppercase' : 'text-slate-800')}>{v}</span>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-[10px] font-bold text-[#C26A2C] uppercase tracking-widest border-b border-[#C26A2C]/20 pb-1 mb-2">Stay</p>
                {[
                  ['Check-in',  format(new Date(booking.checkIn),  'dd MMM yyyy')],
                  ['Check-out', format(new Date(booking.checkOut), 'dd MMM yyyy')],
                  ['Nights',    String(nights)],
                ].map(([l, v]) => (
                  <div key={l} className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-400">{l}</span>
                    <span className="font-semibold text-slate-800">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Charges Table */}
            <div className="border border-slate-100 rounded-2xl overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[#C26A2C] text-white">
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest">Description</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="bg-white">
                    <td className="px-4 py-3 text-sm text-slate-700">
                      Room Charges
                      <span className="text-xs text-slate-400 ml-1">({nights} night{nights > 1 ? 's' : ''} × ₹{(base / nights).toFixed(0)})</span>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono font-bold text-slate-800 text-right">₹{base.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  {gstAmt > 0 && (
                    <tr className="bg-slate-50/50">
                      <td className="px-4 py-3 text-sm text-slate-700">GST ({gstPct}%)</td>
                      <td className="px-4 py-3 text-sm font-mono font-bold text-slate-800 text-right">₹{gstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  )}
                  {scAmt > 0 && (
                    <tr className="bg-white">
                      <td className="px-4 py-3 text-sm text-slate-700">Service Charge ({scPct}%)</td>
                      <td className="px-4 py-3 text-sm font-mono font-bold text-slate-800 text-right">₹{scAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  )}
                  {ltAmt > 0 && (
                    <tr className="bg-slate-50/50">
                      <td className="px-4 py-3 text-sm text-slate-700">Luxury Tax ({ltPct}%)</td>
                      <td className="px-4 py-3 text-sm font-mono font-bold text-slate-800 text-right">₹{ltAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  )}
                  {discAmt > 0 && (
                    <tr className="bg-red-50/40">
                      <td className="px-4 py-3 text-sm text-slate-700">Discount ({discPct}%)</td>
                      <td className="px-4 py-3 text-sm font-mono font-bold text-red-500 text-right">-₹{discAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  )}
                  <tr className="bg-[#C26A2C]">
                    <td className="px-4 py-4 text-sm font-black text-white uppercase tracking-wide">Total Amount</td>
                    <td className="px-4 py-4 text-xl font-mono font-black text-white text-right">₹{finalAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Footer note */}
            <p className="text-[10px] text-slate-400 text-center">
              Thank you for staying with us. We hope to see you again!
            </p>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleDownloadPDF}
                className="flex-1 flex items-center justify-center gap-2 h-11 bg-[#C26A2C] hover:bg-[#A85822] text-white text-sm font-bold rounded-2xl transition-all active:scale-95"
              >
                <Download className="w-4 h-4" /> Download PDF
              </button>
              <button
                onClick={() => window.print()}
                className="h-11 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-2xl transition-all active:scale-95 flex items-center gap-2"
              >
                <Printer className="w-4 h-4" /> Print
              </button>
              <button
                onClick={onClose}
                className="h-11 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-2xl transition-all active:scale-95"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

