import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { DatabaseManager } from '../../src/main/database/connection'
import { MigrationRunner } from '../../src/main/database/migrate'
import { ALL_PERMISSIONS } from '../../src/shared/constants/permissions'
import { DEFAULT_ROLES } from '../../src/shared/constants/defaults'

describe('Database Infrastructure & Migrations', () => {
  const testDataDir = path.join(process.cwd(), 'test-data-db')
  const migrationsDir = path.join(process.cwd(), 'src/main/database/migrations')
  let dbManager: DatabaseManager

  beforeEach(() => {
    DatabaseManager.resetInstanceForTesting()
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true, force: true })
    }
    dbManager = DatabaseManager.getInstance(testDataDir)
  })

  afterEach(() => {
    DatabaseManager.resetInstanceForTesting()
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true, force: true })
    }
  })

  it('enforces WAL mode and foreign key constraints on open', () => {
    const db = dbManager.openBusinessDatabase('biz-1', 'biz_1.db')
    const journalMode = db.pragma('journal_mode', { simple: true })
    const foreignKeys = db.pragma('foreign_keys', { simple: true })

    expect(journalMode).toBe('wal')
    expect(foreignKeys).toBe(1)
  })

  it('rolls back database transactions on error', () => {
    const db = dbManager.openBusinessDatabase('biz-1', 'biz_1.db')
    db.exec(`CREATE TABLE test_tx (id INTEGER PRIMARY KEY, val TEXT);`)

    expect(() => {
      dbManager.transaction(() => {
        db.prepare('INSERT INTO test_tx (id, val) VALUES (?, ?)').run(1, 'first')
        throw new Error('Forced transaction failure')
      })
    }).toThrow('Forced transaction failure')

    const count = db.prepare('SELECT COUNT(*) as count FROM test_tx').get() as { count: number }
    expect(count.count).toBe(0)
  })

  it('applies initial migration and seeds default permissions, roles, and settings', () => {
    const db = dbManager.openBusinessDatabase('biz-1', 'biz_1.db')
    const runner = new MigrationRunner(migrationsDir)
    runner.runPendingMigrations(db)

    // Check migrations record
    const migrations = db.prepare('SELECT * FROM migrations ORDER BY version ASC').all() as { version: number }[]
    expect(migrations.length).toBe(8)
    expect(migrations[0].version).toBe(1)
    expect(migrations[1].version).toBe(2)
    expect(migrations[2].version).toBe(3)
    expect(migrations[3].version).toBe(4)
    expect(migrations[4].version).toBe(5)
    expect(migrations[5].version).toBe(6)
    expect(migrations[6].version).toBe(7)
    expect(migrations[7].version).toBe(8)

    // Check permissions count
    const permissions = db.prepare('SELECT * FROM permissions').all()
    expect(permissions.length).toBe(ALL_PERMISSIONS.length)

    // Check roles count
    const roles = db.prepare('SELECT * FROM roles').all() as { name: string; is_owner: number }[]
    expect(roles.length).toBe(DEFAULT_ROLES.length)
    const ownerRole = roles.find((r) => r.is_owner === 1)
    expect(ownerRole).toBeDefined()
    expect(ownerRole?.name).toBe('Business Owner / Admin')

    // Check settings seeded
    const settings = db.prepare('SELECT * FROM settings').all()
    expect(settings.length).toBeGreaterThan(5)

    // Running migrations a second time should be idempotent
    expect(() => runner.runPendingMigrations(db)).not.toThrow()
    const migrationsAfter = db.prepare('SELECT * FROM migrations').all()
    expect(migrationsAfter.length).toBe(8)
  })

  it('enforces business isolation by closing previous DB when opening another', () => {
    const db1 = dbManager.openBusinessDatabase('biz-1', 'biz_1.db')
    db1.exec("CREATE TABLE biz1_secret (secret TEXT); INSERT INTO biz1_secret VALUES ('biz1_data');")
    expect(dbManager.getActiveBusinessId()).toBe('biz-1')

    // Open business 2
    const db2 = dbManager.openBusinessDatabase('biz-2', 'biz_2.db')
    expect(dbManager.getActiveBusinessId()).toBe('biz-2')

    // db2 should not have access to biz1's table
    const tableExists = db2
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='biz1_secret'")
      .get()
    expect(tableExists).toBeUndefined()
  })
})
