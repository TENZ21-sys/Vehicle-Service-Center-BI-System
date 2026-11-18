-- Migration 007: Expenses, Finance & Business Intelligence (BI) Analytics
-- Date: 2026-11-13

-- 1. Dynamic Expense Categories Table
CREATE TABLE IF NOT EXISTS expense_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 2. Operational Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  expense_number TEXT NOT NULL UNIQUE,
  category_id TEXT NOT NULL REFERENCES expense_categories(id),
  amount INTEGER NOT NULL, -- MoneyAmount in smallest unit
  payment_method TEXT NOT NULL DEFAULT 'Cash', -- 'Cash', 'Credit Card', 'Debit Card', 'Bank Transfer', 'Cheque'
  paid_to TEXT,
  reference_no TEXT,
  notes TEXT,
  expense_date TEXT NOT NULL, -- YYYY-MM-DD
  created_by TEXT REFERENCES users(id),
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_expenses_number ON expenses(expense_number);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_payment_method ON expenses(payment_method);
CREATE INDEX IF NOT EXISTS idx_expense_categories_name ON expense_categories(name);

-- 3. Seed Default Expense Categories
INSERT OR IGNORE INTO expense_categories (id, name, description, is_active, created_at, updated_at)
VALUES
  ('exp-cat-rent', 'Rent & Workshop Premises', 'Workshop rental and physical building lease', 1, datetime('now'), datetime('now')),
  ('exp-cat-utilities', 'Electricity & Utilities', 'Power, water, internet, and municipal utility bills', 1, datetime('now'), datetime('now')),
  ('exp-cat-wages', 'Technician Wages & Salaries', 'Staff pay, overtime, and workshop technician compensation', 1, datetime('now'), datetime('now')),
  ('exp-cat-supplies', 'Shop Supplies & Consumables', 'Shop rags, lubricants, degreasers, cleaning solvents', 1, datetime('now'), datetime('now')),
  ('exp-cat-maintenance', 'Equipment Maintenance & Tools', 'Lift maintenance, compressor servicing, diagnostic tool subscriptions', 1, datetime('now'), datetime('now')),
  ('exp-cat-marketing', 'Marketing & Advertising', 'Social media ads, signage, local flyers, promotional banners', 1, datetime('now'), datetime('now')),
  ('exp-cat-taxes', 'Taxes & Business Licenses', 'Municipal operating licenses, statutory fees, local taxes', 1, datetime('now'), datetime('now')),
  ('exp-cat-misc', 'Miscellaneous Overhead', 'Incidental office and unexpected operational costs', 1, datetime('now'), datetime('now'));

-- 4. Sequence counter for expenses
INSERT OR IGNORE INTO sequences (
  id, entity_type, prefix, current_number, format_template, reset_yearly, current_year, updated_at
) VALUES (
  'seq-expense', 'expense', 'EXP', 0, '{prefix}-{year}-{number:4}', 1, 2026, datetime('now')
);
