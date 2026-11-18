import { z } from 'zod'

export const expensePaymentMethodEnum = z.enum([
  'Cash',
  'Credit Card',
  'Debit Card',
  'Bank Transfer',
  'Cheque'
])

export const createExpenseCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100),
  description: z.string().max(500).optional()
})

export const updateExpenseCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional()
})

export const createExpenseSchema = z.object({
  categoryId: z.string().min(1, 'Category is required'),
  amount: z.number().int('Amount must be an integer').positive('Expense amount must be positive'),
  paymentMethod: expensePaymentMethodEnum.default('Cash'),
  paidTo: z.string().max(255).optional(),
  referenceNo: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
  expenseDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expense date must be YYYY-MM-DD')
    .optional()
})

export const updateExpenseSchema = z.object({
  categoryId: z.string().min(1).optional(),
  amount: z.number().int().positive().optional(),
  paymentMethod: expensePaymentMethodEnum.optional(),
  paidTo: z.string().max(255).optional(),
  referenceNo: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
  expenseDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expense date must be YYYY-MM-DD')
    .optional()
})

export const expenseFilterSchema = z.object({
  categoryId: z.string().optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  paymentMethod: z.string().optional(),
  search: z.string().optional()
})

export const dateRangeFilterSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be YYYY-MM-DD')
}).refine((data) => data.startDate <= data.endDate, {
  message: 'Start date cannot be after end date',
  path: ['startDate']
})
