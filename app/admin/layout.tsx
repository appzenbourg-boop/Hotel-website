'use client'

import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import OnboardingTour from '@/components/common/OnboardingTour'
import { Clock, CreditCard, LogOut, Sparkles, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const Sidebar = dynamic(() => import('@/components/admin/Sidebar'), { ssr: false })
const Header  = dynamic(() => import('@/components/admin/Header'),  { ssr: false })
const MobileNav = dynamic(() => import('@/components/admin/MobileNav'), { ssr: false })

const AUTH_PATHS = ['/admin/login', '/admin/register', '/admin/forgot-password']

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { data: session, update } = useSession()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)
  const [paymentLoading, setPaymentLoading] = useState(false)

  const userPlan = (session?.user as any)?.plan
  const quoteStatus = (session?.user as any)?.customQuoteStatus
  const quoteAmount = (session?.user as any)?.customQuoteAmount
  const userRole = session?.user?.role
  const allowsTrial = (session?.user as any)?.customQuoteAllowsTrial ?? false

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(price)
  }

  const handlePayNow = async (trialMode = false) => {
    if (paymentLoading) return
    setPaymentLoading(true)
    const statusText = trialMode 
      ? 'Initializing UPI Autopay verification mandate...' 
      : 'Initializing secure payment node...'
    const toastId = toast.loading(statusText)
    try {
      const orderRes = await fetch('/api/subscription/razorpay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: 'ENTERPRISE',
          propertyId: (session?.user as any).propertyId,
          userId: session?.user?.id,
          trialPeriod: trialMode
        })
      })
      const order = await orderRes.json()
      toast.dismiss(toastId)

      if (!order.success) {
        throw new Error(order.error || 'Failed to prepare gateway order')
      }

      const options = {
        key: order.key,
        amount: order.amount,
        currency: order.currency,
        name: 'Zenbourg Enterprise',
        description: trialMode 
          ? '14-Day Trial Autopay Mandate Setup' 
          : 'Custom Quoted Subscription Lifecycle Activation',
        order_id: order.orderId,
        handler: async (response: any) => {
          toast.loading(trialMode ? 'Activating trial mandate...' : 'Verifying transaction with clearing bank...')
          const verifyRes = await fetch('/api/subscription/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...response,
              plan: 'ENTERPRISE',
              propertyId: (session?.user as any).propertyId,
              userId: session?.user?.id,
              trialPeriod: trialMode
            })
          })
          const verifyData = await verifyRes.json()
          toast.dismiss()
          if (verifyData.success) {
            toast.success(trialMode 
              ? 'Mandate setup verified! Your 14-day enterprise trial is fully active!' 
              : 'Enterprise activated successfully! Unlocking workspace.'
            )
            await update() // Re-sync session!
          } else {
            toast.error('Verification failed. Please contact admin@zenbourg.com.')
          }
          setPaymentLoading(false)
        },
        modal: {
          ondismiss: () => {
            setPaymentLoading(false)
            toast.error('Payment cancelled by operator.')
          }
        },
        theme: { color: '#4A9EFF' }
      }
      new (window as any).Razorpay(options).open()
    } catch (err: any) {
      toast.dismiss(toastId)
      toast.error(err.message || 'Network failure during gateway setup.')
      setPaymentLoading(false)
    }
  }

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

  // Robust Hydration Guard: Render a consistent, simple shell on server & initial client load.
  // This guarantees 100% server-to-client HTML parity and eliminates layout hydration errors!
  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const isTrapped = userPlan === 'ENTERPRISE' && userRole !== 'SUPER_ADMIN' && (quoteStatus === 'PENDING' || quoteStatus === 'APPROVED')

  if (isTrapped) {
    return (
      <div className="min-h-screen bg-[#030712] text-white flex flex-col items-center justify-center relative overflow-hidden font-sans selection:bg-[#4A9EFF]/30">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#4A9EFF]/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[150px]" />
        
        <div className="absolute top-8 left-8 md:left-12 flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-[#4A9EFF] to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-[#4A9EFF]/20">
            <Sparkles size={18} className="text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">Zenbourg <span className="text-[#4A9EFF]">OS</span></span>
        </div>

        <div className="max-w-md w-full px-6 z-10 relative text-center">
          <AnimatePresence mode="wait">
            {quoteStatus === 'PENDING' ? (
              <motion.div
                key="pending"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/[0.02] border border-white/10 rounded-3xl p-8 md:p-10 backdrop-blur-md shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
              >
                <div className="w-20 h-20 bg-[#4A9EFF]/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-[#4A9EFF]/20">
                  <Clock size={32} className="text-[#4A9EFF] animate-pulse" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-3 text-white">Pricing Analysis</h2>
                <p className="text-white/50 text-sm leading-relaxed mb-6">
                  Zenbourg HQ is currently evaluating your Custom Enterprise configuration to draft a tailored scale pricing quotation.
                </p>
                <div className="space-y-3 text-left mb-8">
                  <div className="flex items-center gap-3 bg-white/[0.03] border border-white/5 rounded-xl p-3 text-xs text-white/60">
                    <CheckCircle2 size={14} className="text-[#4A9EFF] shrink-0" />
                    <span>Multi-Property & Analytics modules reserved.</span>
                  </div>
                  <div className="flex items-center gap-3 bg-white/[0.03] border border-white/5 rounded-xl p-3 text-xs text-white/60">
                    <CheckCircle2 size={14} className="text-[#4A9EFF] shrink-0" />
                    <span>Cloud provision slots allocated to your region.</span>
                  </div>
                </div>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full text-[11px] font-semibold text-amber-400 tracking-wider uppercase mx-auto">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                  Awaiting Executive Review
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="approved"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-[#4A9EFF]/30 rounded-3xl p-8 md:p-10 backdrop-blur-md shadow-[0_25px_60px_rgba(74,158,255,0.1)]"
              >
                <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
                  <ShieldCheck size={36} className="text-emerald-400" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-2 text-white">Pricing Approved!</h2>
                <p className="text-white/50 text-sm leading-relaxed mb-6">
                  The Super Admin has finalized your bespoke enterprise plan quote.
                </p>
                
                 <div className="bg-[#4A9EFF]/5 border border-[#4A9EFF]/20 rounded-2xl p-6 mb-8 flex flex-col items-center relative overflow-hidden">
                  {allowsTrial && (
                    <div className="absolute top-0 left-0 w-full py-1 bg-purple-600/20 border-b border-purple-500/20 text-[9px] font-extrabold uppercase text-purple-300 tracking-widest flex items-center justify-center gap-1">
                      <Sparkles size={10} className="text-purple-400 animate-pulse" /> 14-Day Free Trial Available <Sparkles size={10} className="text-purple-400 animate-pulse" />
                    </div>
                  )}
                  
                  <span className={cn("text-[10px] font-bold text-[#4A9EFF] uppercase tracking-widest mb-1", allowsTrial && "mt-3")}>Annual Enterprise Fee</span>
                  <span className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">{formatPrice(quoteAmount || 0)}</span>
                  <span className="text-[11px] text-white/40 mt-1">
                    {allowsTrial ? "Trial mandates will only debit after 14 days." : "Tax invoice generated upon payout."}
                  </span>
                </div>

                {allowsTrial ? (
                  <div className="space-y-4">
                    <button
                      onClick={() => handlePayNow(true)}
                      disabled={paymentLoading}
                      className="w-full py-4 bg-gradient-to-r from-purple-600 to-[#4A9EFF] hover:from-purple-500 hover:to-[#4A9EFF]/90 disabled:opacity-50 transition-all text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-purple-600/20 relative overflow-hidden group active:scale-[0.98]"
                    >
                      {paymentLoading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Sparkles size={16} className="text-white animate-pulse" /> Start 14-Day Free Trial (UPI) <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={() => handlePayNow(false)}
                      disabled={paymentLoading}
                      className="w-full py-3 border border-white/10 hover:border-white/25 hover:bg-white/[0.02] transition-all text-white/60 hover:text-white font-bold rounded-xl text-[12px] flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <CreditCard size={14} /> Pay Annual Quote Immediately
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handlePayNow(false)}
                    disabled={paymentLoading}
                    className="w-full py-4 bg-[#4A9EFF] hover:bg-[#4A9EFF]/90 disabled:opacity-50 transition-all text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-[#4A9EFF]/25 relative overflow-hidden group active:scale-[0.98]"
                  >
                    {paymentLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <CreditCard size={16} /> Proceed to Secure Payment <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                      </>
                    )}
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-8 flex justify-center gap-6">
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="flex items-center gap-2 text-white/40 hover:text-white text-xs font-medium transition-all cursor-pointer bg-transparent border-none outline-none"
            >
              <LogOut size={13} /> Exit to Homepage
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background relative">
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

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col md:ml-60 ml-0 overflow-hidden w-full relative">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6 w-full custom-scrollbar relative">
          {children}
        </main>
      </div>

      <MobileNav />
      <OnboardingTour />
    </div>
  )
}
