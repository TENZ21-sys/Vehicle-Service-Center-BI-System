# Software Requirements Specification (SRS)

## Vehicle Service Center Management & Business Intelligence System

| Field            | Value                          |
| ---------------- | ------------------------------ |
| Version          | 0.1 – Draft                    |
| Status           | Awaiting Product Owner Review  |
| Last Updated     | 2026-11-13                     |

---

## 1. Introduction

### 1.1 Purpose

This document specifies the functional and non-functional requirements for a desktop-installable business application that manages all operations of a multi-specialty vehicle service center: customer and vehicle management, service catalogue, appointments, job cards, billing, quotations, inventory, employee management, basic finance, and BI dashboards.

### 1.2 Scope

**Version 1** delivers a fully functional single-site desktop application running on Windows. It is local-first with no cloud dependency. The system supports multiple independent businesses on a single installation, each with its own isolated database.

### 1.3 Definitions

| Term               | Definition                                                                             |
| ------------------ | -------------------------------------------------------------------------------------- |
| Business           | An independent service-center account. Each business has its own database, users, data. |
| Staff / User       | A person with login credentials within a business.                                     |
| Job Card           | A work order tracking a vehicle through reception → workshop → delivery.               |
| POS                | Point of Sale — a direct sale invoice not linked to a job card.                         |
| Stock Movement     | A ledger entry recording why and how stock quantity changed.                            |
| Smallest Currency Unit | The indivisible unit of the local currency (e.g., cents, paisa). All money stored as integers in this unit. |
| Feature Toggle     | A per-business on/off switch that hides and blocks an entire module.                   |
| Soft Delete        | Setting an `is_active` or `archived_at` flag instead of removing a row.                |

### 1.4 Labelling Convention

Each requirement is labelled:

- **CONFIRMED** — explicitly agreed with the product owner.
- **SUGGESTED** — proposed by the architect; needs product-owner approval.
- **ASSUMPTION** — inferred from context; must be validated.

---

## 2. Overall Description

### 2.1 Product Perspective

A standalone Windows desktop application. No internet connection is required for normal operation. A single installation can host multiple business accounts, each completely isolated.

### 2.2 User Classes

| Role                          | Description                                                   |
| ----------------------------- | ------------------------------------------------------------- |
| Business Owner / Admin        | Full access; manages settings, users, roles, permissions.     |
| Service Manager               | Manages job cards, assigns technicians, approves quotations.  |
| Receptionist / Service Advisor| Creates appointments, receives vehicles, creates job cards.   |
| Cashier                       | Creates invoices, processes payments, POS sales.              |
| Inventory Manager             | Manages stock, suppliers, purchases, adjustments.             |
| Technician                    | Updates assigned job-card progress, logs parts used, findings.|
| Accountant                    | Views finance summaries, manages income/expense records.      |

> These are default roles that ship as editable templates. The business owner can modify permissions and create new roles. **[CONFIRMED — Decision 10]**

### 2.3 Operating Environment

- **OS:** Windows 10 or later. **[CONFIRMED — Decision 1]**
- **Architecture:** Electron + React + TypeScript + SQLite. **[CONFIRMED — Decision 2]**
- **Concurrency:** Designed for a single computer initially. **[OPEN QUESTION 1]**

### 2.4 Design Constraints

| # | Constraint | Source |
|---|-----------|--------|
| C1 | All money stored as integers in smallest currency unit | Decision 4 |
| C2 | Invoices/payments never edited or deleted; void or credit note only | Decision 5 |
| C3 | Stock calculated from movement ledger, never overwritten quantity | Decision 6 |
| C4 | Soft delete everywhere; no hard deletes of business records | Decision 7 |
| C5 | Prices, services, taxes, categories, statuses are configurable data | Decision 8 |
| C6 | Passwords hashed with argon2 or bcrypt | Decision 9 |
| C7 | Permissions enforced in backend layer, not only in UI | Decision 10 |
| C8 | One SQLite database file per business | Decision 3 |

---

## 3. Functional Requirements

### 3.1 Business Account Management

| ID       | Requirement                                                                                   | Status     |
| -------- | --------------------------------------------------------------------------------------------- | ---------- |
| BA-001   | System supports multiple independent business accounts on one installation.                   | CONFIRMED  |
| BA-002   | Each business has its own SQLite database file. No data is shared between businesses.         | CONFIRMED  |
| BA-003   | Login flow: user selects a business, then logs in with username/password.                     | CONFIRMED  |
| BA-004   | A master registry (outside business databases) maps business names to their database files.   | SUGGESTED  |
| BA-005   | Creating a new business provisions a new database with all tables, default roles, default settings, and an initial owner account. | SUGGESTED |
| BA-006   | Business database filenames are derived from business name or use a UUID, stored in a known directory. | ASSUMPTION |

### 3.2 Authentication & Authorization

| ID       | Requirement                                                                                   | Status     |
| -------- | --------------------------------------------------------------------------------------------- | ---------- |
| AU-001   | Passwords are hashed using argon2 or bcrypt before storage.                                   | CONFIRMED  |
| AU-002   | Permissions are data-driven: `permissions`, `roles`, `role_permissions`, `user_roles` tables.  | CONFIRMED  |
| AU-003   | Seven default roles ship as editable templates (see §2.2).                                    | CONFIRMED  |
| AU-004   | Business owner can edit role permissions and create new roles in Settings.                     | CONFIRMED  |
| AU-005   | The owner role can never lose access to Settings.                                             | CONFIRMED  |
| AU-006   | All permission checks are enforced in the backend/service layer.                              | CONFIRMED  |
| AU-007   | A user session stores the current user ID and resolved permissions for the session duration.   | SUGGESTED  |
| AU-008   | Session expires on application close. No persistent "remember me" across restarts.            | ASSUMPTION |
| AU-009   | Failed login attempts are logged in the audit log.                                            | SUGGESTED  |
| AU-010   | A user can be assigned multiple roles. Effective permissions are the union of all assigned role permissions. | SUGGESTED |
| AU-011   | Password change requires the current password. First login after creation may require a password change. | SUGGESTED |

### 3.3 Settings Module

| ID       | Requirement                                                                                   | Status     |
| -------- | --------------------------------------------------------------------------------------------- | ---------- |
| ST-001   | Settings are stored per business in that business's own database as typed key-value records with defaults. | CONFIRMED |
| ST-002   | Every settings change is written to the audit log (who, what, old value, new value).          | CONFIRMED  |
| ST-003   | Settings categories: business profile, users & roles, feature toggles, financial options, numbering & templates, workflow options, inventory options, backup/data. | CONFIRMED |
| ST-004   | Business profile: name, address, contact details, logo path, currency.                       | CONFIRMED  |
| ST-005   | Feature toggles: turn modules on/off per business. Toggling hides and blocks a module but never deletes data. | CONFIRMED |
| ST-006   | Financial options: tax rates, payment methods, rounding rules.                                | CONFIRMED  |
| ST-007   | Numbering formats: configurable prefixes and sequences for invoices, job cards, quotations.   | CONFIRMED  |
| ST-008   | Workflow options: status lists, priorities, reminder intervals.                               | CONFIRMED  |
| ST-009   | Statuses and values that the workflow depends on can be renamed but not removed.              | CONFIRMED  |
| ST-010   | Inventory options: low-stock thresholds, units of measure, categories.                        | CONFIRMED  |
| ST-011   | Only add a setting when a real feature needs it.                                              | CONFIRMED  |
| ST-012   | Permission matrix UI: a grid showing roles vs. permissions with checkboxes.                   | SUGGESTED  |
| ST-013   | Document templates: configurable header/footer text and logo placement for printed documents.  | SUGGESTED  |

### 3.4 Audit Log

| ID       | Requirement                                                                                   | Status     |
| -------- | --------------------------------------------------------------------------------------------- | ---------- |
| AL-001   | All significant user actions are recorded: logins, data changes, settings changes, permission changes. | CONFIRMED |
| AL-002   | Each log entry records: timestamp, user ID, action type, entity type, entity ID, old value, new value, IP/machine info. | SUGGESTED |
| AL-003   | Audit log entries are append-only and cannot be modified or deleted.                           | SUGGESTED  |
| AL-004   | Audit log is queryable by date range, user, action type, and entity.                          | SUGGESTED  |

### 3.5 Customers

| ID       | Requirement                                                                                   | Status     |
| -------- | --------------------------------------------------------------------------------------------- | ---------- |
| CU-001   | Customer profile: name, phone(s), email, address, NIC/ID number, notes.                      | CONFIRMED  |
| CU-002   | A customer can own multiple vehicles.                                                         | CONFIRMED  |
| CU-003   | Customer history view: all job cards, invoices, payments, quotations.                         | CONFIRMED  |
| CU-004   | Outstanding balance tracked per customer (sum of unpaid invoice amounts).                     | CONFIRMED  |
| CU-005   | Customer notes field for free-text remarks.                                                   | CONFIRMED  |
| CU-006   | Soft delete only — customers can be deactivated/archived, never hard deleted.                 | CONFIRMED  |
| CU-007   | Customer search by name, phone, NIC/ID.                                                      | CONFIRMED  |
| CU-008   | Duplicate detection: warn when phone number or NIC already exists.                            | SUGGESTED  |

### 3.6 Vehicles

| ID       | Requirement                                                                                   | Status     |
| -------- | --------------------------------------------------------------------------------------------- | ---------- |
| VE-001   | Vehicle registration: registration number, make, model, year, color, VIN/chassis number, engine number, fuel type, transmission type. | CONFIRMED |
| VE-002   | Dynamic registration: common fields plus category-specific details (e.g., motorcycle vs. truck). | CONFIRMED |
| VE-003   | Vehicle categories are configurable (car, motorcycle, van, truck, three-wheeler, etc.).       | SUGGESTED  |
| VE-004   | Category-specific fields are stored as a JSON blob or in a key-value extension table.         | SUGGESTED  |
| VE-005   | Full service history per vehicle: list of all job cards, services performed, parts used.      | CONFIRMED  |
| VE-006   | Mileage recorded per visit.                                                                   | CONFIRMED  |
| VE-007   | Service reminders by date and/or mileage.                                                     | CONFIRMED  |
| VE-008   | A vehicle belongs to exactly one customer (current owner). Ownership transfer supported.      | ASSUMPTION |
| VE-009   | Vehicle search by registration number, chassis number.                                        | CONFIRMED  |
| VE-010   | Soft delete only.                                                                             | CONFIRMED  |

### 3.7 Service Catalogue

| ID       | Requirement                                                                                   | Status     |
| -------- | --------------------------------------------------------------------------------------------- | ---------- |
| SC-001   | Configurable list of services with: name, description, category, base price, labor charge, estimated time. | CONFIRMED |
| SC-002   | Services can be marked as applicable to specific vehicle categories.                          | CONFIRMED  |
| SC-003   | Services can be activated or deactivated (soft delete).                                       | CONFIRMED  |
| SC-004   | Service categories are configurable (e.g., engine, brakes, electrical, body, tires).          | CONFIRMED  |
| SC-005   | Prices are stored as integers in smallest currency unit.                                      | CONFIRMED  |
| SC-006   | A service can have an optional list of commonly-used parts (suggested, not mandatory).        | SUGGESTED  |

### 3.8 Appointments & Reception

| ID       | Requirement                                                                                   | Status     |
| -------- | --------------------------------------------------------------------------------------------- | ---------- |
| AP-001   | Appointments: date, time, customer, vehicle, requested services, notes, status.               | CONFIRMED  |
| AP-002   | Walk-in registration without prior appointment.                                               | CONFIRMED  |
| AP-003   | Appointment statuses: configurable list (default: Scheduled, Confirmed, Arrived, No-Show, Cancelled). | CONFIRMED |
| AP-004   | Convert appointment or walk-in to a job card.                                                 | CONFIRMED  |
| AP-005   | V1: receptionist-entered and walk-in bookings only. No external booking channels.             | CONFIRMED  |
| AP-006   | Calendar or list view of appointments for a given day/week.                                   | SUGGESTED  |

### 3.9 Job Cards

| ID       | Requirement                                                                                   | Status     |
| -------- | --------------------------------------------------------------------------------------------- | ---------- |
| JC-001   | Job card tracks a vehicle through: reception → inspection → work in progress → quality check → ready → delivered. | CONFIRMED |
| JC-002   | Statuses are configurable but the workflow-critical ones (e.g., Open, In Progress, Completed, Delivered) cannot be removed, only renamed. | CONFIRMED |
| JC-003   | Manager assigns one technician per job card (v1).                                             | CONFIRMED  |
| JC-004   | Technician updates progress, logs findings, records parts used.                               | CONFIRMED  |
| JC-005   | Parts used on a job card create stock movement entries (outgoing).                            | CONFIRMED  |
| JC-006   | Job card records: customer, vehicle, mileage-in, services requested, services performed, parts used, findings, notes, timestamps. | CONFIRMED |
| JC-007   | Job card can be converted to an invoice.                                                      | CONFIRMED  |
| JC-008   | Job card numbering uses a configurable format (e.g., JC-2026-0001).                          | CONFIRMED  |
| JC-009   | Vehicle cannot be marked as delivered until the job card is invoiced and payment status is resolved. | SUGGESTED |
| JC-010   | Inspection findings can include photos/images.                                                | SUGGESTED  |

### 3.10 Billing & Invoicing

| ID       | Requirement                                                                                    | Status     |
| -------- | ---------------------------------------------------------------------------------------------- | ---------- |
| BL-001   | Shared invoice engine for both job-card invoices and direct POS sales.                         | CONFIRMED  |
| BL-002   | Invoice contains: line items (service or part), quantities, unit prices, discounts, tax, total. | CONFIRMED  |
| BL-003   | Invoices and payments are never edited or deleted. Corrections use void or credit notes.       | CONFIRMED  |
| BL-004   | Partial payments supported. Invoice tracks amount paid vs. amount due.                         | CONFIRMED  |
| BL-005   | Multiple payment methods supported (cash, card, bank transfer, etc.). Payment methods are configurable. | CONFIRMED |
| BL-006   | Receipts generated for payments.                                                               | CONFIRMED  |
| BL-007   | Invoice numbering uses a configurable format (e.g., INV-2026-0001).                           | CONFIRMED  |
| BL-008   | All amounts stored as integers in smallest currency unit.                                      | CONFIRMED  |
| BL-009   | Tax calculation: line-level or invoice-level, configurable.                                    | ASSUMPTION |
| BL-010   | Discount can be percentage or fixed amount, per line item or on the invoice total.             | SUGGESTED  |
| BL-011   | Rounding rules are configurable (e.g., round to nearest 1, 5, 10 of the display unit).        | CONFIRMED  |
| BL-012   | Void invoice: marks the original as void, reverses any stock movements if applicable, and creates an adjustment record. | SUGGESTED |
| BL-013   | Credit note: a negative invoice referencing the original, usable against future purchases.     | SUGGESTED  |

### 3.11 Quotations

| ID       | Requirement                                                                                   | Status     |
| -------- | --------------------------------------------------------------------------------------------- | ---------- |
| QT-001   | Quotation structure mirrors an invoice: line items, prices, tax, total.                       | CONFIRMED  |
| QT-002   | Quotation statuses: Draft, Sent, Approved, Rejected, Expired, Converted.                     | SUGGESTED  |
| QT-003   | Approval is optional and configurable (can auto-approve).                                     | CONFIRMED  |
| QT-004   | A quotation can be converted to a job card or an invoice.                                     | CONFIRMED  |
| QT-005   | Quotation numbering uses a configurable format.                                               | CONFIRMED  |
| QT-006   | Quotation validity period is configurable (e.g., 14 days).                                    | SUGGESTED  |

### 3.12 Inventory & Suppliers

| ID       | Requirement                                                                                   | Status     |
| -------- | --------------------------------------------------------------------------------------------- | ---------- |
| IN-001   | Inventory items: name, SKU, category, unit of measure, cost price, selling price, reorder level, location. | CONFIRMED |
| IN-002   | Stock is calculated from a stock movement ledger. Current quantity = sum of all movements.     | CONFIRMED  |
| IN-003   | Stock movement types: purchase-in, job-card-out, adjustment-in, adjustment-out, return-in, void-reversal. | SUGGESTED |
| IN-004   | Every stock adjustment requires a reason.                                                     | CONFIRMED  |
| IN-005   | Low-stock alerts when quantity falls below reorder level.                                     | CONFIRMED  |
| IN-006   | Supplier profiles: name, contact, address, notes.                                             | CONFIRMED  |
| IN-007   | Purchase records: supplier, items, quantities, costs, date, reference number.                 | CONFIRMED  |
| IN-008   | Purchases create stock-in movement entries.                                                   | CONFIRMED  |
| IN-009   | Job card integration: using a part on a job card creates a stock-out movement.                | CONFIRMED  |
| IN-010   | Inventory item categories and units of measure are configurable.                              | CONFIRMED  |
| IN-011   | Item search by name, SKU, category.                                                           | CONFIRMED  |
| IN-012   | Soft delete for items and suppliers.                                                           | CONFIRMED  |

### 3.13 Employees

| ID       | Requirement                                                                                   | Status     |
| -------- | --------------------------------------------------------------------------------------------- | ---------- |
| EM-001   | Employee profile: name, phone, email, address, role(s), employment date, status.              | CONFIRMED  |
| EM-002   | Link between employee record and user account for login.                                      | SUGGESTED  |
| EM-003   | Simple performance view: number of jobs completed, revenue generated per period.              | CONFIRMED  |
| EM-004   | Employee assignments visible on job cards.                                                     | CONFIRMED  |
| EM-005   | Soft delete only.                                                                             | CONFIRMED  |

### 3.14 Finance

| ID       | Requirement                                                                                   | Status     |
| -------- | --------------------------------------------------------------------------------------------- | ---------- |
| FI-001   | Income records derived from payments received.                                                | CONFIRMED  |
| FI-002   | Expense records: manual entry with category, amount, date, description, receipt reference.    | CONFIRMED  |
| FI-003   | Outstanding balances per customer.                                                            | CONFIRMED  |
| FI-004   | Daily sales summary: total invoiced, total collected, by payment method.                      | CONFIRMED  |
| FI-005   | Gross vs. net profit distinction (revenue minus cost of parts and expenses).                  | CONFIRMED  |
| FI-006   | Expense categories are configurable.                                                          | SUGGESTED  |
| FI-007   | All financial data is append-only (follows invoice immutability rule).                        | CONFIRMED  |

### 3.15 BI Dashboards

| ID       | Requirement                                                                                   | Status     |
| -------- | --------------------------------------------------------------------------------------------- | ---------- |
| BI-001   | Dashboards calculated only from real recorded transactions.                                   | CONFIRMED  |
| BI-002   | Filters: date range, category, employee.                                                     | CONFIRMED  |
| BI-003   | Clearly label any demo/sample data.                                                          | CONFIRMED  |
| BI-004   | Specific BI reports for v1 to be determined.                                                  | OPEN — see Open Question 6 |
| BI-005   | Every transaction feeds the BI dashboards (no separate data entry for BI).                   | CONFIRMED  |

### 3.16 Reports & Documents

| ID       | Requirement                                                                                   | Status     |
| -------- | --------------------------------------------------------------------------------------------- | ---------- |
| RP-001   | Printable documents: invoices, receipts, job cards, quotations, service history.              | CONFIRMED  |
| RP-002   | Reports: inventory report, daily sales summary.                                              | CONFIRMED  |
| RP-003   | Configurable business details and logo on all printed documents.                             | CONFIRMED  |
| RP-004   | Print format (A4, thermal, or both) is configurable.                                         | OPEN — see Open Question 4 |

### 3.17 Search

| ID       | Requirement                                                                                   | Status     |
| -------- | --------------------------------------------------------------------------------------------- | ---------- |
| SR-001   | Global search or module-level search for: customers, vehicles (registration/chassis), job cards, invoices, inventory items, suppliers, employees. | CONFIRMED |
| SR-002   | Search results link to the relevant record.                                                   | SUGGESTED  |

### 3.18 Security & Data

| ID       | Requirement                                                                                   | Status     |
| -------- | --------------------------------------------------------------------------------------------- | ---------- |
| SD-001   | Secure login with hashed passwords.                                                           | CONFIRMED  |
| SD-002   | Activity/audit log.                                                                           | CONFIRMED  |
| SD-003   | Business isolation: one database file per business, no cross-access.                          | CONFIRMED  |
| SD-004   | Backup and restore functionality.                                                             | CONFIRMED  |
| SD-005   | Export capability (format TBD — CSV, PDF, or both).                                           | SUGGESTED  |
| SD-006   | Data integrity validation (checksums or consistency checks on critical tables).               | CONFIRMED  |

---

## 4. Non-Functional Requirements

### 4.1 Security

| ID       | Requirement                                                                                   | Status     |
| -------- | --------------------------------------------------------------------------------------------- | ---------- |
| NF-S01   | Passwords hashed with argon2 or bcrypt; never stored in plaintext.                            | CONFIRMED  |
| NF-S02   | Database files are not encrypted in v1 (they are local files). Encryption is a later enhancement. | ASSUMPTION |
| NF-S03   | No network listeners in v1; the app does not expose any ports.                                | SUGGESTED  |
| NF-S04   | User session is valid only while the app is running. No cross-session tokens stored on disk.  | ASSUMPTION |
| NF-S05   | The backend/service layer enforces all permission checks regardless of UI state.              | CONFIRMED  |

### 4.2 Reliability

| ID       | Requirement                                                                                   | Status     |
| -------- | --------------------------------------------------------------------------------------------- | ---------- |
| NF-R01   | SQLite WAL mode for crash resilience.                                                         | SUGGESTED  |
| NF-R02   | All database writes wrapped in transactions. Multi-step operations are atomic.                | SUGGESTED  |
| NF-R03   | Backup before database migration.                                                             | SUGGESTED  |
| NF-R04   | Application logs errors to a local log file for diagnostics.                                  | SUGGESTED  |

### 4.3 Usability

| ID       | Requirement                                                                                   | Status     |
| -------- | --------------------------------------------------------------------------------------------- | ---------- |
| NF-U01   | Interface language is English in v1. Multi-language is a later enhancement.                   | OPEN — see Open Question 3 |
| NF-U02   | Responsive layout that works on a 1366×768 minimum resolution.                                | SUGGESTED  |
| NF-U03   | Keyboard shortcuts for common actions (save, search, new record).                             | SUGGESTED  |
| NF-U04   | Confirmation dialogs for destructive actions (void, archive).                                 | SUGGESTED  |

### 4.4 Performance

| ID       | Requirement                                                                                   | Status     |
| -------- | --------------------------------------------------------------------------------------------- | ---------- |
| NF-P01   | Application launches and is usable within 5 seconds on a modern PC.                           | SUGGESTED  |
| NF-P02   | Search results return within 500 ms for databases up to 100,000 records per table.            | SUGGESTED  |
| NF-P03   | BI dashboards compute within 3 seconds for one year of data.                                  | SUGGESTED  |
| NF-P04   | SQLite indexes on all foreign keys and commonly searched columns.                             | SUGGESTED  |

### 4.5 Data Integrity

| ID       | Requirement                                                                                   | Status     |
| -------- | --------------------------------------------------------------------------------------------- | ---------- |
| NF-D01   | Foreign key constraints enforced (PRAGMA foreign_keys = ON).                                  | SUGGESTED  |
| NF-D02   | Money is always integer; never float. Validated at the service layer and the DB schema.       | CONFIRMED  |
| NF-D03   | Stock quantity must always match the sum of the stock movement ledger. Periodic validation check available. | CONFIRMED |
| NF-D04   | Invoice totals must match the sum of line items plus tax minus discounts. Validated before saving. | SUGGESTED |
| NF-D05   | No orphaned records: cascading soft-deletes where appropriate.                                | SUGGESTED  |

### 4.6 Backup & Updates

| ID       | Requirement                                                                                   | Status     |
| -------- | --------------------------------------------------------------------------------------------- | ---------- |
| NF-B01   | Manual backup: copy the business database file to a chosen destination.                       | CONFIRMED  |
| NF-B02   | Restore: select a backup file and replace the current database after confirmation.            | CONFIRMED  |
| NF-B03   | Backup destination to be determined (USB, local folder, or cloud).                            | OPEN — see Open Question 5 |
| NF-B04   | Database migrations are versioned and run automatically on app start.                         | CONFIRMED  |
| NF-B05   | Application updates delivered via a new installer (manual in v1).                             | ASSUMPTION |

---

## 5. Missing Requirements & Ambiguities

| # | Area              | Description                                                                          | Impact |
|---|-------------------|--------------------------------------------------------------------------------------|--------|
| 1 | Tax               | Tax structure unclear — single VAT rate, multiple rates, or compound taxes?          | Affects invoice calculation logic and settings design. |
| 2 | Currency          | Which currency and how many decimal places? Affects the "smallest unit" definition.  | Affects all money storage and display. |
| 3 | Rounding          | Rounding is confirmed as configurable, but the specific rules (round-half-up, banker's rounding) are not specified. | Affects invoice totals. |
| 4 | Discount rules    | Can discounts exceed line-item value? Are there discount limits or authorization levels? | Affects billing logic. |
| 5 | Credit notes      | Can a credit note be used across invoices? Does it expire?                           | Affects billing and finance. |
| 6 | Vehicle ownership | Can a vehicle be transferred to a different customer? What happens to history?       | Affects vehicle-customer relationship. |
| 7 | Multi-user concurrency | If multiple PCs access the same DB (Open Question 1), SQLite concurrency limits matter. | Affects architecture choice. |
| 8 | Photo storage     | If job-card inspection photos are included (JC-010), where are they stored?          | Affects storage and backup size. |
| 9 | Data export format| CSV, PDF, Excel, or a combination?                                                   | Affects export feature scope. |
| 10| Password policy   | Minimum length, complexity requirements, expiry?                                     | Affects auth implementation. |

---

## 6. Open Questions

> These questions are listed in priority order. They must be answered before their respective features are built.

| # | Question                                                                                      | Affects Phase |
|---|-----------------------------------------------------------------------------------------------|---------------|
| 1 | Will each center use one computer, or several computers sharing data at the same time?        | Phase 1 (architecture) |
| 2 | Currency, tax (e.g., VAT rate, single or multiple rates), and invoice legal requirements?     | Phase 5 (billing) |
| 3 | Interface language(s): English only, or Sinhala/Tamil as well?                                | Phase 1 (UI setup) |
| 4 | Printing: A4 invoices, thermal receipts, or both?                                             | Phase 5 (billing) |
| 5 | Backup destination: USB, local folder, or cloud?                                              | Phase 8 (backup) |
| 6 | Which BI reports are required in version 1?                                                   | Phase 7 (BI) |

---

## 7. Version 1 vs. Later

### In Version 1

All modules listed in §3, subject to the "lean" scope defined in the project brief. Key boundaries:

- Single-computer use (unless Open Question 1 changes this)
- One technician per job card
- In-app notifications only (no SMS/WhatsApp)
- Receptionist-entered and walk-in bookings only
- Manual backup to local destination
- Basic daily sales summary (no cashier closing)
- Simple supplier payment tracking (purchase record only, no supplier ledger)

### Designed For but Not Built in Version 1

| Feature                           | Design Consideration                                              |
| --------------------------------- | ----------------------------------------------------------------- |
| WhatsApp/SMS notifications        | Reminders table ready; sending channel is pluggable.              |
| External bookings                 | Appointment model supports a `source` field.                      |
| Cloud sync / multi-branch         | One DB per business; sync layer can wrap the data layer later.    |
| Technician teams                  | Job-card-technician is a linking table, not a single FK.          |
| Advanced analytics                | All raw data is stored; aggregation queries can be added.         |
| Cashier closing                   | Daily summary exists; a formal shift/closing flow can be added.   |
| Supplier payment tracking         | Supplier has a balance field; a payment ledger can be added.      |
| Database encryption               | SQLite supports encryption extensions (SQLCipher); can be added.  |
| Multi-language UI                 | All UI strings externalized through i18n from the start.          |

---

## Appendix A: Traceability to Confirmed Decisions

| Decision # | SRS Sections Affected                   |
| ---------- | --------------------------------------- |
| 1          | §2.1, §2.3                             |
| 2          | §2.3                                    |
| 3          | §3.1                                    |
| 4          | §3.7, §3.10, §3.12, §4.5              |
| 5          | §3.10                                   |
| 6          | §3.12                                   |
| 7          | §3.5–§3.14                             |
| 8          | §3.7, §3.8, §3.12, §3.3               |
| 9          | §3.2, §4.1                             |
| 10         | §3.2, §3.3, §4.1                       |
| 11         | §3.3                                    |
