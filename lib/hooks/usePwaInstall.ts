'use client'

import { useState, useEffect } from 'react'

export function usePwaInstall() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
    const [isInstallable, setIsInstallable] = useState(false)

    useEffect(() => {
        const handler = (e: any) => {
            // Prevent Chrome 67 and earlier from automatically showing the prompt
            e.preventDefault()
            // Stash the event so it can be triggered later.
            setDeferredPrompt(e)
            setIsInstallable(true)
        }

        window.addEventListener('beforeinstallprompt', handler)

        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstallable(false)
        }

        return () => window.removeEventListener('beforeinstallprompt', handler)
    }, [])

    const installPwa = async () => {
        if (!deferredPrompt) return

        // Show the install prompt
        deferredPrompt.prompt()

        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice
        
        if (outcome === 'accepted') {
            console.log('User accepted the PWA install')
        } else {
            console.log('User dismissed the PWA install')
        }

        // We've used the prompt, and can't use it again
        setDeferredPrompt(null)
        setIsInstallable(false)
    }

    return { isInstallable, installPwa }
}
