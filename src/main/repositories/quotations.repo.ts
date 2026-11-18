import Database from 'better-sqlite3'
import { v4 as uuidv4 } from 'uuid'
import { DatabaseManager } from '../database/connection'
import {
  Quotation,
  QuotationWithDetails,
  QuotationItem,
  QuotationStatus,
  CreateQuotationInput,
  UpdateQuotationInput,
  ConvertQuotationToJobCardInput
} from '@shared/types/quotation.types'
import { SequenceRepository } from './sequence.repo'
import { JobCardRepository } from './job-cards.repo'
import { SettingsRepository } from './settings.repo'
import { InventoryRepository } from './inventory.repo'

export class QuotationsRepository {
  private sequenceRepo: SequenceRepository
  private jobCardRepo: JobCardRepository
  private settingsRepo: SettingsRepository
  private inventoryRepo: InventoryRepository
  private explicitDb?: Database.Database

  constructor(db?: Database.Database) {
    this.explicitDb = db
    this.sequenceRepo = new SequenceRepository(db)
    this.jobCardRepo = new JobCardRepository(db)
    this.settingsRepo = new SettingsRepository()
    this.inventoryRepo = new InventoryRepository(db)
  }

  private get db(): Database.Database {
    return this.explicitDb || DatabaseManager.getInstance().getActiveDb()
  }

  private getDefaultValidityDays(): number {
    const setting = this.settingsRepo.get('quotations', 'default_validity_days')
    return typeof setting?.value === 'number' ? setting.value : 14
  }

  private getDefaultTaxRate(): number {
    const setting = this.settingsRepo.get('financial', 'default_tax_rate')
    return typeof setting?.value === 'number' ? setting.value : 0
  }

  public getById(id: string): QuotationWithDetails | null {
    const row = this.db
      .prepare(
        `SELECT q.*,
                c.id as customer_id, c.name as customer_name, c.phone_primary as customer_phone,
                c.nic as customer_nic, c.email as customer_email, c.address as customer_address,
                c.notes as customer_notes, c.is_active as customer_is_active,
                c.created_at as customer_created_at, c.updated_at as customer_updated_at,
                v.id as vehicle_id, v.registration_no, v.make, v.model, v.year, v.color,
                v.vin, v.engine_number, v.fuel_type, v.transmission, v.extra_fields as vehicle_extra_fields,
                v.category_id as vehicle_category_id, v.is_active as vehicle_is_active,
                v.created_at as vehicle_created_at, v.updated_at as vehicle_updated_at,
                u_create.username as created_by_name,
                u_appr.username as approved_by_name
         FROM quotations q
         INNER JOIN customers c ON q.customer_id = c.id
         LEFT JOIN vehicles v ON q.vehicle_id = v.id
         LEFT JOIN users u_create ON q.created_by = u_create.id
         LEFT JOIN users u_appr ON q.approved_by = u_appr.id
         WHERE q.id = ?`
      )
      .get(id) as any

    if (!row) return null

    const itemRows = this.db
      .prepare(
        'SELECT * FROM quotation_items WHERE quotation_id = ? ORDER BY sort_order ASC, created_at ASC'
      )
      .all(id) as any[]

    const items: QuotationItem[] = itemRows.map((ir) => ({
      id: ir.id,
      quotationId: ir.quotation_id,
      itemType: ir.item_type,
      referenceId: ir.reference_id,
      description: ir.description,
      quantity: ir.quantity,
      unitPriceAmount: ir.unit_price_amount,
      costPriceAmount: ir.cost_price_amount,
      discountAmount: ir.discount_amount,
      taxRate: ir.tax_rate,
      taxAmount: ir.tax_amount,
      totalAmount: ir.total_amount,
      sortOrder: ir.sort_order,
      createdAt: ir.created_at
    }))

    const customer = {
      id: row.customer_id,
      name: row.customer_name,
      phonePrimary: row.customer_phone,
      nic: row.customer_nic,
      email: row.customer_email,
      address: row.customer_address,
      notes: row.customer_notes,
      isActive: Boolean(row.customer_is_active),
      createdAt: row.customer_created_at,
      updatedAt: row.customer_updated_at
    }

    const vehicle = row.vehicle_id
      ? {
          id: row.vehicle_id,
          customerId: row.customer_id,
          registrationNo: row.registration_no,
          make: row.make,
          model: row.model,
          year: row.year,
          color: row.color,
          vin: row.vin,
          engineNumber: row.engine_number,
          fuelType: row.fuel_type,
          transmission: row.transmission,
          extraFields: row.vehicle_extra_fields ? JSON.parse(row.vehicle_extra_fields) : undefined,
          categoryId: row.vehicle_category_id,
          isActive: Boolean(row.vehicle_is_active),
          createdAt: row.vehicle_created_at,
          updatedAt: row.vehicle_updated_at
        }
      : null

    return {
      id: row.id,
      quotationNumber: row.quotation_number,
      customerId: row.customer_id,
      vehicleId: row.vehicle_id,
      status: row.status,
      subtotalAmount: row.subtotal_amount,
      taxAmount: row.tax_amount,
      discountAmount: row.discount_amount,
      totalAmount: row.total_amount,
      validityDays: row.validity_days,
      expiresAt: row.expires_at,
      notes: row.notes,
      jobCardId: row.job_card_id,
      createdBy: row.created_by,
      createdByName: row.created_by_name,
      approvedBy: row.approved_by,
      approvedByName: row.approved_by_name,
      approvedAt: row.approved_at,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      customer,
      vehicle,
      items
    }
  }

  public listQuotations(filter?: {
    status?: string
    customerId?: string
    vehicleId?: string
    search?: string
  }): QuotationWithDetails[] {
    let sql = `
      SELECT q.id
      FROM quotations q
      INNER JOIN customers c ON q.customer_id = c.id
      LEFT JOIN vehicles v ON q.vehicle_id = v.id
      WHERE q.is_active = 1
    `
    const params: any[] = []

    if (filter?.status && filter.status !== 'all') {
      sql += ' AND q.status = ?'
      params.push(filter.status)
    }

    if (filter?.customerId) {
      sql += ' AND q.customer_id = ?'
      params.push(filter.customerId)
    }

    if (filter?.vehicleId) {
      sql += ' AND q.vehicle_id = ?'
      params.push(filter.vehicleId)
    }

    if (filter?.search) {
      const q = `%${filter.search.trim()}%`
      sql += ' AND (q.quotation_number LIKE ? OR c.name LIKE ? OR v.registration_no LIKE ?)'
      params.push(q, q, q)
    }

    sql += ' ORDER BY q.created_at DESC'

    const rows = this.db.prepare(sql).all(...params) as { id: string }[]
    return rows.map((r) => this.getById(r.id)!).filter(Boolean)
  }

  public createQuotation(input: CreateQuotationInput, createdBy?: string | null): QuotationWithDetails {
    const customer = this.db
      .prepare('SELECT id FROM customers WHERE id = ?')
      .get(input.customerId) as any

    if (!customer) {
      throw new Error(`Customer not found: ${input.customerId}`)
    }

    const validityDays = input.validityDays || this.getDefaultValidityDays()
    const defaultTax = this.getDefaultTaxRate()
    const discountAmount = input.discountAmount || 0

    const transaction = this.db.transaction(() => {
      const quotationId = uuidv4()
      const quotationNumber = this.sequenceRepo.getNextNumber('quotation')
      const now = new Date()
      const nowIso = now.toISOString()

      const expiryDate = new Date(now.getTime() + validityDays * 24 * 60 * 60 * 1000)
      const expiresAt = expiryDate.toISOString()

      let subtotalAmount = 0
      let totalTaxAmount = 0
      let sortOrder = 0
      const itemsToInsert: any[] = []

      for (const item of input.items) {
        const lineTaxRate = item.taxRate !== undefined ? item.taxRate : (input.taxRate !== undefined ? input.taxRate : defaultTax)
        const lineSubtotal = Math.round(item.unitPriceAmount * item.quantity) - (item.discountAmount || 0)
        const lineTax = Math.round((lineSubtotal * lineTaxRate) / 10000)
        const lineTotal = lineSubtotal + lineTax

        subtotalAmount += lineSubtotal
        totalTaxAmount += lineTax

        itemsToInsert.push({
          id: uuidv4(),
          quotation_id: quotationId,
          item_type: item.itemType,
          reference_id: item.referenceId || null,
          description: item.description,
          quantity: item.quantity,
          unit_price_amount: item.unitPriceAmount,
          cost_price_amount: item.costPriceAmount || 0,
          discount_amount: item.discountAmount || 0,
          tax_rate: lineTaxRate,
          tax_amount: lineTax,
          total_amount: lineTotal,
          sort_order: sortOrder++,
          created_at: nowIso
        })
      }

      const totalAmount = Math.max(0, subtotalAmount + totalTaxAmount - discountAmount)

      // 1. Insert quotation
      this.db
        .prepare(
          `INSERT INTO quotations (
            id, quotation_number, customer_id, vehicle_id, status,
            subtotal_amount, tax_amount, discount_amount, total_amount,
            validity_days, expires_at, notes, job_card_id, created_by,
            is_active, created_at, updated_at
          ) VALUES (?, ?, ?, ?, 'Draft', ?, ?, ?, ?, ?, ?, ?, NULL, ?, 1, ?, ?)`
        )
        .run(
          quotationId,
          quotationNumber,
          input.customerId,
          input.vehicleId || null,
          subtotalAmount,
          totalTaxAmount,
          discountAmount,
          totalAmount,
          validityDays,
          expiresAt,
          input.notes || null,
          createdBy || null,
          nowIso,
          nowIso
        )

      // 2. Insert items
      const insertItemStmt = this.db.prepare(`
        INSERT INTO quotation_items (
          id, quotation_id, item_type, reference_id, description,
          quantity, unit_price_amount, cost_price_amount, discount_amount,
          tax_rate, tax_amount, total_amount, sort_order, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      for (const item of itemsToInsert) {
        insertItemStmt.run(
          item.id,
          item.quotation_id,
          item.item_type,
          item.reference_id,
          item.description,
          item.quantity,
          item.unit_price_amount,
          item.cost_price_amount,
          item.discount_amount,
          item.tax_rate,
          item.tax_amount,
          item.total_amount,
          item.sort_order,
          item.created_at
        )
      }

      return quotationId
    })

    const quotationId = transaction()
    return this.getById(quotationId)!
  }

  public updateQuotation(id: string, input: UpdateQuotationInput): QuotationWithDetails {
    const existing = this.getById(id)
    if (!existing) {
      throw new Error(`Quotation not found: ${id}`)
    }

    if (existing.status === 'Approved') {
      throw new Error(`Cannot modify approved quotation #${existing.quotationNumber}`)
    }

    const transaction = this.db.transaction(() => {
      const now = new Date().toISOString()
      const validityDays = input.validityDays !== undefined ? input.validityDays : existing.validityDays
      const notes = input.notes !== undefined ? input.notes : existing.notes
      const customerId = input.customerId !== undefined ? input.customerId : existing.customerId
      const vehicleId = input.vehicleId !== undefined ? input.vehicleId : existing.vehicleId
      const discountAmount = input.discountAmount !== undefined ? input.discountAmount : existing.discountAmount

      let subtotalAmount = existing.subtotalAmount
      let totalTaxAmount = existing.taxAmount
      let totalAmount = existing.totalAmount

      if (input.items && input.items.length > 0) {
        this.db.prepare('DELETE FROM quotation_items WHERE quotation_id = ?').run(id)

        subtotalAmount = 0
        totalTaxAmount = 0
        let sortOrder = 0

        const insertItemStmt = this.db.prepare(`
          INSERT INTO quotation_items (
            id, quotation_id, item_type, reference_id, description,
            quantity, unit_price_amount, cost_price_amount, discount_amount,
            tax_rate, tax_amount, total_amount, sort_order, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)

        const defaultTax = this.getDefaultTaxRate()

        for (const item of input.items) {
          const lineTaxRate = item.taxRate !== undefined ? item.taxRate : (input.taxRate !== undefined ? input.taxRate : defaultTax)
          const lineSubtotal = Math.round(item.unitPriceAmount * item.quantity) - (item.discountAmount || 0)
          const lineTax = Math.round((lineSubtotal * lineTaxRate) / 10000)
          const lineTotal = lineSubtotal + lineTax

          subtotalAmount += lineSubtotal
          totalTaxAmount += lineTax

          insertItemStmt.run(
            uuidv4(),
            id,
            item.itemType,
            item.referenceId || null,
            item.description,
            item.quantity,
            item.unitPriceAmount,
            item.costPriceAmount || 0,
            item.discountAmount || 0,
            lineTaxRate,
            lineTax,
            lineTotal,
            sortOrder++,
            now
          )
        }

        totalAmount = Math.max(0, subtotalAmount + totalTaxAmount - discountAmount)
      }

      this.db
        .prepare(
          `UPDATE quotations
           SET customer_id = ?, vehicle_id = ?, subtotal_amount = ?, tax_amount = ?,
               discount_amount = ?, total_amount = ?, validity_days = ?, notes = ?, updated_at = ?
           WHERE id = ?`
        )
        .run(customerId, vehicleId || null, subtotalAmount, totalTaxAmount, discountAmount, totalAmount, validityDays, notes || null, now, id)
    })

    transaction()
    return this.getById(id)!
  }

  public updateStatus(
    id: string,
    status: QuotationStatus,
    notes?: string | null,
    userId?: string | null
  ): QuotationWithDetails {
    const existing = this.getById(id)
    if (!existing) {
      throw new Error(`Quotation not found: ${id}`)
    }

    const now = new Date().toISOString()
    const isApprove = status === 'Approved'
    const approvedBy = isApprove ? (userId || existing.approvedBy || null) : existing.approvedBy
    const approvedAt = isApprove ? now : existing.approvedAt

    this.db
      .prepare(
        `UPDATE quotations
         SET status = ?, approved_by = ?, approved_at = ?, notes = COALESCE(?, notes), updated_at = ?
         WHERE id = ?`
      )
      .run(status, approvedBy, approvedAt, notes || null, now, id)

    return this.getById(id)!
  }

  public convertToJobCard(
    input: ConvertQuotationToJobCardInput,
    assignedByUserId?: string | null
  ): { quotation: QuotationWithDetails; jobCardId: string } {
    const quotation = this.getById(input.quotationId)
    if (!quotation) {
      throw new Error(`Quotation not found: ${input.quotationId}`)
    }

    if (quotation.jobCardId) {
      throw new Error(
        `Quotation #${quotation.quotationNumber} has already been converted to a Job Card`
      )
    }

    if (!quotation.vehicleId) {
      throw new Error(
        `Quotation #${quotation.quotationNumber} requires an assigned vehicle before converting to a Job Card`
      )
    }

    const transaction = this.db.transaction(() => {
      const now = new Date().toISOString()

      // 1. Create Job Card
      const jobCard = this.jobCardRepo.createJobCard(
        {
          customerId: quotation.customerId,
          vehicleId: quotation.vehicleId!,
          quotationId: quotation.id,
          technicianId: input.technicianId || undefined,
          priority: input.priority || 'Normal',
          mileageIn: input.mileageIn !== undefined ? input.mileageIn : undefined,
          findings: quotation.notes || undefined,
          internalNotes: input.internalNotes || undefined
        },
        assignedByUserId
      )

      // 2. Transfer line items into job card
      for (const item of quotation.items) {
        if (item.itemType === 'service') {
          this.jobCardRepo.addService(jobCard.id, {
            serviceId: item.referenceId || undefined,
            serviceName: item.description,
            priceAmount: item.unitPriceAmount,
            laborAmount: 0
          })
        } else if (item.itemType === 'part' && item.referenceId) {
          const invItem = this.inventoryRepo.getItemById(item.referenceId)
          if (invItem) {
            this.jobCardRepo.addPart(
              jobCard.id,
              {
                id: invItem.id,
                name: invItem.name,
                costPriceAmount: invItem.costPriceAmount,
                sellingPriceAmount: invItem.sellingPriceAmount
              },
              item.quantity,
              item.unitPriceAmount,
              assignedByUserId
            )
          }
        }
      }

      // 3. Mark quotation as Approved & linked
      this.db
        .prepare(
          `UPDATE quotations
           SET status = 'Approved', approved_by = COALESCE(approved_by, ?),
               approved_at = COALESCE(approved_at, ?), job_card_id = ?, updated_at = ?
           WHERE id = ?`
        )
        .run(assignedByUserId || null, now, jobCard.id, now, quotation.id)

      return jobCard.id
    })

    const jobCardId = transaction()
    return {
      quotation: this.getById(input.quotationId)!,
      jobCardId
    }
  }
}
