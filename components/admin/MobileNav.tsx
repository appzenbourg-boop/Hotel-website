'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
    LayoutDashboard, 
    CalendarDays, 
    ClipboardCheck, 
    Bell, 
    UserCog 
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
    { label: 'Home',     icon: LayoutDashboard, href: '/admin/dashboard' },
    { label: 'Bookings', icon: CalendarDays,    href: '/admin/bookings' },
    { label: 'Front Desk', icon: ClipboardCheck, href: '/admin/checkin' },
    { label: 'Services', icon: Bell,           href: '/admin/services' },
    { label: 'Staff',    icon: UserCog,        href: '/admin/staff' },
]

export default function MobileNav() {
    const pathname = usePathname()

    // Don't show on auth pages
    if (pathname.includes('/login') || pathname.includes('/register')) return null

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#0d1117]/95 backdrop-blur-md border-t border-white/[0.08] z-40 px-2 flex items-center justify-around no-print">
            {navItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/admin/dashboard' && pathname.startsWith(item.href))
                const Icon = item.icon

                return (
                    <Link 
                        key={item.href} 
                        href={item.href}
                        className={cn(
                            "flex flex-col items-center justify-center gap-1 w-full h-full transition-all active:scale-90",
                            isActive ? "text-[#4A9EFF]" : "text-gray-500"
                        )}
                    >
                        <div className={cn(
                            "p-1 rounded-xl transition-all",
                            isActive ? "bg-[#4A9EFF]/10" : ""
                        )}>
                            <Icon className={cn("w-5 h-5", isActive ? "stroke-[2.5px]" : "stroke-[1.5px]")} />
                        </div>
                        <span className={cn(
                            "text-[10px] font-bold uppercase tracking-tighter",
                            isActive ? "opacity-100" : "opacity-60"
                        )}>
                            {item.label}
                        </span>
                    </Link>
                )
            })}
        </div>
    )
}
