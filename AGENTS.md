# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

Plastmassa CRM — full-stack CRM for a plastic manufacturing company. Manages customers, orders, payments, returns, inventory (finished products), production tracking, attendance, payroll, and financial reporting. Dynamic role-based access control with DB-stored roles and granular permissions.

## Tech Stack

- **Backend:** NestJS, TypeScript, Mongoose (MongoDB ODM), Passport + JWT
- **Frontend:** React 18, TypeScript, Vite, React Router v6, React Query (TanStack Query), Zustand, Tailwind CSS + shadcn/ui
- **Database:** MongoDB (`plastmassa_crm`)
- **Shared:** `@plastmassa/shared` — TypeScript types and constants consumed by both apps
- **Monorepo:** npm workspaces (`packages/*`, `apps/*`)
- **Production:** PM2 (via `ecosystem.config.js`)

## Commands

```bash
# Install
npm install

# Development (from project root)
npm run dev              # Start both backend and frontend
npm run dev:api          # Backend only (NestJS, port 6000)
npm run dev:web          # Frontend only (Vite, port 6001)

# Build (must build shared first)
npm run build            # Build all (shared -> backend -> frontend)
npm run build:shared     # Build shared package only
npm run build:api        # Build backend only
npm run build:web        # Build frontend only

# Database
npm run seed             # Seed default admin user and roles
npm run migrate:fifo     # Run FIFO migration script
```

**No test or lint setup exists.** TypeScript strict mode is the only code quality check. Run `npm run build` to verify after backend changes.

## Ports

| Service  | Port | Notes |
|----------|------|-------|
| Backend  | 6000 | `PORT` env var, fallback 6000 |
| Frontend | 6001 | Vite dev server |

Frontend proxies `/api` -> `http://localhost:6000` in development.

## Environment Variables

See `.env.example`. Key variables:
- `MONGODB_URI` — MongoDB connection string
- `JWT_SECRET`, `JWT_REFRESH_SECRET` — Token signing
- `TELEGRAM_BOT_TOKEN` — OTP delivery via Telegram
- `ADMIN_USERNAME`, `ADMIN_PASSWORD` — Seed admin credentials
- `CORS_ORIGINS` — Production only, comma-separated domains

## Monorepo Structure

```
CRM/
├── apps/
│   ├── backend/           # NestJS API server
│   │   └── src/
│   │       ├── modules/   # Feature modules
│   │       └── common/    # Guards, decorators, filters, interceptors
│   └── frontend/          # React + Vite SPA
│       └── src/
│           ├── api/       # Axios API call functions
│           ├── components/# UI components (shared/ for reusables)
│           ├── hooks/     # React Query hooks (use-*.ts)
│           ├── pages/     # Route pages
│           └── stores/    # Zustand stores
├── packages/
│   └── shared/            # @plastmassa/shared types + constants
└── ecosystem.config.js    # PM2 config
```

## Backend Architecture

### Module List
Auth, Users, Roles, Units, Customers, Customer-Prices, Products, Product-Lots, Stock, Orders, Payments, Returns, Production, Attendance, Payroll, Expenses, Finance, Reports, Dashboard, Settings, Telegram.

### Common Utilities (`src/common/`)
- **Decorators:** `@CurrentUser()` (extract user from request), `@Permissions('perm.name')` (set required permissions), `@Roles('role')`
- **Guards:** `PermissionsGuard` (checks user permissions via reflector, ANY match grants access), `RolesGuard`
- **Filters:** `HttpExceptionFilter` (global — wraps errors in `{success: false, message, statusCode}`)
- **Interceptors:** `ResponseTransformInterceptor` (wraps all responses in `{success: true, data}`)

### Conventions
- Throw NestJS exceptions (`BadRequestException`, `NotFoundException`, etc.) — no manual try-catch for request handling.
- DTOs with `class-validator` decorators for all request validation.
- Services = business logic. Controllers = thin HTTP layer.
- All responses use `ApiResponse<T>`, paginated endpoints use `PaginatedResponse<T>` (both from shared).
- Permission checking: `@Permissions('permission.name')` decorator + `PermissionsGuard`.

## Frontend Architecture

### Conventions
- React Query for all server state. Zustand only for client UI state (sidebar, modals, filters).
- Tailwind CSS utility classes only. No inline styles, no CSS modules.
- **API pattern:** `src/api/foo.ts` exports an object with API functions -> `src/hooks/use-foo.ts` wraps them in `useQuery`/`useMutation`.
- **Permission checking:** `usePermissions()` hook returns `can(permission)` and `canAny(...permissions)`. `<PermissionGate>` component for conditional rendering.

### Design System
- HSL color variables defined in `index.css` (light and dark mode).
- Glassmorphism: translucent backgrounds (`bg-card/80`), `backdrop-blur-xl`/`backdrop-blur-2xl`, subtle borders, `rounded-xl`/`2xl`.
- Sidebar: fixed left, 72px collapsed / 288px expanded, framer-motion transitions.

### Shared Components (`src/components/shared/`)
`PageHeader`, `StatCard`, `FormField`, `EmptyState`, `ConfirmDialog`, `DataTable` (TanStack React Table), `PermissionGate`, `LoadingSpinner`, `PageLoader`.

## Shared Package (`@plastmassa/shared`)

- **Types:** All entity interfaces (`User`, `Customer`, `Product`, `Order`, `Payment`, `Return`, `ProductionLog`, `Payroll`, etc.), DTOs, response wrappers (`ApiResponse<T>`, `PaginatedResponse<T>`, `PaginationQuery`), report types.
- **Constants:** `PERMISSIONS` (granular by feature), `ALL_PERMISSIONS` (flat array), `DEFAULT_ROLES` (7 seeded roles with Uzbek names), `SALARY_TYPES`, `ORDER_STATUSES`, `PAYMENT_TYPES`, `CURRENCY`.

All shared types must be defined here. Never redefine locally. Named exports only — no default exports.

## Business Rules

### Prices and Currency
- Currency: UZS (Uzbek so'm). No subunits. All prices are whole numbers (`number` type).
- Display with space-separated thousands: `1 250 000 UZS`.
- Customer-specific pricing via `CustomerPrice` module (overrides default `Product.price` per customer).

### Inventory and Stock
- Stock quantities always in `baseUnit`. Conversions to sales units at application layer.
- FIFO for product lot consumption.
- All stock changes recorded via `StockMovement` documents (audit trail).
- `Product.costPrice` = tannarx (manufacturing cost), `Product.price` = sotuv narxi (sales price).

### Debt Management
- `Customer.currentDebt` is denormalized — only modified by `OrdersService` and `PaymentsService`.
- Debt limit enforced at order creation (`paymentType: 'DEBT'` rejected if it exceeds `debtLimit`).

### Order Snapshot Pattern
- `OrderItem` stores snapshots of `productName`, `unitName`, `price` at creation time.
- Snapshot fields are source of truth for display and financial calculations, not the referenced documents.
- Order statuses: `PENDING` -> `CONFIRMED` -> `CANCELLED` only (no DELIVERED status).

### Returns
- Returns restore stock (IN movements) and reduce customer debt for DEBT orders.
- Approval workflow: created -> approved via `PATCH /returns/:id/approve`.

### Production Flow
- `ProductionLog` references Product directly -> product stock increase -> `ProductLot` created.
- Auto-calculates `pieceRateAmount` from `Product.pieceRate`.
- No material consumption tracking (materials module was removed).

### Payroll
- Dual salary types: `FIXED` and `PIECE_RATE` (on `User.salaryType`).
- Balance carry-over: `previousBalance`/`remainingBalance` fields, `paidAmount` tracking.

## Authentication and Authorization

### Auth Flow
- **OTP Login (primary):** Phone -> `POST /api/auth/send-otp` -> Telegram bot sends 6-digit OTP -> `POST /api/auth/verify-otp` -> JWT tokens.
- **Password Login (admin fallback):** `POST /api/auth/login` with username/password.
- **Tokens:** Access token (1 day), refresh token (7 days). Payload includes `permissions[]` and `roleName`.
- Frontend: Axios interceptor adds Bearer token; 401 clears auth state and redirects to login.

### Dynamic Roles (DB-based)
- Roles stored in MongoDB `Role` collection with `name`, `description`, `permissions[]`, `isSystem`.
- `User.role` is an ObjectId reference to Role.
- 7 default seeded roles: Direktor, Sotuv menejeri, Kassir, Omborchi, Ishlab chiqarish boshlig'i, Hisobchi, Operator.
- Permissions defined as granular strings in `@plastmassa/shared` `PERMISSIONS` constant (e.g., `orders.create`, `stock.view`).
- Permission categories: USERS, CUSTOMERS, PRODUCTS, ORDERS, STOCK, PRODUCTION, ATTENDANCE, PAYROLL, FINANCE, RETURNS, REPORTS, SETTINGS.
