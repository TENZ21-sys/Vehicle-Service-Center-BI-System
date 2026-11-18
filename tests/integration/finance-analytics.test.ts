import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as path from 'path'
import * as fs from 'fs'
import { MasterDatabaseManager } from '../../src/main/database/master'
import { DatabaseManager } from '../../src/main/database/connection'
import { sessionManager } from '../../src/main/services/session'
import { AuthService } from '../../src/main/services/auth.service'
import { FinanceService } from '../../src/main/services/finance.service'
import { AnalyticsService } from '../../src/main/services/analytics.service'
import { InvoicesService } from '../../src/main/services/invoices.service'
import { CustomerRepository } from '../../src/main/repositories/customers.repo'
import { InventoryService } from '../../src/main/services/inventory.service'
import { SettingsRepository } from '../../src/main/repositories/settings.repo'

const TEST_DATA_DIR = path.join(process.cwd(), 'test-data-finance')
const MIGRATIONS_DIR = path.join(process.cwd(), 'src/main/database/migrations')

describe('Finance, Expenses & BI Analytics Integration', () => {
  let masterManager: MasterDatabaseManager
  let dbManager: DatabaseManager
  let authService: AuthService
  let financeService: FinanceService
  let analyticsService: AnalyticsService
  let invoicingService: InvoicesService
  let customerRepo: CustomerRepository
  let inventoryService: InventoryService
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
    financeService = new FinanceService()
    analyticsService = new AnalyticsService()
    invoicingService = new InvoicesService()
    customerRepo = new CustomerRepository()
    inventoryService = new InventoryService()
    settingsRepo = new SettingsRepository()

    const b1 = masterManager.createBusiness('AutoCare Finance', 'owner', 'Admin123!pass')
    biz1 = { id: b1.id, db_filename: b1.db_filename }

    // Log in
    authService.login({
      username: 'owner',
      password: 'Admin123!pass',
      businessId: biz1.id
    })
  })

  afterEach(() => {
    sessionManager.clearSession()
    DatabaseManager.resetInstanceForTesting()
    MasterDatabaseManager.resetInstanceForTesting()
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true })
    }
  })

  it('provisions default expense categories and allows adding custom categories', () => {
    const defaultCategories = financeService.listCategories()
    expect(defaultCategories.length).toBeGreaterThanOrEqual(8)

    const rentCat = defaultCategories.find((c) => c.name.includes('Rent'))
    expect(rentCat).toBeDefined()

    // Add custom category
    const custom = financeService.createCategory({
      name: 'Diagnostic Software License',
      description: 'Monthly cloud scanner subscription'
    })
    expect(custom.id).toBeDefined()
    expect(custom.name).toBe('Diagnostic Software License')

    const updatedList = financeService.listCategories()
    expect(updatedList.some((c) => c.name === 'Diagnostic Software License')).toBe(true)
  })

  it('records expenses with atomic numbering, updates, and soft deletes', () => {
    const categories = financeService.listCategories()
    const rentCat = categories.find((c) => c.name.includes('Rent'))!

    const expense1 = financeService.createExpense({
      categoryId: rentCat.id,
      amount: 12000000, // Rs. 120,000.00
      paymentMethod: 'Bank Transfer',
      paidTo: 'Apex Properties Ltd',
      referenceNo: 'RENT-NOV-2026',
      notes: 'Monthly workshop premises rent',
      expenseDate: '2026-11-01'
    })

    expect(expense1.expenseNumber).toMatch(/^EXP-\d{4}-\d{4}$/)
    expect(expense1.amount).toBe(12000000)
    expect(expense1.category.name).toBe(rentCat.name)

    const expense2 = financeService.createExpense({
      categoryId: rentCat.id,
      amount: 150000, // Rs. 1,500.00
      paymentMethod: 'Cash',
      paidTo: 'Workshop Hardware Store',
      referenceNo: 'RCP-5544',
      expenseDate: '2026-11-05'
    })

    expect(expense2.expenseNumber).toMatch(/^EXP-\d{4}-\d{4}$/)
    expect(expense2.expenseNumber).not.toBe(expense1.expenseNumber)

    // List expenses
    const list = financeService.listExpenses()
    expect(list.length).toBe(2)

    // Update expense
    const updated = financeService.updateExpense(expense2.id, {
      amount: 180000
    })
    expect(updated.amount).toBe(180000)

    // Delete expense (soft delete)
    const deleted = financeService.deleteExpense(expense2.id)
    expect(deleted).toBe(true)

    const listAfterDelete = financeService.listExpenses()
    expect(listAfterDelete.length).toBe(1)
    expect(listAfterDelete[0].id).toBe(expense1.id)
  })

  it('calculates real-time financial margins (Revenue, COGS, Gross Profit, Expenses, Net Profit)', () => {
    // 1. Create a customer
    const customer = customerRepo.create({
      name: 'Samantha Perera',
      phonePrimary: '0778899001'
    })

    // 2. Create inventory item with cost price Rs. 2,000 and selling price Rs. 3,500
    const cat = inventoryService.createCategory({ name: 'Engine Oils' })
    const units = inventoryService.listUnits()
    const unit = units[0]
    const item = inventoryService.createItem({
      sku: 'OIL-5W30',
      name: 'Full Synthetic Engine Oil 4L',
      categoryId: cat.id,
      unitId: unit.id,
      costPriceAmount: 200000,   // Rs. 2,000.00
      sellingPriceAmount: 350000, // Rs. 3,500.00
      initialStock: 20
    })

    // 3. Complete direct POS sale: 2 bottles of oil (revenue = 7,000, COGS = 4,000)
    // paid fully with Cash
    invoicingService.createPosInvoice({
      customerId: customer.id,
      immediatePayment: {
        paymentMethod: 'Cash',
        amount: 700000
      },
      items: [
        {
          itemType: 'part',
          referenceId: item.id,
          description: item.name,
          quantity: 2,
          unitPriceAmount: 350000
        }
      ]
    })

    // 4. Record operational expense: Utilities = Rs. 1,500
    const categories = financeService.listCategories()
    const utilCat = categories.find((c) => c.name.includes('Utilities'))!
    financeService.createExpense({
      categoryId: utilCat.id,
      amount: 150000, // Rs. 1,500.00
      paymentMethod: 'Cash',
      paidTo: 'Electricity Board',
      expenseDate: new Date().toISOString().split('T')[0]
    })

    const today = new Date().toISOString().split('T')[0]

    // 5. Query Financial Summary
    const summary = analyticsService.getFinancialSummary(today, today)
    expect(summary.totalRevenue).toBe(700000) // Rs. 7,000
    expect(summary.partsRevenue).toBe(700000)
    expect(summary.partsCogs).toBe(400000)    // 2 * Rs. 2,000 = Rs. 4,000
    expect(summary.grossProfit).toBe(300000)  // 7,000 - 4,000 = Rs. 3,000
    expect(summary.totalExpenses).toBe(150000) // Rs. 1,500
    expect(summary.netProfit).toBe(150000)    // 3,000 - 1,500 = Rs. 1,500
    expect(summary.grossMarginPercent).toBeCloseTo(42.86, 1)

    // 6. Query Cash Flow Summary
    const cashFlow = financeService.getCashFlowSummary(today, today)
    expect(cashFlow.totalInflows).toBe(700000)  // POS sale paid Rs. 7,000 cash
    expect(cashFlow.totalOutflows).toBe(150000) // Rs. 1,500 cash expense
    expect(cashFlow.netCashFlow).toBe(550000)   // Rs. 5,500
    expect(cashFlow.cashRegisterClosingBalance).toBe(550000)
  })

  it('respects granular settings toggles to disable features and cogs', () => {
    // Disable expense tracking
    settingsRepo.set('finance', 'finance_enable_expenses', false, 'boolean')

    const categories = financeService.listCategories()
    expect(() => {
      financeService.createExpense({
        categoryId: categories[0].id,
        amount: 50000
      })
    }).toThrow(/Expense tracking is currently disabled/)

    // Re-enable expenses, disable cash register
    settingsRepo.set('finance', 'finance_enable_expenses', true, 'boolean')
    settingsRepo.set('finance', 'finance_enable_cash_register', false, 'boolean')

    const today = new Date().toISOString().split('T')[0]
    expect(() => {
      financeService.getCashFlowSummary(today, today)
    }).toThrow(/Cash register reconciliation is currently disabled/)

    // Disable BI turnaround metrics
    settingsRepo.set('bi', 'bi_enable_turnaround_metrics', false, 'boolean')
    expect(() => {
      analyticsService.getWorkshopTurnaroundMetrics()
    }).toThrow(/turnaround metrics tracking is disabled/)
  })

  it('executes all 5 BI reports queries seamlessly without column or schema errors', () => {
    // Enable all BI metrics
    settingsRepo.set('bi', 'bi_enable_turnaround_metrics', true, 'boolean')
    settingsRepo.set('bi', 'bi_enable_technician_metrics', true, 'boolean')
    settingsRepo.set('bi', 'bi_enable_inventory_analytics', true, 'boolean')
    settingsRepo.set('bi', 'bi_enable_customer_analytics', true, 'boolean')

    const today = new Date().toISOString().split('T')[0]

    // 1. Financial summary
    const fin = analyticsService.getFinancialSummary(today, today)
    expect(fin).toBeDefined()
    expect(fin.totalRevenue).toBeDefined()

    // 2. Workshop turnaround metrics
    const ws = analyticsService.getWorkshopTurnaroundMetrics(today, today)
    expect(ws).toBeDefined()
    expect(ws.servicePopularity).toBeDefined()

    // 3. Technician productivity leaderboard
    const tech = analyticsService.getTechnicianMetrics(today, today)
    expect(Array.isArray(tech)).toBe(true)

    // 4. Inventory velocity & dead stock
    const inv = analyticsService.getInventoryTurnoverMetrics()
    expect(inv).toBeDefined()
    expect(Array.isArray(inv.deadStockItems)).toBe(true)
    expect(Array.isArray(inv.topSellingParts)).toBe(true)

    // 5. Customer retention & LTV
    const cust = analyticsService.getCustomerLtvMetrics()
    expect(cust).toBeDefined()
    expect(Array.isArray(cust.topCustomers)).toBe(true)
  })
})
