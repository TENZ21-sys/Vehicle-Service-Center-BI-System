import { DatabaseManager } from '../database/connection'
import { PermissionService } from './permissions.service'
import { AuditService } from './audit.service'
import { sessionManager } from './session'
import { ExportType, ExportResult } from '../../shared/types/backup.types'
import { ValidationError } from '../utils/errors'

export class ExportService {
  private dbManager: DatabaseManager
  private permService: PermissionService
  private audit: AuditService

  constructor(
    dbManager = DatabaseManager.getInstance(),
    permService = new PermissionService(),
    audit = new AuditService()
  ) {
    this.dbManager = dbManager
    this.permService = permService
    this.audit = audit
  }

  private escapeCsvCell(value: unknown): string {
    if (value === null || value === undefined) return ''
    const str = String(value)
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  private toCsv(headers: string[], rows: (string | number | boolean | null | undefined)[][]): string {
    const headerLine = headers.map((h) => this.escapeCsvCell(h)).join(',')
    const dataLines = rows.map((row) => row.map((cell) => this.escapeCsvCell(cell)).join(','))
    return [headerLine, ...dataLines].join('\r\n')
  }

  public exportData(type: ExportType): ExportResult {
    this.permService.requirePermission('reports:export')
    const session = sessionManager.requireSession()
    const db = this.dbManager.getActiveDb()
    const timestamp = new Date().toISOString().slice(0, 10)

    let filename = ''
    let csvContent = ''
    let rowCount = 0

    switch (type) {
      case 'customers': {
        filename = `customers_${timestamp}.csv`
        const headers = ['Customer ID', 'Full Name', 'Primary Phone', 'Secondary Phone', 'Email', 'Address', 'NIC', 'Active', 'Created At']
        const rows = db
          .prepare(
            `SELECT id, name, phone_primary, phone_secondary, email, address, nic, is_active, created_at
             FROM customers
             ORDER BY name ASC`
          )
          .all() as any[]

        rowCount = rows.length
        csvContent = this.toCsv(
          headers,
          rows.map((r) => [r.id, r.name, r.phone_primary, r.phone_secondary, r.email, r.address, r.nic, r.is_active ? 'Yes' : 'No', r.created_at])
        )
        break
      }

      case 'invoices': {
        filename = `invoices_${timestamp}.csv`
        const headers = [
          'Invoice Number',
          'Date',
          'Customer Name',
          'Vehicle Plate',
          'Type',
          'Status',
          'Subtotal',
          'Tax Amount',
          'Discount',
          'Total Amount',
          'Paid Amount',
          'Due Amount',
          'Notes'
        ]
        const rows = db
          .prepare(
            `SELECT inv.*, c.name as customer_name, v.registration_no as vehicle_reg
             FROM invoices inv
             JOIN customers c ON inv.customer_id = c.id
             LEFT JOIN vehicles v ON inv.vehicle_id = v.id
             ORDER BY inv.created_at DESC`
          )
          .all() as any[]

        rowCount = rows.length
        csvContent = this.toCsv(
          headers,
          rows.map((r) => [
            r.invoice_number,
            r.created_at ? r.created_at.split('T')[0] : '',
            r.customer_name,
            r.vehicle_reg || 'N/A',
            r.invoice_type,
            r.status,
            (r.subtotal_amount / 100).toFixed(2),
            (r.tax_amount / 100).toFixed(2),
            (r.discount_amount / 100).toFixed(2),
            (r.total_amount / 100).toFixed(2),
            (r.paid_amount / 100).toFixed(2),
            (r.due_amount / 100).toFixed(2),
            r.notes || ''
          ])
        )
        break
      }

      case 'expenses': {
        filename = `expenses_${timestamp}.csv`
        const headers = [
          'Expense Number',
          'Date',
          'Category',
          'Amount',
          'Payment Method',
          'Paid To',
          'Reference No',
          'Notes'
        ]
        const rows = db
          .prepare(
            `SELECT e.*, c.name as category_name
             FROM expenses e
             JOIN expense_categories c ON e.category_id = c.id
             WHERE e.is_active = 1
             ORDER BY e.expense_date DESC, e.created_at DESC`
          )
          .all() as any[]

        rowCount = rows.length
        csvContent = this.toCsv(
          headers,
          rows.map((r) => [
            r.expense_number,
            r.expense_date,
            r.category_name,
            (r.amount / 100).toFixed(2),
            r.payment_method,
            r.paid_to || '',
            r.reference_no || '',
            r.notes || ''
          ])
        )
        break
      }

      case 'inventory': {
        filename = `inventory_valuation_${timestamp}.csv`
        const headers = [
          'SKU',
          'Item Name',
          'Category',
          'Unit',
          'Qty on Hand',
          'Cost Price',
          'Selling Price',
          'Total Asset Value (Cost)',
          'Total Retail Value'
        ]
        const rows = db
          .prepare(
            `SELECT i.*, c.name as category_name, u.abbreviation as unit_abbr
             FROM inventory_items i
             LEFT JOIN inventory_categories c ON i.category_id = c.id
             LEFT JOIN units_of_measure u ON i.unit_id = u.id
             WHERE i.is_active = 1
             ORDER BY i.name ASC`
          )
          .all() as any[]

        rowCount = rows.length
        csvContent = this.toCsv(
          headers,
          rows.map((r) => [
            r.sku,
            r.name,
            r.category_name || 'General',
            r.unit_abbr || 'pcs',
            r.quantity_on_hand,
            (r.cost_price_amount / 100).toFixed(2),
            (r.selling_price_amount / 100).toFixed(2),
            ((r.quantity_on_hand * r.cost_price_amount) / 100).toFixed(2),
            ((r.quantity_on_hand * r.selling_price_amount) / 100).toFixed(2)
          ])
        )
        break
      }

      case 'stock_movements': {
        filename = `stock_movements_${timestamp}.csv`
        const headers = [
          'Movement ID',
          'Timestamp',
          'SKU',
          'Item Name',
          'Movement Type',
          'Quantity Delta',
          'Reference Type',
          'Reason'
        ]
        const rows = db
          .prepare(
            `SELECT m.*, i.sku, i.name as item_name
             FROM stock_movements m
             JOIN inventory_items i ON m.item_id = i.id
             ORDER BY m.created_at DESC
             LIMIT 1000`
          )
          .all() as any[]

        rowCount = rows.length
        csvContent = this.toCsv(
          headers,
          rows.map((r) => [
            r.id,
            r.created_at,
            r.sku,
            r.item_name,
            r.movement_type,
            r.quantity,
            r.reference_type || '',
            r.reason || ''
          ])
        )
        break
      }

      default:
        throw new ValidationError(`Unknown export type: ${type}`)
    }

    this.audit.record({
      userId: session.userId,
      action: 'DATA_EXPORTED',
      entityType: 'export',
      entityId: type,
      metadata: { type, rowCount, filename }
    })

    return {
      filename,
      rowCount,
      csvContent
    }
  }
}
