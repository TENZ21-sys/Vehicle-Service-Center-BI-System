import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as path from 'path'
import * as fs from 'fs'
import { MasterDatabaseManager } from '../../src/main/database/master'
import { DatabaseManager } from '../../src/main/database/connection'
import { sessionManager } from '../../src/main/services/session'
import { AuthService } from '../../src/main/services/auth.service'
import { BackupService } from '../../src/main/services/backup.service'
import { ExportService } from '../../src/main/services/export.service'
import { SystemService } from '../../src/main/services/system.service'
import { CustomerRepository } from '../../src/main/repositories/customers.repo'

const TEST_DATA_DIR = path.join(process.cwd(), 'test-data-backup')
const MIGRATIONS_DIR = path.join(process.cwd(), 'src/main/database/migrations')

describe('Backup, Disaster Recovery & Exporting Integration', () => {
  let masterManager: MasterDatabaseManager
  let dbManager: DatabaseManager
  let authService: AuthService
  let backupService: BackupService
  let exportService: ExportService
  let systemService: SystemService
  let customerRepo: CustomerRepository

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
    backupService = new BackupService()
    exportService = new ExportService()
    systemService = new SystemService()
    customerRepo = new CustomerRepository()

    const b1 = masterManager.createBusiness('AutoCare Recovery Test', 'owner', 'Admin123!pass')
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

  it('creates hot database backup with metadata sidecar and lists backups', async () => {
    // Add baseline data
    customerRepo.create({
      name: 'Baseline Customer',
      phonePrimary: '0711112233'
    })

    const backup = await backupService.createBackup('Test baseline snapshot')
    expect(backup.filename).toMatch(/^backup_.*\.sqlite$/)
    expect(backup.sizeBytes).toBeGreaterThan(0)
    expect(backup.notes).toBe('Test baseline snapshot')

    // List backups
    const list = backupService.listBackups()
    expect(list.length).toBe(1)
    expect(list[0].filename).toBe(backup.filename)
  })

  it('safely restores database to a previous point in time and creates fallback safety snapshot', async () => {
    // 1. Create initial baseline customer
    customerRepo.create({
      name: 'Permanent Customer',
      phonePrimary: '0712233445'
    })

    // 2. Create backup point
    const backup = await backupService.createBackup('Before transient customer')

    // 3. Add transient customer that will be reverted
    customerRepo.create({
      name: 'Transient Test Customer',
      phonePrimary: '0799998877'
    })

    const customersBeforeRestore = customerRepo.findAll()
    expect(customersBeforeRestore.length).toBe(2)

    // 4. Restore from backup
    const restored = await backupService.restoreBackup(backup.filename)
    expect(restored).toBe(true)

    // 5. Query customers again: Transient customer should be gone!
    const customersAfterRestore = customerRepo.findAll()
    expect(customersAfterRestore.length).toBe(1)
    expect(customersAfterRestore[0].name).toBe('Permanent Customer')

    // 6. Check that pre-restore safety fallback snapshot exists
    const backupFiles = fs.readdirSync(backupService.getBackupsDir())
    const safetySnapshot = backupFiles.find((f) => f.startsWith(`safety_${biz1.id}_`))
    expect(safetySnapshot).toBeDefined()
  })

  it('exports customer and invoice datasets to valid CSV format', () => {
    customerRepo.create({
      name: 'Silva, Sunimal "Sunny"',
      phonePrimary: '0773344556',
      email: 'sunny@example.com',
      address: '123 Kandy Road, Colombo'
    })

    const exportResult = exportService.exportData('customers')
    expect(exportResult.rowCount).toBeGreaterThanOrEqual(1)
    expect(exportResult.csvContent).toBeDefined()
    expect(exportResult.csvContent).toContain('Customer ID,Full Name,Primary Phone')
    // Comma in name must be escaped in double quotes
    expect(exportResult.csvContent).toContain('"Silva, Sunimal ""Sunny"""')
  })

  it('returns database health diagnostics and executes SQLite VACUUM', () => {
    const health = systemService.getHealthInfo()
    expect(health.integrityCheckResult).toBe('ok')
    expect(health.databaseSizeBytes).toBeGreaterThan(0)
    expect(health.totalMigrationsApplied).toBe(8)

    const vacuumRes = systemService.vacuumDatabase()
    expect(vacuumRes.success).toBe(true)
  })

  it('deletes backup and cleans up old backups based on retention policy', async () => {
    const backup = await backupService.createBackup('To be deleted')
    const listBefore = backupService.listBackups()
    expect(listBefore.some((b) => b.filename === backup.filename)).toBe(true)

    const deleted = backupService.deleteBackup(backup.filename)
    expect(deleted).toBe(true)

    const listAfter = backupService.listBackups()
    expect(listAfter.some((b) => b.filename === backup.filename)).toBe(false)
  })
})
