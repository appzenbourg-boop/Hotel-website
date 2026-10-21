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
  X,
  Lock,
  ChevronRight,
  ChevronDown,
  Crown,
  Coffee,
  Star,
  Plus,
  MonitorSmartphone,
  ReceiptText,
  ShoppingBag,
  ShieldCheck,
  Calculator,
  Wallet,
  FileSpreadsheet,
  Globe,
  PartyPopper,
  CalendarCheck,
  FileText,
  CreditCard
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
  { label: 'Approvals',            icon: <ClipboardCheck className="w-[18px] h-[18px]" />,  href: '/admin/approvals',            featureKey: 'approvals' },
  { label: 'Front Desk',           icon: <ClipboardCheck className="w-[18px] h-[18px]" />,  href: '/admin/checkin',              featureKey: 'checkin' },
  { label: 'Amenities',            icon: <Star className="w-[18px] h-[18px]" />,         href: '/admin/content/amenities',    featureKey: 'content_amenities' },
  { label: 'Food & Beverage Menu', icon: <UtensilsCrossed className="w-[18px] h-[18px]" />, href: '/admin/content/menu',         featureKey: 'content_menu' },
  { label: 'POS',                  icon: <MonitorSmartphone className="w-[18px] h-[18px]" />, href: '/admin/pos',                  featureKey: 'pos_orders',
    subItems: [
      { label: 'Active Orders',       icon: <Bell className="w-[14px] h-[14px]" />,            href: '/admin/pos',                    featureKey: 'pos_orders' },
      { label: 'Floor Plan',          icon: <LayoutDashboard className="w-[14px] h-[14px]" />, href: '/admin/pos/floor-plan',         featureKey: 'pos_floor_plan' },
      { label: 'Menu Management',     icon: <UtensilsCrossed className="w-[14px] h-[14px]" />, href: '/admin/content/menu',           featureKey: 'content_menu' },
      { label: 'Transaction History', icon: <ClipboardCheck className="w-[14px] h-[14px]" />,  href: '/admin/pos/transactions',       featureKey: 'pos_transactions' },
    ]
  },
  { label: 'Purchase and Order',   icon: <ShoppingBag className="w-[18px] h-[18px]" />,     href: '/admin/procurement/inventory',       featureKey: 'procurement_inventory',
    subItems: [
      { label: 'Inventory Dashboard', icon: <LayoutDashboard className="w-[14px] h-[14px]" />, href: '/admin/procurement/inventory', featureKey: 'procurement_inventory' },
      { label: 'Purchase Orders',     icon: <ReceiptText className="w-[14px] h-[14px]" />,     href: '/admin/procurement',           featureKey: 'procurement_pos' },
      { label: 'Vendors & Suppliers', icon: <Building2 className="w-[14px] h-[14px]" />,      href: '/admin/procurement/vendors',   featureKey: 'procurement_vendors' },
      { label: 'Stock Requests',      icon: <ClipboardCheck className="w-[14px] h-[14px]" />,  href: '/admin/procurement/stock-requests', featureKey: 'procurement_requests' },
      { label: 'Reports',             icon: <BarChart3 className="w-[14px] h-[14px]" />,       href: '/admin/procurement/reports',    featureKey: 'procurement_reports' },
    ]
  },
  {
    label: 'Banquet',
    icon: <PartyPopper className="w-[18px] h-[18px]" />,
    href: '/admin/banquet',
    featureKey: 'banquet_calendar',
    subItems: [
      { label: 'Booking Calendar',  icon: <CalendarCheck className="w-[14px] h-[14px]" />,  href: '/admin/banquet',               featureKey: 'banquet_calendar' },
      { label: 'New Booking',       icon: <Plus className="w-[14px] h-[14px]" />,           href: '/admin/banquet/new',           featureKey: 'banquet_new' },
      { label: 'Banquet Billing',   icon: <CreditCard className="w-[14px] h-[14px]" />,    href: '/admin/banquet/billing',       featureKey: 'banquet_billing' },
      { label: 'Banquet Query',     icon: <Search className="w-[14px] h-[14px]" />,         href: '/admin/banquet/query',         featureKey: 'banquet_query' },
      { label: 'Manage Halls',      icon: <Building2 className="w-[14px] h-[14px]" />,     href: '/admin/banquet/halls',         featureKey: 'banquet_halls' },
    ]
  },
  { label: 'Guests',               icon: <Users className="w-[18px] h-[18px]" />,            href: '/admin/guests',               featureKey: 'guests' },
  { label: 'Rooms',                icon: <BedDouble className="w-[18px] h-[18px]" />,        href: '/admin/rooms',                featureKey: 'rooms' },
  { label: 'Room Occupancy',       icon: <Building2 className="w-[18px] h-[18px]" />,        href: '/admin/occupancy',            featureKey: 'occupancy' },
  { 
    label: 'Channel Manager',      
    icon: <Globe className="w-[18px] h-[18px]" />,
    href: '/admin/channel-manager',      
    featureKey: 'channel_manager'
  },
  { label: 'Services',             icon: <Bell className="w-[18px] h-[18px]" />,             href: '/admin/services',             featureKey: 'services' },
  { 
    label: 'Staff', 
    icon: <UserCog className="w-[18px] h-[18px]" />, 
    href: '/admin/staff', 
    featureKey: 'staff',
    subItems: [
        { label: 'Staff Management', icon: <UserCog className="w-[14px] h-[14px]" />, href: '/admin/staff', featureKey: 'staff' },
        { label: 'Incentives & Perks', icon: <Award className="w-[14px] h-[14px]" />, href: '/admin/staff/perks', featureKey: 'staff_perks' },
    ]
  },
  { label: 'Leave Approvals',      icon: <CalendarDays className="w-[18px] h-[18px]" />,    href: '/admin/leaves',               featureKey: 'leaves' },
  { label: 'Attendance',           icon: <Clock className="w-[18px] h-[18px]" />,            href: '/admin/attendance',           featureKey: 'attendance' },
  { label: 'Payroll',              icon: <IndianRupee className="w-[18px] h-[18px]" />,      href: '/admin/payroll',              featureKey: 'payroll' },
  { 
    label: 'Audit & Compliance', 
    icon: <ShieldCheck className="w-[18px] h-[18px]" />, 
    href: '/admin/audit', 
    featureKey: 'night_audit',
    subItems: [
        { label: 'Night Audit Console', icon: <Calculator className="w-[14px] h-[14px]" />, href: '/admin/audit/night-audit', featureKey: 'night_audit' },
        { label: 'Master Ledgers', icon: <Wallet className="w-[14px] h-[14px]" />, href: '/admin/audit/ledger', featureKey: 'master_ledgers' },
        { label: 'Financial Reports', icon: <FileSpreadsheet className="w-[14px] h-[14px]" />, href: '/admin/audit/reports', featureKey: 'audit_reports' },
        { label: 'ERP Integrations', icon: <Settings className="w-[14px] h-[14px]" />, href: '/admin/audit/integrations', featureKey: 'erp_integrations' },
    ]
  },
  { label: 'Lost & Found',         icon: <Search className="w-[18px] h-[18px]" />,           href: '/admin/lost-found',           featureKey: 'lost_found' },
  { label: 'Marketing',            icon: <Megaphone className="w-[18px] h-[18px]" />,        href: '/admin/marketing',            featureKey: 'marketing' },
  { label: 'Bulk Import',          icon: <Upload className="w-[18px] h-[18px]" />,           href: '/admin/bulk-import',          featureKey: 'bulk_import' },
  { 
    label: 'Analysis',
    icon: <BarChart3 className="w-[18px] h-[18px]" />,
    href: '/admin/analytics',
    featureKey: 'analytics',
    subItems: [
        { label: 'Analytics Dashboard', icon: <BarChart3 className="w-[14px] h-[14px]" />, href: '/admin/analytics', featureKey: 'analytics' },
        { label: 'Restaurant Analysis', icon: <UtensilsCrossed className="w-[14px] h-[14px]" />, href: '/admin/restaurant-analysis', featureKey: 'restaurant_analysis' },
        { label: 'Loyalty Analysis', icon: <Award className="w-[14px] h-[14px]" />, href: '/admin/loyalty-analysis', featureKey: 'loyalty_analysis' },
    ]
  },
  { 
    label: 'Reports',
    icon: <FileSpreadsheet className="w-[18px] h-[18px]" />,
    href: '/admin/reports',
    featureKey: 'reports'
  },
  { label: 'Infrastructure',       icon: <Activity className="w-[18px] h-[18px]" />,         href: '/admin/infrastructure',       featureKey: 'infrastructure' },
  { label: 'Support',              icon: <MessageSquare className="w-[18px] h-[18px]" />,    href: '/admin/support',              featureKey: 'support' },
  { label: 'Properties & Feature Control', icon: <Building2 className="w-[18px] h-[18px]" />, href: '/admin/properties',   featureKey: 'properties' },
  { label: 'Subscription Plans',   icon: <Star className="w-[18px] h-[18px]" />,         href: '/admin/subscription-plans',   featureKey: 'subscription_plans' },
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

  // Use live plan and dynamic role permissions from DB
  const { plan: livePlan, hasFeature, permissions } = usePermissions()
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

  // Maps route href to permission key and parent module key in Roles & Permissions schema
  const routeToPermissionKey: Record<string, string> = {
    '/admin/bookings': 'view_reservations',
    '/admin/approvals': 'view_reservations',
    '/admin/checkin': 'front_desk_checkin',
    '/admin/channel-manager': 'channel_manager',
    '/admin/bulk-import': 'bulk_import',
    '/admin/content/amenities': 'manage_amenities',
    '/admin/content/menu': 'pos_menu',
    '/admin/pos': 'pos_orders',
    '/admin/pos/floor-plan': 'pos_floor_plan',
    '/admin/pos/transactions': 'pos_transactions',
    '/admin/procurement': 'procurement_pos',
    '/admin/procurement/inventory': 'procurement_inventory',
    '/admin/procurement/vendors': 'procurement_vendors',
    '/admin/procurement/stock-requests': 'procurement_requests',
    '/admin/procurement/reports': 'procurement_reports',
    '/admin/banquet': 'banquet_calendar',
    '/admin/banquet/new': 'banquet_booking',
    '/admin/banquet/billing': 'banquet_billing',
    '/admin/banquet/query': 'banquet_calendar',
    '/admin/banquet/halls': 'banquet_halls',
    '/admin/guests': 'view_guests',
    '/admin/rooms': 'view_room_status',
    '/admin/occupancy': 'view_room_status',
    '/admin/services': 'guest_services',
    '/admin/staff': 'staff_management',
    '/admin/staff/perks': 'staff_perks',
    '/admin/leaves': 'leave_approvals',
    '/admin/attendance': 'attendance',
    '/admin/payroll': 'payroll',
    '/admin/audit': 'night_audit',
    '/admin/audit/night-audit': 'night_audit',
    '/admin/audit/ledger': 'master_ledgers',
    '/admin/audit/reports': 'audit_reports',
    '/admin/audit/integrations': 'erp_integrations',
    '/admin/lost-found': 'lost_found',
    '/admin/marketing': 'marketing_campaigns',
    '/admin/analytics': 'view_analytics',
    '/admin/restaurant-analysis': 'restaurant_analysis',
    '/admin/loyalty-analysis': 'loyalty_analysis',
    '/admin/reports': 'view_reports',
    '/admin/infrastructure': 'room_maintenance',
    '/admin/support': 'guest_services',
  }

  const routeToModuleKey: Record<string, string> = {
    '/admin/bookings': 'reservations',
    '/admin/approvals': 'reservations',
    '/admin/checkin': 'reservations',
    '/admin/channel-manager': 'channel_manager',
    '/admin/bulk-import': 'bulk_import',
    '/admin/content/amenities': 'amenities',
    '/admin/content/menu': 'menu',
    '/admin/pos': 'pos',
    '/admin/pos/floor-plan': 'pos',
    '/admin/pos/transactions': 'pos',
    '/admin/procurement': 'procurement',
    '/admin/procurement/inventory': 'procurement',
    '/admin/procurement/vendors': 'procurement',
    '/admin/procurement/stock-requests': 'procurement',
    '/admin/procurement/reports': 'procurement',
    '/admin/banquet': 'banquet',
    '/admin/banquet/new': 'banquet',
    '/admin/banquet/billing': 'banquet',
    '/admin/banquet/query': 'banquet',
    '/admin/banquet/halls': 'banquet',
    '/admin/guests': 'guests',
    '/admin/rooms': 'rooms',
    '/admin/occupancy': 'rooms',
    '/admin/services': 'guests',
    '/admin/staff': 'staff',
    '/admin/staff/perks': 'staff',
    '/admin/leaves': 'attendance_leaves',
    '/admin/attendance': 'attendance_leaves',
    '/admin/payroll': 'payroll',
    '/admin/audit': 'audit',
    '/admin/audit/night-audit': 'audit',
    '/admin/audit/ledger': 'audit',
    '/admin/audit/reports': 'audit',
    '/admin/audit/integrations': 'audit',
    '/admin/lost-found': 'lost_found',
    '/admin/marketing': 'marketing',
    '/admin/analytics': 'analytics',
    '/admin/restaurant-analysis': 'analytics',
    '/admin/loyalty-analysis': 'analytics',
    '/admin/reports': 'reports',
    '/admin/infrastructure': 'rooms',
    '/admin/support': 'guests',
  }

  // Determine if a nav item is accessible for this user's role
  const isRoleAllowed = (href: string): boolean => {
    // SUPER_ADMIN and HOTEL_ADMIN have unrestricted access to all active features
    if (userRole === 'SUPER_ADMIN' || userRole === 'HOTEL_ADMIN') return true

    // System configuration routes: Admin only
    if (['/admin/properties', '/admin/subscription-plans', '/admin/settings'].includes(href)) return false

    // Dynamic Role Permissions from Database
    if (permissions && Object.keys(permissions).length > 0) {
      const modKey = routeToModuleKey[href]
      const permKey = routeToPermissionKey[href]

      // If the parent module is explicitly toggled OFF by the hotel owner
      if (modKey && permissions[modKey] === false) {
        return false
      }

      // If this specific feature is explicitly toggled OFF by the hotel owner
      if (permKey && permissions[permKey] === false) {
        return false
      }

      // If explicitly toggled ON
      if ((modKey && permissions[modKey] === true) || (permKey && permissions[permKey] === true)) {
        return true
      }
    }

    // Role-based fallbacks if no custom permission override is saved
    if (href === '/admin/checkin') {
      return ['HOTEL_ADMIN', 'MANAGER', 'RECEPTIONIST'].includes(userRole)
    }

    if (href === '/admin/payroll' && userDept === 'ACCOUNTS') return true

    if (userRole === 'MANAGER' || userRole === 'RECEPTIONIST') {
      const forbidden = ['/admin/properties', '/admin/subscription-plans', '/admin/settings']
      if (forbidden.includes(href)) return false
      return true
    }

    if (userRole === 'STAFF') {
      const allowed = [
        '/admin/dashboard', '/admin/bookings', '/admin/rooms', '/admin/services',
        '/admin/attendance', '/admin/content/amenities', '/admin/content/menu',
        '/admin/pos', '/admin/procurement', '/admin/lost-found', '/admin/leaves'
      ]
      if (userDept === 'ACCOUNTS') allowed.push('/admin/payroll')
      return allowed.includes(href)
    }

    return true
  }

  // Determine if a nav item is plan-locked (uses live plan from DB)
  const isPlanLocked = (featureKey?: string): boolean => {
    if (userRole === 'SUPER_ADMIN') return false
    if (userPlan === 'ENTERPRISE') return false
    if (!featureKey) return false
    if (featureKey === 'dashboard') return false
    return !hasFeature(featureKey)
  }

  const itemsWithMeta = navItems
    .filter(item => isRoleAllowed(item.href))
    .map(item => {
      const activeSubItems = item.subItems ? item.subItems.filter(sub => {
        if (userRole === 'SUPER_ADMIN' || userPlan === 'ENTERPRISE') {
          return true
        }
        if (userRole === 'HOTEL_ADMIN') {
          if (!sub.featureKey) return true
          return hasFeature(sub.featureKey)
        }

        // Check if dynamic role permission restricts this sub-item
        if (permissions && Object.keys(permissions).length > 0) {
          const subPermKey = routeToPermissionKey[sub.href]
          if (subPermKey && permissions[subPermKey] === false) {
            return false
          }
        }

        if (!sub.featureKey) return true
        return hasFeature(sub.featureKey)
      }) : undefined

      const locked = isPlanLocked(item.featureKey)
      return {
        ...item,
        subItems: activeSubItems,
        locked,
        badge: item.href === '/admin/services'
          ? serviceCount
          : item.href === '/admin/support'
          ? unreadMessages
          : undefined
      }
    })
    .filter(item => {
      // Hide completely for clients if disabled or all subitems are disabled
      if (userRole !== 'SUPER_ADMIN' && userPlan !== 'ENTERPRISE') {
        if (item.subItems !== undefined && item.subItems.length === 0) return false
        if (item.subItems === undefined && item.locked) return false
      }
      return true
    })

  return (
    <aside
      data-tour="sidebar"
      className={cn(
        "fixed left-0 top-0 h-full w-60 bg-background border-r border-border z-50 flex flex-col transition-transform duration-300 md:translate-x-0 no-print",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      {/* Brand */}
      <div className="px-5 pt-5 pb-4 border-b border-border flex items-center justify-between">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-0.5">
            <div className="w-7 h-7 rounded-full overflow-hidden border border-amber-400/20 bg-white/10 p-0.5 shadow-sm flex items-center justify-center">
              <img src="/images/image copy.png" alt="StayIn Logo" className="w-full h-full object-contain rounded-full invert dark:invert-0" />
            </div>
            <span className="text-[15px] font-bold text-text-primary tracking-tight">StayIn</span>
          </div>
          <p className="text-[10px] text-text-tertiary font-medium ml-[36px]">Hotel Operations</p>
        </div>
        <button
          onClick={onClose}
          className="md:hidden p-2 text-text-secondary hover:text-text-primary transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-0.5 custom-scrollbar">
        {userRole === 'SUPER_ADMIN' && (
          <div className="mb-4 px-1 space-y-2 border-b border-border pb-4">
            <p className="text-[10px] font-extrabold tracking-[0.2em] text-purple-400/80 uppercase flex items-center gap-1.5 mb-2 ml-2">
              <Crown className="w-3 h-3" /> Super Admin Console
            </p>
            <Link
              href="/admin/properties"
              onClick={() => { if (window.innerWidth < 768) onClose() }}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 border relative group overflow-hidden shadow-sm',
                pathname === '/admin/properties'
                  ? 'bg-purple-500/15 text-purple-300 border-purple-500/30 shadow-purple-500/5 font-bold'
                  : 'border-border text-text-secondary hover:bg-surface-light hover:border-border/50'
              )}
            >
              <span className={cn(
                'shrink-0 transition-colors p-1.5 rounded-lg',
                pathname === '/admin/properties' ? 'bg-purple-500/20 text-purple-300' : 'bg-surface-light text-text-secondary group-hover:text-purple-400'
              )}>
                <Building2 className="w-3.5 h-3.5" />
              </span>
              <span className="text-[12.5px] font-medium">Manage Portfolio</span>
            </Link>

            <Link
              href="/admin/subscription-plans"
              onClick={() => { if (window.innerWidth < 768) onClose() }}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 border relative group overflow-hidden shadow-sm',
                pathname === '/admin/subscription-plans'
                  ? 'bg-purple-500/15 text-purple-300 border-purple-500/30 shadow-purple-500/5 font-bold'
                  : 'border-border text-text-secondary hover:bg-surface-light hover:border-border/50'
              )}
            >
              <span className={cn(
                'shrink-0 transition-colors p-1.5 rounded-lg',
                pathname === '/admin/subscription-plans' ? 'bg-purple-500/20 text-purple-300' : 'bg-surface-light text-text-secondary group-hover:text-purple-400'
              )}>
                
              </span>
              <span className="text-[12.5px] font-medium">Pricing Plan Designer</span>
            </Link>

            <div className="pt-2 px-2">
              <p className="text-[9px] text-text-tertiary uppercase tracking-wider font-bold mb-1 mt-2">System Operations</p>
            </div>
          </div>
        )}

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
                    isAnySubActive ? 'bg-surface-light text-text-primary' : 'text-text-secondary hover:bg-surface-light hover:text-text-primary'
                  )}
                >
                  <span className={cn(
                    'shrink-0 transition-colors',
                    isAnySubActive ? 'text-text-primary' : 'text-text-tertiary group-hover:text-text-secondary'
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
                  <div className="ml-4 pl-4 border-l border-border space-y-0.5 animate-in slide-in-from-top-1 duration-200">
                    {item.subItems.map(sub => {
                      const isSubActive = pathname === sub.href
                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          onClick={() => { if (window.innerWidth < 768) onClose() }}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 group',
                            isSubActive ? 'text-[#4A9EFF] bg-[#4A9EFF]/10 font-bold' : 'text-text-tertiary hover:text-text-primary hover:bg-surface-light'
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
                  ? 'bg-[#4A9EFF] text-text-primary'
                  : 'text-text-secondary hover:bg-white/[0.08] hover:text-text-primary'
              )}
            >
              <span className={cn(
                'shrink-0 transition-colors',
                isActive ? 'text-text-primary' : 'text-text-tertiary group-hover:text-text-secondary'
              )}>
                {item.icon}
              </span>
              <span className="text-[13px] font-medium truncate">{item.label}</span>
              {item.badge && item.badge > 0 && (
                <span className="ml-auto min-w-[18px] h-[18px] px-1 text-[10px] font-bold bg-red-500 text-white rounded-full flex items-center justify-center shadow-sm">
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* User Profile Footer */}
      <div className="p-4 mt-auto border-t border-border">
        {/* Plan badge */}
        <div className="px-2 mb-3">
          <span className={cn(
            'text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border',
            userPlan === 'ENTERPRISE' ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-transparent shadow-sm' :
            userPlan === 'STANDARD'   ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20'  :
            userPlan === 'STARTER'    ? 'bg-slate-100 dark:bg-surface-light text-slate-700 dark:text-text-secondary border-slate-200 dark:border-border'   :
                                        'bg-slate-100 dark:bg-surface-light text-slate-700 dark:text-text-secondary border-slate-200 dark:border-border'
          )}>
            {userPlan} Plan
          </span>
        </div>

        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-[#4A9EFF] flex items-center justify-center text-text-primary text-[12px] font-bold shadow-lg shadow-[#4A9EFF]/20 shrink-0">
            {session?.user?.name?.charAt(0) || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-bold text-text-primary truncate leading-none mb-1">{session?.user?.name || 'Admin User'}</p>
            <p className="text-[10px] text-text-tertiary truncate">{session?.user?.email || 'admin@zenbourg.com'}</p>
          </div>
        </div>
        <div className="mt-2 space-y-0.5">
          <Link
            href="/admin/settings"
            onClick={() => { if (window.innerWidth < 768) onClose() }}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg transition-all group',
              pathname === '/admin/settings' ? 'bg-[#4A9EFF] text-text-primary' : 'text-text-tertiary hover:text-text-primary hover:bg-surface-light'
            )}
          >
            <Settings className={cn("w-4 h-4 shrink-0", pathname === '/admin/settings' ? "text-text-primary" : "text-text-tertiary group-hover:text-text-secondary")} />
            <span className="text-[12px] font-medium">Settings</span>
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: '/admin/login' })}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-light transition-all group"
          >
            <LogOut className="w-4 h-4 text-text-tertiary group-hover:text-text-secondary shrink-0" />
            <span className="text-[12px] font-medium">Log Out</span>
          </button>
        </div>
      </div>
    </aside>
  )
}

