'use client'

import { motion } from 'framer-motion'

export default function StaffLoading() {
  return (
    <div className="space-y-8 animate-pulse px-2 pb-12">
        <div className="flex items-center justify-between">
            <div className="space-y-3">
                <div className="h-2 w-24 bg-white/5 rounded-full" />
                <div className="h-8 w-48 bg-white/5 rounded-xl" />
            </div>
            <div className="w-14 h-14 rounded-full bg-white/5" />
        </div>
        <div className="h-64 w-full bg-white/5 rounded-[45px]" />
        <div className="grid grid-cols-2 gap-4">
            <div className="h-24 bg-white/5 rounded-3xl" />
            <div className="h-24 bg-white/5 rounded-3xl" />
        </div>
        <div className="space-y-4">
            <div className="h-4 w-32 bg-white/5 rounded-full mx-2" />
            <div className="grid grid-cols-2 gap-4">
                <div className="h-32 bg-white/5 rounded-[30px]" />
                <div className="h-32 bg-white/5 rounded-[30px]" />
            </div>
        </div>
    </div>
  )
}
