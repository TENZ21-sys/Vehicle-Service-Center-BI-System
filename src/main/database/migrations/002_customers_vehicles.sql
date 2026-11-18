-- 002_customers_vehicles.sql
-- Phase 2: Customers, Dynamic Vehicle Categories, Vehicle Registry, and Service Reminders

-- 1. Vehicle Categories (Dynamic Data)
CREATE TABLE IF NOT EXISTS vehicle_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  extra_fields TEXT,               -- JSON schema defining category-specific attributes
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 2. Customers
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone_primary TEXT NOT NULL,
  phone_secondary TEXT,
  email TEXT,
  address TEXT,
  nic TEXT,
  notes TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 3. Vehicles
CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  category_id TEXT REFERENCES vehicle_categories(id),
  registration_no TEXT NOT NULL,
  make TEXT,
  model TEXT,
  year INTEGER,
  color TEXT,
  vin TEXT,
  engine_number TEXT,
  fuel_type TEXT,
  transmission TEXT,
  extra_fields TEXT,               -- JSON values for category-specific fields
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 4. Service Reminders
CREATE TABLE IF NOT EXISTS service_reminders (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
  service_id TEXT,                 -- Linked service catalogue item (optional)
  reminder_type TEXT NOT NULL,     -- 'date' | 'mileage'
  due_date TEXT,                   -- YYYY-MM-DD
  due_mileage INTEGER,             -- target mileage threshold
  description TEXT NOT NULL,
  is_completed INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  completed_job_card_id TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone_primary);
CREATE INDEX IF NOT EXISTS idx_customers_nic ON customers(nic);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_active ON customers(is_active);

CREATE INDEX IF NOT EXISTS idx_vehicles_customer ON vehicles(customer_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_category ON vehicles(category_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_reg ON vehicles(registration_no);
CREATE INDEX IF NOT EXISTS idx_vehicles_vin ON vehicles(vin);
CREATE INDEX IF NOT EXISTS idx_vehicles_active ON vehicles(is_active);

CREATE INDEX IF NOT EXISTS idx_reminders_vehicle ON service_reminders(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_reminders_due_date ON service_reminders(due_date);
CREATE INDEX IF NOT EXISTS idx_reminders_completed ON service_reminders(is_completed);

-- Seed Default Vehicle Categories
INSERT OR IGNORE INTO vehicle_categories (id, name, description, extra_fields, sort_order, is_active, created_at, updated_at) VALUES
('cat_car', 'Car', 'Standard passenger cars and sedans', '[]', 1, 1, datetime('now'), datetime('now')),
('cat_motorcycle', 'Motorcycle / Scooter', 'Two-wheel motorbikes and scooters', '[]', 2, 1, datetime('now'), datetime('now')),
('cat_van', 'Van', 'Passenger and commercial transport vans', '[]', 3, 1, datetime('now'), datetime('now')),
('cat_suv', 'SUV / Crossover', 'Sport Utility Vehicles and 4x4s', '[]', 4, 1, datetime('now'), datetime('now')),
('cat_truck', 'Truck / Commercial Vehicle', 'Heavy commercial vehicles, lorries, and pickups', '[]', 5, 1, datetime('now'), datetime('now')),
('cat_three_wheeler', 'Three-Wheeler', 'Three-wheel auto rickshaws / tuk-tuks', '[]', 6, 1, datetime('now'), datetime('now'));
