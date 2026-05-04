'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  BedDouble,
  Bell,
  UserCog,
  Clock,
  IndianRupee,
  BarChart3,
  Settings,
  Building2,
  LogOut,
  ClipboardCheck,
  Search,
  UtensilsCrossed,
  Award,
  Megaphone,
  Activity,
  Upload,
  MessageSquare,
  Sparkles,
  X,
  Lock,
  ChevronRight,
  ChevronDown
} from 'lucide-react'
import { usePermissions } from '@/lib/hooks/usePermissions'
import { type PlanTier } from '@/lib/plan-features'

interface NavItem {
  label: string
  icon: React.ReactNode
  href: string
  featureKey?: string   // key from FEATURES list
  minPlan?: PlanTier    // direct plan requirement
  badge?: number
  subItems?: Omit<NavItem, 'badge'>[]
}

const navItems: Omit<NavItem, 'badge'>[] = [
  { label: 'Dashboard',            icon: <LayoutDashboard className="w-[18px] h-[18px]" />, href: '/admin/dashboard',            featureKey: 'dashboard' },
  { label: 'Reservations',         icon: <CalendarDays className="w-[18px] h-[18px]" />,    href: '/admin/bookings',             featureKey: 'bookings' },
  { label: 'Approvals',            icon: <ClipboardCheck className="w-[18px] h-[18px]" />,  href: '/admin/approvals',            featureKey: 'bookings' },
  { label: 'Front Desk',           icon: <ClipboardCheck className="w-[18px] h-[18px]" />,  href: '/admin/checkin',              featureKey: 'checkin' },
  { label: 'Amenities',            icon: <Sparkles className="w-[18px] h-[18px]" />,         href: '/admin/content/amenities',    featureKey: 'content' },
  { label: 'Food & Beverage Menu', icon: <UtensilsCrossed className="w-[18px] h-[18px]" />, href: '/admin/content/menu',         featureKey: 'content' },
  { label: 'Guests',               icon: <Users className="w-[18px] h-[18px]" />,            href: '/admin/guests',               featureKey: 'guests' },
  { label: 'Rooms',                icon: <BedDouble className="w-[18px] h-[18px]" />,        href: '/admin/rooms',                featureKey: 'rooms' },
  { label: 'Services',             icon: <Bell className="w-[18px] h-[18px]" />,             href: '/admin/services',             featureKey: 'services' },
  { 
    label: 'Staff', 
    icon: <UserCog className="w-[18px] h-[18px]" />, 
    href: '/admin/staff', 
    featureKey: 'staff',
    subItems: [
        { label: 'Staff Management', icon: <UserCog className="w-[14px] h-[14px]" />, href: '/admin/staff', featureKey: 'staff' },
        { label: 'Incentives & Perks', icon: <Award className="w-[14px] h-[14px]" />, href: '/admin/staff/perks', featureKey: 'staff' },
    ]
  },
  { label: 'Leave Approvals',      icon: <CalendarDays className="w-[18px] h-[18px]" />,    href: '/admin/leaves',               featureKey: 'leaves' },
  { label: 'Attendance',           icon: <Clock className="w-[18px] h-[18px]" />,            href: '/admin/attendance',           featureKey: 'attendance' },
  { label: 'Payroll',              icon: <IndianRupee className="w-[18px] h-[18px]" />,      href: '/admin/payroll',              featureKey: 'payroll' },
  { label: 'Lost & Found',         icon: <Search className="w-[18px] h-[18px]" />,           href: '/admin/lost-found',           featureKey: 'lost_found' },
  { label: 'Marketing',            icon: <Megaphone className="w-[18px] h-[18px]" />,        href: '/admin/marketing',            featureKey: 'marketing' },
  { label: 'Bulk Import',          icon: <Upload className="w-[18px] h-[18px]" />,           href: '/admin/bulk-import',          featureKey: 'bulk_import' },
  { label: 'Reports',              icon: <BarChart3 className="w-[18px] h-[18px]" />,        href: '/admin/reports',              featureKey: 'reports' },
  { label: 'Restaurant Analysis',  icon: <UtensilsCrossed className="w-[18px] h-[18px]" />, href: '/admin/restaurant-analysis',  featureKey: 'restaurant_analysis' },
  { label: 'Loyalty Analysis',     icon: <Award className="w-[18px] h-[18px]" />,            href: '/admin/loyalty-analysis',     featureKey: 'loyalty_analysis' },
  { label: 'Infrastructure',       icon: <Activity className="w-[18px] h-[18px]" />,         href: '/admin/infrastructure',       featureKey: 'infrastructure' },
  { label: 'Support',              icon: <MessageSquare className="w-[18px] h-[18px]" />,    href: '/admin/support',              featureKey: 'support' },
  { label: 'Properties',           icon: <Building2 className="w-[18px] h-[18px]" />,        href: '/admin/properties',           featureKey: 'properties' },
  { label: 'Subscription Plans',   icon: <Sparkles className="w-[18px] h-[18px]" />,         href: '/admin/subscription-plans',   featureKey: 'subscription_plans' },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const userRole = session?.user?.role || 'STAFF'
  const userDept = (session?.user as any)?.department

  // Use live plan from DB (not stale JWT token)
  const { plan: livePlan, hasFeature } = usePermissions()
  const userPlan = livePlan || 'BASE'

  const [serviceCount, setServiceCount] = useState(0)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [openMenus, setOpenMenus] = useState<string[]>([])

  const toggleMenu = (label: string) => {
    setOpenMenus(prev => 
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    )
  }

  const fetchServiceCount = async () => {
    try {
      const res = await fetch('/api/admin/services')
      if (res.ok) {
        const data = await res.json()
        setServiceCount(data.length)
      }
    } catch { }
  }

  const fetchUnreadMessages = async () => {
    try {
      const [ticketsRes, msgsRes] = await Promise.all([
        fetch('/api/admin/support'),
        fetch('/api/admin/messages'),
      ])
      let count = 0
      if (ticketsRes.ok) {
        const t = await ticketsRes.json()
        count += (t.tickets || []).filter((tk: any) => tk.status === 'OPEN').length
      }
      if (msgsRes.ok) {
        const m = await msgsRes.json()
        count += (m.contacts || []).reduce((s: number, c: any) => s + (c.unreadCount || 0), 0)
      }
      setUnreadMessages(count)
    } catch { }
  }

  useEffect(() => {
    fetchServiceCount()
    fetchUnreadMessages()
    const i1 = setInterval(fetchServiceCount, 30000)
    const i2 = setInterval(fetchUnreadMessages, 15000)
    return () => { clearInterval(i1); clearInterval(i2) }
  }, [])

  // Determine if a nav item is accessible for this user's role
  const isRoleAllowed = (href: string): boolean => {
    // SUPER_ADMIN sees everything
    if (userRole === 'SUPER_ADMIN') return true

    // Properties & Subscription: SUPER_ADMIN only
    if (['/admin/properties', '/admin/subscription-plans'].includes(href)) return false

    // Front Desk: hotel-level roles only
    if (href === '/admin/checkin') {
      return ['HOTEL_ADMIN', 'MANAGER', 'RECEPTIONIST'].includes(userRole)
    }

    // Payroll: ACCOUNTS dept override
    if (href === '/admin/payroll' && userDept === 'ACCOUNTS') return true

    // MANAGER / RECEPTIONIST restrictions
    if (userRole === 'MANAGER' || userRole === 'RECEPTIONIST') {
      const forbidden = ['/admin/properties', '/admin/subscription-plans', '/admin/settings', '/admin/leaves']
      if (forbidden.includes(href)) return false
    }

    // STAFF: very limited
    if (userRole === 'STAFF') {
      const allowed = [
        '/admin/dashboard', '/admin/bookings', '/admin/rooms', '/admin/services',
        '/admin/attendance', '/admin/content/amenities', '/admin/content/menu',
      ]
      if (userDept === 'ACCOUNTS') allowed.push('/admin/payroll')
      return allowed.includes(href)
    }

    return true
  }

  // Determine if a nav item is plan-locked (uses live plan from DB)
  const isPlanLocked = (featureKey?: string): boolean => {
    if (userRole === 'SUPER_ADMIN') return false
    if (!featureKey) return false
    return !hasFeature(featureKey)
  }

  const itemsWithMeta = navItems
    .filter(item => isRoleAllowed(item.href))
    .map(item => ({
      ...item,
      locked: isPlanLocked(item.featureKey),
      badge: item.href === '/admin/services'
        ? serviceCount
        : item.href === '/admin/support'
        ? unreadMessages
        : undefined,
    }))

  return (
    <aside
      data-tour="sidebar"
      className={cn(
        "fixed left-0 top-0 h-full w-60 bg-[#0d1117] border-r border-white/[0.06] z-50 flex flex-col transition-transform duration-300 md:translate-x-0 no-print",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      {/* Brand */}
      <div className="px-5 pt-5 pb-4 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex flex-col">
          <div className="flex items-center gap-2.5 mb-0.5">
            <div className="w-6 h-6 bg-[#4A9EFF] rounded-md flex items-center justify-center shrink-0">
              <Building2 className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-[15px] font-bold text-white tracking-tight">Zenbourg</span>
          </div>
          <p className="text-[10px] text-gray-500 font-medium ml-[34px]">Hotel Operations</p>
        </div>
        <button
          onClick={onClose}
          className="md:hidden p-2 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-0.5 custom-scrollbar">
        {itemsWithMeta.map(item => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

          if (item.locked) {
            // Show locked item — clicking redirects to settings/subscription
            return (
              <button
                key={item.href}
                onClick={() => router.push('/admin/settings?tab=subscription')}
                title={`Upgrade required for ${item.label}`}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-left opacity-40 hover:opacity-60 transition-opacity group"
              >
                <span className="shrink-0 text-gray-600">{item.icon}</span>
                <span className="text-[13px] font-medium text-gray-600 truncate flex-1">{item.label}</span>
                <Lock className="w-3 h-3 text-gray-700 shrink-0" />
              </button>
            )
          }

          if (item.subItems) {
            const isMenuOpen = openMenus.includes(item.label)
            const isAnySubActive = item.subItems.some(sub => pathname === sub.href)

            return (
              <div key={item.label} className="space-y-0.5">
                <button
                  onClick={() => toggleMenu(item.label)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-left transition-all duration-150 group relative',
                    isAnySubActive ? 'bg-white/[0.05] text-white' : 'text-gray-400 hover:bg-white/[0.03] hover:text-white'
                  )}
                >
                  <span className={cn(
                    'shrink-0 transition-colors',
                    isAnySubActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'
                  )}>
                    {item.icon}
                  </span>
                  <span className="text-[13px] font-medium truncate flex-1 text-left">{item.label}</span>
                  {isMenuOpen ? (
                    <ChevronDown className="w-3.5 h-3.5 text-gray-600" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
                  )}
                </button>
                
                {isMenuOpen && (
                  <div className="ml-4 pl-4 border-l border-white/[0.06] space-y-0.5 animate-in slide-in-from-top-1 duration-200">
                    {item.subItems.map(sub => {
                      const isSubActive = pathname === sub.href
                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          onClick={() => { if (window.innerWidth < 768) onClose() }}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 group',
                            isSubActive ? 'text-[#4A9EFF] bg-[#4A9EFF]/10 font-bold' : 'text-gray-500 hover:text-white hover:bg-white/[0.02]'
                          )}
                        >
                          <span className="text-[12px] font-medium">{sub.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              onClick={() => { if (window.innerWidth < 768) onClose() }}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group relative',
                isActive
                  ? 'bg-[#4A9EFF] text-white'
                  : 'text-gray-400 hover:bg-white/[0.08] hover:text-white'
              )}
            >
              <span className={cn(
                'shrink-0 transition-colors',
                isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'
              )}>
                {item.icon}
              </span>
              <span className="text-[13px] font-medium truncate">{item.label}</span>
              {item.badge && item.badge > 0 && (
                <span className="ml-auto min-w-[18px] h-[18px] px-1 text-[10px] font-bold bg-red-500 text-white rounded-full flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* User Profile Footer */}
      <div className="p-4 mt-auto border-t border-white/[0.06]">
        {/* Plan badge */}
        <div className="px-2 mb-3">
          <span className={cn(
            'text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border',
            userPlan === 'ENTERPRISE' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
            userPlan === 'STANDARD'   ? 'bg-amber-500/10  text-amber-400  border-amber-500/20'  :
            userPlan === 'STARTER'    ? 'bg-blue-500/10   text-blue-400   border-blue-500/20'   :
                                        'bg-slate-500/10  text-slate-400  border-slate-500/20'
          )}>
            {userPlan} Plan
          </span>
        </div>

        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-[#4A9EFF] flex items-center justify-center text-white text-[12px] font-bold shadow-lg shadow-[#4A9EFF]/20 shrink-0">
            {session?.user?.name?.charAt(0) || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-bold text-white truncate leading-none mb-1">{session?.user?.name || 'Admin User'}</p>
            <p className="text-[10px] text-gray-500 truncate">{session?.user?.email || 'admin@zenbourg.com'}</p>
          </div>
        </div>
        <div className="mt-2 space-y-0.5">
          <Link
            href="/admin/settings"
            onClick={() => { if (window.innerWidth < 768) onClose() }}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg transition-all group',
              pathname === '/admin/settings' ? 'bg-[#4A9EFF] text-white' : 'text-gray-500 hover:text-white hover:bg-white/[0.05]'
            )}
          >
            <Settings className={cn("w-4 h-4 shrink-0", pathname === '/admin/settings' ? "text-white" : "text-gray-500 group-hover:text-gray-300")} />
            <span className="text-[12px] font-medium">Settings</span>
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: '/admin/login' })}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-gray-500 hover:text-white hover:bg-white/[0.05] transition-all group"
          >
            <LogOut className="w-4 h-4 text-gray-500 group-hover:text-gray-300 shrink-0" />
            <span className="text-[12px] font-medium">Log Out</span>
          </button>
        </div>
      </div>
    </aside>
  )
}

