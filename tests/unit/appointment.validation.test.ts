import { describe, it, expect } from 'vitest'
import {
  createAppointmentSchema,
  updateAppointmentSchema,
  updateAppointmentStatusSchema,
  convertAppointmentToJobCardSchema
} from '../../src/shared/validation/appointment.schema'

describe('Appointment Validation Schemas', () => {
  describe('createAppointmentSchema', () => {
    it('validates a valid appointment request', () => {
      const valid = {
        customerId: 'cust-1',
        vehicleId: 'veh-1',
        scheduledDate: '2026-11-20',
        scheduledTime: '10:30',
        estimatedDurationMinutes: 90,
        requestedServices: ['Full Inspection', 'Brake Pad Replacement'],
        notes: 'Customer reported squeaking noise'
      }
      const res = createAppointmentSchema.safeParse(valid)
      expect(res.success).toBe(true)
    })

    it('rejects invalid date or time format', () => {
      expect(
        createAppointmentSchema.safeParse({
          customerId: 'c1',
          vehicleId: 'v1',
          scheduledDate: '20-11-2026', // wrong format
          scheduledTime: '10:30'
        }).success
      ).toBe(false)

      expect(
        createAppointmentSchema.safeParse({
          customerId: 'c1',
          vehicleId: 'v1',
          scheduledDate: '2026-11-20',
          scheduledTime: '25:70' // invalid time
        }).success
      ).toBe(false)
    })
  })

  describe('updateAppointmentStatusSchema', () => {
    it('validates supported status values', () => {
      expect(updateAppointmentStatusSchema.safeParse({ status: 'Confirmed' }).success).toBe(true)
      expect(updateAppointmentStatusSchema.safeParse({ status: 'In Service' }).success).toBe(true)
      expect(updateAppointmentStatusSchema.safeParse({ status: 'Cancelled', notes: 'Customer called' }).success).toBe(true)
      expect(updateAppointmentStatusSchema.safeParse({ status: 'InvalidStatus' }).success).toBe(false)
    })
  })

  describe('convertAppointmentToJobCardSchema', () => {
    it('validates appointment conversion input', () => {
      const valid = {
        appointmentId: 'apt-123',
        technicianId: 'tech-1',
        mileageIn: 45000,
        priority: 'High',
        internalNotes: 'Urgent check requested'
      }
      expect(convertAppointmentToJobCardSchema.safeParse(valid).success).toBe(true)
    })

    it('rejects negative mileage', () => {
      expect(
        convertAppointmentToJobCardSchema.safeParse({
          appointmentId: 'apt-123',
          mileageIn: -10
        }).success
      ).toBe(false)
    })
  })
})
