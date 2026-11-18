import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as path from 'path'
import * as fs from 'fs'
import { MasterDatabaseManager } from '../../src/main/database/master'
import { DatabaseManager } from '../../src/main/database/connection'
import { sessionManager } from '../../src/main/services/session'
import { AuthService } from '../../src/main/services/auth.service'
import { CustomerService } from '../../src/main/services/customers.service'
import { VehicleService } from '../../src/main/services/vehicles.service'
import { AppointmentsService } from '../../src/main/services/appointments.service'
import { JobCardService } from '../../src/main/services/job-cards.service'
import { SettingsRepository } from '../../src/main/repositories/settings.repo'

const TEST_DATA_DIR = path.join(process.cwd(), 'test-data-appointments')
const MIGRATIONS_DIR = path.join(process.cwd(), 'src/main/database/migrations')

describe('Appointments & Workshop Scheduling Integration', () => {
  let masterManager: MasterDatabaseManager
  let dbManager: DatabaseManager
  let authService: AuthService
  let customerService: CustomerService
  let vehicleService: VehicleService
  let appointmentsService: AppointmentsService
  let jobCardService: JobCardService
  let settingsRepo: SettingsRepository

  let biz1: { id: string; db_filename: string }

  beforeEach(() => {
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true })
    }
    fs.mkdirSync(TEST_DATA_DIR, { recursive: true })

    MasterDatabaseManager.resetInstanceForTesting()
    DatabaseManager.resetInstanceForTesting()

    masterManager = MasterDatabaseManager.getInstance(TEST_DATA_DIR, MIGRATIONS_DIR)
    dbManager = DatabaseManager.getInstance(path.join(TEST_DATA_DIR, 'databases'))

    authService = new AuthService()
    customerService = new CustomerService()
    vehicleService = new VehicleService()
    appointmentsService = new AppointmentsService()
    jobCardService = new JobCardService()
    settingsRepo = new SettingsRepository()

    const b1 = masterManager.createBusiness('AutoCare Booking', 'owner', 'Admin123!pass')
    biz1 = { id: b1.id, db_filename: b1.db_filename }
  })

  afterEach(() => {
    sessionManager.clearSession()
    DatabaseManager.resetInstanceForTesting()
    MasterDatabaseManager.resetInstanceForTesting()

    if (fs.existsSync(TEST_DATA_DIR)) {
      try {
        fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true })
      } catch {
        // Windows file locking tolerance
      }
    }
  })

  it('schedules appointments, tracks status lifecycle, and converts to workshop job cards', async () => {
    dbManager.openBusinessDatabase(biz1.id, biz1.db_filename)
    await authService.login({ username: 'owner', password: 'Admin123!pass' })

    // 1. Create customer & vehicle
    const customer = customerService.createCustomer({
      name: 'Arthur Dent',
      phonePrimary: '0775551212'
    })

    const vehicle = vehicleService.createVehicle({
      customerId: customer.id,
      registrationNo: 'HITCH-42',
      make: 'Ford',
      model: 'Prefect'
    })

    // 2. Schedule appointment
    const appointment = appointmentsService.createAppointment({
      customerId: customer.id,
      vehicleId: vehicle.id,
      scheduledDate: '2026-11-25',
      scheduledTime: '10:00',
      estimatedDurationMinutes: 60,
      requestedServices: ['Full Inspection', 'Coolant Flush'],
      notes: 'Customer traveling long distance next week'
    })

    expect(appointment.appointmentNumber).toMatch(/^APT-\d{4}-\d{4}$/)
    expect(appointment.status).toBe('Scheduled')
    expect(appointment.customer.name).toBe('Arthur Dent')
    expect(appointment.vehicle.registrationNo).toBe('HITCH-42')
    expect(appointment.requestedServices?.length).toBe(2)

    // 3. Confirm appointment
    const confirmed = appointmentsService.updateStatus(appointment.id, {
      status: 'Confirmed',
      notes: 'Confirmed via SMS with customer'
    })
    expect(confirmed.status).toBe('Confirmed')

    // 4. Convert to Job Card upon vehicle arrival
    const converted = appointmentsService.convertToJobCard({
      appointmentId: appointment.id,
      mileageIn: 88500,
      priority: 'Normal',
      internalNotes: 'Customer arrived on time'
    })

    expect(converted.jobCardId).toBeDefined()
    expect(converted.appointment.jobCardId).toBe(converted.jobCardId)
    // By default setting auto_advance_to_in_service is true, so status is 'In Service'
    expect(converted.appointment.status).toBe('In Service')

    // Verify created job card
    const jobCard = jobCardService.getJobCardById(converted.jobCardId)
    expect(jobCard).toBeDefined()
    expect(jobCard?.customerId).toBe(customer.id)
    expect(jobCard?.vehicleId).toBe(vehicle.id)
    expect(jobCard?.mileageIn).toBe(88500)
    expect(jobCard?.appointmentId).toBe(appointment.id)

    // 5. Prevent double conversion
    expect(() => {
      appointmentsService.convertToJobCard({
        appointmentId: appointment.id
      })
    }).toThrow(/already been converted/i)
  })

  it('respects settings feature toggle when appointments module is turned off', async () => {
    dbManager.openBusinessDatabase(biz1.id, biz1.db_filename)
    await authService.login({ username: 'owner', password: 'Admin123!pass' })

    const customer = customerService.createCustomer({
      name: 'Ford Prefect',
      phonePrimary: '0778889999'
    })
    const vehicle = vehicleService.createVehicle({
      customerId: customer.id,
      registrationNo: 'BETEL-01'
    })

    // Turn OFF appointments module in settings
    settingsRepo.set('feature_toggles', 'module_appointments', false, 'boolean')

    // Expect operations to be blocked
    expect(() => {
      appointmentsService.createAppointment({
        customerId: customer.id,
        vehicleId: vehicle.id,
        scheduledDate: '2026-11-25',
        scheduledTime: '14:00'
      })
    }).toThrow(/Appointments module is currently disabled/i)

    expect(() => {
      appointmentsService.listAppointments()
    }).toThrow(/Appointments module is currently disabled/i)
  })
})
