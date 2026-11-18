import Database from 'better-sqlite3'
import * as path from 'path'
import * as fs from 'fs'
import { v4 as uuidv4 } from 'uuid'
import { ConflictError, NotFoundError } from '../utils/errors'
import { logger } from '../utils/logger'
import { MigrationRunner } from './migrate'
import { DatabaseManager } from './connection'
import bcrypt from 'bcryptjs'

export interface BusinessRecord {
  id: string
  name: string
  db_filename: string
  created_at: string
  is_active: number
}

export class MasterDatabaseManager {
  private static instance: MasterDatabaseManager | null = null
  private db: Database.Database
  private databasesDir: string
  private migrationsDir: string

  private constructor(appDataDir?: string, migrationsDir?: string) {
    const baseDir = appDataDir || path.join(process.cwd(), 'data')
    this.databasesDir = path.join(baseDir, 'databases')
    this.migrationsDir = migrationsDir || path.join(__dirname, 'migrations')

    if (!fs.existsSync(this.databasesDir)) {
      fs.mkdirSync(this.databasesDir, { recursive: true })
    }

    const masterDbPath = path.join(this.databasesDir, 'master.db')

    // Seed master registry on fresh install/standalone run if not present
    if (!fs.existsSync(masterDbPath) || fs.statSync(masterDbPath).size <= 4096) {
      const candidates = [
        path.join(process.cwd(), 'data', 'databases', 'master.db'),
        (process as any).resourcesPath ? path.join((process as any).resourcesPath, 'initial_data', 'master.db') : null
      ].filter(Boolean) as string[]

      for (const cand of candidates) {
        if (fs.existsSync(cand) && fs.statSync(cand).size > 4096) {
          try {
            fs.copyFileSync(cand, masterDbPath)
            break
          } catch {
            // ignore
          }
        }
      }
    }

    this.db = new Database(masterDbPath)
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('foreign_keys = ON')

    this.initMasterSchema()
  }

  public static getInstance(appDataDir?: string, migrationsDir?: string): MasterDatabaseManager {
    if (!MasterDatabaseManager.instance) {
      MasterDatabaseManager.instance = new MasterDatabaseManager(appDataDir, migrationsDir)
    }
    return MasterDatabaseManager.instance
  }

  public static resetInstanceForTesting(): void {
    if (MasterDatabaseManager.instance) {
      MasterDatabaseManager.instance.close()
      MasterDatabaseManager.instance = null
    }
  }

  public getMigrationsDir(): string {
    return this.migrationsDir
  }

  public close(): void {
    try {
      this.db.close()
    } catch {
      // ignore
    }
  }

  private initMasterSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS businesses (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        db_filename TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1
      );

      CREATE INDEX IF NOT EXISTS idx_businesses_name ON businesses(name);
      CREATE INDEX IF NOT EXISTS idx_businesses_active ON businesses(is_active);
    `)
  }

  public listBusinesses(): BusinessRecord[] {
    const stmt = this.db.prepare('SELECT * FROM businesses WHERE is_active = 1 ORDER BY name ASC')
    return stmt.all() as BusinessRecord[]
  }

  public getBusinessById(id: string): BusinessRecord {
    const stmt = this.db.prepare('SELECT * FROM businesses WHERE id = ? AND is_active = 1')
    const row = stmt.get(id) as BusinessRecord | undefined
    if (!row) {
      throw new NotFoundError('Business', id)
    }
    return row
  }

  /**
   * Creates a new business:
   * 1. Checks name uniqueness.
   * 2. Inserts record into master.db.
   * 3. Provisions new SQLite database file for the business.
   * 4. Runs initial migrations and seeds default data.
   * 5. Creates the default owner user.
   */
  public createBusiness(
    name: string,
    ownerUsername?: string,
    ownerPassword?: string,
    ownerDisplayName?: string
  ): BusinessRecord {
    const existing = this.db.prepare('SELECT id FROM businesses WHERE name = ? AND is_active = 1').get(name)
    if (existing) {
      throw new ConflictError(`A business with the name "${name}" already exists.`)
    }

    const businessId = uuidv4()
    const dbFilename = `biz_${businessId}.db`
    const now = new Date().toISOString()

    // 1. Record in master.db
    const insertStmt = this.db.prepare(
      'INSERT INTO businesses (id, name, db_filename, created_at, is_active) VALUES (?, ?, ?, ?, 1)'
    )
    insertStmt.run(businessId, name, dbFilename, now)

    // 2. Open new database & run migrations
    const dbManager = DatabaseManager.getInstance()
    const newDb = dbManager.openBusinessDatabase(businessId, dbFilename)
    const migrator = new MigrationRunner(this.migrationsDir)
    migrator.runPendingMigrations(newDb)

    // 3. Update business name setting
    const updateSettingStmt = newDb.prepare(
      "UPDATE settings SET value = ? WHERE category = 'business_profile' AND key = 'business_name'"
    )
    updateSettingStmt.run(JSON.stringify(name))

    // 4. Create initial Owner user if credentials provided
    if (ownerUsername && ownerPassword) {
      const ownerRoleId = (newDb.prepare("SELECT id FROM roles WHERE is_owner = 1").get() as { id: string })?.id
      if (ownerRoleId) {
        const userId = uuidv4()
        const passwordHash = bcrypt.hashSync(ownerPassword, 10)
        const insertUser = newDb.prepare(`
          INSERT INTO users (id, username, password_hash, display_name, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, 1, ?, ?)
        `)
        insertUser.run(userId, ownerUsername, passwordHash, ownerDisplayName || ownerUsername, now, now)

        const linkRole = newDb.prepare(`
          INSERT INTO user_roles (user_id, role_id, assigned_at)
          VALUES (?, ?, ?)
        `)
        linkRole.run(userId, ownerRoleId, now)
      }
    }

    logger.info(`Successfully created and provisioned new business "${name}" (ID: ${businessId})`)
    return {
      id: businessId,
      name,
      db_filename: dbFilename,
      created_at: now,
      is_active: 1
    }
  }

  public deactivateBusiness(id: string): void {
    const biz = this.getBusinessById(id)
    this.db.prepare('UPDATE businesses SET is_active = 0 WHERE id = ?').run(biz.id)
    logger.info(`Deactivated business "${biz.name}" (ID: ${id})`)
  }

  public deleteBusiness(id: string): void {
    const biz = this.getBusinessById(id)
    this.db.prepare('DELETE FROM businesses WHERE id = ?').run(biz.id)
    logger.info(`Permanently deleted business "${biz.name}" (ID: ${id}) from master registry`)
  }
}
