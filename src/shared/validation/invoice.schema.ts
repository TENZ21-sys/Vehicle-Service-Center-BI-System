import { z } from 'zod'
import { nonNegativeMoneySchema, positiveMoneySchema } from './common.schema'

export const immediatePaymentSchema = z.object({
  paymentMethod: z.string().trim().min(1, 'Payment method is required'),
  amount: positiveMoneySchema,
  reference: z.string().trim().max(100).optional().or(z.literal('')).nullable(),
  notes: z.string().trim().max(500).optional().or(z.literal('')).nullable()
})

export const createJobCardInvoiceSchema = z.object({
  jobCardId: z.string().trim().min(1, 'Job card ID is required'),
  taxRate: z.number().int().min(0, 'Tax rate cannot be negative').optional(),
  discountAmount: nonNegativeMoneySchema.optional(),
  notes: z.string().trim().max(2000).optional().or(z.literal('')).nullable(),
  immediatePayment: immediatePaymentSchema.optional()
})

export const posItemLineSchema = z.object({
  itemType: z.enum(['service', 'part']),
  referenceId: z.string().trim().min(1).optional().or(z.literal('')).nullable(),
  description: z.string().trim().min(1, 'Item description is required').max(200),
  quantity: z.number().positive('Quantity must be greater than zero'),
  unitPriceAmount: nonNegativeMoneySchema,
  costPriceAmount: nonNegativeMoneySchema.optional(),
  discountAmount: nonNegativeMoneySchema.optional(),
  taxRate: z.number().int().min(0).optional()
})

export const createPosInvoiceSchema = z.object({
  customerId: z.string().trim().min(1, 'Customer is required'),
  vehicleId: z.string().trim().min(1).optional().or(z.literal('')).nullable(),
  items: z.array(posItemLineSchema).min(1, 'At least one item is required for a POS sale'),
  discountAmount: nonNegativeMoneySchema.optional(),
  taxRate: z.number().int().min(0).optional(),
  notes: z.string().trim().max(2000).optional().or(z.literal('')).nullable(),
  immediatePayment: immediatePaymentSchema.optional()
})

export const recordPaymentSchema = z.object({
  invoiceId: z.string().trim().min(1, 'Invoice ID is required'),
  paymentMethod: z.string().trim().min(1, 'Payment method is required'),
  amount: positiveMoneySchema,
  reference: z.string().trim().max(100).optional().or(z.literal('')).nullable(),
  notes: z.string().trim().max(500).optional().or(z.literal('')).nullable()
})

export const voidInvoiceSchema = z.object({
  invoiceId: z.string().trim().min(1, 'Invoice ID is required'),
  voidReason: z.string().trim().min(3, 'A clear reason (at least 3 characters) is required to void an invoice')
})
