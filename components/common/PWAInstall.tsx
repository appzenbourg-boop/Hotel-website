'use client'

import { useState, useEffect } from 'react'
import { X, Smartphone, Download } from 'lucide-react'
import { toast } from 'sonner'

export default function PWAInstall() {
    const [mounted, setMounted] = useState(false)
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
    const [isVisible, setIsVisible] = useState(false)
    const [isInstalled, setIsInstalled] = useState(false)

    useEffect(() => {
        setMounted(true)

        // Already running as installed PWA
        const standalone =
            window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as any).standalone === true
        if (standalone) { setIsInstalled(true); return }

        // Don't show if dismissed in last 7 days
        try {
            const dismissedAt = localStorage.getItem('pwa-dismissed-at')
            if (dismissedAt && Date.now() - parseInt(dismissedAt) < 7 * 24 * 60 * 60 * 1000) return
        } catch { /* ignore */ }

        const handler = (e: any) => {
            e.preventDefault()
            setDeferredPrompt(e)
            // Show banner after 3 seconds
            setTimeout(() => setIsVisible(true), 3000)
        }

        window.addEventListener('beforeinstallprompt', handler)
        window.addEventListener('appinstalled', () => {
            setIsInstalled(true)
            setIsVisible(false)
            toast.success('App installed! Open it from your home screen.')
        })

        return () => window.removeEventListener('beforeinstallprompt', handler)
    }, [])

    const handleInstall = async () => {
        if (!deferredPrompt) return
        setIsVisible(false)
        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        if (outcome === 'accepted') setDeferredPrompt(null)
    }

    const handleDismiss = () => {
        setIsVisible(false)
        try { localStorage.setItem('pwa-dismissed-at', Date.now().toString()) } catch { /* ignore */ }
    }

    if (!mounted || isInstalled || !isVisible || !deferredPrompt) return null

    return (
        <div className="fixed bottom-28 left-4 right-4 z-[200] max-w-sm mx-auto">
            <div className="bg-[#161b22] border border-blue-500/20 rounded-3xl p-5 shadow-2xl shadow-black/60 flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-blue-600/30">
                    <Smartphone className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white">Install App</p>
                    <p className="text-xs text-gray-500 mt-0.5">Add to home screen for quick access</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={handleInstall}
                        className="h-9 px-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all active:scale-95"
                    >
                        Install
                    </button>
                    <button
                        onClick={handleDismiss}
                        className="w-9 h-9 flex items-center justify-center text-gray-500 hover:text-white bg-white/[0.04] rounded-xl transition-all"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    )
}
