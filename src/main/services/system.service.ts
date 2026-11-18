import * as path from 'path'
import * as fs from 'fs'
import { DatabaseManager } from '../database/connection'
import { MasterDatabaseManager } from '../database/master'
import { PermissionService } from './permissions.service'
import { AuditService } from './audit.service'
import { sessionManager } from './session'
import { SystemHealthInfo } from '../../shared/types/backup.types'
import { logger } from '../utils/logger'

export class SystemService {
  private dbManager: DatabaseManager
  private masterManager: MasterDatabaseManager
  private permService: PermissionService
  private audit: AuditService

  constructor(
    dbManager = DatabaseManager.getInstance(),
    masterManager = MasterDatabaseManager.getInstance(),
    permService = new PermissionService(),
    audit = new AuditService()
  ) {
    this.dbManager = dbManager
    this.masterManager = masterManager
    this.permService = permService
    this.audit = audit
  }

  public getHealthInfo(): SystemHealthInfo {
    this.permService.requirePermission('settings:view')
    const session = sessionManager.requireSession()
    const db = this.dbManager.getActiveDb()
    const bizId = this.dbManager.getActiveBusinessId() || session.businessId

    const biz = this.masterManager.getBusinessById(bizId)
    const dbFilename = biz?.db_filename || `biz_${bizId}.db`
    const dbPath = path.join(this.dbManager.getDatabasesDir(), dbFilename)
    const walPath = `${dbPath}-wal`

    let dbSize = 0
    let walSize = 0

    if (fs.existsSync(dbPath)) {
      dbSize = fs.statSync(dbPath).size
    }
    if (fs.existsSync(walPath)) {
      walSize = fs.statSync(walPath).size
    }

    // Run PRAGMA integrity_check
    const integrityRow = db.pragma('integrity_check', { simple: true }) as string
    const sqliteVerRow = db.pragma('sqlite_version', { simple: true }) as string

    // Migration count
    let migrationCount = 0
    try {
      const countRow = db.prepare('SELECT COUNT(*) as count FROM migrations').get() as any
      if (countRow) migrationCount = countRow.count
    } catch {
      // ignore
    }

    return {
      databaseSizeBytes: dbSize,
      walSizeBytes: walSize,
      integrityCheckResult: integrityRow,
      activeBusinessId: bizId,
      businessName: session.businessName,
      sqliteVersion: sqliteVerRow,
      totalMigrationsApplied: migrationCount
    }
  }

  public vacuumDatabase(): { success: boolean; freedBytes: number } {
    this.permService.requirePermission('settings:edit')
    const session = sessionManager.requireSession()
    const db = this.dbManager.getActiveDb()
    const bizId = this.dbManager.getActiveBusinessId() || session.businessId

    const biz = this.masterManager.getBusinessById(bizId)
    const dbFilename = biz?.db_filename || `biz_${bizId}.db`
    const dbPath = path.join(this.dbManager.getDatabasesDir(), dbFilename)

    const sizeBefore = fs.existsSync(dbPath) ? fs.statSync(dbPath).size : 0

    logger.info(`Running SQLite VACUUM optimization for business: ${bizId}`)
    db.exec('VACUUM;')

    const sizeAfter = fs.existsSync(dbPath) ? fs.statSync(dbPath).size : 0
    const freedBytes = Math.max(0, sizeBefore - sizeAfter)

    this.audit.record({
      userId: session.userId,
      action: 'DATABASE_OPTIMIZED',
      entityType: 'database',
      entityId: bizId,
      metadata: { freedBytes, sizeBefore, sizeAfter }
    })

    return {
      success: true,
      freedBytes
    }
  }
}
