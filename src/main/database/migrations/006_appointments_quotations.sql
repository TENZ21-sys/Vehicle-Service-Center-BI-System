-- Migration 006: Appointments & Quotations (Pre-service Estimation & Scheduling)
-- Date: 2026-11-13

-- 1. Appointments Table
CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  appointment_number TEXT NOT NULL UNIQUE,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
  scheduled_date TEXT NOT NULL, -- YYYY-MM-DD
  scheduled_time TEXT NOT NULL, -- HH:mm (24-hour)
  estimated_duration_minutes INTEGER NOT NULL DEFAULT 60,
  technician_id TEXT REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'Scheduled', -- 'Scheduled', 'Confirmed', 'In Service', 'Completed', 'Cancelled', 'No Show'
  requested_services TEXT, -- JSON array of service names or descriptions
  notes TEXT,
  job_card_id TEXT REFERENCES job_cards(id),
  created_by TEXT REFERENCES users(id),
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 2. Quotations Table (Formal Cost Estimates)
CREATE TABLE IF NOT EXISTS quotations (
  id TEXT PRIMARY KEY,
  quotation_number TEXT NOT NULL UNIQUE,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  vehicle_id TEXT REFERENCES vehicles(id),
  status TEXT NOT NULL DEFAULT 'Draft', -- 'Draft', 'Sent', 'Approved', 'Rejected', 'Expired'
  subtotal_amount INTEGER NOT NULL DEFAULT 0,
  tax_amount INTEGER NOT NULL DEFAULT 0,
  discount_amount INTEGER NOT NULL DEFAULT 0,
  total_amount INTEGER NOT NULL DEFAULT 0,
  validity_days INTEGER NOT NULL DEFAULT 14,
  expires_at TEXT NOT NULL,
  notes TEXT,
  job_card_id TEXT REFERENCES job_cards(id),
  created_by TEXT REFERENCES users(id),
  approved_by TEXT REFERENCES users(id),
  approved_at TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 3. Quotation Items Table
CREATE TABLE IF NOT EXISTS quotation_items (
  id TEXT PRIMARY KEY,
  quotation_id TEXT NOT NULL REFERENCES quotations(id),
  item_type TEXT NOT NULL, -- 'service' or 'part'
  reference_id TEXT,
  description TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 1,
  unit_price_amount INTEGER NOT NULL DEFAULT 0,
  cost_price_amount INTEGER NOT NULL DEFAULT 0,
  discount_amount INTEGER NOT NULL DEFAULT 0,
  tax_rate INTEGER NOT NULL DEFAULT 0,
  tax_amount INTEGER NOT NULL DEFAULT 0,
  total_amount INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

-- Indexes for Appointments
CREATE INDEX IF NOT EXISTS idx_appointments_number ON appointments(appointment_number);
CREATE INDEX IF NOT EXISTS idx_appointments_customer ON appointments(customer_id);
CREATE INDEX IF NOT EXISTS idx_appointments_vehicle ON appointments(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_job_card ON appointments(job_card_id);

-- Indexes for Quotations
CREATE INDEX IF NOT EXISTS idx_quotations_number ON quotations(quotation_number);
CREATE INDEX IF NOT EXISTS idx_quotations_customer ON quotations(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotations_vehicle ON quotations(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotations_job_card ON quotations(job_card_id);
CREATE INDEX IF NOT EXISTS idx_quotations_expires ON quotations(expires_at);

-- Indexes for Quotation Items
CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation ON quotation_items(quotation_id);
CREATE INDEX IF NOT EXISTS idx_quotation_items_ref ON quotation_items(reference_id);

-- Ensure sequence for 'appointment' exists
INSERT OR IGNORE INTO sequences (
  id, entity_type, prefix, current_number, format_template, reset_yearly, current_year, updated_at
) VALUES (
  'seq-appointment', 'appointment', 'APT', 0, '{prefix}-{year}-{number:4}', 1, 2026, datetime('now')
);
