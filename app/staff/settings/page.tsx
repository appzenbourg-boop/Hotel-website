'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { 
    ChevronLeft, Settings, Bell, Shield, 
    Smartphone, Moon, Globe, Loader2,
    Lock, CheckCircle2, Sliders, SmartphoneNfc
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export default function StaffSettingsPage() {
    const router = useRouter()
    const { data: session } = useSession()
    const [loading, setLoading] = useState(false)
    const [settings, setSettings] = useState({
        notifications: true,
        darkMode: true,
        biometric: false,
        lang: 'English'
    })

    const handleToggle = (key: keyof typeof settings) => {
        setSettings(prev => ({ ...prev, [key]: !prev[key] }))
        toast.success(`${key.charAt(0).toUpperCase() + key.slice(1)} updated`)
    }

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
                    <h1 className="text-2xl font-black text-white tracking-tighter  uppercase underline underline-offset-8 decoration-blue-500/20 leading-none mb-2">System Config</h1>
                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.4em] ">Operational Settings</p>
                </div>
                <div className="w-12 h-12 rounded-[22px] bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
                    <Settings className="w-6 h-6" />
                </div>
            </div>

            {/* Account Settings Section */}
            <div className="space-y-4">
                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]  ml-2">Preferences</h3>
                
                <div className="bg-[#161b22] border border-white/[0.05] rounded-[40px] overflow-hidden shadow-2xl shadow-black/40">
                    {[
                        { id: 'notifications', label: 'System Notifications', icon: Bell, sub: 'Real-time task alerts' },
                        { id: 'darkMode', label: 'High-Contrast Mode', icon: Moon, sub: 'Night-shift optimization' },
                        { id: 'biometric', label: 'Biometric Access', icon: SmartphoneNfc, sub: 'Faster terminal login' },
                    ].map((item) => (
                        <div key={item.id} className="p-6 border-b border-white/[0.03] last:border-0 flex items-center justify-between hover:bg-white/[0.01] transition-all">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-blue-500">
                                    <item.icon className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-[13px] font-black text-white  tracking-tight uppercase">{item.label}</p>
                                    <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">{item.sub}</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => handleToggle(item.id as any)}
                                className={cn(
                                    "w-14 h-8 rounded-full border relative transition-all duration-500 p-1",
                                    (settings as any)[item.id] ? "bg-blue-600 border-blue-700 shadow-lg shadow-blue-500/20" : "bg-white/[0.03] border-white/10"
                                )}
                            >
                                <div className={cn(
                                    "w-6 h-6 rounded-full bg-white transition-all duration-500 shadow-sm",
                                    (settings as any)[item.id] ? "translate-x-6" : "translate-x-0"
                                )} />
                            </button>
                        </div>
                    ))}
                    
                    <div className="p-6 flex items-center justify-between hover:bg-white/[0.01] transition-all">
                       <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-blue-500">
                                <Globe className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[13px] font-black text-white  tracking-tight uppercase">System Language</p>
                                <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Interface localization</p>
                            </div>
                        </div>
                        <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest bg-blue-500/10 px-3 py-1.5 rounded-xl border border-blue-500/20">English</span>
                    </div>
                </div>
            </div>

            {/* Security Section */}
            <div className="space-y-4">
                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]  ml-2">Security Hub</h3>
                <div className="bg-[#161b22] border border-white/[0.05] rounded-[40px] p-6 space-y-4 shadow-3xl">
                    <button className="w-full h-16 bg-white/[0.03] border border-white/[0.05] rounded-3xl flex items-center justify-between px-6 hover:bg-white/[0.05] transition-all active:scale-[0.98]">
                        <div className="flex items-center gap-4">
                            <Lock className="w-5 h-5 text-gray-500" />
                            <span className="text-xs font-black text-white uppercase tracking-widest ">Rotate Passkey</span>
                        </div>
                        <ChevronLeft className="w-4 h-4 text-gray-800 rotate-180" />
                    </button>
                    <button className="w-full h-16 bg-white/[0.03] border border-white/[0.05] rounded-3xl flex items-center justify-between px-6 hover:bg-white/[0.05] transition-all active:scale-[0.98]">
                        <div className="flex items-center gap-4">
                            <Shield className="w-5 h-5 text-gray-500" />
                            <span className="text-xs font-black text-white uppercase tracking-widest ">Two-Factor Sync</span>
                        </div>
                        <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest ">Enabled</span>
                    </button>
                </div>
            </div>

            {/* Version Info */}
            <div className="text-center pt-8">
                <p className="text-[9px] font-black text-gray-800 uppercase tracking-[1em] mb-2 leading-none">Zenbourg Operational OS</p>
                <p className="text-[8px] font-bold text-gray-700 uppercase tracking-widest">Build v4.2.0-Production-Stable</p>
            </div>
        </div>
    )
}
