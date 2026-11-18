import { describe, it, expect } from 'vitest'
import {
  createJobCardInvoiceSchema,
  createPosInvoiceSchema,
  recordPaymentSchema,
  voidInvoiceSchema
} from '../../src/shared/validation/invoice.schema'

describe('Invoice & Payment Validation Schemas', () => {
  describe('createJobCardInvoiceSchema', () => {
    it('validates a valid job card invoice request', () => {
      const valid = {
        jobCardId: 'jc-12345',
        taxRate: 1500,
        discountAmount: 50000,
        notes: 'Loyalty discount applied',
        immediatePayment: {
          paymentMethod: 'Cash',
          amount: 100000
        }
      }
      const res = createJobCardInvoiceSchema.safeParse(valid)
      expect(res.success).toBe(true)
    })

    it('rejects missing jobCardId or negative discount/taxRate', () => {
      expect(createJobCardInvoiceSchema.safeParse({ jobCardId: '' }).success).toBe(false)
      expect(createJobCardInvoiceSchema.safeParse({ jobCardId: 'jc-1', taxRate: -5 }).success).toBe(false)
      expect(createJobCardInvoiceSchema.safeParse({ jobCardId: 'jc-1', discountAmount: -100 }).success).toBe(false)
      expect(createJobCardInvoiceSchema.safeParse({ jobCardId: 'jc-1', discountAmount: 50.5 }).success).toBe(false)
    })
  })

  describe('createPosInvoiceSchema', () => {
    it('validates a valid POS sale invoice request', () => {
      const valid = {
        customerId: 'cust-1',
        items: [
          {
            itemType: 'part',
            referenceId: 'item-10',
            description: 'Brake Pads Front',
            quantity: 2,
            unitPriceAmount: 450000,
            costPriceAmount: 320000
          },
          {
            itemType: 'service',
            description: 'Brake Fitting',
            quantity: 1,
            unitPriceAmount: 150000
          }
        ],
        immediatePayment: {
          paymentMethod: 'Credit Card',
          amount: 1050000,
          reference: 'TXN-9988'
        }
      }
      const res = createPosInvoiceSchema.safeParse(valid)
      expect(res.success).toBe(true)
    })

    it('rejects empty items list or zero/negative quantity', () => {
      expect(createPosInvoiceSchema.safeParse({ customerId: 'cust-1', items: [] }).success).toBe(false)
      expect(
        createPosInvoiceSchema.safeParse({
          customerId: 'cust-1',
          items: [
            {
              itemType: 'part',
              description: 'Oil',
              quantity: 0,
              unitPriceAmount: 1000
            }
          ]
        }).success
      ).toBe(false)
    })
  })

  describe('recordPaymentSchema', () => {
    it('validates a valid payment record', () => {
      const res = recordPaymentSchema.safeParse({
        invoiceId: 'inv-1',
        paymentMethod: 'Bank Transfer',
        amount: 250000,
        reference: 'REF-12345'
      })
      expect(res.success).toBe(true)
    })

    it('rejects 0 or negative payment amounts', () => {
      expect(recordPaymentSchema.safeParse({ invoiceId: 'inv-1', paymentMethod: 'Cash', amount: 0 }).success).toBe(false)
      expect(recordPaymentSchema.safeParse({ invoiceId: 'inv-1', paymentMethod: 'Cash', amount: -500 }).success).toBe(false)
      expect(recordPaymentSchema.safeParse({ invoiceId: 'inv-1', paymentMethod: 'Cash', amount: 100.5 }).success).toBe(false)
    })
  })

  describe('voidInvoiceSchema', () => {
    it('validates valid void reason', () => {
      const res = voidInvoiceSchema.safeParse({
        invoiceId: 'inv-1',
        voidReason: 'Customer decided not to purchase parts'
      })
      expect(res.success).toBe(true)
    })

    it('rejects short or empty void reasons', () => {
      expect(voidInvoiceSchema.safeParse({ invoiceId: 'inv-1', voidReason: '' }).success).toBe(false)
      expect(voidInvoiceSchema.safeParse({ invoiceId: 'inv-1', voidReason: 'no' }).success).toBe(false)
    })
  })
})
