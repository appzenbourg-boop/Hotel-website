'use client'

import { useRouter } from 'next/navigation'
import { 
    ChevronLeft, Info, BookOpen, ShieldCheck, 
    Clock, Zap, Sparkles, Sliders, CheckCircle2,
    Lock, Smartphone, MessageCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function OperationalSOPPage() {
    const router = useRouter()

    const sops = [
        {
            title: 'Attendance Protocol',
            icon: Clock,
            content: 'Staff must punch-in via the Digital Terminal within 15 minutes of shift start. Late loggers (>15m) require automated override by floor lead.',
            priority: 'CRITICAL'
        },
        {
            title: 'Guest Privacy Shield',
            icon: Lock,
            content: 'Room entry is prohibited without an active service token. All interactions are logged via the AI Communication Link.',
            priority: 'HIGH'
        },
        {
            title: 'Dynamic Task Queue',
            icon: Zap,
            content: 'Task priority is calculated in real-time. Staff must acknowledge NEW tasks within 120 seconds for optimal performance scoring.',
            priority: 'OPERATIONAL'
        },
        {
            title: 'Emergency Response',
            icon: ShieldCheck,
            content: 'In case of fire or medical emergency, activate the Red Alert via the system command center. Direct owner link established instantly.',
            priority: 'CRITICAL'
        }
    ]

    return (
        <div className="space-y-8 animate-fade-in pb-20 bg-[#0d1117] min-h-screen p-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => router.back()}
                    className="w-12 h-12 rounded-[22px] bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-gray-500 hover:text-white transition-all active:scale-95 shadow-inner"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <div className="flex flex-col items-center">
                    <h1 className="text-2xl font-black text-white tracking-tighter  uppercase underline underline-offset-8 decoration-purple-500/20 leading-none mb-2">Internal SOP</h1>
                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.4em] ">Standard Operating Procedures</p>
                </div>
                <div className="w-12 h-12 rounded-[22px] bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-purple-500">
                    <BookOpen className="w-6 h-6" />
                </div>
            </div>

            {/* AI Insight Banner */}
            <div className="p-8 bg-gradient-to-br from-purple-600/10 to-blue-600/10 rounded-[45px] border border-purple-500/10 relative overflow-hidden group shadow-2xl shadow-purple-600/5">
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 blur-3xl rounded-full translate-x-16 -translate-y-16"></div>
                <div className="relative z-10 flex items-start gap-5">
                    <div className="w-14 h-14 bg-[#161b22] rounded-2xl flex items-center justify-center border border-white/5 shadow-inner shrink-0 transition-transform group-hover:scale-110">
                        <Sparkles className="w-7 h-7 text-purple-500" />
                    </div>
                    <div>
                        <h4 className="text-lg font-black text-white  tracking-tight mb-2">Protocol Intelligence</h4>
                        <p className="text-[10px] font-bold text-gray-500 leading-relaxed uppercase tracking-widest ">These procedures are cryptographically verified for Zenbourg Operations. Compliance directly impacts your Performance Matrix score.</p>
                    </div>
                </div>
            </div>

            {/* SOP Grid */}
            <div className="space-y-4">
                {sops.map((sop, i) => (
                    <div key={i} className="bg-[#161b22] border border-white/[0.05] p-6 rounded-[40px] relative overflow-hidden group shadow-xl shadow-black/20 hover:bg-white/[0.02] transition-all">
                        <div className="flex items-start gap-5">
                            <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center shrink-0">
                                <sop.icon className="w-6 h-6 text-purple-500" />
                            </div>
                            <div className="flex-1 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-black text-white  tracking-tight uppercase">{sop.title}</h3>
                                    <span className={cn(
                                        "text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border",
                                        sop.priority === 'CRITICAL' ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' :
                                        sop.priority === 'HIGH' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                                        'bg-blue-500/10 border-blue-500/20 text-blue-500'
                                    )}>
                                        {sop.priority}
                                    </span>
                                </div>
                                <p className="text-[12px] font-medium text-gray-500 leading-relaxed ">{sop.content}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Acknowledgement */}
            <div className="p-8 bg-[#161b22] border border-white/[0.03] rounded-[45px] flex flex-col items-center text-center gap-6 shadow-3xl">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 shadow-inner">
                    <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                    <h3 className="text-sm font-black text-white  tracking-tighter uppercase mb-2">Protocol Sync Active</h3>
                    <p className="text-[9px] font-bold text-gray-600 uppercase tracking-[0.3em]">Your account has been verified for SOP Rev 4.2</p>
                </div>
            </div>
        </div>
    )
}
