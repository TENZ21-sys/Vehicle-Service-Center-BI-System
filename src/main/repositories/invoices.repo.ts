import Database from 'better-sqlite3'
import { v4 as uuidv4 } from 'uuid'
import { DatabaseManager } from '../database/connection'
import {
  Invoice,
  InvoiceWithDetails,
  InvoiceItem,
  Payment,
  CreateJobCardInvoiceInput,
  CreatePosInvoiceInput,
  VoidInvoiceInput
} from '@shared/types/invoice.types'
import { SequenceRepository } from './sequence.repo'
import { StockMovementsRepository } from './stock-movements.repo'
import { SettingsRepository } from './settings.repo'
import { InventoryRepository } from './inventory.repo'

export class InvoicesRepository {
  private sequenceRepo: SequenceRepository
  private stockMovementsRepo: StockMovementsRepository
  private settingsRepo: SettingsRepository
  private inventoryRepo: InventoryRepository
  private explicitDb?: Database.Database

  constructor(db?: Database.Database) {
    this.explicitDb = db
    this.sequenceRepo = new SequenceRepository(db)
    this.stockMovementsRepo = new StockMovementsRepository(db)
    this.settingsRepo = new SettingsRepository()
    this.inventoryRepo = new InventoryRepository(db)
  }

  private get db(): Database.Database {
    return this.explicitDb || DatabaseManager.getInstance().getActiveDb()
  }

  private getDefaultTaxRate(): number {
    const setting = this.settingsRepo.get('financial', 'default_tax_rate')
    return typeof setting?.value === 'number' ? setting.value : 0
  }

  private getAllowNegativeStock(): boolean {
    const setting = this.settingsRepo.get('inventory', 'allow_negative_stock')
    return setting ? Boolean(setting.value) : false
  }

  public getById(id: string): InvoiceWithDetails | null {
    const row = this.db
      .prepare(
        `SELECT inv.*,
                c.id as customer_id, c.name as customer_name, c.phone_primary as customer_phone,
                c.nic as customer_nic, c.email as customer_email, c.address as customer_address,
                c.notes as customer_notes, c.is_active as customer_is_active,
                c.created_at as customer_created_at, c.updated_at as customer_updated_at,
                v.id as vehicle_id, v.registration_no, v.make, v.model, v.year, v.color,
                v.vin, v.engine_number, v.fuel_type, v.transmission, v.extra_fields as vehicle_extra_fields,
                v.category_id as vehicle_category_id, v.is_active as vehicle_is_active,
                v.created_at as vehicle_created_at, v.updated_at as vehicle_updated_at,
                u_create.username as created_by_name,
                u_void.username as voided_by_name
         FROM invoices inv
         INNER JOIN customers c ON inv.customer_id = c.id
         LEFT JOIN vehicles v ON inv.vehicle_id = v.id
         LEFT JOIN users u_create ON inv.created_by = u_create.id
         LEFT JOIN users u_void ON inv.voided_by = u_void.id
         WHERE inv.id = ?`
      )
      .get(id) as any

    if (!row) return null

    // Items
    const itemRows = this.db
      .prepare('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY sort_order ASC, created_at ASC')
      .all(id) as any[]

    const items: InvoiceItem[] = itemRows.map((ir) => ({
      id: ir.id,
      invoiceId: ir.invoice_id,
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

    // Payments
    const paymentRows = this.db
      .prepare(
        `SELECT p.*, u.username as received_by_name
         FROM payments p
         LEFT JOIN users u ON p.received_by = u.id
         WHERE p.invoice_id = ?
         ORDER BY p.created_at ASC`
      )
      .all(id) as any[]

    const payments: Payment[] = paymentRows.map((pr) => ({
      id: pr.id,
      invoiceId: pr.invoice_id,
      paymentMethod: pr.payment_method,
      amount: pr.amount,
      reference: pr.reference,
      notes: pr.notes,
      receivedBy: pr.received_by,
      receivedByName: pr.received_by_name,
      createdAt: pr.created_at
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
      invoiceNumber: row.invoice_number,
      customerId: row.customer_id,
      vehicleId: row.vehicle_id,
      jobCardId: row.job_card_id,
      quotationId: row.quotation_id,
      invoiceType: row.invoice_type,
      status: row.status,
      subtotalAmount: row.subtotal_amount,
      taxAmount: row.tax_amount,
      discountAmount: row.discount_amount,
      roundingAmount: row.rounding_amount,
      totalAmount: row.total_amount,
      paidAmount: row.paid_amount,
      dueAmount: row.due_amount,
      notes: row.notes,
      voidReason: row.void_reason,
      voidedAt: row.voided_at,
      voidedBy: row.voided_by,
      voidedByName: row.voided_by_name,
      creditNoteOf: row.credit_note_of,
      createdBy: row.created_by,
      createdByName: row.created_by_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      customer,
      vehicle,
      items,
      payments
    }
  }

  public listInvoices(filter?: {
    status?: string
    customerId?: string
    vehicleId?: string
    invoiceType?: string
    search?: string
  }): (Invoice & { customerName: string; vehicleRegistration?: string })[] {
    let sql = `
      SELECT inv.*,
             c.name as customer_name,
             v.registration_no as vehicle_registration,
             u_create.username as created_by_name,
             u_void.username as voided_by_name
      FROM invoices inv
      INNER JOIN customers c ON inv.customer_id = c.id
      LEFT JOIN vehicles v ON inv.vehicle_id = v.id
      LEFT JOIN users u_create ON inv.created_by = u_create.id
      LEFT JOIN users u_void ON inv.voided_by = u_void.id
      WHERE 1=1
    `
    const params: any[] = []

    if (filter?.status) {
      sql += ' AND inv.status = ?'
      params.push(filter.status)
    }

    if (filter?.customerId) {
      sql += ' AND inv.customer_id = ?'
      params.push(filter.customerId)
    }

    if (filter?.vehicleId) {
      sql += ' AND inv.vehicle_id = ?'
      params.push(filter.vehicleId)
    }

    if (filter?.invoiceType) {
      sql += ' AND inv.invoice_type = ?'
      params.push(filter.invoiceType)
    }

    if (filter?.search) {
      const q = `%${filter.search.trim()}%`
      sql += ' AND (inv.invoice_number LIKE ? OR c.name LIKE ? OR v.registration_no LIKE ?)'
      params.push(q, q, q)
    }

    sql += ' ORDER BY inv.created_at DESC'

    const rows = this.db.prepare(sql).all(...params) as any[]

    return rows.map((row) => ({
      id: row.id,
      invoiceNumber: row.invoice_number,
      customerId: row.customer_id,
      vehicleId: row.vehicle_id,
      jobCardId: row.job_card_id,
      quotationId: row.quotation_id,
      invoiceType: row.invoice_type,
      status: row.status,
      subtotalAmount: row.subtotal_amount,
      taxAmount: row.tax_amount,
      discountAmount: row.discount_amount,
      roundingAmount: row.rounding_amount,
      totalAmount: row.total_amount,
      paidAmount: row.paid_amount,
      dueAmount: row.due_amount,
      notes: row.notes,
      voidReason: row.void_reason,
      voidedAt: row.voided_at,
      voidedBy: row.voided_by,
      voidedByName: row.voided_by_name,
      creditNoteOf: row.credit_note_of,
      createdBy: row.created_by,
      createdByName: row.created_by_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      customerName: row.customer_name,
      vehicleRegistration: row.vehicle_registration || undefined
    }))
  }

  public createFromJobCard(input: CreateJobCardInvoiceInput, createdBy?: string | null): InvoiceWithDetails {
    const jobCard = this.db
      .prepare('SELECT * FROM job_cards WHERE id = ?')
      .get(input.jobCardId) as any

    if (!jobCard) {
      throw new Error(`Job card not found: ${input.jobCardId}`)
    }

    if (jobCard.invoice_id) {
      throw new Error(`Job card #${jobCard.job_card_number} is already invoiced`)
    }

    const services = this.db
      .prepare('SELECT * FROM job_card_services WHERE job_card_id = ? ORDER BY created_at ASC')
      .all(input.jobCardId) as any[]

    const parts = this.db
      .prepare(
        `SELECT jcp.*, i.name as item_name, i.cost_price_amount
         FROM job_card_parts jcp
         JOIN inventory_items i ON jcp.inventory_item_id = i.id
         WHERE jcp.job_card_id = ?
         ORDER BY jcp.created_at ASC`
      )
      .all(input.jobCardId) as any[]

    const defaultTax = this.getDefaultTaxRate()
    const taxRate = input.taxRate !== undefined ? input.taxRate : defaultTax
    const discountAmount = input.discountAmount || 0

    const transaction = this.db.transaction(() => {
      const invoiceId = uuidv4()
      const invoiceNumber = this.sequenceRepo.getNextNumber('invoice')
      const now = new Date().toISOString()

      let subtotalAmount = 0
      let totalTaxAmount = 0
      let sortOrder = 0
      const itemsToInsert: any[] = []

      // Add services
      for (const s of services) {
        const unitPrice = s.price_amount + s.labor_amount
        const lineTax = Math.round((unitPrice * taxRate) / 10000)
        const lineTotal = unitPrice + lineTax

        subtotalAmount += unitPrice
        totalTaxAmount += lineTax

        itemsToInsert.push({
          id: uuidv4(),
          invoice_id: invoiceId,
          item_type: 'service',
          reference_id: s.service_id,
          description: s.service_name,
          quantity: 1,
          unit_price_amount: unitPrice,
          cost_price_amount: 0,
          discount_amount: 0,
          tax_rate: taxRate,
          tax_amount: lineTax,
          total_amount: lineTotal,
          sort_order: sortOrder++,
          created_at: now
        })
      }

      // Add parts (Stock deduction was already recorded when parts were added to the job card)
      for (const p of parts) {
        const lineSubtotal = Math.round(p.unit_price_amount * p.quantity)
        const lineTax = Math.round((lineSubtotal * taxRate) / 10000)
        const lineTotal = lineSubtotal + lineTax

        subtotalAmount += lineSubtotal
        totalTaxAmount += lineTax

        itemsToInsert.push({
          id: uuidv4(),
          invoice_id: invoiceId,
          item_type: 'part',
          reference_id: p.inventory_item_id,
          description: p.item_name,
          quantity: p.quantity,
          unit_price_amount: p.unit_price_amount,
          cost_price_amount: p.cost_price_amount || 0,
          discount_amount: 0,
          tax_rate: taxRate,
          tax_amount: lineTax,
          total_amount: lineTotal,
          sort_order: sortOrder++,
          created_at: now
        })
      }

      const totalAmount = Math.max(0, subtotalAmount + totalTaxAmount - discountAmount)
      let paidAmount = 0
      let status = 'Unpaid'

      if (input.immediatePayment && input.immediatePayment.amount > 0) {
        if (input.immediatePayment.amount > totalAmount) {
          throw new Error(`Immediate payment amount (${input.immediatePayment.amount}) exceeds invoice total (${totalAmount})`)
        }
        paidAmount = input.immediatePayment.amount
        status = paidAmount >= totalAmount ? 'Paid' : 'Partial'
      }

      const dueAmount = totalAmount - paidAmount

      // 1. Insert invoice
      this.db
        .prepare(
          `INSERT INTO invoices (
            id, invoice_number, customer_id, vehicle_id, job_card_id,
            quotation_id, invoice_type, status, subtotal_amount, tax_amount,
            discount_amount, rounding_amount, total_amount, paid_amount,
            due_amount, notes, created_by, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          invoiceId,
          invoiceNumber,
          jobCard.customer_id,
          jobCard.vehicle_id,
          jobCard.id,
          jobCard.quotation_id || null,
          'job_card',
          status,
          subtotalAmount,
          totalTaxAmount,
          discountAmount,
          totalAmount,
          paidAmount,
          dueAmount,
          input.notes || null,
          createdBy || null,
          now,
          now
        )

      // 2. Insert items
      const insertItemStmt = this.db.prepare(`
        INSERT INTO invoice_items (
          id, invoice_id, item_type, reference_id, description,
          quantity, unit_price_amount, cost_price_amount, discount_amount,
          tax_rate, tax_amount, total_amount, sort_order, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      for (const item of itemsToInsert) {
        insertItemStmt.run(
          item.id,
          item.invoice_id,
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

      // 3. Immediate payment if provided
      if (input.immediatePayment && input.immediatePayment.amount > 0) {
        const paymentId = uuidv4()
        this.db
          .prepare(
            `INSERT INTO payments (
              id, invoice_id, payment_method, amount, reference, notes, received_by, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            paymentId,
            invoiceId,
            input.immediatePayment.paymentMethod,
            input.immediatePayment.amount,
            input.immediatePayment.reference || null,
            input.immediatePayment.notes || null,
            createdBy || null,
            now
          )
      }

      // 4. Update job card reference
      this.db
        .prepare('UPDATE job_cards SET invoice_id = ?, updated_at = ? WHERE id = ?')
        .run(invoiceId, now, jobCard.id)

      return invoiceId
    })

    const invoiceId = transaction()
    return this.getById(invoiceId)!
  }

  public createPosInvoice(input: CreatePosInvoiceInput, createdBy?: string | null): InvoiceWithDetails {
    const customer = this.db
      .prepare('SELECT id FROM customers WHERE id = ?')
      .get(input.customerId) as any

    if (!customer) {
      throw new Error(`Customer not found: ${input.customerId}`)
    }

    const defaultTax = this.getDefaultTaxRate()
    const allowNegativeStock = this.getAllowNegativeStock()
    const discountAmount = input.discountAmount || 0

    const transaction = this.db.transaction(() => {
      const invoiceId = uuidv4()
      const invoiceNumber = this.sequenceRepo.getNextNumber('invoice')
      const now = new Date().toISOString()

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

        let lineCostPrice = item.costPriceAmount || 0

        // Stock deduction for parts
        if (item.itemType === 'part' && item.referenceId) {
          if (!lineCostPrice) {
            const invItem = this.inventoryRepo.getItemById(item.referenceId)
            if (invItem) {
              lineCostPrice = invItem.costPriceAmount
            }
          }

          if (!allowNegativeStock) {
            const currentStock = this.inventoryRepo.getCurrentStock(item.referenceId)
            if (currentStock < item.quantity) {
              throw new Error(
                `Insufficient stock for "${item.description}". Available: ${currentStock}, Requested: ${item.quantity}`
              )
            }
          }

          // Deduct from ledger
          this.stockMovementsRepo.createMovement({
            itemId: item.referenceId,
            movementType: 'pos_sale_out',
            quantity: -item.quantity,
            referenceType: 'invoice',
            referenceId: invoiceId,
            reason: `POS Sale: ${invoiceNumber}`,
            costPriceAmount: lineCostPrice || null,
            createdBy: createdBy || null
          })
        }

        itemsToInsert.push({
          id: uuidv4(),
          invoice_id: invoiceId,
          item_type: item.itemType,
          reference_id: item.referenceId || null,
          description: item.description,
          quantity: item.quantity,
          unit_price_amount: item.unitPriceAmount,
          cost_price_amount: lineCostPrice,
          discount_amount: item.discountAmount || 0,
          tax_rate: lineTaxRate,
          tax_amount: lineTax,
          total_amount: lineTotal,
          sort_order: sortOrder++,
          created_at: now
        })
      }

      const totalAmount = Math.max(0, subtotalAmount + totalTaxAmount - discountAmount)
      let paidAmount = 0
      let status = 'Unpaid'

      if (input.immediatePayment && input.immediatePayment.amount > 0) {
        if (input.immediatePayment.amount > totalAmount) {
          throw new Error(`Immediate payment amount (${input.immediatePayment.amount}) exceeds invoice total (${totalAmount})`)
        }
        paidAmount = input.immediatePayment.amount
        status = paidAmount >= totalAmount ? 'Paid' : 'Partial'
      }

      const dueAmount = totalAmount - paidAmount

      // 1. Insert invoice
      this.db
        .prepare(
          `INSERT INTO invoices (
            id, invoice_number, customer_id, vehicle_id, job_card_id,
            quotation_id, invoice_type, status, subtotal_amount, tax_amount,
            discount_amount, rounding_amount, total_amount, paid_amount,
            due_amount, notes, created_by, created_at, updated_at
          ) VALUES (?, ?, ?, ?, NULL, NULL, 'pos', ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          invoiceId,
          invoiceNumber,
          input.customerId,
          input.vehicleId || null,
          status,
          subtotalAmount,
          totalTaxAmount,
          discountAmount,
          totalAmount,
          paidAmount,
          dueAmount,
          input.notes || null,
          createdBy || null,
          now,
          now
        )

      // 2. Insert items
      const insertItemStmt = this.db.prepare(`
        INSERT INTO invoice_items (
          id, invoice_id, item_type, reference_id, description,
          quantity, unit_price_amount, cost_price_amount, discount_amount,
          tax_rate, tax_amount, total_amount, sort_order, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      for (const item of itemsToInsert) {
        insertItemStmt.run(
          item.id,
          item.invoice_id,
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

      // 3. Immediate payment if provided
      if (input.immediatePayment && input.immediatePayment.amount > 0) {
        const paymentId = uuidv4()
        this.db
          .prepare(
            `INSERT INTO payments (
              id, invoice_id, payment_method, amount, reference, notes, received_by, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            paymentId,
            invoiceId,
            input.immediatePayment.paymentMethod,
            input.immediatePayment.amount,
            input.immediatePayment.reference || null,
            input.immediatePayment.notes || null,
            createdBy || null,
            now
          )
      }

      return invoiceId
    })

    const invoiceId = transaction()
    return this.getById(invoiceId)!
  }

  public voidInvoice(input: VoidInvoiceInput, voidedBy?: string | null): InvoiceWithDetails {
    const invoice = this.db
      .prepare('SELECT * FROM invoices WHERE id = ?')
      .get(input.invoiceId) as any

    if (!invoice) {
      throw new Error(`Invoice not found: ${input.invoiceId}`)
    }

    if (invoice.status === 'Void') {
      throw new Error(`Invoice #${invoice.invoice_number} is already voided`)
    }

    const items = this.db
      .prepare('SELECT * FROM invoice_items WHERE invoice_id = ?')
      .all(input.invoiceId) as any[]

    const transaction = this.db.transaction(() => {
      const now = new Date().toISOString()

      // 1. Mark original invoice as Void
      this.db
        .prepare(
          `UPDATE invoices
           SET status = 'Void',
               void_reason = ?,
               voided_at = ?,
               voided_by = ?,
               updated_at = ?
           WHERE id = ?`
        )
        .run(input.voidReason, now, voidedBy || null, now, input.invoiceId)

      // 2. If POS sale, reverse parts stock in the ledger
      if (invoice.invoice_type === 'pos') {
        for (const item of items) {
          if (item.item_type === 'part' && item.reference_id) {
            this.stockMovementsRepo.createMovement({
              itemId: item.reference_id,
              movementType: 'void_reversal',
              quantity: item.quantity, // positive quantity to restore stock
              referenceType: 'invoice_void',
              referenceId: invoice.id,
              reason: `Voided invoice #${invoice.invoice_number}: ${input.voidReason}`,
              costPriceAmount: item.cost_price_amount || null,
              createdBy: voidedBy || null
            })
          }
        }
      }

      // 3. If job card, clear job_cards.invoice_id
      if (invoice.job_card_id) {
        this.db
          .prepare('UPDATE job_cards SET invoice_id = NULL, updated_at = ? WHERE id = ?')
          .run(now, invoice.job_card_id)
      }

      // 4. Create linked Credit Note invoice to cleanly offset receivables
      const creditNoteId = uuidv4()
      const creditNoteNumber = this.sequenceRepo.getNextNumber('invoice')

      this.db
        .prepare(
          `INSERT INTO invoices (
            id, invoice_number, customer_id, vehicle_id, job_card_id,
            quotation_id, invoice_type, status, subtotal_amount, tax_amount,
            discount_amount, rounding_amount, total_amount, paid_amount,
            due_amount, notes, void_reason, voided_at, voided_by,
            credit_note_of, created_by, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, NULL, ?, 'Paid', ?, ?, ?, 0, ?, ?, 0, ?, NULL, NULL, NULL, ?, ?, ?, ?)`
        )
        .run(
          creditNoteId,
          creditNoteNumber,
          invoice.customer_id,
          invoice.vehicle_id || null,
          invoice.job_card_id || null,
          invoice.invoice_type,
          -invoice.subtotal_amount,
          -invoice.tax_amount,
          -invoice.discount_amount,
          -invoice.total_amount,
          -invoice.total_amount,
          `Credit Note for voided invoice #${invoice.invoice_number}. Reason: ${input.voidReason}`,
          invoice.id,
          voidedBy || null,
          now,
          now
        )

      return invoice.id
    })

    transaction()
    return this.getById(input.invoiceId)!
  }
}
