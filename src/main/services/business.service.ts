import * as path from 'path'
import * as fs from 'fs'
import { BusinessRepository } from '../repositories/business.repo'
import { SettingsRepository } from '../repositories/settings.repo'
import { BusinessRecord, MasterDatabaseManager } from '../database/master'
import { DatabaseManager } from '../database/connection'
import { MigrationRunner } from '../database/migrate'
import { createBusinessSchema } from '@shared/validation/setting.schema'
import { ValidationError, AuthError } from '../utils/errors'
import { logger } from '../utils/logger'

export class BusinessService {
  private repo: BusinessRepository

  constructor(repo?: BusinessRepository) {
    this.repo = repo || new BusinessRepository()
  }

  public listBusinesses(): BusinessRecord[] {
    return this.repo.findAll()
  }

  public getBusiness(id: string): BusinessRecord {
    return this.repo.findById(id)
  }

  public createBusiness(input: unknown): BusinessRecord & { emergencyRecoveryKey?: string } {
    const parse = createBusinessSchema.safeParse(input)
    if (!parse.success) {
      throw new ValidationError(
        parse.error.issues[0]?.message || 'Invalid business creation parameters',
        parse.error.issues
      )
    }

    const { name, ownerUsername, ownerPassword, ownerDisplayName } = parse.data
    logger.info(`Creating business "${name}" with owner user "${ownerUsername}"`)
    const biz = this.repo.create(name, ownerUsername, ownerPassword, ownerDisplayName)

    // Generate and store initial Emergency Recovery Key for owner
    const dbManager = DatabaseManager.getInstance()
    const rawKey = this.generateEmergencyKey(name)
    const keyHash = this.hashKey(rawKey)

    const settingsRepo = new SettingsRepository(dbManager)
    settingsRepo.set('system', 'emergency_recovery_key_hash', keyHash, 'string')

    return {
      ...biz,
      emergencyRecoveryKey: rawKey
    }
  }

  public selectBusiness(id: string): BusinessRecord {
    const biz = this.repo.findById(id)
    const dbManager = DatabaseManager.getInstance()
    const targetPath = path.join(dbManager.getDatabasesDir(), biz.db_filename)

    // Self-Healing / Migration from seed folder if target file is missing or empty stub (<= 4096 bytes)
    const seedCandidates = [
      (process as any).resourcesPath ? path.join((process as any).resourcesPath, 'initial_data', biz.db_filename) : null,
      path.join(process.cwd(), 'data', 'databases', biz.db_filename)
    ].filter(Boolean) as string[]

    if (!fs.existsSync(targetPath) || fs.statSync(targetPath).size <= 4096) {
      for (const src of seedCandidates) {
        if (fs.existsSync(src) && fs.statSync(src).size > 4096) {
          logger.info(`Self-healing: Migrating populated database from ${src} to ${targetPath}`)
          try {
            fs.copyFileSync(src, targetPath)
            const wal = `${src}-wal`
            if (fs.existsSync(wal)) {
              fs.copyFileSync(wal, `${targetPath}-wal`)
            }
            break
          } catch (e) {
            logger.warn('Failed to copy seed database file:', e)
          }
        }
      }
    }

    const db = dbManager.openBusinessDatabase(biz.id, biz.db_filename)

    // Run pending migrations to guarantee schema integrity
    const migrationsDir = MasterDatabaseManager.getInstance().getMigrationsDir()
    if (fs.existsSync(migrationsDir)) {
      const migrator = new MigrationRunner(migrationsDir)
      migrator.runPendingMigrations(db)
    }

    // Auto-repair check: Ensure at least one owner user exists in the business DB
    try {
      const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number })?.count || 0
      if (userCount === 0) {
        logger.warn(`Business "${biz.name}" had 0 users. Auto-repairing with default Owner account...`)
        const ownerRoleId = (db.prepare('SELECT id FROM roles WHERE is_owner = 1').get() as { id: string })?.id
        if (ownerRoleId) {
          const { v4: uuidv4 } = require('uuid')
          const bcrypt = require('bcryptjs')
          const userId = uuidv4()
          const now = new Date().toISOString()
          const passwordHash = bcrypt.hashSync('admin123', 10)
          db.prepare(`
            INSERT INTO users (id, username, password_hash, display_name, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, 1, ?, ?)
          `).run(userId, 'admin', passwordHash, 'Owner Admin', now, now)
          db.prepare(`
            INSERT INTO user_roles (user_id, role_id, assigned_at)
            VALUES (?, ?, ?)
          `).run(userId, ownerRoleId, now)
          logger.info(`Auto-repaired business "${biz.name}": created default Owner user "admin"`)
        }
      }
    } catch (repairErr) {
      logger.warn('Failed during auto-repair check:', repairErr)
    }

    logger.info(`Selected business: "${biz.name}" (${biz.id}) with verified schema`)
    return biz
  }

  public deleteBusiness(id: string, ownerPassword?: string): void {
    if (!ownerPassword || !ownerPassword.trim()) {
      throw new ValidationError('Owner password is required to delete this account for security and data safety.')
    }

    const biz = this.repo.findById(id)
    const dbManager = DatabaseManager.getInstance()
    const targetPath = path.join(dbManager.getDatabasesDir(), biz.db_filename)

    // Verify owner credentials against target business database
    if (fs.existsSync(targetPath)) {
      const Database = require('better-sqlite3')
      const bcrypt = require('bcryptjs')
      const crypto = require('crypto')

      let db
      try {
        db = new Database(targetPath)
        const ownerRow = db.prepare(`
          SELECT u.password_hash 
          FROM users u
          JOIN user_roles ur ON u.id = ur.user_id
          JOIN roles r ON ur.role_id = r.id
          WHERE r.is_owner = 1 AND u.is_active = 1
          LIMIT 1
        `).get() as { password_hash: string } | undefined

        const emergencyKeyRow = db.prepare(`
          SELECT value FROM settings WHERE category = 'system' AND key = 'emergency_recovery_key_hash'
        `).get() as { value: string } | undefined

        let authorized = false

        if (ownerRow && ownerRow.password_hash) {
          authorized = bcrypt.compareSync(ownerPassword.trim(), ownerRow.password_hash)
        }

        if (!authorized && emergencyKeyRow && emergencyKeyRow.value) {
          try {
            const rawHash = JSON.parse(emergencyKeyRow.value)
            const providedHash = crypto.createHash('sha256').update(ownerPassword.trim()).digest('hex')
            if (rawHash && rawHash === providedHash) {
              authorized = true
            }
          } catch {}
        }

        if (!authorized) {
          throw new AuthError('Incorrect owner password. Account deletion denied for data safety.', 'INVALID_CREDENTIALS')
        }
      } finally {
        if (db) {
          try { db.close() } catch {}
        }
      }
    }

    if (dbManager.getActiveBusinessId() === id) {
      dbManager.closeActiveDatabase()
    }

    // Remove DB file and WAL files
    try {
      if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath)
      if (fs.existsSync(`${targetPath}-wal`)) fs.unlinkSync(`${targetPath}-wal`)
      if (fs.existsSync(`${targetPath}-shm`)) fs.unlinkSync(`${targetPath}-shm`)
    } catch (e) {
      logger.warn(`Could not delete physical database file ${targetPath}:`, e)
    }

    this.repo.delete(id)
    logger.info(`Permanently deleted business "${biz.name}" (ID: ${id}) after password authorization`)
  }

  public generateEmergencyKey(businessName: string): string {
    const prefix = businessName.replace(/[^A-Za-z0-9]/g, '').substring(0, 4).toUpperCase() || 'RESC'
    const crypto = require('crypto')
    const seg1 = crypto.randomBytes(3).toString('hex').toUpperCase()
    const seg2 = crypto.randomBytes(3).toString('hex').toUpperCase()
    const seg3 = crypto.randomBytes(3).toString('hex').toUpperCase()
    const seg4 = crypto.randomBytes(3).toString('hex').toUpperCase()
    return `${prefix}-${seg1}-${seg2}-${seg3}-${seg4}`
  }

  public hashKey(key: string): string {
    const crypto = require('crypto')
    return crypto.createHash('sha256').update(key.trim()).digest('hex')
  }
}
