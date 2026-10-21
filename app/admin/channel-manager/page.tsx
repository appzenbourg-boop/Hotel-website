'use client'

import React, { useState, useEffect, useMemo } from 'react'
import useSWR from 'swr'
import {
  Globe, CheckCircle2, AlertCircle, RefreshCw, Search, Sliders,
  ArrowUpRight, DollarSign, Percent, Save, Layers, BedDouble,
  ChevronDown, ChevronRight, Sparkles, Filter, ShieldCheck, Zap,
  TrendingUp, Check, Info, Lock, Eye, EyeOff, RotateCcw, Plus,
  Key, X, ExternalLink, Wifi, WifiOff, Link2
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import { buildContextUrl, getAdminContext } from '@/lib/admin-context'

const fetcher = (url: string) => fetch(url).then(r => r.json())

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
          2. COLLAPSIBLE RATE CONFIG & BULK MARKUP PANEL
          ───────────────────────────────────────────────────────────── */}
      {showConfig && (
        <div className="mt-4 p-4 rounded-xl bg-surface border border-border animate-fade-in shadow-lg">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-text-primary flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
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

      {/* ─────────────────────────────────────────────────────────────
          3. SEARCH & CATEGORY FILTER BAR
          ───────────────────────────────────────────────────────────── */}
      <div className="mt-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
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

      {/* ─────────────────────────────────────────────────────────────
          4. THE MAIN RATES & INVENTORY MATRIX TABLE
          ───────────────────────────────────────────────────────────── */}
      <div className="mt-4 rounded-xl border border-border bg-[#0d1017] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            {/* ── TABLE HEAD: CHANNELS WITH LIVE API CONNECTIVITY STATUS ── */}
            <thead>
              <tr className="border-b border-border">
                {/* Room Info Corner Cell */}
                <th className="p-3.5 sm:p-4 text-xs font-bold uppercase tracking-wider text-text-secondary w-[280px] min-w-[280px] max-w-[280px] sticky left-0 bg-[#0d1017] z-30 border-r border-border shadow-[4px_0_12px_rgba(0,0,0,0.5)]">
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
                      className="p-3 sm:p-4 text-xs font-bold text-center border-r border-border last:border-r-0 min-w-[185px] bg-[#11141f] hover:bg-[#181d2c] transition-colors cursor-pointer select-none group"
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
                <th className="p-3 w-[280px] min-w-[280px] max-w-[280px] sticky left-0 bg-[#0d1017] z-30 border-r border-border font-semibold text-text-secondary shadow-[4px_0_12px_rgba(0,0,0,0.5)]">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#4A9EFF]" />
                    <span className="font-bold text-text-primary">Dynamic Automated Rates</span>
                  </div>
                </th>

                {CHANNELS.map(ch => {
                  const isDyn = dynamicRates[ch.id]
                  return (
                    <td key={ch.id} className="p-3 text-center border-r border-border last:border-r-0 bg-[#11141f]/70">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={isDyn}
                          onClick={() => setDynamicRates(prev => ({ ...prev, [ch.id]: !prev[ch.id] }))}
                          className={cn(
                            "w-10 h-5 flex items-center rounded-full p-0.5 transition-colors duration-200 focus:outline-none cursor-pointer flex-shrink-0",
                            isDyn ? "bg-[#4A9EFF]" : "bg-slate-700"
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
                <th className="p-3 w-[280px] min-w-[280px] max-w-[280px] sticky left-0 bg-[#0d1017] z-30 border-r border-border font-normal shadow-[4px_0_12px_rgba(0,0,0,0.5)]">
                  <div className="flex items-center justify-between text-xs text-text-tertiary">
                    <span>Available Rooms / Occupancy</span>
                    <span className="font-bold text-text-primary">
                      {stats.availableRooms} Avail ({stats.occupancyRate}%)
                    </span>
                  </div>
                </th>
                {CHANNELS.map(ch => (
                  <td key={ch.id} className="p-2.5 text-center border-r border-border last:border-r-0 font-mono bg-[#11141f]/40">
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
                  <tr key={room.id} className="hover:bg-[#151928] transition-colors group">
                    {/* Sticky Room Details Column */}
                    <td className="p-3.5 sm:p-4 w-[280px] min-w-[280px] max-w-[280px] sticky left-0 bg-[#0d1017] group-hover:bg-[#131724] z-20 border-r border-border shadow-[4px_0_12px_rgba(0,0,0,0.5)]">
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
                            !isActive && "bg-black/40"
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
                                  isActive ? "bg-emerald-500" : "bg-slate-700"
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
                                  "w-full bg-[#0d1017] border text-xs font-mono font-bold rounded-lg pl-6 pr-2 py-1.5 text-center outline-none transition-all shadow-inner",
                                  isDirty ? "border-amber-400/80 bg-amber-500/10 text-amber-300" : "border-border text-text-primary focus:border-[#4A9EFF]",
                                  !isActive && "cursor-not-allowed bg-black/60 text-text-tertiary line-through border-border/40"
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
                                      : "text-text-tertiary bg-white/5"
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
        <div className="p-3.5 bg-[#11141f] border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-text-secondary">
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

      {/* ─────────────────────────────────────────────────────────────
          5. CHANNEL API KEY & CREDENTIALS MODAL
          ───────────────────────────────────────────────────────────── */}
      {selectedChannelForConfig && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[#111625] border border-white/10 rounded-3xl w-full max-w-xl flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-white">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-white/10 bg-[#0c101c] flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-black border", selectedChannelForConfig.bgColor, selectedChannelForConfig.color, selectedChannelForConfig.borderColor)}>
                  {selectedChannelForConfig.logoText}
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                    Connect {selectedChannelForConfig.name}
                  </h3>
                  <p className="text-xs text-gray-400">
                    Live ARI Push, Inventory Distribution & Rate Synchronization
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setSelectedChannelForConfig(null)}
                className="p-2 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto custom-scrollbar">
              
              {/* Channel Guidance Alert */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex items-start gap-3">
                <Globe className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed text-gray-300">
                  <p className="font-semibold text-white mb-0.5">Where to get your API Key:</p>
                  <span>
                    Copy your Hotel ID and Channel Manager API Key from your {selectedChannelForConfig.name} Extranet Portal (Account $\rightarrow$ Channel Manager Settings).
                  </span>
                  <a 
                    href={selectedChannelForConfig.extranetUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="inline-flex items-center gap-1 text-blue-400 font-bold hover:underline ml-2 mt-1"
                  >
                    Open Extranet <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Form Inputs */}
              <div className="space-y-4">
                {/* Hotel ID / Property Code */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1">
                    Hotel Code / Property ID
                  </label>
                  <input
                    type="text"
                    value={hotelIdInput}
                    onChange={e => setHotelIdInput(e.target.value)}
                    placeholder={`e.g. ${selectedChannelForConfig.defaultHotelIdPrefix}98421`}
                    className="w-full bg-[#090d16] border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono outline-none focus:border-[#4A9EFF] transition-colors"
                  />
                </div>

                {/* iCal Free Sync Helper */}
                {['AIRBNB', 'BOOKING_COM', 'AGODA'].includes(selectedChannelForConfig.id) && (
                  <div className="bg-[#4A9EFF]/10 border border-[#4A9EFF]/25 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#4A9EFF] flex items-center gap-1.5">
                        <Link2 className="w-3.5 h-3.5" /> Free 2-Way Calendar Sync (iCal)
                      </span>
                      <span className="text-[10px] uppercase font-black bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">
                        100% Free
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-300 leading-relaxed">
                      You can paste your {selectedChannelForConfig.name} Export Calendar URL (ending in <code className="text-blue-300 font-mono">.ics</code>) into the field below. StayIn will sync availability and block booked dates automatically.
                    </p>
                  </div>
                )}

                {/* API Key / Token */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                      {['AIRBNB', 'BOOKING_COM', 'AGODA'].includes(selectedChannelForConfig.id)
                        ? 'API Key OR Calendar .ics URL'
                        : 'API Key / Partner Access Token'} <span className="text-rose-400">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="text-[10px] text-gray-400 hover:text-white flex items-center gap-1"
                    >
                      {showApiKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      {showApiKey ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <div className="relative">
                    <Key className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={apiKeyInput}
                      onChange={e => setApiKeyInput(e.target.value)}
                      placeholder={
                        ['AIRBNB', 'BOOKING_COM', 'AGODA'].includes(selectedChannelForConfig.id)
                          ? "Paste API Key OR Calendar URL (https://www.airbnb.com/calendar/ical/...ics)"
                          : "Paste your channel API Key or Token here..."
                      }
                      className="w-full bg-[#090d16] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white font-mono outline-none focus:border-[#4A9EFF] transition-colors"
                    />
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1">
                    {['AIRBNB', 'BOOKING_COM', 'AGODA'].includes(selectedChannelForConfig.id)
                      ? 'Accepts both direct API Tokens and native .ics calendar feeds.'
                      : 'Keys are securely stored and encrypted in the hotel property context.'}
                  </p>
                </div>

                {/* API Secret / Webhook Signature (Optional) */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1">
                    API Secret / Partner Secret (Optional)
                  </label>
                  <input
                    type="password"
                    value={apiSecretInput}
                    onChange={e => setApiSecretInput(e.target.value)}
                    placeholder="Optional secret or private cert key"
                    className="w-full bg-[#090d16] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white font-mono outline-none focus:border-[#4A9EFF] transition-colors"
                  />
                </div>

                {/* Environment Selector */}
                <div className="flex items-center gap-3 pt-1">
                  <span className="text-xs text-gray-400 font-bold">Environment:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEnvironmentInput('PRODUCTION')}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                        environmentInput === 'PRODUCTION'
                          ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                          : "bg-surface border-border text-gray-400"
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
                          ? "bg-amber-500/20 border-amber-500/40 text-amber-400"
                          : "bg-surface border-border text-gray-400"
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
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                    : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                )}>
                  <div className="flex items-center gap-2 font-bold mb-1">
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                    )}
                    <span>{testResult.message}</span>
                  </div>
                  {testResult.details && (
                    <div className="mt-2 text-[10px] font-mono bg-black/40 p-2.5 rounded-xl border border-white/5 space-y-1">
                      <div>Handshake: {testResult.details.handshake}</div>
                      <div>Features: {testResult.details.features?.join(', ')}</div>
                      <div>Provider: {testResult.details.provider}</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="p-5 border-t border-white/10 bg-[#0c101c] flex items-center justify-between gap-3">
              <div>
                {connectionMap[selectedChannelForConfig.id]?.isConnected && (
                  <button
                    type="button"
                    onClick={handleDisconnectChannel}
                    disabled={isSavingKey}
                    className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold transition-colors"
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
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-colors flex items-center gap-2"
                >
                  {isTestingKey ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <Wifi className="w-3.5 h-3.5 text-blue-400" />
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[#111625] border border-white/10 rounded-3xl w-full max-w-lg p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200 text-white">
            <div className="flex justify-between items-start border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Master Channel Manager Key</h3>
                  <p className="text-xs text-gray-400">Activate all 5 OTA channels with a single Master API Key</p>
                </div>
              </div>
              <button onClick={() => setShowMasterKeyModal(false)} className="p-1.5 hover:bg-white/10 rounded-xl text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1">
                  Select Channel Manager Provider
                </label>
                <select
                  value={masterProvider}
                  onChange={e => setMasterProvider(e.target.value)}
                  className="w-full bg-[#090d16] border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-[#4A9EFF]"
                >
                  <option value="CHANNEX">Channex.io (Global Two-way Gateway)</option>
                  <option value="SITEMINDER">SiteMinder (Direct ARI Exchange)</option>
                  <option value="RATEGAIN">RateGain DHISCO</option>
                  <option value="OMNIBEES">Omnibees Channel Switch</option>
                  <option value="INGOMMT">InGoMMT Unified Enterprise Gateway</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1">
                  Master API Key / Token
                </label>
                <input
                  type="password"
                  value={masterKeyInput}
                  onChange={e => setMasterKeyInput(e.target.value)}
                  placeholder="Paste your Master Channel Manager Key..."
                  className="w-full bg-[#090d16] border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-mono outline-none focus:border-[#4A9EFF]"
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  Applying this key will connect Booking.com, Airbnb, MakeMyTrip, Agoda, and Expedia simultaneously.
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowMasterKeyModal(false)}
                className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-colors"
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

    </div>
  )
}
