/**
 * Master Hotel Feature Registry for Super Admin & Multi-Tenant Control
 * Defines every granular module and feature available in the Zenbourg PMS platform.
 * Super Admin can toggle any of these on or off per hotel or chain.
 */

export interface MasterFeature {
    id: string
    name: string
    description: string
    category: FeatureCategory
    defaultOn?: boolean
    icon?: string
}

export type FeatureCategory = 
    | 'FRONT_DESK'
    | 'ROOMS_HOUSEKEEPING'
    | 'POS_RESTAURANT'
    | 'BANQUET_EVENTS'
    | 'PROCUREMENT_INVENTORY'
    | 'STAFF_HR'
    | 'AUDIT_FINANCE'
    | 'DISTRIBUTION_CHANNELS'
    | 'MARKETING_ANALYTICS'
    | 'GUEST_EXPERIENCE'
    | 'INFRASTRUCTURE_SETTINGS'

export interface FeatureCategoryMeta {
    id: FeatureCategory
    title: string
    description: string
    icon: string
    color: string
}

export const FEATURE_CATEGORIES: FeatureCategoryMeta[] = [
    {
        id: 'FRONT_DESK',
        title: 'Front Desk & Reservations',
        description: 'Reservation calendar, check-in/out, folios, guest CRM & approvals',
        icon: 'CalendarDays',
        color: 'text-blue-400'
    },
    {
        id: 'ROOMS_HOUSEKEEPING',
        title: 'Rooms & Housekeeping',
        description: 'Room inventory, occupancy heatmaps, housekeeping & maintenance dispatch',
        icon: 'BedDouble',
        color: 'text-emerald-400'
    },
    {
        id: 'POS_RESTAURANT',
        title: 'POS & Food / Beverage',
        description: 'Table floor plan, live kitchen orders, transactions & in-room dining',
        icon: 'UtensilsCrossed',
        color: 'text-amber-400'
    },
    {
        id: 'BANQUET_EVENTS',
        title: 'Banquet & Event Management',
        description: 'Multi-event bookings, pax calculations, hall calendar & event billing',
        icon: 'PartyPopper',
        color: 'text-pink-400'
    },
    {
        id: 'PROCUREMENT_INVENTORY',
        title: 'Purchase & Inventory',
        description: 'Stock tracking, purchase orders, vendor directory & consumption reports',
        icon: 'ShoppingBag',
        color: 'text-indigo-400'
    },
    {
        id: 'STAFF_HR',
        title: 'Staff & Human Resources',
        description: 'Employee profiles, time clock attendance, leave approvals & payroll',
        icon: 'UserCog',
        color: 'text-teal-400'
    },
    {
        id: 'AUDIT_FINANCE',
        title: 'Audit & Accounting',
        description: 'Night audit console, master ledgers, daily manager reports & ERP sync',
        icon: 'ShieldCheck',
        color: 'text-purple-400'
    },
    {
        id: 'DISTRIBUTION_CHANNELS',
        title: 'Channel Manager & OTAs',
        description: 'Two-way synchronization with Airbnb, Booking.com, MMT, Agoda & Expedia',
        icon: 'Globe',
        color: 'text-cyan-400'
    },
    {
        id: 'MARKETING_ANALYTICS',
        title: 'Marketing & Analytics',
        description: 'Promotional campaigns, revenue metrics, dining & guest loyalty reports',
        icon: 'BarChart3',
        color: 'text-rose-400'
    },
    {
        id: 'GUEST_EXPERIENCE',
        title: 'Guest Experience & Concierge',
        description: 'Service dispatch, concierge tickets, internal messaging & guest reviews',
        icon: 'Bell',
        color: 'text-orange-400'
    },
    {
        id: 'INFRASTRUCTURE_SETTINGS',
        title: 'Infrastructure & System',
        description: 'IoT network monitoring, role permission matrix & hotel policies',
        icon: 'Activity',
        color: 'text-violet-400'
    }
]

export const MASTER_FEATURES: MasterFeature[] = [
    // ── 1. FRONT DESK & RESERVATIONS ─────────────────────────────
    {
        id: 'bookings',
        name: 'Reservations & Booking Engine',
        description: 'Visual reservation calendar, room tape chart and booking modifications',
        category: 'FRONT_DESK',
        defaultOn: true
    },
    {
        id: 'checkin',
        name: 'Digital Check-in / Front Desk Desk',
        description: 'Front desk console, QR check-in, key card allocation and guest check-in/out',
        category: 'FRONT_DESK',
        defaultOn: true
    },
    {
        id: 'approvals',
        name: 'Reservation Approvals & Rate Overrides',
        description: 'Manager approval workflows for discounted bookings and complimentary stays',
        category: 'FRONT_DESK',
        defaultOn: true
    },
    {
        id: 'guests',
        name: 'Guest CRM & VIP Profiles',
        description: 'Guest directory, stay histories, preferences, blacklist and VIP notes',
        category: 'FRONT_DESK',
        defaultOn: true
    },
    {
        id: 'lost_found',
        name: 'Lost & Found Operations',
        description: 'Log and track lost items, guest claim verification and WhatsApp updates',
        category: 'FRONT_DESK',
        defaultOn: true
    },

    // ── 2. ROOMS & HOUSEKEEPING ──────────────────────────────────
    {
        id: 'rooms',
        name: 'Room Inventory & Categories',
        description: 'Manage rooms, pricing tiers, amenities and floor layouts',
        category: 'ROOMS_HOUSEKEEPING',
        defaultOn: true
    },
    {
        id: 'occupancy',
        name: 'Live Room Occupancy Heatmap',
        description: 'Real-time room status grid (Occupied, Cleaning, Maintenance, Blocked)',
        category: 'ROOMS_HOUSEKEEPING',
        defaultOn: true
    },
    {
        id: 'housekeeping',
        name: 'Housekeeping Task Dispatch',
        description: 'Assign cleaning tasks to staff, track room turnaround times',
        category: 'ROOMS_HOUSEKEEPING',
        defaultOn: true
    },
    {
        id: 'maintenance',
        name: 'Maintenance & Work Orders',
        description: 'Issue room repair tickets with photo evidence and priority SLA tracking',
        category: 'ROOMS_HOUSEKEEPING',
        defaultOn: true
    },
    {
        id: 'content_amenities',
        name: 'Hotel Amenities & Facilities Showcase',
        description: 'Manage hotel facilities, operating hours and guest-facing amenities',
        category: 'ROOMS_HOUSEKEEPING',
        defaultOn: true
    },

    // ── 3. POS & RESTAURANT ──────────────────────────────────────
    {
        id: 'pos_orders',
        name: 'Point of Sale (POS) Active Orders',
        description: 'Live order pipeline, kitchen display ticket dispatch, rush order alerts',
        category: 'POS_RESTAURANT',
        defaultOn: true
    },
    {
        id: 'pos_floor_plan',
        name: 'Interactive Restaurant Floor Plan',
        description: 'Visual table map, table occupancy, table transfers and reserved booths',
        category: 'POS_RESTAURANT',
        defaultOn: true
    },
    {
        id: 'content_menu',
        name: 'Food & Beverage Menu Management',
        description: 'Dishes, pricing, dietary tags, preparation times and menu cards',
        category: 'POS_RESTAURANT',
        defaultOn: true
    },
    {
        id: 'pos_transactions',
        name: 'POS Cashier & Transactions Log',
        description: 'Daily cash reconciliation, payment split receipts and sales logs',
        category: 'POS_RESTAURANT',
        defaultOn: true
    },
    {
        id: 'room_service',
        name: 'In-Room Dining & Room Delivery',
        description: 'Direct room service ordering and automatic posting to guest room bill',
        category: 'POS_RESTAURANT',
        defaultOn: true
    },

    // ── 4. BANQUET & EVENTS ──────────────────────────────────────
    {
        id: 'banquet_calendar',
        name: 'Banquet Visual Calendar',
        description: 'Timeline view of hall bookings, event dates and slot schedules',
        category: 'BANQUET_EVENTS',
        defaultOn: false
    },
    {
        id: 'banquet_new',
        name: 'Multi-Event Banquet Booking',
        description: 'Banquet reservation form with pax count, plate rates and automatic quotes',
        category: 'BANQUET_EVENTS',
        defaultOn: false
    },
    {
        id: 'banquet_billing',
        name: 'Banquet Billing & Receipts',
        description: 'Event billing, advance deposit collections and printable banquet folios',
        category: 'BANQUET_EVENTS',
        defaultOn: false
    },
    {
        id: 'banquet_query',
        name: 'Banquet Inquiries & Lead Query',
        description: 'Search and filter banquet leads by status, date and event type',
        category: 'BANQUET_EVENTS',
        defaultOn: false
    },
    {
        id: 'banquet_halls',
        name: 'Manage Banquet Halls & Venues',
        description: 'Configure venue capacity, amenities, daily rental charges and policies',
        category: 'BANQUET_EVENTS',
        defaultOn: false
    },

    // ── 5. PURCHASE & INVENTORY ──────────────────────────────────
    {
        id: 'procurement_inventory',
        name: 'Inventory Stock Dashboard',
        description: 'Live item stock counts, unit valuation, low-stock threshold alerts',
        category: 'PROCUREMENT_INVENTORY',
        defaultOn: true
    },
    {
        id: 'procurement_pos',
        name: 'Purchase Orders (PO) Workflow',
        description: 'Create purchase orders, approval workflows and delivery verification',
        category: 'PROCUREMENT_INVENTORY',
        defaultOn: true
    },
    {
        id: 'procurement_vendors',
        name: 'Vendors & Supplier Directory',
        description: 'Supplier directory, categories, GSTIN and contact details',
        category: 'PROCUREMENT_INVENTORY',
        defaultOn: true
    },
    {
        id: 'procurement_requests',
        name: 'Department Stock Requests',
        description: 'Kitchen and housekeeping internal requisition and issue tracking',
        category: 'PROCUREMENT_INVENTORY',
        defaultOn: true
    },
    {
        id: 'procurement_reports',
        name: 'Procurement & Consumption Reports',
        description: 'Historical vendor spending analysis and item consumption graphs',
        category: 'PROCUREMENT_INVENTORY',
        defaultOn: true
    },

    // ── 6. STAFF & HUMAN RESOURCES ───────────────────────────────
    {
        id: 'staff',
        name: 'Staff Directory & Management',
        description: 'Staff profiles, emergency contacts, shifts and roles',
        category: 'STAFF_HR',
        defaultOn: true
    },
    {
        id: 'staff_perks',
        name: 'Staff Perks, Incentives & Deductions',
        description: 'Monthly bonuses, performance incentives and payroll adjustments',
        category: 'STAFF_HR',
        defaultOn: true
    },
    {
        id: 'attendance',
        name: 'Staff Attendance & Time Clock',
        description: 'Punch in/out logging, daily shift hours and overtime calculation',
        category: 'STAFF_HR',
        defaultOn: true
    },
    {
        id: 'leaves',
        name: 'Leave Management & Approvals',
        description: 'Staff leave applications, approval workflow and annual balances',
        category: 'STAFF_HR',
        defaultOn: true
    },
    {
        id: 'payroll',
        name: 'Payroll Processing & Payslips',
        description: 'Automated salary calculation, deductions and downloadable payslips',
        category: 'STAFF_HR',
        defaultOn: true
    },

    // ── 7. AUDIT & ACCOUNTING ────────────────────────────────────
    {
        id: 'night_audit',
        name: 'Night Audit Console',
        description: 'Automated end-of-day room rate posting and financial reconciliation',
        category: 'AUDIT_FINANCE',
        defaultOn: false
    },
    {
        id: 'master_ledgers',
        name: 'Master Ledgers (Guest & City)',
        description: 'Guest ledger, city ledger, advance deposit ledger and journal vouchers',
        category: 'AUDIT_FINANCE',
        defaultOn: false
    },
    {
        id: 'audit_reports',
        name: 'Manager Flash & Financial Reports',
        description: 'Daily manager flash report, tax summary and trial balance',
        category: 'AUDIT_FINANCE',
        defaultOn: false
    },
    {
        id: 'erp_integrations',
        name: 'ERP Integrations (Tally / SAP)',
        description: 'Automated export and sync with external accounting packages',
        category: 'AUDIT_FINANCE',
        defaultOn: false
    },

    // ── 8. CHANNEL MANAGER & OTAs ────────────────────────────────
    {
        id: 'channel_manager',
        name: 'Channel Manager Central Hub',
        description: 'Synchronize room rates and availability across all online channels',
        category: 'DISTRIBUTION_CHANNELS',
        defaultOn: false
    },
    {
        id: 'ota_airbnb',
        name: 'Airbnb Two-Way Sync',
        description: 'Live calendar and booking synchronization with Airbnb listings',
        category: 'DISTRIBUTION_CHANNELS',
        defaultOn: false
    },
    {
        id: 'ota_booking',
        name: 'Booking.com Channel Link',
        description: 'Direct rate parity and instant reservation sync with Booking.com',
        category: 'DISTRIBUTION_CHANNELS',
        defaultOn: false
    },
    {
        id: 'ota_makemytrip',
        name: 'MakeMyTrip (MMT) Integration',
        description: 'Inventory and pricing sync for MakeMyTrip marketplace',
        category: 'DISTRIBUTION_CHANNELS',
        defaultOn: false
    },
    {
        id: 'ota_agoda',
        name: 'Agoda Marketplace Sync',
        description: 'Direct rate and allocation management with Agoda',
        category: 'DISTRIBUTION_CHANNELS',
        defaultOn: false
    },
    {
        id: 'ota_expedia',
        name: 'Expedia Partner Central Link',
        description: 'Full integration with Expedia Partner network',
        category: 'DISTRIBUTION_CHANNELS',
        defaultOn: false
    },

    // ── 9. MARKETING & ANALYTICS ─────────────────────────────────
    {
        id: 'marketing',
        name: 'Marketing & Promotion Campaigns',
        description: 'Broadcast SMS, email newsletters and WhatsApp promo campaigns',
        category: 'MARKETING_ANALYTICS',
        defaultOn: true
    },
    {
        id: 'analytics',
        name: 'Analytics Dashboard',
        description: 'Revenue trends, RevPAR, ADR, occupancy percentages and booking velocity',
        category: 'MARKETING_ANALYTICS',
        defaultOn: true
    },
    {
        id: 'restaurant_analysis',
        name: 'Restaurant & Dining Analytics',
        description: 'Average spend per table, dish popularity and peak dining hour trends',
        category: 'MARKETING_ANALYTICS',
        defaultOn: false
    },
    {
        id: 'loyalty_analysis',
        name: 'Guest Loyalty & Reward Metrics',
        description: 'Guest repeat visit frequency, loyalty points and retention statistics',
        category: 'MARKETING_ANALYTICS',
        defaultOn: false
    },
    {
        id: 'reports',
        name: 'Central Reports & Export Hub',
        description: 'Custom report builder and exportable financial & operational spreadsheets',
        category: 'MARKETING_ANALYTICS',
        defaultOn: true
    },
    {
        id: 'bulk_import',
        name: 'Bulk Data Import Tool',
        description: 'Import historical reservations, guests and rooms from CSV/Excel',
        category: 'MARKETING_ANALYTICS',
        defaultOn: false
    },

    // ── 10. GUEST EXPERIENCE & CONCIERGE ─────────────────────────
    {
        id: 'services',
        name: 'Guest Services & Concierge Dispatch',
        description: 'Manage guest requests for extra pillows, luggage, wake-up calls and spa',
        category: 'GUEST_EXPERIENCE',
        defaultOn: true
    },
    {
        id: 'support',
        name: 'Support Tickets & Helpdesk',
        description: 'Guest and staff inquiry tickets with status resolution tracking',
        category: 'GUEST_EXPERIENCE',
        defaultOn: true
    },
    {
        id: 'messages',
        name: 'Internal Staff & Guest Chat',
        description: 'Instant communication messaging between departments and guests',
        category: 'GUEST_EXPERIENCE',
        defaultOn: true
    },

    // ── 11. INFRASTRUCTURE & SETTINGS ────────────────────────────
    {
        id: 'infrastructure',
        name: 'IoT & Network Hardware Health',
        description: 'Monitor hotel Wi-Fi access points, POS terminals and hardware nodes',
        category: 'INFRASTRUCTURE_SETTINGS',
        defaultOn: false
    },
    {
        id: 'settings',
        name: 'Property Settings & Policies',
        description: 'Hotel taxes, check-in/out policies, bank account and invoice headers',
        category: 'INFRASTRUCTURE_SETTINGS',
        defaultOn: true
    }
]

/**
 * Feature Presets for quick assignment by Super Admin
 */
export interface FeaturePreset {
    id: string
    name: string
    description: string
    features: string[]
}

export const FEATURE_PRESETS: FeaturePreset[] = [
    {
        id: 'ALL_ACCESS',
        name: 'Enterprise Full Access (100% Unlocked)',
        description: 'Enables every single module, banquet, OTA distribution, audit and POS feature',
        features: MASTER_FEATURES.map(f => f.id)
    },
    {
        id: 'STANDARD_HOTEL',
        name: 'Full-Service Hotel & Dining',
        description: 'Core PMS, Rooms, Housekeeping, POS Dining, Staff, Payroll and Marketing',
        features: [
            'bookings', 'checkin', 'approvals', 'guests', 'lost_found',
            'rooms', 'occupancy', 'housekeeping', 'maintenance', 'content_amenities',
            'pos_orders', 'pos_floor_plan', 'content_menu', 'pos_transactions', 'room_service',
            'procurement_inventory', 'procurement_pos', 'procurement_vendors', 'procurement_requests',
            'staff', 'staff_perks', 'attendance', 'leaves', 'payroll',
            'marketing', 'analytics', 'reports', 'services', 'support', 'settings'
        ]
    },
    {
        id: 'RESORT_BANQUET',
        name: 'Luxury Resort & Banquet Specialist',
        description: 'Includes all banquet modules, event billing, dining POS, spa and guest services',
        features: [
            'bookings', 'checkin', 'guests', 'rooms', 'occupancy', 'housekeeping', 'content_amenities',
            'pos_orders', 'pos_floor_plan', 'content_menu', 'pos_transactions', 'room_service',
            'banquet_calendar', 'banquet_new', 'banquet_billing', 'banquet_query', 'banquet_halls',
            'procurement_inventory', 'procurement_vendors', 'procurement_reports',
            'staff', 'attendance', 'leaves', 'payroll',
            'marketing', 'analytics', 'restaurant_analysis', 'reports',
            'services', 'support', 'settings'
        ]
    },
    {
        id: 'BOUTIQUE_ESSENTIALS',
        name: 'Boutique & B&B Essentials',
        description: 'Lightweight setup for small independent properties focusing on bookings & front desk',
        features: [
            'bookings', 'checkin', 'guests', 'rooms', 'occupancy', 'housekeeping', 'maintenance',
            'content_amenities', 'staff', 'attendance', 'reports', 'services', 'support', 'settings'
        ]
    }
]

export const LEGACY_FEATURE_MAP: Record<string, string[]> = {
    BASIC_OPS: [
        'dashboard', 'bookings', 'checkin', 'approvals', 'guests', 'rooms',
        'occupancy', 'housekeeping', 'maintenance', 'lost_found', 'content_amenities',
        'services', 'support', 'messages', 'settings'
    ],
    STAFF_MANAGEMENT: [
        'staff', 'staff_perks', 'attendance', 'leaves', 'payroll'
    ],
    ADVANCED_ANALYTICS: [
        'analytics', 'reports', 'restaurant_analysis', 'loyalty_analysis'
    ],
    ANALYTICS: [
        'analytics', 'reports'
    ],
    RESTAURANT: [
        'pos_orders', 'pos_floor_plan', 'content_menu', 'pos_transactions', 'room_service', 'restaurant_analysis'
    ],
    FB_SPA: [
        'pos_orders', 'pos_floor_plan', 'content_menu', 'pos_transactions', 'room_service', 'services'
    ],
    INFRASTRUCTURE: [
        'infrastructure'
    ],
    LOYALTY: [
        'loyalty_analysis'
    ],
    DIGITAL_CHECKIN: [
        'checkin', 'bookings', 'guests'
    ],
    FRONT_DESK: [
        'checkin', 'bookings', 'guests', 'approvals'
    ],
    HOUSEKEEPING_DISPATCH: [
        'housekeeping', 'maintenance', 'occupancy'
    ],
    MARKETING: [
        'marketing', 'bulk_import'
    ],
    MULTI_PROPERTY: [
        'properties'
    ]
}

/**
 * Normalizes any property's feature list.
 * Converts legacy tags (like BASIC_OPS, STAFF_MANAGEMENT) to modern granular IDs.
 * If empty or null, falls back to default on features or all features for ENTERPRISE.
 */
export function normalizePropertyFeatures(features?: string[] | null, plan?: string): string[] {
    if (plan?.toUpperCase() === 'ENTERPRISE') {
        return MASTER_FEATURES.map(f => f.id)
    }

    if (!features || features.length === 0) {
        return MASTER_FEATURES.filter(f => f.defaultOn).map(f => f.id)
    }

    const normalized = new Set<string>()
    for (const f of features) {
        if (LEGACY_FEATURE_MAP[f]) {
            for (const mapped of LEGACY_FEATURE_MAP[f]) {
                normalized.add(mapped)
            }
        } else {
            normalized.add(f)
        }
    }

    // Core dashboard is always on for any valid hotel tenant
    normalized.add('dashboard')

    return Array.from(normalized)
}

/**
 * Check if a feature is enabled for a given property's features array.
 * Automatically handles legacy tags, dashboard immunity, and fallbacks.
 */
export function isFeatureActiveForProperty(propertyFeatures: string[] | undefined | null, featureId: string, plan?: string): boolean {
    if (featureId === 'dashboard') return true
    const active = normalizePropertyFeatures(propertyFeatures, plan)
    return active.includes(featureId)
}

