'use client'
import { Utensils, Sparkles, LogOut, Bell, Wifi, Phone, ConciergeBell, ClipboardList, Loader2 } from 'lucide-react'
import Link from 'next/link'
import useSWR from 'swr'
import { format } from 'date-fns'

export default function GuestDashboardPage() {
    const { data: userData, isLoading: userLoading } = useSWR('/api/auth/me', (url) => fetch(url).then(res => res.json()))
    const { data: bookingData, isLoading: bookingLoading } = useSWR('/api/bookings/active', (url) => fetch(url).then(res => res.json()))
    const { data: servicesData } = useSWR('/api/services', (url) => fetch(url).then(res => res.json()))

    const user = userData?.user
    const booking = bookingData?.bookings?.[0]
    const pendingStayRequest = servicesData?.serviceRequests?.find((sr: any) => 
        sr.status === 'PENDING' && sr.type === 'CONCIERGE' && sr.title.includes('Stay')
    )
    const loading = userLoading || bookingLoading
    return (
        <div className="min-h-screen bg-background text-text-primary pb-24 relative overflow-hidden">
            {/* Background Gradients */}
            <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />
            <div className="absolute top-20 right-[-10%] w-64 h-64 bg-purple-500/20 rounded-full blur-3xl opacity-30 animate-pulse pointer-events-none" />

            {/* Header */}
            <header className="relative z-10 px-6 py-8 flex items-center justify-between">
                <div>
                    <p className="text-text-secondary text-sm font-medium mb-1">Welcome back,</p>
                    {loading ? (
                        <div className="h-8 w-32 bg-white/10 rounded-lg animate-pulse" />
                    ) : (
                        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                            {user?.name || 'Guest'}
                        </h1>
                    )}
                </div>
                <div className="flex gap-2">
                    <Link href="/guest/my-requests" className="p-3 bg-surface border border-white/[0.08] rounded-full hover:bg-surface-hover transition-colors relative">
                        <ClipboardList className="w-5 h-5 text-text-primary" />
                    </Link>
                    <button className="p-3 bg-surface border border-white/[0.08] rounded-full hover:bg-surface-hover transition-colors relative">
                        <Bell className="w-5 h-5 text-text-primary" />
                        <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-surface shadow-md"></span>
                    </button>
                </div>
            </header>

            <main className="px-6 space-y-6 relative z-10">
                {/* Room Card */}
                <div className="relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-600/20 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
                    <div className="relative bg-surface border border-white/[0.08] p-6 rounded-2xl shadow-2xl">
                        {loading ? (
                            <div className="space-y-6">
                                <div className="flex justify-between">
                                    <div className="space-y-2">
                                        <div className="h-8 w-40 bg-white/10 rounded-lg animate-pulse" />
                                        <div className="h-4 w-24 bg-white/10 rounded-lg animate-pulse" />
                                    </div>
                                    <div className="h-6 w-20 bg-white/10 rounded-full animate-pulse" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="h-16 bg-white/5 rounded-xl animate-pulse" />
                                    <div className="h-16 bg-white/5 rounded-xl animate-pulse" />
                                </div>
                            </div>
                        ) : booking ? (
                            <>
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h2 className="text-3xl font-bold text-white mb-1">Room {booking.room?.roomNumber || '---'}</h2>
                                        <p className="text-primary-300 text-sm font-medium tracking-wide uppercase">{booking.room?.type || 'Suite'}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <div className="bg-white/10 px-3 py-1 rounded-full border border-white/10 backdrop-blur-md">
                                            <span className="text-xs font-semibold text-white">{booking.status}</span>
                                        </div>
                                        {pendingStayRequest && (
                                            <div className="bg-amber-500/20 px-3 py-1 rounded-full border border-amber-500/30 backdrop-blur-md animate-pulse">
                                                <span className="text-[10px] font-bold text-amber-500 uppercase tracking-tight">Stay Adjustment Pending</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="p-3 bg-black/20 rounded-xl border border-white/5">
                                        <p className="text-text-tertiary text-xs mb-1">Check-in</p>
                                        <p className="text-text-primary text-sm font-bold">
                                            {booking.checkIn ? format(new Date(booking.checkIn), 'dd MMM, p') : '---'}
                                        </p>
                                    </div>
                                    <div className="p-3 bg-black/20 rounded-xl border border-white/5">
                                        <p className="text-text-tertiary text-xs mb-1">Check-out</p>
                                        <p className="text-text-primary text-sm font-bold">
                                            {booking.checkOut ? format(new Date(booking.checkOut), 'dd MMM, p') : '---'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 pt-4 border-t border-white/5">
                                    <div className="flex items-center gap-2 text-xs text-text-secondary">
                                        <Wifi className="w-3.5 h-3.5" />
                                        <span>Free WiFi: <span className="text-white font-medium">Zenbourg_Guest</span></span>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="py-12 flex flex-col items-center justify-center text-center gap-4">
                                <ConciergeBell className="w-12 h-12 text-white/20" />
                                <div>
                                    <h2 className="text-xl font-bold text-white mb-1">No Active Booking</h2>
                                    <p className="text-text-secondary text-sm">You are not currently checked into any room.</p>
                                </div>
                                <Link href="/" className="px-6 py-2 bg-primary text-white rounded-full font-bold hover:bg-primary-hover transition-all">
                                    Book a Room
                                </Link>
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Actions Grid */}
                <div>
                    <h3 className="text-lg font-bold text-text-primary mb-4">Quick Services</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <Link href="/guest/services?category=DINING" className="p-5 bg-surface border border-white/[0.08] rounded-2xl hover:bg-surface-hover hover:border-primary/30 hover:scale-[1.02] transition-all group flex flex-col items-center justify-center gap-3">
                            <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-400 group-hover:bg-blue-500/20 transition-colors">
                                <Utensils className="w-6 h-6" />
                            </div>
                            <span className="font-medium text-text-primary text-sm">Dining</span>
                        </Link>

                        <Link href="/guest/services?category=HOUSEKEEPING" className="p-5 bg-surface border border-white/[0.08] rounded-2xl hover:bg-surface-hover hover:border-purple-500/30 hover:scale-[1.02] transition-all group flex flex-col items-center justify-center gap-3">
                            <div className="w-12 h-12 bg-purple-500/10 rounded-full flex items-center justify-center text-purple-400 group-hover:bg-purple-500/20 transition-colors">
                                <Sparkles className="w-6 h-6" />
                            </div>
                            <span className="font-medium text-text-primary text-sm">Housekeeping</span>
                        </Link>

                        <Link href="/guest/services?category=CONCIERGE" className="p-5 bg-surface border border-white/[0.08] rounded-2xl hover:bg-surface-hover hover:border-emerald-500/30 hover:scale-[1.02] transition-all group flex flex-col items-center justify-center gap-3">
                            <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
                                <ConciergeBell className="w-6 h-6" />
                            </div>
                            <span className="font-medium text-text-primary text-sm">Concierge</span>
                        </Link>

                        <Link href="/guest/my-requests" className="p-5 bg-surface border border-white/[0.08] rounded-2xl hover:bg-surface-hover hover:border-blue-500/30 hover:scale-[1.02] transition-all group flex flex-col items-center justify-center gap-3">
                            <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-400 group-hover:bg-blue-500/20 transition-colors">
                                <ClipboardList className="w-6 h-6" />
                            </div>
                            <span className="font-medium text-text-primary text-sm">My Requests</span>
                        </Link>
                    </div>
                </div>

                {/* Front Desk Contact */}
                <div className="p-4 bg-gradient-to-r from-primary/20 to-primary/5 rounded-2xl border border-primary/20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-primary">
                            <Phone className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="font-bold text-text-primary text-sm">Need Help?</p>
                            <p className="text-text-secondary text-xs">24/7 Front Desk Support</p>
                        </div>
                    </div>
                    <button className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg shadow-lg shadow-primary/20 hover:bg-primary-hover transition-colors">
                        Call Now
                    </button>
                </div>
            </main>
        </div>
    )
}
