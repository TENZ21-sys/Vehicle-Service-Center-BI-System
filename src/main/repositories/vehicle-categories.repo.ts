import { DatabaseManager } from '../database/connection'
import { v4 as uuidv4 } from 'uuid'
import { VehicleCategory, CategoryCustomField } from '@shared/types/vehicle.types'
import { ConflictError, NotFoundError } from '../utils/errors'

export class VehicleCategoriesRepository {
  private dbManager: DatabaseManager

  constructor(dbManager = DatabaseManager.getInstance()) {
    this.dbManager = dbManager
  }

  public findAll(includeInactive = false): VehicleCategory[] {
    const db = this.dbManager.getActiveDb()
    const query = `
      SELECT id, name, description, extra_fields as extraFields,
             sort_order as sortOrder, is_active as isActive,
             created_at as createdAt, updated_at as updatedAt
      FROM vehicle_categories
      ${includeInactive ? '' : 'WHERE is_active = 1'}
      ORDER BY sort_order ASC, name ASC
    `
    const rows = db.prepare(query).all() as Array<Omit<VehicleCategory, 'extraFields' | 'isActive'> & { extraFields: string; isActive: number }>

    return rows.map((r) => ({
      ...r,
      isActive: r.isActive === 1,
      extraFields: r.extraFields ? this.safeParseJson<CategoryCustomField[]>(r.extraFields, []) : []
    }))
  }

  public findById(id: string): VehicleCategory {
    const db = this.dbManager.getActiveDb()
    const row = db.prepare(`
      SELECT id, name, description, extra_fields as extraFields,
             sort_order as sortOrder, is_active as isActive,
             created_at as createdAt, updated_at as updatedAt
      FROM vehicle_categories
      WHERE id = ?
    `).get(id) as (Omit<VehicleCategory, 'extraFields' | 'isActive'> & { extraFields: string; isActive: number }) | undefined

    if (!row) {
      throw new NotFoundError('Vehicle Category', id)
    }

    return {
      ...row,
      isActive: row.isActive === 1,
      extraFields: row.extraFields ? this.safeParseJson<CategoryCustomField[]>(row.extraFields, []) : []
    }
  }

  public create(data: {
    name: string
    description?: string
    extraFields?: CategoryCustomField[]
    sortOrder?: number
  }): VehicleCategory {
    const db = this.dbManager.getActiveDb()
    const existing = db.prepare('SELECT id FROM vehicle_categories WHERE name = ?').get(data.name)
    if (existing) {
      throw new ConflictError(`Vehicle category "${data.name}" already exists.`)
    }

    const id = uuidv4()
    const now = new Date().toISOString()
    const extraFieldsStr = JSON.stringify(data.extraFields || [])
    const sortOrder = data.sortOrder ?? 0

    db.prepare(`
      INSERT INTO vehicle_categories (id, name, description, extra_fields, sort_order, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    `).run(id, data.name, data.description || null, extraFieldsStr, sortOrder, now, now)

    return this.findById(id)
  }

  public update(
    id: string,
    updates: {
      name?: string
      description?: string
      extraFields?: CategoryCustomField[]
      sortOrder?: number
      isActive?: boolean
    }
  ): VehicleCategory {
    const db = this.dbManager.getActiveDb()
    this.findById(id) // Ensure exists

    const sets: string[] = ['updated_at = ?']
    const params: (string | number | null)[] = [new Date().toISOString()]

    if (updates.name !== undefined) {
      const existing = db.prepare('SELECT id FROM vehicle_categories WHERE name = ? AND id != ?').get(updates.name, id)
      if (existing) {
        throw new ConflictError(`Another category named "${updates.name}" already exists.`)
      }
      sets.push('name = ?')
      params.push(updates.name)
    }
    if (updates.description !== undefined) {
      sets.push('description = ?')
      params.push(updates.description || null)
    }
    if (updates.extraFields !== undefined) {
      sets.push('extra_fields = ?')
      params.push(JSON.stringify(updates.extraFields))
    }
    if (updates.sortOrder !== undefined) {
      sets.push('sort_order = ?')
      params.push(updates.sortOrder)
    }
    if (updates.isActive !== undefined) {
      sets.push('is_active = ?')
      params.push(updates.isActive ? 1 : 0)
    }

    params.push(id)
    db.prepare(`UPDATE vehicle_categories SET ${sets.join(', ')} WHERE id = ?`).run(...params)

    return this.findById(id)
  }

  public deactivate(id: string): void {
    const db = this.dbManager.getActiveDb()
    this.findById(id)
    const now = new Date().toISOString()
    db.prepare('UPDATE vehicle_categories SET is_active = 0, updated_at = ? WHERE id = ?').run(now, id)
  }

  private safeParseJson<T>(str: string, fallback: T): T {
    try {
      return JSON.parse(str)
    } catch {
      return fallback
    }
  }
}
