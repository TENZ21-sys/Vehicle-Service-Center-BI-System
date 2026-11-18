# Sample Data Sets for Vehicle Service Center BI System

This folder contains realistic, production-ready sample datasets designed for testing and populating the system using the **Data Import Engine**.

---

## Included Datasets

### 1. `01_customers_sample.csv`
- **Sector:** Customers Directory
- **Fields:** `name`, `phone`, `email`, `address`, `notes`
- **Contents:** 8 representative customers including individual retail drivers and corporate fleet managers.

### 2. `02_vehicles_sample.csv`
- **Sector:** Vehicle Fleet
- **Fields:** `registrationNo`, `customerPhone`, `make`, `model`, `year`, `category`, `fuelType`, `transmission`, `color`, `currentMileage`
- **Contents:** 10 vehicles mapped by `customerPhone` to the customers in dataset 01. Covers sedans, SUVs, hatchbacks, passenger vans, and light utility trucks.

### 3. `03_inventory_parts_sample.csv`
- **Sector:** Spare Parts & Inventory
- **Fields:** `sku`, `name`, `category`, `costPrice`, `sellingPrice`, `openingStock`, `unit`, `reorderLevel`, `location`
- **Contents:** 12 fast-moving service items (synthetic engine oils, OEM filters, ceramic brake pads, spark plugs, batteries, wiper blades) with opening stock balances and storage rack tags.

### 4. `04_services_sample.csv`
- **Sector:** Service Catalogue & Labour Rates
- **Fields:** `code`, `name`, `category`, `basePrice`, `estimatedDurationMinutes`, `description`
- **Contents:** 9 standard automotive workshop operations (Periodic Service, Express Lube, Brake Service, Laser Wheel Alignment, AC Deep Clean, OBD-II Diagnostics, Engine Tune-Up, Undercarriage Detailing).

### 5. `05_suppliers_sample.csv`
- **Sector:** Parts Vendors & Suppliers
- **Fields:** `name`, `contactPerson`, `phone`, `email`, `address`, `notes`
- **Contents:** 6 automotive parts distributors and oil importers.

### 6. `06_expenses_sample.csv`
- **Sector:** Operating Expenses & Overhead
- **Fields:** `expenseDate`, `category`, `amount`, `paymentMethod`, `paidTo`, `referenceNo`, `notes`
- **Contents:** 8 overhead expense entries (rent, 3-phase electricity, hydraulic lift maintenance, welfare, consumables, broadband, environmental waste disposal).

---

## Import Order Recommendation
When importing a fresh system from scratch:
1. **Customers (`01_customers_sample.csv`)** &rarr; ensures customer accounts and contact phone numbers exist.
2. **Vehicles (`02_vehicles_sample.csv`)** &rarr; automatically links vehicles to their owners via phone numbers.
3. **Suppliers (`05_suppliers_sample.csv`)** &rarr; establishes vendor contacts.
4. **Inventory Parts (`03_inventory_parts_sample.csv`)** &rarr; creates parts inventory and populates opening stock quantities into the stock ledger.
5. **Services Catalogue (`04_services_sample.csv`)** &rarr; populates the labour rate card.
6. **Expenses (`06_expenses_sample.csv`)** &rarr; establishes historical operating cost baselines for financial and BI dashboards.
