'use client'

import React, { useState } from 'react'
import useSWR from 'swr'
import { buildContextUrl } from '@/lib/admin-context'
import { Plus, CheckCircle2, RefreshCcw, Save, Search, Power, Settings2, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useParams, useRouter } from 'next/navigation'

const fetcher = (url: string) => fetch(url).then(res => res.json())

const CHANNEL_MAPPING: Record<string, { id: string, name: string }> = {
    'airbnb': { id: 'AIRBNB', name: 'Airbnb' },
    'booking': { id: 'BOOKING_COM', name: 'Booking.com' },
    'makemytrip': { id: 'MAKEMYTRIP', name: 'MakeMyTrip' },
    'agoda': { id: 'AGODA', name: 'Agoda' },
    'expedia': { id: 'EXPEDIA', name: 'Expedia Group' }
}

export default function ChannelSubPage() {
    const params = useParams()
    const router = useRouter()
    const slug = (params.channelSlug as string) || ''
    const channelInfo = CHANNEL_MAPPING[slug]
    const channelId = channelInfo?.id

    const { data: mappingsResponse, isLoading, mutate } = useSWR(
        channelId ? buildContextUrl(`/api/admin/channel-manager/rooms?otaName=${channelId}`) : null,
        fetcher,
        { refreshInterval: 10000 }
    )

    const [isSaving, setIsSaving] = useState<Record<string, boolean>>({})
    const [otaRoomIds, setOtaRoomIds] = useState<Record<string, string>>({})
    const [addingMapping, setAddingMapping] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')

    if (!channelInfo) {
        return (
            <div className="p-8 text-center">
                <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h1 className="text-xl font-bold text-text-primary">Channel not found</h1>
                <p className="text-text-secondary mt-2">The requested OTA channel does not exist.</p>
                <button onClick={() => router.push('/admin/channel-manager')} className="mt-4 px-4 py-2 bg-surface border border-border rounded-lg">Go back to Dashboard</button>
            </div>
        )
    }

    const { allRooms = [], mappedRooms = [] } = mappingsResponse || {}

    const mappedRoomIds = mappedRooms.map((r: any) => r.roomId)
    const availableRooms = allRooms.filter((r: any) => !mappedRoomIds.includes(r.id))

    // Start editing mapping for a room
    const handleAddMappingClick = (roomId: string) => {
        setAddingMapping(roomId)
        setOtaRoomIds(prev => ({ ...prev, [roomId]: '' }))
    }

    const handleSaveMapping = async (roomId: string) => {
        const otaRoomId = otaRoomIds[roomId]
        if (!otaRoomId) {
            toast.error('Please enter the OTA Room / Listing ID')
            return
        }

        setIsSaving(prev => ({ ...prev, [roomId]: true }))
        try {
            const res = await fetch(buildContextUrl('/api/admin/channel-manager/rooms'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    roomId,
                    otaName: channelId,
                    otaRoomId,
                    isActive: true
                })
            })

            if (!res.ok) throw new Error(await res.text())

            toast.success(`Room mapped to ${channelInfo.name} successfully!`)
            setAddingMapping(null)
            mutate()
        } catch (error) {
            console.error(error)
            toast.error('Failed to map room.')
        } finally {
            setIsSaving(prev => ({ ...prev, [roomId]: false }))
        }
    }

    const handleToggleSync = async (roomId: string, currentStatus: boolean) => {
        setIsSaving(prev => ({ ...prev, [roomId]: true }))
        try {
            const res = await fetch(buildContextUrl('/api/admin/channel-manager/rooms'), {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    roomId,
                    otaName: channelId,
                    isActive: !currentStatus
                })
            })

            if (!res.ok) throw new Error(await res.text())

            toast.success(!currentStatus ? `Sync Enabled for room` : `Sync Paused for room`)
            mutate()
        } catch (error) {
            console.error(error)
            toast.error('Failed to toggle sync.')
        } finally {
            setIsSaving(prev => ({ ...prev, [roomId]: false }))
        }
    }

    const filteredMapped = mappedRooms.filter((mapping: any) => 
        mapping.room.roomNumber.toLowerCase().includes(searchQuery.toLowerCase()) || 
        mapping.room.type.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const filteredAvailable = availableRooms.filter((room: any) => 
        room.roomNumber.toLowerCase().includes(searchQuery.toLowerCase()) || 
        room.type.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="p-8 font-sans bg-background min-h-screen text-text-primary animate-fade-in">
            <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-6">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
                        {channelInfo.name} Integration
                        <span className="text-[10px] font-bold tracking-widest text-[#4A9EFF] bg-[#4A9EFF]/10 px-2 py-1 rounded uppercase">Live</span>
                    </h1>
                    <p className="text-sm text-text-secondary mt-2 max-w-xl">
                        Map your internal rooms to {channelInfo.name} listings. Once mapped, availability and rates will automatically sync based on your toggle settings.
                    </p>
                </div>
                <div className="relative w-full md:w-72">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                    <input 
                        type="text" 
                        placeholder="Search rooms..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-surface border border-border rounded-lg pl-10 pr-4 py-2 text-sm outline-none text-text-primary focus:border-[#3B82F6] transition-colors"
                    />
                </div>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <RefreshCcw className="w-6 h-6 text-[#3B82F6] animate-spin" />
                </div>
            ) : (
                <div className="space-y-8">
                    
                    {/* Mapped Rooms Section */}
                    <div>
                        <h2 className="text-lg font-bold text-text-primary flex items-center gap-2 mb-4">
                            <CheckCircle2 className="w-5 h-5 text-green-500" /> Mapped Rooms ({mappedRooms.length})
                        </h2>
                        {filteredMapped.length === 0 ? (
                            <div className="p-8 border border-border/50 border-dashed rounded-xl text-center text-text-secondary bg-surface/50 text-sm">
                                No mapped rooms found. Map rooms below to start syncing.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredMapped.map((mapping: any) => (
                                    <div key={mapping.id} className="bg-surface border border-border rounded-xl p-4 relative overflow-hidden group">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="font-bold text-text-primary text-base leading-none mb-1">{mapping.room.roomNumber}</h3>
                                                <p className="text-[11px] text-text-tertiary font-medium uppercase tracking-wider">{mapping.room.type}</p>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className="text-[10px] font-bold text-text-secondary uppercase mb-1">Live Sync</span>
                                                <button
                                                    onClick={() => handleToggleSync(mapping.room.id, mapping.isActive)}
                                                    disabled={isSaving[mapping.room.id]}
                                                    className={cn(
                                                        "w-10 h-5 rounded-full relative transition-colors disabled:opacity-50",
                                                        mapping.isActive ? "bg-green-500" : "bg-black/30 border border-border"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "absolute top-[2px] w-4 h-4 bg-white rounded-full shadow-sm transition-all",
                                                        mapping.isActive ? "left-[22px]" : "left-[2px] bg-gray-400"
                                                    )} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="bg-black/20 p-2.5 rounded-lg border border-border/50 flex items-center justify-between">
                                            <span className="text-[11px] text-text-secondary">OTA Listing ID:</span>
                                            <span className="text-xs font-mono font-bold text-[#4A9EFF]">{mapping.otaRoomId}</span>
                                        </div>
                                        {isSaving[mapping.room.id] && (
                                            <div className="absolute inset-0 bg-surface/50 backdrop-blur-[2px] flex items-center justify-center">
                                                <RefreshCcw className="w-5 h-5 text-[#4A9EFF] animate-spin" />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Available Rooms Section */}
                    <div>
                        <h2 className="text-lg font-bold text-text-primary flex items-center gap-2 mb-4">
                            <Settings2 className="w-5 h-5 text-text-secondary" /> Unmapped Rooms ({availableRooms.length})
                        </h2>
                        {filteredAvailable.length === 0 ? (
                            <div className="p-8 border border-border/50 border-dashed rounded-xl text-center text-text-secondary bg-surface/50 text-sm">
                                All your rooms are currently mapped to {channelInfo.name}.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredAvailable.map((room: any) => (
                                    <div key={room.id} className="bg-surface-light border border-border/60 rounded-xl p-4 flex flex-col justify-between">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="font-bold text-text-primary text-base leading-none mb-1">{room.roomNumber}</h3>
                                                <p className="text-[11px] text-text-tertiary font-medium uppercase tracking-wider">{room.type}</p>
                                            </div>
                                            <span className="text-[10px] font-bold text-text-tertiary bg-black/20 border border-border px-2 py-1 rounded">
                                                UNMAPPED
                                            </span>
                                        </div>
                                        
                                        {addingMapping === room.id ? (
                                            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
                                                <input 
                                                    type="text" 
                                                    autoFocus
                                                    placeholder={`${channelInfo.name} Listing ID`}
                                                    value={otaRoomIds[room.id] || ''}
                                                    onChange={e => setOtaRoomIds(prev => ({ ...prev, [room.id]: e.target.value }))}
                                                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs outline-none focus:border-[#3B82F6] font-mono text-text-primary"
                                                />
                                                <div className="flex gap-2">
                                                    <button 
                                                        onClick={() => setAddingMapping(null)}
                                                        className="flex-1 py-2 bg-surface hover:bg-white/5 border border-border text-text-secondary font-bold text-xs rounded-lg transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button 
                                                        onClick={() => handleSaveMapping(room.id)}
                                                        disabled={isSaving[room.id]}
                                                        className="flex-1 py-2 bg-[#4A9EFF] hover:bg-[#3B82F6] text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                                                    >
                                                        {isSaving[room.id] ? <RefreshCcw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                                        Save
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <button 
                                                onClick={() => handleAddMappingClick(room.id)}
                                                className="w-full py-2.5 bg-surface border border-border hover:border-[#4A9EFF]/50 text-text-primary font-bold text-[11px] rounded-lg transition-colors flex items-center justify-center gap-1.5 group"
                                            >
                                                <Plus className="w-3.5 h-3.5 text-text-tertiary group-hover:text-[#4A9EFF] transition-colors" /> Add Mapping
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>
            )}
        </div>
    )
}
