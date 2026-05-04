'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface SwitchProps {
    checked: boolean
    onChange: (checked: boolean) => void
    label?: string
    textOn?: string
    textOff?: string
    className?: string
}

export default function Switch({ checked, onChange, label, textOn, textOff, className }: SwitchProps) {
    return (
        <div className={cn("flex items-center gap-3", className)}>
            <button
                type="button"
                onClick={() => onChange(!checked)}
                className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                    checked ? "bg-[#4A9EFF]" : "bg-white/10"
                )}
            >
                <span
                    aria-hidden="true"
                    className={cn(
                        "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                        checked ? "translate-x-5" : "translate-x-0"
                    )}
                />
            </button>
            {label && <span className="text-sm font-medium text-gray-300">{label}</span>}
            {(textOn || textOff) && (
                <span className={cn(
                    "text-[12px] font-bold uppercase tracking-wider",
                    checked ? "text-[#4A9EFF]" : "text-gray-500"
                )}>
                    {checked ? (textOn || 'On') : (textOff || 'Off')}
                </span>
            )}
        </div>
    )
}
