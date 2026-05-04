
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  name: 'name',
  email: 'email',
  phone: 'phone',
  password: 'password',
  role: 'role',
  status: 'status',
  dndEnabled: 'dndEnabled',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  workplaceId: 'workplaceId',
  ownedPropertyIds: 'ownedPropertyIds'
};

exports.Prisma.GuestScalarFieldEnum = {
  id: 'id',
  name: 'name',
  email: 'email',
  profileImage: 'profileImage',
  phone: 'phone',
  idType: 'idType',
  idNumber: 'idNumber',
  idDocumentFront: 'idDocumentFront',
  idDocumentBack: 'idDocumentBack',
  address: 'address',
  dateOfBirth: 'dateOfBirth',
  checkInStatus: 'checkInStatus',
  checkInCompletedAt: 'checkInCompletedAt',
  language: 'language',
  createdByPropertyId: 'createdByPropertyId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.FavoriteScalarFieldEnum = {
  id: 'id',
  guestId: 'guestId',
  roomId: 'roomId',
  createdAt: 'createdAt'
};

exports.Prisma.PropertyScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  address: 'address',
  phone: 'phone',
  email: 'email',
  logo: 'logo',
  coverImage: 'coverImage',
  images: 'images',
  checkInTime: 'checkInTime',
  checkOutTime: 'checkOutTime',
  cancellationPolicy: 'cancellationPolicy',
  plan: 'plan',
  features: 'features',
  planExpiresAt: 'planExpiresAt',
  latitude: 'latitude',
  longitude: 'longitude',
  ranking: 'ranking',
  policies: 'policies',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  ownerIds: 'ownerIds'
};

exports.Prisma.RoomScalarFieldEnum = {
  id: 'id',
  propertyId: 'propertyId',
  roomNumber: 'roomNumber',
  floor: 'floor',
  category: 'category',
  type: 'type',
  maxOccupancy: 'maxOccupancy',
  basePrice: 'basePrice',
  weekendSurcharge: 'weekendSurcharge',
  visibleOnline: 'visibleOnline',
  petFriendly: 'petFriendly',
  smokingAllowed: 'smokingAllowed',
  adaCompliant: 'adaCompliant',
  amenities: 'amenities',
  images: 'images',
  description: 'description',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.BookingScalarFieldEnum = {
  id: 'id',
  guestId: 'guestId',
  roomId: 'roomId',
  checkIn: 'checkIn',
  checkOut: 'checkOut',
  actualCheckIn: 'actualCheckIn',
  actualCheckOut: 'actualCheckOut',
  numberOfGuests: 'numberOfGuests',
  status: 'status',
  source: 'source',
  totalAmount: 'totalAmount',
  paidAmount: 'paidAmount',
  paymentStatus: 'paymentStatus',
  baseAmount: 'baseAmount',
  gstPercent: 'gstPercent',
  gstAmount: 'gstAmount',
  serviceChargePercent: 'serviceChargePercent',
  serviceChargeAmount: 'serviceChargeAmount',
  luxuryTaxPercent: 'luxuryTaxPercent',
  luxuryTaxAmount: 'luxuryTaxAmount',
  discountPercent: 'discountPercent',
  discountAmount: 'discountAmount',
  finalAmount: 'finalAmount',
  specialRequests: 'specialRequests',
  notes: 'notes',
  propertyId: 'propertyId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ServiceRequestScalarFieldEnum = {
  id: 'id',
  type: 'type',
  guestId: 'guestId',
  roomId: 'roomId',
  propertyId: 'propertyId',
  title: 'title',
  description: 'description',
  priority: 'priority',
  assignedToId: 'assignedToId',
  status: 'status',
  slaMinutes: 'slaMinutes',
  createdAt: 'createdAt',
  acceptedAt: 'acceptedAt',
  startedAt: 'startedAt',
  completedAt: 'completedAt',
  amount: 'amount',
  paymentStatus: 'paymentStatus',
  attachments: 'attachments',
  notes: 'notes',
  updatedAt: 'updatedAt'
};

exports.Prisma.StaffScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  propertyId: 'propertyId',
  employeeId: 'employeeId',
  dateOfBirth: 'dateOfBirth',
  dateOfJoining: 'dateOfJoining',
  department: 'department',
  designation: 'designation',
  contractType: 'contractType',
  workShift: 'workShift',
  managerName: 'managerName',
  baseSalary: 'baseSalary',
  bankName: 'bankName',
  accountNumber: 'accountNumber',
  ifscCode: 'ifscCode',
  emergencyContactName: 'emergencyContactName',
  emergencyContactPhone: 'emergencyContactPhone',
  address: 'address',
  profilePhoto: 'profilePhoto',
  documents: 'documents',
  annualLeaveBalance: 'annualLeaveBalance',
  sickLeaveBalance: 'sickLeaveBalance',
  casualLeaveBalance: 'casualLeaveBalance',
  isVerified: 'isVerified',
  verificationRequested: 'verificationRequested',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StaffFinancialAdjustmentScalarFieldEnum = {
  id: 'id',
  staffId: 'staffId',
  type: 'type',
  amount: 'amount',
  reason: 'reason',
  month: 'month',
  year: 'year',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AttendanceScalarFieldEnum = {
  id: 'id',
  staffId: 'staffId',
  date: 'date',
  punchIn: 'punchIn',
  punchOut: 'punchOut',
  punchInLocation: 'punchInLocation',
  punchOutLocation: 'punchOutLocation',
  status: 'status',
  hoursWorked: 'hoursWorked',
  overtimeHours: 'overtimeHours',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.LeaveRequestScalarFieldEnum = {
  id: 'id',
  staffId: 'staffId',
  leaveType: 'leaveType',
  startDate: 'startDate',
  endDate: 'endDate',
  totalDays: 'totalDays',
  reason: 'reason',
  status: 'status',
  approvedBy: 'approvedBy',
  approvedAt: 'approvedAt',
  rejectionReason: 'rejectionReason',
  evidence: 'evidence',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PayrollScalarFieldEnum = {
  id: 'id',
  staffId: 'staffId',
  month: 'month',
  year: 'year',
  baseSalary: 'baseSalary',
  overtimePay: 'overtimePay',
  incentives: 'incentives',
  bonuses: 'bonuses',
  deductions: 'deductions',
  netSalary: 'netSalary',
  status: 'status',
  paidAt: 'paidAt',
  paymentId: 'paymentId',
  breakdown: 'breakdown',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.RatingScalarFieldEnum = {
  id: 'id',
  guestId: 'guestId',
  serviceRequestId: 'serviceRequestId',
  type: 'type',
  rating: 'rating',
  comment: 'comment',
  createdAt: 'createdAt'
};

exports.Prisma.PerformanceScoreScalarFieldEnum = {
  id: 'id',
  staffId: 'staffId',
  month: 'month',
  year: 'year',
  tasksCompleted: 'tasksCompleted',
  tasksOnTime: 'tasksOnTime',
  avgRating: 'avgRating',
  slaBreaches: 'slaBreaches',
  overallScore: 'overallScore',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AmenityScalarFieldEnum = {
  id: 'id',
  propertyId: 'propertyId',
  name: 'name',
  description: 'description',
  icon: 'icon',
  category: 'category',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.MenuItemScalarFieldEnum = {
  id: 'id',
  propertyId: 'propertyId',
  name: 'name',
  description: 'description',
  category: 'category',
  cuisine: 'cuisine',
  price: 'price',
  margin: 'margin',
  images: 'images',
  isVeg: 'isVeg',
  isAvailable: 'isAvailable',
  prepTime: 'prepTime',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SpaServiceScalarFieldEnum = {
  id: 'id',
  propertyId: 'propertyId',
  name: 'name',
  description: 'description',
  duration: 'duration',
  price: 'price',
  image: 'image',
  isAvailable: 'isAvailable',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.LostItemScalarFieldEnum = {
  id: 'id',
  propertyId: 'propertyId',
  name: 'name',
  description: 'description',
  category: 'category',
  status: 'status',
  foundDate: 'foundDate',
  location: 'location',
  roomId: 'roomId',
  reportedById: 'reportedById',
  guestId: 'guestId',
  bookingId: 'bookingId',
  image: 'image',
  evidenceImages: 'evidenceImages',
  caseNotes: 'caseNotes',
  claimerName: 'claimerName',
  claimerPhone: 'claimerPhone',
  claimedAt: 'claimedAt',
  claimNotes: 'claimNotes',
  whatsappSent: 'whatsappSent',
  whatsappSentAt: 'whatsappSentAt',
  whatsappStatus: 'whatsappStatus',
  whatsappMessageId: 'whatsappMessageId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.RolePermissionScalarFieldEnum = {
  id: 'id',
  propertyId: 'propertyId',
  role: 'role',
  permissions: 'permissions',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SystemSettingScalarFieldEnum = {
  id: 'id',
  key: 'key',
  value: 'value',
  description: 'description',
  updatedAt: 'updatedAt'
};

exports.Prisma.NotificationTemplateScalarFieldEnum = {
  id: 'id',
  name: 'name',
  type: 'type',
  channel: 'channel',
  subject: 'subject',
  template: 'template',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ServiceConfigScalarFieldEnum = {
  id: 'id',
  propertyId: 'propertyId',
  type: 'type',
  totalSla: 'totalSla',
  options: 'options',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ServiceStepScalarFieldEnum = {
  id: 'id',
  serviceConfigId: 'serviceConfigId',
  name: 'name',
  duration: 'duration',
  order: 'order'
};

exports.Prisma.CampaignScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  startedAt: 'startedAt',
  segment: 'segment',
  performance: 'performance',
  status: 'status',
  channel: 'channel',
  promoCode: 'promoCode',
  propertyId: 'propertyId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SystemNodeScalarFieldEnum = {
  id: 'id',
  name: 'name',
  type: 'type',
  ipAddress: 'ipAddress',
  uptime: 'uptime',
  status: 'status',
  propertyId: 'propertyId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SystemAlertScalarFieldEnum = {
  id: 'id',
  message: 'message',
  description: 'description',
  type: 'type',
  timestamp: 'timestamp',
  category: 'category',
  propertyId: 'propertyId'
};

exports.Prisma.InAppNotificationScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  title: 'title',
  description: 'description',
  type: 'type',
  isRead: 'isRead',
  createdAt: 'createdAt'
};

exports.Prisma.MessageScalarFieldEnum = {
  id: 'id',
  senderId: 'senderId',
  receiverId: 'receiverId',
  serviceRequestId: 'serviceRequestId',
  content: 'content',
  isRead: 'isRead',
  type: 'type',
  category: 'category',
  createdAt: 'createdAt'
};

exports.Prisma.SupportTicketScalarFieldEnum = {
  id: 'id',
  guestId: 'guestId',
  propertyId: 'propertyId',
  type: 'type',
  subject: 'subject',
  message: 'message',
  status: 'status',
  priority: 'priority',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TicketMessageScalarFieldEnum = {
  id: 'id',
  ticketId: 'ticketId',
  senderId: 'senderId',
  senderRole: 'senderRole',
  content: 'content',
  createdAt: 'createdAt'
};

exports.Prisma.PlanDefinitionScalarFieldEnum = {
  id: 'id',
  plan: 'plan',
  displayName: 'displayName',
  tagline: 'tagline',
  description: 'description',
  originalPrice: 'originalPrice',
  discountedPrice: 'discountedPrice',
  discountPercent: 'discountPercent',
  billingCycle: 'billingCycle',
  maxRooms: 'maxRooms',
  maxStaff: 'maxStaff',
  features: 'features',
  updatedAt: 'updatedAt'
};

exports.Prisma.PropertySettingsScalarFieldEnum = {
  id: 'id',
  propertyId: 'propertyId',
  gstPercent: 'gstPercent',
  serviceChargePercent: 'serviceChargePercent',
  luxuryTaxPercent: 'luxuryTaxPercent',
  defaultDiscountPercent: 'defaultDiscountPercent',
  discountLabel: 'discountLabel',
  invoicePrefix: 'invoicePrefix',
  invoiceFooter: 'invoiceFooter',
  currency: 'currency',
  currencySymbol: 'currencySymbol',
  checkInTime: 'checkInTime',
  checkOutTime: 'checkOutTime',
  bankAccountName: 'bankAccountName',
  bankAccountNumber: 'bankAccountNumber',
  bankIfscCode: 'bankIfscCode',
  bankName: 'bankName',
  bankBranch: 'bankBranch',
  upiId: 'upiId',
  razorpayKeyId: 'razorpayKeyId',
  razorpayKeySecret: 'razorpayKeySecret',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DashboardServiceScalarFieldEnum = {
  id: 'id',
  propertyId: 'propertyId',
  name: 'name',
  iconUrl: 'iconUrl',
  iconName: 'iconName',
  route: 'route',
  isActive: 'isActive',
  order: 'order',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};
exports.UserRole = exports.$Enums.UserRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  HOTEL_ADMIN: 'HOTEL_ADMIN',
  MANAGER: 'MANAGER',
  RECEPTIONIST: 'RECEPTIONIST',
  STAFF: 'STAFF',
  GUEST: 'GUEST'
};

exports.UserStatus = exports.$Enums.UserStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  ON_LEAVE: 'ON_LEAVE'
};

exports.CheckInStatus = exports.$Enums.CheckInStatus = {
  PENDING: 'PENDING',
  LINK_SENT: 'LINK_SENT',
  LINK_OPENED: 'LINK_OPENED',
  COMPLETED: 'COMPLETED',
  VERIFIED: 'VERIFIED'
};

exports.SubscriptionPlan = exports.$Enums.SubscriptionPlan = {
  BASE: 'BASE',
  STARTER: 'STARTER',
  STANDARD: 'STANDARD',
  ENTERPRISE: 'ENTERPRISE',
  GOLD: 'GOLD',
  PLATINUM: 'PLATINUM',
  DIAMOND: 'DIAMOND'
};

exports.RoomCategory = exports.$Enums.RoomCategory = {
  STANDARD: 'STANDARD',
  DELUXE: 'DELUXE',
  SUITE: 'SUITE',
  PENTHOUSE: 'PENTHOUSE',
  CUSTOM: 'CUSTOM'
};

exports.RoomStatus = exports.$Enums.RoomStatus = {
  AVAILABLE: 'AVAILABLE',
  OCCUPIED: 'OCCUPIED',
  MAINTENANCE: 'MAINTENANCE',
  BLOCKED: 'BLOCKED',
  CLEANING: 'CLEANING'
};

exports.BookingStatus = exports.$Enums.BookingStatus = {
  RESERVED: 'RESERVED',
  CHECKED_IN: 'CHECKED_IN',
  CHECKED_OUT: 'CHECKED_OUT',
  CANCELLED: 'CANCELLED',
  NO_SHOW: 'NO_SHOW'
};

exports.BookingSource = exports.$Enums.BookingSource = {
  WALK_IN: 'WALK_IN',
  DIRECT: 'DIRECT',
  BOOKING_COM: 'BOOKING_COM',
  MAKE_MY_TRIP: 'MAKE_MY_TRIP',
  AGODA: 'AGODA',
  EXPEDIA: 'EXPEDIA',
  AIRBNB: 'AIRBNB',
  OTHER: 'OTHER'
};

exports.PaymentStatus = exports.$Enums.PaymentStatus = {
  PENDING: 'PENDING',
  PARTIAL: 'PARTIAL',
  PAID: 'PAID',
  REFUNDED: 'REFUNDED'
};

exports.ServiceType = exports.$Enums.ServiceType = {
  HOUSEKEEPING: 'HOUSEKEEPING',
  FOOD_ORDER: 'FOOD_ORDER',
  ROOM_SERVICE: 'ROOM_SERVICE',
  LAUNDRY: 'LAUNDRY',
  MAINTENANCE: 'MAINTENANCE',
  CONCIERGE: 'CONCIERGE',
  SPA: 'SPA'
};

exports.Priority = exports.$Enums.Priority = {
  LOW: 'LOW',
  NORMAL: 'NORMAL',
  HIGH: 'HIGH',
  URGENT: 'URGENT'
};

exports.ServiceStatus = exports.$Enums.ServiceStatus = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
};

exports.Department = exports.$Enums.Department = {
  FRONT_DESK: 'FRONT_DESK',
  HOUSEKEEPING: 'HOUSEKEEPING',
  KITCHEN: 'KITCHEN',
  ROOM_SERVICE: 'ROOM_SERVICE',
  MAINTENANCE: 'MAINTENANCE',
  SECURITY: 'SECURITY',
  ACCOUNTS: 'ACCOUNTS',
  MANAGEMENT: 'MANAGEMENT'
};

exports.AdjustmentType = exports.$Enums.AdjustmentType = {
  INCENTIVE: 'INCENTIVE',
  BONUS: 'BONUS',
  ALLOWANCE: 'ALLOWANCE',
  DEDUCTION: 'DEDUCTION'
};

exports.AttendanceStatus = exports.$Enums.AttendanceStatus = {
  PRESENT: 'PRESENT',
  ABSENT: 'ABSENT',
  LATE: 'LATE',
  HALF_DAY: 'HALF_DAY',
  ON_LEAVE: 'ON_LEAVE'
};

exports.LeaveType = exports.$Enums.LeaveType = {
  CASUAL: 'CASUAL',
  SICK: 'SICK',
  EARNED: 'EARNED',
  UNPAID: 'UNPAID'
};

exports.LeaveStatus = exports.$Enums.LeaveStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED'
};

exports.PayrollStatus = exports.$Enums.PayrollStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  PAID: 'PAID'
};

exports.RatingType = exports.$Enums.RatingType = {
  SERVICE: 'SERVICE',
  OVERALL_STAY: 'OVERALL_STAY',
  CLEANLINESS: 'CLEANLINESS',
  FOOD: 'FOOD',
  STAFF: 'STAFF'
};

exports.NotificationType = exports.$Enums.NotificationType = {
  CHECK_IN_LINK: 'CHECK_IN_LINK',
  BOOKING_CONFIRMATION: 'BOOKING_CONFIRMATION',
  CHECK_IN_REMINDER: 'CHECK_IN_REMINDER',
  CHECK_OUT_REMINDER: 'CHECK_OUT_REMINDER',
  SERVICE_REQUEST_UPDATE: 'SERVICE_REQUEST_UPDATE',
  PAYMENT_RECEIPT: 'PAYMENT_RECEIPT',
  STAFF_TASK_ASSIGNED: 'STAFF_TASK_ASSIGNED',
  LEAVE_APPROVED: 'LEAVE_APPROVED',
  SALARY_CREDITED: 'SALARY_CREDITED'
};

exports.NotificationChannel = exports.$Enums.NotificationChannel = {
  SMS: 'SMS',
  EMAIL: 'EMAIL',
  WHATSAPP: 'WHATSAPP',
  PUSH: 'PUSH',
  IN_APP: 'IN_APP'
};

exports.CampaignStatus = exports.$Enums.CampaignStatus = {
  ACTIVE: 'ACTIVE',
  SCHEDULED: 'SCHEDULED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
};

exports.TicketType = exports.$Enums.TicketType = {
  TECHNICAL: 'TECHNICAL',
  BOOKING: 'BOOKING',
  PAYMENT: 'PAYMENT',
  OTHER: 'OTHER'
};

exports.TicketStatus = exports.$Enums.TicketStatus = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED'
};

exports.TicketPriority = exports.$Enums.TicketPriority = {
  LOW: 'LOW',
  NORMAL: 'NORMAL',
  HIGH: 'HIGH'
};

exports.Prisma.ModelName = {
  User: 'User',
  Guest: 'Guest',
  Favorite: 'Favorite',
  Property: 'Property',
  Room: 'Room',
  Booking: 'Booking',
  ServiceRequest: 'ServiceRequest',
  Staff: 'Staff',
  StaffFinancialAdjustment: 'StaffFinancialAdjustment',
  Attendance: 'Attendance',
  LeaveRequest: 'LeaveRequest',
  Payroll: 'Payroll',
  Rating: 'Rating',
  PerformanceScore: 'PerformanceScore',
  Amenity: 'Amenity',
  MenuItem: 'MenuItem',
  SpaService: 'SpaService',
  LostItem: 'LostItem',
  RolePermission: 'RolePermission',
  SystemSetting: 'SystemSetting',
  NotificationTemplate: 'NotificationTemplate',
  ServiceConfig: 'ServiceConfig',
  ServiceStep: 'ServiceStep',
  Campaign: 'Campaign',
  SystemNode: 'SystemNode',
  SystemAlert: 'SystemAlert',
  InAppNotification: 'InAppNotification',
  Message: 'Message',
  SupportTicket: 'SupportTicket',
  TicketMessage: 'TicketMessage',
  PlanDefinition: 'PlanDefinition',
  PropertySettings: 'PropertySettings',
  DashboardService: 'DashboardService'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
