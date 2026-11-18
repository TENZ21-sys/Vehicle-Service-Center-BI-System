import { z } from 'zod'
import { nonNegativeMoneySchema } from './common.schema'

export const quotationStatusSchema = z.enum([
  'Draft',
  'Sent',
  'Approved',
  'Rejected',
  'Expired'
])

export const quotationItemLineSchema = z.object({
  itemType: z.enum(['service', 'part']),
  referenceId: z.string().trim().min(1).optional().or(z.literal('')).nullable(),
  description: z.string().trim().min(1, 'Description is required').max(200),
  quantity: z.number().positive('Quantity must be greater than zero'),
  unitPriceAmount: nonNegativeMoneySchema,
  costPriceAmount: nonNegativeMoneySchema.optional(),
  discountAmount: nonNegativeMoneySchema.optional(),
  taxRate: z.number().int().min(0).optional()
})

export const createQuotationSchema = z.object({
  customerId: z.string().trim().min(1, 'Customer is required'),
  vehicleId: z.string().trim().min(1).optional().or(z.literal('')).nullable(),
  items: z.array(quotationItemLineSchema).min(1, 'At least one line item is required for a quotation'),
  validityDays: z.number().int().min(1).max(365).default(14),
  discountAmount: nonNegativeMoneySchema.optional(),
  taxRate: z.number().int().min(0).optional(),
  notes: z.string().trim().max(2000).optional().or(z.literal('')).nullable()
})

export const updateQuotationSchema = z.object({
  customerId: z.string().trim().min(1).optional(),
  vehicleId: z.string().trim().min(1).optional().or(z.literal('')).nullable(),
  items: z.array(quotationItemLineSchema).min(1).optional(),
  validityDays: z.number().int().min(1).max(365).optional(),
  discountAmount: nonNegativeMoneySchema.optional(),
  taxRate: z.number().int().min(0).optional(),
  notes: z.string().trim().max(2000).optional().or(z.literal('')).nullable()
})

export const updateQuotationStatusSchema = z.object({
  status: quotationStatusSchema,
  notes: z.string().trim().max(1000).optional().or(z.literal('')).nullable()
})

export const convertQuotationToJobCardSchema = z.object({
  quotationId: z.string().trim().min(1, 'Quotation ID is required'),
  technicianId: z.string().trim().min(1).optional().or(z.literal('')).nullable(),
  mileageIn: z.number().int().min(0, 'Mileage cannot be negative').optional().nullable(),
  priority: z.string().trim().min(1).optional(),
  internalNotes: z.string().trim().max(2000).optional().or(z.literal('')).nullable()
})
