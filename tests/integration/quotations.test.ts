import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as path from 'path'
import * as fs from 'fs'
import { MasterDatabaseManager } from '../../src/main/database/master'
import { DatabaseManager } from '../../src/main/database/connection'
import { sessionManager } from '../../src/main/services/session'
import { AuthService } from '../../src/main/services/auth.service'
import { CustomerService } from '../../src/main/services/customers.service'
import { VehicleService } from '../../src/main/services/vehicles.service'
import { CatalogueService } from '../../src/main/services/catalogue.service'
import { InventoryService } from '../../src/main/services/inventory.service'
import { QuotationsService } from '../../src/main/services/quotations.service'
import { JobCardService } from '../../src/main/services/job-cards.service'
import { SettingsRepository } from '../../src/main/repositories/settings.repo'

const TEST_DATA_DIR = path.join(process.cwd(), 'test-data-quotations')
const MIGRATIONS_DIR = path.join(process.cwd(), 'src/main/database/migrations')

describe('Formal Quotations & Estimates Integration', () => {
  let masterManager: MasterDatabaseManager
  let dbManager: DatabaseManager
  let authService: AuthService
  let customerService: CustomerService
  let vehicleService: VehicleService
  let catalogueService: CatalogueService
  let inventoryService: InventoryService
  let quotationsService: QuotationsService
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
    catalogueService = new CatalogueService()
    inventoryService = new InventoryService()
    quotationsService = new QuotationsService()
    jobCardService = new JobCardService()
    settingsRepo = new SettingsRepository()

    const b1 = masterManager.createBusiness('AutoCare Estimates', 'owner', 'Admin123!pass')
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

  it('creates formal estimates, tracks approval, and converts approved quotes to job cards with stock deduction', async () => {
    dbManager.openBusinessDatabase(biz1.id, biz1.db_filename)
    await authService.login({ username: 'owner', password: 'Admin123!pass' })

    // 1. Create customer, vehicle, catalogue service, inventory part
    const customer = customerService.createCustomer({
      name: 'James Bond',
      phonePrimary: '0770070007'
    })

    const vehicle = vehicleService.createVehicle({
      customerId: customer.id,
      registrationNo: 'JB-007',
      make: 'Aston Martin',
      model: 'DB5'
    })

    const service = catalogueService.createService({
      name: 'Bulletproof Armor Reinforcement',
      basePriceAmount: 5000000, // 50,000.00
      laborChargeAmount: 2000000 // 20,000.00
    })

    const part = inventoryService.createItem({
      name: 'Ejector Seat Mechanism',
      costPriceAmount: 3000000,
      sellingPriceAmount: 4500000,
      reorderLevel: 1
    })

    // Put parts in stock
    inventoryService.adjustStock({
      itemId: part.id,
      movementType: 'adjustment_in',
      quantity: 5,
      reason: 'Q-Branch supply'
    })

    expect(inventoryService.getItemById(part.id).currentStock).toBe(5)

    // 2. Create Quotation with 10% tax (1000 basis points) and 14 days validity
    const quote = quotationsService.createQuotation({
      customerId: customer.id,
      vehicleId: vehicle.id,
      validityDays: 14,
      taxRate: 1000, // 10%
      discountAmount: 500000, // 5,000.00 discount
      items: [
        {
          itemType: 'service',
          referenceId: service.id,
          description: service.name,
          quantity: 1,
          unitPriceAmount: 7000000 // 70,000.00
        },
        {
          itemType: 'part',
          referenceId: part.id,
          description: part.name,
          quantity: 1,
          unitPriceAmount: 4500000 // 45,000.00
        }
      ]
    })

    expect(quote.quotationNumber).toMatch(/^QT-\d{4}-\d{4}$/)
    expect(quote.status).toBe('Draft')
    expect(quote.subtotalAmount).toBe(11500000) // 70,000 + 45,000
    // Tax: 10% of 11,500,000 = 1,150,000
    expect(quote.taxAmount).toBe(1150000)
    expect(quote.discountAmount).toBe(500000)
    // Grand Total = 11,500,000 + 1,150,000 - 500,000 = 12,150,000
    expect(quote.totalAmount).toBe(12150000)
    expect(quote.items.length).toBe(2)

    // Stock has not been deducted yet while in quotation status
    expect(inventoryService.getItemById(part.id).currentStock).toBe(5)

    // 3. Mark quotation as Sent, then Approved
    quotationsService.updateStatus(quote.id, 'Sent')
    expect(quotationsService.getById(quote.id).status).toBe('Sent')

    const approved = quotationsService.updateStatus(quote.id, 'Approved', 'Approved by M')
    expect(approved.status).toBe('Approved')
    expect(approved.approvedBy).toBeDefined()
    expect(approved.approvedAt).toBeDefined()

    // 4. Convert to Job Card
    const conversion = quotationsService.convertToJobCard({
      quotationId: quote.id,
      mileageIn: 12000,
      priority: 'Urgent',
      internalNotes: 'Handle with care - agent vehicle'
    })

    expect(conversion.jobCardId).toBeDefined()
    const jobCard = jobCardService.getJobCardById(conversion.jobCardId)
    expect(jobCard).toBeDefined()
    expect(jobCard?.quotationId).toBe(quote.id)
    expect(jobCard?.services.length).toBe(1)
    expect(jobCard?.parts.length).toBe(1)

    // 5. Verify parts stock was automatically allocated & deducted in stock movements ledger
    expect(inventoryService.getItemById(part.id).currentStock).toBe(4)
    const movements = inventoryService.getItemMovements(part.id)
    const jcMovement = movements.find((m) => m.referenceId === jobCard?.id)
    expect(jcMovement).toBeDefined()
    expect(jcMovement?.quantity).toBe(-1)
  })

  it('respects settings feature toggle when quotations module is turned off', async () => {
    dbManager.openBusinessDatabase(biz1.id, biz1.db_filename)
    await authService.login({ username: 'owner', password: 'Admin123!pass' })

    const customer = customerService.createCustomer({
      name: 'Felix Leiter',
      phonePrimary: '0771112222'
    })

    // Turn OFF quotations module in settings
    settingsRepo.set('feature_toggles', 'module_quotations', false, 'boolean')

    expect(() => {
      quotationsService.createQuotation({
        customerId: customer.id,
        items: [
          {
            itemType: 'service',
            description: 'Inspection',
            quantity: 1,
            unitPriceAmount: 100000
          }
        ]
      })
    }).toThrow(/Quotations module is currently disabled/i)

    expect(() => {
      quotationsService.listQuotations()
    }).toThrow(/Quotations module is currently disabled/i)
  })
})
