'use client'

import React, { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { X, ChevronRight, ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TourStep {
    target: string
    title: string
    message: string
    position: 'top' | 'bottom' | 'left' | 'right' | 'center'
}

const TOUR_STEPS: TourStep[] = [
    {
        target: 'body',
        title: 'Welcome to Zenbourg Admin',
        message: 'Let us take a quick look at your dashboard features. This will only take a minute.',
        position: 'center',
    },
    {
        target: '[data-tour="sidebar"]',
        title: 'Main Navigation',
        message: 'Access your properties, staff, and settings from the sidebar. You can collapse it to save space.',
        position: 'right',
    },
    {
        target: '[data-tour="new-booking"]',
        title: 'Create Reservations',
        message: 'Quickly add new guest bookings or walk-ins from this shortcut.',
        position: 'bottom',
    },
    {
        target: '[data-tour="guest-checkin"]',
        title: 'Guest Check-in',
        message: 'Use this for fast check-ins. You can scan IDs and assign rooms digitally.',
        position: 'bottom',
    },
    {
        target: '[data-tour="raise-service"]',
        title: 'Service Requests',
        message: 'Directly create housekeeping or maintenance tasks for any room.',
        position: 'bottom',
    },
    {
        target: '[data-tour="stats-grid"]',
        title: 'Real-time Metrics',
        message: 'Monitor occupancy, revenue, and active services at a glance.',
        position: 'bottom',
    },
    {
        target: '[data-tour="quick-actions"]',
        title: 'Quick Actions',
        message: 'Perform common daily tasks quickly without searching through menus.',
        position: 'left',
    },
    {
        target: 'body',
        title: 'Configuration Complete',
        message: 'You are all set. You can restart this tour anytime from the Help section.',
        position: 'center',
    },
]

export default function OnboardingTour() {
    const { data: session, status } = useSession()
    const [active, setActive] = useState(false)
    const [stepIndex, setStepIndex] = useState(0)
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, height: 0 })
    const [mounted, setMounted] = useState(false)

    const userId = session?.user?.id || session?.user?.email
    const storageKey = userId ? `formal_tour_done_${userId}` : 'formal_tour_done_guest'

    useEffect(() => {
        setMounted(true)
    }, [])

    // Auto-start for new users
    useEffect(() => {
        if (!mounted || status !== 'authenticated') return
        const alreadySeen = localStorage.getItem(storageKey)
        if (!alreadySeen) {
            setTimeout(() => {
                setStepIndex(0)
                setActive(true)
            }, 1500)
        }
    }, [mounted, status, storageKey])

    // Track the target element position
    useLayoutEffect(() => {
        if (!active) return

        const step = TOUR_STEPS[stepIndex]
        if (step.target === 'body') {
            setCoords({ top: 0, left: 0, width: 0, height: 0 })
            return
        }

        const el = document.querySelector(step.target)
        if (el) {
            const rect = el.getBoundingClientRect()
            setCoords({
                top: rect.top + window.scrollY,
                left: rect.left + window.scrollX,
                width: rect.width,
                height: rect.height,
            })
            el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
    }, [active, stepIndex])

    const handleNext = () => {
        if (stepIndex < TOUR_STEPS.length - 1) {
            setStepIndex(prev => prev + 1)
        } else {
            finishTour()
        }
    }

    const handlePrev = () => setStepIndex(prev => Math.max(0, prev - 1))

    const finishTour = () => {
        setActive(false)
        localStorage.setItem(storageKey, 'true')
    }

    if (!mounted || !active) return null

    const step = TOUR_STEPS[stepIndex]
    const isBody = step.target === 'body'

    return (
        <div className="fixed inset-0 z-[9999] pointer-events-none">
            {/* Dimmed Background with Hole */}
            <div
                className="absolute inset-0 bg-black/60 transition-all duration-500 pointer-events-auto cursor-pointer"
                style={{
                    clipPath: isBody
                        ? 'none'
                        : `polygon(0% 0%, 0% 100%, ${coords.left}px 100%, ${coords.left}px ${coords.top}px, ${coords.left + coords.width}px ${coords.top}px, ${coords.left + coords.width}px ${coords.top + coords.height}px, ${coords.left}px ${coords.top + coords.height}px, ${coords.left}px 100%, 100% 100%, 100% 0%)`
                }}
                onClick={(e) => {
                    // Only finish if they click the dimmed area
                    if (e.target === e.currentTarget) finishTour()
                }}
                title="Click anywhere to skip tour"
            />

            {/* Target Highlight Border */}
            {!isBody && (
                <div
                    className="absolute border-2 border-primary rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.6),0_0_20px_rgba(var(--primary),0.5)] transition-all duration-300"
                    style={{
                        top: coords.top - 4,
                        left: coords.left - 4,
                        width: coords.width + 8,
                        height: coords.height + 8,
                    }}
                />
            )}

            {/* Professional Tooltip Bubble */}
            <div
                className={cn(
                    "absolute pointer-events-auto transition-all duration-300 flex flex-col items-center",
                    isBody ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" : ""
                )}
                style={!isBody ? {
                    top: step.position === 'bottom' ? coords.top + coords.height + 20 :
                        step.position === 'top' ? coords.top - 180 :
                            coords.top + (coords.height / 2) - 80,
                    left: step.position === 'right' ? coords.left + coords.width + 20 :
                        step.position === 'left' ? coords.left - 340 :
                            coords.left + (coords.width / 2) - 160,
                } : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
            >
                <div className="w-[320px] bg-white rounded-xl shadow-2xl overflow-hidden border border-border">
                    {/* Header */}
                    <div className="bg-slate-50 px-4 py-3 border-b border-border flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            System Tour • {stepIndex + 1}/{TOUR_STEPS.length}
                        </span>
                        <button onClick={finishTour} className="text-slate-400 hover:text-slate-600 transition-colors">
                            <X size={16} />
                        </button>
                    </div>

                    <div className="p-5">
                        <h3 className="text-slate-900 font-bold text-base mb-2">{step.title}</h3>
                        <p className="text-slate-600 text-sm leading-relaxed mb-6">
                            {step.message}
                        </p>

                        <div className="flex items-center justify-between">
                            <div className="flex gap-1">
                                {TOUR_STEPS.map((_, i) => (
                                    <div key={i} className={cn("h-1 rounded-full transition-all", i === stepIndex ? "w-4 bg-primary" : "w-1 bg-slate-200")} />
                                ))}
                            </div>
                            <div className="flex gap-2 relative z-50 pointer-events-auto">
                                {stepIndex > 0 && (
                                    <button onClick={(e) => { e.stopPropagation(); handlePrev(); }} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors cursor-pointer block">
                                        <ChevronLeft size={18} />
                                    </button>
                                )}
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleNext(); }}
                                    className="px-4 py-2 bg-primary text-white rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity flex items-center gap-2 cursor-pointer block"
                                >
                                    {stepIndex === TOUR_STEPS.length - 1 ? 'Finish' : 'Next'}
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Arrow implementation */}
                {!isBody && (
                    <div
                        className={cn(
                            "absolute w-4 h-4 bg-white border-l border-t border-border rotate-45",
                            step.position === 'bottom' ? "-top-2" :
                                step.position === 'top' ? "-bottom-2" :
                                    step.position === 'right' ? "top-1/2 -left-2 -translate-y-1/2" :
                                        "top-1/2 -right-2 -translate-y-1/2"
                        )}
                        style={step.position === 'bottom' || step.position === 'top' ? { left: 'calc(50% - 8px)' } : {}}
                    />
                )}
            </div>
        </div>
    )
}
