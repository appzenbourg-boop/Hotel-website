'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Home, ClipboardList, User, Bell, MessageSquare, Calendar, Download } from 'lucide-react'
import { signOut, useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { useEffect, useState, useCallback, useRef } from 'react'
import { usePwaInstall } from '@/lib/hooks/usePwaInstall'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const PWAInstall = dynamic(() => import('@/components/common/PWAInstall'), { ssr: false })

// Persistent shared context across duration of session
let globalAudioCtx: AudioContext | null = null;

export default function StaffLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const router = useRouter()
    const { data: session } = useSession()
    const { isInstallable, installPwa } = usePwaInstall()
    const [isNavigating, setIsNavigating] = useState(false)

    const { data: staffData } = useSWR('/api/staff/me', fetcher, {
        revalidateOnFocus: true,
        refreshInterval: 5000 // Boosted frequency to 5s for super fast response
    })

    const prevNoteCount = useRef<number | null>(null)
    const prevMsgCount = useRef<number | null>(null)

    const playNotificationChime = useCallback(() => {
        try {
            const isMuted = localStorage.getItem('zenbourg-sound-configured') === 'false'
            if (isMuted) return;

            // Leverage active global context or fallback instantly
            if (!globalAudioCtx && typeof window !== 'undefined') {
                const Ctor = window.AudioContext || (window as any).webkitAudioContext;
                if (Ctor) globalAudioCtx = new Ctor();
            }
            
            const ctx = globalAudioCtx;
            if (!ctx) return;

            // Force validation that it is awake
            if (ctx.state === 'suspended') {
                ctx.resume().catch(() => {});
            }

            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gainNode = ctx.createGain();
            
            osc1.connect(gainNode);
            osc2.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(523.25, ctx.currentTime); 
            osc1.frequency.exponentialRampToValueAtTime(880.00, ctx.currentTime + 0.15); 
            
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(659.25, ctx.currentTime); 
            osc2.frequency.exponentialRampToValueAtTime(1046.50, ctx.currentTime + 0.15); 
            
            gainNode.gain.setValueAtTime(0, ctx.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 0.05);
            gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
            
            osc1.start(ctx.currentTime);
            osc2.start(ctx.currentTime);
            osc1.stop(ctx.currentTime + 0.85);
            osc2.stop(ctx.currentTime + 0.85);
        } catch (e) {
            console.warn('Synth audio failed:', e);
        }
    }, []);

    // ── UNLOCK AUDIO ENGINE VIA ONE-TIME USER GESTURE ───────────────────────
    useEffect(() => {
        if (typeof window === 'undefined') return;
        
        const unlockAudio = () => {
            if (!globalAudioCtx) {
                const Ctor = window.AudioContext || (window as any).webkitAudioContext;
                if (Ctor) globalAudioCtx = new Ctor();
            }
            
            if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
                globalAudioCtx.resume().then(() => {
                    // Clean up listeners once unlocked
                    document.removeEventListener('click', unlockAudio);
                    document.removeEventListener('touchstart', unlockAudio);
                }).catch(() => {});
            } else {
                document.removeEventListener('click', unlockAudio);
                document.removeEventListener('touchstart', unlockAudio);
            }
        };

        document.addEventListener('click', unlockAudio);
        document.addEventListener('touchstart', unlockAudio);

        return () => {
            document.removeEventListener('click', unlockAudio);
            document.removeEventListener('touchstart', unlockAudio);
        };
    }, []);

    useEffect(() => {
        if (staffData?.unreadCounts) {
            const currentN = staffData.unreadCounts.notifications || 0
            const currentM = staffData.unreadCounts.messages || 0

            // Only trigger sound if quantity goes UP
            if (prevNoteCount.current !== null && currentN > prevNoteCount.current) {
                playNotificationChime()
            } else if (prevMsgCount.current !== null && currentM > prevMsgCount.current) {
                playNotificationChime()
            }

            prevNoteCount.current = currentN
            prevMsgCount.current = currentM
        }
    }, [staffData?.unreadCounts, playNotificationChime])

    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker
                .register('/sw.js')
                .then((reg) => console.log('SW Registered', reg))
                .catch((err) => console.log('SW Failed', err))
        }
    }, [])

    // Smooth auto-scroll active inputs into view to prevent virtual keyboard overlaps on mobile
    useEffect(() => {
        const handleFocus = (e: FocusEvent) => {
            const target = e.target as HTMLElement
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
                setTimeout(() => {
                    target.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }, 150)
            }
        }
        document.addEventListener('focus', handleFocus, true)
        return () => document.removeEventListener('focus', handleFocus, true)
    }, [])

    // Detect navigation for progress bar with delay
    useEffect(() => {
        setIsNavigating(false)
    }, [pathname])

    useEffect(() => {
        let timeout: NodeJS.Timeout;
        const handleAnchorClick = (e: MouseEvent) => {
            const target = (e.target as HTMLElement).closest('a')
            if (target && target.href && !target.href.startsWith('javascript:') && !target.href.includes('#')) {
                const url = new URL(target.href)
                if (url.origin === window.location.origin && url.pathname !== window.location.pathname) {
                    // Only show progress bar if it takes more than 300ms (truly slow load)
                    timeout = setTimeout(() => {
                        setIsNavigating(true)
                    }, 300)
                }
            }
        }
        document.addEventListener('click', handleAnchorClick)
        return () => {
            document.removeEventListener('click', handleAnchorClick)
            clearTimeout(timeout)
        }
    }, [])

    if (pathname === '/staff/login') return <>{children}</>

    const navItems = [
        { label: 'Home', icon: Home, href: '/staff' },
        { label: 'Tasks', icon: ClipboardList, href: '/staff/tasks' },
        { label: 'Schedule', icon: Calendar, href: '/staff/attendance' },
        { label: 'Profile', icon: User, href: '/staff/profile' },
    ]

    return (
        <div className="min-h-screen bg-[#0d1117] text-gray-300 pb-24 font-sans selection:bg-blue-500/30 relative">
            <link rel="manifest" href="/manifest.json" />
            <meta name="theme-color" content="#2563eb" />
            <meta name="apple-mobile-web-app-capable" content="yes" />
            <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />

            {/* Premium Progress Bar */}
            <AnimatePresence>
                {isNavigating && (
                    <motion.div
                        initial={{ width: 0, opacity: 1 }}
                        animate={{ width: '100%', opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5, ease: "easeInOut" }}
                        className="fixed top-0 left-0 h-[2px] bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-400 z-[9999] shadow-[0_0_10px_rgba(37,99,235,0.5)]"
                    />
                )}
            </AnimatePresence>
            
            {/* Header: Premium Glassmorphism */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-[#0d1117]/80 backdrop-blur-xl border-b border-white/[0.05] h-16 flex items-center justify-between px-6 transition-all duration-300">
                <Link href="/staff" className="flex items-center gap-3 group cursor-pointer">
                    <div className="relative">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-[1px] shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
                            <div className="w-full h-full rounded-[15px] bg-[#0d1117] flex items-center justify-center overflow-hidden">
                                <span className="font-black text-[12px] text-white  tracking-tighter">ZB</span>
                            </div>
                        </div>
                        <div className={cn(
                            "absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-[#0d1117] animate-pulse shadow-lg",
                            staffData?.isOnLeave ? "bg-amber-500 shadow-amber-500/50" : "bg-emerald-500 shadow-emerald-500/50"
                        )}></div>
                    </div>
                    <div className="flex flex-col">
                        <h1 className="font-black text-[14px] text-white tracking-tighter  leading-none">ZENBOURG <span className="text-blue-500 not- ml-0.5">STAFF</span></h1>
                        <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest mt-1 ">Operations Portal</span>
                    </div>
                </Link>

                <div className="flex items-center gap-2">
                    {isInstallable && (
                        <button
                            onClick={installPwa}
                            className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 hover:bg-blue-600 hover:text-white transition-all active:scale-95 animate-pulse"
                            title="Install App"
                        >
                            <Download className="w-4 h-4" />
                        </button>
                    )}
                    <button
                        onClick={() => router.push('/staff/notifications')}
                        className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-gray-400 hover:text-white transition-all hover:bg-white/[0.08] relative active:scale-95"
                    >
                        <Bell className="w-4 h-4" />
                        {(staffData?.unreadCounts?.notifications > 0) && (
                            <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-[#0d1117] animate-bounce shadow-lg shadow-rose-500/40"></span>
                        )}
                    </button>
                    <button
                        onClick={() => router.push('/staff/messages')}
                        className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-gray-400 hover:text-white transition-all hover:bg-white/[0.08] relative active:scale-95 ml-1"
                    >
                        <MessageSquare className="w-4 h-4" />
                        {(staffData?.unreadCounts?.messages > 0) && (
                            <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-blue-500 rounded-full border border-[#0d1117]"></span>
                        )}
                    </button>
                </div>
            </header>

            <main className="px-5 py-24 max-w-lg mx-auto min-h-screen relative overflow-x-hidden">
                <AnimatePresence mode="popLayout">
                    <motion.div
                        key={pathname}
                        initial={{ opacity: 0.9 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 1 }}
                        transition={{ duration: 0.1 }}
                    >
                        {children}
                    </motion.div>
                </AnimatePresence>
            </main>

            <PWAInstall />

            {/* Bottom Nav: Premium Floating Design */}
            <div className="fixed bottom-0 left-0 right-0 z-50 px-6 pb-6 pointer-events-none">
                <nav className="max-w-md mx-auto h-20 bg-[#161b22]/90 backdrop-blur-2xl border border-white/[0.1] rounded-[35px] flex justify-around items-center px-4 pointer-events-auto shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] relative group overflow-hidden">
                    {/* Interior Glow */}
                    <div className="absolute inset-0 bg-blue-600 opacity-[0.02] pointer-events-none"></div>
                    
                    {navItems.map((item) => {
                        const isActive = item.href === '/staff'
                            ? pathname === '/staff'
                            : pathname.startsWith(item.href)

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "relative flex flex-col items-center justify-center gap-1.5 h-full transition-all duration-500 px-4",
                                    isActive ? 'text-blue-500' : 'text-gray-500 hover:text-gray-300'
                                )}
                            >
                                <div className={cn(
                                    "transition-all duration-300 p-2 rounded-2xl relative",
                                    isActive ? "bg-blue-600/10 scale-100" : "bg-transparent scale-90"
                                )}>
                                    <item.icon className={cn("w-5 h-5", isActive ? "stroke-[2.5]" : "stroke-2")} />
                                    {isActive && (
                                        <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full"></div>
                                    )}
                                </div>
                                <span className={cn(
                                    "text-[9px] font-black uppercase tracking-[0.15em] transition-all duration-300",
                                    isActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
                                )}>
                                    {item.label}
                                </span>
                            </Link>
                        )
                    })}
                </nav>
            </div>
        </div>
    )
}
