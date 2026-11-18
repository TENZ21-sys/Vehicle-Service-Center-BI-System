import { z } from 'zod'
import { nonNegativeMoneySchema } from './common.schema'

export const createJobCardSchema = z.object({
  customerId: z.string().trim().min(1, 'Customer is required'),
  vehicleId: z.string().trim().min(1, 'Vehicle is required'),
  appointmentId: z.string().trim().min(1).optional().or(z.literal('')).nullable(),
  quotationId: z.string().trim().min(1).optional().or(z.literal('')).nullable(),
  technicianId: z.string().trim().min(1).optional().or(z.literal('')).nullable(),
  priority: z.string().trim().min(1).default('Normal'),
  mileageIn: z.number().int().min(0, 'Mileage cannot be negative').optional().nullable(),
  findings: z.string().trim().max(3000).optional().or(z.literal('')).nullable(),
  internalNotes: z.string().trim().max(3000).optional().or(z.literal('')).nullable(),
  customerNotes: z.string().trim().max(3000).optional().or(z.literal('')).nullable(),
  initialServiceIds: z.array(z.string().trim().min(1)).optional()
})

export const updateJobCardSchema = z.object({
  technicianId: z.string().trim().min(1).optional().or(z.literal('')).nullable(),
  priority: z.string().trim().min(1).optional(),
  mileageIn: z.number().int().min(0).optional().nullable(),
  mileageOut: z.number().int().min(0).optional().nullable(),
  findings: z.string().trim().max(3000).optional().or(z.literal('')).nullable(),
  internalNotes: z.string().trim().max(3000).optional().or(z.literal('')).nullable(),
  customerNotes: z.string().trim().max(3000).optional().or(z.literal('')).nullable()
})

export const updateJobCardStatusSchema = z.object({
  status: z.string().trim().min(1, 'Status is required'),
  mileageOut: z.number().int().min(0).optional().nullable(),
  notes: z.string().trim().max(1000).optional().or(z.literal('')).nullable()
})

export const assignTechnicianSchema = z.object({
  technicianId: z.string().trim().min(1).optional().or(z.literal('')).nullable()
})

export const addJobCardServiceSchema = z.object({
  serviceId: z.string().trim().min(1).optional().or(z.literal('')).nullable(),
  serviceName: z.string().trim().min(1, 'Service name is required').max(200),
  priceAmount: nonNegativeMoneySchema,
  laborAmount: nonNegativeMoneySchema,
  notes: z.string().trim().max(1000).optional().or(z.literal('')).nullable()
})

export const updateJobCardServiceSchema = z.object({
  status: z.enum(['Pending', 'In Progress', 'Completed']).optional(),
  priceAmount: nonNegativeMoneySchema.optional(),
  laborAmount: nonNegativeMoneySchema.optional(),
  notes: z.string().trim().max(1000).optional().or(z.literal('')).nullable()
})

export const addJobCardPartSchema = z.object({
  inventoryItemId: z.string().trim().min(1, 'Inventory item is required'),
  quantity: z.number().positive('Quantity must be greater than zero'),
  unitPriceAmount: nonNegativeMoneySchema.optional()
})
