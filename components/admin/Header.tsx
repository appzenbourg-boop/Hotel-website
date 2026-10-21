'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { 
  Bell, Search, LogOut, User, Settings, Camera, Sun, Moon,
  Globe, PartyPopper, ShieldCheck, FileSpreadsheet, Layers,
  ShoppingBag, Users, Percent, Activity, Building2, Sparkles,
  UtensilsCrossed, CalendarDays, BedDouble, CreditCard, BarChart3,
  CornerDownLeft, TrendingUp, CheckCircle2, FileText, ArrowRight, Flame
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import Avatar from '@/components/common/Avatar'
import PropertySwitcher from '@/components/admin/PropertySwitcher'
import { isGlobalContext } from '@/lib/admin-context'

interface HeaderProps {
  onMenuClick: () => void
}

interface SearchablePage {
  label: string
  route: string
  desc: string
  category: string
  categoryColor: string
  keywords: string[]
  icon: any
}

export default function Header({ onMenuClick }: HeaderProps) {
  const router = useRouter()
  const [showNotifications, setShowNotifications] = useState(false)
  const [expandedNotifications, setExpandedNotifications] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const { data: session } = useSession()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Global Search State
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const searchContainerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const SEARCHABLE_PAGES: SearchablePage[] = useMemo(() => [
    // 1. Channel Manager & Distribution
    {
      label: 'Channel Manager (Rates & Inventory)',
      route: '/admin/channel-manager',
      desc: 'Live rates & inventory grid, automated dynamic rates, stop-sell switches and instant OTA sync',
      category: 'Distribution',
      categoryColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
      keywords: ['channel manager', 'rates', 'inventory', 'matrix', 'aiosell', 'ota', 'pricing', 'markup', 'airbnb', 'booking.com', 'mmt', 'makemytrip', 'agoda', 'expedia', 'google hotel', 'stop sell', 'live', 'channels', 'distribution'],
      icon: Globe
    },

    // 2. Front Desk & Reservations
    {
      label: 'Dashboard Overview',
      route: '/admin/dashboard',
      desc: 'Main hotel operational overview, real-time occupancy, today arrivals & revenue KPIs',
      category: 'Front Desk',
      categoryColor: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      keywords: ['dashboard', 'home', 'kpi', 'revenue', 'overview', 'summary', 'today', 'arrivals', 'departures'],
      icon: BarChart3
    },
    {
      label: 'Reservations & Bookings',
      route: '/admin/bookings',
      desc: 'View, filter, manage and export all guest reservations and booking folios',
      category: 'Front Desk',
      categoryColor: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      keywords: ['reservations', 'bookings', 'calendar', 'tape chart', 'guests', 'booking list', 'folio'],
      icon: CalendarDays
    },
    {
      label: 'New Reservation Wizard',
      route: '/admin/bookings/new',
      desc: 'Walk-in front desk booking wizard with automated GST & meal plan calculations',
      category: 'Front Desk',
      categoryColor: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      keywords: ['new booking', 'create booking', 'walk in', 'front desk reservation', 'book room', 'add booking'],
      icon: CalendarDays
    },
    {
      label: 'Digital Check-in Assistant',
      route: '/admin/checkin',
      desc: 'Front desk console, QR check-in verification, ID proof checks and digital key handover',
      category: 'Front Desk',
      categoryColor: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      keywords: ['checkin', 'check in', 'reception', 'guest arrival', 'qr check in', 'id proof', 'passport', 'aadhaar', 'verification'],
      icon: CheckCircle2
    },
    {
      label: 'Reservation Approvals Hub',
      route: '/admin/approvals',
      desc: 'Manager approval workflows for custom discounts, stay extensions and complimentary upgrades',
      category: 'Front Desk',
      categoryColor: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      keywords: ['approvals', 'discounts', 'complimentary', 'waiver', 'manager approval', 'override', 'upgrade'],
      icon: ShieldCheck
    },
    {
      label: 'Guests CRM & VIP Directory',
      route: '/admin/guests',
      desc: 'Comprehensive guest history, lifetime spend, preferences, VIP flags and loyalty status',
      category: 'Front Desk',
      categoryColor: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      keywords: ['guests', 'guest crm', 'profiles', 'history', 'vip', 'directory', 'phone', 'email', 'preferences'],
      icon: Users
    },
    {
      label: 'Lost & Found Operations',
      route: '/admin/lost-found',
      desc: 'Housekeeping lost items log, guest claim verification and automatic status tracking',
      category: 'Front Desk',
      categoryColor: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      keywords: ['lost and found', 'lost items', 'claims', 'belongings', 'missing items', 'housekeeping lost'],
      icon: Layers
    },

    // 3. Rooms & Housekeeping
    {
      label: 'Rooms Management',
      route: '/admin/rooms',
      desc: 'Manage room inventory, pricing tiers, descriptions, amenities and floor layouts',
      category: 'Rooms & HK',
      categoryColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      keywords: ['rooms', 'room management', 'inventory', 'base price', 'categories', 'amenities', 'floors', 'room number', 'add room'],
      icon: BedDouble
    },
    {
      label: 'Room Occupancy Heatmap & Tape Chart',
      route: '/admin/occupancy',
      desc: 'Live real-time room status matrix (Available, Occupied, Cleaning, Maintenance)',
      category: 'Rooms & HK',
      categoryColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      keywords: ['occupancy', 'tape chart', 'room status', 'cleaning', 'maintenance', 'occupied', 'available', 'heatmap'],
      icon: BedDouble
    },
    {
      label: 'Housekeeping & Maintenance Services',
      route: '/admin/services',
      desc: 'Dispatch cleaning tasks to staff, track room turnaround times and repair work orders',
      category: 'Rooms & HK',
      categoryColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      keywords: ['housekeeping', 'services', 'cleaning tasks', 'repairs', 'maintenance', 'dispatch', 'room cleaning'],
      icon: Sparkles
    },
    {
      label: 'Hotel Amenities Showcase',
      route: '/admin/content/amenities',
      desc: 'Configure hotel facilities, operating hours, icons and guest-facing amenities setup',
      category: 'Rooms & HK',
      categoryColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      keywords: ['amenities', 'facilities', 'pool', 'gym', 'spa', 'wifi', 'content amenities'],
      icon: Sparkles
    },
    {
      label: 'Hotel Policies & Rules',
      route: '/admin/content/policies',
      desc: 'Configure cancellation rules, check-in policies, house rules and guest terms',
      category: 'Rooms & HK',
      categoryColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      keywords: ['policies', 'house rules', 'terms', 'cancellation', 'checkin rules', 'property rules'],
      icon: FileText
    },

    // 4. Banquet & Event Management
    {
      label: 'Banquet & Events Hub',
      route: '/admin/banquet',
      desc: 'Visual timeline calendar, hall bookings, event dates, pax count and catering packages',
      category: 'Banquet & Events',
      categoryColor: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
      keywords: ['banquet', 'events', 'halls', 'ballroom', 'lawn', 'wedding', 'reception', 'conference', 'catering', 'quotes', 'pax'],
      icon: PartyPopper
    },

    // 5. Point of Sale (POS) & Restaurant
    {
      label: 'POS Orders Live Dashboard',
      route: '/admin/pos',
      desc: 'Live restaurant order pipeline, kitchen display ticket dispatch and rush order alerts',
      category: 'POS & Dining',
      categoryColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      keywords: ['pos', 'orders', 'kitchen display', 'restaurant', 'food', 'bar', 'preparing', 'ready', 'served', 'rush order'],
      icon: UtensilsCrossed
    },
    {
      label: 'POS Interactive Floor Plan',
      route: '/admin/pos/floor-plan',
      desc: 'Visual table layout, active covers, table occupancy status and dining area management',
      category: 'POS & Dining',
      categoryColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      keywords: ['floor plan', 'pos tables', 'restaurant seating', 'tables', 'covers', 'dining layout'],
      icon: UtensilsCrossed
    },
    {
      label: 'POS New Order / KOT Entry',
      route: '/admin/pos/create-order',
      desc: 'Quick dining, takeaway and room delivery order entry with instant KOT generation',
      category: 'POS & Dining',
      categoryColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      keywords: ['create order', 'pos new order', 'kot', 'kitchen order', 'dining order', 'takeaway'],
      icon: UtensilsCrossed
    },
    {
      label: 'POS Cashier & Transactions Log',
      route: '/admin/pos/transactions',
      desc: 'Daily cash reconciliation, payment receipts, split billing and restaurant sales logs',
      category: 'POS & Dining',
      categoryColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      keywords: ['pos transactions', 'cashier', 'dining bills', 'receipts', 'settlements', 'restaurant sales'],
      icon: CreditCard
    },
    {
      label: 'Food & Beverage Menu Management',
      route: '/admin/content/menu',
      desc: 'Manage dishes, course categories, pricing, veg/non-veg flags, prep times and menu cards',
      category: 'POS & Dining',
      categoryColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      keywords: ['menu', 'fnb menu', 'dishes', 'restaurant menu', 'pricing', 'veg', 'chef meals', 'drinks'],
      icon: UtensilsCrossed
    },
    {
      label: 'Restaurant Dining Analytics',
      route: '/admin/restaurant-analysis',
      desc: 'RevPASH analytics, dish popularity matrix, peak dining hours and table turnaround velocity',
      category: 'POS & Dining',
      categoryColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      keywords: ['restaurant analysis', 'revpash', 'dining analytics', 'menu matrix', 'popular dishes', 'fnb revenue'],
      icon: TrendingUp
    },

    // 6. Procurement & Inventory
    {
      label: 'Inventory Stock Dashboard',
      route: '/admin/procurement/inventory',
      desc: 'Live stock counts, SKU management, unit valuation and automated low-stock reorder alerts',
      category: 'Inventory & PO',
      categoryColor: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
      keywords: ['inventory', 'stock', 'sku', 'stock level', 'low stock', 'reorder point', 'linen', 'supplies'],
      icon: ShoppingBag
    },
    {
      label: 'Purchase Orders (PO) Hub',
      route: '/admin/procurement',
      desc: 'Create purchase orders, track approval status, shipping costs and supplier deliveries',
      category: 'Inventory & PO',
      categoryColor: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
      keywords: ['purchase orders', 'procurement', 'po', 'supplier orders', 'purchasing', 'stock orders'],
      icon: ShoppingBag
    },
    {
      label: 'Suppliers & Vendors Directory',
      route: '/admin/procurement/vendors',
      desc: 'Supplier directory, categories, GSTIN numbers, contact persons and vendor catalogs',
      category: 'Inventory & PO',
      categoryColor: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
      keywords: ['vendors', 'suppliers', 'supplier directory', 'vendor catalog', 'procurement vendors'],
      icon: Building2
    },
    {
      label: 'Department Stock Requests',
      route: '/admin/procurement/stock-requests',
      desc: 'Kitchen and housekeeping internal requisition requests and stock issue tracking',
      category: 'Inventory & PO',
      categoryColor: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
      keywords: ['stock requests', 'internal requisitions', 'kitchen stock', 'housekeeping requisition', 'stock issue'],
      icon: ShoppingBag
    },
    {
      label: 'Procurement & Consumption Reports',
      route: '/admin/procurement/reports',
      desc: 'Historical vendor spending analysis, monthly inventory valuation and consumption graphs',
      category: 'Inventory & PO',
      categoryColor: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
      keywords: ['procurement reports', 'inventory valuation', 'spending analytics', 'consumption graph'],
      icon: BarChart3
    },

    // 7. Finance, Audit & Accounting
    {
      label: 'Night Audit Console',
      route: '/admin/audit/night-audit',
      desc: 'End-of-day room rate posting, cashier balance checks and discrepancy resolution',
      category: 'Finance & Audit',
      categoryColor: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      keywords: ['night audit', 'eod', 'end of day', 'closing', 'room revenue', 'audit run', 'discrepancy resolution', 'manager flash report'],
      icon: ShieldCheck
    },
    {
      label: 'Master Ledger & Financial Audit',
      route: '/admin/audit/ledger',
      desc: 'Guest ledger, city ledger, advance deposits, journal vouchers and double-entry ledger logs',
      category: 'Finance & Audit',
      categoryColor: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      keywords: ['ledger', 'master ledger', 'accounting', 'debits', 'credits', 'transactions', 'guest ledger', 'city ledger'],
      icon: FileSpreadsheet
    },
    {
      label: 'Dynamic Reports & MIS Hub',
      route: '/admin/reports',
      desc: 'Custom drag-and-drop MIS builder, tax summaries, occupancy reports and Excel data exports',
      category: 'Finance & Audit',
      categoryColor: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      keywords: ['reports', 'mis', 'dynamic builder', 'excel export', 'financial reports', 'tax summary', 'analytics exports'],
      icon: BarChart3
    },
    {
      label: 'Guest Loyalty & RFM Analytics',
      route: '/admin/loyalty-analysis',
      desc: 'Guest repeat visit frequency, RFM segmentation, VIP churn risk and customer lifetime value',
      category: 'Finance & Audit',
      categoryColor: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      keywords: ['loyalty', 'rfm', 'vip guests', 'repeat guests', 'clv', 'customer retention', 'guest loyalty'],
      icon: TrendingUp
    },

    // 8. Staff & Human Resources
    {
      label: 'Staff Directory & Management',
      route: '/admin/staff',
      desc: 'Employee profiles, designations, contact details, work shifts and verification status',
      category: 'Staff & HR',
      categoryColor: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
      keywords: ['staff', 'employees', 'directory', 'departments', 'roles', 'verification', 'id proof', 'add staff'],
      icon: Users
    },
    {
      label: 'Staff Attendance & Time Clock',
      route: '/admin/attendance',
      desc: 'Punch in/out logging, daily shift hours tracking, late arrivals and overtime calculation',
      category: 'Staff & HR',
      categoryColor: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
      keywords: ['attendance', 'clock in', 'punch out', 'shifts', 'overtime', 'daily attendance', 'time clock'],
      icon: Users
    },
    {
      label: 'Leave Management & Approvals',
      route: '/admin/leaves',
      desc: 'Staff leave applications, approval workflow and annual, sick & casual leave balances',
      category: 'Staff & HR',
      categoryColor: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
      keywords: ['leaves', 'leave approvals', 'vacation', 'sick leave', 'casual leave', 'time off', 'leave balance'],
      icon: CalendarDays
    },
    {
      label: 'Payroll Processing & Payslips',
      route: '/admin/payroll',
      desc: 'Automated salary calculation, allowances, tax deductions and downloadable monthly payslips',
      category: 'Staff & HR',
      categoryColor: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
      keywords: ['payroll', 'salary', 'payslips', 'wages', 'compensation', 'salary slip', 'deductions'],
      icon: CreditCard
    },
    {
      label: 'Staff Perks, Incentives & Bonuses',
      route: '/admin/staff/perks',
      desc: 'Monthly performance bonuses, rewards, employee benefits and payroll adjustments',
      category: 'Staff & HR',
      categoryColor: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
      keywords: ['perks', 'bonuses', 'incentives', 'benefits', 'performance rewards', 'adjustments'],
      icon: Percent
    },

    // 9. Marketing, Support & Settings
    {
      label: 'Marketing & Promo Campaigns',
      route: '/admin/marketing',
      desc: 'Broadcast SMS, email newsletters and WhatsApp promotional campaigns to guests',
      category: 'Marketing',
      categoryColor: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
      keywords: ['marketing', 'campaigns', 'promotions', 'sms broadcast', 'whatsapp campaigns', 'newsletters', 'discounts'],
      icon: Flame
    },
    {
      label: 'Support & Concierge Tickets',
      route: '/admin/support',
      desc: 'Guest service tickets, internal maintenance requests, complaints and help desk inquiries',
      category: 'Support',
      categoryColor: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
      keywords: ['support', 'tickets', 'guest complaints', 'help desk', 'concierge tickets', 'service requests'],
      icon: ShieldCheck
    },
    {
      label: 'Hotel Settings & Configuration',
      route: '/admin/settings',
      desc: 'General hotel details, GSTIN, tax configurations, currency and financial policies',
      category: 'Settings',
      categoryColor: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
      keywords: ['settings', 'configuration', 'gstin', 'tax rates', 'branding', 'hotel details', 'financial setup'],
      icon: Settings
    },
    {
      label: 'Hotel Properties & Multi-Tenancy',
      route: '/admin/properties',
      desc: 'Manage hotel branches, onboard new properties and chain-wide feature allocation',
      category: 'Settings',
      categoryColor: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
      keywords: ['properties', 'hotels', 'chains', 'branches', 'switch property', 'onboard hotel', 'property setup'],
      icon: Building2
    },
    {
      label: 'Subscription Plans & Tiers',
      route: '/admin/subscription-plans',
      desc: 'SaaS plan details, feature quotas, active tier upgrades and billing settings',
      category: 'Settings',
      categoryColor: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
      keywords: ['subscription', 'plans', 'billing', 'enterprise', 'professional', 'upgrade', 'saas license'],
      icon: CreditCard
    },
    {
      label: 'Infrastructure & System Health',
      route: '/admin/infrastructure',
      desc: 'Real-time server latency, Redis cache uptime, MongoDB query response and system node status',
      category: 'Settings',
      categoryColor: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
      keywords: ['infrastructure', 'system health', 'redis latency', 'uptime', 'cloud', 'server load'],
      icon: Activity
    },
    {
      label: 'Bulk CSV Data Import',
      route: '/admin/bulk-import',
      desc: 'Bulk import rooms, reservations, guest directories and inventory via CSV spreadsheets',
      category: 'Settings',
      categoryColor: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
      keywords: ['bulk import', 'csv upload', 'import rooms', 'import bookings', 'import guests', 'spreadsheet import'],
      icon: FileSpreadsheet
    }
  ], [])

  // Top recommended quick jump items when user focuses with empty query
  const POPULAR_QUICK_LINKS = useMemo(() => {
    return SEARCHABLE_PAGES.filter(p => [
      '/admin/channel-manager',
      '/admin/bookings',
      '/admin/occupancy',
      '/admin/banquet',
      '/admin/pos',
      '/admin/audit/night-audit',
      '/admin/procurement',
      '/admin/staff'
    ].includes(p.route))
  }, [SEARCHABLE_PAGES])

  // Filter search results
  const searchResults = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return POPULAR_QUICK_LINKS
    return SEARCHABLE_PAGES.filter(p => 
      p.label.toLowerCase().includes(q) || 
      p.desc.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.keywords.some(k => k.toLowerCase().includes(q))
    ).slice(0, 8)
  }, [searchQuery, SEARCHABLE_PAGES, POPULAR_QUICK_LINKS])

  // Reset selected item on query change
  useEffect(() => {
    setSelectedIndex(0)
  }, [searchQuery])

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
        setShowSearchDropdown(true)
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [])

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSearchDropdown || searchResults.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => (prev + 1) % searchResults.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => (prev - 1 + searchResults.length) % searchResults.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const target = searchResults[selectedIndex]
      if (target) {
        setSearchQuery('')
        setShowSearchDropdown(false)
        router.push(target.route)
      }
    } else if (e.key === 'Escape') {
      setShowSearchDropdown(false)
    }
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Load saved profile photo from localStorage
  useEffect(() => {
    if (session?.user?.id) {
      const saved = localStorage.getItem(`profile_photo_${session.user.id}`)
      if (saved) setProfilePhoto(saved)
    }
  }, [session?.user?.id])

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { toast.error('Photo must be under 2MB'); return }
    const reader = new FileReader()
    reader.onloadend = () => {
      const dataUrl = reader.result as string
      setProfilePhoto(dataUrl)
      if (session?.user?.id) {
        localStorage.setItem(`profile_photo_${session.user.id}`, dataUrl)
      }
      toast.success('Profile photo updated')
    }
    reader.readAsDataURL(file)
  }

  const user = {
    name: session?.user?.name || 'User',
    email: session?.user?.email || 'user@example.com',
    role: session?.user?.role || 'STAFF',
    photo: profilePhoto }

  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const prevUnreadRef = useRef<number | null>(null)

  const playAlertSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'; osc.frequency.value = 523.25; gain.gain.value = 0.1
      osc.connect(gain); gain.connect(ctx.destination)
      osc.start(); osc.stop(ctx.currentTime + 0.2)
      setTimeout(() => {
        const o2 = ctx.createOscillator(); const g2 = ctx.createGain();
        o2.type = 'sine'; o2.frequency.value = 659.25; g2.gain.value = 0.1
        o2.connect(g2); g2.connect(ctx.destination)
        o2.start(); o2.stop(ctx.currentTime + 0.3)
      }, 150)
    } catch(e){}
  }

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/admin/notifications')
      if (res.ok) {
        const data = await res.json()
        const nCnt = data.unreadCount ?? 0
        const formatted = (data.notifications ?? []).map((n: any) => ({
          id: n.id,
          message: n.description || n.title,
          title: n.title,
          time: new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          unread: !n.isRead,
          type: n.type }))

        if (prevUnreadRef.current !== null && nCnt > prevUnreadRef.current) {
            const newest = formatted.filter((x: any) => x.unread).slice(0, nCnt - prevUnreadRef.current)
            newest.forEach((nx: any) => {
              toast.info(nx.title || 'New System Alert', {
                  description: nx.message,
                  duration: 10000,
                  action: { label: 'Open', onClick: () => handleNotifClick(nx) }
              })
            })
            playAlertSound()
        }

        setNotifications(formatted)
        setUnreadCount(nCnt)
        prevUnreadRef.current = nCnt
      }
    } catch (e) { console.error(e) }
  }

  const markAllRead = async () => {
    try {
      await fetch('/api/admin/notifications', { method: 'PATCH' })
      setNotifications(prev => prev.map(n => ({ ...n, unread: false })))
      setUnreadCount(0)
    } catch (e) { console.error(e) }
  }

  const handleNotifClick = async (notif: any) => {
    // Mark single as read locally & API
    try {
      await fetch('/api/admin/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [notif.id] }) })
      setNotifications(prev => prev.map(n => (n.id === notif.id ? { ...n, unread: false } : n)))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (e) { console.error(e) }

    setShowNotifications(false)
    setExpandedNotifications(false)

    const title = (notif.title || '').toLowerCase()
    const msg = (notif.message || '').toLowerCase()
    const combined = `${title} ${msg}`

    if (combined.includes('verification') || combined.includes('id proof') || combined.includes('document')) {
      router.push('/admin/staff?tab=verification')
    } else if (combined.includes('leave') || combined.includes('absent')) {
      router.push('/admin/leaves')
    } else if (combined.includes('upgrade') || combined.includes('extension') || combined.includes('extend')) {
      router.push('/admin/approvals')
    } else if (combined.includes('booking') || combined.includes('reservation')) {
      router.push('/admin/bookings')
    } else if (combined.includes('payroll') || combined.includes('salary') || combined.includes('paid')) {
      router.push('/admin/payroll')
    } else if (combined.includes('ticket') || combined.includes('support') || combined.includes('help')) {
      router.push('/admin/support')
    } else if (combined.includes('service') || combined.includes('request') || combined.includes('order') || combined.includes('task')) {
      router.push('/admin/services')
    } else if (combined.includes('message')) {
      router.push('/admin/support')
    } else {
      router.push('/admin/dashboard')
    }
  }

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 15000)
    return () => clearInterval(interval)
  }, [])

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 md:px-6 bg-background border-b border-border no-print">
      {/* Mobile Menu Button */}
      <button 
        onClick={onMenuClick}
        className="md:hidden p-2 -ml-2 text-text-secondary hover:text-text-primary transition-colors"
      >
        <div className="flex flex-col gap-1">
          <span className="w-5 h-[2px] bg-current rounded-full" />
          <span className="w-3.5 h-[2px] bg-current rounded-full" />
          <span className="w-5 h-[2px] bg-current rounded-full" />
        </div>
      </button>

      {/* Search */}
      <div className="flex items-center gap-2 md:gap-4 flex-1 mr-2 md:mr-4">
        <div className="flex-1 max-w-xl">
          <div ref={searchContainerRef} className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary transition-colors group-focus-within:text-primary" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setShowSearchDropdown(true)
              }}
              onFocus={() => setShowSearchDropdown(true)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search features (e.g. Channel Manager, Banquet, POS, Night Audit, Staff)..."
              className="w-full pl-10 pr-16 py-2 bg-surface-light/50 border border-border/50 rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary/40 transition-all shadow-inner"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 pointer-events-none">
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-bold text-text-tertiary bg-surface border border-border rounded shadow-xs tracking-wider">
                CTRL+K
              </kbd>
            </div>

            {showSearchDropdown && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-border rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100 backdrop-blur-md">
                {/* Header Label */}
                <div className="px-4 py-2 bg-surface/50 border-b border-border/60 flex items-center justify-between text-[10px] uppercase font-bold tracking-wider text-text-tertiary">
                  <span>{!searchQuery.trim() ? '⭐ Popular Quick Access Features' : `Search Results (${searchResults.length})`}</span>
                  <span className="font-normal text-[9px] text-text-tertiary">ESC to close</span>
                </div>

                {searchResults.length > 0 ? (
                  <div className="flex flex-col py-1 max-h-[380px] overflow-y-auto divide-y divide-border/20">
                    {searchResults.map((item, idx) => {
                      const Icon = item.icon || Layers
                      const isSelected = selectedIndex === idx
                      return (
                        <button
                          key={item.route + idx}
                          onClick={() => {
                            setSearchQuery('')
                            setShowSearchDropdown(false)
                            router.push(item.route)
                          }}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          className={cn(
                            "flex items-center gap-3 text-left px-3.5 py-2.5 transition-colors group relative",
                            isSelected ? "bg-surface-light/80 text-text-primary" : "hover:bg-surface-light/40 text-text-secondary"
                          )}
                        >
                          {/* Left indicator line */}
                          {isSelected && (
                            <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-primary rounded-r" />
                          )}

                          {/* Icon */}
                          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 transition-transform group-hover:scale-105", item.categoryColor)}>
                            <Icon className="w-4 h-4" />
                          </div>

                          {/* Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={cn("text-[13px] font-bold tracking-tight truncate", isSelected ? "text-primary" : "text-text-primary")}>
                                {item.label}
                              </span>
                              <span className={cn("text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded border tracking-wider", item.categoryColor)}>
                                {item.category}
                              </span>
                            </div>
                            <p className="text-[11px] text-text-tertiary line-clamp-1 mt-0.5">
                              {item.desc}
                            </p>
                          </div>

                          {/* Enter Indicator */}
                          {isSelected && (
                            <div className="flex items-center gap-1 text-[10px] font-medium text-text-tertiary pr-1 shrink-0">
                              <span>Jump</span>
                              <CornerDownLeft className="w-3.5 h-3.5 text-primary" />
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="p-6 text-center text-text-tertiary flex flex-col items-center gap-2">
                    <Search className="w-6 h-6 text-text-tertiary/60 mb-1" />
                    <p className="text-xs font-semibold text-text-primary">No features matched &quot;{searchQuery}&quot;</p>
                    <p className="text-[11px] text-text-tertiary">Try searching for &apos;rates&apos;, &apos;banquet&apos;, &apos;pos&apos;, &apos;audit&apos;, &apos;staff&apos;, or &apos;rooms&apos;</p>
                  </div>
                )}

                {/* Footer instructions */}
                <div className="px-3.5 py-1.5 bg-surface/80 border-t border-border/50 flex items-center justify-between text-[10px] text-text-tertiary">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <kbd className="px-1 py-0.2 bg-background border border-border rounded font-mono text-[9px]">↑</kbd>
                      <kbd className="px-1 py-0.2 bg-background border border-border rounded font-mono text-[9px]">↓</kbd>
                      Navigate
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="px-1 py-0.2 bg-background border border-border rounded font-mono text-[9px]">↵</kbd>
                      Select
                    </span>
                  </div>
                  <span className="text-[9px] text-text-tertiary">Zenbourg Command Search</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Property Switcher for Super Admin */}
      <div className="hidden lg:block">
        <PropertySwitcher />
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2 md:gap-4 shrink-0">
        {/* Quick Actions */}
        <button
          data-tour="new-booking"
          className="btn-primary btn text-xs md:text-sm px-3 md:px-4 py-2"
          onClick={() => {
            if (session?.user?.role === 'SUPER_ADMIN' && isGlobalContext()) {
              toast.error('Please select a hotel first')
              return
            }
            router.push('/admin/bookings/new')
          }}
        >
          <span className="hidden xs:inline">+ New Booking</span>
          <span className="xs:hidden">+</span>
        </button>

        {mounted && (
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface-light rounded-lg transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        )}

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              if (showNotifications) setExpandedNotifications(false);
            }}
            className="relative p-2 text-text-secondary hover:text-text-primary hover:bg-surface-light rounded-lg transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full" />
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => { setShowNotifications(false); setExpandedNotifications(false); }}
              />
              <div className="absolute right-0 mt-2 w-80 bg-surface border border-border rounded-lg shadow-xl z-50 animate-fade-in">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Notifications</h3>
                    <p className="text-xs text-text-secondary mt-0.5">
                      {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
                    </p>
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className={cn(
                  "overflow-y-auto transition-all duration-300",
                  expandedNotifications ? "max-h-[420px]" : "max-h-[240px]"
                )}>
                  {(() => {
                    const unreadList = notifications.filter(n => n.unread);
                    const renderList = expandedNotifications ? unreadList : unreadList.slice(0, 4);
                    
                    if (unreadList.length === 0) {
                      return (
                        <div className="p-8 text-center text-text-tertiary text-xs">
                          No unread notifications
                        </div>
                      );
                    }
                    
                    return renderList.map((notif) => (
                      <button
                        key={notif.id}
                        onClick={() => handleNotifClick(notif)}
                        className="w-full px-4 py-3 text-left hover:bg-surface-light transition-colors border-b border-border last:border-b-0 bg-primary/5"
                      >
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mr-2 mb-0.5 align-middle" />
                        <p className="text-sm text-text-primary font-medium inline">{notif.title}</p>
                        <p className="text-xs text-text-secondary mt-0.5">{notif.message}</p>
                        <p className="text-xs text-text-tertiary mt-1">{notif.time}</p>
                      </button>
                    ));
                  })()}
                </div>
                {!expandedNotifications && notifications.filter(n => n.unread).length > 4 && (
                  <div className="p-2 border-t border-border">
                    <button 
                      onClick={() => setExpandedNotifications(true)}
                      className="w-full py-2 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors font-medium"
                    >
                      View all notifications
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="flex items-center gap-3 p-1 pr-3 hover:bg-surface-light rounded-lg transition-colors"
          >
            <Avatar name={user.name} src={user.photo} size="sm" />
            <div className="text-left">
              <p className="text-sm font-medium text-text-primary">{user.name}</p>
              <p className="text-xs text-text-secondary">{user.role.replace('_', ' ')}</p>
            </div>
          </button>

          {/* Profile Dropdown */}
          {showProfile && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowProfile(false)}
              />
              <div className="absolute right-0 mt-2 w-56 bg-surface border border-border rounded-lg shadow-xl z-50 animate-fade-in">
                <div className="p-3 border-b border-border">
                  {/* Avatar with upload button */}
                  <div className="flex items-center gap-3 mb-2">
                    <div className="relative group cursor-pointer" onClick={() => photoInputRef.current?.click()}>
                      <Avatar name={user.name} src={user.photo} size="md" />
                      <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Camera className="w-3.5 h-3.5 text-text-primary" />
                      </div>
                    </div>
                    <div>
                      <p className="font-medium text-text-primary text-sm">{user.name}</p>
                      <p className="text-xs text-text-secondary">{user.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => photoInputRef.current?.click()}
                    className="w-full text-xs text-primary hover:text-primary/80 text-left transition-colors"
                  >
                    Change profile photo
                  </button>
                  <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                </div>
                <div className="p-2">
                  <button
                    onClick={() => { setShowProfile(false); router.push('/admin/settings') }}
                    className="flex items-center gap-3 w-full px-3 py-2 text-sm text-text-primary hover:bg-surface-light rounded transition-colors"
                  >
                    <User className="w-4 h-4" />
                    Profile
                  </button>
                  <button
                    onClick={() => { setShowProfile(false); router.push('/admin/settings') }}
                    className="flex items-center gap-3 w-full px-3 py-2 text-sm text-text-primary hover:bg-surface-light rounded transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </button>
                </div>
                <div className="p-2 border-t border-border">
                  <button
                    onClick={() => signOut({ callbackUrl: '/admin/login' })}
                    className="flex items-center gap-3 w-full px-3 py-2 text-sm text-danger hover:bg-danger/10 rounded transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
