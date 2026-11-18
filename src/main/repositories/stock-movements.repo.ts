import Database from 'better-sqlite3'
import { v4 as uuidv4 } from 'uuid'
import { DatabaseManager } from '../database/connection'
import { StockMovement, StockMovementType, StockReferenceType } from '@shared/types/inventory.types'
import { MoneyAmount } from '@shared/types/money.types'

export interface CreateMovementRecord {
  itemId: string
  movementType: StockMovementType
  quantity: number
  referenceType?: StockReferenceType | null
  referenceId?: string | null
  reason?: string | null
  costPriceAmount?: MoneyAmount | null
  createdBy?: string | null
}

export class StockMovementsRepository {
  private explicitDb?: Database.Database

  constructor(db?: Database.Database) {
    this.explicitDb = db
  }

  private get db(): Database.Database {
    return this.explicitDb || DatabaseManager.getInstance().getActiveDb()
  }

  /**
   * APPEND-ONLY: Inserts a single immutable movement into the stock ledger.
   * Modifying or deleting rows from stock_movements is strictly forbidden.
   */
  public createMovement(input: CreateMovementRecord): StockMovement {
    const id = uuidv4()
    const now = new Date().toISOString()

    this.db
      .prepare(
        `INSERT INTO stock_movements (
          id, item_id, movement_type, quantity,
          reference_type, reference_id, reason,
          cost_price_amount, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        input.itemId,
        input.movementType,
        input.quantity,
        input.referenceType || null,
        input.referenceId || null,
        input.reason || null,
        input.costPriceAmount !== undefined ? input.costPriceAmount : null,
        input.createdBy || null,
        now
      )

    return {
      id,
      itemId: input.itemId,
      movementType: input.movementType,
      quantity: input.quantity,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      reason: input.reason,
      costPriceAmount: input.costPriceAmount,
      createdBy: input.createdBy,
      createdAt: now
    }
  }

  public listByItem(itemId: string, limit = 50): StockMovement[] {
    const rows = this.db
      .prepare(
        `SELECT sm.*, u.username as created_by_name, i.name as item_name
         FROM stock_movements sm
         LEFT JOIN users u ON sm.created_by = u.id
         LEFT JOIN inventory_items i ON sm.item_id = i.id
         WHERE sm.item_id = ?
         ORDER BY sm.created_at DESC
         LIMIT ?`
      )
      .all(itemId, limit) as any[]

    return rows.map((r) => this.mapRow(r))
  }

  public listRecent(limit = 100): StockMovement[] {
    const rows = this.db
      .prepare(
        `SELECT sm.*, u.username as created_by_name, i.name as item_name
         FROM stock_movements sm
         LEFT JOIN users u ON sm.created_by = u.id
         LEFT JOIN inventory_items i ON sm.item_id = i.id
         ORDER BY sm.created_at DESC
         LIMIT ?`
      )
      .all(limit) as any[]

    return rows.map((r) => this.mapRow(r))
  }

  private mapRow(row: any): StockMovement {
    return {
      id: row.id,
      itemId: row.item_id,
      itemName: row.item_name || null,
      movementType: row.movement_type,
      quantity: row.quantity,
      referenceType: row.reference_type,
      referenceId: row.reference_id,
      reason: row.reason,
      costPriceAmount: row.cost_price_amount,
      createdBy: row.created_by,
      createdByName: row.created_by_name || null,
      createdAt: row.created_at
    }
  }
}
