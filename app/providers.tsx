'use client'

import { SessionProvider } from 'next-auth/react'
import { SWRConfig } from 'swr'
import { useEffect } from 'react'
import { Toaster } from 'sonner'

const globalFetcher = async (url: string) => {
    const res = await fetch(url)
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }))
        throw Object.assign(new Error(err?.error ?? 'Request failed'), { status: res.status })
    }
    const json = await res.json()
    // Support both { data: ... } and raw array/object responses
    return json?.data !== undefined ? json.data : json
}

export function Providers({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker
                .register('/sw.js')
                .catch((err) => console.warn('ServiceWorker registration failed:', err))
        }
    }, [])

    return (
        <SessionProvider>
            <SWRConfig
                value={{
                    fetcher: globalFetcher,
                    revalidateOnFocus: false,
                    revalidateIfStale: false,
                    revalidateOnMount: false,
                    dedupingInterval: 10000,
                    errorRetryCount: 2,
                    onError: (error) => {
                        if (error?.status === 401) {
                            // Redirect to login on auth failure
                            if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
                                window.location.href = '/admin/login'
                            }
                        }
                    },
                }}
            >
                {children}
            </SWRConfig>
        </SessionProvider>
    )
}
