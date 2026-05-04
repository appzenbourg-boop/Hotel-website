import { format, formatDistanceToNow, differenceInMinutes, differenceInHours, differenceInDays } from 'date-fns'

/**
 * Merge CSS class names (supports conditional classes)
 */
export function cn(...classes: (string | number | boolean | undefined | null | Record<string, boolean>)[]): string {
  return classes
    .flatMap((c) => {
      if (!c) return []
      if (typeof c === 'object') {
        return Object.entries(c)
          .filter(([, v]) => v)
          .map(([k]) => k)
      }
      return [String(c)]
    })
    .join(' ')
}

/**
 * Format currency in INR
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Format date to readable string
 */
export function formatDate(date: Date | string, formatStr: string = 'MMM dd, yyyy'): string {
  return format(new Date(date), formatStr)
}

/**
 * Format datetime
 */
export function formatDateTime(date: Date | string): string {
  return format(new Date(date), 'MMM dd, yyyy hh:mm a')
}

/**
 * Get relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

/**
 * Get status badge color classes
 */
export function getStatusColor(status: string): string {
  const statusMap: Record<string, string> = {
    // Room Status
    AVAILABLE: 'badge-success',
    OCCUPIED: 'badge-info',
    MAINTENANCE: 'badge-warning',
    BLOCKED: 'badge-danger',
    CLEANING: 'badge-warning',

    // Booking Status
    RESERVED: 'badge-info',
    CHECKED_IN: 'badge-success',
    CHECKED_OUT: 'badge-secondary',
    CANCELLED: 'badge-danger',
    NO_SHOW: 'badge-danger',

    // Service Status
    PENDING: 'badge-warning',
    ACCEPTED: 'badge-info',
    IN_PROGRESS: 'badge-info',
    COMPLETED: 'badge-success',

    // Payment Status
    PAID: 'badge-success',
    PARTIAL: 'badge-warning',
    UNPAID: 'badge-danger',
    REFUNDED: 'badge-secondary',

    // User Status
    ACTIVE: 'badge-success',
    INACTIVE: 'badge-secondary',
    ON_LEAVE: 'badge-warning',

    // Leave Status
    APPROVED: 'badge-success',
    REJECTED: 'badge-danger',

    // Attendance
    PRESENT: 'badge-success',
    ABSENT: 'badge-danger',
    LATE: 'badge-warning',
    HALF_DAY: 'badge-warning',

    // ID Verification
    VERIFIED: 'badge-success',
    LINK_SENT: 'badge-info',
    LINK_OPENED: 'badge-info',
  }

  return statusMap[status] || 'badge-secondary'
}

/**
 * Get priority color for service requests
 */
export function getPriorityColor(priority: string): string {
  const priorityMap: Record<string, string> = {
    LOW: 'text-text-secondary',
    NORMAL: 'text-info',
    HIGH: 'text-warning',
    URGENT: 'text-danger',
  }

  return priorityMap[priority] || 'text-text-secondary'
}

/**
 * Calculate SLA status and color
 */
export function getSLAStatus(createdAt: Date, slaMinutes: number): {
  status: 'on-time' | 'warning' | 'breach'
  color: string
  timeRemaining: number
} {
  const elapsed = differenceInMinutes(new Date(), new Date(createdAt))
  const remaining = slaMinutes - elapsed
  const percentage = (remaining / slaMinutes) * 100

  if (remaining < 0) {
    return { status: 'breach', color: 'text-danger', timeRemaining: remaining }
  } else if (percentage < 20) {
    return { status: 'warning', color: 'text-warning', timeRemaining: remaining }
  } else {
    return { status: 'on-time', color: 'text-success', timeRemaining: remaining }
  }
}

/**
 * Format time remaining for SLA
 */
export function formatSLATime(minutes: number): string {
  if (minutes < 0) {
    const absMinutes = Math.abs(minutes)
    const hours = Math.floor(absMinutes / 60)
    const mins = absMinutes % 60
    return hours > 0 ? `-${hours}h ${mins}m` : `-${mins}m`
  }

  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
}

/**
 * Calculate occupancy rate
 */
export function calculateOccupancy(occupied: number, total: number): number {
  if (total === 0) return 0
  return Math.round((occupied / total) * 100)
}

/**
 * Generate initials from name
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Truncate text
 */
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text
  return text.slice(0, length) + '...'
}

/**
 * Format phone number
 */
export function formatPhone(phone: string): string {
  // Format: +91 12345 67890
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`
  }
  return phone
}

/**
 * Generate random color for avatars
 */
export function generateAvatarColor(seed: string): string {
  const colors = [
    'bg-red-500',
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-cyan-500',
  ]

  const index = seed.charCodeAt(0) % colors.length
  return colors[index]
}

/**
 * Calculate number of days between dates
 */
export function getDaysBetween(start: Date, end: Date): number {
  return differenceInDays(new Date(end), new Date(start))
}

/**
 * Get booking duration text
 */
export function getBookingDuration(checkIn: Date, checkOut: Date): string {
  const days = getDaysBetween(checkIn, checkOut)
  const nights = Math.max(days, 1)
  return `${nights} ${nights === 1 ? 'night' : 'nights'}`
}

/**
 * Validate email
 */
export function isValidEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(email)
}

/**
 * Validate phone (Indian)
 */
export function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '')
  return cleaned.length === 10
}

/**
 * Download file
 */
export function downloadFile(url: string, filename: string): void {
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Export to CSV
 */
export function exportToCSV(data: any[], filename: string): void {
  if (data.length === 0) return

  const headers = Object.keys(data[0])
  const csv = [
    headers.join(','),
    ...data.map(row => headers.map(header => JSON.stringify(row[header])).join(',')),
  ].join('\n')

  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  downloadFile(url, filename)
  URL.revokeObjectURL(url)
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }

    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

/**
 * Generate unique ID
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}
