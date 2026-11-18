import { z } from 'zod'

export const createCustomerSchema = z.object({
  name: z.string().trim().min(2, 'Customer name must be at least 2 characters').max(100),
  phonePrimary: z
    .string()
    .trim()
    .min(7, 'Primary phone must be at least 7 digits')
    .max(20, 'Phone cannot exceed 20 characters')
    .regex(/^[+0-9\s-]+$/, 'Phone can only contain digits, spaces, plus and hyphens'),
  phoneSecondary: z
    .string()
    .trim()
    .max(20, 'Secondary phone cannot exceed 20 characters')
    .optional()
    .or(z.literal('')),
  email: z.string().trim().email('Invalid email address').optional().or(z.literal('')),
  address: z.string().trim().max(300).optional().or(z.literal('')),
  nic: z.string().trim().max(30).optional().or(z.literal('')),
  notes: z.string().trim().max(1000).optional().or(z.literal(''))
})

export const updateCustomerSchema = createCustomerSchema.partial().extend({
  isActive: z.boolean().optional()
})
