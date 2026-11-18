import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { MasterDatabaseManager } from '../../src/main/database/master'
import { DatabaseManager } from '../../src/main/database/connection'
import { AuthService } from '../../src/main/services/auth.service'
import { CustomerService } from '../../src/main/services/customers.service'
import { VehicleService } from '../../src/main/services/vehicles.service'
import { VehicleCategoriesService } from '../../src/main/services/vehicle-categories.service'
import { sessionManager } from '../../src/main/services/session'

describe('Customers, Dynamic Vehicle Categories, and Vehicles Integration', () => {
  const testDataDir = path.join(process.cwd(), 'test-data-cv')
  const migrationsDir = path.join(process.cwd(), 'src/main/database/migrations')

  let masterDb: MasterDatabaseManager
  let dbManager: DatabaseManager
  let authService: AuthService
  let customerService: CustomerService
  let vehicleService: VehicleService
  let categoryService: VehicleCategoriesService

  beforeEach(async () => {
    DatabaseManager.resetInstanceForTesting()
    MasterDatabaseManager.resetInstanceForTesting()
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true, force: true })
    }

    dbManager = DatabaseManager.getInstance(testDataDir)
    masterDb = MasterDatabaseManager.getInstance(testDataDir, migrationsDir)
    authService = new AuthService()
    customerService = new CustomerService()
    vehicleService = new VehicleService()
    categoryService = new VehicleCategoriesService()

    // Provision business and login as owner
    const biz = masterDb.createBusiness('AutoCare Hub', 'hub_admin', 'HubPassword123', 'Hub Manager')
    dbManager.openBusinessDatabase(biz.id, biz.db_filename)
    await authService.login({ username: 'hub_admin', password: 'HubPassword123' })
  })

  afterEach(() => {
    sessionManager.clearSession()
    DatabaseManager.resetInstanceForTesting()
    MasterDatabaseManager.resetInstanceForTesting()
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true, force: true })
    }
  })

  it('provisions default vehicle categories and allows adding ANY custom category', () => {
    const categories = categoryService.listCategories()
    expect(categories.length).toBeGreaterThanOrEqual(6)
    expect(categories.some((c) => c.name === 'Car')).toBe(true)
    expect(categories.some((c) => c.name === 'Motorcycle / Scooter')).toBe(true)

    // Add a new custom category (e.g. Electric Forklift)
    const customCat = categoryService.createCategory({
      name: 'Electric Forklift',
      description: 'Heavy warehouse lifting equipment',
      sortOrder: 20,
      extraFields: [
        {
          key: 'max_lift_kg',
          label: 'Max Lift Capacity (kg)',
          type: 'number',
          required: true
        }
      ]
    })

    expect(customCat.id).toBeDefined()
    expect(customCat.name).toBe('Electric Forklift')
    expect(customCat.extraFields[0].key).toBe('max_lift_kg')

    const updatedList = categoryService.listCategories()
    expect(updatedList.some((c) => c.name === 'Electric Forklift')).toBe(true)
  })

  it('creates customer and prevents duplicate phone without override', () => {
    const customer = customerService.createCustomer({
      name: 'Nimal Jayawardena',
      phonePrimary: '+94771122334',
      phoneSecondary: '0112345678',
      email: 'nimal@example.com',
      nic: '841234567V'
    })

    expect(customer.id).toBeDefined()
    expect(customer.name).toBe('Nimal Jayawardena')

    // Attempt duplicate phone without allowDuplicate flag
    expect(() => {
      customerService.createCustomer({
        name: 'Another Customer',
        phonePrimary: '+94771122334'
      })
    }).toThrow('Customer already exists with matching phone/NIC')

    // Search finds customer by name or phone or NIC
    const searchByName = customerService.searchCustomers('Nimal')
    expect(searchByName.length).toBe(1)
    expect(searchByName[0].name).toBe('Nimal Jayawardena')

    const searchByPhone = customerService.searchCustomers('1122334')
    expect(searchByPhone.length).toBe(1)

    const searchByNic = customerService.searchCustomers('841234567V')
    expect(searchByNic.length).toBe(1)
  })

  it('registers multiple vehicles for a customer and tracks category-specific extra fields', () => {
    const customer = customerService.createCustomer({
      name: 'Sunil Silva',
      phonePrimary: '0712345678'
    })

    const carCat = categoryService.listCategories().find((c) => c.name === 'Car')

    // Register vehicle 1 (Car)
    const car = vehicleService.createVehicle({
      customerId: customer.id,
      categoryId: carCat?.id,
      registrationNo: 'wp cba-1234',
      make: 'Honda',
      model: 'Civic',
      year: 2021,
      color: 'Black',
      fuelType: 'Petrol',
      transmission: 'Automatic',
      extraFields: {
        trim: 'EX-L',
        sunroof: true
      }
    })

    expect(car.registrationNo).toBe('WP CBA-1234')
    expect(car.extraFields?.trim).toBe('EX-L')

    // Register vehicle 2 (Van)
    const vanCat = categoryService.listCategories().find((c) => c.name === 'Van')
    const van = vehicleService.createVehicle({
      customerId: customer.id,
      categoryId: vanCat?.id,
      registrationNo: 'wp pd-9876',
      make: 'Toyota',
      model: 'HiAce',
      year: 2019,
      fuelType: 'Diesel',
      transmission: 'Manual'
    })

    expect(van.registrationNo).toBe('WP PD-9876')

    // Verify customer's vehicles list
    const customerWithVehicles = customerService.getCustomer(customer.id)
    expect(customerWithVehicles.vehicles.length).toBe(2)
    expect(customerWithVehicles.vehicles.some((v) => v.registrationNo === 'WP CBA-1234')).toBe(true)
    expect(customerWithVehicles.vehicles.some((v) => v.registrationNo === 'WP PD-9876')).toBe(true)
  })

  it('schedules and tracks service reminders by date and mileage', () => {
    const customer = customerService.createCustomer({
      name: 'Priyanka Bandara',
      phonePrimary: '0779988776'
    })

    const vehicle = vehicleService.createVehicle({
      customerId: customer.id,
      registrationNo: 'CP CAA-7788',
      make: 'Suzuki',
      model: 'Alto'
    })

    // 1. Add date-based reminder
    const dateReminder = vehicleService.createReminder({
      vehicleId: vehicle.id,
      reminderType: 'date',
      dueDate: '2026-11-20',
      description: 'Wheel Alignment & Tire Rotation'
    })
    expect(dateReminder.id).toBeDefined()
    expect(dateReminder.isCompleted).toBe(false)

    // 2. Add mileage reminder
    const mileageReminder = vehicleService.createReminder({
      vehicleId: vehicle.id,
      reminderType: 'mileage',
      dueMileage: 40000,
      description: 'Full Synthetic Oil Change'
    })
    expect(mileageReminder.id).toBeDefined()

    // 3. Query due reminders for a given date
    const dueReminders = vehicleService.listDueReminders('2026-11-25', 45000)
    expect(dueReminders.length).toBe(2)

    // 4. Complete a reminder
    const completed = vehicleService.completeReminder(dateReminder.id)
    expect(completed.isCompleted).toBe(true)

    // Completed reminder should no longer appear in due list
    const remainingDue = vehicleService.listDueReminders('2026-11-25', 45000)
    expect(remainingDue.length).toBe(1)
    expect(remainingDue[0].id).toBe(mileageReminder.id)
  })

  it('enforces soft delete: deactivated customers and vehicles are not removed from DB', () => {
    const customer = customerService.createCustomer({
      name: 'To Be Archived',
      phonePrimary: '0701122334'
    })

    const vehicle = vehicleService.createVehicle({
      customerId: customer.id,
      registrationNo: 'WP ARCH-001'
    })

    // Deactivate vehicle
    vehicleService.deactivateVehicle(vehicle.id)
    const activeVehicles = vehicleService.listVehicles(false)
    expect(activeVehicles.some((v) => v.id === vehicle.id)).toBe(false)

    const allVehicles = vehicleService.listVehicles(true)
    expect(allVehicles.some((v) => v.id === vehicle.id)).toBe(true)

    // Deactivate customer
    customerService.deactivateCustomer(customer.id)
    const activeCustomers = customerService.listCustomers(false)
    expect(activeCustomers.some((c) => c.id === customer.id)).toBe(false)

    const allCustomers = customerService.listCustomers(true)
    expect(allCustomers.some((c) => c.id === customer.id)).toBe(true)
  })

  it('supports vehicle image upload, editing vehicle details, and editing customer profiles', () => {
    // 1. Create customer
    const customer = customerService.createCustomer({
      name: 'Kasun Kalhara',
      phonePrimary: '0714455667',
      email: 'kasun@test.lk'
    })

    // Edit customer
    const updatedCustomer = customerService.updateCustomer(customer.id, {
      name: 'Kasun Kalhara Perera',
      email: 'kasun.perera@test.lk'
    })
    expect(updatedCustomer.name).toBe('Kasun Kalhara Perera')
    expect(updatedCustomer.email).toBe('kasun.perera@test.lk')

    // 2. Register vehicle with photo data
    const samplePhotoDataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD'
    const vehicle = vehicleService.createVehicle({
      customerId: customer.id,
      registrationNo: 'WP CAR-9988',
      make: 'Nissan',
      model: 'Leaf',
      year: 2021,
      color: 'White Pearl',
      extraFields: {
        imageUrl: samplePhotoDataUrl,
        batteryHealth: '92%'
      }
    })

    expect(vehicle.id).toBeDefined()
    expect(vehicle.imageUrl).toBe(samplePhotoDataUrl)
    expect(vehicle.extraFields?.batteryHealth).toBe('92%')

    // 3. Edit vehicle: update color and image
    const newPhotoDataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEUpdatedPhoto'
    const updatedVehicle = vehicleService.updateVehicle(vehicle.id, {
      color: 'Matte Black',
      extraFields: {
        imageUrl: newPhotoDataUrl,
        batteryHealth: '95%'
      }
    })

    expect(updatedVehicle.color).toBe('Matte Black')
    expect(updatedVehicle.imageUrl).toBe(newPhotoDataUrl)

    // 4. Verify in customer vehicle list
    const fetchedCustomer = customerService.getCustomer(customer.id)
    const fetchedVehicle = fetchedCustomer.vehicles.find((v) => v.id === vehicle.id)
    expect(fetchedVehicle?.imageUrl).toBe(newPhotoDataUrl)
    expect(fetchedVehicle?.color).toBe('Matte Black')
  })
})
