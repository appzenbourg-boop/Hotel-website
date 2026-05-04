'use client'

import { useState, useEffect } from 'react'
import { X, Smartphone, Download, Zap, CheckCircle2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function GuestPWAInstall() {
    const [mounted, setMounted] = useState(false)
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
    const [isVisible, setIsVisible] = useState(false)
    const [isStandalone, setIsStandalone] = useState(false)

    useEffect(() => {
        setMounted(true)
        const isStandaloneMatch = window.matchMedia('(display-mode: standalone)').matches
            || (window.navigator as any).standalone
            || document.referrer.includes('android-app://')

        setIsStandalone(isStandaloneMatch)
        if (isStandaloneMatch) return

        let isRecentlyDismissed = false
        try {
            const dismissedAt = localStorage.getItem('guest-pwa-dismissed-at')
            if (dismissedAt) {
                const time = parseInt(dismissedAt)
                isRecentlyDismissed = !isNaN(time) && (Date.now() - time < 1000 * 60 * 60 * 24 * 7) // 7 days for guests
            }
        } catch (e) {}

        const handler = (e: any) => {
            e.preventDefault()
            setDeferredPrompt(e)
            if (!isRecentlyDismissed) {
                setTimeout(() => setIsVisible(true), 6000)
            }
        }

        window.addEventListener('beforeinstallprompt', handler)

        window.addEventListener('appinstalled', () => {
            setIsStandalone(true)
            setIsVisible(false)
            setDeferredPrompt(null)
            toast.success("Guest Terminal Deployed", {
                description: "Enjoy a native concierge experience."
            })
        })

        return () => window.removeEventListener('beforeinstallprompt', handler)
    }, [])

    const handleInstall = async () => {
        if (!deferredPrompt) return
        setIsVisible(false)
        try {
            deferredPrompt.prompt()
            const { outcome } = await deferredPrompt.userChoice
            if (outcome === 'accepted') setDeferredPrompt(null)
        } catch (err) {}
    }

    const handleDismiss = () => {
        setIsVisible(false)
        try {
            localStorage.setItem('guest-pwa-dismissed-at', Date.now().toString())
        } catch (e) {}
    }

    if (!mounted || isStandalone || !isVisible || !deferredPrompt) return null

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ y: 150, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 150, opacity: 0 }}
                className="fixed bottom-6 left-6 right-6 md:left-auto md:right-10 md:w-[400px] z-[300]"
            >
                <div className="relative overflow-hidden bg-[#0d1117] border border-blue-500/20 rounded-[35px] p-7 shadow-3xl backdrop-blur-2xl">
                    <div className="flex justify-between items-start mb-6">
                        <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20">
                            <Smartphone className="w-8 h-8 text-white" />
                        </div>
                        <button onClick={handleDismiss} className="p-2 hover:bg-white/5 rounded-xl text-gray-600 hover:text-white transition-all">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="space-y-2 mb-8">
                        <h3 className="text-xl font-black text-white  tracking-tighter uppercase leading-none">Guest Terminal</h3>
                        <p className="text-[12px] text-gray-500 font-bold uppercase tracking-widest leading-relaxed">
                            Install the guest concierge for faster access to room service and property amenities.
                        </p>
                    </div>

                    <button
                        onClick={handleInstall}
                        className="w-full h-15 bg-blue-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl hover:bg-blue-500"
                    >
                        <Download className="w-4 h-4" />
                        Install Guest App
                    </button>
                    
                    <div className="mt-6 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.3em] text-gray-700 ">
                        <CheckCircle2 size={12} className="text-emerald-500/40" />
                        One-click Direct Access Protocols Ready
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    )
}
