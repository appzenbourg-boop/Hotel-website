# Zenbourg Hotel Management System

**Complete Admin & Staff Management Platform for Hotels**

A modern, full-stack hotel management system built with Next.js 14, TypeScript, Tailwind CSS, and Prisma. Designed to replace fragmented PMS tools with one centralized operations platform.

---

## 🎯 Overview

Zenbourg is a single-hotel, all-in-one operations platform that handles:
- **Guest Management** - Online check-in, bookings, profiles
- **Room Inventory** - Real-time availability, pricing, status tracking
- **Staff Management** - RBAC, attendance, performance tracking
- **Service Requests** - SLA-based task management with timers
- **Payroll & Incentives** - Automated calculations based on performance
- **Reports & Analytics** - Occupancy, revenue, staff metrics
- **Content Management** - Hotel info, amenities, menus, policies

---

## ✨ Key Features

### 🔐 Role-Based Access Control (RBAC)
- **Super Admin** - Full system access, financial control
- **Hotel Admin** - Operational control (no bank account access)
- **Staff** - Task-focused mobile interface (separate app)
- **Guest** - Self-service web portal

### 📊 Admin Dashboard
- Real-time occupancy tracking
- Today's check-ins/check-outs
- Pending housekeeping & services
- SLA breach alerts
- On-duty staff overview
- Revenue metrics

### 👥 Guest Management
- Complete guest profiles with ID verification
- Booking history & service orders
- Online check-in system (SMS/WhatsApp)
- Payment tracking
- Rating & feedback

### 🏨 Room Management
- Multiple room categories (Standard, Deluxe, Suite, Penthouse)
- Real-time status (Available, Occupied, Maintenance, Cleaning)
- Amenities configuration
- Dynamic pricing

### 📅 Calendar & Bookings
- Visual calendar with drag-drop (planned)
- Multiple booking channels (Direct, OTA, Walk-in)
- Channel manager integration (planned)
- Automated check-in/check-out

### 🔔 Service & Order Management
- **Types**: Housekeeping, Food, Laundry, Maintenance, Spa
- SLA timer tracking with breach alerts
- Auto/manual staff assignment
- Real-time status updates
- Guest ratings for services

### 👨‍💼 Staff Management
- Complete employee profiles
- Department-wise organization
- Shift scheduling
- Performance scorecards

### ⏰ Attendance System
- Punch in/out with location tracking
- Late/absent flagging
- Overtime calculation
- Leave management

### 💰 Payroll & Incentives
- Base salary + overtime + incentives
- Performance-based bonuses
- Automated monthly calculations
- Salary slip generation

### 📈 Reports & Analytics
- Occupancy trends
- Revenue breakdowns
- Staff performance metrics
- SLA compliance reports
- Guest satisfaction scores

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Custom component library
- **Icons**: Lucide React
- **Charts**: Recharts
- **Notifications**: Sonner
- **Forms**: React Hook Form + Zod
- **State**: Zustand

### Backend
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: NextAuth.js
- **API**: Next.js API Routes
- **Password Hashing**: bcryptjs

### Deployment
- **Platform**: Vercel (recommended)
- **Database**: Vercel Postgres / Supabase / Railway

---

## 📂 Project Structure

```
zenbourg-admin/
├── app/
│   ├── admin/
│   │   ├── dashboard/       # Admin dashboard
│   │   ├── bookings/        # Booking management
│   │   ├── guests/          # Guest management
│   │   ├── rooms/           # Room inventory
│   │   ├── services/        # Service requests
│   │   ├── staff/           # Staff management
│   │   ├── attendance/      # Attendance tracking
│   │   ├── payroll/         # Payroll & incentives
│   │   ├── reports/         # Analytics
│   │   ├── content/         # Hotel content
│   │   ├── settings/        # System settings
│   │   ├── login/           # Admin login
│   │   └── layout.tsx       # Admin layout wrapper
│   ├── guest/
│   │   ├── check-in/        # Online check-in flow
│   │   ├── dashboard/       # Guest portal
│   │   ├── service-request/ # Request services
│   │   └── feedback/        # Ratings & feedback
│   ├── api/                 # API routes
│   ├── globals.css          # Global styles
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Home redirect
├── components/
│   ├── ui/                  # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   ├── Table.tsx
│   │   ├── Modal.tsx
│   │   ├── Badge.tsx
│   │   ├── Select.tsx
│   │   └── Textarea.tsx
│   ├── common/              # Common components
│   │   ├── Avatar.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── SearchInput.tsx
│   │   └── Loading.tsx
│   └── admin/               # Admin-specific components
│       ├── Sidebar.tsx
│       └── Header.tsx
├── lib/
│   ├── utils.ts             # Utility functions
│   ├── db.ts                # Database client
│   └── auth/                # Auth helpers
├── types/
│   └── index.ts             # TypeScript types
├── prisma/
│   └── schema.prisma        # Database schema
├── public/                  # Static assets
├── .env.example             # Environment template
├── tailwind.config.ts       # Tailwind configuration
├── tsconfig.json            # TypeScript config
├── package.json             # Dependencies
└── README.md                # This file
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database (local or cloud)
- Git

### 1. Clone & Navigate
```bash
cd zenbourg-admin
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Create a `.env` file in the root:
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/zenbourg"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-generate-with-openssl"

# Optional: SMS/WhatsApp
TWILIO_ACCOUNT_SID=""
TWILIO_AUTH_TOKEN=""
TWILIO_PHONE_NUMBER=""
```

### 4. Setup Database
```bash
# Generate Prisma Client
npm run prisma:generate

# Push schema to database
npm run prisma:push

# (Optional) Open Prisma Studio to view data
npm run prisma:studio
```

### 5. Seed Initial Data (Optional)
Create a seed script to add:
- Super Admin user
- Sample hotel property
- Sample rooms
- Sample staff

### 6. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Default Login Credentials

After seeding, use:
```
Email: admin@zenbourg.com
Password: admin123
```

**⚠️ Change these credentials immediately in production!**

---

## 📱 Application URLs

- **Admin Panel**: `http://localhost:3000/admin`
- **Guest Portal**: `http://localhost:3000/guest`
- **Admin Login**: `http://localhost:3000/admin/login`
- **Guest Check-in**: `http://localhost:3000/guest/check-in?token={token}`

---

## 🎨 Design System

### Colors
- **Background**: `#0A0E1A` (Deep navy)
- **Surface**: `#141824`
- **Border**: `#2A3142`
- **Primary**: `#3B82F6` (Blue)
- **Success**: `#10B981` (Green)
- **Warning**: `#F59E0B` (Amber)
- **Danger**: `#EF4444` (Red)

### Typography
- **Font**: Inter (system fallback)
- **Base Size**: 14px
- **Headings**: 20-32px

### Components
All components follow a consistent dark theme with:
- 8px border radius
- Subtle shadows
- Smooth transitions
- Focus states with primary ring

---

## 📋 Module Status

### ✅ Completed
- [x] Project setup & configuration
- [x] Database schema (Prisma)
- [x] UI component library
- [x] Admin layout (Sidebar + Header)
- [x] Admin login page
- [x] Admin dashboard with widgets
- [x] Utility functions & types

### 🚧 In Progress / To Implement
- [ ] Authentication (NextAuth integration)
- [ ] Guest management CRUD
- [ ] Booking management & calendar
- [ ] Room inventory management
- [ ] Service request management
- [ ] Staff management
- [ ] Attendance system
- [ ] Payroll calculations
- [ ] Reports & analytics
- [ ] Hotel content management
- [ ] Settings module
- [ ] Guest portal
- [ ] API routes with RBAC middleware
- [ ] File upload (ID documents, images)
- [ ] SMS/WhatsApp integration
- [ ] Email notifications

---

## 🔐 Security Considerations

- **Password Hashing**: bcryptjs for secure password storage
- **RBAC**: Middleware-enforced role checks on all routes
- **Input Validation**: Zod schemas for all forms
- **SQL Injection**: Prisma ORM prevents injection attacks
- **XSS Protection**: React's built-in sanitization
- **CSRF Tokens**: NextAuth provides CSRF protection
- **Environment Variables**: Never commit `.env` files
- **Sensitive Data**: Aadhaar/ID masking in UI

---

## 🧪 Testing

```bash
# Run tests (setup required)
npm test

# Run E2E tests
npm run test:e2e

# Type checking
npm run type-check

# Linting
npm run lint
```

---

## 🚀 Deployment

### Vercel (Recommended)
1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy!

### Manual Deployment
```bash
# Build for production
npm run build

# Start production server
npm start
```

---

## 📖 API Documentation

### Authentication
```typescript
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/session
```

### Guests
```typescript
GET    /api/guests
POST   /api/guests
GET    /api/guests/:id
PUT    /api/guests/:id
DELETE /api/guests/:id
```

### Bookings
```typescript
GET    /api/bookings
POST   /api/bookings
GET    /api/bookings/:id
PUT    /api/bookings/:id
DELETE /api/bookings/:id
```

### Service Requests
```typescript
GET    /api/services
POST   /api/services
GET    /api/services/:id
PUT    /api/services/:id
PATCH  /api/services/:id/status
```

### Staff
```typescript
GET    /api/staff
POST   /api/staff
GET    /api/staff/:id
PUT    /api/staff/:id
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is proprietary software. All rights reserved.

---

## 📞 Support

For support, email support@zenbourg.com or open an issue in the repository.

---

## 🎯 Roadmap

### Phase 1 (MVP)
- ✅ Core admin dashboard
- ⏳ Complete CRUD operations
- ⏳ Authentication system
- ⏳ Basic reporting

### Phase 2
- ⏳ Calendar with drag-drop
- ⏳ SMS/WhatsApp integration
- ⏳ Advanced analytics
- ⏳ Mobile staff app

### Phase 3
- ⏳ Channel manager integration
- ⏳ Payment gateway
- ⏳ Multi-language support
- ⏳ Advanced reporting

### Phase 4
- ⏳ AI-powered insights
- ⏳ Multi-property support
- ⏳ Mobile apps (iOS/Android)
- ⏳ Third-party integrations

---

## 📚 Documentation

- [System Architecture](./docs/ARCHITECTURE.md)
- [Database Schema](./docs/DATABASE.md)
- [API Reference](./docs/API.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)
- [User Manual](./docs/USER_MANUAL.md)

---

**Built with ❤️ for hotel operations teams worldwide.**
