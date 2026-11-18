import { InventoryRepository } from '../repositories/inventory.repo'
import { StockMovementsRepository } from '../repositories/stock-movements.repo'
import { SettingsRepository } from '../repositories/settings.repo'
import { PermissionService } from './permissions.service'
import { AuditService } from './audit.service'
import { sessionManager } from './session'
import {
  InventoryCategory,
  UnitOfMeasure,
  InventoryItem,
  StockMovement,
  CreateInventoryItemInput
} from '@shared/types/inventory.types'
import {
  createInventoryItemSchema,
  updateInventoryItemSchema,
  createStockAdjustmentSchema,
  createInventoryCategorySchema,
  updateInventoryCategorySchema,
  createUnitOfMeasureSchema
} from '@shared/validation/inventory.schema'
import { ValidationError, NotFoundError, ConflictError } from '../utils/errors'

export class InventoryService {
  private repo: InventoryRepository
  private stockMovementsRepo: StockMovementsRepository
  private settingsRepo: SettingsRepository
  private permService: PermissionService
  private audit: AuditService

  constructor(
    repo = new InventoryRepository(),
    stockMovementsRepo = new StockMovementsRepository(),
    settingsRepo = new SettingsRepository(),
    permService = new PermissionService(),
    audit = new AuditService()
  ) {
    this.repo = repo
    this.stockMovementsRepo = stockMovementsRepo
    this.settingsRepo = settingsRepo
    this.permService = permService
    this.audit = audit
  }

  // --- Categories & Units ---

  public listCategories(includeInactive = false): InventoryCategory[] {
    this.permService.requirePermission('inventory:view')
    return this.repo.listCategories(includeInactive)
  }

  public createCategory(input: unknown): InventoryCategory {
    this.permService.requirePermission('inventory:create')
    const parse = createInventoryCategorySchema.safeParse(input)
    if (!parse.success) {
      throw new ValidationError(parse.error.issues[0]?.message || 'Invalid category data', parse.error.issues)
    }
    const session = sessionManager.requireSession()
    const cat = this.repo.createCategory(parse.data)
    this.audit.record({
      userId: session.userId,
      action: 'INVENTORY_CATEGORY_CREATED',
      entityType: 'inventory_category',
      entityId: cat.id,
      newValue: cat
    })
    return cat
  }

  public updateCategory(id: string, input: unknown): InventoryCategory {
    this.permService.requirePermission('inventory:edit')
    const parse = updateInventoryCategorySchema.safeParse(input)
    if (!parse.success) {
      throw new ValidationError(parse.error.issues[0]?.message || 'Invalid category data', parse.error.issues)
    }
    const session = sessionManager.requireSession()
    const updated = this.repo.updateCategory(id, parse.data)
    this.audit.record({
      userId: session.userId,
      action: 'INVENTORY_CATEGORY_UPDATED',
      entityType: 'inventory_category',
      entityId: id,
      newValue: updated
    })
    return updated
  }

  public listUnits(includeInactive = false): UnitOfMeasure[] {
    this.permService.requirePermission('inventory:view')
    return this.repo.listUnits(includeInactive)
  }

  public createUnit(name: string, abbreviation: string): UnitOfMeasure {
    this.permService.requirePermission('inventory:create')
    const parse = createUnitOfMeasureSchema.safeParse({ name, abbreviation })
    if (!parse.success) {
      throw new ValidationError(parse.error.issues[0]?.message || 'Invalid unit data', parse.error.issues)
    }
    const session = sessionManager.requireSession()
    const unit = this.repo.createUnit(parse.data.name, parse.data.abbreviation)
    this.audit.record({
      userId: session.userId,
      action: 'UNIT_OF_MEASURE_CREATED',
      entityType: 'unit_of_measure',
      entityId: unit.id,
      newValue: unit
    })
    return unit
  }

  // --- Inventory Items ---

  public listItems(filter?: {
    categoryId?: string
    search?: string
    lowStockOnly?: boolean
    includeInactive?: boolean
  }): InventoryItem[] {
    this.permService.requirePermission('inventory:view')
    return this.repo.listItems(filter)
  }

  public getItemById(id: string): InventoryItem {
    this.permService.requirePermission('inventory:view')
    const item = this.repo.getItemById(id)
    if (!item) {
      throw new NotFoundError('Inventory Item', id)
    }
    return item
  }

  public createItem(input: unknown): InventoryItem {
    this.permService.requirePermission('inventory:create')
    const parse = createInventoryItemSchema.safeParse(input)
    if (!parse.success) {
      throw new ValidationError(parse.error.issues[0]?.message || 'Invalid item data', parse.error.issues)
    }

    const data: CreateInventoryItemInput = parse.data as any

    // Check SKU uniqueness if provided
    if (data.sku) {
      const existingSku = this.repo.getItemBySku(data.sku)
      if (existingSku) {
        throw new ConflictError(`An item with SKU "${data.sku}" already exists`)
      }
    }

    const session = sessionManager.requireSession()
    const item = this.repo.createItem(data)

    // If initial stock was provided, write initial adjustment ledger movement
    if (data.initialStock && data.initialStock > 0) {
      this.stockMovementsRepo.createMovement({
        itemId: item.id,
        movementType: 'adjustment_in',
        quantity: data.initialStock,
        referenceType: 'adjustment',
        reason: 'Initial stock opening balance',
        costPriceAmount: item.costPriceAmount,
        createdBy: session.userId
      })
    }

    this.audit.record({
      userId: session.userId,
      action: 'INVENTORY_ITEM_CREATED',
      entityType: 'inventory_item',
      entityId: item.id,
      newValue: item
    })
    return this.getItemById(item.id)
  }

  public updateItem(id: string, input: unknown): InventoryItem {
    this.permService.requirePermission('inventory:edit')
    const parse = updateInventoryItemSchema.safeParse(input)
    if (!parse.success) {
      throw new ValidationError(parse.error.issues[0]?.message || 'Invalid item data', parse.error.issues)
    }

    const existing = this.repo.getItemById(id)
    if (!existing) {
      throw new NotFoundError('Inventory Item', id)
    }

    if (parse.data.sku && parse.data.sku !== existing.sku) {
      const existingSku = this.repo.getItemBySku(parse.data.sku)
      if (existingSku && existingSku.id !== id) {
        throw new ConflictError(`An item with SKU "${parse.data.sku}" already exists`)
      }
    }

    const session = sessionManager.requireSession()
    const updated = this.repo.updateItem(id, parse.data)

    this.audit.record({
      userId: session.userId,
      action: 'INVENTORY_ITEM_UPDATED',
      entityType: 'inventory_item',
      entityId: id,
      oldValue: existing,
      newValue: updated
    })
    return updated
  }

  public deactivateItem(id: string): void {
    this.permService.requirePermission('inventory:edit')
    const session = sessionManager.requireSession()
    const existing = this.repo.getItemById(id)
    if (!existing) {
      throw new NotFoundError('Inventory Item', id)
    }

    this.repo.deactivateItem(id)
    this.audit.record({
      userId: session.userId,
      action: 'INVENTORY_ITEM_DEACTIVATED',
      entityType: 'inventory_item',
      entityId: id,
      oldValue: existing
    })
  }

  // --- Stock Adjustments (Ledger Invariant) ---

  public adjustStock(input: unknown): StockMovement {
    this.permService.requirePermission('inventory:adjust')
    const parse = createStockAdjustmentSchema.safeParse(input)
    if (!parse.success) {
      throw new ValidationError(parse.error.issues[0]?.message || 'Invalid adjustment data', parse.error.issues)
    }

    const item = this.repo.getItemById(parse.data.itemId)
    if (!item) {
      throw new NotFoundError('Inventory Item', parse.data.itemId)
    }

    const currentStock = this.repo.calculateStock(item.id)
    const newStock = currentStock + parse.data.quantity

    // Check allow_negative_stock setting
    const setting = this.settingsRepo.get('inventory', 'allow_negative_stock')
    const allowNegative = setting ? Boolean(setting.value) : false
    if (!allowNegative && newStock < 0) {
      throw new ValidationError(
        `Adjustment would result in negative stock (${newStock}). Negative stock is disabled in settings.`
      )
    }

    const session = sessionManager.requireSession()
    const movementType = parse.data.quantity > 0 ? 'adjustment_in' : 'adjustment_out'

    const movement = this.stockMovementsRepo.createMovement({
      itemId: item.id,
      movementType,
      quantity: parse.data.quantity,
      referenceType: 'adjustment',
      reason: parse.data.reason,
      costPriceAmount: item.costPriceAmount,
      createdBy: session.userId
    })

    this.audit.record({
      userId: session.userId,
      action: 'STOCK_ADJUSTMENT_CREATED',
      entityType: 'stock_movement',
      entityId: movement.id,
      metadata: {
        itemId: item.id,
        itemName: item.name,
        quantity: parse.data.quantity,
        previousStock: currentStock,
        newStock,
        reason: parse.data.reason
      }
    })

    return movement
  }

  public getItemMovements(itemId: string, limit = 50): StockMovement[] {
    this.permService.requirePermission('inventory:view')
    return this.stockMovementsRepo.listByItem(itemId, limit)
  }
}
