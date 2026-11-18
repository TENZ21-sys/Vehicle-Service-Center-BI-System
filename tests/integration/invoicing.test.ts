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
import { CatalogueService } from '../../src/main/services/catalogue.service'
import { JobCardService } from '../../src/main/services/job-cards.service'
import { InvoicesService } from '../../src/main/services/invoices.service'
import { PaymentsService } from '../../src/main/services/payments.service'

const TEST_DATA_DIR = path.join(process.cwd(), 'test-data-invoicing')
const MIGRATIONS_DIR = path.join(process.cwd(), 'src/main/database/migrations')

describe('Invoicing, Payments & POS Integration', () => {
  let masterManager: MasterDatabaseManager
  let dbManager: DatabaseManager
  let authService: AuthService
  let customerService: CustomerService
  let vehicleService: VehicleService
  let inventoryService: InventoryService
  let catalogueService: CatalogueService
  let jobCardService: JobCardService
  let invoicesService: InvoicesService
  let paymentsService: PaymentsService

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
    inventoryService = new InventoryService()
    catalogueService = new CatalogueService()
    jobCardService = new JobCardService()
    invoicesService = new InvoicesService()
    paymentsService = new PaymentsService()

    const b1 = masterManager.createBusiness('AutoCare Billing', 'owner', 'Admin123!pass')
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

  it('generates an invoice from a workshop job card and prevents double invoicing', async () => {
    dbManager.openBusinessDatabase(biz1.id, biz1.db_filename)
    await authService.login({ username: 'owner', password: 'Admin123!pass' })

    // 1. Create customer, vehicle, inventory item, service
    const customer = customerService.createCustomer({
      name: 'Michael Knight',
      phonePrimary: '0771234567'
    })

    const vehicle = vehicleService.createVehicle({
      customerId: customer.id,
      registrationNo: 'KITT-2000',
      make: 'Pontiac',
      model: 'Firebird'
    })

    const service = catalogueService.createService({
      name: 'Full Synthetic Oil Change',
      basePriceAmount: 750000, // 7,500.00
      laborChargeAmount: 0
    })

    const part = inventoryService.createItem({
      name: 'Mobil1 5W-30 4L',
      sellingPriceAmount: 1200000, // 12,000.00
      costPriceAmount: 900000,
      reorderLevel: 2
    })

    // Intake stock
    inventoryService.adjustStock({
      itemId: part.id,
      movementType: 'adjustment_in',
      quantity: 10,
      reason: 'Opening stock'
    })

    // 2. Create job card and allocate service & part
    const jobCard = jobCardService.createJobCard({
      customerId: customer.id,
      vehicleId: vehicle.id
    })

    jobCardService.addService(jobCard.id, {
      serviceId: service.id,
      serviceName: 'Full Synthetic Oil Change',
      priceAmount: 750000,
      laborAmount: 250000 // 2,500.00 labor
    }) // Total service = 10,000.00 (1000000)

    jobCardService.addPart(jobCard.id, {
      inventoryItemId: part.id,
      quantity: 1,
      unitPriceAmount: 1200000
    }) // Total part = 12,000.00 (1200000)

    // 3. Generate invoice with 10% tax (1000 basis points)
    const invoice = invoicesService.createFromJobCard({
      jobCardId: jobCard.id,
      taxRate: 1000, // 10.00%
      discountAmount: 200000 // 2,000.00 discount
    })

    expect(invoice.invoiceNumber).toMatch(/^INV-\d{4}-\d{4}$/)
    expect(invoice.invoiceType).toBe('job_card')
    expect(invoice.status).toBe('Unpaid')
    expect(invoice.subtotalAmount).toBe(2200000) // 10,000 + 12,000
    // Tax: 10% of 10,000 (1,000) + 10% of 12,000 (1,200) = 2,200 (220000)
    expect(invoice.taxAmount).toBe(220000)
    expect(invoice.discountAmount).toBe(200000)
    // Total = 22,000 + 2,200 - 2,000 = 22,200 (2220000)
    expect(invoice.totalAmount).toBe(2220000)
    expect(invoice.dueAmount).toBe(2220000)
    expect(invoice.paidAmount).toBe(0)
    expect(invoice.items.length).toBe(2)

    // Verify job card has invoice_id populated
    const updatedJc = jobCardService.getJobCardById(jobCard.id)
    expect(updatedJc?.invoiceId).toBe(invoice.id)

    // 4. Attempting to invoice again must fail
    expect(() => {
      invoicesService.createFromJobCard({ jobCardId: jobCard.id })
    }).toThrow(/already invoiced/i)
  })

  it('records partial and full payments and prevents overpayment or paying a closed invoice', async () => {
    dbManager.openBusinessDatabase(biz1.id, biz1.db_filename)
    await authService.login({ username: 'owner', password: 'Admin123!pass' })

    const customer = customerService.createCustomer({
      name: 'Sarah Connor',
      phonePrimary: '0772223344'
    })

    const part = inventoryService.createItem({
      name: 'Spark Plugs Set',
      costPriceAmount: 300000,
      sellingPriceAmount: 500000,
      reorderLevel: 5
    })

    inventoryService.adjustStock({
      itemId: part.id,
      movementType: 'adjustment_in',
      quantity: 5,
      reason: 'Stock in'
    })

    // Create POS sale for 5,000.00 (500000) with 0 tax
    const invoice = invoicesService.createPosInvoice({
      customerId: customer.id,
      taxRate: 0,
      items: [
        {
          itemType: 'part',
          referenceId: part.id,
          description: 'Spark Plugs Set',
          quantity: 1,
          unitPriceAmount: 500000
        }
      ]
    })

    expect(invoice.status).toBe('Unpaid')
    expect(invoice.dueAmount).toBe(500000)

    // 1. Overpayment attempt should fail
    expect(() => {
      paymentsService.recordPayment({
        invoiceId: invoice.id,
        paymentMethod: 'Cash',
        amount: 600000 // 6,000.00 > 5,000.00
      })
    }).toThrow(/exceeds outstanding balance/i)

    // 2. Record partial payment of 2,000.00
    const p1 = paymentsService.recordPayment({
      invoiceId: invoice.id,
      paymentMethod: 'Cash',
      amount: 200000
    })

    expect(p1.amount).toBe(200000)
    const afterP1 = invoicesService.getById(invoice.id)
    expect(afterP1.status).toBe('Partial')
    expect(afterP1.paidAmount).toBe(200000)
    expect(afterP1.dueAmount).toBe(300000)

    // 3. Record remaining payment of 3,000.00
    const p2 = paymentsService.recordPayment({
      invoiceId: invoice.id,
      paymentMethod: 'Credit Card',
      amount: 300000,
      reference: 'TXN-7766'
    })

    expect(p2.amount).toBe(300000)
    const afterP2 = invoicesService.getById(invoice.id)
    expect(afterP2.status).toBe('Paid')
    expect(afterP2.paidAmount).toBe(500000)
    expect(afterP2.dueAmount).toBe(0)

    // 4. Paying an already paid invoice should fail
    expect(() => {
      paymentsService.recordPayment({
        invoiceId: invoice.id,
        paymentMethod: 'Cash',
        amount: 10000
      })
    }).toThrow(/already fully paid/i)
  })

  it('handles direct POS counter sales with atomic stock deduction and ledger audit', async () => {
    dbManager.openBusinessDatabase(biz1.id, biz1.db_filename)
    await authService.login({ username: 'owner', password: 'Admin123!pass' })

    const customer = customerService.createCustomer({
      name: 'Counter Walk-in',
      phonePrimary: '0770000000'
    })

    const part = inventoryService.createItem({
      name: 'Coolant 1L',
      sellingPriceAmount: 150000,
      costPriceAmount: 100000,
      reorderLevel: 2
    })

    inventoryService.adjustStock({
      itemId: part.id,
      movementType: 'adjustment_in',
      quantity: 8,
      reason: 'Opening coolant stock'
    })

    // Check initial stock
    let item = inventoryService.getItemById(part.id)
    expect(item.currentStock).toBe(8)

    // Direct POS sale for 3 bottles with immediate cash payment
    const invoice = invoicesService.createPosInvoice({
      customerId: customer.id,
      items: [
        {
          itemType: 'part',
          referenceId: part.id,
          description: 'Coolant 1L',
          quantity: 3,
          unitPriceAmount: 150000,
          costPriceAmount: 100000
        }
      ],
      immediatePayment: {
        paymentMethod: 'Cash',
        amount: 450000
      }
    })

    expect(invoice.status).toBe('Paid')
    expect(invoice.paidAmount).toBe(450000)
    expect(invoice.dueAmount).toBe(0)
    expect(invoice.payments.length).toBe(1)

    // Verify stock is strictly deducted in append-only movements ledger
    item = inventoryService.getItemById(part.id)
    expect(item.currentStock).toBe(5)

    const movements = inventoryService.getItemMovements(part.id)
    const posMovement = movements.find((m) => m.movementType === 'pos_sale_out')
    expect(posMovement).toBeDefined()
    expect(posMovement?.quantity).toBe(-3)
    expect(posMovement?.referenceType).toBe('invoice')
    expect(posMovement?.referenceId).toBe(invoice.id)
  })

  it('voids an invoice, emits a linked credit note, and restores POS stock to the ledger', async () => {
    dbManager.openBusinessDatabase(biz1.id, biz1.db_filename)
    await authService.login({ username: 'owner', password: 'Admin123!pass' })

    const customer = customerService.createCustomer({
      name: 'Bruce Wayne',
      phonePrimary: '0779998877'
    })

    const part = inventoryService.createItem({
      name: 'Heavy Duty Battery',
      sellingPriceAmount: 2500000,
      costPriceAmount: 1800000,
      reorderLevel: 1
    })

    inventoryService.adjustStock({
      itemId: part.id,
      movementType: 'adjustment_in',
      quantity: 4,
      reason: 'Battery stock'
    })

    // Sell 2 batteries
    const invoice = invoicesService.createPosInvoice({
      customerId: customer.id,
      items: [
        {
          itemType: 'part',
          referenceId: part.id,
          description: 'Heavy Duty Battery',
          quantity: 2,
          unitPriceAmount: 2500000,
          costPriceAmount: 1800000
        }
      ]
    })

    expect(inventoryService.getItemById(part.id).currentStock).toBe(2)

    // Void the invoice
    const voided = invoicesService.voidInvoice({
      invoiceId: invoice.id,
      voidReason: 'Customer canceled battery upgrade order'
    })

    expect(voided.status).toBe('Void')
    expect(voided.voidReason).toBe('Customer canceled battery upgrade order')
    expect(voided.voidedAt).toBeDefined()

    // Verify stock ledger has restored stock (+2) via void_reversal
    expect(inventoryService.getItemById(part.id).currentStock).toBe(4)

    const movements = inventoryService.getItemMovements(part.id)
    const reversal = movements.find((m) => m.movementType === 'void_reversal')
    expect(reversal).toBeDefined()
    expect(reversal?.quantity).toBe(2)
    expect(reversal?.referenceType).toBe('invoice_void')
    expect(reversal?.referenceId).toBe(invoice.id)

    // Verify linked Credit Note invoice exists
    const allInvoices = invoicesService.listInvoices()
    const creditNote = allInvoices.find((inv) => inv.creditNoteOf === invoice.id)
    expect(creditNote).toBeDefined()
    expect(creditNote?.totalAmount).toBe(-invoice.totalAmount)

    // Cannot record payments against a voided invoice
    expect(() => {
      paymentsService.recordPayment({
        invoiceId: invoice.id,
        paymentMethod: 'Cash',
        amount: 100000
      })
    }).toThrow(/voided invoice/i)

    // Cannot re-void an already voided invoice
    expect(() => {
      invoicesService.voidInvoice({
        invoiceId: invoice.id,
        voidReason: 'Another void attempt'
      })
    }).toThrow(/already voided/i)
  })
})
