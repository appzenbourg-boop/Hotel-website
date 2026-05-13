'use client'

import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import OnboardingTour from '@/components/common/OnboardingTour'

const Sidebar = dynamic(() => import('@/components/admin/Sidebar'), { ssr: false })
const Header  = dynamic(() => import('@/components/admin/Header'),  { ssr: false })
const MobileNav = dynamic(() => import('@/components/admin/MobileNav'), { ssr: false })

const AUTH_PATHS = ['/admin/login', '/admin/register', '/admin/forgot-password']

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)

  useEffect(() => { 
    setMounted(true) 
  }, [])

  // Synchronously sync context during render to prevent race conditions in child SWR keys
  if (typeof window !== 'undefined' && session?.user) {
    const role = (session.user as any).role
    localStorage.setItem('user_role', role || '')
    if (role !== 'SUPER_ADMIN') {
      const propertyId = (session.user as any).propertyId
      if (propertyId) {
        localStorage.setItem('super_admin_property_context', propertyId)
      }
    }
  }

  useEffect(() => {
    if (session?.user) {
      const role = (session.user as any).role
      localStorage.setItem('user_role', role || '')
      
      if (role !== 'SUPER_ADMIN') {
        const propertyId = (session.user as any).propertyId
        if (propertyId) {
          localStorage.setItem('super_admin_property_context', propertyId)
        }
      }
    }
  }, [session])

  // Detect navigation for progress bar
  useEffect(() => {
    setIsNavigating(false)
  }, [pathname])

  // Improved navigation detection
  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest('a')
      if (link && link.href && !link.target && !e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey) {
        const url = new URL(link.href)
        if (url.origin === window.location.origin && url.pathname !== window.location.pathname) {
          setIsNavigating(true)
        }
      }
    }
    document.addEventListener('click', handleLinkClick)
    return () => document.removeEventListener('click', handleLinkClick)
  }, [])

  const isAuthPage = AUTH_PATHS.includes(pathname)

  if (isAuthPage) {
    return <>{children}</>
  }

  // UNIFIED STRUCTURE: We return ONE structural skeleton to prevent ALL Next.js hydration mismatches!
  return (
    <div className="flex h-screen overflow-hidden bg-background relative">
      {mounted && (
        <AnimatePresence>
          {isNavigating && (
            <motion.div
              initial={{ width: '0%', opacity: 1 }}
              animate={{ width: '90%' }}
              exit={{ width: '100%', opacity: 0 }}
              transition={{ 
                width: { duration: 10, ease: "easeOut" },
                opacity: { duration: 0.2 }
              }}
              className="fixed top-0 left-0 h-[2px] bg-primary z-[9999] shadow-[0_0_10px_rgba(74,158,255,0.5)]"
            />
          )}
        </AnimatePresence>
      )}

      {mounted && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {mounted && <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />}

      <div className="flex-1 flex flex-col md:ml-60 ml-0 overflow-hidden w-full relative">
        {mounted && <Header onMenuClick={() => setSidebarOpen(true)} />}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6 w-full custom-scrollbar relative">
          {children}
        </main>
      </div>

      {mounted && <MobileNav />}
      {mounted && <OnboardingTour />}
    </div>
  )
}
