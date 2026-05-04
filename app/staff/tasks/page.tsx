'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import {
    AlertCircle, CheckCircle2, Clock,
    ChevronLeft, Filter, Search,
    ArrowRight, MapPin, Loader2,
    Calendar, MoreHorizontal, Sparkles,
    LayoutGrid, ClipboardList, Info
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

export default function StaffTasksPage() {
    const router = useRouter()
    const [filter, setFilter] = useState('ALL')
    const { data: meData, mutate, isValidating: loading } = useSWR('/api/staff/me', (url) => fetch(url).then(res => res.json()), {
        revalidateOnFocus: true,
        dedupingInterval: 2000
    })

    const tasks = Array.isArray(meData?.tasks) ? meData.tasks : []

    const fetchTasks = () => mutate()

    if (!meData && loading) return (
        <div className="space-y-8 animate-pulse px-4">
            <div className="flex justify-between items-center">
                <div className="h-10 w-10 bg-white/5 rounded-xl" />
                <div className="h-10 w-48 bg-white/5 rounded-xl text-center" />
                <div className="h-10 w-10 bg-white/5 rounded-xl" />
            </div>
            <div className="h-14 w-full bg-white/5 rounded-2xl" />
            {[1, 2, 3].map(i => (
                <div key={i} className="h-64 w-full bg-white/5 rounded-[45px]" />
            ))}
        </div>
    )

    const categories = [
        { id: 'ALL', label: 'All Tasks', count: tasks.length },
        { id: 'URGENT', label: 'Urgent', count: (tasks as any[]).filter((t: any) => t.priority === 'URGENT').length },
        { id: 'PENDING', label: 'Pending', count: (tasks as any[]).filter((t: any) => t.status === 'PENDING').length },
    ]

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            {/* Header / Premium Search */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => router.back()}
                    className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-gray-400 hover:text-white transition-all active:scale-95"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex flex-col items-center px-4">
                    <h1 className="text-xl font-black text-white tracking-tight ">Work Queue</h1>
                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-0.5 ">Live Operations Tunnel</p>
                </div>
                <button className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-gray-400 active:scale-95 transition-all">
                    <Search className="w-4 h-4" />
                </button>
            </div>

            {/* Filter Pills: Glassmorphism */}
            <div className="flex bg-[#161b22] p-1.5 rounded-2xl border border-white/[0.05] gap-1 overflow-x-auto no-scrollbar shadow-inner shadow-black/40">
                {categories.map((cat) => (
                    <button
                        key={cat.id}
                        onClick={() => setFilter(cat.id)}
                        className={cn(
                            "px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shrink-0 flex items-center gap-2",
                            filter === cat.id
                                ? "bg-blue-600 text-white shadow-xl shadow-blue-500/20"
                                : "text-gray-500 hover:text-gray-300"
                        )}
                    >
                        {cat.label}
                        {cat.count > 0 && (
                            <span className={cn(
                                "w-4 h-4 rounded-md flex items-center justify-center text-[8px]",
                                filter === cat.id ? "bg-white/20 text-white" : "bg-white/5 text-gray-600"
                            )}>
                                {cat.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Task Grid: Premium Cards */}
            <div className="grid grid-cols-1 gap-6">
                {tasks.filter((t: any) => {
                    if (filter === 'ALL') return true
                    if (filter === 'URGENT') return t.priority === 'URGENT'
                    if (filter === 'PENDING') return t.status === 'PENDING'
                    return true
                }).length === 0 ? (
                    <div className="py-24 text-center space-y-6">
                        <div className="w-24 h-24 bg-white/[0.02] rounded-[40px] flex items-center justify-center mx-auto border border-dashed border-white/10 opacity-20 group relative overflow-hidden">
                            <ClipboardList className="w-10 h-10 text-gray-400" />
                            <div className="absolute inset-0 bg-blue-500/10 blur-2xl animate-pulse"></div>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-sm font-black text-white uppercase tracking-widest ">Operations Synchronized</h3>
                            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest leading-loose">The deployment queue is currently clear.<br/>New dispatches will synchronize in real-time.</p>
                        </div>
                    </div>
                ) : (
                    tasks.filter((t: any) => {
                        if (filter === 'ALL') return true
                        if (filter === 'URGENT') return t.priority === 'URGENT'
                        if (filter === 'PENDING') return t.status === 'PENDING'
                        return true
                    }).map((task: any) => (
                        <div
                            key={task.id}
                            onClick={() => router.push(`/staff/tasks/${task.id}`)}
                            className="bg-[#161b22] rounded-[45px] overflow-hidden border border-white/[0.05] group hover:border-blue-500/20 transition-all flex flex-col relative active:scale-[0.98] shadow-3xl shadow-black/60"
                        >
                            <div className={cn(
                                "absolute top-0 bottom-0 left-0 w-2 transition-all group-hover:w-3",
                                task.priority === 'URGENT' ? 'bg-rose-500' : 'bg-blue-600'
                            )}></div>

                            <div className="p-10">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center group-hover:bg-blue-600/10 transition-all duration-500 shadow-inner">
                                            <LayoutGrid className="w-7 h-7 text-gray-600 group-hover:text-blue-500 transition-colors" />
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-black text-white  tracking-tight leading-none mb-2">Room {task.room?.roomNumber || 'Gen-Ops'}</h4>
                                            <div className="flex items-center gap-3">
                                                <span className={cn(
                                                    "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border",
                                                    task.priority === 'URGENT' ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' : 'bg-blue-500/10 border-blue-500/20 text-blue-500'
                                                )}>
                                                    Priority: {task.priority || 'Standard'}
                                                </span>
                                                <div className="flex items-center gap-1.5 opacity-40">
                                                    <Clock className="w-3 h-3 text-gray-500" />
                                                    <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">{format(new Date(task.createdAt), 'hh:mm a')}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="w-10 h-10 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-center">
                                        <MoreHorizontal className="w-5 h-5 text-gray-800" />
                                    </div>
                                </div>
                                
                                <h3 className="text-2xl font-black text-white tracking-tighter  mb-3 group-hover:text-blue-500 transition-colors leading-tight">{task.title}</h3>
                                <p className="text-[14px] font-medium text-gray-500 leading-relaxed line-clamp-2  mb-10">{task.description || 'Initialize standard operating procedures and verify system integrity upon completion.'}</p>
                                
                                <div className="flex items-center justify-between border-t border-white/[0.03] pt-8">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-600/10 flex items-center justify-center border border-blue-500/20">
                                            <Sparkles className="w-4 h-4 text-blue-500" />
                                        </div>
                                        <span className="text-[9px] font-black text-gray-700 uppercase tracking-[0.2em] ">Directives Ready</span>
                                    </div>
                                    <div className="flex items-center gap-3 group/btn">
                                        <span className="text-[9px] font-black text-white uppercase tracking-widest opacity-0 group-hover/btn:opacity-100 transition-all -translate-x-2 group-hover/btn:translate-x-0">Initiate</span>
                                        <div className="w-12 h-12 bg-blue-600 group-hover:bg-blue-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/30 transition-all">
                                            <ArrowRight className="w-5 h-5" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Support Note */}
            <div className="p-6 bg-blue-600/5 rounded-[40px] border border-blue-500/10 flex items-start gap-4 mx-2">
                <Info className="w-5 h-5 text-blue-500/40 shrink-0 mt-0.5" />
                <p className="text-[10px] font-bold text-blue-200/40 leading-relaxed uppercase tracking-widest ">Tasks are assigned based on current room status and priority algorithms. For issues, contact Ops-Command directly.</p>
            </div>
        </div>
    )
}

