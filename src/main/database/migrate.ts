import Database from 'better-sqlite3'
import * as fs from 'fs'
import * as path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { logger } from '../utils/logger'
import { ALL_PERMISSIONS } from '@shared/constants/permissions'
import { DEFAULT_ROLES, DEFAULT_SETTINGS } from '@shared/constants/defaults'

export interface MigrationRecord {
  version: number
  name: string
  applied_at: string
}

export class MigrationRunner {
  private migrationsDir: string

  constructor(migrationsDir?: string) {
    this.migrationsDir =
      migrationsDir || path.join(__dirname, 'migrations')
  }

  /**
   * Applies all pending migrations to the given SQLite database connection.
   */
  public runPendingMigrations(db: Database.Database): void {
    // 1. Ensure migrations table exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL
      );
    `)

    // 2. Fetch applied migration versions
    const appliedRows = db
      .prepare('SELECT version FROM migrations ORDER BY version ASC')
      .all() as { version: number }[]
    const appliedVersions = new Set(appliedRows.map((r) => r.version))

    // 3. Scan migrations folder
    if (!fs.existsSync(this.migrationsDir)) {
      logger.warn(`Migrations directory not found at: ${this.migrationsDir}`)
      return
    }

    const files = fs
      .readdirSync(this.migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort((a, b) => {
        const numA = parseInt(a.split('_')[0], 10)
        const numB = parseInt(b.split('_')[0], 10)
        return numA - numB
      })

    for (const file of files) {
      const version = parseInt(file.split('_')[0], 10)
      if (isNaN(version)) {
        logger.warn(`Skipping non-versioned migration file: ${file}`)
        continue
      }

      if (!appliedVersions.has(version)) {
        this.applyMigration(db, version, file)
      }
    }
  }

  private applyMigration(db: Database.Database, version: number, filename: string): void {
    const fullPath = path.join(this.migrationsDir, filename)
    logger.info(`Applying migration ${version}: ${filename}`)
    const sql = fs.readFileSync(fullPath, 'utf8')

    const applyTx = db.transaction(() => {
      // Execute the migration SQL script
      db.exec(sql)

      // Record migration
      const insertMigration = db.prepare(
        'INSERT INTO migrations (version, name, applied_at) VALUES (?, ?, ?)'
      )
      insertMigration.run(version, filename, new Date().toISOString())

      // If this is migration 1, run the seeds
      if (version === 1) {
        this.seedInitialData(db)
      }
    })

    applyTx()
    logger.info(`Successfully applied migration ${version}: ${filename}`)
  }

  /**
   * Seeds default permissions, roles, role_permissions, settings, and sequences.
   */
  public seedInitialData(db: Database.Database): void {
    logger.info('Seeding initial permissions, roles, settings, and sequences...')
    const now = new Date().toISOString()

    // 1. Seed Permissions
    const insertPerm = db.prepare(
      'INSERT OR IGNORE INTO permissions (id, key, module, description, created_at) VALUES (?, ?, ?, ?, ?)'
    )
    for (const p of ALL_PERMISSIONS) {
      insertPerm.run(uuidv4(), p.key, p.module, p.description, now)
    }

    // Map keys to permission IDs
    const permRows = db.prepare('SELECT id, key FROM permissions').all() as { id: string; key: string }[]
    const permMap = new Map<string, string>()
    for (const r of permRows) {
      permMap.set(r.key, r.id)
    }

    // 2. Seed Default Roles and Role Permissions
    const insertRole = db.prepare(`
      INSERT OR IGNORE INTO roles (id, name, description, is_system, is_owner, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    `)
    const insertRolePerm = db.prepare(
      'INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)'
    )

    for (const r of DEFAULT_ROLES) {
      const roleId = uuidv4()
      insertRole.run(roleId, r.name, r.description, r.isSystem ? 1 : 0, r.isOwner ? 1 : 0, now, now)

      // Fetch the actual role id in case it was ignored or already created
      const existing = db.prepare('SELECT id FROM roles WHERE name = ?').get(r.name) as { id: string }
      const actualRoleId = existing ? existing.id : roleId

      for (const permKey of r.permissions) {
        const permId = permMap.get(permKey)
        if (permId) {
          insertRolePerm.run(actualRoleId, permId)
        }
      }
    }

    // 3. Seed Default Settings
    const insertSetting = db.prepare(`
      INSERT OR IGNORE INTO settings (id, category, key, value, value_type, updated_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    for (const [category, keys] of Object.entries(DEFAULT_SETTINGS)) {
      for (const [key, item] of Object.entries(keys)) {
        insertSetting.run(
          uuidv4(),
          category,
          key,
          JSON.stringify(item.value),
          item.valueType,
          now,
          now
        )
      }
    }

    // 4. Seed Default Document Sequences
    const insertSequence = db.prepare(`
      INSERT OR IGNORE INTO sequences (id, entity_type, prefix, current_number, format_template, reset_yearly, current_year, updated_at)
      VALUES (?, ?, ?, 0, ?, 1, ?, ?)
    `)
    const currentYear = new Date().getFullYear()
    const sequences = [
      { entity: 'invoice', prefix: 'INV', template: '{prefix}-{year}-{number:4}' },
      { entity: 'job_card', prefix: 'JC', template: '{prefix}-{year}-{number:4}' },
      { entity: 'quotation', prefix: 'QT', template: '{prefix}-{year}-{number:4}' },
      { entity: 'purchase', prefix: 'PO', template: '{prefix}-{year}-{number:4}' },
      { entity: 'appointment', prefix: 'APT', template: '{prefix}-{year}-{number:4}' },
      { entity: 'expense', prefix: 'EXP', template: '{prefix}-{year}-{number:4}' }
    ]

    for (const seq of sequences) {
      insertSequence.run(uuidv4(), seq.entity, seq.prefix, seq.template, currentYear, now)
    }

    logger.info('Default seed data successfully populated.')
  }
}
