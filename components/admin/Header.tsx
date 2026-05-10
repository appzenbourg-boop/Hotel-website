'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Bell, Search, LogOut, User, Settings, Camera } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import Avatar from '@/components/common/Avatar'
import PropertySwitcher from '@/components/admin/PropertySwitcher'
import { isGlobalContext } from '@/lib/admin-context'

interface HeaderProps {
  onMenuClick: () => void
}

export default function Header({ onMenuClick }: HeaderProps) {
  const router = useRouter()
  const [showNotifications, setShowNotifications] = useState(false)
  const [expandedNotifications, setExpandedNotifications] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const { data: session } = useSession()

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
    photo: profilePhoto,
  }

  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/admin/notifications')
      if (res.ok) {
        const data = await res.json()
        const formatted = (data.notifications ?? []).map((n: any) => ({
          id: n.id,
          message: n.description || n.title,
          title: n.title,
          time: new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          unread: !n.isRead,
          type: n.type,
        }))
        setNotifications(formatted)
        setUnreadCount(data.unreadCount ?? 0)
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
        body: JSON.stringify({ ids: [notif.id] }),
      })
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
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 md:px-6 bg-[#0d1117] border-b border-white/[0.08] no-print">
      {/* Mobile Menu Button */}
      <button 
        onClick={onMenuClick}
        className="md:hidden p-2 -ml-2 text-gray-400 hover:text-white transition-colors"
      >
        <div className="flex flex-col gap-1">
          <span className="w-5 h-[2px] bg-current rounded-full" />
          <span className="w-3.5 h-[2px] bg-current rounded-full" />
          <span className="w-5 h-[2px] bg-current rounded-full" />
        </div>
      </button>

      {/* Search */}
      <div className="flex items-center gap-4 flex-1 mr-4">
        <div className="hidden sm:block flex-1 max-w-xl">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary transition-colors group-focus-within:text-primary" />
            <input
              type="text"
              placeholder="Search guests, bookings, rooms..."
              className="w-full pl-10 pr-4 py-2 bg-surface-light/50 border border-border/50 rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary/30 transition-all"
            />
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
                        <Camera className="w-3.5 h-3.5 text-white" />
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
