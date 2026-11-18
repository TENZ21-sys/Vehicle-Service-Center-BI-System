import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as path from 'path'
import * as fs from 'fs'
import { MasterDatabaseManager } from '../../src/main/database/master'
import { DatabaseManager } from '../../src/main/database/connection'
import { sessionManager } from '../../src/main/services/session'
import { AuthService } from '../../src/main/services/auth.service'
import { CatalogueService } from '../../src/main/services/catalogue.service'

const TEST_DATA_DIR = path.join(process.cwd(), 'test-data-catalogue')
const MIGRATIONS_DIR = path.join(process.cwd(), 'src/main/database/migrations')

describe('Service Catalogue Integration', () => {
  let masterManager: MasterDatabaseManager
  let dbManager: DatabaseManager
  let testBusiness: { id: string; db_filename: string }

  beforeEach(async () => {
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true })
    }
    fs.mkdirSync(TEST_DATA_DIR, { recursive: true })

    MasterDatabaseManager.resetInstanceForTesting()
    DatabaseManager.resetInstanceForTesting()

    masterManager = MasterDatabaseManager.getInstance(TEST_DATA_DIR, MIGRATIONS_DIR)
    dbManager = DatabaseManager.getInstance(path.join(TEST_DATA_DIR, 'databases'))

    // Provision test business
    const biz = masterManager.createBusiness('AutoCare Pro', 'admin', 'AdminPass123!')
    testBusiness = { id: biz.id, db_filename: biz.db_filename }

    dbManager.openBusinessDatabase(testBusiness.id, testBusiness.db_filename)
    const authService = new AuthService()
    await authService.login({ username: 'admin', password: 'AdminPass123!' })
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

  it('provisions default service categories and allows creating new services with vehicle categories', () => {
    const catalogueService = new CatalogueService()

    // 1. Check default categories seeded
    const categories = catalogueService.listCategories()
    expect(categories.length).toBeGreaterThanOrEqual(8)
    const engineCat = categories.find((c) => c.name === 'Engine & Mechanical')
    expect(engineCat).toBeDefined()

    // 2. Create custom category
    const customCat = catalogueService.createCategory({
      name: 'Custom Tuning',
      description: 'ECU remapping and performance dyno runs'
    })
    expect(customCat.id).toBeDefined()
    expect(customCat.name).toBe('Custom Tuning')

    // 3. Create service with integer pricing and vehicle categories
    const service = catalogueService.createService({
      categoryId: customCat.id,
      name: 'Stage 1 ECU Tune',
      description: 'Performance ECU remap',
      basePriceAmount: 4500000, // Rs. 45,000.00
      laborChargeAmount: 500000, // Rs. 5,000.00
      estimatedMinutes: 90,
      vehicleCategoryIds: ['cat_car', 'cat_suv']
    })

    expect(service.id).toBeDefined()
    expect(service.name).toBe('Stage 1 ECU Tune')
    expect(service.basePriceAmount).toBe(4500000)
    expect(service.laborChargeAmount).toBe(500000)
    expect(service.categoryName).toBe('Custom Tuning')
    expect(service.applicableVehicleCategoryIds).toEqual(
      expect.arrayContaining(['cat_car', 'cat_suv'])
    )

    // 4. Update service price
    const updated = catalogueService.updateService(service.id, {
      basePriceAmount: 4800000
    })
    expect(updated.basePriceAmount).toBe(4800000)

    // 5. Soft delete service
    catalogueService.deactivateService(service.id)
    const activeServices = catalogueService.listServices({ includeInactive: false })
    expect(activeServices.some((s) => s.id === service.id)).toBe(false)

    // Verify it is still in database with is_active = 0
    const allServices = catalogueService.listServices({ includeInactive: true })
    const deactivated = allServices.find((s) => s.id === service.id)
    expect(deactivated).toBeDefined()
    expect(deactivated?.isActive).toBe(false)
  })
})
