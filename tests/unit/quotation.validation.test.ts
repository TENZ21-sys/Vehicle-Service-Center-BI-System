import { describe, it, expect } from 'vitest'
import {
  createQuotationSchema,
  updateQuotationSchema,
  convertQuotationToJobCardSchema
} from '../../src/shared/validation/quotation.schema'

describe('Quotation Validation Schemas', () => {
  describe('createQuotationSchema', () => {
    it('validates a valid quotation with services and parts', () => {
      const valid = {
        customerId: 'cust-1',
        vehicleId: 'veh-1',
        validityDays: 30,
        discountAmount: 100000,
        taxRate: 1500,
        notes: 'Full overhaul quote',
        items: [
          {
            itemType: 'service',
            description: 'Major Engine Tuneup',
            quantity: 1,
            unitPriceAmount: 1500000
          },
          {
            itemType: 'part',
            referenceId: 'item-10',
            description: 'Timing Belt Kit',
            quantity: 1,
            unitPriceAmount: 2500000,
            costPriceAmount: 1800000
          }
        ]
      }
      expect(createQuotationSchema.safeParse(valid).success).toBe(true)
    })

    it('rejects empty items list or negative unit price', () => {
      expect(createQuotationSchema.safeParse({ customerId: 'c1', items: [] }).success).toBe(false)
      expect(
        createQuotationSchema.safeParse({
          customerId: 'c1',
          items: [
            {
              itemType: 'service',
              description: 'Labor',
              quantity: 1,
              unitPriceAmount: -500 // negative price
            }
          ]
        }).success
      ).toBe(false)
    })
  })

  describe('convertQuotationToJobCardSchema', () => {
    it('validates valid conversion input', () => {
      expect(
        convertQuotationToJobCardSchema.safeParse({
          quotationId: 'qt-1',
          technicianId: 'tech-1',
          priority: 'Urgent',
          mileageIn: 120500
        }).success
      ).toBe(true)
    })

    it('rejects missing quotationId', () => {
      expect(convertQuotationToJobCardSchema.safeParse({ quotationId: '' }).success).toBe(false)
    })
  })
})
