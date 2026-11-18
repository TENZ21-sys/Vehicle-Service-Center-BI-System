import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as path from 'path'
import * as fs from 'fs'
import { MasterDatabaseManager } from '../../src/main/database/master'
import { DatabaseManager } from '../../src/main/database/connection'
import { sessionManager } from '../../src/main/services/session'
import { AuthService } from '../../src/main/services/auth.service'
import { InventoryService } from '../../src/main/services/inventory.service'
import { SuppliersService } from '../../src/main/services/suppliers.service'
import { PurchasesService } from '../../src/main/services/purchases.service'

const TEST_DATA_DIR = path.join(process.cwd(), 'test-data-inventory')
const MIGRATIONS_DIR = path.join(process.cwd(), 'src/main/database/migrations')

describe('Inventory & Stock Ledger Integration', () => {
  let masterManager: MasterDatabaseManager
  let dbManager: DatabaseManager
  let biz1: { id: string; db_filename: string }
  let biz2: { id: string; db_filename: string }
  let authService: AuthService

  beforeEach(() => {
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true })
    }
    fs.mkdirSync(TEST_DATA_DIR, { recursive: true })

    MasterDatabaseManager.resetInstanceForTesting()
    DatabaseManager.resetInstanceForTesting()

    masterManager = MasterDatabaseManager.getInstance(TEST_DATA_DIR, MIGRATIONS_DIR)
    dbManager = DatabaseManager.getInstance(path.join(TEST_DATA_DIR, 'databases'))
    authService = new AuthService()

    const b1 = masterManager.createBusiness('AutoCare Central', 'owner1', 'Pass123!owner')
    biz1 = { id: b1.id, db_filename: b1.db_filename }

    const b2 = masterManager.createBusiness('Garage East', 'owner2', 'Pass123!owner')
    biz2 = { id: b2.id, db_filename: b2.db_filename }
  })

  afterEach(() => {
    sessionManager.clearSession()
    DatabaseManager.resetInstanceForTesting()
    MasterDatabaseManager.resetInstanceForTesting()

    if (fs.existsSync(TEST_DATA_DIR)) {
      try {
        fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true })
      } catch {
        // ignore
      }
    }
  })

  it('verifies that inventory_items table contains NO current_quantity or stock column', async () => {
    dbManager.openBusinessDatabase(biz1.id, biz1.db_filename)
    await authService.login({ username: 'owner1', password: 'Pass123!owner' })

    const db = dbManager.getActiveDb()
    const columns = db.prepare(`PRAGMA table_info(inventory_items)`).all() as { name: string }[]
    const columnNames = columns.map((c) => c.name.toLowerCase())

    // CRITICAL ARCHITECTURE INVARIANT:
    expect(columnNames).not.toContain('quantity')
    expect(columnNames).not.toContain('current_stock')
    expect(columnNames).not.toContain('stock')
    expect(columnNames).not.toContain('qty')
  })

  it('manages stock strictly through append-only ledger movements and calculates SUM(quantity)', async () => {
    dbManager.openBusinessDatabase(biz1.id, biz1.db_filename)
    await authService.login({ username: 'owner1', password: 'Pass123!owner' })

    const inventoryService = new InventoryService()
    const suppliersService = new SuppliersService()
    const purchasesService = new PurchasesService()

    // 1. Create a supplier
    const supplier = suppliersService.createSupplier({
      name: 'Lanka Lubricants PLC',
      phone: '0112345678',
      contactPerson: 'Perera'
    })
    expect(supplier.id).toBeDefined()

    // 2. Create an inventory item (without initial stock)
    const item = inventoryService.createItem({
      sku: 'OIL-MOBIL-5W30',
      name: 'Mobil 1 ESP 5W-30 (4L)',
      costPriceAmount: 1850000, // 18,500.00
      sellingPriceAmount: 2400000, // 24,000.00
      reorderLevel: 5,
      location: 'Rack A1'
    })

    // Item starts with 0 stock
    expect(item.currentStock).toBe(0)
    expect(item.isLowStock).toBe(true) // 0 <= 5

    // 3. Record purchase intake of 10 cans
    const purchase = purchasesService.createPurchase({
      supplierId: supplier.id,
      purchaseDate: '2026-11-13',
      notes: 'Initial opening restock',
      items: [
        {
          itemId: item.id,
          quantity: 10,
          unitCostAmount: 1850000
        }
      ]
    })

    expect(purchase.purchaseNumber).toMatch(/^PO-\d{4}-\d{4}$/)
    expect(purchase.totalAmount).toBe(18500000)

    // Verify stock is now 10
    const itemAfterPurchase = inventoryService.getItemById(item.id)
    expect(itemAfterPurchase.currentStock).toBe(10)
    expect(itemAfterPurchase.isLowStock).toBe(false) // 10 > 5

    // 4. Record stock adjustment: +5 units
    const addMovement = inventoryService.adjustStock({
      itemId: item.id,
      quantity: 5,
      reason: 'Physical count found 5 extra units'
    })
    expect(addMovement.movementType).toBe('adjustment_in')
    expect(addMovement.quantity).toBe(5)

    const itemAfterAdd = inventoryService.getItemById(item.id)
    expect(itemAfterAdd.currentStock).toBe(15)

    // 5. Record stock adjustment: -3 units
    const reduceMovement = inventoryService.adjustStock({
      itemId: item.id,
      quantity: -3,
      reason: 'Damaged can during storage'
    })
    expect(reduceMovement.movementType).toBe('adjustment_out')
    expect(reduceMovement.quantity).toBe(-3)

    const itemAfterReduce = inventoryService.getItemById(item.id)
    expect(itemAfterReduce.currentStock).toBe(12)

    // 6. Test low-stock threshold trigger
    inventoryService.updateItem(item.id, { reorderLevel: 15 })
    const itemWithNewReorder = inventoryService.getItemById(item.id)
    expect(itemWithNewReorder.isLowStock).toBe(true) // 12 <= 15

    // 7. Test movements ledger contains all movements in append-only history
    const movements = inventoryService.getItemMovements(item.id)
    expect(movements.length).toBe(3) // 1 purchase + 2 adjustments
    const quantities = movements.map((m) => m.quantity)
    expect(quantities).toContain(10)
    expect(quantities).toContain(5)
    expect(quantities).toContain(-3)

    // 8. Test mandatory reason validation on adjustment
    expect(() => {
      inventoryService.adjustStock({
        itemId: item.id,
        quantity: 1,
        reason: 'no' // Too short (< 3 chars)
      })
    }).toThrow()

    // 9. Test negative stock prevention when allow_negative_stock is false
    expect(() => {
      inventoryService.adjustStock({
        itemId: item.id,
        quantity: -20, // 12 - 20 = -8 -> illegal
        reason: 'Massive reduction beyond available stock'
      })
    }).toThrow(/Negative stock is disabled/i)
  })

  it('guarantees complete isolation of inventory and stock ledger between businesses', async () => {
    // In Business 1: Add item and stock
    dbManager.openBusinessDatabase(biz1.id, biz1.db_filename)
    await authService.login({ username: 'owner1', password: 'Pass123!owner' })
    const inv1 = new InventoryService()
    const item1 = inv1.createItem({
      sku: 'COMMON-PART-01',
      name: 'Common Spark Plug',
      costPriceAmount: 50000,
      sellingPriceAmount: 85000,
      initialStock: 25
    })
    expect(item1.currentStock).toBe(25)

    // Switch to Business 2
    sessionManager.clearSession()
    dbManager.openBusinessDatabase(biz2.id, biz2.db_filename)
    await authService.login({ username: 'owner2', password: 'Pass123!owner' })
    const inv2 = new InventoryService()

    // Business 2 should have 0 items
    const itemsBiz2 = inv2.listItems()
    expect(itemsBiz2.length).toBe(0)

    // Create item with identical SKU in Business 2
    const item2 = inv2.createItem({
      sku: 'COMMON-PART-01',
      name: 'Common Spark Plug (Biz 2)',
      costPriceAmount: 60000,
      sellingPriceAmount: 90000,
      initialStock: 5
    })
    expect(item2.currentStock).toBe(5)

    // Verify Business 1 still has 25 stock and wasn't contaminated
    sessionManager.clearSession()
    dbManager.openBusinessDatabase(biz1.id, biz1.db_filename)
    await authService.login({ username: 'owner1', password: 'Pass123!owner' })
    const inv1Again = new InventoryService()
    const item1Again = inv1Again.getItemById(item1.id)
    expect(item1Again.currentStock).toBe(25)
  })
})
