import Database from 'better-sqlite3'
import { v4 as uuidv4 } from 'uuid'
import { DatabaseManager } from '../database/connection'
import {
  JobCard,
  JobCardWithDetails,
  JobCardServiceItem,
  JobCardPartItem,
  JobCardTotals,
  CreateJobCardInput,
  UpdateJobCardInput,
  AddJobCardServiceInput,
  UpdateJobCardServiceInput
} from '@shared/types/job-card.types'
import { SequenceRepository } from './sequence.repo'
import { StockMovementsRepository } from './stock-movements.repo'

export class JobCardRepository {
  private sequenceRepo: SequenceRepository
  private stockMovementsRepo: StockMovementsRepository
  private explicitDb?: Database.Database

  constructor(db?: Database.Database) {
    this.explicitDb = db
    this.sequenceRepo = new SequenceRepository(db)
    this.stockMovementsRepo = new StockMovementsRepository(db)
  }

  private get db(): Database.Database {
    return this.explicitDb || DatabaseManager.getInstance().getActiveDb()
  }

  public createJobCard(input: CreateJobCardInput, assignedByUserId?: string | null): JobCardWithDetails {
    const id = uuidv4()
    const now = new Date().toISOString()
    const jobCardNumber = this.sequenceRepo.getNextNumber('job_card')

    const stmt = this.db.prepare(`
      INSERT INTO job_cards (
        id, job_card_number, customer_id, vehicle_id,
        appointment_id, quotation_id, technician_id, assigned_by,
        status, priority, mileage_in, findings, internal_notes,
        customer_notes, received_at, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `)

    const transaction = this.db.transaction(() => {
      stmt.run(
        id,
        jobCardNumber,
        input.customerId,
        input.vehicleId,
        input.appointmentId || null,
        input.quotationId || null,
        input.technicianId || null,
        input.technicianId ? (assignedByUserId || null) : null,
        'Open',
        input.priority || 'Normal',
        input.mileageIn !== undefined ? input.mileageIn : null,
        input.findings || null,
        input.internalNotes || null,
        input.customerNotes || null,
        now, // received_at on reception
        now,
        now
      )

      // Add initial services if provided
      if (input.initialServiceIds && input.initialServiceIds.length > 0) {
        const getServiceStmt = this.db.prepare('SELECT * FROM services WHERE id = ?')
        const insertServiceStmt = this.db.prepare(`
          INSERT INTO job_card_services (
            id, job_card_id, service_id, service_name,
            price_amount, labor_amount, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, 'Pending', ?, ?)
        `)

        for (const sId of input.initialServiceIds) {
          const s = getServiceStmt.get(sId) as any
          if (s) {
            insertServiceStmt.run(
              uuidv4(),
              id,
              s.id,
              s.name,
              s.base_price_amount,
              s.labor_charge_amount,
              now,
              now
            )
          }
        }
      }
    })

    transaction()

    return this.getJobCardById(id)!
  }

  public getJobCardById(id: string): JobCardWithDetails | null {
    const row = this.db
      .prepare(
        `SELECT jc.*,
                c.name as customer_name, c.phone_primary as customer_phone, c.nic as customer_nic,
                c.email as customer_email, c.address as customer_address, c.notes as customer_profile_notes,
                c.is_active as customer_is_active, c.created_at as customer_created_at, c.updated_at as customer_updated_at,
                v.registration_no, v.make, v.model, v.year, v.color, v.vin, v.engine_number,
                v.fuel_type, v.transmission, v.extra_fields as vehicle_extra_fields,
                v.category_id as vehicle_category_id, v.is_active as vehicle_is_active,
                v.created_at as vehicle_created_at, v.updated_at as vehicle_updated_at,
                vc.name as vehicle_category_name,
                tu.username as technician_name,
                au.username as assigned_by_name
         FROM job_cards jc
         INNER JOIN customers c ON jc.customer_id = c.id
         INNER JOIN vehicles v ON jc.vehicle_id = v.id
         LEFT JOIN vehicle_categories vc ON v.category_id = vc.id
         LEFT JOIN users tu ON jc.technician_id = tu.id
         LEFT JOIN users au ON jc.assigned_by = au.id
         WHERE jc.id = ?`
      )
      .get(id) as any

    if (!row) return null

    // Fetch services
    const serviceRows = this.db
      .prepare(
        'SELECT * FROM job_card_services WHERE job_card_id = ? ORDER BY created_at ASC'
      )
      .all(id) as any[]

    const services: JobCardServiceItem[] = serviceRows.map((sr) => ({
      id: sr.id,
      jobCardId: sr.job_card_id,
      serviceId: sr.service_id,
      serviceName: sr.service_name,
      priceAmount: sr.price_amount,
      laborAmount: sr.labor_amount,
      status: sr.status,
      notes: sr.notes,
      createdAt: sr.created_at,
      updatedAt: sr.updated_at
    }))

    // Fetch parts
    const partRows = this.db
      .prepare(
        `SELECT jcp.*, i.name as item_name, i.sku as item_sku, uom.abbreviation as unit_abbr
         FROM job_card_parts jcp
         INNER JOIN inventory_items i ON jcp.inventory_item_id = i.id
         LEFT JOIN units_of_measure uom ON i.unit_id = uom.id
         WHERE jcp.job_card_id = ?
         ORDER BY jcp.created_at ASC`
      )
      .all(id) as any[]

    const parts: JobCardPartItem[] = partRows.map((pr) => ({
      id: pr.id,
      jobCardId: pr.job_card_id,
      inventoryItemId: pr.inventory_item_id,
      itemName: pr.item_name,
      itemSku: pr.item_sku || null,
      unitAbbr: pr.unit_abbr || null,
      quantity: Number(pr.quantity),
      unitPriceAmount: pr.unit_price_amount,
      totalAmount: pr.total_amount,
      stockMovementId: pr.stock_movement_id,
      createdAt: pr.created_at,
      updatedAt: pr.updated_at
    }))

    const totals = this.calculateTotals(services, parts)

    return {
      id: row.id,
      jobCardNumber: row.job_card_number,
      customerId: row.customer_id,
      vehicleId: row.vehicle_id,
      appointmentId: row.appointment_id,
      quotationId: row.quotation_id,
      technicianId: row.technician_id,
      assignedBy: row.assigned_by,
      technicianName: row.technician_name || null,
      assignedByName: row.assigned_by_name || null,
      status: row.status,
      priority: row.priority,
      mileageIn: row.mileage_in,
      mileageOut: row.mileage_out,
      findings: row.findings,
      internalNotes: row.internal_notes,
      customerNotes: row.customer_notes,
      receivedAt: row.received_at,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      deliveredAt: row.delivered_at,
      invoiceId: row.invoice_id,
      isActive: row.is_active === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      customer: {
        id: row.customer_id,
        name: row.customer_name,
        phonePrimary: row.customer_phone,
        phoneSecondary: null,
        email: row.customer_email,
        address: row.customer_address,
        nic: row.customer_nic,
        notes: row.customer_profile_notes,
        isActive: row.customer_is_active === 1,
        createdAt: row.customer_created_at,
        updatedAt: row.customer_updated_at
      },
      vehicle: {
        id: row.vehicle_id,
        customerId: row.customer_id,
        categoryId: row.vehicle_category_id,
        categoryName: row.vehicle_category_name,
        registrationNo: row.registration_no,
        make: row.make,
        model: row.model,
        year: row.year,
        color: row.color,
        vin: row.vin,
        engineNumber: row.engine_number,
        fuelType: row.fuel_type,
        transmission: row.transmission,
        extraFields: row.vehicle_extra_fields ? JSON.parse(row.vehicle_extra_fields) : {},
        isActive: row.vehicle_is_active === 1,
        createdAt: row.vehicle_created_at,
        updatedAt: row.vehicle_updated_at
      },
      services,
      parts,
      totals
    }
  }

  public listJobCards(filter?: {
    status?: string
    technicianId?: string
    customerId?: string
    vehicleId?: string
    search?: string
    includeInactive?: boolean
    limit?: number
    offset?: number
  }): JobCardWithDetails[] {
    let sql = `
      SELECT jc.id
      FROM job_cards jc
      INNER JOIN customers c ON jc.customer_id = c.id
      INNER JOIN vehicles v ON jc.vehicle_id = v.id
      WHERE 1=1
    `
    const params: any[] = []

    if (!filter?.includeInactive) {
      sql += ' AND jc.is_active = 1'
    }
    if (filter?.status) {
      sql += ' AND jc.status = ?'
      params.push(filter.status)
    }
    if (filter?.technicianId) {
      sql += ' AND jc.technician_id = ?'
      params.push(filter.technicianId)
    }
    if (filter?.customerId) {
      sql += ' AND jc.customer_id = ?'
      params.push(filter.customerId)
    }
    if (filter?.vehicleId) {
      sql += ' AND jc.vehicle_id = ?'
      params.push(filter.vehicleId)
    }
    if (filter?.search) {
      sql += ' AND (jc.job_card_number LIKE ? OR c.name LIKE ? OR c.phone_primary LIKE ? OR v.registration_no LIKE ?)'
      const term = `%${filter.search}%`
      params.push(term, term, term, term)
    }

    sql += ' ORDER BY jc.created_at DESC'

    if (filter?.limit) {
      sql += ' LIMIT ?'
      params.push(filter.limit)
      if (filter?.offset) {
        sql += ' OFFSET ?'
        params.push(filter.offset)
      }
    }

    const rows = this.db.prepare(sql).all(...params) as { id: string }[]
    return rows.map((r) => this.getJobCardById(r.id)!).filter(Boolean)
  }

  public updateJobCard(id: string, input: UpdateJobCardInput): JobCardWithDetails {
    const existing = this.getJobCardById(id)
    if (!existing) throw new Error(`Job card ${id} not found`)

    const now = new Date().toISOString()
    const technicianId = input.technicianId !== undefined ? input.technicianId : existing.technicianId
    const priority = input.priority !== undefined ? input.priority : existing.priority
    const mileageIn = input.mileageIn !== undefined ? input.mileageIn : existing.mileageIn
    const mileageOut = input.mileageOut !== undefined ? input.mileageOut : existing.mileageOut
    const findings = input.findings !== undefined ? input.findings : existing.findings
    const internalNotes = input.internalNotes !== undefined ? input.internalNotes : existing.internalNotes
    const customerNotes = input.customerNotes !== undefined ? input.customerNotes : existing.customerNotes

    this.db.prepare(`
      UPDATE job_cards
      SET technician_id = ?, priority = ?, mileage_in = ?, mileage_out = ?,
          findings = ?, internal_notes = ?, customer_notes = ?, updated_at = ?
      WHERE id = ?
    `).run(
      technicianId || null,
      priority,
      mileageIn !== undefined ? mileageIn : null,
      mileageOut !== undefined ? mileageOut : null,
      findings || null,
      internalNotes || null,
      customerNotes || null,
      now,
      id
    )

    return this.getJobCardById(id)!
  }

  public updateJobCardStatus(
    id: string,
    status: string,
    timestamps: { startedAt?: string; completedAt?: string; deliveredAt?: string } = {},
    mileageOut?: number | null
  ): JobCardWithDetails {
    const existing = this.getJobCardById(id)
    if (!existing) throw new Error(`Job card ${id} not found`)

    const now = new Date().toISOString()
    const startedAt = timestamps.startedAt || existing.startedAt
    const completedAt = timestamps.completedAt || existing.completedAt
    const deliveredAt = timestamps.deliveredAt || existing.deliveredAt
    const finalMileageOut = mileageOut !== undefined && mileageOut !== null ? mileageOut : existing.mileageOut

    this.db.prepare(`
      UPDATE job_cards
      SET status = ?, started_at = ?, completed_at = ?, delivered_at = ?,
          mileage_out = ?, updated_at = ?
      WHERE id = ?
    `).run(
      status,
      startedAt || null,
      completedAt || null,
      deliveredAt || null,
      finalMileageOut !== undefined ? finalMileageOut : null,
      now,
      id
    )

    return this.getJobCardById(id)!
  }

  public assignTechnician(id: string, technicianId: string | null, assignedByUserId?: string | null): JobCardWithDetails {
    const now = new Date().toISOString()
    this.db.prepare(`
      UPDATE job_cards
      SET technician_id = ?, assigned_by = ?, updated_at = ?
      WHERE id = ?
    `).run(technicianId || null, technicianId ? (assignedByUserId || null) : null, now, id)

    return this.getJobCardById(id)!
  }

  // --- Services Line Items ---

  public addService(jobCardId: string, input: AddJobCardServiceInput): JobCardServiceItem {
    const id = uuidv4()
    const now = new Date().toISOString()

    this.db.prepare(`
      INSERT INTO job_card_services (
        id, job_card_id, service_id, service_name,
        price_amount, labor_amount, status, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'Pending', ?, ?, ?)
    `).run(
      id,
      jobCardId,
      input.serviceId || null,
      input.serviceName,
      input.priceAmount,
      input.laborAmount,
      input.notes || null,
      now,
      now
    )

    const row = this.db.prepare('SELECT * FROM job_card_services WHERE id = ?').get(id) as any
    return {
      id: row.id,
      jobCardId: row.job_card_id,
      serviceId: row.service_id,
      serviceName: row.service_name,
      priceAmount: row.price_amount,
      laborAmount: row.labor_amount,
      status: row.status,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  public updateService(serviceLineId: string, input: UpdateJobCardServiceInput): JobCardServiceItem {
    const row = this.db.prepare('SELECT * FROM job_card_services WHERE id = ?').get(serviceLineId) as any
    if (!row) throw new Error(`Job card service line ${serviceLineId} not found`)

    const now = new Date().toISOString()
    const status = input.status !== undefined ? input.status : row.status
    const priceAmount = input.priceAmount !== undefined ? input.priceAmount : row.price_amount
    const laborAmount = input.laborAmount !== undefined ? input.laborAmount : row.labor_amount
    const notes = input.notes !== undefined ? input.notes : row.notes

    this.db.prepare(`
      UPDATE job_card_services
      SET status = ?, price_amount = ?, labor_amount = ?, notes = ?, updated_at = ?
      WHERE id = ?
    `).run(status, priceAmount, laborAmount, notes || null, now, serviceLineId)

    const updated = this.db.prepare('SELECT * FROM job_card_services WHERE id = ?').get(serviceLineId) as any
    return {
      id: updated.id,
      jobCardId: updated.job_card_id,
      serviceId: updated.service_id,
      serviceName: updated.service_name,
      priceAmount: updated.price_amount,
      laborAmount: updated.labor_amount,
      status: updated.status,
      notes: updated.notes,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at
    }
  }

  public removeService(serviceLineId: string): void {
    this.db.prepare('DELETE FROM job_card_services WHERE id = ?').run(serviceLineId)
  }

  // --- Parts Line Items with Stock Movements Ledger ---

  public addPart(
    jobCardId: string,
    item: { id: string; name: string; costPriceAmount: number; sellingPriceAmount: number },
    quantity: number,
    unitPriceAmount?: number,
    createdByUserId?: string | null
  ): JobCardPartItem {
    const jc = this.getJobCardById(jobCardId)
    if (!jc) throw new Error(`Job card ${jobCardId} not found`)

    const partLineId = uuidv4()
    const now = new Date().toISOString()
    const actualUnitPrice = unitPriceAmount !== undefined ? unitPriceAmount : item.sellingPriceAmount
    const totalAmount = Math.round(quantity * actualUnitPrice)

    let createdPartItem: JobCardPartItem | null = null

    const transaction = this.db.transaction(() => {
      // 1. Record stock movement: job_card_out (negative quantity)
      const movement = this.stockMovementsRepo.createMovement({
        itemId: item.id,
        movementType: 'job_card_out',
        quantity: -quantity,
        referenceType: 'job_card',
        referenceId: jobCardId,
        reason: `Allocated to Job Card ${jc.jobCardNumber}`,
        costPriceAmount: item.costPriceAmount,
        createdBy: createdByUserId
      })

      // 2. Insert into job_card_parts
      this.db.prepare(`
        INSERT INTO job_card_parts (
          id, job_card_id, inventory_item_id, quantity,
          unit_price_amount, total_amount, stock_movement_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        partLineId,
        jobCardId,
        item.id,
        quantity,
        actualUnitPrice,
        totalAmount,
        movement.id,
        now,
        now
      )

      createdPartItem = {
        id: partLineId,
        jobCardId,
        inventoryItemId: item.id,
        itemName: item.name,
        quantity,
        unitPriceAmount: actualUnitPrice,
        totalAmount,
        stockMovementId: movement.id,
        createdAt: now,
        updatedAt: now
      }
    })

    transaction()

    return createdPartItem!
  }

  public removePart(partLineId: string, createdByUserId?: string | null): void {
    const part = this.db.prepare('SELECT * FROM job_card_parts WHERE id = ?').get(partLineId) as any
    if (!part) throw new Error(`Job card part ${partLineId} not found`)

    const jc = this.getJobCardById(part.job_card_id)

    const transaction = this.db.transaction(() => {
      // 1. Record return_in counter-movement to restore stock in ledger
      this.stockMovementsRepo.createMovement({
        itemId: part.inventory_item_id,
        movementType: 'return_in',
        quantity: part.quantity,
        referenceType: 'job_card',
        referenceId: part.job_card_id,
        reason: `Returned from Job Card ${jc?.jobCardNumber || part.job_card_id}`,
        createdBy: createdByUserId
      })

      // 2. Delete part row
      this.db.prepare('DELETE FROM job_card_parts WHERE id = ?').run(partLineId)
    })

    transaction()
  }

  private calculateTotals(services: JobCardServiceItem[], parts: JobCardPartItem[]): JobCardTotals {
    let subtotalServices = 0
    let subtotalLabor = 0
    let subtotalParts = 0

    for (const s of services) {
      subtotalServices += s.priceAmount
      subtotalLabor += s.laborAmount
    }
    for (const p of parts) {
      subtotalParts += p.totalAmount
    }

    return {
      subtotalServices,
      subtotalLabor,
      subtotalParts,
      grandTotal: subtotalServices + subtotalLabor + subtotalParts
    }
  }
}
