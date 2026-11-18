import { DatabaseManager } from '../database/connection'
import { v4 as uuidv4 } from 'uuid'
import { Customer, CustomerWithVehicles, CustomerSearchResult } from '@shared/types/customer.types'
import { Vehicle } from '@shared/types/vehicle.types'
import { NotFoundError } from '../utils/errors'

export class CustomerRepository {
  private dbManager: DatabaseManager

  constructor(dbManager = DatabaseManager.getInstance()) {
    this.dbManager = dbManager
  }

  public findAll(includeInactive = false, limit = 100, offset = 0): CustomerWithVehicles[] {
    const db = this.dbManager.getActiveDb()
    const query = `
      SELECT c.id, c.name, c.phone_primary as phonePrimary, c.phone_secondary as phoneSecondary,
             c.email, c.address, c.nic, c.notes, c.is_active as isActive,
             c.created_at as createdAt, c.updated_at as updatedAt,
             (SELECT COUNT(*) FROM vehicles v WHERE v.customer_id = c.id AND v.is_active = 1) as totalVehicles
      FROM customers c
      ${includeInactive ? '' : 'WHERE c.is_active = 1'}
      ORDER BY c.name ASC
      LIMIT ? OFFSET ?
    `
    const rows = db.prepare(query).all(limit, offset) as Array<Customer & { totalVehicles: number; isActive: number }>

    return rows.map((r) => ({
      ...r,
      isActive: r.isActive === 1,
      vehicles: []
    }))
  }

  public findById(id: string): CustomerWithVehicles {
    const db = this.dbManager.getActiveDb()
    const query = `
      SELECT id, name, phone_primary as phonePrimary, phone_secondary as phoneSecondary,
             email, address, nic, notes, is_active as isActive,
             created_at as createdAt, updated_at as updatedAt
      FROM customers
      WHERE id = ?
    `
    const row = db.prepare(query).get(id) as (Customer & { isActive: number }) | undefined
    if (!row) {
      throw new NotFoundError('Customer', id)
    }

    const vehicles = this.getCustomerVehicles(row.id)

    return {
      ...row,
      isActive: row.isActive === 1,
      vehicles,
      totalVehicles: vehicles.length
    }
  }

  public findByPhone(phone: string): Customer | null {
    const db = this.dbManager.getActiveDb()
    const cleanPhone = phone.trim()
    const row = db.prepare(`
      SELECT id, name, phone_primary as phonePrimary, phone_secondary as phoneSecondary,
             email, address, nic, notes, is_active as isActive,
             created_at as createdAt, updated_at as updatedAt
      FROM customers
      WHERE (phone_primary = ? OR phone_secondary = ?) AND is_active = 1
    `).get(cleanPhone, cleanPhone) as (Customer & { isActive: number }) | undefined

    if (!row) return null
    return { ...row, isActive: row.isActive === 1 }
  }

  public findByNic(nic: string): Customer | null {
    if (!nic.trim()) return null
    const db = this.dbManager.getActiveDb()
    const row = db.prepare(`
      SELECT id, name, phone_primary as phonePrimary, phone_secondary as phoneSecondary,
             email, address, nic, notes, is_active as isActive,
             created_at as createdAt, updated_at as updatedAt
      FROM customers
      WHERE nic = ? AND is_active = 1
    `).get(nic.trim()) as (Customer & { isActive: number }) | undefined

    if (!row) return null
    return { ...row, isActive: row.isActive === 1 }
  }

  public search(searchTerm: string, limit = 20): CustomerSearchResult[] {
    const db = this.dbManager.getActiveDb()
    const term = `%${searchTerm.trim()}%`
    const query = `
      SELECT c.id, c.name, c.phone_primary as phonePrimary, c.nic,
             (SELECT COUNT(*) FROM vehicles v WHERE v.customer_id = c.id AND v.is_active = 1) as vehicleCount
      FROM customers c
      WHERE c.is_active = 1
        AND (c.name LIKE ? OR c.phone_primary LIKE ? OR c.phone_secondary LIKE ? OR c.nic LIKE ?)
      ORDER BY c.name ASC
      LIMIT ?
    `
    return db.prepare(query).all(term, term, term, term, limit) as CustomerSearchResult[]
  }

  public create(data: {
    name: string
    phonePrimary: string
    phoneSecondary?: string
    email?: string
    address?: string
    nic?: string
    notes?: string
  }): CustomerWithVehicles {
    const db = this.dbManager.getActiveDb()
    const id = uuidv4()
    const now = new Date().toISOString()

    db.prepare(`
      INSERT INTO customers (id, name, phone_primary, phone_secondary, email, address, nic, notes, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(
      id,
      data.name,
      data.phonePrimary,
      data.phoneSecondary || null,
      data.email || null,
      data.address || null,
      data.nic || null,
      data.notes || null,
      now,
      now
    )

    return this.findById(id)
  }

  public update(id: string, updates: Partial<Customer>): CustomerWithVehicles {
    const db = this.dbManager.getActiveDb()
    this.findById(id)

    const sets: string[] = ['updated_at = ?']
    const params: (string | number | null)[] = [new Date().toISOString()]

    if (updates.name !== undefined) {
      sets.push('name = ?')
      params.push(updates.name)
    }
    if (updates.phonePrimary !== undefined) {
      sets.push('phone_primary = ?')
      params.push(updates.phonePrimary)
    }
    if (updates.phoneSecondary !== undefined) {
      sets.push('phone_secondary = ?')
      params.push(updates.phoneSecondary || null)
    }
    if (updates.email !== undefined) {
      sets.push('email = ?')
      params.push(updates.email || null)
    }
    if (updates.address !== undefined) {
      sets.push('address = ?')
      params.push(updates.address || null)
    }
    if (updates.nic !== undefined) {
      sets.push('nic = ?')
      params.push(updates.nic || null)
    }
    if (updates.notes !== undefined) {
      sets.push('notes = ?')
      params.push(updates.notes || null)
    }
    if (updates.isActive !== undefined) {
      sets.push('is_active = ?')
      params.push(updates.isActive ? 1 : 0)
    }

    params.push(id)
    db.prepare(`UPDATE customers SET ${sets.join(', ')} WHERE id = ?`).run(...params)

    return this.findById(id)
  }

  public deactivate(id: string): void {
    const db = this.dbManager.getActiveDb()
    this.findById(id)
    const now = new Date().toISOString()
    db.prepare('UPDATE customers SET is_active = 0, updated_at = ? WHERE id = ?').run(now, id)
  }

  public getCustomerVehicles(customerId: string): Vehicle[] {
    const db = this.dbManager.getActiveDb()
    const query = `
      SELECT v.id, v.customer_id as customerId, v.category_id as categoryId,
             vc.name as categoryName, v.registration_no as registrationNo,
             v.make, v.model, v.year, v.color, v.vin, v.engine_number as engineNumber,
             v.fuel_type as fuelType, v.transmission, v.extra_fields as extraFields,
             v.is_active as isActive, v.created_at as createdAt, v.updated_at as updatedAt
      FROM vehicles v
      LEFT JOIN vehicle_categories vc ON vc.id = v.category_id
      WHERE v.customer_id = ? AND v.is_active = 1
      ORDER BY v.created_at DESC
    `
    const rows = db.prepare(query).all(customerId) as Array<Vehicle & { extraFields: string; isActive: number }>

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

  private safeParseJson<T>(str: string, fallback: T): T {
    try {
      return JSON.parse(str)
    } catch {
      return fallback
    }
  }
}
