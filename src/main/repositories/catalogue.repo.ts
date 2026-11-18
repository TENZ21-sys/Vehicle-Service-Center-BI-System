import Database from 'better-sqlite3'
import { v4 as uuidv4 } from 'uuid'
import { DatabaseManager } from '../database/connection'
import {
  ServiceCategory,
  ServiceItem,
  CreateServiceInput,
  UpdateServiceInput,
  CreateServiceCategoryInput,
  UpdateServiceCategoryInput
} from '@shared/types/catalogue.types'

export class CatalogueRepository {
  private explicitDb?: Database.Database

  constructor(db?: Database.Database) {
    this.explicitDb = db
  }

  private get db(): Database.Database {
    return this.explicitDb || DatabaseManager.getInstance().getActiveDb()
  }

  public listCategories(includeInactive = false): ServiceCategory[] {
    const query = includeInactive
      ? 'SELECT * FROM service_categories ORDER BY sort_order ASC, name ASC'
      : 'SELECT * FROM service_categories WHERE is_active = 1 ORDER BY sort_order ASC, name ASC'
    const rows = this.db.prepare(query).all() as any[]
    return rows.map((r) => this.mapCategoryRow(r))
  }

  public getCategoryById(id: string): ServiceCategory | null {
    const row = this.db.prepare('SELECT * FROM service_categories WHERE id = ?').get(id) as any
    return row ? this.mapCategoryRow(row) : null
  }

  public createCategory(input: CreateServiceCategoryInput): ServiceCategory {
    const id = uuidv4()
    const now = new Date().toISOString()
    this.db
      .prepare(
        `INSERT INTO service_categories (id, name, description, is_active, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, 1, ?, ?, ?)`
      )
      .run(id, input.name, input.description || null, input.sortOrder || 0, now, now)
    return this.getCategoryById(id)!
  }

  public updateCategory(id: string, input: UpdateServiceCategoryInput): ServiceCategory {
    const now = new Date().toISOString()
    const existing = this.getCategoryById(id)
    if (!existing) throw new Error(`Service category ${id} not found`)

    const name = input.name !== undefined ? input.name : existing.name
    const description = input.description !== undefined ? input.description : existing.description
    const sortOrder = input.sortOrder !== undefined ? input.sortOrder : existing.sortOrder

    this.db
      .prepare(
        `UPDATE service_categories
         SET name = ?, description = ?, sort_order = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(name, description || null, sortOrder, now, id)
    return this.getCategoryById(id)!
  }

  public listServices(filter?: {
    categoryId?: string
    search?: string
    includeInactive?: boolean
  }): ServiceItem[] {
    let sql = `
      SELECT s.*, sc.name as category_name
      FROM services s
      LEFT JOIN service_categories sc ON s.category_id = sc.id
      WHERE 1=1
    `
    const params: any[] = []

    if (!filter?.includeInactive) {
      sql += ' AND s.is_active = 1'
    }
    if (filter?.categoryId) {
      sql += ' AND s.category_id = ?'
      params.push(filter.categoryId)
    }
    if (filter?.search) {
      sql += ' AND (s.name LIKE ? OR s.description LIKE ?)'
      const term = `%${filter.search}%`
      params.push(term, term)
    }

    sql += ' ORDER BY s.name ASC'

    const rows = this.db.prepare(sql).all(...params) as any[]
    const serviceIds = rows.map((r) => r.id)
    const vehicleCatMap = this.getVehicleCategoriesForServices(serviceIds)

    return rows.map((r) => this.mapServiceRow(r, vehicleCatMap.get(r.id) || []))
  }

  public getServiceById(id: string): ServiceItem | null {
    const row = this.db
      .prepare(
        `SELECT s.*, sc.name as category_name
         FROM services s
         LEFT JOIN service_categories sc ON s.category_id = sc.id
         WHERE s.id = ?`
      )
      .get(id) as any
    if (!row) return null

    const vehicleCatIds = this.getServiceVehicleCategoryIds(id)
    return this.mapServiceRow(row, vehicleCatIds)
  }

  public createService(input: CreateServiceInput): ServiceItem {
    const id = uuidv4()
    const now = new Date().toISOString()

    const stmt = this.db.prepare(`
      INSERT INTO services (
        id, category_id, name, description,
        base_price_amount, labor_charge_amount,
        estimated_minutes, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `)

    stmt.run(
      id,
      input.categoryId || null,
      input.name,
      input.description || null,
      input.basePriceAmount,
      input.laborChargeAmount,
      input.estimatedMinutes || null,
      now,
      now
    )

    if (input.vehicleCategoryIds && input.vehicleCategoryIds.length > 0) {
      this.setServiceVehicleCategories(id, input.vehicleCategoryIds)
    }

    return this.getServiceById(id)!
  }

  public updateService(id: string, input: UpdateServiceInput): ServiceItem {
    const now = new Date().toISOString()
    const existing = this.getServiceById(id)
    if (!existing) throw new Error(`Service ${id} not found`)

    const categoryId = input.categoryId !== undefined ? input.categoryId : existing.categoryId
    const name = input.name !== undefined ? input.name : existing.name
    const description = input.description !== undefined ? input.description : existing.description
    const basePriceAmount =
      input.basePriceAmount !== undefined ? input.basePriceAmount : existing.basePriceAmount
    const laborChargeAmount =
      input.laborChargeAmount !== undefined ? input.laborChargeAmount : existing.laborChargeAmount
    const estimatedMinutes =
      input.estimatedMinutes !== undefined ? input.estimatedMinutes : existing.estimatedMinutes

    this.db
      .prepare(
        `UPDATE services
         SET category_id = ?, name = ?, description = ?,
             base_price_amount = ?, labor_charge_amount = ?,
             estimated_minutes = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(
        categoryId || null,
        name,
        description || null,
        basePriceAmount,
        laborChargeAmount,
        estimatedMinutes || null,
        now,
        id
      )

    if (input.vehicleCategoryIds !== undefined) {
      this.setServiceVehicleCategories(id, input.vehicleCategoryIds)
    }

    return this.getServiceById(id)!
  }

  public deactivateService(id: string): void {
    const now = new Date().toISOString()
    this.db
      .prepare('UPDATE services SET is_active = 0, updated_at = ? WHERE id = ?')
      .run(now, id)
  }

  public setServiceVehicleCategories(serviceId: string, vehicleCategoryIds: string[]): void {
    this.db.prepare('DELETE FROM service_vehicle_categories WHERE service_id = ?').run(serviceId)
    if (vehicleCategoryIds.length === 0) return

    const insert = this.db.prepare(
      'INSERT INTO service_vehicle_categories (service_id, vehicle_category_id) VALUES (?, ?)'
    )
    for (const vCatId of vehicleCategoryIds) {
      insert.run(serviceId, vCatId)
    }
  }

  public getServiceVehicleCategoryIds(serviceId: string): string[] {
    const rows = this.db
      .prepare(
        'SELECT vehicle_category_id FROM service_vehicle_categories WHERE service_id = ?'
      )
      .all(serviceId) as { vehicle_category_id: string }[]
    return rows.map((r) => r.vehicle_category_id)
  }

  private getVehicleCategoriesForServices(serviceIds: string[]): Map<string, string[]> {
    const map = new Map<string, string[]>()
    if (serviceIds.length === 0) return map

    const placeholders = serviceIds.map(() => '?').join(',')
    const rows = this.db
      .prepare(
        `SELECT service_id, vehicle_category_id
         FROM service_vehicle_categories
         WHERE service_id IN (${placeholders})`
      )
      .all(...serviceIds) as { service_id: string; vehicle_category_id: string }[]

    for (const r of rows) {
      const list = map.get(r.service_id) || []
      list.push(r.vehicle_category_id)
      map.set(r.service_id, list)
    }
    return map
  }

  private mapCategoryRow(row: any): ServiceCategory {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      isActive: row.is_active === 1,
      sortOrder: row.sort_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  private mapServiceRow(row: any, vehicleCategoryIds: string[]): ServiceItem {
    return {
      id: row.id,
      categoryId: row.category_id,
      categoryName: row.category_name || null,
      name: row.name,
      description: row.description,
      basePriceAmount: row.base_price_amount,
      laborChargeAmount: row.labor_charge_amount,
      estimatedMinutes: row.estimated_minutes,
      isActive: row.is_active === 1,
      applicableVehicleCategoryIds: vehicleCategoryIds,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }
}
