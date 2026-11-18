-- Migration 005: Invoices, Invoice Items, and Payments (Shared Invoicing Engine & POS)
-- Date: 2026-11-13

-- 1. Invoices Table (Append-only / Immutable: never deleted, status moves forward, corrections via Void/Credit Note)
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  vehicle_id TEXT REFERENCES vehicles(id),
  job_card_id TEXT REFERENCES job_cards(id),
  quotation_id TEXT,
  invoice_type TEXT NOT NULL, -- 'job_card' or 'pos'
  status TEXT NOT NULL DEFAULT 'Unpaid', -- 'Unpaid', 'Partial', 'Paid', 'Void'
  subtotal_amount INTEGER NOT NULL DEFAULT 0,
  tax_amount INTEGER NOT NULL DEFAULT 0,
  discount_amount INTEGER NOT NULL DEFAULT 0,
  rounding_amount INTEGER NOT NULL DEFAULT 0,
  total_amount INTEGER NOT NULL,
  paid_amount INTEGER NOT NULL DEFAULT 0,
  due_amount INTEGER NOT NULL,
  notes TEXT,
  void_reason TEXT,
  voided_at TEXT,
  voided_by TEXT REFERENCES users(id),
  credit_note_of TEXT REFERENCES invoices(id),
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 2. Invoice Items Table
CREATE TABLE IF NOT EXISTS invoice_items (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL REFERENCES invoices(id),
  item_type TEXT NOT NULL, -- 'service' or 'part'
  reference_id TEXT,
  description TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 1,
  unit_price_amount INTEGER NOT NULL,
  cost_price_amount INTEGER NOT NULL DEFAULT 0,
  discount_amount INTEGER NOT NULL DEFAULT 0,
  tax_rate INTEGER NOT NULL DEFAULT 0, -- basis points (e.g. 1500 = 15.00%)
  tax_amount INTEGER NOT NULL DEFAULT 0,
  total_amount INTEGER NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

-- 3. Payments Table (Append-only ledger: payments are never edited or deleted)
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL REFERENCES invoices(id),
  payment_method TEXT NOT NULL,
  amount INTEGER NOT NULL,
  reference TEXT,
  notes TEXT,
  received_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL
);

-- Indexes for performance and lookup
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_vehicle ON invoices(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_invoices_job_card ON invoices(job_card_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_type ON invoices(invoice_type);
CREATE INDEX IF NOT EXISTS idx_invoices_credit_note ON invoices(credit_note_of);
CREATE INDEX IF NOT EXISTS idx_invoices_created ON invoices(created_at);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_ref ON invoice_items(reference_id);

CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_created ON payments(created_at);
