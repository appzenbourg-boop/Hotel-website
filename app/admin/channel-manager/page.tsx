'use client'

import React, { useState, useEffect, useMemo } from 'react'
import useSWR from 'swr'
import {
  Globe, CheckCircle2, AlertCircle, RefreshCw, Search, Sliders,
  ArrowUpRight, DollarSign, Percent, Save, Layers, BedDouble,
  ChevronDown, ChevronRight, Filter, ShieldCheck, Zap,
  TrendingUp, Check, Info, Lock, Eye, EyeOff, RotateCcw, Plus,
  Key, X, ExternalLink, Wifi, WifiOff, Link2,
  Calendar, CalendarDays, CalendarRange, ChevronLeft, Clock,
  User, Phone, Mail, CreditCard, ArrowRight, Building2, Tag,
  Hash, Users, Moon, Sparkles, CheckCircle
} from 'lucide-react'
import {
  format,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  subDays,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  isToday,
  isSameDay,
  eachDayOfInterval,
  differenceInDays,
  parseISO
} from 'date-fns'
import { toast } from 'sonner'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import { buildContextUrl, getAdminContext } from '@/lib/admin-context'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export interface ChannelBooking {
  id: string
  guestId?: string
  roomId?: string
  checkIn: string | Date
  checkOut: string | Date
  actualCheckIn?: string | null
  actualCheckOut?: string | null
  numberOfGuests?: number
  status: string
  source?: string | null
  totalAmount: number
  paidAmount: number
  paymentStatus?: string
  paymentMethod?: string | null
  baseAmount?: number
  gstAmount?: number
  finalAmount?: number
  mealPlan?: string | null
  notes?: string | null
  specialRequests?: string | null
  guest?: {
    name?: string
    phone?: string
    email?: string
    address?: string
    idType?: string
    idNumber?: string
    gstNumber?: string | null
    companyName?: string | null
    companyAddress?: string | null
  }
  room?: {
    roomNumber?: string
    type?: string
    category?: string
  }
}

interface OTAChannel {
  id: string
  name: string
  shortCode: string
  logoText: string
  color: string
  bgColor: string
  borderColor: string
  commission: string
  defaultMarkup: number
  description: string
  extranetUrl: string
  defaultHotelIdPrefix: string
}

const CHANNELS: OTAChannel[] = [
  {
    id: 'BOOKING_COM',
    name: 'Booking.com',
    shortCode: 'BKNG',
    logoText: 'B.',
    color: 'text-blue-400',
    bgColor: 'bg-blue-600/10',
    borderColor: 'border-blue-500/30',
    commission: '15% Comm.',
    defaultMarkup: 15,
    description: 'Global hotel marketplace with instant ARI push & XML connectivity.',
    extranetUrl: 'https://admin.booking.com',
    defaultHotelIdPrefix: 'BKNG-'
  },
  {
    id: 'AIRBNB',
    name: 'Airbnb',
    shortCode: 'ABNB',
    logoText: 'ab',
    color: 'text-rose-400',
    bgColor: 'bg-rose-600/10',
    borderColor: 'border-rose-500/30',
    commission: '3% Host Fee',
    defaultMarkup: 5,
    description: 'Vacation rental & boutique stays channel with direct API/iCal sync.',
    extranetUrl: 'https://www.airbnb.com/hosting',
    defaultHotelIdPrefix: 'ABNB-'
  },
  {
    id: 'MAKEMYTRIP',
    name: 'MakeMyTrip',
    shortCode: 'MMT',
    logoText: 'MMT',
    color: 'text-red-400',
    bgColor: 'bg-red-600/10',
    borderColor: 'border-red-500/30',
    commission: '18% Comm.',
    defaultMarkup: 18,
    description: 'Leading Indian OTA with InGoMMT Extranet API integration.',
    extranetUrl: 'https://partner.makemytrip.com',
    defaultHotelIdPrefix: 'MMT-H'
  },
  {
    id: 'AGODA',
    name: 'Agoda',
    shortCode: 'AGDA',
    logoText: 'ag',
    color: 'text-purple-400',
    bgColor: 'bg-purple-600/10',
    borderColor: 'border-purple-500/30',
    commission: '15% Comm.',
    defaultMarkup: 15,
    description: 'High-performing distribution across Southeast Asia via YCS API.',
    extranetUrl: 'https://ycs.agoda.com',
    defaultHotelIdPrefix: 'AGD-'
  },
  {
    id: 'EXPEDIA',
    name: 'Expedia Group',
    shortCode: 'EXPD',
    logoText: 'EX',
    color: 'text-amber-400',
    bgColor: 'bg-amber-600/10',
    borderColor: 'border-amber-500/30',
    commission: '15% Comm.',
    defaultMarkup: 15,
    description: 'Expedia, Hotels.com, and Vrbo inventory sync via Partner Central Rapid API.',
    extranetUrl: 'https://expediapartnercentral.com',
    defaultHotelIdPrefix: 'EXPD-'
  }
]

interface RoomMapping {
  id?: string
  otaConnectionId?: string
  otaName?: string
  otaRoomId?: string
  ratePlanCode?: string
  customRate?: number | null
  isActive: boolean
}

interface RoomData {
  id: string
  propertyId?: string
  roomNumber: string
  type: string
  category: string
  basePrice: number
  status: string
  maxOccupancy?: number
  otaMappings?: RoomMapping[]
}

interface ChannelManagerResponse {
  success: boolean
  rooms: RoomData[]
  connections: Array<{
    id: string
    otaName: string
    status: 'CONNECTED' | 'PAUSED' | 'DISCONNECTED'
    lastSync?: string | null
    credentials?: any
  }>
  stats: {
    totalRooms: number
    occupiedRooms: number
    availableRooms: number
    occupancyRate: number
  }
}

export default function ChannelRatesInventoryPage() {
  const { propertyId } = getAdminContext()
  const apiUrl = useMemo(() => buildContextUrl('/api/admin/channel-manager/rooms'), [propertyId])
  
  const { data, isLoading, mutate } = useSWR<ChannelManagerResponse>(apiUrl, fetcher, {
    revalidateOnFocus: false
  })

  // Dynamic rooms strictly from DB
  const rooms: RoomData[] = useMemo(() => {
    return data?.rooms || []
  }, [data?.rooms])

  // Local state for interactive matrix
  const [ratesMap, setRatesMap] = useState<Record<string, { customRate?: number; isActive: boolean }>>({})
  const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [showConfig, setShowConfig] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  // ── Date, Week, Month Filter & View State ──
  const [activeTab, setActiveTab] = useState<'BOOKINGS' | 'RATES'>('BOOKINGS')
  const [periodType, setPeriodType] = useState<'DATE' | 'WEEK' | 'MONTH'>('DATE')
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [bookingChannelFilter, setBookingChannelFilter] = useState<string>('ALL')
  const [bookingStatusFilter, setBookingStatusFilter] = useState<string>('ALL')
  const [bookingSearch, setBookingSearch] = useState<string>('')
  const [selectedBookingForDetails, setSelectedBookingForDetails] = useState<ChannelBooking | null>(null)

  // Date range calculation for selected period
  const { rangeStart, rangeEnd, periodLabel, periodDays } = useMemo(() => {
    let rStart: Date
    let rEnd: Date
    let pLabel: string
    let pDays: Date[] = []

    if (periodType === 'DATE') {
      rStart = startOfDay(selectedDate)
      rEnd = endOfDay(selectedDate)
      pLabel = isToday(selectedDate) 
        ? `Today — ${format(selectedDate, 'EEEE, d MMMM yyyy')}` 
        : format(selectedDate, 'EEEE, d MMMM yyyy')
      pDays = [selectedDate]
    } else if (periodType === 'WEEK') {
      rStart = startOfWeek(selectedDate, { weekStartsOn: 1 })
      rEnd = endOfWeek(selectedDate, { weekStartsOn: 1 })
      pLabel = `${format(rStart, 'd MMM')} – ${format(rEnd, 'd MMM yyyy')}`
      pDays = eachDayOfInterval({ start: rStart, end: rEnd })
    } else {
      rStart = startOfMonth(selectedDate)
      rEnd = endOfMonth(selectedDate)
      pLabel = format(selectedDate, 'MMMM yyyy')
      pDays = eachDayOfInterval({ start: rStart, end: rEnd })
    }

    return { rangeStart: rStart, rangeEnd: rEnd, periodLabel: pLabel, periodDays: pDays }
  }, [periodType, selectedDate])

  const handlePrevPeriod = () => {
    if (periodType === 'DATE') setSelectedDate(d => subDays(d, 1))
    else if (periodType === 'WEEK') setSelectedDate(d => subWeeks(d, 1))
    else setSelectedDate(d => subMonths(d, 1))
  }

  const handleNextPeriod = () => {
    if (periodType === 'DATE') setSelectedDate(d => addDays(d, 1))
    else if (periodType === 'WEEK') setSelectedDate(d => addWeeks(d, 1))
    else setSelectedDate(d => addMonths(d, 1))
  }

  const handleToday = () => {
    setSelectedDate(new Date())
  }

  // Fetch bookings for the selected Date / Week / Month range
  const bookingsApiUrl = useMemo(() => {
    const params = new URLSearchParams()
    if (propertyId && propertyId !== 'ALL') params.set('propertyId', propertyId)
    params.set('start', rangeStart.toISOString())
    params.set('end', rangeEnd.toISOString())
    params.set('limit', '200')
    return `/api/admin/bookings?${params.toString()}`
  }, [propertyId, rangeStart, rangeEnd])

  const { data: bookingsRaw, isLoading: isBookingsLoading, mutate: mutateBookings } = useSWR<any>(
    bookingsApiUrl,
    fetcher,
    { revalidateOnFocus: false }
  )

  const rawBookingsList: ChannelBooking[] = useMemo(() => {
    if (!bookingsRaw) return []
    return Array.isArray(bookingsRaw) ? bookingsRaw : (bookingsRaw.data || [])
  }, [bookingsRaw])

  // Filter bookings by channel, status, and search query
  const filteredBookings = useMemo(() => {
    return rawBookingsList.filter(b => {
      // Channel filter
      if (bookingChannelFilter !== 'ALL') {
        const s = (b.source || 'DIRECT').toUpperCase().replace(/[\s\.-]/g, '_')
        if (bookingChannelFilter === 'BOOKING_COM' && !s.includes('BOOKING')) return false
        if (bookingChannelFilter === 'AIRBNB' && !s.includes('AIRBNB')) return false
        if (bookingChannelFilter === 'MAKEMYTRIP' && !s.includes('MMT') && !s.includes('MAKEMYTRIP') && !s.includes('MAKE_MY_TRIP')) return false
        if (bookingChannelFilter === 'AGODA' && !s.includes('AGODA')) return false
        if (bookingChannelFilter === 'EXPEDIA' && !s.includes('EXPEDIA')) return false
        if (bookingChannelFilter === 'DIRECT' && !['DIRECT', 'WALK_IN', 'PMS', 'FRONT_DESK'].some(kw => s.includes(kw))) return false
      }

      // Status filter
      if (bookingStatusFilter !== 'ALL' && b.status !== bookingStatusFilter) {
        return false
      }

      // Search query
      if (bookingSearch.trim()) {
        const q = bookingSearch.toLowerCase()
        const guestName = (b.guest?.name || '').toLowerCase()
        const guestPhone = (b.guest?.phone || '').toLowerCase()
        const roomNum = (b.room?.roomNumber || '').toLowerCase()
        const bookingId = (b.id || '').toLowerCase()
        return guestName.includes(q) || guestPhone.includes(q) || roomNum.includes(q) || bookingId.includes(q)
      }

      return true
    })
  }, [rawBookingsList, bookingChannelFilter, bookingStatusFilter, bookingSearch])

  // Aggregate statistics for the period
  const periodStats = useMemo(() => {
    let totalRevenue = 0
    let totalNights = 0
    const channelCounts: Record<string, number> = {
      BOOKING_COM: 0,
      AIRBNB: 0,
      MAKEMYTRIP: 0,
      AGODA: 0,
      EXPEDIA: 0,
      DIRECT: 0
    }

    rawBookingsList.forEach(b => {
      totalRevenue += (b.finalAmount || b.totalAmount || 0)
      const inDate = new Date(b.checkIn)
      const outDate = new Date(b.checkOut)
      const nights = Math.max(1, Math.round((outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60 * 24)))
      totalNights += nights

      const s = (b.source || 'DIRECT').toUpperCase().replace(/[\s\.-]/g, '_')
      if (s.includes('BOOKING')) channelCounts.BOOKING_COM++
      else if (s.includes('AIRBNB')) channelCounts.AIRBNB++
      else if (s.includes('MMT') || s.includes('MAKEMYTRIP') || s.includes('MAKE_MY_TRIP')) channelCounts.MAKEMYTRIP++
      else if (s.includes('AGODA')) channelCounts.AGODA++
      else if (s.includes('EXPEDIA')) channelCounts.EXPEDIA++
      else channelCounts.DIRECT++
    })

    return {
      totalBookings: rawBookingsList.length,
      totalRevenue,
      totalNights,
      channelCounts
    }
  }, [rawBookingsList])

  // Helper to format channel branding
  const getChannelMeta = (source?: string | null) => {
    const s = (source || 'DIRECT').toUpperCase().replace(/[\s\.-]/g, '_')
    if (s.includes('BOOKING')) {
      return {
        name: 'Booking.com',
        shortCode: 'BKNG',
        color: 'text-blue-400',
        bgColor: 'bg-blue-600/15',
        borderColor: 'border-blue-500/40',
        logoText: 'B.'
      }
    }
    if (s.includes('AIRBNB')) {
      return {
        name: 'Airbnb',
        shortCode: 'ABNB',
        color: 'text-rose-400',
        bgColor: 'bg-rose-600/15',
        borderColor: 'border-rose-500/40',
        logoText: 'ab'
      }
    }
    if (s.includes('MMT') || s.includes('MAKEMYTRIP') || s.includes('MAKE_MY_TRIP')) {
      return {
        name: 'MakeMyTrip',
        shortCode: 'MMT',
        color: 'text-red-400',
        bgColor: 'bg-red-600/15',
        borderColor: 'border-red-500/40',
        logoText: 'MMT'
      }
    }
    if (s.includes('AGODA')) {
      return {
        name: 'Agoda',
        shortCode: 'AGDA',
        color: 'text-purple-400',
        bgColor: 'bg-purple-600/15',
        borderColor: 'border-purple-500/40',
        logoText: 'ag'
      }
    }
    if (s.includes('EXPEDIA')) {
      return {
        name: 'Expedia Group',
        shortCode: 'EXPD',
        color: 'text-amber-400',
        bgColor: 'bg-amber-600/15',
        borderColor: 'border-amber-500/40',
        logoText: 'EX'
      }
    }
    return {
      name: 'Direct / PMS',
      shortCode: 'PMS',
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-600/15',
      borderColor: 'border-emerald-500/30',
      logoText: 'PMS'
    }
  }

  // Safe date formatter
  const safeFormat = (dateVal: any, fmtStr: string = 'd MMM yyyy') => {
    if (!dateVal) return 'N/A'
    try {
      const d = typeof dateVal === 'string' ? parseISO(dateVal) : new Date(dateVal)
      if (isNaN(d.getTime())) return 'N/A'
      return format(d, fmtStr)
    } catch {
      return 'N/A'
    }
  }
  
  // Modal for Channel API Key Configuration
  const [selectedChannelForConfig, setSelectedChannelForConfig] = useState<OTAChannel | null>(null)
  const [showMasterKeyModal, setShowMasterKeyModal] = useState(false)
  
  // API Key Form State
  const [hotelIdInput, setHotelIdInput] = useState('')
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [apiSecretInput, setApiSecretInput] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [environmentInput, setEnvironmentInput] = useState<'PRODUCTION' | 'SANDBOX'>('PRODUCTION')
  const [isTestingKey, setIsTestingKey] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; details?: any } | null>(null)
  const [isSavingKey, setIsSavingKey] = useState(false)

  // Master Key Form State
  const [masterKeyInput, setMasterKeyInput] = useState('')
  const [masterProvider, setMasterProvider] = useState('CHANNEX')
  const [isSavingMasterKey, setIsSavingMasterKey] = useState(false)
  const [isSyncingChannex, setIsSyncingChannex] = useState(false)

  // Dynamic Automated Rates toggle per channel
  const [dynamicRates, setDynamicRates] = useState<Record<string, boolean>>({
    BOOKING_COM: true,
    AIRBNB: true,
    MAKEMYTRIP: true,
    AGODA: false,
    EXPEDIA: false
  })

  // Bulk Markup helper state
  const [bulkMarkupOta, setBulkMarkupOta] = useState('BOOKING_COM')

  // Map connected status from data
  const connectionMap = useMemo(() => {
    const map: Record<string, { isConnected: boolean; lastSync?: string; credentials?: any }> = {}
    if (data?.connections) {
      data.connections.forEach(conn => {
        map[conn.otaName] = {
          isConnected: conn.status === 'CONNECTED',
          lastSync: conn.lastSync || undefined,
          credentials: conn.credentials
        }
      })
    }
    return map
  }, [data?.connections])

  const connectedChannelsCount = useMemo(() => {
    return CHANNELS.filter(c => connectionMap[c.id]?.isConnected).length
  }, [connectionMap])

  const channexPropertyId = useMemo(() => {
    const conn = data?.connections?.find(c => 
      c.otaName === 'CHANNEX' || (c.credentials as any)?.channexPropertyId
    )
    return (conn?.credentials as any)?.channexPropertyId || null
  }, [data?.connections])

  // Sync initial mappings from database into local state
  useEffect(() => {
    if (!data?.rooms) return

    const initialMap: Record<string, { customRate?: number; isActive: boolean }> = {}

    data.rooms.forEach(room => {
      CHANNELS.forEach(channel => {
        const key = `${room.id}_${channel.id}`
        const mapping = (room.otaMappings || []).find(m => {
          const conn = data.connections?.find(c => c.id === m.otaConnectionId)
          return conn?.otaName === channel.id || m.otaName === channel.id
        })

        if (mapping) {
          initialMap[key] = {
            customRate: mapping.customRate !== null && mapping.customRate !== undefined 
              ? mapping.customRate 
              : Math.round(room.basePrice * (1 + channel.defaultMarkup / 100)),
            isActive: mapping.isActive !== undefined ? mapping.isActive : true
          }
        } else {
          const markupPrice = Math.round(room.basePrice * (1 + channel.defaultMarkup / 100))
          initialMap[key] = {
            customRate: markupPrice,
            isActive: true
          }
        }
      })
    })

    setRatesMap(initialMap)
  }, [data])

  // Copy live iCal link for room
  const copyIcalLink = (roomId: string, roomNumber: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const effectivePropId = propertyId && propertyId !== 'ALL' ? propertyId : (data?.rooms?.[0]?.propertyId || 'prop')
    const icalUrl = `${origin}/api/properties/${effectivePropId}/rooms/${roomId}/ical`
    navigator.clipboard.writeText(icalUrl)
    toast.success(`iCal Feed Link copied for Room #${roomNumber}!`, {
      description: 'Paste into Airbnb or Booking.com under "Sync Calendar -> Import Calendar".'
    })
  }

  // Open Channel Config Modal
  const openChannelConfig = (channel: OTAChannel) => {
    setSelectedChannelForConfig(channel)
    setTestResult(null)
    const existing = connectionMap[channel.id]?.credentials || {}
    setHotelIdInput(existing.hotelId || existing.propertyId || `${channel.defaultHotelIdPrefix}${Math.floor(10000 + Math.random() * 90000)}`)
    setApiKeyInput(existing.apiKey || existing.key || existing.token || '')
    setApiSecretInput(existing.apiSecret || '')
    setEnvironmentInput(existing.environment === 'SANDBOX' ? 'SANDBOX' : 'PRODUCTION')
  }

  // Test API Key Live
  const handleTestApiKey = async () => {
    if (!selectedChannelForConfig) return
    if (!apiKeyInput.trim()) {
      setTestResult({ success: false, message: 'Please enter an API Key to test.' })
      return
    }

    setIsTestingKey(true)
    setTestResult(null)

    try {
      const res = await fetch('/api/admin/channel-manager/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          otaName: selectedChannelForConfig.id,
          apiKey: apiKeyInput,
          hotelId: hotelIdInput,
          apiSecret: apiSecretInput,
          endpoint: environmentInput
        })
      })

      const json = await res.json()
      if (res.ok && json.success) {
        setTestResult({
          success: true,
          message: json.message || 'API Key is valid and connection handshake succeeded!',
          details: json.details
        })
        toast.success(`Verified connection with ${selectedChannelForConfig.name}!`)
      } else {
        setTestResult({
          success: false,
          message: json.error || 'Connection failed. Please check your credentials.'
        })
        toast.error('API Key validation failed')
      }
    } catch (err: any) {
      setTestResult({ success: false, message: 'Network error communicating with channel server.' })
    } finally {
      setIsTestingKey(false)
    }
  }

  // Save & Activate Channel API Key
  const handleSaveChannelKey = async () => {
    if (!selectedChannelForConfig) return
    if (!apiKeyInput.trim()) {
      toast.error('API Key cannot be blank.')
      return
    }

    setIsSavingKey(true)

    try {
      const credentials = {
        apiKey: apiKeyInput.trim(),
        hotelId: hotelIdInput.trim(),
        apiSecret: apiSecretInput.trim(),
        environment: environmentInput,
        savedAt: new Date().toISOString()
      }

      const res = await fetch('/api/admin/channel-manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId,
          otaName: selectedChannelForConfig.id,
          status: 'CONNECTED',
          credentials
        })
      })

      if (res.ok) {
        toast.success(`${selectedChannelForConfig.name} connected successfully!`, {
          description: 'Live ARI synchronization is now active for this channel.'
        })
        await mutate()
        setSelectedChannelForConfig(null)

        // Trigger immediate sync
        fetch('/api/admin/channel-manager/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ otaName: selectedChannelForConfig.id, propertyId })
        }).catch(() => {})
      } else {
        toast.error('Failed to save channel credentials.')
      }
    } catch (err) {
      console.error(err)
      toast.error('Error saving channel key.')
    } finally {
      setIsSavingKey(false)
    }
  }

  // Disconnect Channel
  const handleDisconnectChannel = async () => {
    if (!selectedChannelForConfig) return
    setIsSavingKey(true)

    try {
      const res = await fetch('/api/admin/channel-manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId,
          otaName: selectedChannelForConfig.id,
          status: 'DISCONNECTED',
          credentials: {}
        })
      })

      if (res.ok) {
        toast.info(`${selectedChannelForConfig.name} disconnected.`)
        await mutate()
        setSelectedChannelForConfig(null)
      }
    } catch (err) {
      toast.error('Failed to disconnect channel.')
    } finally {
      setIsSavingKey(false)
    }
  }

  // Save Master Key for All Channels
  const handleSaveMasterKey = async () => {
    if (!masterKeyInput.trim()) {
      toast.error('Please enter your Master Channel Manager API Key.')
      return
    }

    setIsSavingMasterKey(true)
    try {
      // Connect all 5 channels in parallel
      for (const ch of CHANNELS) {
        await fetch('/api/admin/channel-manager', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            propertyId,
            otaName: ch.id,
            status: 'CONNECTED',
            credentials: {
              apiKey: masterKeyInput.trim(),
              provider: masterProvider,
              hotelId: `${ch.defaultHotelIdPrefix}MASTER`,
              isMasterKey: true,
              savedAt: new Date().toISOString()
            }
          })
        })
      }

      toast.success('Master Key Activated!', {
        description: `Connected all ${CHANNELS.length} OTA channels simultaneously.`
      })
      await mutate()
      setShowMasterKeyModal(false)

      // Trigger full sync
      fetch('/api/admin/channel-manager/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otaName: 'ALL', propertyId })
      }).catch(() => {})

    } catch (err) {
      toast.error('Failed to apply master key.')
    } finally {
      setIsSavingMasterKey(false)
    }
  }

  // Trigger Full Two-Way Synchronization with Channex
  const handleChannexSync = async () => {
    setIsSyncingChannex(true)
    const toastId = toast.loading('Synchronizing properties and room types with Channex.io...')
    try {
      const res = await fetch('/api/admin/channel-manager/channex/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId })
      })
      const result = await res.json()
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Failed to sync with Channex')
      }
      toast.success('Channex Synchronization Successful!', {
        id: toastId,
        description: `Provisioned Property ${result.data?.channexPropertyId || ''} — Mapped ${result.data?.roomsMapped || 0} room units across ${result.data?.roomTypesSynced || 0} categories.`
      })
      await mutate()
    } catch (err: any) {
      toast.error(err.message || 'Channex sync failed', { id: toastId })
    } finally {
      setIsSyncingChannex(false)
    }
  }

  // Get cell state for a room & channel
  const getCell = (roomId: string, channelId: string, basePrice: number, defaultMarkup: number) => {
    const key = `${roomId}_${channelId}`
    if (ratesMap[key]) {
      return ratesMap[key]
    }
    const defaultRate = Math.round(basePrice * (1 + defaultMarkup / 100))
    return {
      customRate: defaultRate,
      isActive: true
    }
  }

  // Update cell rate or toggle
  const updateCell = (roomId: string, channelId: string, updates: Partial<{ customRate: number; isActive: boolean }>) => {
    const key = `${roomId}_${channelId}`
    setRatesMap(prev => {
      const current = prev[key] || { customRate: 0, isActive: true }
      return {
        ...prev,
        [key]: { ...current, ...updates }
      }
    })
    setDirtyKeys(prev => new Set(prev).add(key))
  }

  // Quick Markup across a specific OTA for all rooms
  const handleApplyBulkMarkup = (otaId: string, percent: number) => {
    setRatesMap(prev => {
      const next = { ...prev }
      rooms.forEach(room => {
        const key = `${room.id}_${otaId}`
        const newRate = Math.round(room.basePrice * (1 + percent / 100))
        next[key] = {
          ...(next[key] || { isActive: true }),
          customRate: newRate
        }
        setDirtyKeys(k => new Set(k).add(key))
      })
      return next
    })
    toast.success(`Applied +${percent}% markup on all rooms for ${CHANNELS.find(c => c.id === otaId)?.name}`)
  }

  // Toggle all rooms on/off for a channel
  const handleToggleAllForChannel = (otaId: string, enable: boolean) => {
    setRatesMap(prev => {
      const next = { ...prev }
      rooms.forEach(room => {
        const key = `${room.id}_${otaId}`
        next[key] = {
          ...(next[key] || { customRate: room.basePrice }),
          isActive: enable
        }
        setDirtyKeys(k => new Set(k).add(key))
      })
      return next
    })
    toast.info(`${enable ? 'Enabled' : 'Paused'} all room listings on ${CHANNELS.find(c => c.id === otaId)?.name}`)
  }

  // Publish / Save all changes to API and trigger ARI sync
  const handlePublishRates = async () => {
    setIsPublishing(true)
    try {
      const batch: Array<{
        otaName: string
        roomId: string
        customRate?: number
        isActive: boolean
        ratePlanCode: string
      }> = []

      rooms.forEach(room => {
        CHANNELS.forEach(channel => {
          const key = `${room.id}_${channel.id}`
          const cell = ratesMap[key]
          if (cell) {
            batch.push({
              otaName: channel.id,
              roomId: room.id,
              customRate: cell.customRate,
              isActive: cell.isActive,
              ratePlanCode: room.type.includes('CP') ? 'CP' : 'EP'
            })
          }
        })
      })

      const res = await fetch('/api/admin/channel-manager/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId,
          batch,
          publish: true
        })
      })

      if (!res.ok) {
        throw new Error('Failed to publish rates')
      }

      // Trigger ARI sync
      await fetch('/api/admin/channel-manager/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otaName: 'ALL', propertyId })
      })

      toast.success('Rates & Inventory published live!', {
        description: `Synced ${batch.length} rate points across ${CHANNELS.length} OTA channels.`
      })
      setDirtyKeys(new Set())
      mutate()
    } catch (err) {
      console.error(err)
      toast.error('Could not publish rates to channels. Check network connection.')
    } finally {
      setIsPublishing(false)
    }
  }

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    return rooms.filter(room => {
      const matchesSearch = 
        room.roomNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        room.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        room.category.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesCategory = categoryFilter === 'ALL' || room.category === categoryFilter
      return matchesSearch && matchesCategory
    })
  }, [rooms, searchQuery, categoryFilter])

  // Unique categories for filter pills
  const categories = useMemo(() => {
    const set = new Set<string>()
    rooms.forEach(r => set.add(r.category))
    return ['ALL', ...Array.from(set)]
  }, [rooms])

  // Occupancy stats
  const stats = data?.stats || {
    totalRooms: rooms.length,
    occupiedRooms: rooms.filter(r => r.status === 'OCCUPIED').length,
    availableRooms: rooms.filter(r => r.status !== 'OCCUPIED').length,
    occupancyRate: rooms.length > 0 ? Math.round((rooms.filter(r => r.status === 'OCCUPIED').length / rooms.length) * 100) : 0
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 font-sans bg-background min-h-screen text-text-primary">
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER & ACTION CONTROLS
          ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-6 border-b border-border/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs uppercase tracking-wider text-text-tertiary font-semibold flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-[#4A9EFF]" />
              Channel Manager & OTA Distribution
            </span>
            <span className="text-text-tertiary">/</span>
            <span className="text-xs text-[#4A9EFF] font-medium">Rates & Inventory Matrix</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
              Rates & Inventory
            </h1>
            <Badge variant="info" className="bg-[#4A9EFF]/10 text-[#4A9EFF] border-[#4A9EFF]/20 font-bold px-2 py-0.5 text-xs">
              Live ARI Grid
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Configure dynamic rates per channel, enter API keys for live synchronization, and toggle room stop-sells.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Master Key Button */}
          <button
            onClick={() => setShowMasterKeyModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold transition-all shadow-sm active:scale-95"
            title="Connect Master Channel Manager API Key (Channex/SiteMinder)"
          >
            <Key className="w-3.5 h-3.5" />
            <span>Connect Master API Key</span>
          </button>

          {/* Channex Sync / Status Button */}
          {channexPropertyId ? (
            <button
              onClick={handleChannexSync}
              disabled={isSyncingChannex}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 text-[#4A9EFF] border border-blue-500/35 text-xs font-bold transition-all shadow-sm active:scale-95"
              title={`Channex Property ID: ${channexPropertyId}. Click to force sync room types.`}
            >
              <Zap className={cn("w-3.5 h-3.5 text-[#4A9EFF]", isSyncingChannex && "animate-spin")} />
              <span>Channex Sync ({channexPropertyId.slice(0, 8)}...)</span>
            </button>
          ) : (
            <button
              onClick={handleChannexSync}
              disabled={isSyncingChannex}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-[#4A9EFF] border border-blue-500/25 text-xs font-bold transition-all shadow-sm active:scale-95"
              title="Bootstrap property and room types to Channex"
            >
              <Zap className={cn("w-3.5 h-3.5 text-[#4A9EFF]", isSyncingChannex && "animate-spin")} />
              <span>Sync to Channex</span>
            </button>
          )}

          {/* Connected Channels Counter Pill */}
          <div className="px-3 py-1.5 rounded-xl bg-surface border border-border text-xs font-bold text-text-secondary flex items-center gap-2">
            <span className={cn("w-2 h-2 rounded-full", connectedChannelsCount > 0 ? "bg-emerald-400 animate-pulse" : "bg-gray-500")} />
            <span>{connectedChannelsCount}/{CHANNELS.length} Channels Connected</span>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowConfig(!showConfig)}
            className="flex items-center gap-1.5 text-xs font-semibold"
          >
            <Sliders className="w-3.5 h-3.5 text-[#4A9EFF]" />
            {showConfig ? 'Hide Rules' : 'Quick Markup'}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => mutate()}
            disabled={isLoading}
            className="flex items-center gap-1.5 text-xs"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin text-[#4A9EFF]")} />
            Refresh
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={handlePublishRates}
            disabled={isPublishing || rooms.length === 0}
            className="bg-[#4A9EFF] hover:bg-[#3B82F6] text-white font-bold shadow-lg shadow-blue-500/20 px-5 flex items-center gap-2 active:scale-95"
          >
            {isPublishing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Publishing to Channels...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 fill-white" />
                Publish Rates
                {dirtyKeys.size > 0 && (
                  <span className="ml-1 bg-white text-[#4A9EFF] text-[10px] font-black rounded-full px-1.5 py-0.2">
                    {dirtyKeys.size}
                  </span>
                )}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. VIEW SWITCHER & DATE / WEEK / MONTH FILTER TOOLBAR
          ───────────────────────────────────────────────────────────── */}
      <div className="mt-5 space-y-4">
        {/* Primary View Switcher Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('BOOKINGS')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm",
                activeTab === 'BOOKINGS'
                  ? "bg-[#4A9EFF] text-white shadow-blue-500/20"
                  : "bg-surface hover:bg-surface-light border border-border text-text-secondary hover:text-text-primary"
              )}
            >
              <CalendarDays className="w-4 h-4" />
              <span>Channel Bookings</span>
              <span className={cn(
                "text-[10px] px-2 py-0.5 rounded-full font-black ml-1",
                activeTab === 'BOOKINGS' ? "bg-white text-[#4A9EFF]" : "bg-surface-light border border-border text-text-primary"
              )}>
                {filteredBookings.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('RATES')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm",
                activeTab === 'RATES'
                  ? "bg-[#4A9EFF] text-white shadow-blue-500/20"
                  : "bg-surface hover:bg-surface-light border border-border text-text-secondary hover:text-text-primary"
              )}
            >
              <Zap className="w-4 h-4" />
              <span>Rates & Inventory Matrix</span>
              <span className={cn(
                "text-[10px] px-2 py-0.5 rounded-full font-black ml-1",
                activeTab === 'RATES' ? "bg-white text-[#4A9EFF]" : "bg-surface-light border border-border text-text-primary"
              )}>
                {rooms.length} Rooms
              </span>
            </button>
          </div>

          <div className="text-xs text-text-tertiary flex items-center gap-1.5 font-mono">
            <span>Period Active:</span>
            <strong className="text-text-primary font-bold">{periodLabel}</strong>
          </div>
        </div>

        {/* ── DATE, WEEK, MONTH FILTER BAR ── */}
        <div className="bg-surface border border-border rounded-2xl p-3 sm:p-4 shadow-lg space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Left: Period Type Switcher (Date / Week / Month) & Date Navigator */}
            <div className="flex items-center flex-wrap gap-2.5">
              {/* Period Type Segmented Buttons */}
              <div className="flex items-center bg-background border border-border rounded-xl p-1 shadow-inner">
                <button
                  type="button"
                  onClick={() => setPeriodType('DATE')}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                    periodType === 'DATE'
                      ? "bg-[#4A9EFF] text-white shadow-sm"
                      : "text-text-secondary hover:text-text-primary"
                  )}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Date (Day)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPeriodType('WEEK')}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                    periodType === 'WEEK'
                      ? "bg-[#4A9EFF] text-white shadow-sm"
                      : "text-text-secondary hover:text-text-primary"
                  )}
                >
                  <CalendarRange className="w-3.5 h-3.5" />
                  <span>Week</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPeriodType('MONTH')}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                    periodType === 'MONTH'
                      ? "bg-[#4A9EFF] text-white shadow-sm"
                      : "text-text-secondary hover:text-text-primary"
                  )}
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span>Month</span>
                </button>
              </div>

              {/* Date Navigation Buttons */}
              <div className="flex items-center gap-1 bg-background border border-border rounded-xl p-1">
                <button
                  type="button"
                  onClick={handlePrevPeriod}
                  className="p-1.5 rounded-lg hover:bg-surface text-text-secondary hover:text-text-primary transition-colors"
                  title="Previous Period"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleToday}
                  className={cn(
                    "px-2.5 py-1 text-xs font-bold rounded-lg transition-colors",
                    isToday(selectedDate)
                      ? "bg-[#4A9EFF]/20 text-[#4A9EFF]"
                      : "text-text-secondary hover:text-text-primary hover:bg-surface"
                  )}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={handleNextPeriod}
                  className="p-1.5 rounded-lg hover:bg-surface text-text-secondary hover:text-text-primary transition-colors"
                  title="Next Period"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Native Date Picker */}
              <div className="relative flex items-center">
                <input
                  type="date"
                  value={format(selectedDate, 'yyyy-MM-dd')}
                  onChange={(e) => {
                    if (e.target.value) {
                      const [y, m, d] = e.target.value.split('-').map(Number)
                      setSelectedDate(new Date(y, m - 1, d))
                    }
                  }}
                  className="bg-background border border-border text-xs text-text-primary rounded-xl px-2.5 py-1.5 outline-none focus:border-[#4A9EFF] font-mono cursor-pointer"
                  title="Jump directly to specific date"
                />
              </div>

              {/* Period Label Tag */}
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/25 text-[#4A9EFF] text-xs font-bold">
                <Clock className="w-3.5 h-3.5" />
                <span>{periodLabel}</span>
              </div>
            </div>

            {/* Right: Channel Filter, Status Filter & Search */}
            <div className="flex items-center flex-wrap gap-2">
              {/* Channel Filter */}
              <select
                value={bookingChannelFilter}
                onChange={(e) => setBookingChannelFilter(e.target.value)}
                className="bg-background border border-border text-xs text-text-primary rounded-xl px-2.5 py-2 outline-none focus:border-[#4A9EFF]"
              >
                <option value="ALL">All OTA Channels</option>
                <option value="BOOKING_COM">Booking.com</option>
                <option value="AIRBNB">Airbnb</option>
                <option value="MAKEMYTRIP">MakeMyTrip</option>
                <option value="AGODA">Agoda</option>
                <option value="EXPEDIA">Expedia</option>
                <option value="DIRECT">Direct / PMS</option>
              </select>

              {/* Status Filter */}
              <select
                value={bookingStatusFilter}
                onChange={(e) => setBookingStatusFilter(e.target.value)}
                className="bg-background border border-border text-xs text-text-primary rounded-xl px-2.5 py-2 outline-none focus:border-[#4A9EFF]"
              >
                <option value="ALL">All Statuses</option>
                <option value="CHECKED_IN">Checked-In</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="CHECKED_OUT">Checked-Out</option>
                <option value="CANCELLED">Cancelled</option>
              </select>

              {/* Search Query */}
              <div className="relative min-w-[180px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                <input
                  type="text"
                  placeholder="Search guest, room #..."
                  value={bookingSearch}
                  onChange={(e) => setBookingSearch(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl pl-8 pr-3 py-2 text-xs text-text-primary outline-none focus:border-[#4A9EFF]"
                />
              </div>
            </div>
          </div>

          {/* ── PERIOD SUMMARY STATS BAR ── */}
          <div className="pt-2 border-t border-border/60 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-2.5 rounded-xl bg-surface-light border border-border/80 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-text-tertiary block">Total Bookings</span>
                <span className="text-base font-black text-text-primary">{periodStats.totalBookings}</span>
              </div>
              <Badge variant="info" className="text-[10px] font-bold">
                {periodType}
              </Badge>
            </div>

            <div className="p-2.5 rounded-xl bg-surface-light border border-border/80 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-text-tertiary block">Room Nights</span>
                <span className="text-base font-black text-text-primary">{periodStats.totalNights}</span>
              </div>
              <BedDouble className="w-4 h-4 text-text-tertiary" />
            </div>

            <div className="p-2.5 rounded-xl bg-surface-light border border-border/80 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-text-tertiary block">Channel Revenue</span>
                <span className="text-base font-black text-emerald-400 font-mono">₹{periodStats.totalRevenue.toLocaleString()}</span>
              </div>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>

            <div className="p-2.5 rounded-xl bg-surface-light border border-border/80 flex flex-col justify-center gap-1">
              <span className="text-[10px] uppercase font-bold text-text-tertiary">Channel Share</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30">
                  B: {periodStats.channelCounts.BOOKING_COM}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30">
                  AB: {periodStats.channelCounts.AIRBNB}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-red-500/10 text-red-400 border border-red-500/30">
                  MMT: {periodStats.channelCounts.MAKEMYTRIP}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-400 border border-purple-500/30">
                  AG: {periodStats.channelCounts.AGODA}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. TAB VIEW 1: CHANNEL BOOKINGS VIEW (DATE, WEEK, MONTH)
          ───────────────────────────────────────────────────────────── */}
      {activeTab === 'BOOKINGS' && (
        <div className="mt-4 space-y-4">
          {/* ── A. DATE (DAY) VIEW ── */}
          {periodType === 'DATE' && (
            <div className="space-y-4">
              {/* Day Sub-metrics: Arrivals, In-House, Departures */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(() => {
                  const arrivals = filteredBookings.filter(b => isSameDay(new Date(b.checkIn), selectedDate))
                  const departures = filteredBookings.filter(b => isSameDay(new Date(b.checkOut), selectedDate))
                  const inHouse = filteredBookings.filter(b => {
                    const cIn = new Date(b.checkIn)
                    const cOut = new Date(b.checkOut)
                    return cIn <= startOfDay(selectedDate) && cOut >= endOfDay(selectedDate)
                  })

                  return (
                    <>
                      <div className="p-3 rounded-xl bg-surface border border-border flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                            <ArrowRight className="w-4 h-4 rotate-45" />
                          </div>
                          <div>
                            <span className="text-xs text-text-tertiary block font-bold">Arrivals Today</span>
                            <span className="text-lg font-black text-text-primary">{arrivals.length} Guests</span>
                          </div>
                        </div>
                        <Badge variant="success" className="text-[10px] font-bold">Check-In</Badge>
                      </div>

                      <div className="p-3 rounded-xl bg-surface border border-border flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-[#4A9EFF] flex items-center justify-center border border-blue-500/20">
                            <BedDouble className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs text-text-tertiary block font-bold">In-House Stays</span>
                            <span className="text-lg font-black text-text-primary">{inHouse.length} Occupied</span>
                          </div>
                        </div>
                        <Badge variant="info" className="text-[10px] font-bold">Stay</Badge>
                      </div>

                      <div className="p-3 rounded-xl bg-surface border border-border flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
                            <Clock className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs text-text-tertiary block font-bold">Departures (Std 11:00 AM)</span>
                            <span className="text-lg font-black text-text-primary">{departures.length} Checking Out</span>
                          </div>
                        </div>
                        <Badge variant="warning" className="text-[10px] font-bold">Check-Out</Badge>
                      </div>
                    </>
                  )
                })()}
              </div>

              {/* Bookings Table / Card List */}
              <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-xl">
                <div className="p-4 border-b border-border bg-surface-light/40 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#4A9EFF]" />
                    <h3 className="text-sm font-bold text-text-primary">
                      Bookings on {periodLabel}
                    </h3>
                  </div>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {filteredBookings.length} Reservations
                  </Badge>
                </div>

                {isBookingsLoading ? (
                  <div className="p-12 text-center text-text-secondary">
                    <RefreshCw className="w-8 h-8 text-[#4A9EFF] animate-spin mx-auto mb-2" />
                    <p className="font-semibold text-xs">Loading channel reservations for this date...</p>
                  </div>
                ) : filteredBookings.length === 0 ? (
                  <div className="p-12 text-center text-text-secondary">
                    <Calendar className="w-10 h-10 text-text-tertiary mx-auto mb-3 opacity-50" />
                    <p className="font-bold text-text-primary text-sm">No reservations found for {periodLabel}</p>
                    <p className="text-xs text-text-secondary mt-1">
                      No guests checking in, in-house, or checking out on this date matching the selected filters.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[900px]">
                      <thead>
                        <tr className="border-b border-border bg-surface-light/60 text-[11px] font-black uppercase text-text-tertiary tracking-wider">
                          <th className="p-3.5">Guest & Contact</th>
                          <th className="p-3.5">Room</th>
                          <th className="p-3.5">Channel / Source</th>
                          <th className="p-3.5">Check-In / Check-Out</th>
                          <th className="p-3.5">Duration</th>
                          <th className="p-3.5">Tariff & Paid</th>
                          <th className="p-3.5">Status</th>
                          <th className="p-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60 text-xs">
                        {filteredBookings.map(b => {
                          const chMeta = getChannelMeta(b.source)
                          const inD = new Date(b.checkIn)
                          const outD = new Date(b.checkOut)
                          const nights = Math.max(1, Math.round((outD.getTime() - inD.getTime()) / (1000 * 60 * 60 * 24)))

                          return (
                            <tr key={b.id} className="hover:bg-surface-light/50 transition-colors">
                              <td className="p-3.5">
                                <div className="font-bold text-text-primary text-sm">
                                  {b.guest?.name || 'Guest'}
                                </div>
                                <div className="text-[11px] text-text-tertiary flex items-center gap-1.5 mt-0.5">
                                  <Phone className="w-3 h-3 text-[#4A9EFF]" />
                                  <span>{b.guest?.phone || 'No Phone'}</span>
                                  {b.guest?.companyName && (
                                    <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded font-mono ml-1">
                                      {b.guest.companyName}
                                    </span>
                                  )}
                                </div>
                              </td>

                              <td className="p-3.5">
                                <span className="font-mono font-bold text-text-primary bg-background border border-border px-2 py-0.5 rounded shadow-sm">
                                  #{b.room?.roomNumber || 'N/A'}
                                </span>
                                <span className="text-[11px] text-text-tertiary block mt-1">
                                  {b.room?.type || b.room?.category || 'Standard'}
                                </span>
                              </td>

                              <td className="p-3.5">
                                <span className={cn(
                                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border",
                                  chMeta.bgColor, chMeta.color, chMeta.borderColor
                                )}>
                                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                  {chMeta.name}
                                </span>
                              </td>

                              <td className="p-3.5">
                                <div className="flex flex-col gap-0.5 font-mono text-[11px]">
                                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                                    <ArrowRight className="w-3 h-3 rotate-45" /> {safeFormat(b.checkIn, 'dd MMM yyyy')}
                                  </span>
                                  <span className="text-amber-400 font-semibold flex items-center gap-1" title="Standard 11:00 AM Departure">
                                    <Clock className="w-3 h-3" /> {safeFormat(b.checkOut, 'dd MMM yyyy')} <span className="text-[9px] text-text-tertiary">(11:00 AM)</span>
                                  </span>
                                </div>
                              </td>

                              <td className="p-3.5 font-bold font-mono text-text-primary">
                                {nights} {nights === 1 ? 'Night' : 'Nights'}
                              </td>

                              <td className="p-3.5">
                                <div className="font-bold text-text-primary font-mono text-sm">
                                  ₹{(b.finalAmount || b.totalAmount || 0).toLocaleString()}
                                </div>
                                <div className="text-[10px] text-text-tertiary mt-0.5 flex items-center gap-1">
                                  <span>Paid: <strong className="text-emerald-400 font-mono">₹{(b.paidAmount || 0).toLocaleString()}</strong></span>
                                  {((b.finalAmount || b.totalAmount || 0) - (b.paidAmount || 0)) > 0 && (
                                    <span className="text-rose-400 font-mono font-bold">
                                      (Due ₹{((b.finalAmount || b.totalAmount || 0) - (b.paidAmount || 0)).toLocaleString()})
                                    </span>
                                  )}
                                </div>
                              </td>

                              <td className="p-3.5">
                                <span className={cn(
                                  "px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border",
                                  b.status === 'CHECKED_IN' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" :
                                  b.status === 'CONFIRMED' ? "bg-blue-500/10 text-blue-400 border-blue-500/30" :
                                  b.status === 'CHECKED_OUT' ? "bg-slate-500/10 text-slate-300 border-slate-500/30" :
                                  "bg-rose-500/10 text-rose-400 border-rose-500/30"
                                )}>
                                  {b.status.replace('_', ' ')}
                                </span>
                              </td>

                              <td className="p-3.5 text-right">
                                <button
                                  type="button"
                                  onClick={() => setSelectedBookingForDetails(b)}
                                  className="px-2.5 py-1 rounded-lg bg-surface-light hover:bg-[#4A9EFF] hover:text-white border border-border text-text-secondary text-xs font-bold transition-all shadow-sm"
                                >
                                  Dossier
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── B. WEEK (7-DAY MATRIX) VIEW ── */}
          {periodType === 'WEEK' && (
            <div className="space-y-4">
              {/* 7-Day Matrix Columns */}
              <div className="grid grid-cols-1 md:grid-cols-7 gap-2.5">
                {periodDays.map((day, idx) => {
                  const dayBookings = filteredBookings.filter(b => {
                    const cIn = new Date(b.checkIn)
                    const cOut = new Date(b.checkOut)
                    return cIn <= endOfDay(day) && cOut >= startOfDay(day)
                  })

                  const isCurrentDay = isToday(day)

                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        setSelectedDate(day)
                        setPeriodType('DATE')
                      }}
                      className={cn(
                        "rounded-xl border p-3 flex flex-col justify-between transition-all cursor-pointer hover:shadow-lg",
                        isCurrentDay 
                          ? "bg-blue-500/10 border-blue-500/50 shadow-md ring-1 ring-[#4A9EFF]/40" 
                          : "bg-surface border-border hover:border-[#4A9EFF]/40"
                      )}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className={cn("text-xs font-bold", isCurrentDay ? "text-[#4A9EFF]" : "text-text-secondary")}>
                            {format(day, 'EEE')}
                          </span>
                          <span className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-black",
                            isCurrentDay ? "bg-[#4A9EFF] text-white" : "text-text-primary"
                          )}>
                            {format(day, 'd')}
                          </span>
                        </div>

                        <div className="mt-2 text-[10px] text-text-tertiary">
                          {format(day, 'MMM yyyy')}
                        </div>

                        {/* Booking chips for that day */}
                        <div className="mt-3 space-y-1.5 max-h-[160px] overflow-y-auto custom-scrollbar">
                          {dayBookings.length === 0 ? (
                            <span className="text-[10px] text-text-tertiary/70 italic block text-center py-2">
                              No Bookings
                            </span>
                          ) : (
                            dayBookings.slice(0, 3).map(b => {
                              const ch = getChannelMeta(b.source)
                              return (
                                <div
                                  key={b.id}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedBookingForDetails(b)
                                  }}
                                  className={cn(
                                    "p-1.5 rounded-lg border text-[10px] font-bold truncate flex items-center justify-between",
                                    ch.bgColor, ch.color, ch.borderColor
                                  )}
                                  title={`${b.guest?.name || 'Guest'} - Room #${b.room?.roomNumber} (${ch.name})`}
                                >
                                  <span className="truncate">#{b.room?.roomNumber} {b.guest?.name?.split(' ')[0]}</span>
                                  <span className="text-[9px] uppercase font-black">{ch.shortCode}</span>
                                </div>
                              )
                            })
                          )}
                          {dayBookings.length > 3 && (
                            <div className="text-[10px] text-center font-bold text-[#4A9EFF]">
                              +{dayBookings.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-border/60 flex items-center justify-between text-[10px]">
                        <span className="text-text-tertiary">Active:</span>
                        <strong className="text-text-primary font-bold">{dayBookings.length}</strong>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Roster of All Bookings for this Week */}
              <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-xl">
                <div className="p-4 border-b border-border bg-surface-light/40 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarRange className="w-4 h-4 text-[#4A9EFF]" />
                    <h3 className="text-sm font-bold text-text-primary">
                      All Active Bookings in Week ({periodLabel})
                    </h3>
                  </div>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {filteredBookings.length} Total
                  </Badge>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead>
                      <tr className="border-b border-border bg-surface-light/60 text-[11px] font-black uppercase text-text-tertiary tracking-wider">
                        <th className="p-3.5">Guest</th>
                        <th className="p-3.5">Room</th>
                        <th className="p-3.5">Channel</th>
                        <th className="p-3.5">Check-In / Out</th>
                        <th className="p-3.5">Nights</th>
                        <th className="p-3.5">Amount</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 text-xs">
                      {filteredBookings.map(b => {
                        const ch = getChannelMeta(b.source)
                        const inD = new Date(b.checkIn)
                        const outD = new Date(b.checkOut)
                        const nights = Math.max(1, Math.round((outD.getTime() - inD.getTime()) / (1000 * 60 * 60 * 24)))

                        return (
                          <tr key={b.id} className="hover:bg-surface-light/50 transition-colors">
                            <td className="p-3.5">
                              <span className="font-bold text-text-primary">{b.guest?.name || 'Guest'}</span>
                              <span className="text-[11px] text-text-tertiary block font-mono">{b.guest?.phone || ''}</span>
                            </td>
                            <td className="p-3.5 font-bold font-mono">
                              #{b.room?.roomNumber || 'N/A'}
                            </td>
                            <td className="p-3.5">
                              <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold border", ch.bgColor, ch.color, ch.borderColor)}>
                                {ch.name}
                              </span>
                            </td>
                            <td className="p-3.5 font-mono text-[11px]">
                              {safeFormat(b.checkIn, 'd MMM')} $\rightarrow$ {safeFormat(b.checkOut, 'd MMM yyyy')}
                            </td>
                            <td className="p-3.5 font-mono font-bold">
                              {nights}N
                            </td>
                            <td className="p-3.5 font-mono font-bold text-text-primary">
                              ₹{(b.finalAmount || b.totalAmount || 0).toLocaleString()}
                            </td>
                            <td className="p-3.5">
                              <Badge variant={b.status === 'CHECKED_IN' ? 'success' : 'secondary'} className="text-[10px]">
                                {b.status}
                              </Badge>
                            </td>
                            <td className="p-3.5 text-right">
                              <button
                                type="button"
                                onClick={() => setSelectedBookingForDetails(b)}
                                className="px-2.5 py-1 rounded-lg bg-surface-light hover:bg-[#4A9EFF] hover:text-white border border-border text-xs font-bold transition-all"
                              >
                                Dossier
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── C. MONTH VIEW ── */}
          {periodType === 'MONTH' && (
            <div className="space-y-4">
              {/* Full Month Calendar Matrix */}
              <div className="bg-surface border border-border rounded-xl p-4 shadow-xl">
                <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
                  <h4 className="text-sm font-bold text-text-primary flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-[#4A9EFF]" />
                    {periodLabel} Calendar Schedule
                  </h4>
                  <span className="text-xs text-text-tertiary">
                    Click any day cell to view its day-wise reservations
                  </span>
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(dayName => (
                    <div key={dayName} className="text-center text-xs font-bold uppercase text-text-tertiary py-1">
                      {dayName}
                    </div>
                  ))}

                  {periodDays.map((day, dIdx) => {
                    const dayBookings = filteredBookings.filter(b => {
                      const cIn = new Date(b.checkIn)
                      const cOut = new Date(b.checkOut)
                      return cIn <= endOfDay(day) && cOut >= startOfDay(day)
                    })
                    const isCurrent = isToday(day)

                    return (
                      <div
                        key={dIdx}
                        onClick={() => {
                          setSelectedDate(day)
                          setPeriodType('DATE')
                        }}
                        className={cn(
                          "min-h-[70px] p-2 rounded-xl border flex flex-col justify-between cursor-pointer transition-all hover:border-[#4A9EFF]",
                          isCurrent ? "bg-blue-500/10 border-blue-500/40 ring-1 ring-[#4A9EFF]" : "bg-surface-light/40 border-border/80 hover:bg-surface-light"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className={cn("text-xs font-mono font-bold", isCurrent ? "text-[#4A9EFF]" : "text-text-primary")}>
                            {format(day, 'd')}
                          </span>
                          {dayBookings.length > 0 && (
                            <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-[#4A9EFF]/20 text-[#4A9EFF]">
                              {dayBookings.length}
                            </span>
                          )}
                        </div>

                        {/* Dot indicators for channels */}
                        <div className="flex items-center gap-1 flex-wrap mt-1">
                          {dayBookings.slice(0, 4).map((b, bIdx) => {
                            const ch = getChannelMeta(b.source)
                            return (
                              <span
                                key={bIdx}
                                className={cn("w-2 h-2 rounded-full", ch.bgColor, "border", ch.borderColor)}
                                title={`${ch.name}: Room #${b.room?.roomNumber}`}
                              />
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Month Bookings Summary Table */}
              <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-xl">
                <div className="p-4 border-b border-border bg-surface-light/40 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-[#4A9EFF]" />
                    <h3 className="text-sm font-bold text-text-primary">
                      All Bookings in {periodLabel}
                    </h3>
                  </div>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {filteredBookings.length} Bookings
                  </Badge>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead>
                      <tr className="border-b border-border bg-surface-light/60 text-[11px] font-black uppercase text-text-tertiary tracking-wider">
                        <th className="p-3.5">Guest & Contact</th>
                        <th className="p-3.5">Room</th>
                        <th className="p-3.5">Channel</th>
                        <th className="p-3.5">Stay Dates</th>
                        <th className="p-3.5">Tariff</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 text-xs">
                      {filteredBookings.map(b => {
                        const ch = getChannelMeta(b.source)
                        return (
                          <tr key={b.id} className="hover:bg-surface-light/50 transition-colors">
                            <td className="p-3.5">
                              <span className="font-bold text-text-primary">{b.guest?.name || 'Guest'}</span>
                              <span className="text-[11px] text-text-tertiary block font-mono">{b.guest?.phone || ''}</span>
                            </td>
                            <td className="p-3.5 font-mono font-bold">
                              #{b.room?.roomNumber || 'N/A'}
                            </td>
                            <td className="p-3.5">
                              <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold border", ch.bgColor, ch.color, ch.borderColor)}>
                                {ch.name}
                              </span>
                            </td>
                            <td className="p-3.5 font-mono text-[11px]">
                              {safeFormat(b.checkIn, 'd MMM')} $\rightarrow$ {safeFormat(b.checkOut, 'd MMM yyyy')}
                            </td>
                            <td className="p-3.5 font-mono font-bold text-emerald-400">
                              ₹{(b.finalAmount || b.totalAmount || 0).toLocaleString()}
                            </td>
                            <td className="p-3.5">
                              <Badge variant={b.status === 'CHECKED_IN' ? 'success' : 'secondary'} className="text-[10px]">
                                {b.status}
                              </Badge>
                            </td>
                            <td className="p-3.5 text-right">
                              <button
                                type="button"
                                onClick={() => setSelectedBookingForDetails(b)}
                                className="px-2.5 py-1 rounded-lg bg-surface-light hover:bg-[#4A9EFF] hover:text-white border border-border text-xs font-bold transition-all"
                              >
                                Dossier
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. TAB VIEW 2: RATES & INVENTORY MATRIX (ARI GRID)
          ───────────────────────────────────────────────────────────── */}
      {activeTab === 'RATES' && (
        <div className="mt-4 space-y-4">
          {/* Active Period Notice */}
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-between text-xs text-[#4A9EFF]">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              <span>
                Configuring Rates & Stop-sells for active period: <strong>{periodLabel}</strong> ({periodType})
              </span>
            </div>
            <span className="text-[10px] uppercase font-mono font-bold text-text-tertiary">
              Live ARI Push Enabled
            </span>
          </div>

          {/* Collapsible Rate Config & Bulk Markup Panel */}
          {showConfig && (
            <div className="p-4 rounded-xl bg-surface border border-border animate-fade-in shadow-lg">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-text-primary flex items-center gap-2">
                    <Percent className="w-4 h-4 text-[#4A9EFF]" />
                    Quick Channel Markup & Batch Rules
                  </h4>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Automatically calculate and apply OTA commission markups or toggle room listings in bulk.
                  </p>
                </div>

                <div className="flex items-center flex-wrap gap-3">
                  {/* Select OTA */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-tertiary">Channel:</span>
                    <select
                      value={bulkMarkupOta}
                      onChange={(e) => setBulkMarkupOta(e.target.value)}
                      className="bg-background border border-border text-xs text-text-primary rounded-lg px-2.5 py-1.5 outline-none focus:border-[#4A9EFF]"
                    >
                      {CHANNELS.map(ch => (
                        <option key={ch.id} value={ch.id}>{ch.name} ({ch.commission})</option>
                      ))}
                    </select>
                  </div>

                  {/* Markup % */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-text-tertiary">Markup:</span>
                    <div className="flex items-center gap-1">
                      {[0, 10, 15, 18, 20].map(pct => (
                        <button
                          key={pct}
                          onClick={() => handleApplyBulkMarkup(bulkMarkupOta, pct)}
                          className={cn(
                            "text-xs px-2.5 py-1 rounded-md font-bold transition-all border",
                            pct === 0
                              ? "bg-surface border-border hover:border-text-secondary text-text-secondary"
                              : "bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20"
                          )}
                        >
                          {pct === 0 ? 'Base (0%)' : `+${pct}%`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Global Channel Enable/Disable */}
                  <div className="border-l border-border pl-3 flex items-center gap-2">
                    <button
                      onClick={() => handleToggleAllForChannel(bulkMarkupOta, true)}
                      className="text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 px-2.5 py-1 rounded-md font-bold flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" /> List All
                    </button>
                    <button
                      onClick={() => handleToggleAllForChannel(bulkMarkupOta, false)}
                      className="text-xs bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 px-2.5 py-1 rounded-md font-bold flex items-center gap-1"
                    >
                      <EyeOff className="w-3 h-3" /> Stop-Sell All
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Search & Category Filter Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
                    categoryFilter === cat
                      ? "bg-[#4A9EFF] text-white shadow-sm"
                      : "bg-surface text-text-secondary hover:text-text-primary hover:bg-surface-light border border-border"
                  )}
                >
                  {cat === 'ALL' ? 'All Room Types' : cat}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative w-full md:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
              <input
                type="text"
                placeholder="Search room number or type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface border border-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-text-primary outline-none focus:border-[#4A9EFF] transition-colors"
              />
            </div>
          </div>

          {/* THE MAIN RATES & INVENTORY MATRIX TABLE */}
          <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1200px]">
                {/* ── TABLE HEAD: CHANNELS WITH LIVE API CONNECTIVITY STATUS ── */}
                <thead>
                  <tr className="border-b border-border">
                    {/* Room Info Corner Cell */}
                    <th className="p-3.5 sm:p-4 text-xs font-bold uppercase tracking-wider text-text-secondary w-[280px] min-w-[280px] max-w-[280px] sticky left-0 bg-surface z-30 border-r border-border shadow-[4px_0_12px_rgba(0,0,0,0.06)] dark:shadow-[4px_0_12px_rgba(0,0,0,0.5)]">
                      <div className="flex items-center justify-between">
                        <span>Room Type & Rate Plan</span>
                        <Badge variant="secondary" className="text-[10px] font-bold">
                          {filteredRooms.length} Rooms
                        </Badge>
                      </div>
                    </th>

                    {/* OTA Channels as Columns - Interactive Click to Configure API Key */}
                    {CHANNELS.map(channel => {
                      const isConnected = connectionMap[channel.id]?.isConnected
                      return (
                        <th 
                          key={channel.id} 
                          onClick={() => openChannelConfig(channel)}
                          className="p-3 sm:p-4 text-xs font-bold text-center border-r border-border last:border-r-0 min-w-[185px] bg-surface-light/80 hover:bg-surface-light transition-colors cursor-pointer select-none group"
                          title="Click to configure API Key & Channel credentials"
                        >
                          <div className="flex flex-col items-center gap-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black border", channel.bgColor, channel.color, channel.borderColor)}>
                                {channel.logoText}
                              </span>
                              <span className="font-bold text-text-primary text-xs group-hover:text-[#4A9EFF] transition-colors">{channel.name}</span>
                            </div>

                            <span className="text-[10px] text-text-tertiary font-mono">
                              {channel.commission}
                            </span>

                            {/* Interactive Connection Badge */}
                            <div className="pt-0.5">
                              {isConnected ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                  CONNECTED
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 group-hover:bg-blue-500/20 text-[10px] font-bold transition-all">
                                  <Key className="w-2.5 h-2.5" />
                                  CONNECT KEY
                                </span>
                              )}
                            </div>
                          </div>
                        </th>
                      )
                    })}
                  </tr>

                  {/* ── DYNAMIC RATES ROW ── */}
                  <tr className="border-b border-border text-xs">
                    <th className="p-3 w-[280px] min-w-[280px] max-w-[280px] sticky left-0 bg-surface z-30 border-r border-border font-semibold text-text-secondary shadow-[4px_0_12px_rgba(0,0,0,0.06)] dark:shadow-[4px_0_12px_rgba(0,0,0,0.5)]">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-[#4A9EFF]" />
                        <span className="font-bold text-text-primary">Dynamic Automated Rates</span>
                      </div>
                    </th>

                    {CHANNELS.map(ch => {
                      const isDyn = dynamicRates[ch.id]
                      return (
                        <td key={ch.id} className="p-3 text-center border-r border-border last:border-r-0 bg-surface-light/40">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              role="switch"
                              aria-checked={isDyn}
                              onClick={() => setDynamicRates(prev => ({ ...prev, [ch.id]: !prev[ch.id] }))}
                              className={cn(
                                "w-10 h-5 flex items-center rounded-full p-0.5 transition-colors duration-200 focus:outline-none cursor-pointer flex-shrink-0",
                                isDyn ? "bg-[#4A9EFF]" : "bg-slate-300 dark:bg-slate-700"
                              )}
                              title={`Toggle dynamic rates for ${ch.name}`}
                            >
                              <div
                                className={cn(
                                  "bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200",
                                  isDyn ? "translate-x-5" : "translate-x-0"
                                )}
                              />
                            </button>
                            <span className={cn("text-[10px] font-bold font-mono", isDyn ? "text-[#4A9EFF]" : "text-text-tertiary")}>
                              {isDyn ? 'ON' : 'OFF'}
                            </span>
                          </div>
                        </td>
                      )
                    })}
                  </tr>

                  {/* ── OCCUPANCY & AVAILABILITY ROW ── */}
                  <tr className="border-b border-border text-[11px] text-text-secondary">
                    <th className="p-3 w-[280px] min-w-[280px] max-w-[280px] sticky left-0 bg-surface z-30 border-r border-border font-normal shadow-[4px_0_12px_rgba(0,0,0,0.06)] dark:shadow-[4px_0_12px_rgba(0,0,0,0.5)]">
                      <div className="flex items-center justify-between text-xs text-text-tertiary">
                        <span>Available Rooms / Occupancy</span>
                        <span className="font-bold text-text-primary">
                          {stats.availableRooms} Avail ({stats.occupancyRate}%)
                        </span>
                      </div>
                    </th>
                    {CHANNELS.map(ch => (
                      <td key={ch.id} className="p-2.5 text-center border-r border-border last:border-r-0 font-mono bg-surface-light/20">
                        <span className="font-bold text-text-primary">{stats.availableRooms}</span>
                        <span className="text-[10px] text-emerald-400 block font-sans">({stats.occupancyRate}% Occ)</span>
                      </td>
                    ))}
                  </tr>
                </thead>

                {/* ── TABLE BODY: ROOM ROWS ── */}
                <tbody className="divide-y divide-border/60">
                  {isLoading ? (
                    <tr>
                      <td colSpan={CHANNELS.length + 1} className="p-12 text-center text-text-secondary">
                        <RefreshCw className="w-8 h-8 text-[#4A9EFF] animate-spin mx-auto mb-2" />
                        <p className="font-semibold">Loading real-time room inventory...</p>
                      </td>
                    </tr>
                  ) : filteredRooms.length === 0 ? (
                    <tr>
                      <td colSpan={CHANNELS.length + 1} className="p-12 text-center text-text-secondary">
                        <BedDouble className="w-10 h-10 text-text-tertiary mx-auto mb-3 opacity-60" />
                        <p className="font-bold text-text-primary text-base">No rooms found in property inventory</p>
                        <p className="text-xs text-text-secondary mt-1 max-w-md mx-auto">
                          Add rooms to your hotel under the Rooms management module to configure live channel rates and distribution.
                        </p>
                        <div className="mt-4">
                          <Link href="/admin/rooms">
                            <Button variant="primary" size="sm" className="inline-flex items-center gap-1.5 bg-[#4A9EFF]">
                              <Plus className="w-4 h-4" /> Add Room to Inventory
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredRooms.map(room => (
                      <tr key={room.id} className="hover:bg-surface-light/60 transition-colors group">
                        {/* Sticky Room Details Column */}
                        <td className="p-3.5 sm:p-4 w-[280px] min-w-[280px] max-w-[280px] sticky left-0 bg-surface group-hover:bg-surface-light/60 z-20 border-r border-border shadow-[4px_0_12px_rgba(0,0,0,0.06)] dark:shadow-[4px_0_12px_rgba(0,0,0,0.5)]">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-text-primary bg-background border border-border px-1.5 py-0.5 rounded shadow-sm">
                                #{room.roomNumber}
                              </span>
                              <span className="font-bold text-sm text-text-primary tracking-tight truncate">
                                {room.type}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 mt-1.5">
                              <Badge variant="secondary" className="text-[10px] font-medium py-0 px-1.5">
                                {room.category}
                              </Badge>
                              <span className="text-[11px] text-text-tertiary">
                                Base: <strong className="text-text-primary font-mono">₹{room.basePrice.toLocaleString()}</strong>
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => copyIcalLink(room.id, room.roomNumber)}
                              className="mt-2.5 inline-flex items-center gap-1.5 text-[10px] font-bold text-[#4A9EFF] hover:text-white bg-[#4A9EFF]/10 hover:bg-[#4A9EFF]/25 border border-[#4A9EFF]/30 px-2 py-1 rounded-md transition-all cursor-pointer w-fit shadow-sm"
                              title="Copy live iCal link to paste into Airbnb / Booking.com calendar sync"
                            >
                              <Link2 className="w-3 h-3 text-[#4A9EFF]" />
                              <span>Copy Free iCal Feed</span>
                            </button>

                            {(() => {
                              const chMapping = (room.otaMappings || []).find((m: any) => {
                                const c = data?.connections?.find((conn: any) => conn.id === m.otaConnectionId)
                                return c?.otaName === 'CHANNEX' || (m.otaRoomId && m.otaRoomId.length > 20)
                              })
                              if (chMapping?.otaRoomId) {
                                return (
                                  <div 
                                    className="mt-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-[9px] font-mono text-emerald-400 font-bold w-fit"
                                    title={`Channex Room ID: ${chMapping.otaRoomId}`}
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                                    <span className="truncate max-w-[170px]">Channex: {chMapping.otaRoomId.slice(0, 10)}...</span>
                                  </div>
                                )
                              }
                              return null
                            })()}
                          </div>
                        </td>

                        {/* Channel-Specific Columns: Rent Input & Toggle Switch */}
                        {CHANNELS.map(channel => {
                          const cell = getCell(room.id, channel.id, room.basePrice, channel.defaultMarkup)
                          const isActive = cell.isActive
                          const rate = cell.customRate ?? room.basePrice
                          const diffPercent = room.basePrice > 0 ? Math.round(((rate - room.basePrice) / room.basePrice) * 100) : 0
                          const isDirty = dirtyKeys.has(`${room.id}_${channel.id}`)

                          return (
                            <td
                              key={channel.id}
                              className={cn(
                                "p-2.5 sm:p-3 text-center border-r border-border last:border-r-0 transition-colors",
                                !isActive && "bg-slate-100/70 dark:bg-black/30"
                              )}
                            >
                              <div className="flex flex-col items-center gap-2 max-w-[155px] mx-auto">
                                {/* 1. CHANNEL VISIBILITY / STOP-SELL TOGGLE SWITCH */}
                                <div className="flex items-center justify-between w-full px-1">
                                  <span className={cn(
                                    "text-[10px] font-bold uppercase tracking-wider flex items-center gap-1",
                                    isActive ? "text-emerald-400" : "text-rose-400 font-black"
                                  )}>
                                    {isActive ? (
                                      <>
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                        LIVE
                                      </>
                                    ) : (
                                      <>
                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                                        STOP SELL
                                      </>
                                    )}
                                  </span>

                                  <button
                                    type="button"
                                    role="switch"
                                    aria-checked={isActive}
                                    onClick={() => updateCell(room.id, channel.id, { isActive: !isActive })}
                                    className={cn(
                                      "w-9 h-5 flex items-center rounded-full p-0.5 transition-colors duration-200 focus:outline-none cursor-pointer flex-shrink-0",
                                      isActive ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
                                    )}
                                    title={isActive ? `Disable listing on ${channel.name}` : `Enable listing on ${channel.name}`}
                                  >
                                    <div
                                      className={cn(
                                        "bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200",
                                        isActive ? "translate-x-4" : "translate-x-0"
                                      )}
                                    />
                                  </button>
                                </div>

                                {/* 2. RENT / PRICE INPUT BOX */}
                                <div className="w-full relative">
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-text-tertiary font-bold">
                                    ₹
                                  </span>
                                  <input
                                    type="number"
                                    disabled={!isActive}
                                    value={rate}
                                    onChange={(e) => {
                                      const val = e.target.value === '' ? 0 : Number(e.target.value)
                                      updateCell(room.id, channel.id, { customRate: val })
                                    }}
                                    className={cn(
                                      "w-full bg-background border text-xs font-mono font-bold rounded-lg pl-6 pr-2 py-1.5 text-center outline-none transition-all shadow-inner",
                                      isDirty ? "border-amber-400/80 bg-amber-500/10 text-amber-600 dark:text-amber-300" : "border-border text-text-primary focus:border-[#4A9EFF]",
                                      !isActive && "cursor-not-allowed bg-slate-100 dark:bg-black/40 text-text-tertiary line-through border-border/40"
                                    )}
                                  />
                                </div>

                                {/* 3. MARKUP COMPARISON / QUICK RESET */}
                                <div className="flex items-center justify-between w-full px-1 text-[10px]">
                                  {isActive ? (
                                    <>
                                      <span className={cn(
                                        "font-mono font-bold px-1 py-0.2 rounded",
                                        diffPercent > 0 
                                          ? "text-emerald-400 bg-emerald-500/10" 
                                          : diffPercent < 0 
                                          ? "text-rose-400 bg-rose-500/10" 
                                          : "text-text-tertiary bg-surface-light border border-border/60"
                                      )}>
                                        {diffPercent > 0 ? `+${diffPercent}%` : diffPercent < 0 ? `${diffPercent}%` : 'Match Base'}
                                      </span>

                                      <button
                                        type="button"
                                        onClick={() => updateCell(room.id, channel.id, { customRate: room.basePrice })}
                                        className="text-text-tertiary hover:text-[#4A9EFF] transition-colors p-0.5"
                                        title="Reset to Base PMS Rate"
                                      >
                                        <RotateCcw className="w-2.5 h-2.5" />
                                      </button>
                                    </>
                                  ) : (
                                    <span className="text-[10px] text-rose-400/80 font-semibold w-full text-center">
                                      Disabled on {channel.shortCode}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* ── FOOTER STATUS BAR ── */}
            <div className="p-3.5 bg-surface-light/80 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-text-secondary">
              <div className="flex items-center gap-2">
                <span className={cn("w-2 h-2 rounded-full", connectedChannelsCount > 0 ? "bg-emerald-400 animate-pulse" : "bg-gray-500")}></span>
                <span>
                  Real-time ARI Sync {connectedChannelsCount > 0 ? `Active across ${connectedChannelsCount} Connected Channels` : 'Ready — Click any column to connect API Key'}
                </span>
              </div>

              <div className="flex items-center gap-4">
                {dirtyKeys.size > 0 ? (
                  <span className="text-amber-400 font-semibold flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {dirtyKeys.size} unsaved rate modifications
                  </span>
                ) : (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />
                    All rates synced with channels
                  </span>
                )}

                <Button
                  variant="primary"
                  size="sm"
                  onClick={handlePublishRates}
                  disabled={isPublishing || rooms.length === 0}
                  className="bg-[#4A9EFF] hover:bg-[#3B82F6] text-white font-bold px-4 active:scale-95"
                >
                  {isPublishing ? 'Publishing...' : 'Publish Rates'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          5. CHANNEL API KEY & CREDENTIALS MODAL
          ───────────────────────────────────────────────────────────── */}
      {selectedChannelForConfig && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-3xl w-full max-w-xl flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-text-primary">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-border bg-surface-light/60 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-black border", selectedChannelForConfig.bgColor, selectedChannelForConfig.color, selectedChannelForConfig.borderColor)}>
                  {selectedChannelForConfig.logoText}
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight text-text-primary flex items-center gap-2">
                    Connect {selectedChannelForConfig.name}
                  </h3>
                  <p className="text-xs text-text-tertiary">
                    Live ARI Push, Inventory Distribution & Rate Synchronization
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setSelectedChannelForConfig(null)}
                className="p-2 rounded-xl hover:bg-surface-light text-text-tertiary hover:text-text-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto custom-scrollbar">
              
              {/* Channel Guidance Alert */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex items-start gap-3">
                <Globe className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed text-text-secondary">
                  <p className="font-semibold text-text-primary mb-0.5">Where to get your API Key:</p>
                  <span>
                    Copy your Hotel ID and Channel Manager API Key from your {selectedChannelForConfig.name} Extranet Portal (Account $\rightarrow$ Channel Manager Settings).
                  </span>
                  <a 
                    href={selectedChannelForConfig.extranetUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="inline-flex items-center gap-1 text-[#4A9EFF] font-bold hover:underline ml-2 mt-1"
                  >
                    Open Extranet <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Form Inputs */}
              <div className="space-y-4">
                {/* Hotel ID / Property Code */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-text-tertiary block mb-1">
                    Hotel Code / Property ID
                  </label>
                  <input
                    type="text"
                    value={hotelIdInput}
                    onChange={e => setHotelIdInput(e.target.value)}
                    placeholder={`e.g. ${selectedChannelForConfig.defaultHotelIdPrefix}98421`}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-text-primary font-mono outline-none focus:border-[#4A9EFF] transition-colors"
                  />
                </div>

                {/* iCal Free Sync Helper */}
                {['AIRBNB', 'BOOKING_COM', 'AGODA'].includes(selectedChannelForConfig.id) && (
                  <div className="bg-[#4A9EFF]/10 border border-[#4A9EFF]/25 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#4A9EFF] flex items-center gap-1.5">
                        <Link2 className="w-3.5 h-3.5" /> Free 2-Way Calendar Sync (iCal)
                      </span>
                      <span className="text-[10px] uppercase font-black bg-emerald-500/20 text-emerald-500 dark:text-emerald-400 px-2 py-0.5 rounded">
                        100% Free
                      </span>
                    </div>
                    <p className="text-[11px] text-text-secondary leading-relaxed">
                      You can paste your {selectedChannelForConfig.name} Export Calendar URL (ending in <code className="text-[#4A9EFF] font-mono">.ics</code>) into the field below. StayIn will sync availability and block booked dates automatically.
                    </p>
                  </div>
                )}

                {/* API Key / Token */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-text-tertiary">
                      {['AIRBNB', 'BOOKING_COM', 'AGODA'].includes(selectedChannelForConfig.id)
                        ? 'API Key OR Calendar .ics URL'
                        : 'API Key / Partner Access Token'} <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="text-[10px] text-text-tertiary hover:text-text-primary flex items-center gap-1"
                    >
                      {showApiKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      {showApiKey ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <div className="relative">
                    <Key className="w-4 h-4 text-text-tertiary absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={apiKeyInput}
                      onChange={e => setApiKeyInput(e.target.value)}
                      placeholder={
                        ['AIRBNB', 'BOOKING_COM', 'AGODA'].includes(selectedChannelForConfig.id)
                          ? "Paste API Key OR Calendar URL (https://www.airbnb.com/calendar/ical/...ics)"
                          : "Paste your channel API Key or Token here..."
                      }
                      className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-3 text-sm text-text-primary font-mono outline-none focus:border-[#4A9EFF] transition-colors"
                    />
                  </div>
                  <p className="text-[10px] text-text-tertiary mt-1">
                    {['AIRBNB', 'BOOKING_COM', 'AGODA'].includes(selectedChannelForConfig.id)
                      ? 'Accepts both direct API Tokens and native .ics calendar feeds.'
                      : 'Keys are securely stored and encrypted in the hotel property context.'}
                  </p>
                </div>

                {/* API Secret / Webhook Signature (Optional) */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-text-tertiary block mb-1">
                    API Secret / Partner Secret (Optional)
                  </label>
                  <input
                    type="password"
                    value={apiSecretInput}
                    onChange={e => setApiSecretInput(e.target.value)}
                    placeholder="Optional secret or private cert key"
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-xs text-text-primary font-mono outline-none focus:border-[#4A9EFF] transition-colors"
                  />
                </div>

                {/* Environment Selector */}
                <div className="flex items-center gap-3 pt-1">
                  <span className="text-xs text-text-tertiary font-bold">Environment:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEnvironmentInput('PRODUCTION')}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                        environmentInput === 'PRODUCTION'
                          ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-500 dark:text-emerald-400 font-extrabold"
                          : "bg-surface border-border text-text-tertiary hover:text-text-primary"
                      )}
                    >
                      ● Live Production
                    </button>
                    <button
                      type="button"
                      onClick={() => setEnvironmentInput('SANDBOX')}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                        environmentInput === 'SANDBOX'
                          ? "bg-amber-500/20 border-amber-500/40 text-amber-600 dark:text-amber-400 font-extrabold"
                          : "bg-surface border-border text-text-tertiary hover:text-text-primary"
                      )}
                    >
                      Sandbox Test
                    </button>
                  </div>
                </div>
              </div>

              {/* Live Test Feedback Banner */}
              {testResult && (
                <div className={cn(
                  "p-4 rounded-2xl border text-xs leading-relaxed animate-fade-in",
                  testResult.success 
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-300"
                    : "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-300"
                )}>
                  <div className="flex items-center gap-2 font-bold mb-1">
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-500 dark:text-rose-400 flex-shrink-0" />
                    )}
                    <span>{testResult.message}</span>
                  </div>
                  {testResult.details && (
                    <div className="mt-2 text-[10px] font-mono bg-surface-light p-2.5 rounded-xl border border-border space-y-1">
                      <div>Handshake: {testResult.details.handshake}</div>
                      <div>Features: {testResult.details.features?.join(', ')}</div>
                      <div>Provider: {testResult.details.provider}</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="p-5 border-t border-border bg-surface-light/60 flex items-center justify-between gap-3">
              <div>
                {connectionMap[selectedChannelForConfig.id]?.isConnected && (
                  <button
                    type="button"
                    onClick={handleDisconnectChannel}
                    disabled={isSavingKey}
                    className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 dark:text-rose-400 text-xs font-bold transition-colors"
                  >
                    Disconnect Channel
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleTestApiKey}
                  disabled={isTestingKey || !apiKeyInput.trim()}
                  className="px-4 py-2.5 rounded-xl bg-surface hover:bg-surface-light border border-border text-text-primary text-xs font-bold transition-colors flex items-center gap-2"
                >
                  {isTestingKey ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <Wifi className="w-3.5 h-3.5 text-[#4A9EFF]" />
                      Test Connection
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleSaveChannelKey}
                  disabled={isSavingKey || !apiKeyInput.trim()}
                  className="px-5 py-2.5 rounded-xl bg-[#4A9EFF] hover:bg-[#3B82F6] text-white text-xs font-black shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
                >
                  {isSavingKey ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Save & Activate Channel
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          6. MASTER CHANNEL MANAGER API KEY MODAL
          ───────────────────────────────────────────────────────────── */}
      {showMasterKeyModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-3xl w-full max-w-lg p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200 text-text-primary">
            <div className="flex justify-between items-start border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-500 dark:text-amber-400 flex items-center justify-center border border-amber-500/30">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-text-primary">Master Channel Manager Key</h3>
                  <p className="text-xs text-text-tertiary">Activate all 5 OTA channels with a single Master API Key</p>
                </div>
              </div>
              <button onClick={() => setShowMasterKeyModal(false)} className="p-1.5 hover:bg-surface-light rounded-xl text-text-tertiary hover:text-text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-text-tertiary block mb-1">
                  Select Channel Manager Provider
                </label>
                <select
                  value={masterProvider}
                  onChange={e => setMasterProvider(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-xs text-text-primary outline-none focus:border-[#4A9EFF]"
                >
                  <option value="CHANNEX">Channex.io (Global Two-way Gateway)</option>
                  <option value="SITEMINDER">SiteMinder (Direct ARI Exchange)</option>
                  <option value="RATEGAIN">RateGain DHISCO</option>
                  <option value="OMNIBEES">Omnibees Channel Switch</option>
                  <option value="INGOMMT">InGoMMT Unified Enterprise Gateway</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-text-tertiary block mb-1">
                  Master API Key / Token
                </label>
                <input
                  type="password"
                  value={masterKeyInput}
                  onChange={e => setMasterKeyInput(e.target.value)}
                  placeholder="Paste your Master Channel Manager Key..."
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-xs text-text-primary font-mono outline-none focus:border-[#4A9EFF]"
                />
                <p className="text-[10px] text-text-tertiary mt-1">
                  Applying this key will connect Booking.com, Airbnb, MakeMyTrip, Agoda, and Expedia simultaneously.
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowMasterKeyModal(false)}
                className="flex-1 py-3 rounded-xl bg-surface-light hover:bg-surface border border-border text-text-primary text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveMasterKey}
                disabled={isSavingMasterKey || !masterKeyInput.trim()}
                className="flex-[2] py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-black text-xs font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
              >
                {isSavingMasterKey ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Activate All Channels
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          GUEST DOSSIER MODAL (From Room Grid or Booking Dossier button)
          ───────────────────────────────────────────────────────────── */}
      {selectedBookingForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-[#0F172A] border border-white/10 rounded-2xl p-6 shadow-2xl relative text-white space-y-5">
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-blue-500/20 text-[#4A9EFF] font-mono font-bold text-xs border border-blue-500/30">
                    Room #{selectedBookingForDetails.room?.roomNumber || 'N/A'}
                  </span>
                  <span className="text-xs text-text-tertiary">
                    {selectedBookingForDetails.room?.type || 'Standard Room'}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mt-1">
                  {selectedBookingForDetails.guest?.name || 'Valued Guest'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBookingForDetails(null)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[#131D31] border border-white/5">
                <span className="text-[10px] text-white/50 uppercase font-black tracking-wider block mb-0.5">Phone Number</span>
                <span className="font-mono font-bold text-white">{selectedBookingForDetails.guest?.phone || 'Not provided'}</span>
              </div>
              <div className="p-3 rounded-xl bg-[#131D31] border border-white/5">
                <span className="text-[10px] text-white/50 uppercase font-black tracking-wider block mb-0.5">Channel Source</span>
                <span className="font-bold text-amber-400">{getChannelMeta(selectedBookingForDetails.source).name}</span>
              </div>
              <div className="p-3 rounded-xl bg-[#131D31] border border-white/5">
                <span className="text-[10px] text-white/50 uppercase font-black tracking-wider block mb-0.5">Check-In</span>
                <span className="font-mono font-bold text-emerald-400">{safeFormat(selectedBookingForDetails.checkIn, 'dd MMM yyyy')}</span>
              </div>
              <div className="p-3 rounded-xl bg-[#131D31] border border-white/5">
                <span className="text-[10px] text-white/50 uppercase font-black tracking-wider block mb-0.5">Check-Out (Std 11:00 AM)</span>
                <span className="font-mono font-bold text-rose-400">{safeFormat(selectedBookingForDetails.checkOut, 'dd MMM yyyy')} (11:00 AM)</span>
              </div>
              <div className="p-3 rounded-xl bg-[#131D31] border border-white/5">
                <span className="text-[10px] text-white/50 uppercase font-black tracking-wider block mb-0.5">Total Tariff</span>
                <span className="font-mono font-bold text-white text-sm">₹{(selectedBookingForDetails.finalAmount || selectedBookingForDetails.totalAmount || 0).toLocaleString()}</span>
              </div>
              <div className="p-3 rounded-xl bg-[#131D31] border border-white/5">
                <span className="text-[10px] text-white/50 uppercase font-black tracking-wider block mb-0.5">Status</span>
                <span className="font-bold text-blue-400">{selectedBookingForDetails.status}</span>
              </div>
            </div>

            {selectedBookingForDetails.notes && (
              <div className="p-3 rounded-xl bg-[#0B1120] border border-white/5 text-xs text-white/70">
                <span className="text-[10px] font-black uppercase tracking-wider text-white/40 block mb-1">Guest Notes</span>
                {selectedBookingForDetails.notes}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedBookingForDetails(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold transition-colors"
              >
                Close
              </button>
              <a
                href="/admin/bookings"
                className="flex-1 py-2.5 rounded-xl bg-[#4A9EFF] hover:bg-blue-600 text-white text-xs font-bold text-center transition-colors flex items-center justify-center gap-1.5"
              >
                Open in PMS Bookings
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
