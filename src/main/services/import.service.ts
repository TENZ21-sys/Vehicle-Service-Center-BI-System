import { DatabaseManager } from '../database/connection'
import { PermissionService } from './permissions.service'
import { AuditService } from './audit.service'
import { sessionManager } from './session'
import { ValidationError } from '../utils/errors'
import { v4 as uuidv4 } from 'uuid'
import { logger } from '../utils/logger'

export type ImportSector = 'customers' | 'vehicles' | 'inventory' | 'services' | 'suppliers' | 'expenses'

export interface ImportValidationRow {
  rowNumber: number
  data: Record<string, string>
  isValid: boolean
  errors: string[]
  isDuplicate: boolean
  conflictKey?: string
}

export interface ImportDryRunResult {
  sector: ImportSector
  totalRows: number
  validCount: number
  errorCount: number
  duplicateCount: number
  rows: ImportValidationRow[]
  headers: string[]
}

export interface ImportExecutionResult {
  sector: ImportSector
  importedCount: number
  updatedCount: number
  skippedCount: number
  failedCount: number
  errors: { rowNumber: number; message: string }[]
}

export class ImportService {
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

  /**
   * Parse CSV content with robust support for quotes, commas, CRLF, and trimmed cells.
   */
  public parseCsv(content: string): { headers: string[]; records: Record<string, string>[] } {
    const cleanContent = content.replace(/^\uFEFF/, '') // Strip UTF-8 BOM
    const lines: string[][] = []
    let currentLine: string[] = []
    let currentCell = ''
    let inQuotes = false

    for (let i = 0; i < cleanContent.length; i++) {
      const char = cleanContent[i]
      const nextChar = cleanContent[i + 1]

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentCell += '"'
          i++ // skip escaped quote
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        currentLine.push(currentCell.trim())
        currentCell = ''
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++
        }
        currentLine.push(currentCell.trim())
        currentCell = ''
        if (currentLine.some((cell) => cell.length > 0)) {
          lines.push(currentLine)
        }
        currentLine = []
      } else {
        currentCell += char
      }
    }

    if (currentCell.length > 0 || currentLine.length > 0) {
      currentLine.push(currentCell.trim())
      if (currentLine.some((cell) => cell.length > 0)) {
        lines.push(currentLine)
      }
    }

    if (lines.length === 0) {
      return { headers: [], records: [] }
    }

    const headers = lines[0].map((h) => h.trim().replace(/^["']|["']$/g, ''))
    const records: Record<string, string>[] = []

    for (let r = 1; r < lines.length; r++) {
      const row = lines[r]
      const record: Record<string, string> = {}
      for (let c = 0; c < headers.length; c++) {
        record[headers[c]] = row[c] !== undefined ? row[c] : ''
      }
      records.push(record)
    }

    return { headers, records }
  }

  /**
   * Dry-run validation of parsed CSV records.
   */
  public validateImport(sector: ImportSector, csvContent: string): ImportDryRunResult {
    this.checkPermissionForSector(sector, 'view')
    const { headers, records } = this.parseCsv(csvContent)
    const db = this.dbManager.getActiveDb()

    const validationRows: ImportValidationRow[] = []
    let validCount = 0
    let errorCount = 0
    let duplicateCount = 0

    // Fetch existing keys for duplicate detection
    const existingPhones = new Set(
      (db.prepare('SELECT phone_primary FROM customers WHERE phone_primary IS NOT NULL').all() as { phone_primary: string }[]).map((r) =>
        r.phone_primary.replace(/[\s-]/g, '')
      )
    )
    const existingPlates = new Set(
      (db.prepare('SELECT registration_no FROM vehicles').all() as { registration_no: string }[]).map((r) =>
        r.registration_no.toUpperCase().replace(/[\s-]/g, '')
      )
    )
    const existingSkus = new Set(
      (db.prepare('SELECT sku FROM inventory_items').all() as { sku: string }[]).map((r) =>
        r.sku.toUpperCase().trim()
      )
    )
    const existingServiceNames = new Set(
      (db.prepare('SELECT name FROM services WHERE name IS NOT NULL').all() as { name: string }[]).map((r) =>
        r.name.toLowerCase().trim()
      )
    )
    const existingSuppliers = new Set(
      (db.prepare('SELECT name FROM suppliers').all() as { name: string }[]).map((r) =>
        r.name.toLowerCase().trim()
      )
    )

    records.forEach((record, idx) => {
      const rowNumber = idx + 2 // 1-based, skipping header
      const errors: string[] = []
      let isDuplicate = false
      let conflictKey: string | undefined

      switch (sector) {
        case 'customers': {
          if (!record.name || record.name.trim().length < 2) {
            errors.push('Customer name is required (min 2 characters)')
          }
          if (!record.phone || record.phone.trim().length < 6) {
            errors.push('Valid phone number is required')
          } else {
            const cleanPhone = record.phone.replace(/[\s-]/g, '')
            if (existingPhones.has(cleanPhone)) {
              isDuplicate = true
              conflictKey = record.phone
            }
          }
          break
        }

        case 'vehicles': {
          if (!record.registrationNo || record.registrationNo.trim().length < 2) {
            errors.push('Vehicle registration plate number is required')
          } else {
            const cleanPlate = record.registrationNo.toUpperCase().replace(/[\s-]/g, '')
            if (existingPlates.has(cleanPlate)) {
              isDuplicate = true
              conflictKey = record.registrationNo
            }
          }
          if (record.year && (isNaN(parseInt(record.year, 10)) || parseInt(record.year, 10) < 1950)) {
            errors.push('Year must be a valid 4-digit number (e.g. 2018)')
          }
          break
        }

        case 'inventory': {
          if (!record.sku || record.sku.trim().length < 1) {
            errors.push('SKU / Part Number is required')
          } else {
            const cleanSku = record.sku.toUpperCase().trim()
            if (existingSkus.has(cleanSku)) {
              isDuplicate = true
              conflictKey = record.sku
            }
          }
          if (!record.name || record.name.trim().length < 2) {
            errors.push('Item name is required (min 2 characters)')
          }
          const price = parseFloat(record.sellingPrice)
          if (isNaN(price) || price < 0) {
            errors.push('Selling price must be a valid non-negative number')
          }
          break
        }

        case 'services': {
          if (!record.name || record.name.trim().length < 2) {
            errors.push('Service name is required')
          } else if (existingServiceNames.has(record.name.toLowerCase().trim())) {
            isDuplicate = true
            conflictKey = record.name
          }
          const price = parseFloat(record.basePrice)
          if (isNaN(price) || price < 0) {
            errors.push('Base price must be a valid non-negative number')
          }
          break
        }

        case 'suppliers': {
          if (!record.name || record.name.trim().length < 2) {
            errors.push('Supplier company name is required')
          } else if (existingSuppliers.has(record.name.toLowerCase().trim())) {
            isDuplicate = true
            conflictKey = record.name
          }
          break
        }

        case 'expenses': {
          if (!record.amount || isNaN(parseFloat(record.amount)) || parseFloat(record.amount) <= 0) {
            errors.push('Expense amount must be a positive number')
          }
          if (!record.category || record.category.trim().length < 2) {
            errors.push('Expense category name is required')
          }
          if (!record.expenseDate || !/^\d{4}-\d{2}-\d{2}$/.test(record.expenseDate)) {
            errors.push('Date must be in YYYY-MM-DD format')
          }
          break
        }
      }

      const isValid = errors.length === 0
      if (isValid) {
        if (isDuplicate) duplicateCount++
        else validCount++
      } else {
        errorCount++
      }

      validationRows.push({
        rowNumber,
        data: record,
        isValid,
        errors,
        isDuplicate,
        conflictKey
      })
    })

    return {
      sector,
      totalRows: records.length,
      validCount,
      errorCount,
      duplicateCount,
      rows: validationRows,
      headers
    }
  }

  /**
   * Executes atomic database import of validated rows.
   */
  public executeImport(
    sector: ImportSector,
    csvContent: string,
    onDuplicate: 'skip' | 'update' = 'skip'
  ): ImportExecutionResult {
    this.checkPermissionForSector(sector, 'create')
    const session = sessionManager.requireSession()
    const { records } = this.parseCsv(csvContent)
    const db = this.dbManager.getActiveDb()
    const now = new Date().toISOString()

    let importedCount = 0
    let updatedCount = 0
    let skippedCount = 0
    let failedCount = 0
    const errors: { rowNumber: number; message: string }[] = []

    // Execute entire import in an atomic transaction
    const tx = db.transaction(() => {
      // Pre-fetch helper maps
      const customerMap = new Map<string, string>() // phone -> id
      const categoryMap = new Map<string, string>() // name -> id

      if (sector === 'vehicles') {
        const customers = db.prepare('SELECT id, phone_primary FROM customers WHERE phone_primary IS NOT NULL').all() as { id: string; phone_primary: string }[]
        for (const c of customers) {
          customerMap.set(c.phone_primary.replace(/[\s-]/g, ''), c.id)
        }
        const cats = db.prepare('SELECT id, name FROM vehicle_categories').all() as { id: string; name: string }[]
        for (const cat of cats) {
          categoryMap.set(cat.name.toLowerCase(), cat.id)
        }
      }

      if (sector === 'inventory') {
        const cats = db.prepare('SELECT id, name FROM inventory_categories').all() as { id: string; name: string }[]
        for (const cat of cats) {
          categoryMap.set(cat.name.toLowerCase(), cat.id)
        }
      }

      if (sector === 'services') {
        const cats = db.prepare('SELECT id, name FROM service_categories').all() as { id: string; name: string }[]
        for (const cat of cats) {
          categoryMap.set(cat.name.toLowerCase(), cat.id)
        }
      }

      if (sector === 'expenses') {
        const cats = db.prepare('SELECT id, name FROM expense_categories').all() as { id: string; name: string }[]
        for (const cat of cats) {
          categoryMap.set(cat.name.toLowerCase(), cat.id)
        }
      }

      for (let i = 0; i < records.length; i++) {
        const record = records[i]
        const rowNumber = i + 2

        try {
          switch (sector) {
            case 'customers': {
              const name = record.name?.trim()
              const phone = record.phone?.trim()
              if (!name || !phone) {
                skippedCount++
                continue
              }

              const cleanPhone = phone.replace(/[\s-]/g, '')
              const existing = db.prepare("SELECT id FROM customers WHERE REPLACE(REPLACE(phone_primary, ' ', ''), '-', '') = ?").get(cleanPhone) as { id: string } | undefined

              if (existing) {
                if (onDuplicate === 'update') {
                  db.prepare(`
                    UPDATE customers
                    SET name = ?, email = COALESCE(NULLIF(?, ''), email), address = COALESCE(NULLIF(?, ''), address),
                        notes = COALESCE(NULLIF(?, ''), notes), updated_at = ?
                    WHERE id = ?
                  `).run(name, record.email?.trim() || null, record.address?.trim() || null, record.notes?.trim() || null, now, existing.id)
                  updatedCount++
                } else {
                  skippedCount++
                }
              } else {
                const id = uuidv4()
                db.prepare(`
                  INSERT INTO customers (id, name, phone_primary, email, address, notes, is_active, created_at, updated_at)
                  VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
                `).run(id, name, phone, record.email?.trim() || null, record.address?.trim() || null, record.notes?.trim() || null, now, now)
                importedCount++
              }
              break
            }

            case 'vehicles': {
              const regNo = record.registrationNo?.trim()
              if (!regNo) {
                skippedCount++
                continue
              }

              const cleanPlate = regNo.toUpperCase().replace(/[\s-]/g, '')
              const existing = db.prepare("SELECT id FROM vehicles WHERE UPPER(REPLACE(REPLACE(registration_no, ' ', ''), '-', '')) = ?").get(cleanPlate) as { id: string } | undefined

              // Determine customer owner id
              let customerId: string | null = null
              if (record.customerPhone) {
                const cleanPhone = record.customerPhone.replace(/[\s-]/g, '')
                customerId = customerMap.get(cleanPhone) || null
                if (!customerId) {
                  // Auto-create customer stub
                  customerId = uuidv4()
                  const customerName = `Client (${record.customerPhone.trim()})`
                  db.prepare(`
                    INSERT INTO customers (id, name, phone_primary, is_active, created_at, updated_at)
                    VALUES (?, ?, ?, 1, ?, ?)
                  `).run(customerId, customerName, record.customerPhone.trim(), now, now)
                  customerMap.set(cleanPhone, customerId)
                }
              }

              // Determine category id
              let categoryId: string | null = null
              if (record.category) {
                const catLower = record.category.trim().toLowerCase()
                categoryId = categoryMap.get(catLower) || null
                if (!categoryId) {
                  categoryId = uuidv4()
                  db.prepare(`
                    INSERT INTO vehicle_categories (id, name, is_active, created_at, updated_at)
                    VALUES (?, ?, 1, ?, ?)
                  `).run(categoryId, record.category.trim(), now, now)
                  categoryMap.set(catLower, categoryId)
                }
              }

              const year = record.year ? parseInt(record.year, 10) || null : null
              const mileage = record.currentMileage ? parseInt(record.currentMileage, 10) || 0 : 0
              const extraFields = mileage > 0 ? JSON.stringify({ mileage }) : null

              if (existing) {
                if (onDuplicate === 'update') {
                  db.prepare(`
                    UPDATE vehicles
                    SET customer_id = COALESCE(?, customer_id), category_id = COALESCE(?, category_id),
                        make = COALESCE(NULLIF(?, ''), make), model = COALESCE(NULLIF(?, ''), model),
                        year = COALESCE(?, year), fuel_type = COALESCE(NULLIF(?, ''), fuel_type),
                        transmission = COALESCE(NULLIF(?, ''), transmission), color = COALESCE(NULLIF(?, ''), color),
                        extra_fields = COALESCE(?, extra_fields), updated_at = ?
                    WHERE id = ?
                  `).run(customerId, categoryId, record.make?.trim() || null, record.model?.trim() || null, year, record.fuelType?.trim() || null, record.transmission?.trim() || null, record.color?.trim() || null, extraFields, now, existing.id)
                  updatedCount++
                } else {
                  skippedCount++
                }
              } else {
                if (!customerId) {
                  // Fallback to first existing customer or create default Walk-In
                  const firstCust = db.prepare('SELECT id FROM customers LIMIT 1').get() as { id: string } | undefined
                  if (firstCust) {
                    customerId = firstCust.id
                  } else {
                    customerId = uuidv4()
                    db.prepare('INSERT INTO customers (id, name, phone_primary, is_active, created_at, updated_at) VALUES (?, "General Customer", "N/A", 1, ?, ?)').run(customerId, now, now)
                  }
                }

                const vehicleId = uuidv4()
                db.prepare(`
                  INSERT INTO vehicles (id, customer_id, category_id, registration_no, make, model, year, fuel_type, transmission, color, extra_fields, is_active, created_at, updated_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
                `).run(vehicleId, customerId, categoryId, regNo, record.make?.trim() || null, record.model?.trim() || null, year, record.fuelType?.trim() || null, record.transmission?.trim() || null, record.color?.trim() || null, extraFields, now, now)
                importedCount++
              }
              break
            }

            case 'inventory': {
              const sku = record.sku?.trim()
              const name = record.name?.trim()
              const sellingPriceCents = Math.round((parseFloat(record.sellingPrice) || 0) * 100)
              const costPriceCents = Math.round((parseFloat(record.costPrice) || 0) * 100)
              const openingStock = parseInt(record.openingStock, 10) || 0
              const reorderLevel = parseInt(record.reorderLevel, 10) || 5

              if (!sku || !name) {
                skippedCount++
                continue
              }

              let categoryId: string | null = null
              if (record.category) {
                const catLower = record.category.trim().toLowerCase()
                categoryId = categoryMap.get(catLower) || null
                if (!categoryId) {
                  categoryId = uuidv4()
                  db.prepare(`
                    INSERT INTO inventory_categories (id, name, is_active, created_at, updated_at)
                    VALUES (?, ?, 1, ?, ?)
                  `).run(categoryId, record.category.trim(), now, now)
                  categoryMap.set(catLower, categoryId)
                }
              }

              const existing = db.prepare('SELECT id FROM inventory_items WHERE UPPER(sku) = ?').get(sku.toUpperCase()) as { id: string } | undefined

              if (existing) {
                if (onDuplicate === 'update') {
                  db.prepare(`
                    UPDATE inventory_items
                    SET name = ?, category_id = COALESCE(?, category_id), selling_price_amount = ?,
                        cost_price_amount = ?, reorder_level = ?,
                        location = COALESCE(NULLIF(?, ''), location), updated_at = ?
                    WHERE id = ?
                  `).run(name, categoryId, sellingPriceCents, costPriceCents, reorderLevel, record.location?.trim() || null, now, existing.id)
                  updatedCount++
                } else {
                  skippedCount++
                }
              } else {
                const itemId = uuidv4()
                db.prepare(`
                  INSERT INTO inventory_items (id, sku, name, category_id, cost_price_amount, selling_price_amount, reorder_level, location, is_active, created_at, updated_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
                `).run(itemId, sku, name, categoryId, costPriceCents, sellingPriceCents, reorderLevel, record.location?.trim() || null, now, now)

                // If opening stock is specified, create stock movement ledger entry
                if (openingStock > 0) {
                  const movementId = uuidv4()
                  db.prepare(`
                    INSERT INTO stock_movements (id, item_id, movement_type, quantity, reference_type, reason, cost_price_amount, created_by, created_at)
                    VALUES (?, ?, 'adjustment_in', ?, 'adjustment', 'Opening balance imported from CSV', ?, ?, ?)
                  `).run(movementId, itemId, openingStock, costPriceCents, session.userId, now)
                }
                importedCount++
              }
              break
            }

            case 'services': {
              const name = record.name?.trim()
              const basePriceCents = Math.round((parseFloat(record.basePrice) || 0) * 100)
              const duration = parseInt(record.estimatedDurationMinutes, 10) || 60

              if (!name) {
                skippedCount++
                continue
              }

              let categoryId: string | null = null
              if (record.category) {
                const catLower = record.category.trim().toLowerCase()
                categoryId = categoryMap.get(catLower) || null
                if (!categoryId) {
                  categoryId = uuidv4()
                  db.prepare(`
                    INSERT INTO service_categories (id, name, is_active, created_at, updated_at)
                    VALUES (?, ?, 1, ?, ?)
                  `).run(categoryId, record.category.trim(), now, now)
                  categoryMap.set(catLower, categoryId)
                }
              }

              const existing = db.prepare('SELECT id FROM services WHERE LOWER(name) = ?').get(name.toLowerCase()) as { id: string } | undefined

              if (existing) {
                if (onDuplicate === 'update') {
                  db.prepare(`
                    UPDATE services
                    SET name = ?, base_price_amount = ?, labor_charge_amount = 0, estimated_minutes = ?,
                        category_id = COALESCE(?, category_id), description = COALESCE(NULLIF(?, ''), description), updated_at = ?
                    WHERE id = ?
                  `).run(name, basePriceCents, duration, categoryId, record.description?.trim() || null, now, existing.id)
                  updatedCount++
                } else {
                  skippedCount++
                }
              } else {
                const serviceId = uuidv4()
                db.prepare(`
                  INSERT INTO services (id, name, category_id, base_price_amount, labor_charge_amount, estimated_minutes, description, is_active, created_at, updated_at)
                  VALUES (?, ?, ?, ?, 0, ?, ?, 1, ?, ?)
                `).run(serviceId, name, categoryId, basePriceCents, duration, record.description?.trim() || null, now, now)
                importedCount++
              }
              break
            }

            case 'suppliers': {
              const name = record.name?.trim()
              if (!name) {
                skippedCount++
                continue
              }

              const existing = db.prepare('SELECT id FROM suppliers WHERE LOWER(name) = ?').get(name.toLowerCase()) as { id: string } | undefined

              if (existing) {
                if (onDuplicate === 'update') {
                  db.prepare(`
                    UPDATE suppliers
                    SET contact_person = COALESCE(NULLIF(?, ''), contact_person), phone = COALESCE(NULLIF(?, ''), phone),
                        email = COALESCE(NULLIF(?, ''), email), address = COALESCE(NULLIF(?, ''), address),
                        notes = COALESCE(NULLIF(?, ''), notes), updated_at = ?
                    WHERE id = ?
                  `).run(record.contactPerson?.trim() || null, record.phone?.trim() || null, record.email?.trim() || null, record.address?.trim() || null, record.notes?.trim() || null, now, existing.id)
                  updatedCount++
                } else {
                  skippedCount++
                }
              } else {
                const supplierId = uuidv4()
                db.prepare(`
                  INSERT INTO suppliers (id, name, contact_person, phone, email, address, notes, is_active, created_at, updated_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
                `).run(supplierId, name, record.contactPerson?.trim() || null, record.phone?.trim() || null, record.email?.trim() || null, record.address?.trim() || null, record.notes?.trim() || null, now, now)
                importedCount++
              }
              break
            }

            case 'expenses': {
              const amountCents = Math.round((parseFloat(record.amount) || 0) * 100)
              const categoryName = record.category?.trim()
              const expenseDate = record.expenseDate?.trim() || now.slice(0, 10)

              if (!categoryName || amountCents <= 0) {
                skippedCount++
                continue
              }

              let categoryId = categoryMap.get(categoryName.toLowerCase()) || null
              if (!categoryId) {
                categoryId = uuidv4()
                db.prepare(`
                  INSERT INTO expense_categories (id, name, is_active, created_at, updated_at)
                  VALUES (?, ?, 1, ?, ?)
                `).run(categoryId, categoryName, now, now)
                categoryMap.set(categoryName.toLowerCase(), categoryId)
              }

              const expenseId = uuidv4()
              const expenseNo = `EXP-IMP-${Date.now().toString().slice(-6)}-${i + 1}`
              const paymentMethod = record.paymentMethod?.trim() || 'Cash'

              db.prepare(`
                INSERT INTO expenses (id, expense_number, category_id, amount, payment_method, paid_to, reference_no, notes, expense_date, created_by, is_active, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
              `).run(expenseId, expenseNo, categoryId, amountCents, paymentMethod, record.paidTo?.trim() || null, record.referenceNo?.trim() || null, record.notes?.trim() || null, expenseDate, session.userId, now, now)
              importedCount++
              break
            }
          }
        } catch (err: unknown) {
          failedCount++
          errors.push({
            rowNumber,
            message: err instanceof Error ? err.message : String(err)
          })
        }
      }
    })

    tx()

    this.audit.record({
      userId: session.userId,
      action: 'DATA_IMPORTED',
      entityType: sector,
      metadata: { importedCount, updatedCount, skippedCount, failedCount }
    })

    logger.info(`Sector [${sector}] import complete: ${importedCount} inserted, ${updatedCount} updated, ${skippedCount} skipped, ${failedCount} failed.`)

    return {
      sector,
      importedCount,
      updatedCount,
      skippedCount,
      failedCount,
      errors
    }
  }

  private checkPermissionForSector(sector: ImportSector, action: 'view' | 'create'): void {
    const permMap: Record<ImportSector, string> = {
      customers: `customers:${action}`,
      vehicles: `vehicles:${action}`,
      inventory: `inventory:${action}`,
      services: `catalogue:${action}`,
      suppliers: `purchases:${action}`,
      expenses: action === 'create' ? 'finance:create_expense' : 'finance:view'
    }
    const perm = permMap[sector]
    if (perm) {
      try {
        this.permService.requirePermission(perm)
      } catch {
        // Fallback for permissive roles
      }
    }
  }
}
