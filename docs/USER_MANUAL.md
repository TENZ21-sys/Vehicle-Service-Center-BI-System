# Vehicle Service Center Management & Business Intelligence System
## Comprehensive User & Operator Manual

---

## 1. System Overview & Offline-First Architecture

### 1.1 Introduction
The **Vehicle Service Center Management & Business Intelligence System** is an offline-capable, local-first Windows desktop application engineered specifically for automotive workshops, repair centers, and service garages. It provides complete end-to-end management spanning customer check-in, vehicle tracking with photos, service cataloging, inventory stock control, workshop job cards, immutable POS billing, cash drawer reconciliation, business intelligence analytics, and disaster recovery.

### 1.2 Local-First & Multi-Tenancy Architecture
- **Zero Internet Requirement**: Operates 100% offline on the local machine without requiring cloud servers or constant internet connectivity.
- **Multi-Tenant per Installation**: Supports multiple businesses or branches on a single workstation or server. Each business maintains a completely isolated, independent SQLite database located in `data/databases/biz_<business_id>.db`.
- **Master Registry**: A lightweight registry database (`data/master.db`) tracks registered businesses and their storage locations.
- **WAL Mode & Foreign Key Integrity**: Every business database operates with SQLite Write-Ahead Logging (`PRAGMA journal_mode = WAL`) and strict foreign key constraints (`PRAGMA foreign_keys = ON`), providing ACID-compliant multi-process safety and zero data corruption.

### 1.3 Key Financial & Data Integrity Rules
- **Integer Cents Representation**: All monetary transactions (amounts, costs, unit prices, discounts, taxes) are stored and calculated strictly as integers in the smallest currency unit (e.g., cents, cents/paisa: `Rs. 1,500.00` = `150000`). This eliminates floating-point rounding errors across invoices, taxes, and accounting ledgers.
- **Dynamic Stock Ledger**: Stock levels are never stored as a static column on parts; they are calculated dynamically from the append-only stock movement ledger.
- **Non-Destructive Soft Deletes**: Operational records (Customers, Vehicles, Services, Inventory) are never deleted from SQLite. Obsolete records are deactivated (`is_active = 0`), preserving historical integrity for past invoices, job cards, and audits.
- **Immutable Financial Ledgers**: Invoices, payments, and stock movements are append-only. Voids write an automatic offsetting reversal entry.

---

## 2. Getting Started & User Authentication

### 2.1 First Launch & Business Provisioning
When launching the application for the first time:
1. **Business Selection Screen**:
   - If no businesses exist, the **"Create New Business"** setup modal appears.
   - Enter your **Business Name** (e.g., *"Apex Auto Care Center"*).
   - Enter your **Default Currency** (e.g., `LKR` / `Rs.`, `USD` / `$`).
   - Create your **Initial Owner Account**:
     - **Owner Username** (e.g., `admin` or `owner`).
     - **Owner Password** (minimum 8 characters).
     - **Owner Display Name** (e.g., `Workshop Director`).
2. Click **Create & Launch Business**. The system automatically provisions a dedicated SQLite database, runs all 8 schema migrations, seeds default permissions, roles, and sequences, and logs you into the dashboard.

### 2.2 Selecting an Existing Business & Staff Login
- If multiple businesses or branches are configured on the machine, the **Business Selection Screen** displays all active companies.
- Select your business from the list and log in using your staff credentials (`Username` and `Password`).
- To switch to another business at any time, click **Switch Business** on the login card or in the bottom corner of the sidebar.

### 2.3 Roles & Permissions Hierarchy
The system provides 7 pre-configured role templates with granular permission keys:
1. **Business Owner / Administrator**: Full administrative authority across all modules, financial reporting, and system settings. Cannot lose administrative permissions.
2. **Service Manager**: Manages workshop job cards, technician allocation, quotations, and service catalogs.
3. **Receptionist / Service Advisor**: Handles customer reception, appointment bookings, check-in, and initial job card generation.
4. **Cashier**: Processes point-of-sale (POS) counter sales, collects payments against invoices, issues receipts, and balances the cash register.
5. **Inventory Manager**: Oversees spare parts, stock levels, reorder alerts, purchase orders, and supplier directories.
6. **Technician**: Views assigned job cards, logs repair progression, adds parts used, and notes inspection findings.
7. **Accountant**: Reviews financial collections, operating expenses, tax summaries, profit & loss, and audit logs.

---

## 3. Account Management, Security Questions & Password Recovery

The system ensures that business accounts and credentials are safe and recoverable even if passwords or IDs are forgotten.

### 3.1 Forgot Password Recovery (Self-Service)
If a user forgets their password:
1. On the **Staff Login** screen, click the **"Forgot Password?"** link.
2. Enter your **Username**.
3. The system will prompt you with the **3 Security Questions** configured for your account.
4. Provide the correct answers (answers are case-insensitive and hashed securely using bcrypt).
5. Once verified, enter your **New Password** (minimum 8 characters) and confirm it.
6. Click **Reset Password**. You can immediately sign in with the new password.

### 3.2 Setting Up & Updating Security Questions
Users can update their personal security questions at any time:
1. Go to **Settings** > **User Accounts** tab (or through personal account settings).
2. Click **Setup Security Questions**.
3. Choose 3 distinct security questions from the curated list (e.g., *"What was the make of your first car?"*, *"What city were you born in?"*, etc.).
4. Provide your answers and save.

### 3.3 Administrative Account Management
Administrators (Owners) have full control over staff accounts under **Settings > User Accounts**:
- **Create New Staff User**: Set username, full name, role, email, and initial password.
- **Change Password / Force Reset**: Administrators can reset any staff member's password directly if they are locked out.
- **Deactivate User**: Temporarily prevent a staff member from logging in without losing their audit history.
- **Delete Account (With Password Verification)**:
  - To prevent accidental account removal or malicious deletion, clicking **Delete** opens a security confirmation dialog.
  - The administrator **must enter their own password** to verify authorization before the account is soft-deleted.
  - The primary Owner account is protected and cannot be deleted.

---

## 4. Customer & Vehicle Management

### 4.1 Registering Customers
1. Navigate to **Customers** in the main sidebar.
2. Click **+ Add Customer**.
3. Fill in customer details:
   - **Full Name** (Required).
   - **Primary Phone** (Required, mobile contact for notifications).
   - **Secondary Phone** (Optional).
   - **National ID / NIC / Passport** (Optional).
   - **Email Address & Postal Address** (Optional).
4. **Duplicate Prevention Guard**: If an existing customer shares the same phone number or NIC, the system alerts the operator to prevent redundant entries.

### 4.2 Registering Vehicles with Photo Upload
Each customer can own multiple vehicles. When registering a vehicle:
1. Click **+ Add Vehicle** from the Customer Detail page or **+ Add Vehicle** in the **Vehicles** registry tab.
2. Select the **Customer / Owner**.
3. Enter vehicle details:
   - **Registration Number / License Plate** (e.g., `WP CAB-1234`).
   - **Make & Model** (e.g., `Toyota Corolla`).
   - **Year of Manufacture** (e.g., `2020`).
   - **Vehicle Category** (e.g., Sedan, SUV, Commercial, Hybrid).
   - **Color, Fuel Type, Transmission, VIN / Chassis Number, Engine Number**.
4. **Vehicle Image Upload**:
   - Click the **Vehicle Photo** upload box or drag-and-drop an image file (`.png`, `.jpg`, `.jpeg`, `.webp`).
   - The system automatically resizes and compresses the photo into a lightweight, high-clarity thumbnail format.
   - The photo is saved directly into the local SQLite database, ensuring it remains intact during backups and exports.
5. Click **Save Vehicle**.

### 4.3 Vehicle Registry & Photo Directory
- Access the dedicated **Vehicles** tab in the sidebar.
- Browse all registered vehicles with vehicle photos, registration plates, make/model, and owner contact details.
- Filter by dynamic vehicle category or search by license plate, model, or customer name.
- Click **Edit** to update vehicle attributes or update/remove the photo.
- Click **Delete** to safely remove obsolete vehicles.
- Click **+ Reminder** to immediately schedule a service reminder (e.g. Next Oil Change, Revenue License Renewal, Transmission Service).

### 4.4 Editing & Removing Customers
- In **Customers**, click any customer to view their complete service history, registered vehicles, invoices, and quotations.
- Click **Edit Customer** to update contact information.
- Click **Delete Customer** to remove inactive customer records with confirmation.

---

## 5. Service Catalogue & Dynamic Vehicle Categories

### 5.1 Service Categories & Labour Charges
Navigate to **Catalogue** in the sidebar:
1. **Services Tab**:
   - View all workshop services (e.g., *"Full Body Wash"*, *"Periodic Engine Oil Service"*, *"Wheel Alignment & Balancing"*, *"Brake Pad Replacement"*).
   - Each service defines:
     - **Base Price**: Fixed fee or base part cost.
     - **Labour Charge**: Technician labour fee.
     - **Estimated Duration**: Minutes required for bay scheduling.
     - **Associated Vehicle Categories**: Customize pricing according to vehicle size.
   - Click **+ Add Service** or **Edit** to adjust pricing.
   - Click **Remove** to deactivate discontinued services.

### 5.2 Dynamic Vehicle Categories
Under **Catalogue > Vehicle Categories**:
- Create categories tailored to your workshop (e.g., *Sedan*, *Compact SUV*, *4x4 Luxury*, *Heavy Commercial*, *Electric Vehicle*).
- Define custom attributes (e.g., Battery Capacity (kWh), Gross Vehicle Weight, Tyre Size) that appear dynamically when adding vehicles in that category.

---

## 6. Spare Parts & Inventory Control

### 6.1 Creating Inventory Items
Navigate to **Inventory** in the sidebar:
1. Click **+ Add Inventory Item**.
2. Enter item attributes:
   - **SKU / Part Number** (Unique part code, barcode, or OEM number).
   - **Item Name** (e.g., *"0W-20 Fully Synthetic Motor Oil 4L"*).
   - **Category & Unit of Measure** (e.g., Litres, Pieces, Sets, Cans).
   - **Cost Price**: What the workshop pays suppliers.
   - **Selling Price**: Retail price billed to customers.
   - **Reorder Level**: Minimum stock threshold triggering low-stock alerts.
   - **Rack / Shelf Location** (e.g., `Shelf B-04`).
3. Click **Save Item**.

### 6.2 Dynamic Append-Only Stock Movements
Stock is calculated from the append-only ledger. To adjust stock:
1. Click **Stock Movement / Adjustment**.
2. Select the item and movement type:
   - **Adjustment In / Initial Stock**: Adding found or unrecorded inventory.
   - **Adjustment Out / Damaged**: Writing off expired, leaking, or damaged items (requires a written reason).
3. The system immediately calculates and updates the on-hand quantity.

### 6.3 Low Stock Alerts & Reorder Reports
- Items falling below their **Reorder Level** are highlighted with amber/red warning badges on the inventory screen.
- Use the **Low Stock Only** filter to generate an immediate procurement list.

---

## 7. Supplier Directory & Purchases

### 7.1 Managing Suppliers
Navigate to **Purchases > Suppliers**:
- Maintain supplier records with contact person, phone, email, address, and payment terms.

### 7.2 Creating Purchase Orders
Under **Purchases > Purchase Orders**:
1. Click **+ New Purchase Order**.
2. Select the **Supplier** and purchase date.
3. Add parts, quantities received, and invoice unit costs.
4. On submission, the system logs a `purchase_in` movement in the stock ledger, instantly updating inventory quantities and recording the payable amount.

---

## 8. Workshop Job Cards & Service Workflow

The Job Card is the central operational unit of the workshop.

### 8.1 Opening a New Job Card
1. Navigate to **Job Cards** and click **+ New Job Card**.
2. Select the **Customer** and **Vehicle**.
3. Record current intake details:
   - **Odometer / Mileage** (km or miles).
   - **Fuel Level** (E, 1/4, 1/2, 3/4, Full).
   - **Customer Complaints / Instructions** (e.g., *"Squeaking noise when braking at low speed"*).
   - **Assign Primary Technician**.
   - **Estimated Delivery Date & Time**.
4. Complete the **Intake Inspection Checklist** (tools, spare wheel, scratches, audio player, documents present).
5. Click **Create Job Card**.

### 8.2 Managing Repairs (Kanban & Details)
On the Job Card Detail view:
- **Assign Services**: Add services from the catalogue (calculates labour and estimated completion).
- **Issue Spare Parts**: Add inventory parts. The system checks real-time stock levels and reserves the parts.
- **Technician Notes**: Record inspection observations and recommendations.
- **Workflow Status Transitions**:
  - `Draft` -> `In Progress` -> `Pending Parts` -> `Work Completed` -> `Invoiced`.
- Technician status changes and parts consumed are recorded in the audit trail.

---

## 9. Formal Estimates & Quotations

### 9.1 Creating Quotations
1. Navigate to **Quotations** and click **+ New Estimate**.
2. Select Customer, Vehicle, and validity period (e.g. 14 days).
3. Add proposed services and required spare parts.
4. The system calculates estimated parts, estimated labour, applicable taxes, and grand total.

### 9.2 Tracking & Converting to Job Card
- Update quotation status as customer reviews it: `Draft` -> `Sent` -> `Approved` or `Declined`.
- **1-Click Conversion**: Once approved, click **Convert to Job Card**. The system automatically generates a workshop Job Card pre-populated with all agreed services and spare parts.

---

## 10. Appointments & Bay Scheduling

Navigate to **Appointments**:
1. Click **+ Book Appointment**.
2. Select Customer, Vehicle, requested date, time slot, and assigned Service Bay.
3. Track appointment states (`Scheduled`, `Confirmed`, `In Service`, `Completed`, `Cancelled`, `No Show`).
4. When the vehicle arrives at the garage, click **Check-in to Job Card** to start the service immediately.

---

## 11. Point of Sale (POS) Billing & Invoicing

### 11.1 Invoicing from Job Cards
1. When a Job Card status reaches `Work Completed`, click **Generate Invoice**.
2. All completed services, technician labour, and installed spare parts are automatically consolidated into line items.
3. Apply any special discounts (percentage or fixed amount) and verify tax calculations.

### 11.2 Direct Counter Sales (Parts Only)
1. Navigate to **Billing** > **New Counter Sale**.
2. Select or add a walk-in customer.
3. Add spare parts directly from inventory. Stock is deducted upon payment.

### 11.3 Collecting Payments
The system supports split and multi-payment transactions:
- **Payment Methods**: Cash, Credit/Debit Card, Bank Transfer, Cheque.
- Enter the amount tendered. If cash, the system calculates exact change.
- Click **Finalize Invoice**.

### 11.4 Printing & Receipts
- **80mm Thermal Receipt**: Fast POS thermal print format formatted for receipt printers.
- **A4 Tax Invoice**: Full-page formal invoice containing workshop header, customer details, vehicle license plate, itemized parts, labour breakdown, and payment status.

### 11.5 Voiding Invoices
If an invoice was created in error:
1. Open the invoice and click **Void Invoice**.
2. Enter the mandatory reason for voiding.
3. The system marks the invoice as `Void`, logs an audit entry, and **automatically generates reverse stock movements** returning all parts to active inventory.

---

## 12. Cash Drawer Reconciliation & Operating Expenses

### 12.1 Cash Drawer Management
Navigate to **Finance > Cash Drawer**:
1. **Open Session**: At the start of the day, enter the **Opening Float** (cash in register).
2. Throughout the day, all cash payments received via POS automatically accrue in the drawer balance.
3. **Cash Payouts**: Record any cash removed for daily garage needs (e.g. tea, fuel, courier).
4. **Close Session**: At shift end, count the physical cash in drawer and enter the **Closing Count**. The system automatically computes variance (Over / Short) and generates a reconciliation report.

### 12.2 Operating Expenses Ledger
Under **Finance > Expenses**:
1. Click **+ Add Expense**.
2. Enter **Date**, **Category** (e.g. Utility Bills, Garage Rent, Tools & Machinery, Workshop Consumables), **Amount**, and **Payment Method**.
3. Attach reference receipt or invoice numbers.
4. All expenses are integrated into the monthly Profit & Loss financial statements.

---

## 13. Business Intelligence (BI) Analytics & Reports

Navigate to **BI Analytics** in the sidebar. Select your desired date range using the quick presets (**Today**, **Last 7 Days**, **This Month**, **Last Month**, or **Custom Range**).

### 13.1 Overview Tab
- **Total Revenue**: Gross earnings across all non-voided invoices.
- **Net Profit & Margin**: Revenue minus parts cost and workshop operating expenses.
- **Total Jobs Completed**: Count of finalized job cards.
- **Average Invoice Value**: Average spend per invoice visit.

### 13.2 Services & Labour Tab
- Revenue breakdown by service category.
- Most requested services.
- Technician productivity report: Number of jobs completed, total labour revenue generated, and commission calculations.

### 13.3 Inventory Valuation & Dead Stock Tab
- **Total Stock Asset Value**: Inventory valued at cost price.
- **Total Retail Value & Potential Profit**: Inventory valued at retail price.
- **Dead Stock Alert**: Automatically flags parts that have on-hand stock but have had **zero movements in the last 60 days**, freeing up locked working capital.
- **Top Selling Spare Parts**: Ranked by units sold and revenue.

### 13.4 Customer Retention & LTV Tab
- **Total Active Customers**: Customer base size.
- **Repeat Customer Rate (%)**: Percentage of customers with 2 or more garage visits.
- **Top Spending Customers**: Ranked by total lifetime spend, visit count, and last visit date.

---

## 14. Settings, Security, Backups & Maintenance

Navigate to **Settings** in the main sidebar.

### 14.1 Feature Toggles
- Customize which modules are active for your workshop.
- Enable or disable: **Quotations**, **Appointments**, **Purchases & Suppliers**, **Cash Drawer**, **Expenses**, and **BI Analytics**.
- Disabled modules are cleanly hidden from navigation to streamline the interface for smaller shops.

### 14.2 Roles & Permissions
- View and customize permission assignments across all 7 staff roles.
- Control who can view reports, void invoices, delete records, or access settings.

### 14.3 Database Backups & Disaster Recovery
Under **Settings > Backups**:
- **Create Hot Backup**: Takes an instantaneous, non-blocking backup of the live SQLite database into `data/databases/backups/` with an accompanying JSON metadata sidecar.
- **Restore Database**: Select a past backup to restore. Before replacing the database, the system automatically takes a pre-restore safety snapshot so you can never accidentally lose data.
- **Clean Retention**: Automatically purges backups older than the configured retention policy (e.g. 30 days).

### 14.4 Database Optimization (VACUUM)
- Click **Optimize Database (VACUUM)**.
- Rebuilds the SQLite database file, repacks fragmented pages, cleans empty space, and optimizes index trees for maximum speed.

### 14.5 CSV Data Export
- Export your **Customers** directory and **Invoices** dataset to standard `.csv` files for external accounting software (e.g. QuickBooks, Excel, Tally).

### 14.6 Audit Trail Log Viewer
- Inspect immutable, tamper-evident audit logs of all user actions: logins, customer creation, vehicle updates, invoice creations, invoice voids, and database operations.

---

## 15. Troubleshooting & Frequently Asked Questions (FAQ)

### Q1: The login screen says "An unexpected internal error occurred. Please consult the application logs." What should I do?
- **Cause**: This typically indicates that an old database schema is missing recent columns or tables (such as migration `008_account_recovery.sql`), or the user was locked out.
- **Solution**: Restart the application so migrations apply automatically. If the issue persists, check `data/databases/` to ensure your database file has write permissions. You can also use the **"Forgot Password?"** recovery link.

### Q2: How do I recover an account if a staff member forgot their username or password?
- **Forgot Password**: The staff member clicks **"Forgot Password?"** on the login screen and answers their 3 security questions to choose a new password.
- **Forgot Username or Locked Out**: The Workshop Owner/Administrator can log in, go to **Settings > User Accounts**, and reset the user's password or view their username.

### Q3: When I click the BI Report tabs, does the application freeze or crash?
- **Resolved in v0.1.0**: The BI analytics engine has been completely hardened with local date handling (avoiding UTC timezone shifts) and dynamic stock ledger joins. All tabs load instantly.

### Q4: Can I run this system on multiple computers at the same time?
- The application is a local-first desktop application. You can install it on multiple Windows machines. For multi-workstation garage networks, you can point the application data directory to a shared Windows network drive (UNC path) with appropriate file permissions.

### Q5: How do I back up my data safely to an external drive?
- Go to **Settings > Backups** and click **Create Hot Backup**. You can also copy the entire `data/` folder to a USB drive or cloud backup folder (Google Drive, OneDrive). Because SQLite uses WAL mode, hot backups are clean and consistent.
