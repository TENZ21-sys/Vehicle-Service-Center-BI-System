import { DatabaseManager } from '../database/connection'
import { v4 as uuidv4 } from 'uuid'
import { Vehicle, VehicleWithCustomer, ServiceReminder, ReminderType } from '@shared/types/vehicle.types'
import { NotFoundError, ConflictError } from '../utils/errors'

export class VehicleRepository {
  private dbManager: DatabaseManager

  constructor(dbManager = DatabaseManager.getInstance()) {
    this.dbManager = dbManager
  }

  public findAll(includeInactive = false, limit = 100, offset = 0): VehicleWithCustomer[] {
    const db = this.dbManager.getActiveDb()
    const query = `
      SELECT v.id, v.customer_id as customerId, v.category_id as categoryId,
             vc.name as categoryName, v.registration_no as registrationNo,
             v.make, v.model, v.year, v.color, v.vin, v.engine_number as engineNumber,
             v.fuel_type as fuelType, v.transmission, v.extra_fields as extraFields,
             v.is_active as isActive, v.created_at as createdAt, v.updated_at as updatedAt,
             c.name as customerName, c.phone_primary as customerPhone
      FROM vehicles v
      INNER JOIN customers c ON c.id = v.customer_id
      LEFT JOIN vehicle_categories vc ON vc.id = v.category_id
      ${includeInactive ? '' : 'WHERE v.is_active = 1 AND c.is_active = 1'}
      ORDER BY v.created_at DESC
      LIMIT ? OFFSET ?
    `
    const rows = db.prepare(query).all(limit, offset) as Array<VehicleWithCustomer & { extraFields: string; isActive: number }>

    return rows.map((r) => {
      const extra = r.extraFields ? this.safeParseJson<Record<string, unknown>>(r.extraFields, {}) : {}
      return {
        ...r,
        imageUrl: (extra.imageUrl as string) || undefined,
        isActive: r.isActive === 1,
        extraFields: extra
      }
    })
  }

  public findById(id: string): VehicleWithCustomer {
    const db = this.dbManager.getActiveDb()
    const query = `
      SELECT v.id, v.customer_id as customerId, v.category_id as categoryId,
             vc.name as categoryName, v.registration_no as registrationNo,
             v.make, v.model, v.year, v.color, v.vin, v.engine_number as engineNumber,
             v.fuel_type as fuelType, v.transmission, v.extra_fields as extraFields,
             v.is_active as isActive, v.created_at as createdAt, v.updated_at as updatedAt,
             c.name as customerName, c.phone_primary as customerPhone
      FROM vehicles v
      INNER JOIN customers c ON c.id = v.customer_id
      LEFT JOIN vehicle_categories vc ON vc.id = v.category_id
      WHERE v.id = ?
    `
    const row = db.prepare(query).get(id) as (VehicleWithCustomer & { extraFields: string; isActive: number }) | undefined
    if (!row) {
      throw new NotFoundError('Vehicle', id)
    }

    const extra = row.extraFields ? this.safeParseJson<Record<string, unknown>>(row.extraFields, {}) : {}
    return {
      ...row,
      imageUrl: (extra.imageUrl as string) || undefined,
      isActive: row.isActive === 1,
      extraFields: extra
    }
  }

  public findByRegistration(regNo: string): VehicleWithCustomer | null {
    const db = this.dbManager.getActiveDb()
    const cleanReg = regNo.trim().toUpperCase()
    const query = `
      SELECT v.id, v.customer_id as customerId, v.category_id as categoryId,
             vc.name as categoryName, v.registration_no as registrationNo,
             v.make, v.model, v.year, v.color, v.vin, v.engine_number as engineNumber,
             v.fuel_type as fuelType, v.transmission, v.extra_fields as extraFields,
             v.is_active as isActive, v.created_at as createdAt, v.updated_at as updatedAt,
             c.name as customerName, c.phone_primary as customerPhone
      FROM vehicles v
      INNER JOIN customers c ON c.id = v.customer_id
      LEFT JOIN vehicle_categories vc ON vc.id = v.category_id
      WHERE UPPER(v.registration_no) = ? AND v.is_active = 1
    `
    const row = db.prepare(query).get(cleanReg) as (VehicleWithCustomer & { extraFields: string; isActive: number }) | undefined
    if (!row) return null

    const regExtra = row.extraFields ? this.safeParseJson<Record<string, unknown>>(row.extraFields, {}) : {}
    return {
      ...row,
      imageUrl: (regExtra.imageUrl as string) || undefined,
      isActive: row.isActive === 1,
      extraFields: regExtra
    }
  }

  public create(data: {
    customerId: string
    categoryId?: string | null
    registrationNo: string
    make?: string
    model?: string
    year?: number | null
    color?: string
    vin?: string
    engineNumber?: string
    fuelType?: string
    transmission?: string
    extraFields?: Record<string, unknown>
  }): VehicleWithCustomer {
    const db = this.dbManager.getActiveDb()
    const existing = this.findByRegistration(data.registrationNo)
    if (existing) {
      throw new ConflictError(
        `Vehicle with registration number "${data.registrationNo}" is already registered to "${existing.customerName}".`
      )
    }

    const id = uuidv4()
    const now = new Date().toISOString()
    const extraFieldsStr = JSON.stringify(data.extraFields || {})

    db.prepare(`
      INSERT INTO vehicles (id, customer_id, category_id, registration_no, make, model, year, color, vin, engine_number, fuel_type, transmission, extra_fields, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(
      id,
      data.customerId,
      data.categoryId || null,
      data.registrationNo.toUpperCase().trim(),
      data.make || null,
      data.model || null,
      data.year || null,
      data.color || null,
      data.vin || null,
      data.engineNumber || null,
      data.fuelType || null,
      data.transmission || null,
      extraFieldsStr,
      now,
      now
    )

    return this.findById(id)
  }

  public update(id: string, updates: Partial<Vehicle>): VehicleWithCustomer {
    const db = this.dbManager.getActiveDb()
    this.findById(id)

    const sets: string[] = ['updated_at = ?']
    const params: (string | number | null)[] = [new Date().toISOString()]

    if (updates.categoryId !== undefined) {
      sets.push('category_id = ?')
      params.push(updates.categoryId || null)
    }
    if (updates.registrationNo !== undefined) {
      const reg = updates.registrationNo.trim().toUpperCase()
      const existing = db.prepare('SELECT id FROM vehicles WHERE registration_no = ? AND id != ? AND is_active = 1').get(reg, id)
      if (existing) {
        throw new ConflictError(`Another vehicle with registration "${reg}" already exists.`)
      }
      sets.push('registration_no = ?')
      params.push(reg)
    }
    if (updates.make !== undefined) {
      sets.push('make = ?')
      params.push(updates.make || null)
    }
    if (updates.model !== undefined) {
      sets.push('model = ?')
      params.push(updates.model || null)
    }
    if (updates.year !== undefined) {
      sets.push('year = ?')
      params.push(updates.year || null)
    }
    if (updates.color !== undefined) {
      sets.push('color = ?')
      params.push(updates.color || null)
    }
    if (updates.vin !== undefined) {
      sets.push('vin = ?')
      params.push(updates.vin || null)
    }
    if (updates.engineNumber !== undefined) {
      sets.push('engine_number = ?')
      params.push(updates.engineNumber || null)
    }
    if (updates.fuelType !== undefined) {
      sets.push('fuel_type = ?')
      params.push(updates.fuelType || null)
    }
    if (updates.transmission !== undefined) {
      sets.push('transmission = ?')
      params.push(updates.transmission || null)
    }
    if (updates.extraFields !== undefined) {
      sets.push('extra_fields = ?')
      params.push(JSON.stringify(updates.extraFields))
    }
    if (updates.isActive !== undefined) {
      sets.push('is_active = ?')
      params.push(updates.isActive ? 1 : 0)
    }

    params.push(id)
    db.prepare(`UPDATE vehicles SET ${sets.join(', ')} WHERE id = ?`).run(...params)

    return this.findById(id)
  }

  public deactivate(id: string): void {
    const db = this.dbManager.getActiveDb()
    this.findById(id)
    const now = new Date().toISOString()
    db.prepare('UPDATE vehicles SET is_active = 0, updated_at = ? WHERE id = ?').run(now, id)
  }

  // --- Service Reminders ---

  public createReminder(data: {
    vehicleId: string
    serviceId?: string | null
    reminderType: ReminderType
    dueDate?: string | null
    dueMileage?: number | null
    description: string
  }): ServiceReminder {
    const db = this.dbManager.getActiveDb()
    this.findById(data.vehicleId) // Assert vehicle exists

    const id = uuidv4()
    const now = new Date().toISOString()

    db.prepare(`
      INSERT INTO service_reminders (id, vehicle_id, service_id, reminder_type, due_date, due_mileage, description, is_completed, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1, ?, ?)
    `).run(
      id,
      data.vehicleId,
      data.serviceId || null,
      data.reminderType,
      data.dueDate || null,
      data.dueMileage || null,
      data.description,
      now,
      now
    )

    return this.getReminderById(id)
  }

  public getReminderById(id: string): ServiceReminder {
    const db = this.dbManager.getActiveDb()
    const query = `
      SELECT sr.id, sr.vehicle_id as vehicleId, sr.service_id as serviceId,
             sr.reminder_type as reminderType, sr.due_date as dueDate,
             sr.due_mileage as dueMileage, sr.description,
             sr.is_completed as isCompleted, sr.completed_at as completedAt,
             sr.completed_job_card_id as completedJobCardId,
             sr.is_active as isActive, sr.created_at as createdAt, sr.updated_at as updatedAt,
             v.registration_no as registrationNo, c.name as customerName
      FROM service_reminders sr
      INNER JOIN vehicles v ON v.id = sr.vehicle_id
      INNER JOIN customers c ON c.id = v.customer_id
      WHERE sr.id = ?
    `
    const row = db.prepare(query).get(id) as (ServiceReminder & { isCompleted: number; isActive: number }) | undefined
    if (!row) {
      throw new NotFoundError('Service Reminder', id)
    }

    return {
      ...row,
      isCompleted: row.isCompleted === 1,
      isActive: row.isActive === 1
    }
  }

  public listRemindersForVehicle(vehicleId: string): ServiceReminder[] {
    const db = this.dbManager.getActiveDb()
    const query = `
      SELECT sr.id, sr.vehicle_id as vehicleId, sr.service_id as serviceId,
             sr.reminder_type as reminderType, sr.due_date as dueDate,
             sr.due_mileage as dueMileage, sr.description,
             sr.is_completed as isCompleted, sr.completed_at as completedAt,
             sr.completed_job_card_id as completedJobCardId,
             sr.is_active as isActive, sr.created_at as createdAt, sr.updated_at as updatedAt
      FROM service_reminders sr
      WHERE sr.vehicle_id = ? AND sr.is_active = 1
      ORDER BY sr.is_completed ASC, sr.due_date ASC
    `
    const rows = db.prepare(query).all(vehicleId) as Array<ServiceReminder & { isCompleted: number; isActive: number }>

    return rows.map((r) => ({
      ...r,
      isCompleted: r.isCompleted === 1,
      isActive: r.isActive === 1
    }))
  }

  public listDueReminders(maxDate?: string, currentMileage?: number): ServiceReminder[] {
    const db = this.dbManager.getActiveDb()
    const today = maxDate || new Date().toISOString().split('T')[0]

    let query = `
      SELECT sr.id, sr.vehicle_id as vehicleId, sr.service_id as serviceId,
             sr.reminder_type as reminderType, sr.due_date as dueDate,
             sr.due_mileage as dueMileage, sr.description,
             sr.is_completed as isCompleted, sr.completed_at as completedAt,
             sr.is_active as isActive, sr.created_at as createdAt, sr.updated_at as updatedAt,
             v.registration_no as registrationNo, c.name as customerName
      FROM service_reminders sr
      INNER JOIN vehicles v ON v.id = sr.vehicle_id
      INNER JOIN customers c ON c.id = v.customer_id
      WHERE sr.is_completed = 0 AND sr.is_active = 1
        AND (
          (sr.reminder_type = 'date' AND sr.due_date <= ?)
    `
    const params: (string | number)[] = [today]

    if (currentMileage !== undefined) {
      query += ` OR (sr.reminder_type = 'mileage' AND sr.due_mileage <= ?)`
      params.push(currentMileage)
    }

    query += ` ) ORDER BY sr.due_date ASC`

    const rows = db.prepare(query).all(...params) as Array<ServiceReminder & { isCompleted: number; isActive: number }>

    return rows.map((r) => ({
      ...r,
      isCompleted: r.isCompleted === 1,
      isActive: r.isActive === 1
    }))
  }

  public completeReminder(id: string, jobCardId?: string): ServiceReminder {
    const db = this.dbManager.getActiveDb()
    this.getReminderById(id)
    const now = new Date().toISOString()

    db.prepare(`
      UPDATE service_reminders
      SET is_completed = 1, completed_at = ?, completed_job_card_id = ?, updated_at = ?
      WHERE id = ?
    `).run(now, jobCardId || null, now, id)

    return this.getReminderById(id)
  }

  private safeParseJson<T>(str: string, fallback: T): T {
    try {
      return JSON.parse(str)
    } catch {
      return fallback
    }
  }
}
