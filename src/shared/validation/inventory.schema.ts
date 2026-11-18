import { z } from 'zod'
import { nonNegativeMoneySchema, dateStringSchema } from './common.schema'

export const createInventoryCategorySchema = z.object({
  name: z.string().trim().min(1, 'Category name is required').max(100),
  description: z.string().trim().max(500).optional().or(z.literal('')).nullable(),
  sortOrder: z.number().int().min(0).default(0)
})

export const updateInventoryCategorySchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(500).optional().or(z.literal('')).nullable(),
  sortOrder: z.number().int().min(0).optional()
})

export const createUnitOfMeasureSchema = z.object({
  name: z.string().trim().min(1, 'Unit name is required').max(50),
  abbreviation: z.string().trim().min(1, 'Abbreviation is required').max(15)
})

export const updateUnitOfMeasureSchema = z.object({
  name: z.string().trim().min(1).max(50).optional(),
  abbreviation: z.string().trim().min(1).max(15).optional()
})

export const createInventoryItemSchema = z.object({
  sku: z.string().trim().max(50).optional().or(z.literal('')).nullable(),
  name: z.string().trim().min(1, 'Item name is required').max(200),
  description: z.string().trim().max(1000).optional().or(z.literal('')).nullable(),
  categoryId: z.string().trim().min(1).optional().or(z.literal('')).nullable(),
  unitId: z.string().trim().min(1).optional().or(z.literal('')).nullable(),
  costPriceAmount: nonNegativeMoneySchema,
  sellingPriceAmount: nonNegativeMoneySchema,
  reorderLevel: z.number().min(0, 'Reorder level cannot be negative').default(0),
  location: z.string().trim().max(100).optional().or(z.literal('')).nullable(),
  initialStock: z.number().min(0).optional()
})

export const updateInventoryItemSchema = z.object({
  sku: z.string().trim().max(50).optional().or(z.literal('')).nullable(),
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(1000).optional().or(z.literal('')).nullable(),
  categoryId: z.string().trim().min(1).optional().or(z.literal('')).nullable(),
  unitId: z.string().trim().min(1).optional().or(z.literal('')).nullable(),
  costPriceAmount: nonNegativeMoneySchema.optional(),
  sellingPriceAmount: nonNegativeMoneySchema.optional(),
  reorderLevel: z.number().min(0).optional(),
  location: z.string().trim().max(100).optional().or(z.literal('')).nullable()
})

export const createStockAdjustmentSchema = z.object({
  itemId: z.string().trim().min(1, 'Item ID is required'),
  quantity: z
    .number()
    .refine((val) => val !== 0, { message: 'Adjustment quantity cannot be zero' }),
  reason: z.string().trim().min(3, 'A clear reason (at least 3 characters) is required for all adjustments')
})

export const createSupplierSchema = z.object({
  name: z.string().trim().min(1, 'Supplier name is required').max(200),
  contactPerson: z.string().trim().max(100).optional().or(z.literal('')).nullable(),
  phone: z.string().trim().max(30).optional().or(z.literal('')).nullable(),
  email: z.string().trim().email('Invalid email address').optional().or(z.literal('')).nullable(),
  address: z.string().trim().max(500).optional().or(z.literal('')).nullable(),
  notes: z.string().trim().max(1000).optional().or(z.literal('')).nullable()
})

export const updateSupplierSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  contactPerson: z.string().trim().max(100).optional().or(z.literal('')).nullable(),
  phone: z.string().trim().max(30).optional().or(z.literal('')).nullable(),
  email: z.string().trim().email('Invalid email address').optional().or(z.literal('')).nullable(),
  address: z.string().trim().max(500).optional().or(z.literal('')).nullable(),
  notes: z.string().trim().max(1000).optional().or(z.literal('')).nullable()
})

export const purchaseLineSchema = z.object({
  itemId: z.string().trim().min(1, 'Item is required'),
  quantity: z.number().positive('Quantity must be greater than zero'),
  unitCostAmount: nonNegativeMoneySchema
})

export const createPurchaseSchema = z.object({
  supplierId: z.string().trim().min(1).optional().or(z.literal('')).nullable(),
  purchaseDate: dateStringSchema,
  notes: z.string().trim().max(1000).optional().or(z.literal('')).nullable(),
  items: z.array(purchaseLineSchema).min(1, 'At least one item is required on a purchase order')
})
