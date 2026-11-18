import { describe, it, expect } from 'vitest'
import {
  createJobCardSchema,
  updateJobCardStatusSchema,
  addJobCardServiceSchema,
  addJobCardPartSchema
} from '../../src/shared/validation/job-card.schema'

describe('Job Card Validation Schemas', () => {
  it('validates valid job card creation input', () => {
    const valid = {
      customerId: 'cust_123',
      vehicleId: 'veh_456',
      priority: 'High',
      mileageIn: 45000,
      findings: 'Check brake pads and engine oil',
      initialServiceIds: ['svc_1', 'svc_2']
    }
    const res = createJobCardSchema.safeParse(valid)
    expect(res.success).toBe(true)
  })

  it('rejects job card creation when customer or vehicle is missing', () => {
    const noCustomer = { vehicleId: 'veh_456' }
    expect(createJobCardSchema.safeParse(noCustomer).success).toBe(false)

    const noVehicle = { customerId: 'cust_123' }
    expect(createJobCardSchema.safeParse(noVehicle).success).toBe(false)
  })

  it('rejects negative mileage in', () => {
    const invalid = { customerId: 'c1', vehicleId: 'v1', mileageIn: -50 }
    expect(createJobCardSchema.safeParse(invalid).success).toBe(false)
  })

  it('validates service line items and rejects float prices', () => {
    const valid = {
      serviceName: 'Full Engine Tune',
      priceAmount: 500000,
      laborAmount: 250000
    }
    expect(addJobCardServiceSchema.safeParse(valid).success).toBe(true)

    const invalidFloat = {
      serviceName: 'Full Engine Tune',
      priceAmount: 5000.50, // Float is illegal!
      laborAmount: 2500
    }
    expect(addJobCardServiceSchema.safeParse(invalidFloat).success).toBe(false)
  })

  it('validates parts allocation and enforces positive quantity', () => {
    const valid = {
      inventoryItemId: 'item_99',
      quantity: 4.5, // 4.5 Liters of oil is valid
      unitPriceAmount: 240000
    }
    expect(addJobCardPartSchema.safeParse(valid).success).toBe(true)

    const zeroQty = {
      inventoryItemId: 'item_99',
      quantity: 0
    }
    expect(addJobCardPartSchema.safeParse(zeroQty).success).toBe(false)

    const negativeQty = {
      inventoryItemId: 'item_99',
      quantity: -1
    }
    expect(addJobCardPartSchema.safeParse(negativeQty).success).toBe(false)
  })
})
