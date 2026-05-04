'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { toast } from 'sonner'
import {
    LayoutGrid, Loader2, Smartphone, Package,
    Trophy, Calendar,
    ShieldCheck,
    Clock, Zap, ArrowRight, CheckCircle2, ClipboardList,
    MessageCircle, ShieldAlert, AlertTriangle
} from 'lucide-react'
import { format, getHours } from 'date-fns'
import { cn } from '@/lib/utils'
import dynamic from 'next/dynamic'
import { usePwaInstall } from '@/lib/hooks/usePwaInstall'
const PWAInstall = dynamic(() => import('@/components/common/PWAInstall'), { ssr: false })

export default function StaffDashboard() {
    const router = useRouter()
    const { isInstallable, installPwa } = usePwaInstall()
    const [punchLoading, setPunchLoading] = useState(false)
    const [currentTime, setCurrentTime] = useState(new Date())

    const { data, mutate, isValidating } = useSWR('/api/staff/me', (url) => fetch(url).then(res => res.json()), {
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
        dedupingInterval: 10000 // 10 seconds
    })

    const loading = !data && isValidating

    const fetchData = useCallback(() => {
        mutate()
    }, [mutate])

    useEffect(() => {
        const isPunchedIn = data?.attendance?.punchIn && !data?.attendance?.punchOut
        if (isPunchedIn) {
            const timer = setInterval(() => setCurrentTime(new Date()), 60000)
            return () => clearInterval(timer)
        }
    }, [data?.attendance?.punchIn, data?.attendance?.punchOut])

    const handlePunch = async () => {
        setPunchLoading(true)
        try {
            const res = await fetch('/api/staff/attendance', { method: 'POST' })
            if (res.ok) {
                const json = await res.json()
                toast.success(json.message)
                fetchData()
            } else {
                toast.error('Failed to update attendance')
            }
        } catch (error) {
            toast.error('Something went wrong')
        } finally {
            setPunchLoading(false)
        }
    }

    // --- SKELETON UI ---
    if (!data && loading) return (
        <div className="space-y-8 animate-pulse px-2 pb-12">
            <div className="flex items-center justify-between">
                <div className="space-y-3">
                    <div className="h-2 w-24 bg-white/5 rounded-full" />
                    <div className="h-8 w-48 bg-white/5 rounded-xl" />
                </div>
                <div className="w-14 h-14 rounded-full bg-white/5" />
            </div>
            <div className="h-64 w-full bg-white/5 rounded-[45px]" />
            <div className="grid grid-cols-2 gap-4">
                <div className="h-24 bg-white/5 rounded-3xl" />
                <div className="h-24 bg-white/5 rounded-3xl" />
            </div>
            <div className="space-y-4">
                <div className="h-4 w-32 bg-white/5 rounded-full mx-2" />
                <div className="grid grid-cols-2 gap-4">
                    <div className="h-32 bg-white/5 rounded-[30px]" />
                    <div className="h-32 bg-white/5 rounded-[30px]" />
                </div>
            </div>
        </div>
    )

    if (!data) return <div className="p-8 text-center text-rose-500 font-bold">Failed to load. Please refresh.</div>

    const isPunchedIn = data.attendance?.punchIn && !data.attendance?.punchOut
    const isPunchedOutToday = !!data.attendance?.punchOut


    const getShiftTimes = () => {
        if (!data.attendance?.punchIn) return { start: '--:--', end: '--:--', progress: 0 }
        
        const start = new Date(data.attendance.punchIn)
        const formatTime = (d: Date) => format(d, 'HH:mm')
        
        // Progress calculation (Assuming 9-hour shift = 540 mins)
        const diffMs = currentTime.getTime() - start.getTime()
        const diffMins = Math.floor(diffMs / 60000)
        const progress = Math.min(Math.max((diffMins / 540) * 100, 0), 100)

        const estimatedEnd = new Date(start.getTime() + 9 * 60 * 60 * 1000)

        return {
            start: formatTime(start),
            end: data.attendance.punchOut ? formatTime(new Date(data.attendance.punchOut)) : formatTime(estimatedEnd),
            progress
        }
    }

    const { start, end, progress } = getShiftTimes()

    const getGreeting = () => {
        const hour = getHours(new Date())
        if (hour < 12) return 'Good Morning'
        if (hour < 17) return 'Good Afternoon'
        return 'Good Evening'
    }

    const perfScore = data.performanceScore?.overallScore 
        ? `${data.performanceScore.overallScore.toFixed(0)}%` 
        : (data.performanceScore?.tasksCompleted || 0) > 0 
            ? `${Math.round((data.performanceScore.tasksCompleted / (data.performanceScore.tasksCompleted + data.performanceScore.slaBreaches)) * 100)}%`
            : 'New';

    const urgentTasks = (data.tasks || []).filter((t: any) => t.priority === 'URGENT')

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            {/* Header / Greeting */}
            <div className="flex items-center justify-between px-2">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500 opacity-80">Today&apos;s Shift</p>
                        {isValidating && (
                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/10 rounded-full border border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.1)]">
                                <div className="w-1 h-1 bg-blue-500 rounded-full animate-ping" />
                                <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">Live Sync</span>
                            </div>
                        )}
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tighter  leading-none">
                        {getGreeting()}, <span className="text-blue-500">{data.profile?.user?.name ? data.profile.user.name.split(' ')[0] : 'Staff'}</span>
                    </h1>
                </div>
                <div 
                    onClick={() => router.push('/staff/profile')}
                    className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 p-[2px] cursor-pointer shadow-xl shadow-blue-500/10 transition-all border border-white/5"
                >
                    <div className="w-full h-full rounded-full bg-[#0d1117] flex items-center justify-center overflow-hidden border-4 border-[#161b22]">
                        <img 
                            src={data.profile?.profilePhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.profile?.user?.name || 'staff'}`} 
                            alt="" 
                            className="w-full h-full object-cover" 
                        />
                    </div>
                </div>
            </div>

            <PWAInstall />

            {/* Shift Information Card */}
            <div className="bg-[#161b22]/80 backdrop-blur-xl border border-white/[0.08] rounded-[45px] p-10 shadow-3xl relative overflow-hidden group shadow-black/60 transition-all hover:border-blue-500/20">
                {/* Advanced Background Flair */}
                <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 blur-[100px] rounded-full translate-x-32 -translate-y-32 group-hover:bg-blue-600/20 transition-all duration-700 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-60 h-60 bg-indigo-600/5 blur-[80px] rounded-full -translate-x-20 translate-y-20 group-hover:bg-indigo-600/10 transition-all duration-700 pointer-events-none"></div>
                
                <div className="relative z-10">
                    <div className="flex items-start justify-between mb-8">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <div className={cn("w-2 h-2 rounded-full animate-pulse", isPunchedIn ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-gray-600")}></div>
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 ">Shift Status</p>
                            </div>
                            <h2 className="text-2xl font-bold text-white tracking-tight">
                                {isPunchedIn ? 'Shift In Progress' : 'Not Punched In'}
                            </h2>
                        </div>
                        <div className="w-16 h-16 rounded-[24px] bg-white/[0.03] border border-white/[0.05] flex items-center justify-center shadow-inner group-hover:border-blue-500/30 transition-all">
                            <Clock className={cn("w-8 h-8 transition-colors", isPunchedIn ? "text-blue-500" : "text-gray-700")} />
                        </div>
                    </div>

                    {/* Dynamic Timeline Integration */}
                    {isPunchedIn && (
                        <div className="mb-10 space-y-4 animate-in slide-in-from-top duration-700">
                            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] ">
                                <span className="text-blue-400">In: {start}</span>
                                <span className="text-gray-600">Shift Progress</span>
                                <span className="text-gray-400">Est. End: {end}</span>
                            </div>
                            <div className="h-2.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/[0.08] shadow-inner p-[1px]">
                                <div 
                                    className="h-full bg-gradient-to-r from-blue-600 via-indigo-400 to-blue-500 rounded-full transition-all duration-1000 relative shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                                    style={{ width: `${progress}%` }}
                                >
                                    <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.4)_50%,transparent_100%)] w-20 animate-shimmer-fast"></div>
                                </div>
                            </div>
                            <p className="text-center text-[9px] font-black text-blue-500 uppercase tracking-[0.4em] opacity-60">{Math.floor(progress)}% shift completed</p>
                        </div>
                    )}

                    <button
                        onClick={handlePunch}
                        disabled={punchLoading}
                        className={cn(
                            "w-full h-20 rounded-[30px] flex items-center justify-center gap-5 font-black text-[12px] uppercase tracking-[0.3em] transition-all active:scale-[0.97] disabled:opacity-50 border shadow-2xl  group/btn overflow-hidden relative",
                            isPunchedIn 
                                ? "bg-rose-500 text-white border-rose-400/20 hover:bg-rose-600" 
                                : "bg-blue-600 text-white border-blue-400/20 hover:bg-blue-700 shadow-blue-500/20"
                        )}
                    >
                        {punchLoading ? (
                            <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                            <>
                                <Zap className={cn("w-6 h-6 z-10", isPunchedIn ? "fill-white" : "fill-white/30")} />
                                <span className="z-10">{isPunchedIn ? 'Punch Out' : 'Punch In'}</span>
                                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300"></div>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* KPI Section */}
            <div className="grid grid-cols-2 gap-4">
                {[
                    { label: 'Tasks Assigned', value: data.tasks.length, icon: ClipboardList, color: 'text-blue-400', bg: 'bg-blue-600/10', border: 'hover:border-blue-500/30' },
                    { label: 'Performance',    value: perfScore,          icon: Trophy,        color: 'text-amber-400', bg: 'bg-amber-600/10', border: 'hover:border-amber-500/30' },
                ].map((kpi, i) => (
                    <div key={i} className={cn(
                        "bg-[#161b22]/80 backdrop-blur-md border border-white/[0.05] p-6 rounded-[32px] flex items-center justify-between transition-all group hover:bg-[#1c2128] hover:-translate-y-1 active:scale-95",
                        kpi.border
                    )}>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">{kpi.label}</p>
                            <p className="text-2xl font-black text-white tracking-tighter">{kpi.value}</p>
                        </div>
                        <div className={cn('w-12 h-12 rounded-[18px] flex items-center justify-center border border-white/[0.05] transition-all group-hover:scale-110 shadow-lg', kpi.bg)}>
                            <kpi.icon className={cn('w-6 h-6', kpi.color)} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="space-y-3">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Quick Actions</h3>
                <div className="grid grid-cols-3 gap-3">
                    <button
                        onClick={() => router.push('/staff/lost-found')}
                        className="p-4 bg-[#161b22] border border-white/[0.05] rounded-3xl flex flex-col items-center gap-2.5 group hover:border-amber-500/30 transition-all active:scale-[0.97]"
                    >
                        <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center group-hover:bg-amber-500 transition-all">
                            <Package className="w-5 h-5 text-amber-500 group-hover:text-white transition-colors" />
                        </div>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500 group-hover:text-white transition-colors text-center leading-tight">Lost &amp; Found</span>
                    </button>
                    <button
                        onClick={() => router.push('/staff/leave')}
                        className="p-4 bg-[#161b22] border border-white/[0.05] rounded-3xl flex flex-col items-center gap-2.5 group hover:border-blue-500/30 transition-all active:scale-[0.97]"
                    >
                        <div className="w-11 h-11 rounded-2xl bg-blue-600/10 border border-blue-600/20 flex items-center justify-center group-hover:bg-blue-600 transition-all">
                            <Calendar className="w-5 h-5 text-blue-500 group-hover:text-white transition-colors" />
                        </div>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500 group-hover:text-white transition-colors text-center leading-tight">Apply Leave</span>
                    </button>
                    <button
                        onClick={() => router.push('/staff/messages')}
                        className="p-4 bg-[#161b22] border border-white/[0.05] rounded-3xl flex flex-col items-center gap-2.5 group hover:border-emerald-500/30 transition-all active:scale-[0.97]"
                    >
                        <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500 transition-all">
                            <MessageCircle className="w-5 h-5 text-emerald-500 group-hover:text-white transition-colors" />
                        </div>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500 group-hover:text-white transition-colors text-center leading-tight">Messages</span>
                    </button>
                </div>
                
                {!data.profile?.isVerified && (
                    <div 
                        onClick={() => router.push('/staff/profile')}
                        className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4 flex items-center justify-between group cursor-pointer hover:bg-amber-500/10 transition-all animate-pulse"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                                <ShieldCheck className="w-4 h-4 text-amber-500" />
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest">ID Not Verified</p>
                                <p className="text-[8px] font-bold text-gray-600 uppercase tracking-widest leading-none mt-1">Complete your profile to get full access</p>
                            </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-amber-500 opacity-50 group-hover:translate-x-1 group-hover:opacity-100 transition-all" />
                    </div>
                )}
            </div>

            {/* URGENT DOMAIN */}
            {urgentTasks.length > 0 && (
                <div className="space-y-4 animate-bounce-subtle">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-sm font-black text-rose-500 uppercase tracking-widest flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4" />
                            Urgent dispatches
                        </h3>
                    </div>
                    <div className="space-y-3">
                        {urgentTasks.map((task: any) => (
                            <div 
                                key={task.id}
                                onClick={() => router.push(`/staff/tasks/${task.id}`)}
                                className="bg-rose-500/10 border border-rose-500/20 rounded-[30px] p-6 flex flex-col gap-4 relative overflow-hidden group active:scale-[0.98] transition-all"
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 blur-3xl rounded-full translate-x-16 -translate-y-16 group-hover:scale-125 transition-transform"></div>
                                <div className="flex items-start justify-between relative z-10">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-2xl bg-rose-500 flex items-center justify-center text-white shadow-lg shadow-rose-500/20">
                                            <AlertTriangle className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] mb-0.5">Immediate Attention Required</p>
                                            <h4 className="text-lg font-black text-white tracking-tight leading-none">Room {task.room?.roomNumber || 'Gen-Ops'}</h4>
                                        </div>
                                    </div>
                                    <ArrowRight className="w-5 h-5 text-rose-500" />
                                </div>
                                <p className="text-sm font-bold text-gray-300 relative z-10">{task.title}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* My Tasks */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        Work Queue
                        {(data.tasks || []).length > 0 && (
                            <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[9px] font-black flex items-center justify-center">
                                {(data.tasks || []).length}
                            </span>
                        )}
                    </h3>
                </div>

                <div className="space-y-3">
                    {(data.tasks || []).length === 0 ? (
                        <div className="py-16 text-center bg-[#161b22] rounded-3xl border border-dashed border-white/5">
                            <div className="w-12 h-12 bg-white/[0.02] border border-white/5 rounded-full flex items-center justify-center mx-auto mb-3 opacity-30">
                                <CheckCircle2 className="w-6 h-6 text-white" />
                            </div>
                            <p className="text-xs font-medium text-gray-600">No tasks assigned right now</p>
                        </div>
                    ) : (
                        (data.tasks || []).slice(0, 5).map((task: any) => (
                            <div
                                key={task.id}
                                onClick={() => router.push(`/staff/tasks/${task.id}`)}
                                className="bg-[#161b22] rounded-2xl border border-white/[0.05] flex items-center gap-4 overflow-hidden cursor-pointer hover:bg-white/[0.02] transition-all active:scale-[0.98]"
                            >
                                {/* Priority stripe */}
                                <div className={cn(
                                    'w-1 self-stretch shrink-0',
                                    task.priority === 'URGENT' ? 'bg-rose-500' : 'bg-blue-600'
                                )} />

                                <div className="flex-1 py-4 pr-4 min-w-0">
                                    <div className="flex items-start justify-between gap-2 mb-1">
                                        <p className="text-sm font-bold text-white truncate">{task.title}</p>
                                        <span className="text-[9px] font-bold text-gray-600 shrink-0">
                                            {task.createdAt && format(new Date(task.createdAt), 'HH:mm')}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-500">
                                            Room {task.room?.roomNumber || 'General'}
                                        </span>
                                        <span className="text-gray-700">·</span>
                                        <span className={cn(
                                            'text-[9px] font-bold uppercase tracking-wider',
                                            task.priority === 'URGENT' ? 'text-rose-400' : 'text-blue-400'
                                        )}>
                                            {task.priority || 'Normal'}
                                        </span>
                                    </div>
                                    {task.description && (
                                        <p className="text-xs text-gray-600 mt-1 line-clamp-1">{task.description}</p>
                                    )}
                                </div>

                                <ArrowRight className="w-4 h-4 text-gray-700 mr-4 shrink-0" />
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* PWA Install Banner — only shows when browser supports it and app isn't installed */}
            {isInstallable && (
                <button
                    onClick={installPwa}
                    className="w-full p-5 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-[40px] flex items-center justify-between relative overflow-hidden group shadow-2xl shadow-blue-600/20 active:scale-[0.98] transition-all"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-2xl rounded-full translate-x-16 -translate-y-16 group-hover:scale-110 transition-transform duration-1000" />
                    <div className="relative z-10 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                            <Smartphone className="w-6 h-6 text-white" />
                        </div>
                        <div className="text-left">
                            <h4 className="text-sm font-bold text-white">Install the App</h4>
                            <p className="text-[10px] text-blue-100/70 mt-0.5">Add to home screen for quick access</p>
                        </div>
                    </div>
                    <div className="relative z-10 w-10 h-10 rounded-xl bg-white text-blue-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <ArrowRight className="w-5 h-5" />
                    </div>
                </button>
            )}
        </div>
    )
}




