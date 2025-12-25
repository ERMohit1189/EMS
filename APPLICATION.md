# Enterprise Operations Management System (EOMS) — Application Overview 📋

**Purpose:** Enterprise Operations Management System (EOMS) is an integrated Vendor & Payroll management system. It supports vendor registration and management (sites, rates, invoices, POs), purchase orders and invoice generation, vendor portals (signup/login/profile), site attendance and payroll features (employee attendance, salary structures), admin workflows (approvals, reports), Excel import/export tools, and a REST API backend.

**Design and Developed by**: Quantum AI Innovation

**Branding**
- **Full name:** Enterprise Operations Management System (EOMS)
- **Short name:** EOMS
- **Tagline:** Simplify vendor operations, payroll, and procurement
- **Logo / assets:** Add logo files to `client/public/assets/logo.png` or `docs/assets/logo.png` (placeholder). Include SVG for scalability.

---

## Quick start 🔧
- Development:
  - Start backend: `npm run dev` (runs `server/index.ts`)
  - Start client dev server: `npm run dev:client` (Vite dev)
- Build for production: `npm run build`
- Production start: `npm start` or use PM2 scripts (`npm run pm2:start`, etc.)

> Tip: See `package.json` for full scripts and dependencies.

---

## Top-level files & purpose

- `package.json` — project metadata, scripts, and dependencies.
- `README.md` / docs files (`QUICK_START.md`, `LOCAL_DEVELOPMENT_GUIDE.md`, etc.) — developer and operational guides.
- `main.py` / auxiliary scripts — miscellaneous utilities and scripts used in the repo.
- `*.sql` (many at repo root) — raw SQL migration and utility scripts used for DB fixes and schema changes (e.g., `add_vendor_rates.sql`, `FIX_VENDOR_1107.sql`).
- `server/` — Express-based backend and API implementation.
- `client/` — React + Vite frontend (TypeScript + Tailwind), UI pages and components.
- `drizzle.config.ts` & `server/migrations/` — database migration and schema management (Drizzle ORM).

---

## `server/` — Backend (Express + Drizzle) 🔁
Key files and their responsibilities:

- `server/index.ts` — app bootstrap: Express app setup, middleware, Vite integration (dev), static serving (production), route registration, error handler.
- `server/routes.ts` — Main API routes. Implements endpoints for:
  - Authentication: `/api/auth/*`, admin init, session
  - Vendors: CRUD, login/signup, forgot/change password, generate password, usage stats
  - Sites: CRUD, bulk updates, export endpoints, site status recalculation
  - Purchase Orders (`/api/purchase-orders`) and POs by vendor
  - Invoices (`/api/invoices`) and invoice-PO link routes
  - Payment masters (`/api/payment-masters`)
  - Zones, Circles, Export Headers
  - Employees, Salary Structures, Attendance, Allowances, Teams and App settings
  - Reporting endpoints (e.g. `/api/salary-report`) and many admin workflows

- `server/db.ts` — Drizzle DB initialization and helpers.
- `server/storage.ts` — Data access layer (DrizzleStorage): typed methods to read/write domain entities (vendors, sites, invoices, purchase orders, export headers, etc.).
- `server/error-handler.ts` — centralized error handling middleware.
- `server/auth-middleware.ts` — session & permission checks for protected routes.
- `server/logger.ts` — logging utilities.
- `server/static.ts` & `server/vite.ts` — static file serving for production and Vite dev middleware setup.
- `server/migrations/` — SQL files to run schema changes (add columns, indexes, performance fixes). Look for files like `20251214_add_state_to_sites.sql`.
- `server/api/` — modularized route handlers for specific features (e.g., `employee/salary-slip.ts`).
- `server/ai-route.ts` — experimental AI-related route (if the AI features are enabled).

Notes:
- Routes are well-documented inline; the HTTP interface covers most domain features (vendors, sites, POs, invoices, payments, zones, attendance, allowances, teams, app settings, admins).

---

## `client/` — Frontend (React + Vite) 🎨
Structure & main files:

- `client/src/main.tsx` — client bootstrap, theme, query client, and router mounting.
- `client/src/App.tsx` — application routing and layout wrapper.
- `client/src/index.css` — main styles (Tailwind + custom CSS).
- `client/src/config/api.config.ts` — API base path and client-side config.

Pages (not exhaustive; key vendor-related pages):
- `client/src/pages/vendor/VendorRegistration.tsx` — vendor signup / registration UI.
- `client/src/pages/vendor/VendorLogin.tsx` — vendor login UI.
- `client/src/pages/vendor/VendorProfile.tsx` — vendor profile view and edit.
- `client/src/pages/vendor/VendorRates.tsx` — manage vendor rates and rate types.
- `client/src/pages/vendor/POGeneration.tsx` — purchase order creation UI; PO print and export pages (`POPrint.tsx`).
- `client/src/pages/vendor/InvoiceGeneration.tsx` — invoice creation and linking to POs.
- `client/src/pages/vendor/VendorPOReport.tsx`, `VendorInvoiceReport.tsx`, `VendorSiteReport.tsx` — reporting UIs.
- `client/src/pages/vendor/SiteManagement.tsx`, `SiteRegistration.tsx`, `SiteList.tsx` — site CRUD and lists.

Employee & Payroll pages:
- `client/src/pages/employee/*` — employee registration, attendance, salary structures, monthly reports.
- Admin pages under `client/src/pages/admin/*` — approvals, salary generation, leave allotment, teams, holiday master.

Components & UI primitives:
- `client/src/components/layout/` — `Header`, `Layout`, `Sidebar`, `NavMenu`, `Navigation`.
- `client/src/components/ui/` — many small UI primitives (Buttons, Tables, Inputs, Modal/Dialog, Toaster, Spinner, etc.) built using Radix UI + Tailwind.
- `client/src/components/*` — cross-cutting components: `PWAInstallPrompt`, `Tour`, `VoiceCommand`, `SmartSearchTextbox`, `PerformanceMonitor`, `PageLoader`, `QuickGuide`.

Lib & hooks:
- `client/src/lib/api.ts` — API wrapper functions used across the app.
- `client/src/lib/queryClient.ts` — TanStack Query setup.
- `client/src/lib/utils.ts`, `fetchWithLoader.ts`, `exportUtils.ts` — helpers for network and exports.
- `client/src/hooks/*` — custom hooks: `usePageLoader`, `useLoadingState`, `use-toast`, `use-mobile`.

Data import/export & Excel:
- `client/src/pages/vendor/ExcelImport.tsx` — Excel import UI (using ExcelJS / xlsx); example backups exist.
- `client/src/pages/vendor/ExportHeaders.tsx` — set and manage export headers used in CSV/Excel exports.

---

## Scripts & Tools 🛠️
- `scripts/` and root-level scripts (e.g., `import-excel`) — utility scripts for import/export and measurements.
- `run-migration.*` — migration utilities to run DB scripts.
- SQL files in repo root (many `add_*.sql`, `FIX_*.sql`) are often used for schema fixes and performance improvements.

---

## Database & Schema 💾
- Uses Drizzle ORM (`drizzle.config.ts`) and SQL migration files in `server/migrations`.
- Many domain tables (vendors, sites, purchase_orders, invoices, payment_masters, allowances, attendance, salary_structures, employees, teams, zones, export_headers, app_settings) are manipulated by `server/storage.ts` and DB queries in route handlers.

---

## Features & Capabilities ✅
- Vendor onboarding: register, login, profile management, change/forgot password.
- Vendor financials: manage rates, generate POs, create invoices, payment master management.
- Site management: register and manage sites, bulk updates, status recalculation, exports by date range.
- Attendance & Payroll: employee attendance capture, allowance approvals, salary generation and reports.
- Admin workflows: approvals, teams, role-based operations, reports.
- Import/Export: Excel imports, configurable export headers, CSV/Excel generation for reporting.
- PWA & UX Improvements: PWA install prompts, tours, voice commands, client-side performance monitoring.
- Security: session-based auth, password management, admin super-admin initialization.

---

## Where to look for common tasks 🔎
- Add a new API endpoint: `server/routes.ts` → storage layer in `server/storage.ts` → Drizzle DB schema/migration if needed.
- Add a new UI page: `client/src/pages/` → add components in `client/src/components/` and wire routes in `client/src/App.tsx`.
- Add a database migration: add SQL to `server/migrations/` and update `drizzle.config.ts` if needed.
- Excel import/exports: `client/src/pages/vendor/ExcelImport.tsx` + `server` endpoints handling upload and processing; check `exceljs` usage.

---

## Recommendations & Notes 💡
- Many helpful docs are already in the repo (`LOCAL_DEVELOPMENT_GUIDE.md`, `QUICK_START.md`, `PERFORMANCE_*` files). Keep those synced with this overview.
- Consider adding a short `CONTRIBUTING.md` and a `DEVELOPER-ARCHITECTURE.md` that maps major modules to files (routes → storage → DB schema → client pages).
- For release notes, the SQL migration files and `server/migrations` should be used as the canonical changelog for DB changes.

---

## Appendix: Key files (compact list)
- Root: `package.json`, `drizzle.config.ts`, `run-migration.bat`, `ecosystem.config.cjs`
- Server: `server/index.ts`, `server/routes.ts`, `server/db.ts`, `server/storage.ts`, `server/auth-middleware.ts`, `server/error-handler.ts`, `server/static.ts`, `server/vite.ts`, `server/logger.ts`, `server/migrations/*`
- Client: `client/src/main.tsx`, `client/src/App.tsx`, `client/src/config/api.config.ts`, `client/src/pages/vendor/*`, `client/src/pages/employee/*`, `client/src/pages/admin/*`, `client/src/components/*`, `client/src/lib/*`, `client/src/hooks/*`

---

If you'd like, I can:
- Generate a more exhaustive file-by-file list with short descriptions per file (this will be long but I can auto-generate it), or
- Create a `docs/DEVELOPER_GUIDE.md` with developer tasks and examples (add routes, add pages, run migrations), or
- Add a table of contents and links into this `APPLICATION.md` for faster navigation.

Which of the above would you like me to do next? ✅