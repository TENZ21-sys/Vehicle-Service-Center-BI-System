import * as path from 'path'
import * as fs from 'fs'
import Database from 'better-sqlite3'
import { DatabaseManager } from '../database/connection'
import { MasterDatabaseManager } from '../database/master'
import { MigrationRunner } from '../database/migrate'
import { PermissionService } from './permissions.service'
import { AuditService } from './audit.service'
import { SettingsRepository } from '../repositories/settings.repo'
import { sessionManager } from './session'
import { BackupMetadata } from '../../shared/types/backup.types'
import { ValidationError, NotFoundError, AppError } from '../utils/errors'
import { logger } from '../utils/logger'

export class BackupService {
  private dbManager: DatabaseManager
  private masterManager: MasterDatabaseManager
  private permService: PermissionService
  private audit: AuditService
  private settingsRepo: SettingsRepository
  private backupsDir: string

  constructor(
    dbManager = DatabaseManager.getInstance(),
    masterManager = MasterDatabaseManager.getInstance(),
    permService = new PermissionService(),
    audit = new AuditService(),
    settingsRepo = new SettingsRepository()
  ) {
    this.dbManager = dbManager
    this.masterManager = masterManager
    this.permService = permService
    this.audit = audit
    this.settingsRepo = settingsRepo

    const baseDir = path.dirname(this.dbManager.getDatabasesDir())
    this.backupsDir = path.join(baseDir, 'backups')
    if (!fs.existsSync(this.backupsDir)) {
      fs.mkdirSync(this.backupsDir, { recursive: true })
    }
  }

  public getBackupsDir(): string {
    return this.backupsDir
  }

  /**
   * Creates an online hot backup using SQLite Backup API.
   */
  public async createBackup(notes?: string): Promise<BackupMetadata> {
    this.permService.requirePermission('backup:create')
    const session = sessionManager.requireSession()
    const db = this.dbManager.getActiveDb()
    const bizId = this.dbManager.getActiveBusinessId() || session.businessId

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const filename = `backup_${bizId}_${timestamp}.sqlite`
    const destPath = path.join(this.backupsDir, filename)

    logger.info(`Starting hot backup to: ${destPath}`)
    await db.backup(destPath)

    const stats = fs.statSync(destPath)

    // Read schema version from the backup
    let schemaVersion = 1
    try {
      const verRow = db.prepare('SELECT MAX(version) as ver FROM migrations').get() as any
      if (verRow && verRow.ver) schemaVersion = verRow.ver
    } catch {
      // ignore
    }

    // Save metadata sidecar JSON
    const metadata: BackupMetadata = {
      id: filename,
      filename,
      businessId: bizId,
      sizeBytes: stats.size,
      createdAt: new Date().toISOString(),
      notes: notes || null,
      schemaVersion
    }

    const metaPath = path.join(this.backupsDir, `${filename}.json`)
    fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), 'utf8')

    this.audit.record({
      userId: session.userId,
      action: 'BACKUP_CREATED',
      entityType: 'backup',
      entityId: filename,
      metadata: { filename, sizeBytes: stats.size, notes }
    })

    return metadata
  }

  /**
   * Lists all existing backups for the active business.
   */
  public listBackups(): BackupMetadata[] {
    this.permService.requirePermission('backup:create')
    const session = sessionManager.requireSession()
    const bizId = this.dbManager.getActiveBusinessId() || session.businessId

    if (!fs.existsSync(this.backupsDir)) return []

    const files = fs.readdirSync(this.backupsDir)
    const backups: BackupMetadata[] = []

    for (const file of files) {
      if (file.endsWith('.sqlite') && file.includes(`backup_${bizId}_`)) {
        const fullPath = path.join(this.backupsDir, file)
        const metaPath = path.join(this.backupsDir, `${file}.json`)
        let meta: BackupMetadata

        if (fs.existsSync(metaPath)) {
          try {
            meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'))
          } catch {
            const stats = fs.statSync(fullPath)
            meta = {
              id: file,
              filename: file,
              businessId: bizId,
              sizeBytes: stats.size,
              createdAt: stats.birthtime.toISOString(),
              schemaVersion: 1
            }
          }
        } else {
          const stats = fs.statSync(fullPath)
          meta = {
            id: file,
            filename: file,
            businessId: bizId,
            sizeBytes: stats.size,
            createdAt: stats.birthtime.toISOString(),
            schemaVersion: 1
          }
        }
        backups.push(meta)
      }
    }

    return backups.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  /**
   * Safely restores a backup with integrity pre-check and fallback safety backup.
   */
  public async restoreBackup(backupFilename: string): Promise<boolean> {
    this.permService.requirePermission('backup:restore')
    const session = sessionManager.requireSession()
    const bizId = this.dbManager.getActiveBusinessId() || session.businessId

    const backupPath = path.join(this.backupsDir, backupFilename)
    if (!fs.existsSync(backupPath)) {
      throw new NotFoundError(`Backup file not found: ${backupFilename}`)
    }

    // 1. Verify backup integrity
    try {
      const checkDb = new Database(backupPath, { readonly: true })
      const quickCheck = checkDb.pragma('quick_check', { simple: true })
      checkDb.close()
      if (quickCheck !== 'ok') {
        throw new ValidationError(`Backup integrity check failed: ${quickCheck}`)
      }
    } catch (err: any) {
      throw new ValidationError(`Invalid backup file: ${err.message}`)
    }

    // 2. Lookup business db filename from master
    const biz = this.masterManager.getBusinessById(bizId)
    if (!biz) {
      throw new NotFoundError(`Business not found: ${bizId}`)
    }

    const currentDbPath = path.join(this.dbManager.getDatabasesDir(), biz.db_filename)

    // 3. Create automatic pre-restore safety fallback
    if (fs.existsSync(currentDbPath)) {
      const safetyTimestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
      const safetyBackupPath = path.join(this.backupsDir, `safety_${bizId}_${safetyTimestamp}.sqlite`)
      try {
        const activeDb = this.dbManager.getActiveDb()
        await activeDb.backup(safetyBackupPath)
      } catch (err) {
        logger.warn('Could not create safety snapshot via API, proceeding with file copy', err)
      }
    }

    // 4. Close database connection
    this.dbManager.closeActiveDatabase()

    // 5. Replace current DB file with the backup
    fs.copyFileSync(backupPath, currentDbPath)

    // Remove leftover -wal and -shm files so the restored DB starts clean
    const walFile = `${currentDbPath}-wal`
    const shmFile = `${currentDbPath}-shm`
    if (fs.existsSync(walFile)) fs.unlinkSync(walFile)
    if (fs.existsSync(shmFile)) fs.unlinkSync(shmFile)

    // 6. Reopen connection & run any pending migrations
    const reloadedDb = this.dbManager.openBusinessDatabase(bizId, biz.db_filename)
    const migrationsDir = this.masterManager.getMigrationsDir()
    if (fs.existsSync(migrationsDir)) {
      const runner = new MigrationRunner(migrationsDir)
      runner.runPendingMigrations(reloadedDb)
    }

    this.audit.record({
      userId: session.userId,
      action: 'BACKUP_RESTORED',
      entityType: 'backup',
      entityId: backupFilename,
      metadata: { restoredFrom: backupFilename }
    })

    logger.info(`Successfully restored business database from backup: ${backupFilename}`)
    return true
  }

  /**
   * Deletes a specific backup file and its metadata.
   */
  public deleteBackup(backupFilename: string): boolean {
    this.permService.requirePermission('backup:create')
    const session = sessionManager.requireSession()

    const backupPath = path.join(this.backupsDir, backupFilename)
    const metaPath = path.join(this.backupsDir, `${backupFilename}.json`)

    if (!fs.existsSync(backupPath)) {
      throw new NotFoundError(`Backup file not found: ${backupFilename}`)
    }

    fs.unlinkSync(backupPath)
    if (fs.existsSync(metaPath)) {
      fs.unlinkSync(metaPath)
    }

    this.audit.record({
      userId: session.userId,
      action: 'BACKUP_DELETED',
      entityType: 'backup',
      entityId: backupFilename
    })

    return true
  }

  /**
   * Prunes backups older than the retention threshold (in days).
   */
  public cleanupOldBackups(retentionDays?: number): number {
    const days = retentionDays || 30
    const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000

    if (!fs.existsSync(this.backupsDir)) return 0

    let prunedCount = 0
    const files = fs.readdirSync(this.backupsDir)

    for (const file of files) {
      if (file.endsWith('.sqlite')) {
        const fullPath = path.join(this.backupsDir, file)
        const stats = fs.statSync(fullPath)
        if (stats.mtimeMs < cutoffTime) {
          try {
            fs.unlinkSync(fullPath)
            const metaPath = path.join(this.backupsDir, `${file}.json`)
            if (fs.existsSync(metaPath)) fs.unlinkSync(metaPath)
            prunedCount++
          } catch (err) {
            logger.warn(`Failed to prune old backup ${file}:`, err)
          }
        }
      }
    }

    return prunedCount
  }
}
