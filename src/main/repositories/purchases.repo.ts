import Database from 'better-sqlite3'
import { v4 as uuidv4 } from 'uuid'
import { DatabaseManager } from '../database/connection'
import {
  Purchase,
  PurchaseItem,
  CreatePurchaseInput
} from '@shared/types/inventory.types'
import { SequenceRepository } from './sequence.repo'
import { StockMovementsRepository } from './stock-movements.repo'

export class PurchasesRepository {
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

  public createPurchase(
    input: CreatePurchaseInput,
    createdByUserId?: string | null
  ): Purchase {
    const purchaseId = uuidv4()
    const now = new Date().toISOString()
    const purchaseNumber = this.sequenceRepo.getNextNumber('purchase')

    // Calculate total
    let totalAmount = 0
    for (const item of input.items) {
      totalAmount += Math.round(item.quantity * item.unitCostAmount)
    }

    // Execute atomically
    const insertPurchase = this.db.prepare(`
      INSERT INTO purchases (
        id, supplier_id, purchase_number, purchase_date,
        total_amount, notes, created_by, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `)

    const insertPurchaseItem = this.db.prepare(`
      INSERT INTO purchase_items (
        id, purchase_id, item_id, quantity,
        unit_cost_amount, total_amount, stock_movement_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const transaction = this.db.transaction(() => {
      insertPurchase.run(
        purchaseId,
        input.supplierId || null,
        purchaseNumber,
        input.purchaseDate,
        totalAmount,
        input.notes || null,
        createdByUserId || null,
        now,
        now
      )

      for (const line of input.items) {
        const itemId = line.itemId
        const lineTotal = Math.round(line.quantity * line.unitCostAmount)
        const purchaseItemId = uuidv4()

        // Write append-only stock movement
        const movement = this.stockMovementsRepo.createMovement({
          itemId,
          movementType: 'purchase_in',
          quantity: line.quantity,
          referenceType: 'purchase',
          referenceId: purchaseId,
          reason: `Stock intake from PO ${purchaseNumber}`,
          costPriceAmount: line.unitCostAmount,
          createdBy: createdByUserId
        })

        // Insert purchase item record
        insertPurchaseItem.run(
          purchaseItemId,
          purchaseId,
          itemId,
          line.quantity,
          line.unitCostAmount,
          lineTotal,
          movement.id,
          now
        )
      }
    })

    transaction()

    return this.getPurchaseById(purchaseId)!
  }

  public getPurchaseById(id: string): Purchase | null {
    const row = this.db
      .prepare(
        `SELECT p.*, s.name as supplier_name, u.username as created_by_name
         FROM purchases p
         LEFT JOIN suppliers s ON p.supplier_id = s.id
         LEFT JOIN users u ON p.created_by = u.id
         WHERE p.id = ?`
      )
      .get(id) as any

    if (!row) return null

    const itemRows = this.db
      .prepare(
        `SELECT pi.*, i.name as item_name, i.sku as item_sku, uom.abbreviation as unit_abbr
         FROM purchase_items pi
         LEFT JOIN inventory_items i ON pi.item_id = i.id
         LEFT JOIN units_of_measure uom ON i.unit_id = uom.id
         WHERE pi.purchase_id = ?
         ORDER BY pi.created_at ASC`
      )
      .all(id) as any[]

    const items: PurchaseItem[] = itemRows.map((ir) => ({
      id: ir.id,
      purchaseId: ir.purchase_id,
      itemId: ir.item_id,
      itemName: ir.item_name || 'Unknown Item',
      itemSku: ir.item_sku || null,
      unitAbbr: ir.unit_abbr || null,
      quantity: Number(ir.quantity),
      unitCostAmount: ir.unit_cost_amount,
      totalAmount: ir.total_amount,
      stockMovementId: ir.stock_movement_id,
      createdAt: ir.created_at
    }))

    return {
      id: row.id,
      supplierId: row.supplier_id,
      supplierName: row.supplier_name || null,
      purchaseNumber: row.purchase_number,
      purchaseDate: row.purchase_date,
      totalAmount: row.total_amount,
      notes: row.notes,
      createdBy: row.created_by,
      createdByName: row.created_by_name || null,
      isActive: row.is_active === 1,
      items,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  public listPurchases(filter?: { supplierId?: string; limit?: number }): Purchase[] {
    let sql = `
      SELECT p.*, s.name as supplier_name, u.username as created_by_name
      FROM purchases p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.is_active = 1
    `
    const params: any[] = []

    if (filter?.supplierId) {
      sql += ' AND p.supplier_id = ?'
      params.push(filter.supplierId)
    }

    sql += ' ORDER BY p.purchase_date DESC, p.created_at DESC'

    if (filter?.limit) {
      sql += ' LIMIT ?'
      params.push(filter.limit)
    }

    const rows = this.db.prepare(sql).all(...params) as any[]

    return rows.map((r) => ({
      id: r.id,
      supplierId: r.supplier_id,
      supplierName: r.supplier_name || null,
      purchaseNumber: r.purchase_number,
      purchaseDate: r.purchase_date,
      totalAmount: r.total_amount,
      notes: r.notes,
      createdBy: r.created_by,
      createdByName: r.created_by_name || null,
      isActive: r.is_active === 1,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }))
  }
}
