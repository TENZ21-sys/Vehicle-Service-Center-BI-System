import { z } from 'zod'
import { dateStringSchema } from './common.schema'

export const timeStringSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be in 24-hour format HH:mm')

export const appointmentStatusSchema = z.enum([
  'Scheduled',
  'Confirmed',
  'In Service',
  'Completed',
  'Cancelled',
  'No Show'
])

export const createAppointmentSchema = z.object({
  customerId: z.string().trim().min(1, 'Customer is required'),
  vehicleId: z.string().trim().min(1, 'Vehicle is required'),
  scheduledDate: dateStringSchema,
  scheduledTime: timeStringSchema,
  estimatedDurationMinutes: z.number().int().min(5).max(1440).default(60),
  technicianId: z.string().trim().min(1).optional().or(z.literal('')).nullable(),
  requestedServices: z.array(z.string().trim().min(1)).optional().nullable(),
  notes: z.string().trim().max(2000).optional().or(z.literal('')).nullable()
})

export const updateAppointmentSchema = z.object({
  scheduledDate: dateStringSchema.optional(),
  scheduledTime: timeStringSchema.optional(),
  estimatedDurationMinutes: z.number().int().min(5).max(1440).optional(),
  technicianId: z.string().trim().min(1).optional().or(z.literal('')).nullable(),
  requestedServices: z.array(z.string().trim().min(1)).optional().nullable(),
  notes: z.string().trim().max(2000).optional().or(z.literal('')).nullable()
})

export const updateAppointmentStatusSchema = z.object({
  status: appointmentStatusSchema,
  notes: z.string().trim().max(1000).optional().or(z.literal('')).nullable()
})

export const convertAppointmentToJobCardSchema = z.object({
  appointmentId: z.string().trim().min(1, 'Appointment ID is required'),
  technicianId: z.string().trim().min(1).optional().or(z.literal('')).nullable(),
  mileageIn: z.number().int().min(0, 'Mileage cannot be negative').optional().nullable(),
  priority: z.string().trim().min(1).optional(),
  internalNotes: z.string().trim().max(2000).optional().or(z.literal('')).nullable()
})
