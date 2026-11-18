import { z } from 'zod'
import { nonNegativeMoneySchema } from './common.schema'

export const createServiceCategorySchema = z.object({
  name: z.string().trim().min(1, 'Category name is required').max(100),
  description: z.string().trim().max(500).optional().or(z.literal('')).nullable(),
  sortOrder: z.number().int().min(0).default(0)
})

export const updateServiceCategorySchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(500).optional().or(z.literal('')).nullable(),
  sortOrder: z.number().int().min(0).optional()
})

export const createServiceSchema = z.object({
  categoryId: z.string().trim().min(1).optional().or(z.literal('')).nullable(),
  name: z.string().trim().min(1, 'Service name is required').max(200),
  description: z.string().trim().max(1000).optional().or(z.literal('')).nullable(),
  basePriceAmount: nonNegativeMoneySchema,
  laborChargeAmount: nonNegativeMoneySchema,
  estimatedMinutes: z.number().int().min(1, 'Estimated minutes must be positive').optional().nullable(),
  vehicleCategoryIds: z.array(z.string().trim().min(1)).optional()
})

export const updateServiceSchema = z.object({
  categoryId: z.string().trim().min(1).optional().or(z.literal('')).nullable(),
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(1000).optional().or(z.literal('')).nullable(),
  basePriceAmount: nonNegativeMoneySchema.optional(),
  laborChargeAmount: nonNegativeMoneySchema.optional(),
  estimatedMinutes: z.number().int().min(1).optional().nullable(),
  vehicleCategoryIds: z.array(z.string().trim().min(1)).optional()
})
