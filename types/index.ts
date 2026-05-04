// Core Type Definitions for Zenbourg Hotel Management System

export type UserRole = 'SUPER_ADMIN' | 'HOTEL_ADMIN' | 'MANAGER' | 'RECEPTIONIST' | 'STAFF' | 'GUEST'
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE'

export type RoomStatus = 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'BLOCKED' | 'CLEANING'
export type RoomCategory = 'STANDARD' | 'DELUXE' | 'SUITE' | 'PENTHOUSE' | 'CUSTOM'

export type BookingStatus = 'RESERVED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED' | 'NO_SHOW'
export type BookingSource = 'WALK_IN' | 'DIRECT' | 'BOOKING_COM' | 'MAKE_MY_TRIP' | 'AGODA' | 'EXPEDIA' | 'AIRBNB' | 'OTHER'
export type PaymentStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'REFUNDED'

export type ServiceType = 'HOUSEKEEPING' | 'FOOD_ORDER' | 'ROOM_SERVICE' | 'LAUNDRY' | 'MAINTENANCE' | 'CONCIERGE' | 'SPA'
export type ServiceStatus = 'PENDING' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
export type Priority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'

export type Department = 'FRONT_DESK' | 'HOUSEKEEPING' | 'KITCHEN' | 'ROOM_SERVICE' | 'MAINTENANCE' | 'SECURITY' | 'ACCOUNTS' | 'MANAGEMENT'

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'ON_LEAVE'
export type LeaveType = 'CASUAL' | 'SICK' | 'EARNED' | 'UNPAID'
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'

export type PayrollStatus = 'PENDING' | 'APPROVED' | 'PAID'

export type CheckInStatus = 'PENDING' | 'LINK_SENT' | 'LINK_OPENED' | 'COMPLETED' | 'VERIFIED'

// Dashboard Types
export interface DashboardStats {
  todayCheckIns: number
  todayCheckOuts: number
  occupancyRate: number
  availableRooms: number
  pendingHousekeeping: number
  activeFoodOrders: number
  slaBreaches: number
  onDutyStaff: number
  todayRevenue: number
  monthRevenue: number
}

export interface RecentActivity {
  id: string
  type: 'check_in' | 'check_out' | 'service_request' | 'booking'
  message: string
  time: Date
  user?: string
}

// Guest Types
export interface GuestListItem {
  id: string
  name: string
  phone: string
  email?: string
  roomNumber?: string
  checkIn?: Date
  checkOut?: Date
  guestCount?: number
  idVerified: boolean
  source: BookingSource
  status?: BookingStatus
}

// Room Types
export interface RoomListItem {
  id: string
  roomNumber: string
  type: string
  category: RoomCategory
  floor: number
  price: number
  maxOccupancy: number
  status: RoomStatus
  amenities: string[]
}

// Service Request Types
export interface ServiceRequestListItem {
  id: string
  type: ServiceType
  roomNumber?: string
  guestName?: string
  status: ServiceStatus
  priority: Priority
  assignedTo?: string
  slaMinutes: number
  createdAt: Date
  timeElapsed?: number
}

// Staff Types
export interface StaffListItem {
  id: string
  name: string
  email: string
  phone: string
  employeeId: string
  department: Department
  designation: string
  status: UserStatus
  photo?: string
}

// Booking Types
export interface BookingListItem {
  id: string
  guestName: string
  guestPhone: string
  roomNumber: string
  checkIn: Date
  checkOut: Date
  numberOfGuests: number
  status: BookingStatus
  source: BookingSource
  totalAmount: number
  paidAmount: number
  paymentStatus: PaymentStatus
}

// Calendar Event Type
export interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  resourceId: string
  color: string
  status: BookingStatus
  guestName: string
  roomNumber: string
}

// Form Types
export interface LoginForm {
  email: string
  password: string
}

export interface GuestCheckInForm {
  name: string
  phone: string
  email?: string
  idType: string
  idNumber: string
  idDocumentFront?: File
  idDocumentBack?: File
  numberOfGuests: number
  specialRequests?: string
}

export interface CreateBookingForm {
  guestId: string
  roomId: string
  checkIn: Date
  checkOut: Date
  numberOfGuests: number
  source: BookingSource
  totalAmount: number
  specialRequests?: string
}

export interface CreateServiceRequestForm {
  type: ServiceType
  guestId?: string
  roomId?: string
  title: string
  description?: string
  priority: Priority
}

export interface AddStaffForm {
  name: string
  email: string
  phone: string
  password: string
  dateOfBirth?: Date
  department: Department
  designation: string
  baseSalary: number
  bankName?: string
  accountNumber?: string
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// Filter Types
export interface GuestFilters {
  search?: string
  status?: BookingStatus
  source?: BookingSource
  idStatus?: 'all' | 'verified' | 'pending'
  dateRange?: { start: Date; end: Date }
}

export interface ServiceRequestFilters {
  search?: string
  type?: ServiceType
  status?: ServiceStatus
  assignedStaff?: string
  priority?: Priority
}

export interface StaffFilters {
  search?: string
  department?: Department
  status?: UserStatus
}

export interface BookingFilters {
  search?: string
  status?: BookingStatus
  source?: BookingSource
  checkInDate?: Date
  checkOutDate?: Date
}
