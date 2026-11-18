import { PermissionKey } from '../types/permission.types'

export interface PermissionDefinition {
  key: PermissionKey
  module: string
  description: string
}

export const ALL_PERMISSIONS: PermissionDefinition[] = [
  // Customers
  { key: 'customers:view', module: 'customers', description: 'View customer records and profiles' },
  { key: 'customers:create', module: 'customers', description: 'Create new customer records' },
  { key: 'customers:edit', module: 'customers', description: 'Update existing customer information' },
  { key: 'customers:delete', module: 'customers', description: 'Deactivate / archive customer records' },

  // Vehicles
  { key: 'vehicles:view', module: 'vehicles', description: 'View vehicle records and history' },
  { key: 'vehicles:create', module: 'vehicles', description: 'Register new vehicles' },
  { key: 'vehicles:edit', module: 'vehicles', description: 'Update vehicle information' },
  { key: 'vehicles:delete', module: 'vehicles', description: 'Deactivate / archive vehicles' },

  // Catalogue
  { key: 'catalogue:view', module: 'catalogue', description: 'View service catalogue and prices' },
  { key: 'catalogue:create', module: 'catalogue', description: 'Add new services to catalogue' },
  { key: 'catalogue:edit', module: 'catalogue', description: 'Update service catalogue items and prices' },
  { key: 'catalogue:delete', module: 'catalogue', description: 'Deactivate services from catalogue' },

  // Appointments
  { key: 'appointments:view', module: 'appointments', description: 'View appointments and schedule' },
  { key: 'appointments:create', module: 'appointments', description: 'Book appointments or walk-ins' },
  { key: 'appointments:edit', module: 'appointments', description: 'Reschedule or edit appointments' },
  { key: 'appointments:delete', module: 'appointments', description: 'Cancel appointments' },

  // Job Cards
  { key: 'jobcards:view', module: 'jobcards', description: 'View workshop job cards' },
  { key: 'jobcards:create', module: 'jobcards', description: 'Create new job cards' },
  { key: 'jobcards:edit', module: 'jobcards', description: 'Edit job card details' },
  { key: 'jobcards:assign', module: 'jobcards', description: 'Assign technicians to job cards' },
  { key: 'jobcards:update_progress', module: 'jobcards', description: 'Update work progress, findings, and parts used' },

  // Invoices & Billing
  { key: 'invoices:view', module: 'invoices', description: 'View invoices and billing history' },
  { key: 'invoices:create', module: 'invoices', description: 'Create job-card invoices and direct POS sales' },
  { key: 'invoices:void', module: 'invoices', description: 'Void invoices and issue credit notes' },

  // Payments
  { key: 'payments:view', module: 'payments', description: 'View payment history and receipts' },
  { key: 'payments:create', module: 'payments', description: 'Record payments against invoices' },

  // Inventory
  { key: 'inventory:view', module: 'inventory', description: 'View inventory items and stock levels' },
  { key: 'inventory:create', module: 'inventory', description: 'Add new items to inventory' },
  { key: 'inventory:edit', module: 'inventory', description: 'Edit item details and reorder thresholds' },
  { key: 'inventory:adjust', module: 'inventory', description: 'Record manual stock adjustments with reasons' },

  // Purchases
  { key: 'purchases:view', module: 'purchases', description: 'View supplier purchases and stock intake' },
  { key: 'purchases:create', module: 'purchases', description: 'Record new purchase orders / received stock' },

  // Quotations
  { key: 'quotations:view', module: 'quotations', description: 'View quotations' },
  { key: 'quotations:create', module: 'quotations', description: 'Draft and create quotations' },
  { key: 'quotations:approve', module: 'quotations', description: 'Approve or reject quotations' },

  // Settings
  { key: 'settings:view', module: 'settings', description: 'View business settings' },
  { key: 'settings:edit', module: 'settings', description: 'Update profile, toggles, and financial options' },
  { key: 'settings:users', module: 'settings', description: 'Manage staff accounts and credentials' },
  { key: 'settings:roles', module: 'settings', description: 'Create and configure user roles' },
  { key: 'settings:permissions', module: 'settings', description: 'Edit role permission matrices' },

  // Reports & BI
  { key: 'reports:view', module: 'reports', description: 'View operational and sales reports' },
  { key: 'reports:export', module: 'reports', description: 'Export report data' },
  { key: 'finance:view', module: 'finance', description: 'View income/expense and profit summaries' },
  { key: 'finance:create_expense', module: 'finance', description: 'Record operational expenses' },
  { key: 'bi:view', module: 'bi', description: 'View Business Intelligence dashboards' },

  // Security & Audit
  { key: 'audit:view', module: 'audit', description: 'View system activity and audit trail' },
  { key: 'backup:create', module: 'backup', description: 'Create business database backups' },
  { key: 'backup:restore', module: 'backup', description: 'Restore business database from backup' }
]
