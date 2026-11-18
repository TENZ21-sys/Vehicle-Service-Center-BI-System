import { z } from 'zod'

export const updateBusinessProfileSchema = z.object({
  business_name: z.string().trim().min(1, 'Business name is required').max(100),
  address: z.string().trim().max(300).optional().default(''),
  phone: z.string().trim().max(30).optional().default(''),
  email: z.string().trim().email('Invalid email').optional().or(z.literal('')).default(''),
  logo_path: z.string().trim().optional().default(''),
  currency_code: z.string().trim().min(1).max(10).default('LKR'),
  currency_symbol: z.string().trim().min(1).max(10).default('Rs.'),
  currency_decimals: z.number().int().min(0).max(4).default(2)
})

export const updateFeatureTogglesSchema = z.object({
  module_appointments: z.boolean(),
  module_quotations: z.boolean(),
  module_inventory: z.boolean(),
  module_finance: z.boolean(),
  module_bi: z.boolean()
})

export const createBusinessSchema = z.object({
  name: z.string().trim().min(2, 'Business name must be at least 2 characters').max(100),
  ownerUsername: z
    .string()
    .trim()
    .min(3, 'Username must be at least 3 characters')
    .max(50)
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Username must be alphanumeric'),
  ownerPassword: z.string().min(8, 'Password must be at least 8 characters'),
  ownerDisplayName: z.string().trim().min(2, 'Display name must be at least 2 characters'),
  currencyCode: z.string().trim().min(1).max(10).default('LKR')
})
