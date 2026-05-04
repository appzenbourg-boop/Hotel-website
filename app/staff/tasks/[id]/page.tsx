'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
    ChevronLeft, MapPin, Clock,
    CheckCircle2, AlertCircle, MessageSquare,
    Loader2, Camera, Info, ArrowRight,
    Star, Sparkles, Building2, Zap
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

export default function TaskDetailsPage() {
    const router = useRouter()
    const { id } = useParams()
    const [loading, setLoading] = useState(true)
    const [task, setTask] = useState<any>(null)
    const [completing, setCompleting] = useState(false)
    const [message, setMessage] = useState('')
    const [completionNotes, setCompletionNotes] = useState('')
    const [attachments, setAttachments] = useState<string[]>([])
    const [sendingMessage, setSendingMessage] = useState(false)
    const [isLoggingPhoto, setIsLoggingPhoto] = useState(false)

    const fetchTaskDetails = async () => {
        try {
            const res = await fetch(`/api/staff/tasks/${id}`)
            if (res.ok) {
                const data = await res.json()
                setTask(data)
            } else {
                toast.error('Task not found')
                router.push('/staff/tasks')
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchTaskDetails()
    }, [id])

    const handleLogPhoto = () => {
        setIsLoggingPhoto(true)
        // Simulate advanced camera integration for WoW effect
        setTimeout(() => {
            const mockPhotos = [
                'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=400',
                'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&q=80&w=400',
                'https://images.unsplash.com/photo-1560448204-61dc36dc98c8?auto=format&fit=crop&q=80&w=400'
            ]
            const newPhoto = mockPhotos[Math.floor(Math.random() * mockPhotos.length)]
            setAttachments(prev => [...prev, newPhoto])
            setIsLoggingPhoto(false)
            toast.success('Evidence Logged', {
                description: 'Photo attached to dispatch report.'
            })
        }, 1500)
    }

    const handleComplete = async () => {
        setCompleting(true)
        try {
            const res = await fetch(`/api/staff/tasks/${id}/complete`, { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    notes: completionNotes,
                    attachments
                })
            })
            if (res.ok) {
                toast.success('Task successfully completed!', {
                    description: 'Deployment report submitted to HQ.',
                    icon: <Sparkles className="w-4 h-4 text-emerald-500" />
                })
                router.push('/staff/tasks')
            } else {
                toast.error('Failed to update task')
            }
        } catch (error) {
            toast.error('Error updating task')
        } finally {
            setCompleting(false)
        }
    }
    const handleSendMessage = async () => {
        if (!message.trim()) return
        setSendingMessage(true)
        try {
            const res = await fetch('/api/staff/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: message,
                    serviceRequestId: id,
                    category: 'TEAM'
                })
            })
            if (res.ok) {
                setMessage('')
                fetchTaskDetails()
                toast.success('Dispatch Update Sent')
            }
        } catch { toast.error('Comm failure') }
        finally { setSendingMessage(false) }
    }

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[80vh]">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Syncing Dispatch Intel...</p>
        </div>
    )

    if (!task) return null

    return (
        <div className="space-y-6 animate-fade-in pb-12">
            {/* Header */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => router.back()}
                    className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-gray-400 hover:text-white transition-all active:scale-95"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex flex-col items-center">
                    <h1 className="text-xl font-black text-white tracking-tight ">Mission Context</h1>
                    <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-0.5">DISPATCH-ID: {task.id.slice(-6).toUpperCase()}</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-500 relative">
                    <Sparkles className="w-4 h-4" />
                    <div className="absolute inset-0 bg-blue-500/20 blur-xl animate-pulse"></div>
                </div>
            </div>

            {/* Hero Image / Location Card */}
            <div className="relative h-64 rounded-[45px] overflow-hidden border border-white/[0.05] shadow-2xl group">
                <img
                    src="https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=800"
                    alt="Property"
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0d1117] via-[#0d1117]/40 to-transparent"></div>
                
                <div className="absolute bottom-8 left-8 right-8">
                    <div className="flex items-center gap-2 mb-3">
                        <div className={cn(
                            "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border",
                            task.priority === 'URGENT' ? 'bg-rose-500 text-white border-rose-400/50' : 'bg-blue-600 text-white border-blue-400/50'
                        )}>
                            Priority Alpha: {task.priority}
                        </div>
                        <div className="px-3 py-1 bg-black/60 backdrop-blur-xl rounded-full text-[8px] font-black text-white uppercase tracking-widest border border-white/10">
                            {task.type}
                        </div>
                    </div>
                    <div className="flex items-end justify-between">
                        <div>
                            <h2 className="text-3xl font-black text-white  tracking-tighter mb-1">Sector {task.room?.roomNumber || 'Gen-Ops'}</h2>
                            <div className="flex items-center gap-2 text-gray-400">
                              <MapPin className="w-3.5 h-3.5 text-blue-500" />
                              <span className="text-[10px] font-bold uppercase tracking-[0.2em] ">Station: Grand Zenbourg HQ</span>
                            </div>
                        </div>
                        <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/40 rotate-12 group-hover:rotate-0 transition-all duration-500">
                            <Building2 className="w-8 h-8 text-black" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Instruction Panel */}
            <div className="bg-[#161b22] border border-white/[0.05] rounded-[40px] p-8 space-y-8 shadow-3xl">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center shadow-inner">
                        <Info className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                        <h3 className="text-base font-black text-white  tracking-tight">Deployment Directives</h3>
                        <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest ">{formatDistanceToNow(new Date(task.createdAt))} since activation</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-blue-500">
                        <Zap className="w-4 h-4 fill-blue-500/20" />
                        <h4 className="text-lg font-black text-white tracking-tight ">{task.title}</h4>
                    </div>
                    <p className="text-[13px] font-medium text-gray-500 leading-relaxed bg-black/40 p-6 rounded-[28px] border border-white/[0.03]  shadow-inner">
                        {task.description || "Establish standard operational parameters. Maintenance of premium hospitality vectors is mandatory. Refer to tactical baseline for unit setup."}
                    </p>
                </div>

                {/* Evidence Logging Section */}
                <div className="space-y-4 pt-4 border-t border-white/[0.03]">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest ">Digital Evidence Log</span>
                        <span className="text-[9px] font-bold text-blue-500/60 uppercase">{attachments.length} files captured</span>
                    </div>
                    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                        <button 
                            onClick={handleLogPhoto}
                            disabled={isLoggingPhoto}
                            className="w-20 h-20 shrink-0 bg-white/[0.03] border border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center gap-2 group hover:border-blue-500/40 transition-all active:scale-95"
                        >
                            {isLoggingPhoto ? (
                                <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                            ) : (
                                <>
                                    <Camera className="w-6 h-6 text-gray-700 group-hover:text-blue-500 transition-colors" />
                                    <span className="text-[7px] font-black uppercase text-gray-700">Capture</span>
                                </>
                            )}
                        </button>
                        {attachments.map((url, i) => (
                            <div key={i} className="w-20 h-20 shrink-0 rounded-3xl overflow-hidden border border-white/10 shadow-lg relative group">
                                <img src={url} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt="Evidence" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <ArrowRight className="w-5 h-5 text-white" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Communication & Notes Terminal */}
            <div className="bg-[#161b22] border border-white/[0.05] rounded-[40px] p-8 space-y-8 shadow-3xl">
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-600 shadow-xl shadow-blue-500/20 flex items-center justify-center border border-blue-400/20">
                                <MessageSquare className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-xs font-black text-white uppercase tracking-[0.2em] ">Comm Terminal</span>
                        </div>
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                    </div>
                    
                    <div className="max-h-64 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
                        {task.messages?.length === 0 ? (
                            <div className="py-12 text-center opacity-20 flex flex-col items-center gap-3">
                                <Zap className="w-8 h-8" />
                                <p className="text-[10px] font-black uppercase tracking-widest">Awaiting dispatch comms...</p>
                            </div>
                        ) : (
                            task.messages?.map((msg: any) => (
                                <div key={msg.id} className={cn(
                                    "p-5 rounded-[24px] text-[12px] font-semibold transition-all relative group",
                                    msg.senderId === task.assignedTo?.userId 
                                        ? "bg-blue-600/10 text-blue-100 border border-blue-500/20 ml-10 rounded-tr-none" 
                                        : "bg-white/[0.02] text-gray-500 border border-white/[0.05] mr-10 rounded-tl-none"
                                )}>
                                    <p className="leading-relaxed">{msg.content}</p>
                                    <div className="flex items-center gap-2 mt-3 opacity-40 group-hover:opacity-100 transition-opacity">
                                        <span className="text-[8px] font-black uppercase tracking-widest">
                                            {msg.senderId === task.assignedTo?.userId ? 'Operative' : 'Command HQ'}
                                        </span>
                                        <div className="w-1 h-1 rounded-full bg-gray-600"></div>
                                        <span className="text-[8px] font-black uppercase tracking-widest">{formatDistanceToNow(new Date(msg.createdAt))} ago</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="flex gap-3 bg-black/40 p-2 rounded-[24px] border border-white/[0.05] shadow-inner">
                        <input
                            id="chat-input"
                            type="text"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Input dispatch update..."
                            className="flex-1 bg-transparent px-5 py-3 text-xs text-white outline-none font-bold placeholder:text-gray-700"
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        />
                        <button 
                            onClick={handleSendMessage}
                            disabled={sendingMessage || !message.trim()}
                            className="w-12 h-12 bg-white text-blue-600 rounded-2xl flex items-center justify-center shadow-2xl transition-all active:scale-95 disabled:opacity-20"
                        >
                            {sendingMessage ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                {/* Final Completion Notes */}
                <div className="space-y-4 pt-2">
                    <div className="flex items-center gap-2 ml-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Post-Operation Briefing</span>
                    </div>
                    <textarea 
                        value={completionNotes}
                        onChange={(e) => setCompletionNotes(e.target.value)}
                        placeholder="Log detailed completion summary here..."
                        className="w-full bg-black/40 border border-white/[0.05] rounded-[28px] p-6 text-[13px] text-white outline-none focus:border-blue-500/30 transition-all font-medium  min-h-[120px] shadow-inner"
                    />
                </div>
            </div>

            {/* Terminal Termination Button */}
            <button
                onClick={handleComplete}
                disabled={completing}
                className={cn(
                    "w-full h-20 rounded-[35px] flex items-center justify-center gap-4 transition-all active:scale-[0.97] shadow-3xl group mb-8 border relative overflow-hidden",
                    completing 
                        ? "bg-gray-800 text-gray-700 border-white/5" 
                        : "bg-white text-blue-600 shadow-blue-500/20 border-white hover:bg-blue-50"
                )}
            >
                {completing ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                    <>
                        <div className="absolute inset-0 bg-blue-600 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                        <CheckCircle2 className="w-6 h-6 relative z-10 group-hover:text-white transition-colors" />
                        <span className="text-[11px] font-black uppercase tracking-[0.4em] relative z-10 group-hover:text-white transition-colors ">Finalize Mission</span>
                        <div className="absolute top-0 right-10 bottom-0 flex items-center opacity-10 group-hover:opacity-30 group-hover:translate-x-2 transition-all">
                            <Sparkles className="w-10 h-10 group-hover:text-white" />
                        </div>
                    </>
                )}
            </button>
        </div>
    )
}
