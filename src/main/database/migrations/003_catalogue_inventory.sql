-- Migration 003: Service Catalogue, Inventory, Suppliers, Stock Movements Ledger, and Purchases
-- Date: 2026-11-13

-- 1. Service Categories
CREATE TABLE IF NOT EXISTS service_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 2. Services
CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  category_id TEXT REFERENCES service_categories(id),
  name TEXT NOT NULL,
  description TEXT,
  base_price_amount INTEGER NOT NULL DEFAULT 0,
  labor_charge_amount INTEGER NOT NULL DEFAULT 0,
  estimated_minutes INTEGER,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 3. Service Vehicle Categories (many-to-many link between services and vehicle categories)
CREATE TABLE IF NOT EXISTS service_vehicle_categories (
  service_id TEXT NOT NULL REFERENCES services(id),
  vehicle_category_id TEXT NOT NULL REFERENCES vehicle_categories(id),
  PRIMARY KEY (service_id, vehicle_category_id)
);

-- 4. Inventory Categories
CREATE TABLE IF NOT EXISTS inventory_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 5. Units of Measure
CREATE TABLE IF NOT EXISTS units_of_measure (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  abbreviation TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 6. Inventory Items (CRITICAL: NEVER stores current_stock; stock is dynamically calculated from stock_movements ledger)
CREATE TABLE IF NOT EXISTS inventory_items (
  id TEXT PRIMARY KEY,
  sku TEXT UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category_id TEXT REFERENCES inventory_categories(id),
  unit_id TEXT REFERENCES units_of_measure(id),
  cost_price_amount INTEGER NOT NULL DEFAULT 0,
  selling_price_amount INTEGER NOT NULL DEFAULT 0,
  reorder_level REAL NOT NULL DEFAULT 0,
  location TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 7. Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 8. Stock Movements Ledger (CRITICAL: Append-only ledger. Records are NEVER updated or deleted)
CREATE TABLE IF NOT EXISTS stock_movements (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES inventory_items(id),
  movement_type TEXT NOT NULL, -- 'purchase_in', 'job_card_out', 'adjustment_in', 'adjustment_out', 'return_in', 'void_reversal'
  quantity REAL NOT NULL, -- positive for stock in, negative for stock out
  reference_type TEXT, -- 'purchase', 'job_card', 'adjustment', 'invoice_void'
  reference_id TEXT,
  reason TEXT, -- required for adjustments
  cost_price_amount INTEGER,
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL
);

-- 9. Purchases
CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY,
  supplier_id TEXT REFERENCES suppliers(id),
  purchase_number TEXT NOT NULL UNIQUE,
  purchase_date TEXT NOT NULL,
  total_amount INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_by TEXT REFERENCES users(id),
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 10. Purchase Items
CREATE TABLE IF NOT EXISTS purchase_items (
  id TEXT PRIMARY KEY,
  purchase_id TEXT NOT NULL REFERENCES purchases(id),
  item_id TEXT NOT NULL REFERENCES inventory_items(id),
  quantity REAL NOT NULL,
  unit_cost_amount INTEGER NOT NULL,
  total_amount INTEGER NOT NULL,
  stock_movement_id TEXT REFERENCES stock_movements(id),
  created_at TEXT NOT NULL
);

-- Performance and lookup indexes
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category_id);
CREATE INDEX IF NOT EXISTS idx_services_active ON services(is_active);
CREATE INDEX IF NOT EXISTS idx_svc_veh_service ON service_vehicle_categories(service_id);
CREATE INDEX IF NOT EXISTS idx_svc_veh_category ON service_vehicle_categories(vehicle_category_id);

CREATE INDEX IF NOT EXISTS idx_inv_items_sku ON inventory_items(sku);
CREATE INDEX IF NOT EXISTS idx_inv_items_category ON inventory_items(category_id);
CREATE INDEX IF NOT EXISTS idx_inv_items_active ON inventory_items(is_active);

CREATE INDEX IF NOT EXISTS idx_stock_movements_item ON stock_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created ON stock_movements(created_at);

CREATE INDEX IF NOT EXISTS idx_suppliers_active ON suppliers(is_active);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchases_number ON purchases(purchase_number);
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase ON purchase_items(purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_item ON purchase_items(item_id);

-- Seed Default Service Categories
INSERT OR IGNORE INTO service_categories (id, name, description, is_active, sort_order, created_at, updated_at) VALUES
  ('scat_general', 'Periodic Maintenance', 'Oil change, filter replacement, fluid checks and standard maintenance inspections', 1, 1, datetime('now'), datetime('now')),
  ('scat_engine', 'Engine & Mechanical', 'Engine diagnostics, overhaul, timing belts, cooling system, and transmission repairs', 1, 2, datetime('now'), datetime('now')),
  ('scat_brakes', 'Brakes & Suspension', 'Brake pad replacement, disc skimming, shock absorbers, and steering repairs', 1, 3, datetime('now'), datetime('now')),
  ('scat_electrical', 'Electrical & Diagnostics', 'Battery check, wiring diagnostics, alternator/starter repairs, scanner troubleshooting', 1, 4, datetime('now'), datetime('now')),
  ('scat_ac', 'Air Conditioning', 'A/C gas recharge, leak testing, cabin filter, and compressor service', 1, 5, datetime('now'), datetime('now')),
  ('scat_tires', 'Tire & Wheel', 'Wheel alignment, wheel balancing, tire rotation and puncture repair', 1, 6, datetime('now'), datetime('now')),
  ('scat_body', 'Body & Paint', 'Dent repair, panel painting, bumper fixing, and scratch removal', 1, 7, datetime('now'), datetime('now')),
  ('scat_wash', 'Detailing & Wash', 'Full body wash, interior vacuuming, engine bay wash, and cut & polish', 1, 8, datetime('now'), datetime('now'));

-- Seed Default Inventory Categories
INSERT OR IGNORE INTO inventory_categories (id, name, description, is_active, sort_order, created_at, updated_at) VALUES
  ('icat_fluids', 'Lubricants & Fluids', 'Engine oils, brake fluids, transmission oils, coolants', 1, 1, datetime('now'), datetime('now')),
  ('icat_filters', 'Filters', 'Oil filters, air filters, fuel filters, cabin filters', 1, 2, datetime('now'), datetime('now')),
  ('icat_brakes', 'Brake Parts', 'Brake pads, brake shoes, discs, drums, calipers', 1, 3, datetime('now'), datetime('now')),
  ('icat_ignition', 'Ignition & Electrical', 'Spark plugs, ignition coils, bulbs, fuses, sensors', 1, 4, datetime('now'), datetime('now')),
  ('icat_suspension', 'Suspension & Steering', 'Shock absorbers, ball joints, control arms, tie rods', 1, 5, datetime('now'), datetime('now')),
  ('icat_belts', 'Belts & Hoses', 'Timing belts, serpentine belts, radiator hoses', 1, 6, datetime('now'), datetime('now')),
  ('icat_batteries', 'Batteries', 'Vehicle starter batteries and auxiliary batteries', 1, 7, datetime('now'), datetime('now')),
  ('icat_tires', 'Tires & Tubes', 'Tires, inner tubes, and valve stems', 1, 8, datetime('now'), datetime('now')),
  ('icat_hardware', 'Fasteners & Hardware', 'Bolts, nuts, washers, clips, and standard workshop consumables', 1, 9, datetime('now'), datetime('now'));

-- Seed Default Units of Measure
INSERT OR IGNORE INTO units_of_measure (id, name, abbreviation, is_active, created_at, updated_at) VALUES
  ('unit_pcs', 'Piece', 'pcs', 1, datetime('now'), datetime('now')),
  ('unit_l', 'Liter', 'L', 1, datetime('now'), datetime('now')),
  ('unit_ml', 'Milliliter', 'ml', 1, datetime('now'), datetime('now')),
  ('unit_kg', 'Kilogram', 'kg', 1, datetime('now'), datetime('now')),
  ('unit_m', 'Meter', 'm', 1, datetime('now'), datetime('now')),
  ('unit_set', 'Set', 'set', 1, datetime('now'), datetime('now')),
  ('unit_can', 'Can', 'can', 1, datetime('now'), datetime('now')),
  ('unit_btl', 'Bottle', 'btl', 1, datetime('now'), datetime('now'));
