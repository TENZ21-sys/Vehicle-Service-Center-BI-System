# 🚗 Vehicle Service Center — Workshop ERP & Business Intelligence System

A modern, standalone desktop ERP and Business Intelligence (BI) management platform designed for automotive service centers, repair workshops, and multi-bay garages. 

Built with **Electron**, **React 19**, **TypeScript**, and an embedded, high-performance **SQLite WAL engine** with strict multi-tenant database isolation.

---

## ✨ Key Features & Capabilities

### 🏢 Multi-Tenant Workshop Management & Security
- **Strict Tenant Database Isolation:** Each business profile maintains its own separate SQLite database file (`biz_<uuid>.db`).
- **Owner Security Verification:** Deletion or administrative teardown of business accounts requires Owner bcrypt password authentication or an Emergency Master Recovery Key.
- **Open Workshop Mode (Passwordless):** Toggle quick passwordless switching between staff bay terminals while retaining password protection for administrative operations.

### 🛠️ Workshop Floor Operations Command Center
- **Floor Operations Board:** Real-time visibility into **Ongoing Works** (In Progress, Quality Inspection) vs **Works Yet to Be Done** (Intake queue, parts delays, scheduled bookings).
- **1-Click Quick Launchpad:** Instant shortcuts for New Job Card check-in, customer/vehicle onboarding, appointment booking, counter POS sales, and CSV imports.
- **Live Bay Pipeline:** Visual workflow tracking: *Intake ➔ Diagnostics ➔ Bay Service ➔ Quality Check ➔ Delivery*.

### 📦 Inventory, Stock Ledger & Barcode Scanning
- **Immutable Append-Only Ledger:** Stock levels are derived dynamically via `SUM(quantity)` from the `stock_movements` ledger table, preventing unrecorded shrinkage or ghost stock.
- **Plug & Play Barcode Scanner:** Direct USB / Bluetooth HID barcode reader integration. Scanning auto-matches SKUs, auto-adds items to POS cart, and increments counts on repeat scans.
- **Reorder Alerts & Parts Demand:** Visual warnings for items at/below reorder threshold and top fast-moving parts analytics.

### 🧾 Point of Sale (POS) & Dual Billing Printing
- **Direct POS Counter Sales:** Split payments (Cash, Card, Bank Transfer), item discounts, and tax calculation.
- **Dual Invoice Formats:**
  - 📄 **Standard A4 Invoice:** Formatted for full-sheet customer invoicing, fleet records, and warranties.
  - 🧾 **80mm Thermal POS Receipt:** Formatted for standard 80mm thermal receipt printers with automated cash drawer kick-out support.

### 📊 Business Intelligence & Financial Analytics
- **Exact Integer Cents Arithmetic:** Financial transactions avoid floating-point errors by storing amounts as integer cents (`amount_cents`).
- **Real-Time BI Dashboards:** Workshop turnaround metrics, labor revenue leaderboard, technician commission tracking, gross margin %, and revenue trends.

### 📥 Data Import & Disaster Recovery
- **CSV Sector Importers:** Pre-configured CSV importers with dry-run validation and conflict detection for Customers, Vehicles, Inventory, Service Catalogue, and Expenses.
- **Hot Database Backups:** Point-in-time SQLite hot backups with JSON sidecar metadata, safety restore snapshots, and retention policy cleanup.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or v20+ recommended)
- npm or yarn

### Installation
```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/vehicle-service-center.git

# Navigate into the project directory
cd "Vehicle Service Center BI System"

# Install dependencies
npm install
```

### Development
```bash
npm run dev
```

### Running Tests
```bash
npm run test
```

### Building for Production
```bash
# Build Vite SSR & Renderer assets
npm run build

# Package standalone Windows executable & setup installer
npx electron-builder --win
```
The output executables will be generated in `dist/`:
- `dist/Vehicle Service Center Setup 0.1.0.exe` (NSIS Installer)
- `dist/Vehicle Service Center 0.1.0.exe` (Portable Executable)

---

## 🛠️ Technology Stack
- **Framework:** Electron 33, electron-vite
- **Frontend:** React 19, TypeScript
- **Database Engine:** SQLite (better-sqlite3) with Write-Ahead Logging (WAL)
- **Security:** bcryptjs password hashing, crypto master recovery keys
- **Testing:** Vitest (109 passing automated tests)
- **Packaging:** electron-builder (NSIS + Portable Windows binaries)

---

## 📄 License
Proprietary / All Rights Reserved.
