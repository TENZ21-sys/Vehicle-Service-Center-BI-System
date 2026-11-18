# Developer & Architecture Guide
## Vehicle Service Center Management & Business Intelligence System

---

## 1. System Overview & Technology Stack

The **Vehicle Service Center Management & Business Intelligence System** is an offline-capable, local-first Windows desktop application built using modern web and desktop technologies:

| Technology | Purpose | Key Details |
| :--- | :--- | :--- |
| **Electron** (v33.2) | Desktop Container & OS Bridge | Main Process (Node.js) + Renderer Process (Chromium), secure IPC isolation |
| **React** (v19) | User Interface | Functional components, hooks, modular feature hierarchy, custom CSS |
| **TypeScript** (v5.6) | Static Type Safety | Strict typing across shared contracts, DTOs, and internal services |
| **better-sqlite3** (v11.7) | Embedded Relational Database | Synchronous, high-performance SQLite driver running in WAL mode |
| **Zod** (v3.24) | Runtime Schema Validation | Validates inputs on forms and at IPC service boundaries |
| **Vite / electron-vite** | Build & Dev Tooling | Fast HMR dev server, SSR bundle generation for main/preload |
| **electron-builder** (v25) | Packaging & Distribution | Produces standalone portable `.exe` and NSIS setup installer |
| **Vitest** (v2.1) | Automated Testing | Comprehensive unit and integration test runner running in Electron Node runtime |

---

## 2. Directory & Folder Structure

```
bi/
├── .gitignore                      # Git ignore rules
├── .prettierrc                     # Code formatting configuration
├── electron-builder.yml            # NSIS and portable packaging configuration
├── electron.vite.config.ts         # Vite build configuration for main, preload, and renderer
├── eslint.config.mjs               # ESLint code quality configuration
├── package.json                    # Project dependencies, build scripts, and engine versions
├── tsconfig.json                   # Base TypeScript compiler settings
├── tsconfig.main.json              # TypeScript compiler settings for main & preload
├── tsconfig.renderer.json          # TypeScript compiler settings for React UI
├── vitest.config.ts                # Vitest test suite configuration
│
├── data/                           # Application runtime databases
│   ├── master.db                   # Registry database (lists businesses and locations)
│   └── databases/                  # Individual business databases (biz_<uuid>.db)
│       └── backups/                # Hot backups and pre-restore safety snapshots
│
├── dist/                           # Production distribution binaries
│   ├── Vehicle Service Center 0.1.0.exe        # Standalone portable Windows executable
│   ├── Vehicle Service Center Setup 0.1.0.exe  # Windows NSIS Setup installer
│   └── win-unpacked/                           # Unpacked binaries for debugging
│
├── docs/                           # Architecture, database schema, and user documentation
│   ├── ARCHITECTURE.md             # Low-level architecture and system design
│   ├── DATABASE.md                 # Full database schema and migration reference
│   ├── DEVELOPER_GUIDE.md          # (This file) Developer & maintenance manual
│   └── USER_MANUAL.md              # Complete end-user operating manual
│
├── out/                            # Compiled build artifacts from electron-vite
│   ├── main/                       # Bundled main process entry (index.js)
│   ├── preload/                    # Bundled preload script (index.js)
│   └── renderer/                   # Bundled React SPA (index.html, JS, CSS)
│
├── src/                            # Application Source Code
│   ├── main/                       # Node.js Electron Main Process
│   │   ├── database/               # Database connection and migration runner
│   │   │   ├── connection.ts       # DatabaseManager singleton, WAL mode, foreign keys
│   │   │   ├── master.repo.ts      # Multi-tenant business registry repository
│   │   │   ├── migrator.ts         # Migration runner applying SQL files sequentially
│   │   │   └── migrations/         # Numbered SQL migration files (001 through 008)
│   │   │       ├── 001_initial_schema.sql
│   │   │       ├── 002_customers_vehicles.sql
│   │   │       ├── 003_catalogue_inventory.sql
│   │   │       ├── 004_job_cards.sql
│   │   │       ├── 005_invoicing.sql
│   │   │       ├── 006_appointments_quotations.sql
│   │   │       ├── 007_expenses_finance.sql
│   │   │       └── 008_account_recovery.sql
│   │   │
│   │   ├── ipc/                    # IPC Channel Controllers (Renderer -> Main)
│   │   │   ├── register.ts         # Central registry attaching all IPC handlers
│   │   │   ├── account-recovery.ipc.ts  # Security questions & password reset handlers
│   │   │   ├── analytics.ipc.ts    # BI analytics and reporting queries
│   │   │   ├── appointments.ipc.ts # Service appointments and bay scheduling
│   │   │   ├── auth.ipc.ts         # Authentication, session, business switching
│   │   │   ├── backup.ipc.ts       # Hot backup, restore, CSV export, VACUUM
│   │   │   ├── billing.ipc.ts      # Invoicing, payments, and voiding
│   │   │   ├── catalogue.ipc.ts    # Services and vehicle categories
│   │   │   ├── customers.ipc.ts    # Customer profiles and duplicate checks
│   │   │   ├── finance.ipc.ts      # Cash drawer sessions and operating expenses
│   │   │   ├── inventory.ipc.ts    # Inventory items and stock ledger movements
│   │   │   ├── job-cards.ipc.ts    # Job cards, checklists, technician assignment
│   │   │   ├── quotations.ipc.ts   # Estimates and conversion to job cards
│   │   │   ├── settings.ipc.ts     # Feature toggles, user accounts, audit logs
│   │   │   └── vehicles.ipc.ts     # Vehicle registry and image attachment
│   │   │
│   │   ├── repositories/           # Direct SQLite Query Layer
│   │   │   ├── account-recovery.repo.ts
│   │   │   ├── analytics.repo.ts
│   │   │   ├── appointments.repo.ts
│   │   │   ├── audit.repo.ts
│   │   │   ├── backup.repo.ts
│   │   │   ├── billing.repo.ts
│   │   │   ├── catalogue.repo.ts
│   │   │   ├── customers.repo.ts
│   │   │   ├── finance.repo.ts
│   │   │   ├── inventory.repo.ts
│   │   │   ├── job-cards.repo.ts
│   │   │   ├── quotations.repo.ts
│   │   │   ├── settings.repo.ts
│   │   │   ├── users.repo.ts
│   │   │   └── vehicles.repo.ts
│   │   │
│   │   ├── services/               # Business Logic, Validation & Transactions
│   │   │   ├── account-recovery.service.ts
│   │   │   ├── analytics.service.ts
│   │   │   ├── appointments.service.ts
│   │   │   ├── audit.service.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── backup.service.ts
│   │   │   ├── billing.service.ts
│   │   │   ├── catalogue.service.ts
│   │   │   ├── customers.service.ts
│   │   │   ├── finance.service.ts
│   │   │   ├── inventory.service.ts
│   │   │   ├── job-cards.service.ts
│   │   │   ├── quotations.service.ts
│   │   │   ├── settings.service.ts
│   │   │   └── vehicles.service.ts
│   │   │
│   │   ├── utils/                  # Backend Utilities
│   │   │   ├── crypto.ts           # bcryptjs password hashing and verification
│   │   │   ├── logger.ts           # Structured application logging
│   │   │   └── money.ts            # Integer currency conversion and formatting
│   │   │
│   │   └── index.ts                # Main application entry point & BrowserWindow lifecycle
│   │
│   ├── preload/                    # Electron Preload Bridge
│   │   └── index.ts                # contextBridge.exposeInMainWorld('api', {...})
│   │
│   ├── renderer/                   # React Frontend (Chromium UI)
│   │   ├── main.tsx                # React DOM mount point
│   │   ├── App.tsx                 # Root layout, tab router, sidebar navigation, context
│   │   ├── components/             # Reusable UI widgets
│   │   │   ├── Layout/             # Sidebar, Header, Notification Toast, PageContainer
│   │   │   └── Auth/               # Login screen, Business Switcher, Reset Modals
│   │   ├── modules/                # Domain-Specific Feature Pages
│   │   │   ├── appointments/       # Bay scheduler & calendar view
│   │   │   ├── auth/               # Forgot password & security questions modal
│   │   │   ├── bi/                 # BI Analytics Dashboard (Revenue, Profit, Dead Stock)
│   │   │   ├── billing/            # POS Checkout, Invoices, Print views
│   │   │   ├── catalogue/          # Services & Dynamic Vehicle Categories
│   │   │   ├── customers/          # Customer Directory & Customer Profile
│   │   │   ├── finance/            # Cash Drawer reconciliation & Expenses ledger
│   │   │   ├── inventory/          # Stock catalog, ledger movements, UOM
│   │   │   ├── job-cards/          # Workshop Kanban, Job Card detail & checklists
│   │   │   ├── purchases/          # Purchase orders & supplier catalog
│   │   │   ├── quotations/         # Estimates & quotation converter
│   │   │   ├── settings/           # System settings, users, backups, audit trail
│   │   │   └── vehicles/           # Vehicle Registry & Vehicle Form Modal (photo upload)
│   │   ├── styles/                 # Global CSS (themes, tables, buttons, responsive rules)
│   │   └── utils/                  # UI formatting helpers (currency formatters, date helpers)
│   │
│   └── shared/                     # Universal Types & Contracts (Main + Renderer)
│       ├── constants/              # Permissions list, default sequences, status enums
│       ├── types/                  # TypeScript interfaces for all domain entities & IPC
│       └── validation/             # Zod validation schemas for forms and IPC requests
│
└── tests/                          # Automated Test Suite (Vitest)
    ├── fixtures/                   # Sample test seeds and mock data
    ├── integration/                # End-to-end multi-tenant database & service tests
    │   ├── account-recovery.test.ts
    │   ├── appointments.test.ts
    │   ├── audit-trail.test.ts
    │   ├── auth.test.ts
    │   ├── backup-restore-export.test.ts
    │   ├── catalogue.test.ts
    │   ├── customers-vehicles.test.ts
    │   ├── database.test.ts
    │   ├── finance-analytics.test.ts
    │   ├── inventory.test.ts
    │   ├── invoicing.test.ts
    │   ├── job-cards.test.ts
    │   ├── quotations.test.ts
    │   └── settings-permissions.test.ts
    └── unit/                       # Unit tests for money, errors, and validation schemas
        ├── catalogue.validation.test.ts
        ├── customer.validation.test.ts
        ├── errors.test.ts
        ├── job-card.validation.test.ts
        ├── money.test.ts
        └── quotation.validation.test.ts
```

---

## 3. Core Architectural Invariants

Whenever extending or modifying the codebase, **you must preserve these 5 core invariants**:

### 1. Integer Cents Representation (Zero Floating-Point Drift)
All monetary values (prices, costs, subtotals, tax amounts, discounts, payments, refunds, expenses) are stored in the database and processed across the system strictly as **integers in the smallest currency unit** (e.g. cents/paisa).
- Example: `$12.50` or `Rs. 1,250.00` is stored as integer `125000`.
- Tax rates are stored in basis points (1% = 100 basis points; e.g., 15% VAT = 1500).
- Format money on the UI using `@shared/types/money.types.ts` or `src/renderer/utils/formatters.ts`. Never perform `Math.round(val * 1.15)` directly with raw floats.

### 2. Dynamic Stock Ledger (No `current_stock` Column)
The table `inventory_items` **NEVER** stores a static `quantity_on_hand` or `current_stock` column. Stock levels are always computed dynamically from the append-only `stock_movements` ledger:
```sql
SELECT item_id, COALESCE(SUM(quantity), 0) as stock 
FROM stock_movements 
GROUP BY item_id;
```
- Deductions for job cards write a negative row (`movement_type = 'job_card_out', quantity = -X`).
- Purchases write a positive row (`movement_type = 'purchase_in', quantity = +X`).
- Invoice voids write an automatic reversal row (`movement_type = 'void_reversal'`).
- Stock movements are **never** updated or deleted.

### 3. Non-Destructive Soft-Deletes
Operational records (Customers, Vehicles, Services, Inventory Items, Users) are **never hard-deleted** using `DELETE FROM <table>`. They are soft-deleted by updating `is_active = 0`.
- This ensures historical job cards, invoices, receipts, and audit trails remain 100% referentially valid forever.
- Always include `WHERE is_active = 1` in operational list queries unless explicitly showing inactive records.

### 4. Isolated Multi-Tenancy per Installation
- Global business definitions are stored in `data/master.db`.
- Each individual business maintains its own isolated SQLite file in `data/databases/biz_<business_id>.db`.
- When an operator switches businesses or logs in, `DatabaseManager.getInstance().switchDatabase(bizId)` cleanly closes the prior database and opens the target database with WAL mode and foreign keys enabled.

### 5. IPC Security & Process Isolation
The Electron renderer process runs with `nodeIntegration: false` and `contextIsolation: true`.
- The UI **never** accesses SQLite or Node.js file system APIs directly.
- Communication is strictly mediated via `window.api` through typed IPC channels registered in `src/main/ipc/register.ts`.
- Every IPC handler must validate permissions and input data before touching repositories.

---

## 4. How-To Developer Recipes

### Recipe A: Adding a New Database Migration
1. Create a new SQL file in `src/main/database/migrations/` following the zero-padded sequential naming convention (e.g., `009_customer_loyalty_points.sql`).
2. Write standard SQLite statements with `CREATE TABLE IF NOT EXISTS` or `ALTER TABLE ... ADD COLUMN ...`.
3. Open `src/main/database/migrator.ts` if custom migration hooks or table verifications are needed.
4. On application startup, `Migrator.runMigrations()` reads all `.sql` files, inspects the internal `_migrations` table, and applies any pending migrations inside an atomic transaction.

### Recipe B: Adding a New IPC Channel & Handler
1. **Define Shared Contract:** Add request and response types in `src/shared/types/<domain>.types.ts`.
2. **Add Zod Schema:** In `src/shared/validation/<domain>.validation.ts`, create the input validator.
3. **Repository Method:** In `src/main/repositories/<domain>.repo.ts`, write the SQLite query using prepared statements (`this.db.prepare(...)`).
4. **Service Method:** In `src/main/services/<domain>.service.ts`, add business logic, permission verification (`authService.requirePermission(...)`), audit log creation, and input validation.
5. **IPC Controller:** In `src/main/ipc/<domain>.ipc.ts`, register the channel using `ipcMain.handle('<channel-name>', async (event, input) => { ... })`.
6. **Preload Bridge:** In `src/preload/index.ts`, add the typed method to the `api` object.
7. **TypeScript Types:** Update `Window.api` declaration in `src/shared/types/ipc.types.ts` (or `preload/index.ts`).

### Recipe C: Adding a New Tab / Module in the UI
1. Create a new folder under `src/renderer/modules/<new-module>/` with the main page component (e.g., `LoyaltyDashboardPage.tsx`).
2. Open `src/renderer/App.tsx`:
   - Add the new tab ID to the navigation list (e.g. `'loyalty'`).
   - Add the sidebar icon and label.
   - Check feature toggles: `const isLoyaltyEnabled = settings.featureToggles?.loyalty ?? true;`.
   - Render the component conditionally when `activeTab === 'loyalty'`.

### Recipe D: Adding or Editing Vehicle Images
- Vehicle photos are captured in `VehicleFormModal.tsx`.
- Images are automatically downscaled client-side using an HTML5 canvas to a max dimension of 800px at 0.8 JPEG quality.
- The resulting base64 data URL string is stored inside the `extra_fields` JSON column on the `vehicles` table (`extra_fields.imageUrl`).
- This guarantees that images require zero external image directories and remain bundled inside SQLite backups.

---

## 5. Testing, Building & Releasing

### Running the Test Suite
All tests use Vitest executed inside the Electron Node environment (to ensure compatibility with native `better-sqlite3` bindings):
```bash
# Run all unit and integration tests
npm test

# Run tests in watch mode during development
npm run test:watch
```

### Checking Types and Code Quality
```bash
# Type check both main process and renderer React code
npm run typecheck

# Run linter
npm run lint

# Auto-format codebase
npm run format
```

### Running the App in Development Mode
```bash
npm run dev
```

### Building & Packaging for Production
```bash
# 1. Compile frontend and backend TypeScript/Vite bundles
npm run build

# 2. Package Windows Portable (.exe) and NSIS Setup Installer (.exe)
npm run dist:win
```
The output executables will be placed into the `dist/` directory:
- `dist/Vehicle Service Center 0.1.0.exe` (Portable executable)
- `dist/Vehicle Service Center Setup 0.1.0.exe` (Full NSIS Windows installer)

---

## 6. Native Dependency Rebuilds (`better-sqlite3`)
If you upgrade Electron or Node.js versions, `better-sqlite3` may need to be recompiled for the target Electron ABI:
```bash
npx @electron/rebuild -f -w better-sqlite3
```
This ensures the native C++ SQLite bindings match the Chromium/Electron runtime without crashing on startup.
