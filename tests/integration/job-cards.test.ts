import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as path from 'path'
import * as fs from 'fs'
import { MasterDatabaseManager } from '../../src/main/database/master'
import { DatabaseManager } from '../../src/main/database/connection'
import { sessionManager } from '../../src/main/services/session'
import { AuthService } from '../../src/main/services/auth.service'
import { CustomerService } from '../../src/main/services/customers.service'
import { VehicleService } from '../../src/main/services/vehicles.service'
import { InventoryService } from '../../src/main/services/inventory.service'
import { JobCardService } from '../../src/main/services/job-cards.service'
import { SettingsRepository } from '../../src/main/repositories/settings.repo'

const TEST_DATA_DIR = path.join(process.cwd(), 'test-data-jobcards')
const MIGRATIONS_DIR = path.join(process.cwd(), 'src/main/database/migrations')

describe('Workshop Job Cards Integration', () => {
  let masterManager: MasterDatabaseManager
  let dbManager: DatabaseManager
  let authService: AuthService
  let customerService: CustomerService
  let vehicleService: VehicleService
  let inventoryService: InventoryService
  let jobCardService: JobCardService

  let biz1: { id: string; db_filename: string }
  let biz2: { id: string; db_filename: string }

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
    inventoryService = new InventoryService()
    jobCardService = new JobCardService()

    const b1 = masterManager.createBusiness('AutoCare Works', 'admin1', 'Pass123!admin')
    biz1 = { id: b1.id, db_filename: b1.db_filename }

    const b2 = masterManager.createBusiness('Garage South', 'admin2', 'Pass123!admin')
    biz2 = { id: b2.id, db_filename: b2.db_filename }
  })

  afterEach(() => {
    sessionManager.clearSession()
    DatabaseManager.resetInstanceForTesting()
    MasterDatabaseManager.resetInstanceForTesting()

    if (fs.existsSync(TEST_DATA_DIR)) {
      try {
        fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true })
      } catch {
        // ignore
      }
    }
  })

  it('manages complete job card workflow, parts stock ledger deduction, and settings toggles', async () => {
    dbManager.openBusinessDatabase(biz1.id, biz1.db_filename)
    await authService.login({ username: 'admin1', password: 'Pass123!admin' })

    // 1. Create customer and vehicle
    const customer = customerService.createCustomer({
      name: 'Nimal Jayasuriya',
      phonePrimary: '0779876543'
    })
    const vehicle = vehicleService.createVehicle({
      customerId: customer.id,
      registrationNo: 'CBA-9988',
      make: 'Toyota',
      model: 'Corolla',
      year: 2020
    })

    // 2. Create inventory item with opening stock
    const oilItem = inventoryService.createItem({
      sku: 'OIL-TOYOTA-0W20',
      name: 'Toyota Genuine Motor Oil 0W-20',
      costPriceAmount: 220000,
      sellingPriceAmount: 320000,
      initialStock: 20 // 20 Liters in workshop
    })
    expect(oilItem.currentStock).toBe(20)

    // 3. Create Job Card (Sequential Numbering)
    const jc = jobCardService.createJobCard({
      customerId: customer.id,
      vehicleId: vehicle.id,
      priority: 'High',
      mileageIn: 64500,
      findings: 'Customer reported oil leakage and spongy brake pedal'
    })

    expect(jc.jobCardNumber).toMatch(/^JC-\d{4}-\d{4}$/)
    expect(jc.status).toBe('Open')
    expect(jc.receivedAt).toBeDefined()
    expect(jc.startedAt).toBeNull()

    // 4. Test Optional vs Required Technician Assignment
    // Default setting require_technician_assignment is false -> can transition to In Progress without technician
    const inProgressJc = jobCardService.updateStatus(jc.id, { status: 'In Progress' })
    expect(inProgressJc.status).toBe('In Progress')
    expect(inProgressJc.startedAt).toBeDefined() // Milestone timestamp recorded

    // Now enable require_technician_assignment setting
    const settingsRepo = new SettingsRepository()
    settingsRepo.set('workflow', 'require_technician_assignment', true, 'boolean')

    // Reset status to Open
    jobCardService.updateStatus(jc.id, { status: 'Open' })

    // Trying to transition to In Progress without technician should now throw!
    expect(() => {
      jobCardService.updateStatus(jc.id, { status: 'In Progress' })
    }).toThrow(/technician must be assigned/i)

    // Assign a technician (using admin user id for test)
    const session = sessionManager.getSession()!
    jobCardService.assignTechnician(jc.id, { technicianId: session.userId })

    // Now transition succeeds
    const resumedJc = jobCardService.updateStatus(jc.id, { status: 'In Progress' })
    expect(resumedJc.status).toBe('In Progress')
    expect(resumedJc.technicianId).toBe(session.userId)

    // 5. Add Service Line Item
    const serviceLine = jobCardService.addService(jc.id, {
      serviceName: 'Engine Oil & Filter Service',
      priceAmount: 150000, // 1,500.00
      laborAmount: 200000 // 2,000.00
    })
    expect(serviceLine.id).toBeDefined()
    expect(serviceLine.status).toBe('Pending')

    // Update service status to Completed
    jobCardService.updateService(serviceLine.id, { status: 'Completed' })

    // 6. Allocate Parts from Inventory & Verify Stock Ledger Deduction
    const partLine = jobCardService.addPart(jc.id, {
      inventoryItemId: oilItem.id,
      quantity: 4.5, // 4.5 Liters
      unitPriceAmount: 320000
    })

    expect(partLine.id).toBeDefined()
    expect(partLine.quantity).toBe(4.5)
    expect(partLine.totalAmount).toBe(Math.round(4.5 * 320000)) // 1,440,000

    // CRITICAL: Stock in inventory must now be 20 - 4.5 = 15.5
    const oilItemAfterAllocation = inventoryService.getItemById(oilItem.id)
    expect(oilItemAfterAllocation.currentStock).toBe(15.5)

    // Check totals
    const jcWithParts = jobCardService.getJobCardById(jc.id)
    expect(jcWithParts.totals.subtotalServices).toBe(150000)
    expect(jcWithParts.totals.subtotalLabor).toBe(200000)
    expect(jcWithParts.totals.subtotalParts).toBe(1440000)
    expect(jcWithParts.totals.grandTotal).toBe(150000 + 200000 + 1440000)

    // 7. Remove Part & Verify Counter-Movement in Stock Ledger
    jobCardService.removePart(partLine.id)
    const oilItemAfterReturn = inventoryService.getItemById(oilItem.id)
    // Stock must be restored to 20
    expect(oilItemAfterReturn.currentStock).toBe(20)

    // Re-allocate 4 Liters
    jobCardService.addPart(jc.id, {
      inventoryItemId: oilItem.id,
      quantity: 4
    })
    expect(inventoryService.getItemById(oilItem.id).currentStock).toBe(16)

    // 8. Move to Ready and Delivered
    jobCardService.updateStatus(jc.id, { status: 'Ready' })
    const readyJc = jobCardService.getJobCardById(jc.id)
    expect(readyJc.status).toBe('Ready')
    expect(readyJc.completedAt).toBeDefined()

    // Deliver vehicle with final mileage
    jobCardService.updateStatus(jc.id, { status: 'Delivered', mileageOut: 64510 })
    const deliveredJc = jobCardService.getJobCardById(jc.id)
    expect(deliveredJc.status).toBe('Delivered')
    expect(deliveredJc.deliveredAt).toBeDefined()
    expect(deliveredJc.mileageOut).toBe(64510)
  })

  it('enforces multi-business isolation on job cards', async () => {
    // Create Job Card in Business 1
    dbManager.openBusinessDatabase(biz1.id, biz1.db_filename)
    await authService.login({ username: 'admin1', password: 'Pass123!admin' })

    const customer1 = customerService.createCustomer({ name: 'Cust 1', phonePrimary: '0771111111' })
    const vehicle1 = vehicleService.createVehicle({ customerId: customer1.id, registrationNo: 'WP-1111' })
    const jc1 = jobCardService.createJobCard({ customerId: customer1.id, vehicleId: vehicle1.id })
    expect(jc1.id).toBeDefined()

    // Switch to Business 2
    sessionManager.clearSession()
    dbManager.openBusinessDatabase(biz2.id, biz2.db_filename)
    await authService.login({ username: 'admin2', password: 'Pass123!admin' })

    // Business 2 should have 0 job cards
    const biz2Cards = jobCardService.listJobCards()
    expect(biz2Cards.length).toBe(0)

    // Cannot fetch Business 1's job card from Business 2
    expect(() => {
      jobCardService.getJobCardById(jc1.id)
    }).toThrow()
  })
})
