import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as path from 'path'
import * as fs from 'fs'
import { MasterDatabaseManager } from '../../src/main/database/master'
import { DatabaseManager } from '../../src/main/database/connection'
import { sessionManager } from '../../src/main/services/session'
import { AuthService } from '../../src/main/services/auth.service'
import { ImportService } from '../../src/main/services/import.service'

const TEST_DATA_DIR = path.join(process.cwd(), 'test-data-import')
const MIGRATIONS_DIR = path.join(process.cwd(), 'src/main/database/migrations')

describe('CSV Data Import System Integration', () => {
  let masterManager: MasterDatabaseManager
  let dbManager: DatabaseManager
  let testBusiness: { id: string; db_filename: string }
  let importService: ImportService

  beforeEach(async () => {
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true })
    }
    fs.mkdirSync(TEST_DATA_DIR, { recursive: true })

    MasterDatabaseManager.resetInstanceForTesting()
    DatabaseManager.resetInstanceForTesting()

    masterManager = MasterDatabaseManager.getInstance(TEST_DATA_DIR, MIGRATIONS_DIR)
    dbManager = DatabaseManager.getInstance(path.join(TEST_DATA_DIR, 'databases'))

    const biz = masterManager.createBusiness('AutoCare Import Testing', 'owner', 'Owner123!')
    testBusiness = { id: biz.id, db_filename: biz.db_filename }

    dbManager.openBusinessDatabase(testBusiness.id, testBusiness.db_filename)
    const authService = new AuthService()
    await authService.login({ username: 'owner', password: 'Owner123!' })

    importService = new ImportService(dbManager)
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

  it('validates and imports customers with duplicate detection', () => {
    const csvContent = `name,phone,email,address,notes
Kamal Silva,0771122334,kamal@gmail.com,120 Galle Rd,Regular client
Nimal Dias,0714455667,nimal@yahoo.com,45 High Level Rd,Fleet manager`

    // Step 1: Pre-validation dry run
    const validation = importService.validateImport('customers', csvContent)
    expect(validation.errorCount).toBe(0)
    expect(validation.validCount).toBe(2)
    expect(validation.duplicateCount).toBe(0)

    // Step 2: Atomic Execution
    const execResult = importService.executeImport('customers', csvContent, 'skip')
    expect(execResult.importedCount).toBe(2)
    expect(execResult.errors.length).toBe(0)

    // Verify in database
    const db = dbManager.getActiveDb()
    const rows = db.prepare('SELECT * FROM customers WHERE is_active = 1').all() as any[]
    expect(rows.length).toBe(2)
    expect(rows.find((r) => r.name === 'Kamal Silva')?.phone_primary).toBe('0771122334')

    // Step 3: Re-validate with duplicates
    const dupCsv = `name,phone,email,address,notes
Kamal Silva Updated,0771122334,new_email@gmail.com,New Address,Updated notes
Sunil Bandara,0759988776,sunil@test.com,Kandy,New client`

    const dupValidation = importService.validateImport('customers', dupCsv)
    expect(dupValidation.duplicateCount).toBe(1)
    expect(dupValidation.validCount).toBe(1)

    // Step 4: Execute with 'update' duplicate strategy
    const updateResult = importService.executeImport('customers', dupCsv, 'update')
    expect(updateResult.importedCount).toBe(1)
    expect(updateResult.updatedCount).toBe(1)

    const updatedRow = db.prepare('SELECT * FROM customers WHERE phone_primary = ?').get('0771122334') as any
    expect(updatedRow.name).toBe('Kamal Silva Updated')
    expect(updatedRow.email).toBe('new_email@gmail.com')
  })

  it('validates and imports vehicles and links with customers', () => {
    // 1. First import customer
    const custCsv = `name,phone,email,address,notes
Kasun Perera,0773344556,kasun@gmail.com,Colombo,VIP customer`
    importService.executeImport('customers', custCsv)

    // 2. Import vehicles referencing the customer phone
    const vehicleCsv = `registrationNo,customerPhone,make,model,year,category,fuelType,transmission,color,currentMileage
CAB-1234,0773344556,Toyota,Corolla Axio,2018,Sedan,Petrol,Automatic,White,65000
WP-CAD-5678,0710000000,Honda,Grace,2017,Sedan,Hybrid,Automatic,Black,42000`

    const validation = importService.validateImport('vehicles', vehicleCsv)
    expect(validation.errorCount).toBe(0)
    expect(validation.validCount).toBe(2)

    const result = importService.executeImport('vehicles', vehicleCsv)
    expect(result.importedCount).toBe(2)
    expect(result.errors.length).toBe(0)

    const db = dbManager.getActiveDb()
    const vehicles = db.prepare('SELECT * FROM vehicles').all() as any[]
    expect(vehicles.length).toBe(2)

    // First vehicle linked to Kasun Perera
    const v1 = vehicles.find((v) => v.registration_no === 'CAB-1234')
    expect(v1).toBeDefined()
    expect(v1.make).toBe('Toyota')
    expect(v1.extra_fields).toContain('65000')

    // Second vehicle automatically created client stub so foreign key constraint is satisfied
    const v2 = vehicles.find((v) => v.registration_no === 'WP-CAD-5678')
    expect(v2).toBeDefined()
    const stubCust = db.prepare('SELECT * FROM customers WHERE id = ?').get(v2.customer_id) as any
    expect(stubCust.phone_primary).toBe('0710000000')
  })

  it('validates and imports inventory items and creates stock ledger movements for opening stock', () => {
    const invCsv = `sku,name,category,costPrice,sellingPrice,openingStock,unit,reorderLevel,location
OIL-5W30,Engine Oil 5W-30 (4L),Lubricants,12000.00,15000.00,25,Bottle,5,Rack A1
FLT-OIL-01,Oil Filter Genuine,Filters,1500.00,2500.00,40,Piece,10,Rack B2`

    const validation = importService.validateImport('inventory', invCsv)
    expect(validation.errorCount).toBe(0)
    expect(validation.validCount).toBe(2)

    const result = importService.executeImport('inventory', invCsv)
    expect(result.importedCount).toBe(2)
    expect(result.errors.length).toBe(0)

    const db = dbManager.getActiveDb()
    const items = db.prepare('SELECT * FROM inventory_items').all() as any[]
    expect(items.length).toBe(2)
    const oil = items.find((i) => i.sku === 'OIL-5W30')
    expect(oil.cost_price_amount).toBe(1200000) // cents
    expect(oil.selling_price_amount).toBe(1500000) // cents

    // Ledger check: opening stock must exist in stock_movements
    const movements = db.prepare('SELECT * FROM stock_movements WHERE item_id = ?').all(oil.id) as any[]
    expect(movements.length).toBe(1)
    expect(movements[0].movement_type).toBe('adjustment_in')
    expect(movements[0].quantity).toBe(25)
    expect(movements[0].reference_type).toBe('adjustment')
  })

  it('validates and imports services and expenses without schema errors', () => {
    // Services
    const serviceCsv = `name,category,basePrice,estimatedDurationMinutes,description
Full Periodic Service,Routine,12000.00,120,45-point inspection
Wheel Alignment,Alignment,3500.00,45,Laser 4-wheel alignment`

    const srvResult = importService.executeImport('services', serviceCsv)
    expect(srvResult.importedCount).toBe(2)

    // Expenses
    const expenseCsv = `expenseDate,category,amount,paymentMethod,paidTo,referenceNo,notes
2026-11-01,Rent,125000.00,Bank Transfer,Landlord,RENT-01,Monthly rent
2026-11-02,Electricity,35000.00,Cash,CEB,CEB-11,Monthly electric`

    const expResult = importService.executeImport('expenses', expenseCsv)
    expect(expResult.importedCount).toBe(2)

    const db = dbManager.getActiveDb()
    const expRows = db.prepare('SELECT * FROM expenses').all() as any[]
    expect(expRows.length).toBe(2)
    expect(expRows[0].amount).toBe(12500000) // cents
  })
})
