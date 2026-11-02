'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { startOfWeek, addDays, format, differenceInDays, isToday } from 'date-fns'
import { ChevronLeft, ChevronRight, Plus, Star, Download, Loader2, Calendar, FileText, Printer, Banknote, CreditCard, Smartphone, Building2, HelpCircle, X, ArrowRight, UtensilsCrossed, Edit2, Clock } from 'lucide-react'
import { cn, validateGSTIN, formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { CheckCircle2, LogOut, XCircle, Layers, AlertCircle, QrCode } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { downloadCSV } from '@/lib/csv'
import { generateGuestDetailsPDFReport, GuestDetailsReportBooking } from '@/lib/guest-details-pdf'
import { InvoiceModal } from '@/components/admin/InvoiceModal'
import { generateTaxInvoicePDF, TaxInvoiceItem } from '@/lib/invoice-pdf-generator'
import { buildContextUrl } from '@/lib/admin-context'

// ---- Color/status helpers ----
const STATUS_CONFIG: Record<string, { bar: string; label: string; dot: string; text: string }> = {
  RESERVED: { 
    bar: 'bg-gradient-to-r from-blue-600 to-indigo-600 border border-blue-400/50 border-l-[4px] border-l-blue-300 text-white shadow-lg shadow-blue-950/50', 
    label: 'RESERVED', 
    dot: 'bg-blue-400', 
    text: 'text-blue-100' 
  },
  CHECKED_IN: { 
    bar: 'bg-gradient-to-r from-emerald-600 to-teal-600 border border-emerald-400/50 border-l-[4px] border-l-emerald-300 text-white shadow-lg shadow-emerald-950/50', 
    label: 'CHECKED-IN', 
    dot: 'bg-emerald-400', 
    text: 'text-emerald-100' 
  },
  CHECKED_OUT: { 
    bar: 'bg-gradient-to-r from-slate-700 to-zinc-700 border border-slate-500/50 border-l-[4px] border-l-slate-400 text-slate-100 shadow-md shadow-black/40', 
    label: 'CHECKED-OUT', 
    dot: 'bg-slate-400', 
    text: 'text-slate-300' 
  },
  CANCELLED: { 
    bar: 'bg-gradient-to-r from-rose-900 to-red-950 border border-rose-700/50 border-l-[4px] border-l-rose-500 text-rose-200 line-through opacity-70 shadow-md shadow-black/30', 
    label: 'CANCELLED', 
    dot: 'bg-rose-500', 
    text: 'text-rose-300' 
  },
  AIRBNB: { 
    bar: 'bg-gradient-to-r from-[#FF385C] to-[#E0294C] border border-rose-300/50 border-l-[4px] border-l-white text-white shadow-lg shadow-rose-950/50', 
    label: 'AIRBNB', 
    dot: 'bg-[#FF385C]', 
    text: 'text-rose-100' 
  },
  BOOKING_COM: { 
    bar: 'bg-gradient-to-r from-[#003580] to-[#0055b8] border border-blue-400/50 border-l-[4px] border-l-[#006ce4] text-white shadow-lg shadow-blue-950/50', 
    label: 'BOOKING.COM', 
    dot: 'bg-[#003580]', 
    text: 'text-blue-100' 
  },
  MAKE_MY_TRIP: { 
    bar: 'bg-gradient-to-r from-[#E41D34] to-[#C71125] border border-red-300/50 border-l-[4px] border-l-red-200 text-white shadow-lg shadow-red-950/50', 
    label: 'MAKEMYTRIP', 
    dot: 'bg-[#E41D34]', 
    text: 'text-red-100' 
  },
  AGODA: { 
    bar: 'bg-gradient-to-r from-[#7B1FA2] to-[#5B1080] border border-purple-300/50 border-l-[4px] border-l-purple-200 text-white shadow-lg shadow-purple-950/50', 
    label: 'AGODA', 
    dot: 'bg-[#7B1FA2]', 
    text: 'text-purple-100' 
  },
  GOIBIBO: { 
    bar: 'bg-gradient-to-r from-[#F26722] to-[#D65111] border border-orange-300/50 border-l-[4px] border-l-orange-200 text-white shadow-lg shadow-orange-950/50', 
    label: 'GOIBIBO', 
    dot: 'bg-[#F26722]', 
    text: 'text-orange-100' 
  },
  EXPEDIA: { 
    bar: 'bg-gradient-to-r from-[#D99B00] to-[#B37F00] border border-amber-300/60 border-l-[4px] border-l-amber-200 text-white shadow-lg shadow-amber-950/50', 
    label: 'EXPEDIA', 
    dot: 'bg-[#D99B00]', 
    text: 'text-amber-100' 
  },
  EASEMYTRIP: { 
    bar: 'bg-gradient-to-r from-[#0284c7] to-[#0369a1] border border-sky-300/50 border-l-[4px] border-l-sky-200 text-white shadow-lg shadow-sky-950/50', 
    label: 'EASEMYTRIP', 
    dot: 'bg-[#0284c7]', 
    text: 'text-sky-100' 
  },
  YATRA: { 
    bar: 'bg-gradient-to-r from-[#B91C1C] to-[#991B1B] border border-red-300/50 border-l-[4px] border-l-red-200 text-white shadow-lg shadow-red-950/50', 
    label: 'YATRA', 
    dot: 'bg-[#B91C1C]', 
    text: 'text-red-100' 
  },
  IXIGO: { 
    bar: 'bg-gradient-to-r from-[#EA580C] to-[#C2410C] border border-orange-300/50 border-l-[4px] border-l-orange-200 text-white shadow-lg shadow-orange-950/50', 
    label: 'IXIGO', 
    dot: 'bg-[#EA580C]', 
    text: 'text-orange-100' 
  },
  TRIVAGO: { 
    bar: 'bg-gradient-to-r from-[#0284c7] to-[#0f766e] border border-cyan-300/50 border-l-[4px] border-l-cyan-200 text-white shadow-lg shadow-cyan-950/50', 
    label: 'TRIVAGO', 
    dot: 'bg-[#0284c7]', 
    text: 'text-cyan-100' 
  },
  DIRECT: { 
    bar: 'bg-gradient-to-r from-blue-600 to-cyan-600 border border-cyan-400/50 border-l-[4px] border-l-cyan-300 text-white shadow-lg shadow-blue-950/50', 
    label: 'DIRECT', 
    dot: 'bg-cyan-400', 
    text: 'text-cyan-100' 
  },
  WALK_IN: { 
    bar: 'bg-gradient-to-r from-teal-600 to-emerald-600 border border-teal-400/50 border-l-[4px] border-l-teal-300 text-white shadow-lg shadow-teal-950/50', 
    label: 'WALK-IN', 
    dot: 'bg-teal-400', 
    text: 'text-teal-100' 
  },
  OTHER: { 
    bar: 'bg-gradient-to-r from-violet-600 to-purple-700 border border-violet-400/50 border-l-[4px] border-l-violet-300 text-white shadow-lg shadow-purple-950/50', 
    label: 'OTHER', 
    dot: 'bg-violet-400', 
    text: 'text-violet-100' 
  }
}

function getBookingConfig(status: string, source: string, notes: string | null) {
  if (status === 'CANCELLED') return STATUS_CONFIG['CANCELLED']
  if (status === 'CHECKED_OUT') return STATUS_CONFIG['CHECKED_OUT']
  if (status === 'CHECKED_IN') return STATUS_CONFIG['CHECKED_IN']
  
  const cleanSource = (source || '').toUpperCase().trim()
  let finalSource = cleanSource

  if (cleanSource === 'OTHER' && notes) {
    const match = notes.match(/\[OTA_SOURCE:\s*([^\n\r\]]+)\]/)
    if (match) {
      finalSource = match[1].toUpperCase().trim()
    }
  }

  return STATUS_CONFIG[finalSource] || STATUS_CONFIG[status] || STATUS_CONFIG['DIRECT'] || STATUS_CONFIG['RESERVED']
}

const ROOM_STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  CLEAN: { label: 'Clean', cls: 'bg-background text-[#4ade80] border border-[#1db954]/30' },
  DIRTY: { label: 'Dirty', cls: 'bg-surface text-[#fc8181] border border-[#e53e3e]/30' },
  INSPECT: { label: 'Inspect', cls: 'bg-surface text-[#fbbf24] border border-[#f59e0b]/30' } }

const LEGEND = [
  { label: 'Reserved', cls: 'bg-gradient-to-r from-blue-600 to-indigo-600' },
  { label: 'Checked-in', cls: 'bg-gradient-to-r from-emerald-600 to-teal-600' },
  { label: 'Checked-out', cls: 'bg-gradient-to-r from-slate-700 to-zinc-700' },
  { label: 'Cancelled', cls: 'bg-gradient-to-r from-rose-900 to-red-950' },
  { label: 'Direct / Walk-in', cls: 'bg-gradient-to-r from-blue-600 to-cyan-600' },
  { label: 'OTA Channels', cls: 'bg-gradient-to-r from-[#FF385C] to-[#7B1FA2]' },
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
  const [hoveredBookingCard, setHoveredBookingCard] = useState<{ booking: any; room: any; rect: DOMRect } | null>(null)
  const [extensionDays, setExtensionDays] = useState(1)
  const [requestLoading, setRequestLoading] = useState(false)

  // Checkout & Payment Modal State
  const [showCheckoutModal, setShowCheckoutModal] = useState(false)
  const [checkoutPaymentMethod, setCheckoutPaymentMethod] = useState<'CASH' | 'CARD' | 'ONLINE' | 'SPLIT' | 'CORPORATE_CLEARANCE' | 'OTHER'>('CASH')
  const [checkoutPaidAmount, setCheckoutPaidAmount] = useState<string>('')
  const [bSplitCash, setBSplitCash] = useState<string>('')
  const [bSplitCard, setBSplitCard] = useState<string>('')
  const [bSplitUpi, setBSplitUpi] = useState<string>('')
  const [checkoutNotes, setCheckoutNotes] = useState<string>('')
  const [checkoutPosOrders, setCheckoutPosOrders] = useState<any[]>([])
  const [checkoutPosLoading, setCheckoutPosLoading] = useState(false)
  const [checkoutExtraCharge, setCheckoutExtraCharge] = useState<string>('')
  const [checkoutExtraChargeLabel, setCheckoutExtraChargeLabel] = useState<string>('')
  const [checkoutDiscount, setCheckoutDiscount] = useState<string>('')
  const [checkoutDiscountLabel, setCheckoutDiscountLabel] = useState<string>('')
  const [checkoutGuestGst, setCheckoutGuestGst] = useState<string>('')
  const [checkoutCompanyName, setCheckoutCompanyName] = useState<string>('')
  const [checkoutCompanyAddress, setCheckoutCompanyAddress] = useState<string>('')
  const [isFetchingCheckoutGst, setIsFetchingCheckoutGst] = useState<boolean>(false)
  const [checkoutOtherType, setCheckoutOtherType] = useState<string>('Bank Transfer / NEFT')
  const [checkoutHalfDayLate, setCheckoutHalfDayLate] = useState<boolean>(false)
  const [checkoutHalfDayAmount, setCheckoutHalfDayAmount] = useState<string>('')
  const [checkoutLateReason, setCheckoutLateReason] = useState<string>('Late departure after 11:00 AM (Half Day Charge)')

  const handleCheckoutGstLookup = async (gstinToLookup?: string) => {
    const clean = (gstinToLookup ?? checkoutGuestGst).trim().toUpperCase().replace(/\s+/g, '')
    if (!clean) return
    if (clean.length !== 15) {
      toast.error('GSTIN must be 15 characters')
      return
    }
    const val = validateGSTIN(clean)
    if (!val.isValid) {
      toast.error(val.message)
      return
    }
    setIsFetchingCheckoutGst(true)
    try {
      const res = await fetch(`/api/admin/gst-lookup?gstin=${clean}`)
      const json = await res.json()
      if (json.success && json.data) {
        setCheckoutGuestGst(clean)
        if (json.data.companyName) setCheckoutCompanyName(json.data.companyName)
        if (json.data.companyAddress) setCheckoutCompanyAddress(json.data.companyAddress)
        toast.success(`GSTIN Verified: ${json.data.companyName}`)
      } else {
        toast.error(json.error || 'Failed to fetch GST details')
      }
    } catch {
      toast.error('Failed to look up GSTIN')
    } finally {
      setIsFetchingCheckoutGst(false)
    }
  }

  const handleCheckoutGstChange = (val: string) => {
    const clean = val.toUpperCase().replace(/\s+/g, '')
    setCheckoutGuestGst(clean)
    if (clean.length === 15) {
      handleCheckoutGstLookup(clean)
    }
  }

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
          extraAddons: editExtraAddons.filter((a: any) => (a.qty > 0 || a.price > 0) && a.name) })
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
            finalAmount: json.data.finalAmount }))
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
      const roomsRes = await fetch(buildContextUrl('/api/admin/rooms', { status: 'ALL' }))
      const roomsJson = await roomsRes.json()
      setRooms(Array.isArray(roomsJson) ? roomsJson : (roomsJson?.data ?? []))

      const bookingsRes = await fetch(buildContextUrl('/api/admin/bookings', { 
        start: startDate.toISOString(), 
        end: endDate.toISOString() 
      }))
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
        roomId: b.roomId || b.room?.id,
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
        isComplimentary: b.isComplimentary ?? false,
        baseAmount: b.baseAmount ?? 0,
        gstPercent: b.gstPercent ?? 0,
        gstAmount: b.gstAmount ?? 0,
        mealPlan: b.mealPlan ?? null,
        mealPlanPricePerDay: b.mealPlanPricePerDay ?? 0,
        mealPlanAmount: b.mealPlanAmount ?? 0,
        extraAddons: b.extraAddons ?? null,
        extraAddonsAmount: b.extraAddonsAmount ?? 0,
        discountPercent: b.discountPercent ?? 0,
        discountAmount: b.discountAmount ?? 0,
        finalAmount: b.finalAmount ?? b.totalAmount ?? 0,
        taxExempt: b.taxExempt ?? false,
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

  useEffect(() => {
    const handleContextChange = () => {
      fetchData()
    }
    window.addEventListener('propertyContextChange', handleContextChange)
    return () => window.removeEventListener('propertyContextChange', handleContextChange)
  }, [fetchData])

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

  const fetchCheckoutPosOrders = async (booking: any) => {
    setCheckoutPosLoading(true)
    try {
      const res = await fetch('/api/admin/pos/orders')
      if (res.ok) {
        const orders = await res.json()
        // filter orders for this room that are not already settled
        const roomNum = String(booking.room?.roomNumber || booking.room || '').trim()
        const relevant = (Array.isArray(orders) ? orders : []).filter((o: any) => {
          const hasRoomTag = o.tags?.some((t: string) => 
            t.toLowerCase() === `room: ${roomNum.toLowerCase()}` || 
            t.toLowerCase().includes(`room ${roomNum.toLowerCase()}`) ||
            (booking.id && t.includes(`bookingid: ${booking.id.toLowerCase()}`))
          )
          const matchesTable = roomNum && (
            o.table?.toLowerCase().includes(`room ${roomNum.toLowerCase()}`) ||
            o.table?.toLowerCase() === roomNum.toLowerCase()
          )
          const matchesGuest = Boolean(
            booking.guest?.name && 
            o.guestName && 
            o.guestName.toLowerCase().trim() === (booking.guest?.name || '').toLowerCase().trim() &&
            o.guestName.toLowerCase() !== 'walk-in'
          )
          const isSettledAtCheckout = o.tags?.some((t: string) => t.includes('SETTLED_AT_CHECKOUT'))
          return (hasRoomTag || matchesTable || matchesGuest) && o.status !== 'SETTLED' && !isSettledAtCheckout
        })
        setCheckoutPosOrders(relevant)
      }
    } catch {
      setCheckoutPosOrders([])
    } finally {
      setCheckoutPosLoading(false)
    }
  }

  const openCheckoutModal = useCallback((booking: any) => {
    setSelectedBooking(booking)
    const isComp = Boolean(booking.isComplimentary || booking.raw?.isComplimentary)
    const total = isComp 
      ? ((booking.mealPlanAmount || 0) + (booking.extraAddonsAmount || 0))
      : (booking.finalAmount ?? booking.totalAmount ?? 0)
    const rem = Math.max(0, total - (booking.paidAmount ?? 0))
    setCheckoutPaidAmount(rem.toString())
    setCheckoutPaymentMethod('CASH')
    setBSplitCash('')
    setBSplitCard('')
    setBSplitUpi('')
    setCheckoutNotes('')
    setCheckoutExtraCharge('')
    setCheckoutExtraChargeLabel('')
    setCheckoutDiscount('')
    setCheckoutDiscountLabel('')
    setCheckoutGuestGst(booking.guestGstNumber || booking.raw?.guestGstNumber || booking.guest?.gstNumber || '')
    setCheckoutCompanyName(booking.guestCompanyName || booking.raw?.guestCompanyName || booking.guest?.companyName || '')
    setCheckoutCompanyAddress(booking.guestCompanyAddress || booking.raw?.guestCompanyAddress || booking.guest?.companyAddress || '')
    setCheckoutOtherType('Bank Transfer / NEFT')
    const nightlyRate = booking.room?.basePrice || (booking.nights ? booking.baseAmount / booking.nights : booking.baseAmount) || 2000
    const defHalfDay = Math.round(nightlyRate * 0.5)
    setCheckoutHalfDayLate(false)
    setCheckoutHalfDayAmount(String(defHalfDay))
    setCheckoutLateReason('Late Check-Out after 11:00 AM (Half Day Charge)')
    setCheckoutPosOrders([])
    setShowCheckoutModal(true)
    fetchCheckoutPosOrders(booking)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || loading || bookings.length === 0) return
    const params = new URLSearchParams(window.location.search)
    const targetBookingId = params.get('checkoutBookingId') || params.get('checkoutId')
    const searchGuest = params.get('search')
    if (targetBookingId) {
      const match = bookings.find((b: any) => b.id === targetBookingId)
      if (match) {
        if (match.status === 'CHECKED_IN') {
          openCheckoutModal(match)
        } else {
          setSelectedBooking(match)
        }
      }
    } else if (searchGuest) {
      const match = bookings.find((b: any) => 
        (b.guest && b.guest.toLowerCase().includes(searchGuest.toLowerCase())) ||
        (b.guestPhone && b.guestPhone.includes(searchGuest))
      )
      if (match) setSelectedBooking(match)
    }
  }, [loading, bookings, openCheckoutModal])

  const handleConfirmCheckoutPayment = async () => {
    if (!selectedBooking) return
    setIsUpdating(true)
    try {
      const posTotal = checkoutPosOrders.reduce((s: number, o: any) => s + (o.total || 0), 0)
      const extraCharge = parseFloat(checkoutExtraCharge) || 0
      const discount = parseFloat(checkoutDiscount) || 0
      let finalPaymentMethod: string = checkoutPaymentMethod
      let finalNotes: string = checkoutNotes

      if (checkoutPaymentMethod === 'SPLIT') {
        const cVal = parseFloat(bSplitCash) || 0
        const cardVal = parseFloat(bSplitCard) || 0
        const upiVal = parseFloat(bSplitUpi) || 0
        const splitSum = cVal + cardVal + upiVal
        const targetPaid = parseFloat(checkoutPaidAmount) || 0

        if (targetPaid > 0 && Math.abs(splitSum - targetPaid) > 1) {
          toast.error(`Split payment total (₹${splitSum}) does not match amount to collect (₹${targetPaid})`)
          setIsUpdating(false)
          return
        }

        const breakdown = [
          cVal > 0 ? `Cash: ₹${cVal.toLocaleString()}` : null,
          cardVal > 0 ? `Card: ₹${cardVal.toLocaleString()}` : null,
          upiVal > 0 ? `UPI: ₹${upiVal.toLocaleString()}` : null,
        ].filter(Boolean).join(', ')

        finalPaymentMethod = `Split (${breakdown})`
        finalNotes = checkoutNotes ? `[Split: ${breakdown}] ${checkoutNotes}` : `[Split: ${breakdown}]`
      } else if (checkoutPaymentMethod === 'OTHER' && checkoutOtherType.trim()) {
        finalPaymentMethod = `OTHER: ${checkoutOtherType.trim()}`
        finalNotes = checkoutNotes ? `[${checkoutOtherType.trim()}] ${checkoutNotes}` : `[${checkoutOtherType.trim()}]`
      }
      const res = await fetch('/api/admin/bookings/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: selectedBooking.id,
          action: 'CHECK_OUT',
          paymentMethod: finalPaymentMethod,
          paidAmount: parseFloat(checkoutPaidAmount) || 0,
          paymentNotes: finalNotes,
          posCharges: posTotal,
          extraCharges: extraCharge,
          extraDiscount: discount,
          guestGstNumber: checkoutGuestGst.trim().toUpperCase() || undefined,
          guestCompanyName: checkoutCompanyName.trim() || undefined,
          guestCompanyAddress: checkoutCompanyAddress.trim() || undefined,
          lateCheckoutCharge: checkoutHalfDayLate ? (parseFloat(checkoutHalfDayAmount) || 0) : 0,
          lateCheckoutReason: checkoutHalfDayLate ? (checkoutLateReason || 'Late Check-Out after 11:00 AM (Half Day Charge)') : undefined
        })
      })
      if (res.ok) {
        toast.success('Guest checked out & payment settled successfully')
        setShowCheckoutModal(false)

        // Mark checkout POS orders as SETTLED_AT_CHECKOUT
        if (checkoutPosOrders.length > 0) {
          Promise.all(checkoutPosOrders.map((o: any) =>
            fetch(`/api/admin/pos/orders/${o.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                status: 'SERVED',
                paymentMethod: 'SETTLED_AT_CHECKOUT'
              })
            }).catch(() => {})
          )).catch(() => {})
        }

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
            const allRes = await fetch(buildContextUrl('/api/admin/bookings', { status: 'ALL', limit: 200 }))
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
      width: `calc(${(width   / totalDays) * 100}% - 2px)` }
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
    <div className="-mx-4 -my-4 md:-mx-6 md:-my-6 h-[calc(100vh-4rem)] flex flex-col min-h-0 gap-0 bg-surface text-text-primary overflow-hidden">
      {/* === TOP NAV BAR === */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between px-4 py-3 gap-3 border-b border-border bg-surface shrink-0">
        {/* Left: title + Today */}
        <div className="flex items-center justify-between sm:justify-start gap-4">
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col gap-1 cursor-pointer opacity-60 hover:opacity-100 transition-opacity p-1">
              <span className="w-5 h-[2px] bg-text-secondary rounded-full" />
              <span className="w-4 h-[2px] bg-text-secondary rounded-full" />
              <span className="w-5 h-[2px] bg-text-secondary rounded-full" />
            </div>
            <span className="text-base font-bold text-text-primary uppercase tracking-tight">Calendar</span>
          </div>
          
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-black/20 border border-border rounded-lg p-1">
            <button onClick={handlePrev} className="p-1.5 hover:bg-white/10 rounded-md transition-colors">
              <ChevronLeft className="w-3.5 h-3.5 text-text-secondary" />
            </button>
            <span className="text-[11px] font-black text-text-primary min-w-[100px] text-center uppercase tracking-widest">{monthLabel}</span>
            <button onClick={handleNext} className="p-1.5 hover:bg-white/10 rounded-md transition-colors">
              <ChevronRight className="w-3.5 h-3.5 text-text-secondary" />
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

          <div className="h-4 w-px bg-border shrink-0 mx-1" />

          {/* View Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-surface border border-border rounded-xl p-0.5 shrink-0">
            {(['day', 'week', 'month'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  'px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all',
                  viewMode === mode
                    ? 'bg-surface text-text-primary shadow-lg'
                    : 'text-text-secondary hover:bg-white/[0.08] hover:text-text-primary'
                )}
              >
                {mode}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-border shrink-0 mx-1" />

          {/* New Booking - Always visible as primary action */}
          <button
            onClick={() => window.location.href = '/admin/bookings/new'}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#4A9EFF] hover:bg-surface text-text-primary text-[10px] font-black uppercase tracking-widest rounded-xl transition-colors shadow-lg shadow-[#4A9EFF]/20 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Booking</span>
          </button>

          <button
            onClick={handleExportPDFReport}
            title="Download Formatted Guest Details PDF Sheet"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface hover:bg-surface border border-border rounded-xl text-text-primary text-[10px] font-black uppercase tracking-wider transition-all shrink-0 active:scale-95 shadow-sm"
          >
            <FileText className="w-3.5 h-3.5 text-red-400" />
            <span className="hidden sm:inline">PDF Report</span>
          </button>

          <button
            onClick={() => downloadCSV(bookings, 'Bookings_Export')}
            title="Download CSV"
            className="p-1.5 bg-surface border border-border rounded-xl text-text-secondary hover:text-text-primary shrink-0"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>


      {/* === CALENDAR GRID (Desktop) / LIST (Mobile) === */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-surface relative">
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
        <div className="flex border-b border-border shrink-0 bg-surface">
          <div className="w-[180px] shrink-0 flex items-center px-4 py-3 border-r border-border sticky left-0 z-20 bg-surface">
            <span className="text-[10px] font-black uppercase tracking-widest text-text-tertiary">Inventory Hub</span>
          </div>
          <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}>
            {days.map((day) => (
              <div
                key={day.toString()}
                className={cn(
                  'py-3 px-1 text-center border-r border-border last:border-r-0',
                  isToday(day) ? 'bg-[#4A9EFF]/5' : '',
                )}
              >
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-text-tertiary mb-1">
                   {viewMode === 'day' ? format(day, 'EEEE') : format(day, 'EEE')}
                </p>
                <p className={cn(
                  'text-[13px] font-black inline-flex w-7 h-7 items-center justify-center rounded-lg transition-all',
                  isToday(day) ? 'bg-[#4A9EFF] text-text-primary shadow-lg' : 'text-text-primary'
                )}>{format(day, 'd')}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Desktop Rows */}
        <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
          {loading ? (
             <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
          ) : filteredRooms.length === 0 ? (
             <div className="flex-1 flex flex-col relative">
                {/* Empty Grid Lines to maintain professional look */}
                {[...Array(8)].map((_, idx) => (
                   <div key={`empty-${idx}`} className="flex border-b border-border h-[80px] bg-surface opacity-50">
                      <div className="w-[180px] shrink-0 border-r border-border sticky left-0 z-20 bg-inherit" />
                      <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}>
                         {days.map((day, i) => (
                            <div key={i} className={cn('border-r border-border last:border-r-0 h-full', isToday(day) ? 'bg-[#4A9EFF]/[0.02]' : '')} />
                         ))}
                      </div>
                   </div>
                ))}
                {/* Overlay Message */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="bg-background/80 backdrop-blur-sm border border-border p-6 rounded-2xl shadow-xl flex flex-col items-center text-center">
                        <Calendar className="w-10 h-10 text-text-tertiary mb-3 opacity-50" />
                        <p className="text-sm font-bold text-text-primary">No Rooms Found</p>
                        <p className="text-xs text-text-secondary mt-1">Your inventory is empty or doesn&apos;t match the current filters.</p>
                    </div>
                </div>
             </div>
          ) : filteredRooms.map((room, idx) => {
              const roomBookings = bookings.filter(b => b.roomId ? b.roomId === room.id : b.room === room.roomNumber)
              const statusCfg = ROOM_STATUS_CONFIG[room.status || 'CLEAN'] || ROOM_STATUS_CONFIG['CLEAN']
              return (
                <div key={room.id} className={cn('flex border-b border-border h-[80px] group transition-colors', idx % 2 === 0 ? 'bg-surface' : 'bg-surface', 'hover:bg-white/[0.08]')}>
                  <div className="w-[180px] shrink-0 px-4 flex flex-col justify-center border-r border-border gap-1.5 sticky left-0 z-20 bg-inherit group-hover:bg-surface transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-sm font-black text-text-primary">{room.roomNumber}</span>
                        {room.property?.name && (
                          <span className="text-[9px] font-semibold text-text-secondary truncate max-w-[80px]" title={room.property.name}>
                            · {room.property.name}
                          </span>
                        )}
                      </div>
                      <span className={cn('text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md shrink-0', statusCfg.cls)}>{statusCfg.label}</span>
                    </div>
                    <span className="text-[10px] font-bold text-text-tertiary capitalize tracking-tight">{(room.type || 'standard').replace('_', ' ')}</span>
                  </div>
                  <div className="flex-1 grid relative" style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}>
                    {days.map(day => (
                      <div key={day.toString()} className={cn('border-r border-border last:border-r-0 h-full', isToday(day) ? 'bg-blue-400/[0.02]' : '')} />
                    ))}
                    {roomBookings.map(booking => {
                      if (differenceInDays(booking.startDate, endDate) > 0 || differenceInDays(booking.endDate, startDate) < 0) return null
                      const cfg = getBookingConfig(booking.status, booking.source, booking.notes)
                      return (
                        <div
                          key={booking.id}
                          onClick={() => setSelectedBooking(booking)}
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect()
                            setHoveredBookingCard({ booking, room, rect })
                          }}
                          onMouseLeave={() => setHoveredBookingCard(null)}
                          className={cn(
                            'absolute top-[8px] bottom-[8px] rounded-xl cursor-pointer transition-all z-10 flex flex-col justify-center overflow-hidden shadow-lg border hover:scale-[1.01] hover:brightness-110 select-none',
                            viewMode === 'month' ? 'px-2' : 'px-3',
                            cfg.bar
                          )}
                          style={getBookingStyle(booking)}
                        >
                          <div className="flex items-center justify-between gap-1 leading-tight">
                            <p className={cn(
                              "font-black text-white truncate uppercase tracking-tight drop-shadow-sm",
                              viewMode === 'month' ? "text-[10px]" : "text-[11px]"
                            )}>{booking.guest}</p>
                            {booking.isVip && viewMode !== 'month' && <Star className="w-3.5 h-3.5 text-amber-300 fill-amber-300 shrink-0 drop-shadow" />}
                          </div>
                          <p className={cn(
                            'font-bold uppercase tracking-wider truncate text-white/90 drop-shadow-sm',
                            viewMode === 'month' ? "text-[8px]" : "text-[9px]"
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

        {/* Floating Hover Card for Booking */}
        {hoveredBookingCard && (
          <div
            style={{
              position: 'fixed',
              top: hoveredBookingCard.rect.top > 340
                ? Math.max(12, hoveredBookingCard.rect.top - 330)
                : hoveredBookingCard.rect.bottom + 10,
              left: Math.max(16, Math.min(typeof window !== 'undefined' ? window.innerWidth - 336 : 900, hoveredBookingCard.rect.left + hoveredBookingCard.rect.width / 2 - 160)),
              zIndex: 99999,
            }}
            className="w-80 bg-[#0c1220]/95 backdrop-blur-2xl border border-white/20 rounded-3xl p-0 shadow-[0_25px_60px_rgba(0,0,0,0.9)] pointer-events-none animate-in fade-in zoom-in-95 duration-150 ring-1 ring-white/10 overflow-hidden"
          >
            {/* Room Photo Header with Overlay */}
            <div className="relative h-28 w-full bg-black/60 overflow-hidden">
              <img
                src={
                  hoveredBookingCard.room?.images?.[0] ||
                  hoveredBookingCard.booking?.raw?.room?.images?.[0] ||
                  'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600&auto=format&fit=crop&q=60'
                }
                alt="Room"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0c1220] via-black/40 to-transparent" />
              
              {/* Top Badges */}
              <div className="absolute top-2.5 left-3 right-3 flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-[10px] font-black uppercase tracking-wider text-white">
                  Room {hoveredBookingCard.room?.roomNumber || hoveredBookingCard.booking?.room}
                </span>
                <span className="px-2.5 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider backdrop-blur-md bg-black/60 text-white border-white/20">
                  {hoveredBookingCard.booking.status.replace('_', ' ')}
                </span>
              </div>

              {/* Bottom Room Type on Image */}
              <div className="absolute bottom-2 left-3">
                <p className="text-xs font-black text-white drop-shadow capitalize">
                  {(hoveredBookingCard.room?.type || 'Standard Room').replace('_', ' ')}
                </p>
              </div>
            </div>

            {/* Details Body */}
            <div className="p-4 space-y-3">
              {/* Guest Name & Reference */}
              <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-white/10">
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-sm font-black text-white leading-tight">
                      {hoveredBookingCard.booking.guest}
                    </h4>
                    {hoveredBookingCard.booking.isVip && (
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                    {hoveredBookingCard.booking.guestPhone || 'No phone'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-mono text-[10px] font-bold text-[#4A9EFF] bg-[#4A9EFF]/10 px-2 py-0.5 rounded border border-[#4A9EFF]/20 block">
                    #{hoveredBookingCard.booking.bookingReference}
                  </span>
                  <span className="text-[9px] text-gray-400 uppercase font-bold tracking-wider mt-0.5 block">
                    {hoveredBookingCard.booking.source || 'Direct'}
                  </span>
                </div>
              </div>

              {/* Stay Timeline Grid */}
              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-2xl bg-black/40 border border-white/5 text-[11px]">
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Check-In</p>
                  <p className="font-bold text-white mt-0.5">
                    {format(hoveredBookingCard.booking.startDate, 'dd MMM yyyy')}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Check-Out</p>
                  <p className="font-bold text-white mt-0.5">
                    {format(hoveredBookingCard.booking.endDate, 'dd MMM yyyy')}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Stay Length</p>
                  <p className="font-bold text-[#4A9EFF] mt-0.5">
                    {hoveredBookingCard.booking.nights} {hoveredBookingCard.booking.nights === 1 ? 'Night' : 'Nights'}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Guests</p>
                  <p className="font-bold text-gray-200 mt-0.5">
                    {hoveredBookingCard.booking.numberOfGuests || 1} Pax
                  </p>
                </div>
              </div>

              {/* Financials & Click hint */}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
                <div>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Total Bill</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-black text-white text-sm">
                      ₹{(hoveredBookingCard.booking.totalAmount || 0).toLocaleString('en-IN')}
                    </span>
                    <span className={cn('text-[9px] px-1.5 py-0.2 rounded font-black uppercase tracking-wider',
                      hoveredBookingCard.booking.paidAmount >= hoveredBookingCard.booking.totalAmount && hoveredBookingCard.booking.totalAmount > 0
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-amber-500/20 text-amber-300'
                    )}>
                      {hoveredBookingCard.booking.paidAmount >= hoveredBookingCard.booking.totalAmount && hoveredBookingCard.booking.totalAmount > 0
                        ? 'PAID'
                        : 'UNPAID'}
                    </span>
                  </div>
                </div>
                <span className="text-[9px] text-gray-400 font-bold bg-white/[0.05] px-2.5 py-1.5 rounded-xl border border-white/10">
                  Click to manage ↗
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Mobile View: Vertical Booking List */}
        <div className="md:hidden flex-1 overflow-y-auto min-h-0 custom-scrollbar bg-background">
          {loading ? (
             <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
          ) : bookings.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-64 opacity-30 gap-3">
                <Calendar className="w-12 h-12" />
                <p className="text-sm font-black uppercase tracking-widest">No Bookings this week</p>
             </div>
          ) : (
            <div className="p-4 space-y-4">
               <h3 className="text-[11px] font-black text-text-tertiary uppercase tracking-[0.3em] mb-4">Current Week Schedule</h3>
               {bookings.sort((a,b) => a.startDate.getTime() - b.startDate.getTime()).map(booking => {
                 const cfg = getBookingConfig(booking.status, booking.source, booking.notes)
                 return (
                   <div 
                     key={booking.id}
                     onClick={() => setSelectedBooking(booking)}
                     className={cn("p-4 rounded-2xl border transition-all active:scale-[0.98] relative overflow-hidden shadow-lg", cfg.bar)}
                   >
                      <div className="flex items-start justify-between mb-3">
                         <div>
                            <p className="text-[15px] font-black text-white leading-tight mb-1 drop-shadow-sm">{booking.guest}</p>
                            <div className="flex items-center gap-2">
                               <span className="text-[10px] font-black text-white bg-white/20 px-2 py-0.5 rounded border border-white/30">ROOM {booking.room}</span>
                               <span className="text-[10px] font-black uppercase tracking-widest text-white/90">{cfg.label}</span>
                            </div>
                         </div>
                         {booking.isVip && <div className="w-8 h-8 bg-amber-400/20 rounded-full flex items-center justify-center border border-amber-300/40"><Star className="w-4 h-4 text-amber-300 fill-amber-300" /></div>}
                      </div>

                      <div className="grid grid-cols-2 gap-3 bg-black/20 rounded-xl p-3 border border-border">
                         <div>
                            <p className="text-[9px] font-black text-text-tertiary uppercase tracking-widest mb-1">Check-in</p>
                            <p className="text-[12px] font-bold text-text-primary">{format(booking.startDate, 'MMM dd, EEE')}</p>
                         </div>
                         <div>
                            <p className="text-[9px] font-black text-text-tertiary uppercase tracking-widest mb-1">Check-out</p>
                            <p className="text-[12px] font-bold text-text-primary">{format(booking.endDate, 'MMM dd, EEE')}</p>
                         </div>
                      </div>
                      
                      <div className="mt-3 flex items-center justify-between">
                         <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">{booking.nights} Nights Stay</span>
                         <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">{booking.source}</span>
                      </div>
                   </div>
                 )
               })}
            </div>
          )}
        </div>
      </div>

      {/* === LEGEND === */}
      <div className="flex items-center justify-center gap-4 md:gap-8 py-4 px-4 border-t border-border bg-surface shrink-0 flex-wrap">
        {LEGEND.map(item => (
          <div key={item.label} className="flex items-center gap-2">
            <span className={cn('w-2.5 h-2.5 rounded-full shadow-lg shadow-black/20', item.cls)} />
            <span className="text-[9px] font-black uppercase tracking-widest text-text-secondary">{item.label}</span>
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
              className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl pointer-events-auto animate-fade-in"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start justify-between p-5 border-b border-border">
                <div>
                  <h2 className="text-base font-bold text-text-primary">Booking Details</h2>
                  <p className="text-xs text-text-secondary mt-0.5">Manage reservation for {selectedBooking.guest}</p>
                </div>
                <button
                  onClick={() => setSelectedBooking(null)}
                  className="p-1.5 hover:bg-white/[0.08] rounded-lg transition-colors"
                >
                  <XCircle className="w-4 h-4 text-text-secondary" />
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
                  <div className="p-3 bg-surface rounded-xl">
                    <p className="text-[9px] text-text-tertiary uppercase font-bold mb-1">Guest</p>
                    <p className="text-sm font-semibold text-text-primary">{selectedBooking.guest}</p>
                  </div>
                  <div className="p-3 bg-surface rounded-xl">
                    <p className="text-[9px] text-text-tertiary uppercase font-bold mb-1">Room</p>
                    <p className="text-sm font-semibold text-text-primary">{selectedBooking.room}</p>
                  </div>
                  <div className="p-3 bg-surface rounded-xl">
                    <p className="text-[9px] text-text-tertiary uppercase font-bold mb-1">Check-In</p>
                    <p className="text-sm font-semibold text-text-primary">{format(selectedBooking.startDate, 'MMM d, yyyy')}</p>
                  </div>
                  <div className="p-3 bg-surface rounded-xl">
                    <p className="text-[9px] text-text-tertiary uppercase font-bold mb-1">Check-Out</p>
                    <p className="text-sm font-semibold text-text-primary">{format(selectedBooking.endDate, 'MMM d, yyyy')}</p>
                  </div>
                  <div className="p-3 bg-surface rounded-xl">
                    <p className="text-[9px] text-text-tertiary uppercase font-bold mb-1">Nights</p>
                    <p className="text-sm font-semibold text-text-primary">{selectedBooking.nights}</p>
                  </div>
                  <div className="p-3 bg-surface rounded-xl">
                    <p className="text-[9px] text-text-tertiary uppercase font-bold mb-1">Status</p>
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
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-surface hover:bg-surface text-text-primary text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {isUpdating ? 'Updating...' : 'Check In Guest'}
                    </button>
                  )}
                  {selectedBooking.status === 'CHECKED_IN' && (
                    <button
                      disabled={isUpdating}
                      onClick={() => openCheckoutModal(selectedBooking)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#4A9EFF] hover:bg-surface text-text-primary text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 shadow-lg shadow-[#4A9EFF]/20"
                    >
                      <LogOut className="w-4 h-4" />
                      Check Out & Clear Payment
                    </button>
                  )}
                  {selectedBooking.status === 'CHECKED_OUT' && (
                    <button
                      disabled={isUpdating}
                      onClick={async () => {
                        try {
                          const allRes = await fetch(`/api/admin/bookings?status=ALL&limit=200`)
                          if (allRes.ok) {
                            const allJson = await allRes.json()
                            const allBookings = Array.isArray(allJson) ? allJson : (allJson?.data ?? [])
                            const full = allBookings.find((b: any) => b.id === selectedBooking.id) || selectedBooking
                            setInvoiceData(full)
                            setShowInvoice(true)
                          } else {
                            setInvoiceData(selectedBooking)
                            setShowInvoice(true)
                          }
                        } catch {
                          setInvoiceData(selectedBooking)
                          setShowInvoice(true)
                        }
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition-colors shadow-lg shadow-emerald-950/40"
                    >
                      <FileText className="w-4 h-4" />
                      View / Print Tax Invoice
                    </button>
                  )}
                  {selectedBooking.status !== 'CHECKED_OUT' && selectedBooking.status !== 'CANCELLED' && (
                    <button
                      disabled={isUpdating}
                      onClick={() => handleUpdateStatus('CANCEL')}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-surface hover:bg-surface text-[#fc8181] hover:text-text-primary text-sm font-semibold rounded-xl border border-[#e53e3e]/30 transition-colors disabled:opacity-50"
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
          <div className="relative w-full max-w-sm bg-surface border border-border rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-bold text-text-primary">Room Upgrade</h3>
              <p className="text-xs text-text-secondary mt-1">Select a premium room for {selectedBooking.guest}</p>
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
                  className="w-full p-4 bg-surface hover:bg-surface border border-border rounded-2xl flex items-center justify-between group transition-all"
                >
                  <div className="text-left">
                    <p className="text-sm font-black text-text-primary">Room {room.roomNumber}</p>
                    <p className="text-[10px] text-text-tertiary font-bold uppercase tracking-widest">{room.type}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-emerald-400">+{formatCurrency(room.basePrice - (rooms.find(r => r.roomNumber === selectedBooking.room)?.basePrice || 0))}/night</p>
                    <p className="text-[9px] text-text-tertiary">Upgrade Total: +{formatCurrency((room.basePrice - (rooms.find(r => r.roomNumber === selectedBooking.room)?.basePrice || 0)) * selectedBooking.nights)}</p>
                  </div>
                </button>
              ))}
            </div>
            <div className="p-4 bg-black/20">
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="w-full py-3 text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] hover:text-text-primary transition-colors"
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
          <div className="relative w-full max-w-sm bg-surface border border-border rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-bold text-text-primary">Extend Stay</h3>
              <p className="text-xs text-text-secondary mt-1">Request additional nights for {selectedBooking.guest}</p>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between gap-4">
                <button 
                  onClick={() => setExtensionDays(Math.max(1, extensionDays - 1))}
                  className="w-12 h-12 rounded-2xl bg-white/5 border border-border/50 flex items-center justify-center text-xl font-bold hover:bg-white/10"
                >-</button>
                <div className="text-center">
                  <p className="text-3xl font-black text-text-primary">{extensionDays}</p>
                  <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">Nights</p>
                </div>
                <button 
                  onClick={() => setExtensionDays(extensionDays + 1)}
                  className="w-12 h-12 rounded-2xl bg-[#4A9EFF]/10 border border-[#4A9EFF]/20 flex items-center justify-center text-xl font-bold text-[#4A9EFF] hover:bg-[#4A9EFF]/20"
                >+</button>
              </div>

              <div className="p-4 bg-black/20 rounded-2xl border border-border">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">New Check-out</p>
                  <p className="text-sm font-bold text-text-primary">{format(addDays(selectedBooking.endDate, extensionDays), 'EEE, MMM dd')}</p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Extension Cost</p>
                  <p className="text-sm font-bold text-emerald-400">+{formatCurrency(extensionDays * (rooms.find(r => r.roomNumber === selectedBooking.room)?.basePrice || 0))}</p>
                </div>
              </div>

              <button
                disabled={requestLoading}
                onClick={() => handleRequestExtension(extensionDays * (rooms.find(r => r.roomNumber === selectedBooking.room)?.basePrice || 0))}
                className="w-full py-4 bg-[#4A9EFF] hover:bg-surface text-text-primary text-sm font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-[#4A9EFF]/20 disabled:opacity-50"
              >
                {requestLoading ? 'Submitting...' : 'Submit Extension Request'}
              </button>
            </div>
            <button
              onClick={() => setShowExtendModal(false)}
              className="w-full py-4 text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] hover:text-text-primary transition-colors bg-black/20"
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
          <div className="relative w-full max-w-lg bg-surface border border-border/50 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-border/50 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                  <UtensilsCrossed className="w-5 h-5 text-amber-400" /> Edit Meal Plan & Add-ons
                </h3>
                <p className="text-xs text-text-secondary mt-0.5">Guest: <span className="text-text-primary font-bold">{selectedBooking.guest?.name || selectedBooking.guest}</span> (Room {selectedBooking.room?.roomNumber || selectedBooking.room})</p>
              </div>
              <button onClick={() => setShowMealPlanModal(false)} className="p-2 hover:bg-white/10 rounded-full text-text-secondary hover:text-text-primary transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
              {/* Meal Plan Select */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block">Select Meal Plan</label>
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
                          ? "bg-amber-600 text-white shadow-lg shadow-amber-500/10"
                          : "bg-black/30 border-border text-text-secondary hover:border-border/50"
                      )}
                    >
                      <div className="flex items-center justify-between font-bold text-xs">
                        <span className="text-text-primary">{plan.label}</span>
                        <span className="text-amber-400 font-mono">{plan.price > 0 ? `₹${plan.price}/d` : 'Free'}</span>
                      </div>
                      <p className="text-[9px] text-text-tertiary truncate mt-0.5">{plan.desc}</p>
                    </button>
                  ))}
                </div>

                {editMealPlanType !== 'EP' && (
                  <div className="p-3 bg-black/40 border border-border/50 rounded-xl flex items-center justify-between text-xs mt-2">
                    <span className="text-text-secondary font-medium">Per-day Rate (₹/guest):</span>
                    <div className="flex items-center gap-1 bg-black/60 border border-white/15 rounded-lg px-2 py-1">
                      <span className="text-amber-400 font-bold">₹</span>
                      <input
                        type="number"
                        min="0"
                        value={editMealPlanRate}
                        onChange={(e) => setEditMealPlanRate(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-20 bg-transparent text-right font-mono font-bold text-text-primary outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Extra Requests & Add-ons */}
              <div className="space-y-3 pt-3 border-t border-border/50">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block">Extra Requests & Add-ons (Extra Bed, Mattress, etc.)</label>
                <div className="space-y-2">
                  {editExtraAddons.map((item: any, idx: number) => (
                    <div key={idx} className="p-3 bg-[#131A29] border border-white/10 rounded-2xl flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-white tracking-tight">{item.name}</p>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <div className="flex items-center bg-[#0B1120] border border-white/10 rounded-lg px-2.5 py-1 focus-within:border-blue-500 transition-colors">
                            <span className="text-gray-400 text-xs font-bold mr-1">₹</span>
                            <input
                              type="number"
                              min="0"
                              value={item.price}
                              onChange={(e) => {
                                const p = Math.max(0, parseFloat(e.target.value) || 0)
                                setEditExtraAddons((prev: any[]) => prev.map((a, i) => i === idx ? { ...a, price: p } : a))
                              }}
                              className="w-20 bg-transparent text-left font-mono font-bold text-white text-xs outline-none border-0 p-0 focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </div>
                          <span className="text-gray-500 text-[10px] font-medium">/ stay</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 bg-[#0B1120] border border-white/10 rounded-xl p-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setEditExtraAddons((prev: any[]) => prev.map((a, i) => i === idx ? { ...a, qty: Math.max(0, a.qty - 1) } : a))}
                          className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/15 text-gray-300 font-bold text-xs flex items-center justify-center transition-all active:scale-90"
                        >-</button>
                        <span className="text-xs font-black text-white w-6 text-center font-mono">{item.qty}</span>
                        <button
                          type="button"
                          onClick={() => setEditExtraAddons((prev: any[]) => prev.map((a, i) => i === idx ? { ...a, qty: a.qty + 1 } : a))}
                          className="w-7 h-7 rounded-lg bg-blue-600/30 text-blue-400 hover:bg-blue-600 hover:text-white font-bold text-xs flex items-center justify-center transition-all active:scale-90"
                        >+</button>
                      </div>
                    </div>
                  ))}

                  {/* Add Custom Add-on */}
                  <div className="p-3.5 bg-[#131A29]/70 border border-dashed border-white/15 rounded-2xl space-y-2.5">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Add Custom Add-on / Fee</p>
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Item Name (e.g. Extra Bed, Baby Cot)"
                        value={newAddonName}
                        onChange={(e) => setNewAddonName(e.target.value)}
                        className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-blue-500 transition-colors"
                      />
                      <div className="flex items-center gap-2">
                        <div className="flex-1 flex items-center bg-[#0B1120] border border-white/10 rounded-xl px-3 py-2 focus-within:border-blue-500 transition-colors">
                          <span className="text-gray-400 text-xs font-bold mr-1.5">₹</span>
                          <input
                            type="number"
                            min="0"
                            placeholder="Rate amount"
                            value={newAddonPrice}
                            onChange={(e) => setNewAddonPrice(e.target.value)}
                            className="w-full bg-transparent text-xs text-white font-mono font-bold outline-none border-0 p-0 focus:ring-0 placeholder-gray-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (!newAddonName) return toast.error("Enter item name")
                            const price = parseFloat(newAddonPrice) || 0
                            setEditExtraAddons((prev: any[]) => [...prev, { id: `addon_${Date.now()}`, name: newAddonName, price, qty: 1 }])
                            setNewAddonName('')
                            setNewAddonPrice('')
                          }}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-all shadow-md active:scale-95 shrink-0"
                        >
                          + Add Item
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-black/30 border-t border-border/50 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowMealPlanModal(false)}
                className="px-4 py-2 text-xs font-bold text-text-secondary hover:text-text-primary transition-all"
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


      {/* === CHECKOUT PAYMENT & CLEARANCE MODAL === */}
      {showCheckoutModal && selectedBooking && (() => {
        const isComp = Boolean(selectedBooking.isComplimentary ?? selectedBooking.raw?.isComplimentary)
        const posTotal = checkoutPosOrders.reduce((s: number, o: any) => s + (o.total || 0), 0)
        const extraCharge = parseFloat(checkoutExtraCharge) || 0
        const discount = parseFloat(checkoutDiscount) || 0
        const halfDayCharge = checkoutHalfDayLate ? (parseFloat(checkoutHalfDayAmount) || 0) : 0
        const roomTariff = isComp ? 0 : (selectedBooking.baseAmount || selectedBooking.totalAmount || 0)
        const roomGst = isComp ? 0 : (selectedBooking.gstAmount || 0)
        const mealPlanAmt = selectedBooking.mealPlanAmount || 0
        const extraAddonsAmt = selectedBooking.extraAddonsAmount || 0
        const baseInvoice = isComp 
          ? (mealPlanAmt + extraAddonsAmt)
          : (selectedBooking.finalAmount ?? selectedBooking.totalAmount ?? 0)
        const grandTotal = Math.max(0, baseInvoice + posTotal + extraCharge + halfDayCharge - discount)
        const alreadyPaid = selectedBooking.paidAmount ?? 0
        const balanceDue = Math.max(0, grandTotal - alreadyPaid)
        const targetAmountToCollect = parseFloat(checkoutPaidAmount) || balanceDue
        const bSplitCashVal = parseFloat(bSplitCash) || 0
        const bSplitCardVal = parseFloat(bSplitCard) || 0
        const bSplitUpiVal = parseFloat(bSplitUpi) || 0
        const bSplitAllocated = bSplitCashVal + bSplitCardVal + bSplitUpiVal
        const bSplitRemaining = Math.max(0, targetAmountToCollect - bSplitAllocated)
        const isBSplitBalanced = Math.abs(bSplitAllocated - targetAmountToCollect) < 1 && targetAmountToCollect > 0

        const singleNightRate = selectedBooking.room?.basePrice || (selectedBooking.nights ? Math.round(selectedBooking.baseAmount / selectedBooking.nights) : selectedBooking.baseAmount) || 2000
        const halfTariffPreset = Math.round(singleNightRate * 0.5)
        const fullTariffPreset = singleNightRate

        const handleToggleLateCheckout = (checked: boolean) => {
          setCheckoutHalfDayLate(checked)
          const newHalfAmt = checked ? (parseFloat(checkoutHalfDayAmount) || halfTariffPreset) : 0
          if (checked && !checkoutHalfDayAmount) {
            setCheckoutHalfDayAmount(String(halfTariffPreset))
          }
          const newGrand = Math.max(0, baseInvoice + posTotal + extraCharge + newHalfAmt - discount)
          setCheckoutPaidAmount(Math.max(0, newGrand - alreadyPaid).toString())
        }

        const handleSetLateAmount = (val: string) => {
          setCheckoutHalfDayAmount(val)
          if (checkoutHalfDayLate) {
            const newHalfAmt = parseFloat(val) || 0
            const newGrand = Math.max(0, baseInvoice + posTotal + extraCharge + newHalfAmt - discount)
            setCheckoutPaidAmount(Math.max(0, newGrand - alreadyPaid).toString())
          }
        }

        const handleApplyBookingSplitPreset = (type: '50-50-cash-upi' | '50-50-cash-card' | '50-50-card-upi' | '33-33-33') => {
          const tot = targetAmountToCollect
          if (tot <= 0) return
          if (type === '50-50-cash-upi') {
            const half = Math.round((tot / 2) * 100) / 100
            setBSplitCash(String(half))
            setBSplitCard('0')
            setBSplitUpi(String(Math.round((tot - half) * 100) / 100))
          } else if (type === '50-50-cash-card') {
            const half = Math.round((tot / 2) * 100) / 100
            setBSplitCash(String(half))
            setBSplitCard(String(Math.round((tot - half) * 100) / 100))
            setBSplitUpi('0')
          } else if (type === '50-50-card-upi') {
            const half = Math.round((tot / 2) * 100) / 100
            setBSplitCash('0')
            setBSplitCard(String(half))
            setBSplitUpi(String(Math.round((tot - half) * 100) / 100))
          } else if (type === '33-33-33') {
            const part = Math.floor(tot / 3)
            const rem = tot - (part * 2)
            setBSplitCash(String(part))
            setBSplitCard(String(part))
            setBSplitUpi(String(rem))
          }
        }

        const fillBookingRemainingTo = (mode: 'cash' | 'card' | 'upi') => {
          if (bSplitRemaining <= 0) return
          if (mode === 'cash') setBSplitCash(String(Math.round((bSplitCashVal + bSplitRemaining) * 100) / 100))
          if (mode === 'card') setBSplitCard(String(Math.round((bSplitCardVal + bSplitRemaining) * 100) / 100))
          if (mode === 'upi') setBSplitUpi(String(Math.round((bSplitUpiVal + bSplitRemaining) * 100) / 100))
        }

        return (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-[#0B1120] text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 px-6 py-4.5 bg-slate-50/80 dark:bg-slate-900/60 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-inner shrink-0">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                    Check-Out &amp; Payment Settlement
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    Guest: <span className="text-slate-900 dark:text-white font-bold">{selectedBooking.guest?.name || selectedBooking.guest}</span>
                    {' '}&bull; Room <span className="text-blue-600 dark:text-blue-400 font-bold">{selectedBooking.room?.roomNumber || selectedBooking.room}</span>
                    {' '}&bull; {selectedBooking.nights} Night{selectedBooking.nights !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowCheckoutModal(false)} 
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4 overflow-y-auto custom-scrollbar flex-1">

              {/* Room Charges Breakdown */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">Room Charges &amp; Stay Breakdown</p>
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full">
                    <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                    <span>Std Checkout: 11:00 AM</span>
                  </div>
                </div>
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/40">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      <tr>
                        <th className="px-3.5 py-2.5 w-8">#</th>
                        <th className="px-3.5 py-2.5">Revenue Head</th>
                        <th className="px-3.5 py-2.5 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-medium">
                      <tr>
                        <td className="px-3.5 py-2.5 text-slate-400">1</td>
                        <td className="px-3.5 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 dark:text-white">Room Tariff ({selectedBooking.nights}N)</span>
                            {isComp && (
                              <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                Complimentary
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3.5 py-2.5 font-mono font-bold text-right text-slate-900 dark:text-white">
                          {isComp ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">&#8377;0</span>
                          ) : (
                            <>&#8377;{roomTariff.toLocaleString()}</>
                          )}
                        </td>
                      </tr>
                      {!isComp && roomGst > 0 && (<>
                      <tr>
                        <td className="px-3.5 py-2.5 text-slate-400">2</td>
                        <td className="px-3.5 py-2.5">CGST {(selectedBooking.gstPercent || 0)/2}%</td>
                        <td className="px-3.5 py-2.5 font-mono text-right text-slate-700 dark:text-slate-300">&#8377;{(roomGst/2).toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td className="px-3.5 py-2.5 text-slate-400">3</td>
                        <td className="px-3.5 py-2.5">SGST {(selectedBooking.gstPercent || 0)/2}%</td>
                        <td className="px-3.5 py-2.5 font-mono text-right text-slate-700 dark:text-slate-300">&#8377;{(roomGst/2).toLocaleString()}</td>
                      </tr>
                      </>)}
                      {mealPlanAmt > 0 && (
                      <tr>
                        <td className="px-3.5 py-2.5 text-slate-400">{!isComp && roomGst > 0 ? 4 : 2}</td>
                        <td className="px-3.5 py-2.5">Meal Plan ({selectedBooking.mealPlan})</td>
                        <td className="px-3.5 py-2.5 font-mono text-right text-slate-700 dark:text-slate-300">&#8377;{mealPlanAmt.toLocaleString()}</td>
                      </tr>)}
                      {extraAddonsAmt > 0 && (
                      <tr>
                        <td className="px-3.5 py-2.5 text-slate-400">{!isComp && roomGst > 0 ? 5 : 3}</td>
                        <td className="px-3.5 py-2.5">Extra Add-ons</td>
                        <td className="px-3.5 py-2.5 font-mono text-right text-slate-700 dark:text-slate-300">&#8377;{extraAddonsAmt.toLocaleString()}</td>
                      </tr>)}
                      {checkoutHalfDayLate && halfDayCharge > 0 && (
                      <tr className="bg-amber-500/10 font-semibold">
                        <td className="px-3.5 py-2.5 text-amber-500 font-bold">
                          <Clock className="w-3.5 h-3.5" />
                        </td>
                        <td className="px-3.5 py-2.5 text-amber-700 dark:text-amber-300">
                          <div className="flex items-center gap-1.5">
                            <span>Late Check-Out / Half-Day ({checkoutLateReason || 'Standard 11:00 AM Extended'})</span>
                          </div>
                        </td>
                        <td className="px-3.5 py-2.5 font-mono font-black text-right text-amber-600 dark:text-amber-400">
                          +&#8377;{halfDayCharge.toLocaleString()}
                        </td>
                      </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Late Check-Out / Half-Day Charge Section */}
              <div className={cn(
                "p-4 rounded-2xl border-2 transition-all",
                checkoutHalfDayLate 
                  ? "bg-amber-500/10 border-amber-500/40 shadow-sm" 
                  : "bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800"
              )}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                      checkoutHalfDayLate ? "bg-amber-500 text-slate-950 font-bold" : "bg-slate-200 dark:bg-slate-800 text-slate-500"
                    )}>
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">
                          Late Check-Out / Half-Day Charge
                        </span>
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                          Standard Checkout: 11:00 AM
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Guest checking out after 11:00 AM (e.g. 4:00 PM)? Apply half-day room charge to bill &amp; tax invoice.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleLateCheckout(!checkoutHalfDayLate)}
                    className={cn(
                      "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                      checkoutHalfDayLate ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-700"
                    )}
                  >
                    <span
                      className={cn(
                        "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out",
                        checkoutHalfDayLate ? "translate-x-5" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>

                {checkoutHalfDayLate && (
                  <div className="mt-3.5 pt-3 border-t border-amber-500/20 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                    {/* Quick Presets */}
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                        Quick Preset Amount (Tariff: &#8377;{singleNightRate.toLocaleString()}/nt)
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleSetLateAmount(String(halfTariffPreset))}
                          className={cn(
                            "px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer",
                            checkoutHalfDayAmount === String(halfTariffPreset)
                              ? "bg-amber-500 text-slate-950 border-amber-500 shadow-sm"
                              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:border-amber-400"
                          )}
                        >
                          50% Tariff (&#8377;{halfTariffPreset.toLocaleString()})
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetLateAmount(String(fullTariffPreset))}
                          className={cn(
                            "px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer",
                            checkoutHalfDayAmount === String(fullTariffPreset)
                              ? "bg-amber-500 text-slate-950 border-amber-500 shadow-sm"
                              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:border-amber-400"
                          )}
                        >
                          Full Day (&#8377;{fullTariffPreset.toLocaleString()})
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetLateAmount('500')}
                          className={cn(
                            "px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer",
                            checkoutHalfDayAmount === '500'
                              ? "bg-amber-500 text-slate-950 border-amber-500 shadow-sm"
                              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:border-amber-400"
                          )}
                        >
                          &#8377;500 Flat
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetLateAmount('1000')}
                          className={cn(
                            "px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer",
                            checkoutHalfDayAmount === '1000'
                              ? "bg-amber-500 text-slate-950 border-amber-500 shadow-sm"
                              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:border-amber-400"
                          )}
                        >
                          &#8377;1,000 Flat
                        </button>
                      </div>
                    </div>

                    {/* Input Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                          Reason / Departure Note (Appears on Invoice)
                        </label>
                        <input
                          type="text"
                          value={checkoutLateReason}
                          onChange={e => setCheckoutLateReason(e.target.value)}
                          placeholder="e.g. Extended departure till 4:00 PM (Half-Day)"
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                          Amount (&#8377;)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-xs font-bold text-amber-500">&#8377;</span>
                          <input
                            type="number"
                            min="0"
                            value={checkoutHalfDayAmount}
                            onChange={e => handleSetLateAmount(e.target.value)}
                            placeholder="0"
                            className="w-full bg-white dark:bg-slate-900 border border-amber-400 dark:border-amber-500/60 rounded-xl pl-6 pr-3 py-2 text-xs font-mono font-black text-amber-600 dark:text-amber-400 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px] text-amber-600 dark:text-amber-400 font-semibold bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>This surcharge of &#8377;{(parseFloat(checkoutHalfDayAmount) || 0).toLocaleString()} will be printed as an official line item on the GST Tax Invoice.</span>
                    </div>
                  </div>
                )}
              </div>

              {/* POS Food Orders */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">Food &amp; Beverage (POS Orders)</p>
                  {checkoutPosLoading && <span className="text-[10px] text-amber-500 font-bold animate-pulse">Fetching orders...</span>}
                </div>
                {checkoutPosOrders.length > 0 ? (
                  <div className="border border-amber-400/40 dark:border-amber-500/30 rounded-2xl overflow-hidden bg-amber-50/50 dark:bg-amber-950/20">
                    <table className="w-full text-xs">
                      <thead className="bg-amber-500/15 text-amber-800 dark:text-amber-300 text-[10px] font-bold uppercase tracking-wider">
                        <tr>
                          <th className="px-3.5 py-2 text-left">Order #</th>
                          <th className="px-3.5 py-2 text-left">Items</th>
                          <th className="px-3.5 py-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-amber-200/50 dark:divide-amber-500/20">
                        {checkoutPosOrders.map((order: any) => (
                          <tr key={order.id}>
                            <td className="px-3.5 py-2 text-slate-700 dark:text-slate-300 font-semibold whitespace-nowrap">{order.orderNumber}</td>
                            <td className="px-3.5 py-2 text-slate-900 dark:text-slate-100">{order.items?.map((i: any) => i.name).join(', ') || order.guestName}</td>
                            <td className="px-3.5 py-2 text-amber-600 dark:text-amber-400 font-mono font-bold text-right">&#8377;{(order.total || 0).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="border-t border-amber-300/60 dark:border-amber-500/30 bg-amber-500/10">
                        <tr>
                          <td colSpan={2} className="px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200">POS Sub-total</td>
                          <td className="px-3.5 py-2 text-xs font-bold text-amber-600 dark:text-amber-400 font-mono text-right">&#8377;{posTotal.toLocaleString()}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : !checkoutPosLoading ? (
                  <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 flex items-center gap-2 bg-slate-50/40 dark:bg-slate-900/20">
                    <p className="text-xs text-slate-600 dark:text-slate-400">No pending POS orders found for this room. Add manual charges below if needed.</p>
                  </div>
                ) : null}
              </div>

              {/* Extra Charges (Manual) */}
              <div>
                <p className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-1.5">Extra Charges (Manual)</p>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={checkoutExtraChargeLabel} 
                    onChange={e => setCheckoutExtraChargeLabel(e.target.value)}
                    placeholder="Description (e.g. Minibar, Laundry, Telephone)"
                    className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm" 
                  />
                  <div className="relative w-36">
                    <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">&#8377;</span>
                    <input 
                      type="number" 
                      value={checkoutExtraCharge}
                      onChange={e => {
                        setCheckoutExtraCharge(e.target.value)
                        const pC = parseFloat(e.target.value) || 0
                        const d = parseFloat(checkoutDiscount) || 0
                        const newGrand = Math.max(0, baseInvoice + posTotal + pC + halfDayCharge - d)
                        setCheckoutPaidAmount(Math.max(0, newGrand - alreadyPaid).toString())
                      }}
                      placeholder="0.00"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl pl-6 pr-3 py-2 text-xs text-slate-900 dark:text-white font-mono font-bold outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                    />
                  </div>
                </div>
              </div>

              {/* Discount */}
              <div>
                <p className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-1.5">Discount / Complimentary</p>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={checkoutDiscountLabel} 
                    onChange={e => setCheckoutDiscountLabel(e.target.value)}
                    placeholder="Reason (e.g. Loyalty Guest, Resolution Settle)"
                    className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-sm" 
                  />
                  <div className="relative w-36">
                    <span className="absolute left-3 top-2 text-xs font-bold text-emerald-500">&#8377;</span>
                    <input 
                      type="number" 
                      value={checkoutDiscount}
                      onChange={e => {
                        setCheckoutDiscount(e.target.value)
                        const d = parseFloat(e.target.value) || 0
                        const eC = parseFloat(checkoutExtraCharge) || 0
                        const newGrand = Math.max(0, baseInvoice + posTotal + eC + halfDayCharge - d)
                        setCheckoutPaidAmount(Math.max(0, newGrand - alreadyPaid).toString())
                      }}
                      placeholder="0.00"
                      className="w-full bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-500/40 rounded-xl pl-6 pr-3 py-2 text-xs text-emerald-600 dark:text-emerald-400 font-mono font-bold outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                    />
                  </div>
                </div>
              </div>

              {/* Bill Summary */}
              <div className="bg-slate-900 text-white rounded-2xl p-4.5 border border-slate-800 shadow-xl space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Official Bill Summary</p>
                  <span className="text-[10px] font-bold text-blue-300 bg-blue-500/20 px-2 py-0.5 rounded-full border border-blue-400/30">
                    Invoice Settlement
                  </span>
                </div>

                <div className="space-y-1.5 text-xs pt-1">
                  <div className="flex justify-between text-slate-300">
                    <span>{isComp ? 'Room (Complimentary) + Meal Plan' : 'Room + Taxes + Meal Plan'}</span>
                    <span className="font-mono font-semibold">
                      {isComp && baseInvoice === 0 ? (
                        <span className="text-emerald-400 font-bold">&#8377;0</span>
                      ) : (
                        <>&#8377;{baseInvoice.toLocaleString()}</>
                      )}
                    </span>
                  </div>

                  {checkoutHalfDayLate && halfDayCharge > 0 && (
                    <div className="flex justify-between text-amber-300 font-semibold">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        Late Check-Out / Half-Day Surcharge
                      </span>
                      <span className="font-mono font-bold">+ &#8377;{halfDayCharge.toLocaleString()}</span>
                    </div>
                  )}

                  {posTotal > 0 && (
                    <div className="flex justify-between text-amber-400 font-semibold">
                      <span>Food &amp; Beverage (POS Orders)</span>
                      <span className="font-mono font-bold">+ &#8377;{posTotal.toLocaleString()}</span>
                    </div>
                  )}

                  {extraCharge > 0 && (
                    <div className="flex justify-between text-slate-300">
                      <span>{checkoutExtraChargeLabel || 'Extra Charges'}</span>
                      <span className="font-mono font-semibold">+ &#8377;{extraCharge.toLocaleString()}</span>
                    </div>
                  )}

                  {discount > 0 && (
                    <div className="flex justify-between text-emerald-400 font-semibold">
                      <span>{checkoutDiscountLabel || 'Discount / Concession'}</span>
                      <span className="font-mono font-bold">- &#8377;{discount.toLocaleString()}</span>
                    </div>
                  )}

                  <div className="border-t border-slate-800 pt-2 flex justify-between font-bold text-sm text-white">
                    <span>Grand Total</span>
                    <span className="font-mono text-base">&#8377;{grandTotal.toLocaleString()}</span>
                  </div>

                  {alreadyPaid > 0 && (
                    <div className="flex justify-between text-emerald-400 text-xs font-semibold">
                      <span>Advance / Already Paid</span>
                      <span className="font-mono">- &#8377;{alreadyPaid.toLocaleString()}</span>
                    </div>
                  )}

                  {/* Balance Due High-Contrast Glowing Callout */}
                  <div className="mt-2.5 p-3.5 rounded-xl bg-gradient-to-r from-blue-950/70 via-indigo-950/70 to-slate-900 border border-blue-500/40 flex items-center justify-between shadow-inner">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-black text-blue-300 uppercase tracking-wider block">Net Balance Due</span>
                        <span className="text-[10px] text-slate-400">Total payable at check-out</span>
                      </div>
                    </div>
                    <span className="text-2xl font-mono font-black text-cyan-300 tracking-tight">&#8377;{balanceDue.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">Select Payment Mode</label>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Click to select settlement channel</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'CASH', label: 'Cash', icon: Banknote, color: 'text-emerald-500' },
                    { id: 'CARD', label: 'Credit / Debit Card', icon: CreditCard, color: 'text-blue-500' },
                    { id: 'ONLINE', label: 'Online / UPI', icon: Smartphone, color: 'text-purple-500' },
                    { id: 'SPLIT', label: 'Split / Multi-Pay', icon: Layers, color: 'text-amber-500' },
                    { id: 'CORPORATE_CLEARANCE', label: 'Corporate Clearance', icon: Building2, color: 'text-indigo-500' },
                    { id: 'OTHER', label: 'Other', icon: HelpCircle, color: 'text-slate-500' },
                  ].map(m => {
                    const Icon = m.icon
                    const isSel = checkoutPaymentMethod === m.id
                    return (
                      <button 
                        key={m.id} 
                        type="button" 
                        onClick={() => {
                          setCheckoutPaymentMethod(m.id as any)
                          if (m.id === 'SPLIT' && !bSplitCash && !bSplitCard && !bSplitUpi && targetAmountToCollect > 0) {
                            const half = Math.round((targetAmountToCollect / 2) * 100) / 100
                            setBSplitCash(String(half))
                            setBSplitUpi(String(Math.round((targetAmountToCollect - half) * 100) / 100))
                            setBSplitCard('0')
                          }
                        }}
                        className={cn(
                          'p-3 rounded-2xl border text-left flex flex-col justify-between gap-2 transition-all cursor-pointer shadow-sm',
                          isSel 
                            ? 'bg-blue-50 dark:bg-blue-950/60 border-2 border-blue-600 dark:border-blue-500 ring-2 ring-blue-500/20 text-blue-950 dark:text-blue-100 shadow-md' 
                            : 'bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                        )}
                      >
                        <div className="flex items-center justify-between w-full">
                          <Icon className={cn('w-4 h-4', isSel ? 'text-blue-600 dark:text-blue-400' : m.color)} />
                          {isSel && <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                        </div>
                        <span className={cn('text-xs font-bold truncate', isSel ? 'text-blue-950 dark:text-white' : 'text-slate-800 dark:text-slate-200')}>
                          {m.label}
                        </span>
                      </button>
                    )
                  })}
                </div>

                {/* Split Payment Allocation UI */}
                {checkoutPaymentMethod === 'SPLIT' && (
                  <div className="mt-3 space-y-3 bg-amber-500/10 p-4 rounded-2xl border border-amber-500/30 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-widest flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-amber-500" />
                        Split Payment Allocation
                      </label>
                      <span className="text-[10px] text-amber-700 dark:text-amber-300 font-bold bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
                        Target: &#8377;{targetAmountToCollect.toLocaleString()}
                      </span>
                    </div>

                    {/* Quick Presets */}
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleApplyBookingSplitPreset('50-50-cash-upi')}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
                      >
                        50% Cash + 50% UPI
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyBookingSplitPreset('50-50-cash-card')}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
                      >
                        50% Cash + 50% Card
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyBookingSplitPreset('50-50-card-upi')}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
                      >
                        50% Card + 50% UPI
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyBookingSplitPreset('33-33-33')}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
                      >
                        1/3 Cash + Card + UPI
                      </button>
                    </div>

                    {/* Multi-mode inputs */}
                    <div className="space-y-2">
                      {/* Cash */}
                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 shadow-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                            <Banknote className="w-3.5 h-3.5 text-emerald-500" />
                          </div>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Cash</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-slate-400">&#8377;</span>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="0.00"
                            value={bSplitCash}
                            onChange={e => setBSplitCash(e.target.value)}
                            className="w-28 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-right text-slate-900 dark:text-white outline-none focus:border-amber-500"
                          />
                          {bSplitRemaining > 0 && (
                            <button
                              type="button"
                              onClick={() => fillBookingRemainingTo('cash')}
                              className="px-2 py-1 text-[9px] font-bold rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 hover:bg-amber-500/30 transition-colors cursor-pointer"
                              title="Add remaining balance to Cash"
                            >
                              +Fill
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Card */}
                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 shadow-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center">
                            <CreditCard className="w-3.5 h-3.5 text-blue-500" />
                          </div>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Card</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-slate-400">&#8377;</span>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="0.00"
                            value={bSplitCard}
                            onChange={e => setBSplitCard(e.target.value)}
                            className="w-28 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-right text-slate-900 dark:text-white outline-none focus:border-amber-500"
                          />
                          {bSplitRemaining > 0 && (
                            <button
                              type="button"
                              onClick={() => fillBookingRemainingTo('card')}
                              className="px-2 py-1 text-[9px] font-bold rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 hover:bg-amber-500/30 transition-colors cursor-pointer"
                              title="Add remaining balance to Card"
                            >
                              +Fill
                            </button>
                          )}
                        </div>
                      </div>

                      {/* UPI */}
                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 shadow-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-purple-500/15 flex items-center justify-center">
                            <Smartphone className="w-3.5 h-3.5 text-purple-500" />
                          </div>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">UPI / Online</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-slate-400">&#8377;</span>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="0.00"
                            value={bSplitUpi}
                            onChange={e => setBSplitUpi(e.target.value)}
                            className="w-28 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-right text-slate-900 dark:text-white outline-none focus:border-amber-500"
                          />
                          {bSplitRemaining > 0 && (
                            <button
                              type="button"
                              onClick={() => fillBookingRemainingTo('upi')}
                              className="px-2 py-1 text-[9px] font-bold rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 hover:bg-amber-500/30 transition-colors cursor-pointer"
                              title="Add remaining balance to UPI"
                            >
                              +Fill
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Allocation Status */}
                    {isBSplitBalanced ? (
                      <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-between font-bold">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          Split Balanced (100% Allocated)
                        </span>
                        <span>&#8377;{bSplitAllocated.toLocaleString()}</span>
                      </div>
                    ) : bSplitRemaining > 0 ? (
                      <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs flex items-center justify-between font-bold">
                        <span className="flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4 text-amber-500" />
                          Remaining to Allocate:
                        </span>
                        <span className="font-mono text-amber-800 dark:text-amber-200">&#8377;{bSplitRemaining.toLocaleString()}</span>
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-700 dark:text-red-300 text-xs flex items-center justify-between font-bold">
                        <span className="flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4 text-red-500" />
                          Over-allocated:
                        </span>
                        <span className="font-mono text-red-800 dark:text-red-200">+&#8377;{Math.abs(targetAmountToCollect - bSplitAllocated).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Other Payment Type Tabs & Input */}
                {checkoutPaymentMethod === 'OTHER' && (
                  <div className="mt-3 space-y-2.5 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5 text-blue-500" />
                        What Other Payment Type?
                      </label>
                      <span className="text-[9px] text-blue-600 dark:text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                        Select Type or Specify
                      </span>
                    </div>

                    {/* Quick Selection Tabs */}
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        'Bank Transfer / NEFT',
                        'Cheque / DD',
                        'OTA / Agent Voucher',
                        'Gift Voucher',
                        'Complementary / Barter',
                        'Custom'
                      ].map(tab => {
                        const isTabSel = checkoutOtherType === tab || (tab === 'Custom' && !['Bank Transfer / NEFT', 'Cheque / DD', 'OTA / Agent Voucher', 'Gift Voucher', 'Complementary / Barter'].includes(checkoutOtherType))
                        return (
                          <button
                            key={tab}
                            type="button"
                            onClick={() => setCheckoutOtherType(tab === 'Custom' ? '' : tab)}
                            className={cn(
                              'px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer',
                              isTabSel
                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                            )}
                          >
                            {tab}
                          </button>
                        )
                      })}
                    </div>

                    {/* Type Specification Input */}
                    <input
                      type="text"
                      value={checkoutOtherType}
                      onChange={e => setCheckoutOtherType(e.target.value)}
                      placeholder="e.g. HDFC Cheque #33910, IMPS Ref #88192, Traveloka Voucher"
                      className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-medium outline-none placeholder:text-slate-400 transition-all"
                    />
                  </div>
                )}
              </div>

              {/* Guest / Corporate GSTIN & Company Info */}
              <div className="space-y-2.5 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-500" />
                    Guest / Company GSTIN (B2B Tax Invoice)
                  </label>
                  <span className="text-[9px] text-blue-600 dark:text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                    Auto-Fetch
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    value={checkoutGuestGst} 
                    onChange={e => handleCheckoutGstChange(e.target.value)}
                    maxLength={15}
                    className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white font-mono font-bold text-xs uppercase tracking-wider outline-none focus:border-blue-500 placeholder:font-sans placeholder:normal-case placeholder:font-normal placeholder:text-slate-400 shadow-sm" 
                    placeholder="e.g. 27AAACT2727Q1ZW (15-character GST Number)" 
                  />
                  <button
                    type="button"
                    disabled={isFetchingCheckoutGst || !checkoutGuestGst}
                    onClick={() => handleCheckoutGstLookup()}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all shadow-md active:scale-95 shrink-0 flex items-center gap-1 cursor-pointer"
                  >
                    {isFetchingCheckoutGst ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Fetch Details'}
                  </button>
                </div>

                {(checkoutCompanyName || checkoutGuestGst.length === 15) && (
                  <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800 animate-in fade-in duration-200">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Company Legal / Trade Name</label>
                      <input
                        type="text"
                        value={checkoutCompanyName}
                        onChange={e => setCheckoutCompanyName(e.target.value)}
                        placeholder="Company Name (e.g. Tata Consultancy Services Ltd)"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-blue-500 shadow-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Company Registered Address</label>
                      <textarea
                        rows={2}
                        value={checkoutCompanyAddress}
                        onChange={e => setCheckoutCompanyAddress(e.target.value)}
                        placeholder="Registered Address for Tax Invoice"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-[11px] text-slate-700 dark:text-slate-300 outline-none focus:border-blue-500 resize-none shadow-sm"
                      />
                    </div>
                  </div>
                )}
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Enter GSTIN to generate an official B2B Tax Invoice with input tax credit (ITC) for the company.
                </p>
              </div>

              {/* Amount Being Collected Now */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                    Amount Being Collected Now (&#8377;)
                  </label>
                  {targetAmountToCollect !== balanceDue && (
                    <button
                      type="button"
                      onClick={() => setCheckoutPaidAmount(balanceDue.toString())}
                      className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      Set to full balance (&#8377;{balanceDue.toLocaleString()})
                    </button>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-base font-bold text-slate-400">&#8377;</span>
                  <input 
                    type="number" 
                    value={checkoutPaidAmount} 
                    onChange={e => setCheckoutPaidAmount(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 focus:border-blue-600 rounded-2xl pl-8 pr-4 py-3 text-slate-900 dark:text-white font-mono font-black text-lg outline-none shadow-sm transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="0.00" 
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                  {checkoutPaymentMethod === 'CORPORATE_CLEARANCE' 
                    ? 'Corporate Company / PO Number' 
                    : checkoutPaymentMethod === 'OTHER'
                    ? `Payment Reference / Remarks (${checkoutOtherType || 'Other'})`
                    : 'Payment Reference / Transaction Notes'}
                </label>
                <input 
                  type="text" 
                  value={checkoutNotes} 
                  onChange={e => setCheckoutNotes(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:border-blue-600 rounded-2xl px-4 py-3 text-slate-900 dark:text-white text-xs font-semibold outline-none shadow-sm transition-all"
                  placeholder={checkoutPaymentMethod === 'CORPORATE_CLEARANCE' ? 'e.g. Infosys Ltd - PO #8849' : checkoutPaymentMethod === 'OTHER' ? 'e.g. Cheque clearance date, counter voucher number' : 'e.g. HDFC Card Slip #4410 or UPI Ref ID'} 
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowCheckoutModal(false)}
                  className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-2xl text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  disabled={isUpdating} 
                  onClick={handleConfirmCheckoutPayment}
                  className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-blue-600/30 active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Check-Out &amp; Invoice</span> <ArrowRight className="w-4 h-4 stroke-[2.5]" /></>}
                </button>
              </div>

            </div>
          </div>
        </div>
        )
      })()}



      {showInvoice && invoiceData && (
        <InvoiceModal
          booking={invoiceData}
          onClose={() => { setShowInvoice(false); setInvoiceData(null) }}
        />
      )}
    </div>
  )
}
