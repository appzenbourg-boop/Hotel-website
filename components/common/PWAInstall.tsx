'use client'

import { useState, useEffect } from 'react'
import { X, Smartphone, Download } from 'lucide-react'
import { toast } from 'sonner'

export default function PWAInstall() {
    const [mounted, setMounted] = useState(false)
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
    const [isVisible, setIsVisible] = useState(false)
    const [isInstalled, setIsInstalled] = useState(false)
    const [showGuide, setShowGuide] = useState(false)

    useEffect(() => {
        setMounted(true)

        // Already running as installed PWA
        const standalone =
            window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as any).standalone === true
        if (standalone) { setIsInstalled(true); return }

        // Don't show automatic banner if dismissed in last 7 days
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

        const handleShowGuide = () => {
            setShowGuide(true)
        }

        window.addEventListener('beforeinstallprompt', handler)
        window.addEventListener('show-pwa-install-guide', handleShowGuide)
        window.addEventListener('appinstalled', () => {
            setIsInstalled(true)
            setIsVisible(false)
            toast.success('App installed! Open it from your home screen.')
        })

        return () => {
            window.removeEventListener('beforeinstallprompt', handler)
            window.removeEventListener('show-pwa-install-guide', handleShowGuide)
        }
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

    if (!mounted || isInstalled) return null

    return (
        <>
            {/* Automatic Install Banner */}
            {isVisible && deferredPrompt && (
                <div className="fixed bottom-28 left-4 right-4 z-[200] max-w-sm mx-auto">
                    <div className="bg-[#161b22]/90 backdrop-blur-xl border border-blue-500/20 rounded-3xl p-5 shadow-2xl shadow-black/60 flex items-center gap-4">
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
            )}

            {/* Manual Install Guide Modal */}
            {showGuide && (
                <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
                    <div className="bg-[#161b22]/95 border border-white/[0.08] rounded-[40px] p-8 max-w-sm w-full shadow-3xl relative overflow-hidden">
                        <div className="absolute inset-0 bg-blue-500/[0.02] pointer-events-none"></div>
                        
                        <button 
                            onClick={() => setShowGuide(false)}
                            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-gray-400 hover:text-white transition-all active:scale-95"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <div className="flex flex-col items-center text-center space-y-4 mb-8">
                            <div className="w-16 h-16 rounded-3xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shadow-inner">
                                <Download className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-white uppercase tracking-wider">Install Zenbourg</h3>
                                <p className="text-xs text-gray-500 mt-1">Get the native app experience on your phone</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {/* Android Section */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                    <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Android (Chrome)</h4>
                                </div>
                                <ol className="space-y-2 text-xs text-gray-300 font-medium pl-4 list-decimal">
                                    <li>Tap the menu button <span className="font-bold text-white">(⋮)</span> in the top-right corner.</li>
                                    <li>Tap <span className="font-bold text-white">&ldquo;Install app&rdquo;</span> or <span className="font-bold text-white">&ldquo;Add to Home screen&rdquo;</span>.</li>
                                </ol>
                            </div>

                            {/* iOS Section */}
                            <div className="space-y-3 pt-4 border-t border-white/[0.05]">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                    <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">iOS iPhone (Safari)</h4>
                                </div>
                                <ol className="space-y-2 text-xs text-gray-300 font-medium pl-4 list-decimal">
                                    <li>Tap the Share button <span className="font-bold text-white">(⎋)</span> at the bottom.</li>
                                    <li>Scroll down and tap <span className="font-bold text-white">&ldquo;Add to Home Screen&rdquo;</span>.</li>
                                </ol>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowGuide(false)}
                            className="w-full mt-8 py-4 bg-white hover:bg-gray-100 text-blue-600 text-xs font-black uppercase tracking-widest rounded-2xl transition-all active:scale-95"
                        >
                            Got It
                        </button>
                    </div>
                </div>
            )}
        </>
    )
}
