import { z } from 'zod'
import { uuidSchema } from './common.schema'

export const categoryCustomFieldSchema = z.object({
  key: z.string().trim().min(1).regex(/^[a-zA-Z0-9_]+$/, 'Field key must be alphanumeric'),
  label: z.string().trim().min(1),
  type: z.enum(['text', 'number', 'boolean', 'select']),
  options: z.array(z.string()).optional(),
  required: z.boolean().optional().default(false)
})

export const vehicleCategorySchema = z.object({
  name: z.string().trim().min(2, 'Category name must be at least 2 characters').max(50),
  description: z.string().trim().max(250).optional().or(z.literal('')),
  extraFields: z.array(categoryCustomFieldSchema).optional().default([]),
  sortOrder: z.number().int().optional().default(0)
})

export const createVehicleSchema = z.object({
  customerId: uuidSchema,
  categoryId: z.string().trim().min(1).optional().or(z.literal('')).nullable(),
  registrationNo: z
    .string()
    .trim()
    .min(2, 'Registration number is required')
    .max(25, 'Registration number too long')
    .transform((val) => val.toUpperCase()),
  make: z.string().trim().max(50).optional().or(z.literal('')),
  model: z.string().trim().max(50).optional().or(z.literal('')),
  year: z
    .number()
    .int()
    .min(1900, 'Year must be after 1900')
    .max(new Date().getFullYear() + 2, 'Invalid future year')
    .optional()
    .nullable(),
  color: z.string().trim().max(30).optional().or(z.literal('')),
  vin: z.string().trim().max(50).optional().or(z.literal('')),
  engineNumber: z.string().trim().max(50).optional().or(z.literal('')),
  fuelType: z.string().trim().max(30).optional().or(z.literal('')),
  transmission: z.string().trim().max(30).optional().or(z.literal('')),
  extraFields: z.record(z.unknown()).optional().default({})
})

export const updateVehicleSchema = createVehicleSchema.partial().extend({
  isActive: z.boolean().optional()
})

export const createReminderSchema = z.object({
  vehicleId: uuidSchema,
  serviceId: z.string().trim().min(1).optional().nullable(),
  reminderType: z.enum(['date', 'mileage']),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional().nullable(),
  dueMileage: z.number().int().positive('Mileage must be positive integer').optional().nullable(),
  description: z.string().trim().min(3, 'Reminder description is required').max(200)
}).refine(
  (data) => (data.reminderType === 'date' && !!data.dueDate) || (data.reminderType === 'mileage' && !!data.dueMileage),
  {
    message: 'Due date is required for date reminders, and due mileage is required for mileage reminders'
  }
)
