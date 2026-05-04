'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { 
    Package, Camera, MapPin, 
    Send, ChevronLeft, Loader2,
    CheckCircle2, AlertCircle, History,
    LayoutGrid, Search
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export default function StaffLostFoundPage() {
    const router = useRouter()
    const [submitting, setSubmitting] = useState(false)
    
    // Form State
    const [name, setName] = useState('')
    const [category, setCategory] = useState('PERSONAL')
    const [location, setLocation] = useState('')
    const [roomId, setRoomId] = useState('')
    const [description, setDescription] = useState('')
    const [image, setImage] = useState('')

    // First get the staff's property ID, then fetch only that hotel's rooms
    const { data: meData } = useSWR('/api/staff/me', (url) => fetch(url).then(res => res.json()), {
        revalidateOnFocus: false,
        dedupingInterval: 30000,
    })
    const propertyId = meData?.profile?.propertyId

    const { data: roomsData, isValidating: roomsLoading } = useSWR(
        propertyId ? `/api/rooms?propertyId=${propertyId}` : null,
        (url) => fetch(url).then(res => res.json()),
        { revalidateOnFocus: false, dedupingInterval: 10000 }
    )

    const { data: historyData, mutate: mutateHistory, isValidating: historyLoading } = useSWR('/api/staff/lost-found', (url) => fetch(url).then(res => res.json()), {
        revalidateOnFocus: true,
        dedupingInterval: 2000
    })

    const rooms = Array.isArray(roomsData) ? roomsData : (roomsData?.rooms || roomsData?.data || [])
    const history = Array.isArray(historyData) ? historyData : (historyData?.history || historyData?.items || [])

    const fetchInitialData = () => {
        mutateHistory()
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name || (!location && !roomId)) {
            toast.error('Please specify the item name and where it was found')
            return
        }

        setSubmitting(true)
        try {
            const res = await fetch('/api/staff/lost-found', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    category,
                    location,
                    roomId,
                    description,
                    image
                })
            })

            if (res.ok) {
                toast.success('Discovery logged successfully')
                setName('')
                setLocation('')
                setRoomId('')
                setDescription('')
                setImage('')
                fetchInitialData()
            } else {
                toast.error('Failed to log discovery')
            }
        } catch (error) {
            toast.error('Something went wrong')
        } finally {
            setSubmitting(false)
        }
    }

    if (!roomsData && roomsLoading) return (
        <div className="space-y-10 animate-pulse px-4">
            <div className="h-10 w-48 bg-white/5 rounded-xl mx-auto" />
            <div className="h-96 w-full bg-white/5 rounded-[45px]" />
            <div className="space-y-4">
                <div className="h-4 w-32 bg-white/5 rounded-full" />
                <div className="h-24 w-full bg-white/5 rounded-[35px]" />
            </div>
        </div>
    )

    return (
        <div className="space-y-10 animate-fade-in pb-16">
            {/* Header */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => router.back()}
                    className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-gray-400 hover:text-white transition-all active:scale-95"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex flex-col items-center">
                    <h1 className="text-xl font-black text-white tracking-tight ">Lost & Found</h1>
                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-0.5 ">Report a found item</p>
                </div>
                <div className="w-10"></div>
            </div>

            {/* Reporting Form */}
            <form onSubmit={handleSubmit} className="bg-[#161b22] border border-white/[0.05] rounded-[45px] p-8 space-y-8 shadow-2xl shadow-black/40 relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/20 to-transparent"></div>
                
                <div className="space-y-4">
                    <label className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-500 ml-4 font-mono">Item Details</label>
                    <div className="grid grid-cols-1 gap-4">
                        <input
                            placeholder="Item name (e.g. Blue Wallet, iPhone)"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-[#0d1117] border border-white/[0.05] rounded-[22px] px-6 py-4 text-xs text-white outline-none focus:border-blue-500/50 transition-all font-black"
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <select
                                value={roomId}
                                onChange={(e) => setRoomId(e.target.value)}
                                className="w-full bg-[#0d1117] border border-white/[0.05] rounded-[22px] px-6 py-4 text-xs text-white outline-none focus:border-blue-500/50 transition-all font-black appearance-none"
                            >
                                <option value="">Select Room</option>
                                {(rooms as any[]).map((r: any) => <option key={r.id} value={r.id}>Room {r.roomNumber}</option>)}
                            </select>
                            <input
                                placeholder="Public Area (e.g. Pool)"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                className="w-full bg-[#0d1117] border border-white/[0.05] rounded-[22px] px-6 py-4 text-xs text-white outline-none focus:border-blue-500/50 transition-all font-black"
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <label className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-500 ml-4 font-mono">Photo (optional)</label>
                    <div className="flex items-center gap-6 p-6 bg-[#0d1117] border border-white/[0.05] rounded-[30px] shadow-inner relative overflow-hidden group">
                        <div className="w-24 h-24 bg-[#161b22] border border-white/[0.05] rounded-3xl overflow-hidden flex items-center justify-center relative shrink-0 transition-all group-hover:border-blue-500/30 shadow-xl">
                            {image ? (
                                <img src={image} className="w-full h-full object-cover" alt="preview" />
                            ) : (
                                <Camera className="w-8 h-8 text-gray-800" />
                            )}
                        </div>
                        <div className="flex-1">
                            <input
                                type="file"
                                id="lost-image"
                                className="hidden"
                                accept="image/*"
                                onChange={async (e) => {
                                    const file = e.target.files?.[0]
                                    if (file) {
                                        try {
                                            toast.info('Uploading photo...')
                                            const { uploadToCloudinary } = await import('@/lib/cloudinary')
                                            const result = await uploadToCloudinary(file, 'lost-found')
                                            setImage(result.url)
                                            toast.success('Photo uploaded')
                                        } catch (error) {
                                            console.error('[LOST_FOUND_UPLOAD_ERROR]', error)
                                            toast.error('Failed to upload photo')
                                        }
                                    }
                                }}
                            />
                            <label 
                                htmlFor="lost-image"
                                className="inline-flex items-center gap-3 px-6 py-3 bg-blue-600/10 border border-blue-600/20 text-blue-500 text-[10px] font-black uppercase tracking-widest rounded-xl cursor-pointer hover:bg-blue-600 hover:text-white transition-all active:scale-95 shadow-lg shadow-blue-500/5"
                            >
                                <LayoutGrid className="w-4 h-4" /> Take / Upload Photo
                            </label>
                            <p className="text-[8px] text-gray-700 mt-2.5 font-black uppercase tracking-[0.3em] ml-1 leading-relaxed">Helps identify the item faster</p>
                        </div>
                    </div>
                </div>

                <textarea
                    rows={3}
                    placeholder="Distinguishing marks, color, or condition..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-[#0d1117] border border-white/[0.05] rounded-[30px] px-8 py-6 text-sm text-white outline-none focus:border-blue-500/50 transition-all font-medium  placeholder:text-gray-800 resize-none"
                ></textarea>

                <button
                    disabled={submitting}
                    className="w-full h-18 bg-blue-600 hover:bg-blue-500 text-white rounded-[30px] font-black text-[12px] uppercase tracking-[0.4em] shadow-2xl shadow-blue-600/30 transition-all flex items-center justify-center gap-4 active:scale-[0.98] disabled:opacity-50 group "
                >
                    {submitting ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                        <>
                            <span>Submit Report</span>
                            <Send className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        </>
                    )}
                </button>
            </form>

            {/* Recent History */}
            <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                    <h3 className="text-xs font-black text-white uppercase tracking-[0.3em] ">My Reports</h3>
                    <History className="w-4 h-4 text-gray-800" />
                </div>
                <div className="space-y-4">
                    {history.length === 0 ? (
                        <div className="py-20 text-center bg-[#161b22] rounded-[40px] border border-dashed border-white/5 opacity-40">
                            <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-[9px] font-black uppercase tracking-widest">No items reported by you yet</p>
                        </div>
                    ) : (
                        (history as any[]).map((item: any, i: number) => (
                            <div key={i} className="bg-[#161b22] border border-white/[0.05] p-6 rounded-[35px] flex items-center justify-between group cursor-pointer hover:bg-white/[0.02] transition-all active:scale-[0.98] shadow-xl shadow-black/30 relative overflow-hidden">
                                <div className={cn(
                                    "absolute top-0 bottom-0 left-0 w-2",
                                    item.status === 'FOUND' ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]' :
                                    item.status === 'CLAIMED' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-gray-700'
                                )}></div>
                                
                                <div className="flex items-center gap-5 relative z-10">
                                    <div className="w-14 h-14 rounded-2xl bg-[#0d1117] border border-white/5 overflow-hidden shadow-inner">
                                        <img src={item.image || `https://api.dicebear.com/7.x/shapes/svg?seed=${item.id}`} alt={item.name || 'Lost item'} className="w-full h-full object-cover" />
                                    </div>
                                    <div>
                                        <h4 className="text-[15px] font-black text-white  tracking-tight">{item.name}</h4>
                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">
                                            {item.room ? `Room ${item.room.roomNumber}` : item.location} • {new Date(item.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <div className={cn(
                                    "px-4 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest border  transition-all group-hover:scale-105 shadow-sm",
                                    item.status === 'FOUND' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                                    item.status === 'CLAIMED' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-gray-500/10 border-white/5 text-gray-500'
                                )}>
                                    {item.status}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
