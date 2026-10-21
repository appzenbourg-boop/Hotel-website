'use client'
import { Utensils, LogOut, Bell, Wifi, Phone, ConciergeBell, ClipboardList, Loader2, Sparkles, Droplets, ArrowUpRight, CalendarPlus, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import useSWR from 'swr'
import { format } from 'date-fns'
import { useEffect, useState } from 'react'
import RoomUpgradeModal from '@/components/guest/RoomUpgradeModal'
import StayExtensionModal from '@/components/guest/StayExtensionModal'

export default function GuestDashboardPage() {
    const [guestId, setGuestId] = useState<string | null>(null)
    const [showUpgradeModal, setShowUpgradeModal] = useState(false)
    const [showExtensionModal, setShowExtensionModal] = useState(false)

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const id = localStorage.getItem('zenbourg_guest_id')
            setGuestId(id)
        }
    }, [])

    const { data: guestData, isLoading: guestLoading, mutate } = useSWR(
        guestId ? `/api/bookings/guest?guestId=${guestId}` : null,
        (url) => fetch(url).then(res => res.json())
    )

    const user = guestData?.guest
    const booking = guestData?.bookings?.[0]
    const loading = guestLoading

    return (
        <div className="min-h-screen bg-[#0A0E1A] text-white pb-24 relative overflow-hidden font-sans selection:bg-[#4A9EFF]/30">
            {/* Background Glows */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#4A9EFF15] blur-[120px] rounded-full animate-pulse pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#805ad520] blur-[120px] rounded-full pointer-events-none" />

            {/* Header */}
            <header className="relative z-10 px-6 py-8 flex items-center justify-between border-b border-white/[0.05]">
                <div>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Welcome back</p>
                    {loading ? (
                        <div className="h-8 w-32 bg-white/10 rounded-lg animate-pulse" />
                    ) : (
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                            {user?.name || 'Guest'}
                        </h1>
                    )}
                </div>
                <div className="flex gap-3">
                    <Link href="/guest/my-requests" className="p-3 bg-white/[0.03] border border-white/[0.08] rounded-xl hover:bg-white/[0.08] hover:scale-105 transition-all shadow-lg relative group" title="My Requests">
                        <ClipboardList className="w-5 h-5 text-gray-300 group-hover:text-white transition-colors" />
                    </Link>
                    <button className="p-3 bg-white/[0.03] border border-white/[0.08] rounded-xl hover:bg-white/[0.08] hover:scale-105 transition-all shadow-lg relative group">
                        <Bell className="w-5 h-5 text-gray-300 group-hover:text-white transition-colors" />
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-[#0A0E1A] animate-pulse"></span>
                    </button>
                </div>
            </header>

            <main className="px-6 py-6 space-y-7 relative z-10 max-w-md mx-auto">
                {/* Room Card */}
                <div className="relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#4A9EFF]/20 to-[#805ad5]/20 blur-2xl opacity-40 group-hover:opacity-60 transition-opacity" />
                    <div className="relative bg-white/[0.02] border border-white/[0.08] backdrop-blur-2xl rounded-3xl p-7 shadow-2xl overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#4A9EFF]/50 to-transparent" />
                        
                        {loading ? (
                            <div className="space-y-6">
                                <div className="flex justify-between">
                                    <div className="space-y-2">
                                        <div className="h-8 w-40 bg-white/10 rounded-lg animate-pulse" />
                                        <div className="h-4 w-24 bg-white/10 rounded-lg animate-pulse" />
                                    </div>
                                    <div className="h-6 w-20 bg-white/10 rounded-full animate-pulse" />
                                </div>
                            </div>
                        ) : booking ? (
                            <>
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <p className="text-[#4A9EFF] text-[10px] font-black uppercase tracking-[0.2em] mb-1">Your Stay</p>
                                        <h2 className="text-4xl font-black text-white mb-1">{booking.room?.roomNumber || '---'}</h2>
                                        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">{booking.room?.type || 'Suite'}</p>
                                        
                                        {/* Room Upgrade Action */}
                                        <button
                                            onClick={() => setShowUpgradeModal(true)}
                                            className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-600/10 hover:from-amber-500/30 hover:to-amber-600/20 border border-amber-500/40 text-amber-300 text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-lg shadow-amber-500/10 group/btn"
                                        >
                                            <Sparkles className="w-3.5 h-3.5 text-amber-400 group-hover/btn:rotate-12 transition-transform" />
                                            <span>Upgrade Room</span>
                                        </button>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <div className="bg-[#1db954]/10 px-3 py-1.5 rounded-xl border border-[#1db954]/20">
                                            <span className="text-[10px] font-bold text-[#1db954] uppercase tracking-widest">{booking.status}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mb-6">
                                    <div className="p-4 bg-black/40 rounded-2xl border border-white/5 flex flex-col justify-between">
                                        <div>
                                            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1.5">Check-in</p>
                                            <p className="text-white text-sm font-bold">
                                                {booking.checkIn ? format(new Date(booking.checkIn), 'dd MMM, p') : '---'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-black/40 rounded-2xl border border-white/5 flex flex-col justify-between group/extend">
                                        <div>
                                            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1.5">Check-out</p>
                                            <p className="text-white text-sm font-bold">
                                                {booking.checkOut ? format(new Date(booking.checkOut), 'dd MMM, p') : '---'}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setShowExtensionModal(true)}
                                            className="mt-2.5 pt-2 border-t border-white/10 text-[10px] font-black uppercase tracking-wider text-[#4A9EFF] hover:text-[#7abaff] flex items-center justify-between transition-colors group-hover/extend:translate-x-0.5"
                                        >
                                            <span>Extend Stay</span>
                                            <ChevronRight className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 pt-5 border-t border-white/[0.05]">
                                    <div className="flex items-center gap-2.5 text-xs text-gray-400 font-medium">
                                        <div className="w-8 h-8 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center">
                                            <Wifi className="w-3.5 h-3.5 text-[#4A9EFF]" />
                                        </div>
                                        <span>WiFi: <span className="text-white font-bold ml-1">Zenbourg_Guest</span></span>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="py-12 flex flex-col items-center justify-center text-center gap-5">
                                <div className="w-16 h-16 bg-white/[0.03] border border-white/10 rounded-2xl flex items-center justify-center">
                                    <ConciergeBell className="w-8 h-8 text-gray-500" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-white mb-2">No Active Booking</h2>
                                    <p className="text-gray-400 text-sm font-medium">You are not currently checked into any room.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* In-Room Dining Feature Banner */}
                {booking && (
                    <Link
                        href={`/guest/services?category=DINING&roomId=${booking.roomId}`}
                        className="block relative overflow-hidden rounded-3xl p-5 bg-gradient-to-r from-blue-950/60 via-indigo-950/40 to-slate-900/60 border border-[#4A9EFF]/30 hover:border-[#4A9EFF]/60 backdrop-blur-xl group shadow-2xl transition-all hover:scale-[1.01]"
                    >
                        <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-[#4A9EFF]/15 rounded-full blur-2xl group-hover:bg-[#4A9EFF]/25 transition-all" />
                        <div className="flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#4A9EFF] to-blue-700 flex items-center justify-center text-white shadow-lg shadow-[#4A9EFF]/30 group-hover:scale-110 transition-transform">
                                    <Utensils className="w-6 h-6" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-[#4A9EFF]">Room Service</span>
                                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold">Kitchen Open</span>
                                    </div>
                                    <h3 className="text-base font-bold text-white">Order In-Room Dining</h3>
                                    <p className="text-xs text-gray-400">Browse live chef menu & order to your room</p>
                                </div>
                            </div>
                            <div className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-gray-300 group-hover:text-white group-hover:bg-[#4A9EFF] group-hover:border-[#4A9EFF] transition-all">
                                <ArrowUpRight className="w-4 h-4" />
                            </div>
                        </div>
                    </Link>
                )}

                {/* Quick Actions Grid */}
                {booking && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-[#4A9EFF]" /> Quick Services
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <Link href={`/guest/services?category=DINING&roomId=${booking.roomId}`} className="p-5 bg-white/[0.02] border border-white/[0.08] backdrop-blur-md rounded-3xl hover:bg-white/[0.06] hover:border-[#4A9EFF]/40 hover:-translate-y-1 transition-all group flex flex-col items-center justify-center gap-3 shadow-xl">
                                <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400 group-hover:bg-blue-500/20 group-hover:scale-110 transition-all shadow-[0_0_15px_rgba(59,130,246,0.1)]">
                                    <Utensils className="w-6 h-6" />
                                </div>
                                <span className="font-bold text-white text-[11px] uppercase tracking-widest">Dining</span>
                            </Link>

                            <Link href={`/guest/services?category=HOUSEKEEPING&roomId=${booking.roomId}`} className="p-5 bg-white/[0.02] border border-white/[0.08] backdrop-blur-md rounded-3xl hover:bg-white/[0.06] hover:border-[#805ad5]/40 hover:-translate-y-1 transition-all group flex flex-col items-center justify-center gap-3 shadow-xl">
                                <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-400 group-hover:bg-purple-500/20 group-hover:scale-110 transition-all shadow-[0_0_15px_rgba(128,90,213,0.1)]">
                                    <Droplets className="w-6 h-6" />
                                </div>
                                <span className="font-bold text-white text-[11px] uppercase tracking-widest">Housekeeping</span>
                            </Link>

                            <Link href={`/guest/services?category=CONCIERGE&roomId=${booking.roomId}`} className="p-5 bg-white/[0.02] border border-white/[0.08] backdrop-blur-md rounded-3xl hover:bg-white/[0.06] hover:border-[#1db954]/40 hover:-translate-y-1 transition-all group flex flex-col items-center justify-center gap-3 shadow-xl">
                                <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/20 group-hover:scale-110 transition-all shadow-[0_0_15px_rgba(29,185,84,0.1)]">
                                    <ConciergeBell className="w-6 h-6" />
                                </div>
                                <span className="font-bold text-white text-[11px] uppercase tracking-widest">Concierge</span>
                            </Link>

                            <Link href="/guest/my-requests" className="p-5 bg-white/[0.02] border border-white/[0.08] backdrop-blur-md rounded-3xl hover:bg-white/[0.06] hover:border-gray-400/40 hover:-translate-y-1 transition-all group flex flex-col items-center justify-center gap-3 shadow-xl">
                                <div className="w-12 h-12 bg-gray-500/10 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-gray-500/20 group-hover:scale-110 transition-all shadow-[0_0_15px_rgba(156,163,175,0.1)]">
                                    <ClipboardList className="w-6 h-6" />
                                </div>
                                <span className="font-bold text-white text-[11px] uppercase tracking-widest">My Requests</span>
                            </Link>
                        </div>
                    </div>
                )}

                {/* Front Desk Contact */}
                <div className="p-5 bg-[#4A9EFF]/10 rounded-3xl border border-[#4A9EFF]/20 flex items-center justify-between shadow-[0_0_30px_rgba(74,158,255,0.05)]">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[#4A9EFF]/20 rounded-2xl flex items-center justify-center text-[#4A9EFF] shadow-inner">
                            <Phone className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="font-bold text-white text-sm mb-0.5">Need Help?</p>
                            <p className="text-[#4A9EFF] text-[10px] font-bold uppercase tracking-widest">24/7 Front Desk</p>
                        </div>
                    </div>
                    <button className="px-5 py-3 bg-[#4A9EFF] text-white text-xs font-bold uppercase tracking-widest rounded-xl shadow-lg shadow-[#4A9EFF]/30 hover:bg-[#3A8EEF] active:scale-95 transition-all">
                        Call Now
                    </button>
                </div>
            </main>

            {/* Room Upgrade Modal */}
            {booking && (
                <RoomUpgradeModal
                    isOpen={showUpgradeModal}
                    onClose={() => setShowUpgradeModal(false)}
                    booking={booking}
                    guestId={guestId || ''}
                    onSuccess={() => mutate()}
                />
            )}

            {/* Stay Extension Modal */}
            {booking && (
                <StayExtensionModal
                    isOpen={showExtensionModal}
                    onClose={() => setShowExtensionModal(false)}
                    booking={booking}
                    guestId={guestId || ''}
                    onSuccess={() => mutate()}
                />
            )}
        </div>
    )
}


