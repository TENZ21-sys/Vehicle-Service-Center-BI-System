-- Migration 004: Workshop Job Cards, Services, and Parts Integration
-- Date: 2026-11-13

-- 1. Job Cards Table
CREATE TABLE IF NOT EXISTS job_cards (
  id TEXT PRIMARY KEY,
  job_card_number TEXT NOT NULL UNIQUE,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
  appointment_id TEXT,
  quotation_id TEXT,
  technician_id TEXT REFERENCES users(id),
  assigned_by TEXT REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'Open',
  priority TEXT NOT NULL DEFAULT 'Normal',
  mileage_in INTEGER,
  mileage_out INTEGER,
  findings TEXT,
  internal_notes TEXT,
  customer_notes TEXT,
  received_at TEXT,
  started_at TEXT,
  completed_at TEXT,
  delivered_at TEXT,
  invoice_id TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 2. Job Card Services (Line items snapshotting catalogue prices and labor)
CREATE TABLE IF NOT EXISTS job_card_services (
  id TEXT PRIMARY KEY,
  job_card_id TEXT NOT NULL REFERENCES job_cards(id),
  service_id TEXT REFERENCES services(id),
  service_name TEXT NOT NULL,
  price_amount INTEGER NOT NULL DEFAULT 0,
  labor_amount INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Pending', -- 'Pending', 'In Progress', 'Completed'
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 3. Job Card Parts (Parts allocated from inventory with linked stock movements)
CREATE TABLE IF NOT EXISTS job_card_parts (
  id TEXT PRIMARY KEY,
  job_card_id TEXT NOT NULL REFERENCES job_cards(id),
  inventory_item_id TEXT NOT NULL REFERENCES inventory_items(id),
  quantity REAL NOT NULL,
  unit_price_amount INTEGER NOT NULL,
  total_amount INTEGER NOT NULL,
  stock_movement_id TEXT REFERENCES stock_movements(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Performance and lookup indexes
CREATE INDEX IF NOT EXISTS idx_job_cards_number ON job_cards(job_card_number);
CREATE INDEX IF NOT EXISTS idx_job_cards_customer ON job_cards(customer_id);
CREATE INDEX IF NOT EXISTS idx_job_cards_vehicle ON job_cards(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_job_cards_technician ON job_cards(technician_id);
CREATE INDEX IF NOT EXISTS idx_job_cards_status ON job_cards(status);
CREATE INDEX IF NOT EXISTS idx_job_cards_active ON job_cards(is_active);
CREATE INDEX IF NOT EXISTS idx_job_cards_created ON job_cards(created_at);

CREATE INDEX IF NOT EXISTS idx_job_card_services_card ON job_card_services(job_card_id);
CREATE INDEX IF NOT EXISTS idx_job_card_parts_card ON job_card_parts(job_card_id);
CREATE INDEX IF NOT EXISTS idx_job_card_parts_item ON job_card_parts(inventory_item_id);
