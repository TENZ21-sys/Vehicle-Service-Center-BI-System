import { PermissionKey } from '../types/permission.types'
import { ALL_PERMISSIONS } from './permissions'

export interface DefaultRoleTemplate {
  name: string
  description: string
  isSystem: boolean
  isOwner: boolean
  permissions: PermissionKey[]
}

const allPermissionKeys: PermissionKey[] = ALL_PERMISSIONS.map((p) => p.key)

export const DEFAULT_ROLES: DefaultRoleTemplate[] = [
  {
    name: 'Business Owner / Admin',
    description: 'Full administrative access across all modules and settings. Cannot lose settings access.',
    isSystem: true,
    isOwner: true,
    permissions: allPermissionKeys
  },
  {
    name: 'Service Manager',
    description: 'Manages workshop workflow, job card assignment, technician progress, and quotations.',
    isSystem: true,
    isOwner: false,
    permissions: [
      'customers:view', 'customers:create', 'customers:edit',
      'vehicles:view', 'vehicles:create', 'vehicles:edit',
      'catalogue:view', 'catalogue:create', 'catalogue:edit',
      'appointments:view', 'appointments:create', 'appointments:edit', 'appointments:delete',
      'jobcards:view', 'jobcards:create', 'jobcards:edit', 'jobcards:assign', 'jobcards:update_progress',
      'quotations:view', 'quotations:create', 'quotations:approve',
      'inventory:view',
      'reports:view',
      'bi:view'
    ]
  },
  {
    name: 'Receptionist / Service Advisor',
    description: 'Customer reception, appointments, booking check-ins, and initial job card creation.',
    isSystem: true,
    isOwner: false,
    permissions: [
      'customers:view', 'customers:create', 'customers:edit',
      'vehicles:view', 'vehicles:create', 'vehicles:edit',
      'catalogue:view',
      'appointments:view', 'appointments:create', 'appointments:edit', 'appointments:delete',
      'jobcards:view', 'jobcards:create',
      'quotations:view', 'quotations:create'
    ]
  },
  {
    name: 'Cashier',
    description: 'Invoicing, direct POS sales, payment processing, and receipts.',
    isSystem: true,
    isOwner: false,
    permissions: [
      'customers:view',
      'vehicles:view',
      'catalogue:view',
      'jobcards:view',
      'invoices:view', 'invoices:create',
      'payments:view', 'payments:create',
      'reports:view'
    ]
  },
  {
    name: 'Inventory Manager',
    description: 'Stock management, purchase orders, inventory items, adjustments, and supplier tracking.',
    isSystem: true,
    isOwner: false,
    permissions: [
      'catalogue:view',
      'inventory:view', 'inventory:create', 'inventory:edit', 'inventory:adjust',
      'purchases:view', 'purchases:create',
      'reports:view', 'reports:export'
    ]
  },
  {
    name: 'Technician',
    description: 'Assigned job cards, logging service progress, recording inspection findings, and parts used.',
    isSystem: true,
    isOwner: false,
    permissions: [
      'vehicles:view',
      'catalogue:view',
      'jobcards:view', 'jobcards:update_progress',
      'inventory:view'
    ]
  },
  {
    name: 'Accountant',
    description: 'Financial summaries, expenses, reports, profit calculation, and audit viewing.',
    isSystem: true,
    isOwner: false,
    permissions: [
      'invoices:view',
      'payments:view',
      'purchases:view',
      'finance:view', 'finance:create_expense',
      'reports:view', 'reports:export',
      'bi:view',
      'audit:view'
    ]
  }
]

export const DEFAULT_SETTINGS: Record<string, Record<string, { value: unknown; valueType: 'string' | 'number' | 'boolean' | 'json' }>> = {
  business_profile: {
    business_name: { value: 'My Service Center', valueType: 'string' },
    address: { value: '', valueType: 'string' },
    phone: { value: '', valueType: 'string' },
    email: { value: '', valueType: 'string' },
    logo_path: { value: '', valueType: 'string' },
    currency_code: { value: 'LKR', valueType: 'string' },
    currency_symbol: { value: 'Rs.', valueType: 'string' },
    currency_decimals: { value: 2, valueType: 'number' }
  },
  feature_toggles: {
    module_appointments: { value: true, valueType: 'boolean' },
    module_quotations: { value: true, valueType: 'boolean' },
    module_inventory: { value: true, valueType: 'boolean' },
    module_finance: { value: true, valueType: 'boolean' },
    module_bi: { value: true, valueType: 'boolean' }
  },
  financial: {
    default_tax_rate: { value: 0, valueType: 'number' }, // basis points: 0 = 0%
    rounding_method: { value: 'nearest', valueType: 'string' },
    rounding_unit: { value: 1, valueType: 'number' },
    payment_methods: {
      value: ['Cash', 'Credit Card', 'Debit Card', 'Bank Transfer', 'Cheque'],
      valueType: 'json'
    }
  },
  numbering: {
    invoice_prefix: { value: 'INV', valueType: 'string' },
    job_card_prefix: { value: 'JC', valueType: 'string' },
    quotation_prefix: { value: 'QT', valueType: 'string' },
    purchase_prefix: { value: 'PO', valueType: 'string' },
    appointment_prefix: { value: 'APT', valueType: 'string' },
    expense_prefix: { value: 'EXP', valueType: 'string' }
  },
  workflow: {
    require_technician_assignment: { value: false, valueType: 'boolean' },
    track_mileage: { value: true, valueType: 'boolean' },
    require_delivery_mileage: { value: false, valueType: 'boolean' },
    auto_record_milestone_timestamps: { value: true, valueType: 'boolean' },
    job_card_statuses: {
      value: ['Open', 'In Progress', 'Waiting for Parts', 'Quality Check', 'Ready', 'Delivered'],
      valueType: 'json'
    },
    job_card_priorities: {
      value: ['Low', 'Normal', 'High', 'Urgent'],
      valueType: 'json'
    },
    reminder_intervals_days: {
      value: [30, 60, 90, 180, 365],
      valueType: 'json'
    }
  },
  appointments: {
    allow_overlapping_slots: { value: true, valueType: 'boolean' },
    default_slot_duration: { value: 60, valueType: 'number' },
    auto_advance_to_in_service: { value: true, valueType: 'boolean' }
  },
  quotations: {
    default_validity_days: { value: 14, valueType: 'number' },
    auto_allocate_parts_on_conversion: { value: true, valueType: 'boolean' },
    require_approval_before_conversion: { value: true, valueType: 'boolean' }
  },
  finance: {
    finance_enable_expenses: { value: true, valueType: 'boolean' },
    finance_enable_cash_register: { value: true, valueType: 'boolean' },
    finance_enable_cogs_tracking: { value: true, valueType: 'boolean' },
    default_expense_payment_method: { value: 'Cash', valueType: 'string' }
  },
  bi: {
    bi_enable_turnaround_metrics: { value: true, valueType: 'boolean' },
    bi_enable_technician_metrics: { value: true, valueType: 'boolean' },
    bi_enable_inventory_analytics: { value: true, valueType: 'boolean' },
    bi_enable_customer_analytics: { value: true, valueType: 'boolean' },
    enable_technician_commission_tracking: { value: false, valueType: 'boolean' },
    technician_commission_default_percent: { value: 10, valueType: 'number' },
    financial_year_start_month: { value: 1, valueType: 'number' }
  },
  inventory: {
    default_reorder_level: { value: 5, valueType: 'number' },
    allow_negative_stock: { value: false, valueType: 'boolean' }
  },
  system: {
    backup_auto_on_close: { value: true, valueType: 'boolean' },
    backup_retention_days: { value: 30, valueType: 'number' },
    export_enable_csv: { value: true, valueType: 'boolean' },
    audit_retention_days: { value: 90, valueType: 'number' },
    enable_system_diagnostics: { value: true, valueType: 'boolean' },
    emergency_recovery_key_hash: { value: '', valueType: 'string' },
    allow_passwordless_login: { value: false, valueType: 'boolean' }
  }
}
