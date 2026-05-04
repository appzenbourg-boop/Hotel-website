'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
    ChevronLeft, Bell, BellOff,
    AlertCircle, ClipboardList, Wallet,
    Clock, CheckCircle2, MoreHorizontal,
    Zap, Sparkles, LayoutGrid, Loader2, Info, ArrowRight, ShieldCheck
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, isToday, isYesterday } from 'date-fns'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

export default function NotificationsPage() {
    const router = useRouter()
    const [filter, setFilter] = useState('ALL')
    const [loading, setLoading] = useState(true)
    const [notifications, setNotifications] = useState<any[]>([])
    const [isNavigating, setIsNavigating] = useState(false)

    const fetchNotifications = useCallback(async () => {
        try {
            const res = await fetch('/api/staff/notifications')
            if (res.ok) {
                const json = await res.json()
                setNotifications(json)
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchNotifications()
    }, [fetchNotifications])

    const markAllRead = async () => {
        const toastId = toast.loading('Clearing notifications...')
        try {
            const res = await fetch('/api/staff/notifications', { 
                method: 'DELETE', 
                headers: { 'Content-Type': 'application/json' }
            })
            if (res.ok) {
                toast.success('Notification history cleared', { id: toastId })
                setNotifications([])
            } else {
                toast.error('Failed to clear', { id: toastId })
            }
        } catch (error) {
            toast.error('Connection error', { id: toastId })
            console.error(error)
        }
    }

    const markSingleRead = async (id: string) => {
        try {
            await fetch('/api/staff/notifications', {
                method: 'PATCH',
                body: JSON.stringify({ id, isRead: true }),
                headers: { 'Content-Type': 'application/json' }
            })
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
        } catch (error) {
            console.error(error)
        }
    }

    const removeNotification = async (id: string) => {
        try {
            // Optimistic update
            setNotifications(prev => prev.filter(n => n.id !== id))
            await fetch(`/api/staff/notifications?id=${id}`, { method: 'DELETE' })
        } catch (error) {
            console.error(error)
            toast.error('Failed to remove')
            fetchNotifications() // Revert on error
        }
    }

    const filtered = filter === 'ALL' ? notifications : notifications.filter(n => {
        if (filter === 'ALL') return true
        if (filter === 'INFO') return n.type === 'INFO'
        return n.type === filter
    })
    const unreadCount = notifications.filter(n => !n.isRead).length

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
    )

    return (
        <div className="space-y-10 animate-fade-in pb-16">
            {/* Header: Premium Centered Identity */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => router.back()}
                    className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-gray-400 hover:text-white transition-all active:scale-95"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex flex-col items-center px-4">
                    <h1 className="text-xl font-black text-white tracking-tight ">Notifications</h1>
                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-0.5">{unreadCount} New Alerts</p>
                </div>
                <button
                    onClick={markAllRead}
                    className="text-[9px] font-black uppercase tracking-widest text-gray-600 hover:text-white transition-colors"
                >
                    Dismiss All
                </button>
            </div>

            {/* Filter Navigation: Premium Fluid UI */}
            <div className="relative">
                <div 
                    className="flex bg-[#161b22]/50 backdrop-blur-xl p-1 rounded-2xl border border-white/[0.05] gap-0.5 overflow-x-auto shadow-2xl shadow-black/40 relative z-10"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    <style>{`
                        .no-scrollbar::-webkit-scrollbar { display: none; }
                    `}</style>
                    {['ALL', 'ALERT', 'TASK', 'SYSTEM', 'INFO'].map((f) => {
                        const active = filter === f
                        const label = f === 'ALERT' ? 'Urgent' : f === 'TASK' ? 'Tasks' : f === 'SYSTEM' ? 'System' : f === 'INFO' ? 'Messages' : 'Global'
                        
                        return (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={cn(
                                    "relative flex-1 min-w-fit px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-[0.15em] transition-all duration-300 shrink-0 outline-none",
                                    active ? "text-white" : "text-gray-500 hover:text-gray-300"
                                )}
                            >
                                <span className="relative z-20">{label}</span>
                                {active && (
                                    <motion.div
                                        layoutId="activeFilter"
                                        className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/20 z-10"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Notifications Grid */}
            <div className="space-y-6">
                <AnimatePresence mode="popLayout">
                    {filtered.length === 0 ? (
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="py-24 text-center space-y-6"
                        >
                            <div className="w-24 h-24 bg-white/[0.02] rounded-[40px] flex items-center justify-center mx-auto border border-dashed border-white/10 opacity-20 relative overflow-hidden group">
                                <BellOff className="w-10 h-10 text-gray-400" />
                                <div className="absolute inset-0 bg-blue-500/10 blur-2xl group-hover:animate-pulse"></div>
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-sm font-black text-white uppercase tracking-widest ">Notifications</h3>
                                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest leading-loose">Your notification log is clear.<br/>New dispatches will arrive here in real-time.</p>
                            </div>
                        </motion.div>
                    ) : (
                        filtered.map((note) => {
                            const Icon = note.type === 'ALERT' ? AlertCircle : note.type === 'TASK' ? ClipboardList : note.type === 'SYSTEM' ? Wallet : Bell
                            return (
                                <motion.div
                                    key={note.id}
                                    layout
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 100, scale: 0.9 }}
                                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                                    drag="x"
                                    dragConstraints={{ left: 0, right: 100 }}
                                    onDragEnd={(_, info) => {
                                        if (info.offset.x > 80) {
                                            removeNotification(note.id)
                                        }
                                    }}
                                    onClick={() => {
                                        if (isNavigating) return
                                        setIsNavigating(true)
                                        if (!note.isRead) markSingleRead(note.id)
                                        
                                        const titleLower = note.title.toLowerCase()
                                        let route = '/staff'
                                        if (titleLower.includes('message') || titleLower.includes('chat')) route = '/staff/messages'
                                        else if (note.type === 'TASK' || titleLower.includes('task')) route = '/staff/tasks'
                                        else if (titleLower.includes('punch') || titleLower.includes('attendance')) route = '/staff/attendance'
                                        else if (note.type === 'ALERT') route = '/staff'
                                        
                                        router.push(route)
                                    }}
                                    className={cn(
                                        "bg-[#161b22] border group p-5 rounded-2xl flex items-start gap-5 transition-all relative overflow-hidden active:scale-[0.98] shadow-xl shadow-black/20 cursor-pointer hover:bg-white/[0.02] touch-pan-y",
                                        !note.isRead ? 'border-blue-500/30 ring-1 ring-blue-500/10' : 'border-white/[0.05] hover:border-white/10',
                                        isNavigating && 'opacity-60 pointer-events-none'
                                    )}
                                >
                                    {/* Vertical Status Bar */}
                                    <div className={cn(
                                        "absolute top-0 bottom-0 left-0 w-1 transition-all group-hover:w-1.5", 
                                        note.type === 'ALERT' ? 'bg-rose-500 shadow-[2px_0_10px_rgba(244,63,94,0.3)]' : 
                                        note.type === 'TASK' ? 'bg-blue-600 shadow-[2px_0_10px_rgba(37,99,235,0.3)]' : 
                                        'bg-slate-600'
                                    )}></div>

                                    <div className={cn(
                                        "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-300",
                                        note.type === 'ALERT' ? "bg-rose-500/10 border-rose-500/20" :
                                            note.type === 'TASK' ? "bg-blue-600/10 border-blue-500/20" :
                                                "bg-slate-500/10 border-slate-500/20"
                                    )}>
                                        <Icon className={cn("w-5 h-5",
                                            note.type === 'ALERT' ? "text-rose-500" :
                                                note.type === 'TASK' ? "text-blue-500" :
                                                    "text-slate-400"
                                        )} />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-[14px] font-bold text-white tracking-tight leading-none group-hover:text-blue-400 transition-colors">{note.title}</h4>
                                                {!note.isRead && (
                                                    <div className="flex h-1.5 w-1.5 relative">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
                                                    </div>
                                                )}
                                            </div>
                                            <span className={cn(
                                                "text-[9px] font-black uppercase tracking-widest text-gray-600",
                                                !note.isRead && "text-blue-500/60"
                                            )}>
                                                {format(new Date(note.createdAt), 'hh:mm a')}
                                            </span>
                                        </div>
                                        <p className="text-[12px] font-medium text-gray-500 leading-relaxed mb-3 line-clamp-2">{note.description}</p>
                                        
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 bg-white/[0.03] px-2.5 py-1 rounded-md border border-white/[0.05]">
                                                <Clock className="w-3 h-3 text-gray-700" />
                                                <span className="text-[8px] font-black text-gray-600 uppercase tracking-[0.1em]">
                                                    {isToday(new Date(note.createdAt)) ? 'Live Dispatch' :
                                                        isYesterday(new Date(note.createdAt)) ? 'Yesterday' :
                                                            format(new Date(note.createdAt), 'dd MMM')}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[9px] font-black text-blue-500/0 group-hover:text-blue-500 uppercase tracking-widest transition-all duration-300 -translate-x-2 group-hover:translate-x-0">
                                                Execute <ArrowRight className="w-3 h-3" />
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {isNavigating && (
                                        <div className="absolute inset-0 bg-blue-500/5 backdrop-blur-[2px] flex items-center justify-center z-30">
                                            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                                        </div>
                                    )}
                                </motion.div>
                            )
                        })
                    )}
                </AnimatePresence>
            </div>

        </div>
    )
}
