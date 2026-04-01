# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Plastmassa CRM — full-stack CRM for a plastic manufacturing company. Manages customers, orders, payments, inventory (materials + finished products), production tracking, attendance, payroll, and financial reporting. Role-based access for admins, managers, operators, warehouse staff, and accountants.

## Tech Stack

- **Backend:** NestJS, TypeScript, Mongoose (MongoDB ODM), Passport + JWT
- **Frontend:** React 18, TypeScript, Vite, React Router v6, React Query (TanStack Query), Zustand, Tailwind CSS + shadcn/ui
- **Database:** MongoDB (`plastmassa_crm`)
- **Shared:** `@plastmassa/shared` — TypeScript types and constants consumed by both apps
- **Monorepo:** npm workspaces
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
npm run build            # Build all (shared → backend → frontend)
npm run build:shared     # Build shared package only
npm run build:api        # Build backend only
npm run build:web        # Build frontend only

# Database
npm run seed             # Seed default admin user and roles
npm run migrate:fifo     # Run FIFO migration script

# Production
npm run start:prod       # Start via PM2
npm run stop:prod        # Stop PM2 processes
npm run restart:prod     # Restart PM2 processes
npm run logs             # View PM2 logs
```

**No test or lint setup exists.** TypeScript strict mode is the only code quality check.

## Ports

| Service  | Port | Notes |
|----------|------|-------|
| Backend  | 6000 | `PORT` env var, fallback 6000 |
| Frontend | 6001 | Vite dev server |

Frontend proxies `/api` → `http://localhost:6000` in development.

## Monorepo Structure

```
CRM/
├── apps/
│   ├── backend/           # NestJS API server
│   │   └── src/modules/   # All feature modules (see below)
│   └── frontend/          # React + Vite SPA
│       └── src/
│           ├── api/       # Axios API call functions
│           ├── components/# Reusable UI components
│           ├── hooks/     # React Query hooks (use-*.ts)
│           ├── pages/     # Route pages
│           └── stores/    # Zustand stores
├── packages/
│   └── shared/            # @plastmassa/shared types + constants
└── ecosystem.config.js    # PM2 config
```

## Coding Conventions

### General
- TypeScript strict mode everywhere. No `any`, no `@ts-ignore`.
- All shared types in `@plastmassa/shared`. Never redefine locally.
- Named exports only. No default exports.

### Backend (NestJS)
- Throw NestJS exceptions (`BadRequestException`, `NotFoundException`, etc.) — no manual try-catch for request handling.
- DTOs with `class-validator` decorators for all request validation.
- Services = business logic. Controllers = thin HTTP layer.
- All responses use `ApiResponse<T>`, paginated endpoints use `PaginatedResponse<T>` (both from shared).
- Permission checking: `@Permissions('permission.name')` decorator + `PermissionsGuard`.

### Frontend (React)
- React Query for all server state. Zustand only for client UI state (sidebar, modals, filters).
- Tailwind CSS utility classes only. No inline styles, no CSS modules.
- **API pattern:** `src/api/foo.ts` exports an object with API functions → `src/hooks/use-foo.ts` wraps them in `useQuery`/`useMutation`.
- **Permission checking:** `usePermissions()` hook returns `can(permission)` and `canAny(...permissions)`.

### Design System
- Dark-first theme. Primary color: indigo (`indigo-500`/`indigo-600`).
- Glassmorphism: translucent backgrounds, `backdrop-blur-2xl`, subtle borders, `rounded-xl`/`2xl`.
- Gradient text (indigo → purple) for headings.
- Sidebar: fixed left, 72px collapsed / 288px expanded, framer-motion transitions.

## Business Rules

### Prices and Currency
- Currency: UZS (Uzbek so'm). No subunits. All prices are whole numbers (`number` type).
- Display with space-separated thousands: `1 250 000 UZS`.

### Inventory and Stock
- Stock quantities always in `baseUnit`. Conversions to sales units at application layer.
- Material cost: AVCO (Average Cost) method in `MaterialLotsService`.
- FIFO for material and product lot consumption.
- All stock changes recorded via `StockMovement` documents (audit trail).

### Debt Management
- `Customer.currentDebt` is denormalized — only modified by `OrdersService` and `PaymentsService`.
- Debt limit enforced at order creation (`paymentType: 'DEBT'` rejected if it exceeds `debtLimit`).

### Order Snapshot Pattern
- `OrderItem` stores snapshots of `productName`, `unitName`, `price` at creation time.
- Snapshot fields are source of truth for display and financial calculations, not the referenced documents.

### Production Flow
- `ProductionLog` → FIFO material consumption → product stock increase → `ProductLot` created.
- Auto-calculates `pieceRateAmount` from `Product.pieceRate`.

### Payroll
- Dual salary types: `FIXED` and `PIECE_RATE` (on `User.salaryType`).
- Balance carry-over: `previousBalance`/`remainingBalance` fields, `paidAmount` tracking.

## Authentication and Authorization

### Auth Flow
- **OTP Login (primary):** Phone → `POST /api/auth/send-otp` → Telegram bot sends 6-digit OTP → `POST /api/auth/verify-otp` → JWT tokens.
- **Password Login (admin fallback):** `POST /api/auth/login` with username/password.
- **Tokens:** Access token (1 day), refresh token (7 days). Payload includes `permissions[]` and `roleName`.
- Frontend: Axios interceptor adds Bearer token; 401 clears auth state and redirects to login.

### Dynamic Roles (DB-based)
- Roles stored in MongoDB `Role` collection with `name`, `description`, `permissions[]`, `isSystem`.
- `User.role` is an ObjectId reference to Role.
- Default seeded roles: Boshliq (Admin — all permissions), Boshqaruvchi (Manager), Kassir (Cashier), Omborchi (Warehouseman).
- Permissions defined as granular strings in `@plastmassa/shared` `PERMISSIONS` constant (e.g., `orders.create`, `stock.view`).
- Managed via `/roles` page in frontend and `/api/roles` endpoint.
