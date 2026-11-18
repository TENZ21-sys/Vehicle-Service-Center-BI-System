import { describe, it, expect } from 'vitest'
import {
  createServiceSchema,
  updateServiceSchema,
  createServiceCategorySchema
} from '../../src/shared/validation/catalogue.schema'

describe('Catalogue Validation Schemas', () => {
  it('validates valid service category input', () => {
    const valid = { name: 'Air Conditioning', description: 'AC repair & gas filling' }
    const res = createServiceCategorySchema.safeParse(valid)
    expect(res.success).toBe(true)
  })

  it('rejects empty service category name', () => {
    const invalid = { name: '   ' }
    const res = createServiceCategorySchema.safeParse(invalid)
    expect(res.success).toBe(false)
  })

  it('validates service with integer money amounts', () => {
    const valid = {
      name: 'Full Synthetic Oil Change',
      basePriceAmount: 1250000, // 12,500.00
      laborChargeAmount: 250000, // 2,500.00
      estimatedMinutes: 45,
      vehicleCategoryIds: ['cat_car', 'cat_suv']
    }
    const res = createServiceSchema.safeParse(valid)
    expect(res.success).toBe(true)
  })

  it('rejects floating point price amounts', () => {
    const invalid = {
      name: 'Oil Change',
      basePriceAmount: 12500.50, // Float is illegal!
      laborChargeAmount: 2500
    }
    const res = createServiceSchema.safeParse(invalid)
    expect(res.success).toBe(false)
  })

  it('rejects negative prices', () => {
    const invalid = {
      name: 'Oil Change',
      basePriceAmount: -100,
      laborChargeAmount: 0
    }
    const res = createServiceSchema.safeParse(invalid)
    expect(res.success).toBe(false)
  })
})
