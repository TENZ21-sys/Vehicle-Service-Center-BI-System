import Database from 'better-sqlite3'
import { v4 as uuidv4 } from 'uuid'
import { DatabaseManager } from '../database/connection'
import {
  InventoryCategory,
  UnitOfMeasure,
  InventoryItem,
  CreateInventoryItemInput,
  UpdateInventoryItemInput,
  CreateInventoryCategoryInput,
  UpdateInventoryCategoryInput
} from '@shared/types/inventory.types'

export class InventoryRepository {
  private explicitDb?: Database.Database

  constructor(db?: Database.Database) {
    this.explicitDb = db
  }

  private get db(): Database.Database {
    return this.explicitDb || DatabaseManager.getInstance().getActiveDb()
  }

  // --- Categories ---

  public listCategories(includeInactive = false): InventoryCategory[] {
    const sql = includeInactive
      ? 'SELECT * FROM inventory_categories ORDER BY sort_order ASC, name ASC'
      : 'SELECT * FROM inventory_categories WHERE is_active = 1 ORDER BY sort_order ASC, name ASC'
    const rows = this.db.prepare(sql).all() as any[]
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      isActive: r.is_active === 1,
      sortOrder: r.sort_order,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }))
  }

  public createCategory(input: CreateInventoryCategoryInput): InventoryCategory {
    const id = uuidv4()
    const now = new Date().toISOString()
    this.db
      .prepare(
        `INSERT INTO inventory_categories (id, name, description, is_active, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, 1, ?, ?, ?)`
      )
      .run(id, input.name, input.description || null, input.sortOrder || 0, now, now)
    const row = this.db.prepare('SELECT * FROM inventory_categories WHERE id = ?').get(id) as any
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

  public updateCategory(id: string, input: UpdateInventoryCategoryInput): InventoryCategory {
    const now = new Date().toISOString()
    const existing = this.db
      .prepare('SELECT * FROM inventory_categories WHERE id = ?')
      .get(id) as any
    if (!existing) throw new Error(`Category ${id} not found`)

    const name = input.name !== undefined ? input.name : existing.name
    const description = input.description !== undefined ? input.description : existing.description
    const sortOrder = input.sortOrder !== undefined ? input.sortOrder : existing.sort_order

    this.db
      .prepare(
        `UPDATE inventory_categories
         SET name = ?, description = ?, sort_order = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(name, description || null, sortOrder, now, id)

    const updated = this.db
      .prepare('SELECT * FROM inventory_categories WHERE id = ?')
      .get(id) as any
    return {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      isActive: updated.is_active === 1,
      sortOrder: updated.sort_order,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at
    }
  }

  // --- Units of Measure ---

  public listUnits(includeInactive = false): UnitOfMeasure[] {
    const sql = includeInactive
      ? 'SELECT * FROM units_of_measure ORDER BY name ASC'
      : 'SELECT * FROM units_of_measure WHERE is_active = 1 ORDER BY name ASC'
    const rows = this.db.prepare(sql).all() as any[]
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      abbreviation: r.abbreviation,
      isActive: r.is_active === 1,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }))
  }

  public createUnit(name: string, abbreviation: string): UnitOfMeasure {
    const id = uuidv4()
    const now = new Date().toISOString()
    this.db
      .prepare(
        `INSERT INTO units_of_measure (id, name, abbreviation, is_active, created_at, updated_at)
         VALUES (?, ?, ?, 1, ?, ?)`
      )
      .run(id, name, abbreviation, now, now)
    const row = this.db.prepare('SELECT * FROM units_of_measure WHERE id = ?').get(id) as any
    return {
      id: row.id,
      name: row.name,
      abbreviation: row.abbreviation,
      isActive: row.is_active === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  // --- Stock Ledger Calculation Invariants ---

  /**
   * CRITICAL INVARIANT:
   * Stock is ALWAYS calculated dynamically from the append-only stock_movements ledger.
   * There is NO current_stock column on inventory_items.
   */
  public calculateStock(itemId: string): number {
    const row = this.db
      .prepare('SELECT COALESCE(SUM(quantity), 0) as stock FROM stock_movements WHERE item_id = ?')
      .get(itemId) as { stock: number }
    return row ? Number(row.stock) : 0
  }

  public getCurrentStock(itemId: string): number {
    return this.calculateStock(itemId)
  }

  /**
   * Optimized batch calculation for all items in a single GROUP BY query.
   */
  public calculateAllStock(): Map<string, number> {
    const rows = this.db
      .prepare(
        'SELECT item_id, COALESCE(SUM(quantity), 0) as stock FROM stock_movements GROUP BY item_id'
      )
      .all() as { item_id: string; stock: number }[]

    const map = new Map<string, number>()
    for (const r of rows) {
      map.set(r.item_id, Number(r.stock))
    }
    return map
  }

  // --- Inventory Items ---

  public listItems(filter?: {
    categoryId?: string
    search?: string
    lowStockOnly?: boolean
    includeInactive?: boolean
  }): InventoryItem[] {
    let sql = `
      SELECT i.*,
             ic.name as category_name,
             uom.abbreviation as unit_abbr
      FROM inventory_items i
      LEFT JOIN inventory_categories ic ON i.category_id = ic.id
      LEFT JOIN units_of_measure uom ON i.unit_id = uom.id
      WHERE 1=1
    `
    const params: any[] = []

    if (!filter?.includeInactive) {
      sql += ' AND i.is_active = 1'
    }
    if (filter?.categoryId) {
      sql += ' AND i.category_id = ?'
      params.push(filter.categoryId)
    }
    if (filter?.search) {
      sql += ' AND (i.name LIKE ? OR i.sku LIKE ? OR i.location LIKE ?)'
      const term = `%${filter.search}%`
      params.push(term, term, term)
    }

    sql += ' ORDER BY i.name ASC'

    const rows = this.db.prepare(sql).all(...params) as any[]
    const stockMap = this.calculateAllStock()

    const items = rows.map((r) => {
      const currentStock = stockMap.get(r.id) ?? 0
      const isLowStock = currentStock <= r.reorder_level
      return this.mapItemRow(r, currentStock, isLowStock)
    })

    if (filter?.lowStockOnly) {
      return items.filter((item) => item.isLowStock)
    }

    return items
  }

  public getItemById(id: string): InventoryItem | null {
    const row = this.db
      .prepare(
        `SELECT i.*,
                ic.name as category_name,
                uom.abbreviation as unit_abbr
         FROM inventory_items i
         LEFT JOIN inventory_categories ic ON i.category_id = ic.id
         LEFT JOIN units_of_measure uom ON i.unit_id = uom.id
         WHERE i.id = ?`
      )
      .get(id) as any

    if (!row) return null
    const currentStock = this.calculateStock(id)
    const isLowStock = currentStock <= row.reorder_level
    return this.mapItemRow(row, currentStock, isLowStock)
  }

  public getItemBySku(sku: string): InventoryItem | null {
    const row = this.db
      .prepare(
        `SELECT i.*,
                ic.name as category_name,
                uom.abbreviation as unit_abbr
         FROM inventory_items i
         LEFT JOIN inventory_categories ic ON i.category_id = ic.id
         LEFT JOIN units_of_measure uom ON i.unit_id = uom.id
         WHERE i.sku = ?`
      )
      .get(sku) as any

    if (!row) return null
    const currentStock = this.calculateStock(row.id)
    const isLowStock = currentStock <= row.reorder_level
    return this.mapItemRow(row, currentStock, isLowStock)
  }

  public createItem(input: CreateInventoryItemInput): InventoryItem {
    const id = uuidv4()
    const now = new Date().toISOString()

    this.db
      .prepare(
        `INSERT INTO inventory_items (
          id, sku, name, description, category_id, unit_id,
          cost_price_amount, selling_price_amount, reorder_level,
          location, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
      )
      .run(
        id,
        input.sku || null,
        input.name,
        input.description || null,
        input.categoryId || null,
        input.unitId || null,
        input.costPriceAmount,
        input.sellingPriceAmount,
        input.reorderLevel !== undefined ? input.reorderLevel : 0,
        input.location || null,
        now,
        now
      )

    return this.getItemById(id)!
  }

  public updateItem(id: string, input: UpdateInventoryItemInput): InventoryItem {
    const now = new Date().toISOString()
    const existing = this.getItemById(id)
    if (!existing) throw new Error(`Inventory item ${id} not found`)

    const sku = input.sku !== undefined ? input.sku : existing.sku
    const name = input.name !== undefined ? input.name : existing.name
    const description = input.description !== undefined ? input.description : existing.description
    const categoryId = input.categoryId !== undefined ? input.categoryId : existing.categoryId
    const unitId = input.unitId !== undefined ? input.unitId : existing.unitId
    const costPriceAmount =
      input.costPriceAmount !== undefined ? input.costPriceAmount : existing.costPriceAmount
    const sellingPriceAmount =
      input.sellingPriceAmount !== undefined ? input.sellingPriceAmount : existing.sellingPriceAmount
    const reorderLevel =
      input.reorderLevel !== undefined ? input.reorderLevel : existing.reorderLevel
    const location = input.location !== undefined ? input.location : existing.location

    this.db
      .prepare(
        `UPDATE inventory_items
         SET sku = ?, name = ?, description = ?, category_id = ?, unit_id = ?,
             cost_price_amount = ?, selling_price_amount = ?, reorder_level = ?,
             location = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(
        sku || null,
        name,
        description || null,
        categoryId || null,
        unitId || null,
        costPriceAmount,
        sellingPriceAmount,
        reorderLevel,
        location || null,
        now,
        id
      )

    return this.getItemById(id)!
  }

  public deactivateItem(id: string): void {
    const now = new Date().toISOString()
    this.db
      .prepare('UPDATE inventory_items SET is_active = 0, updated_at = ? WHERE id = ?')
      .run(now, id)
  }

  private mapItemRow(row: any, currentStock: number, isLowStock: boolean): InventoryItem {
    return {
      id: row.id,
      sku: row.sku,
      name: row.name,
      description: row.description,
      categoryId: row.category_id,
      categoryName: row.category_name || null,
      unitId: row.unit_id,
      unitAbbr: row.unit_abbr || null,
      costPriceAmount: row.cost_price_amount,
      sellingPriceAmount: row.selling_price_amount,
      reorderLevel: Number(row.reorder_level),
      location: row.location,
      isActive: row.is_active === 1,
      currentStock,
      isLowStock,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }
}
