import { describe, it, expect } from 'vitest'
import {
  vehicleCategorySchema,
  createVehicleSchema,
  createReminderSchema
} from '../../src/shared/validation/vehicle.schema'

describe('Vehicle & Dynamic Category Validation Schema', () => {
  it('validates a dynamic vehicle category with custom fields', () => {
    const validCategory = {
      name: 'Electric Scooter',
      description: 'Two-wheeled battery electric vehicles',
      sortOrder: 10,
      extraFields: [
        {
          key: 'battery_kwh',
          label: 'Battery Capacity (kWh)',
          type: 'number',
          required: true
        },
        {
          key: 'motor_type',
          label: 'Motor Type',
          type: 'select',
          options: ['Hub Motor', 'Mid-drive'],
          required: false
        }
      ]
    }
    const res = vehicleCategorySchema.safeParse(validCategory)
    expect(res.success).toBe(true)
  })

  it('validates vehicle creation and normalizes registration number to uppercase', () => {
    const vehicleData = {
      customerId: '123e4567-e89b-12d3-a456-426614174000',
      registrationNo: 'wp ca-4589',
      make: 'Toyota',
      model: 'Corolla',
      year: 2020,
      color: 'Pearl White',
      fuelType: 'Petrol',
      transmission: 'Automatic',
      extraFields: {
        engine_cc: 1800
      }
    }
    const res = createVehicleSchema.safeParse(vehicleData)
    expect(res.success).toBe(true)
    if (res.success) {
      expect(res.data.registrationNo).toBe('WP CA-4589')
    }
  })

  it('validates date and mileage service reminders', () => {
    const validDateReminder = {
      vehicleId: '123e4567-e89b-12d3-a456-426614174000',
      reminderType: 'date',
      dueDate: '2026-12-31',
      description: 'Annual Periodic Inspection'
    }
    expect(createReminderSchema.safeParse(validDateReminder).success).toBe(true)

    const validMileageReminder = {
      vehicleId: '123e4567-e89b-12d3-a456-426614174000',
      reminderType: 'mileage',
      dueMileage: 50000,
      description: 'Transmission Fluid Replacement'
    }
    expect(createReminderSchema.safeParse(validMileageReminder).success).toBe(true)

    // Invalid: date reminder missing dueDate
    const invalidDateReminder = {
      vehicleId: '123e4567-e89b-12d3-a456-426614174000',
      reminderType: 'date',
      description: 'Missing date'
    }
    expect(createReminderSchema.safeParse(invalidDateReminder).success).toBe(false)
  })
})
