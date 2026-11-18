import { describe, it, expect } from 'vitest'
import {
  createInventoryItemSchema,
  createStockAdjustmentSchema,
  createPurchaseSchema
} from '../../src/shared/validation/inventory.schema'

describe('Inventory Validation Schemas', () => {
  it('validates valid inventory item input', () => {
    const valid = {
      sku: 'FLTR-OIL-001',
      name: 'Genuine Oil Filter',
      costPriceAmount: 150000,
      sellingPriceAmount: 220000,
      reorderLevel: 10
    }
    const res = createInventoryItemSchema.safeParse(valid)
    expect(res.success).toBe(true)
  })

  it('rejects floating point currency in inventory item prices', () => {
    const invalid = {
      name: 'Filter',
      costPriceAmount: 1500.50, // Float not allowed
      sellingPriceAmount: 2000
    }
    const res = createInventoryItemSchema.safeParse(invalid)
    expect(res.success).toBe(false)
  })

  it('enforces mandatory reason with at least 3 characters on stock adjustment', () => {
    // Missing reason
    const noReason = { itemId: 'item_1', quantity: 5, reason: '' }
    expect(createStockAdjustmentSchema.safeParse(noReason).success).toBe(false)

    // Reason too short
    const shortReason = { itemId: 'item_1', quantity: 5, reason: 'ok' }
    expect(createStockAdjustmentSchema.safeParse(shortReason).success).toBe(false)

    // Valid adjustment
    const valid = {
      itemId: 'item_1',
      quantity: -2,
      reason: 'Damaged in transit during delivery'
    }
    expect(createStockAdjustmentSchema.safeParse(valid).success).toBe(true)
  })

  it('rejects zero quantity on stock adjustment', () => {
    const invalid = { itemId: 'item_1', quantity: 0, reason: 'Correction' }
    expect(createStockAdjustmentSchema.safeParse(invalid).success).toBe(false)
  })

  it('validates purchase order structure', () => {
    const valid = {
      supplierId: 'sup_1',
      purchaseDate: '2026-11-13',
      notes: 'Initial restock',
      items: [
        { itemId: 'item_1', quantity: 10, unitCostAmount: 150000 },
        { itemId: 'item_2', quantity: 5, unitCostAmount: 300000 }
      ]
    }
    expect(createPurchaseSchema.safeParse(valid).success).toBe(true)
  })

  it('rejects purchase order with zero or negative quantity', () => {
    const invalid = {
      purchaseDate: '2026-11-13',
      items: [{ itemId: 'item_1', quantity: 0, unitCostAmount: 150000 }]
    }
    expect(createPurchaseSchema.safeParse(invalid).success).toBe(false)
  })
})
