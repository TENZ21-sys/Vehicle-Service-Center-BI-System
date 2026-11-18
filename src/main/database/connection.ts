import Database from 'better-sqlite3'
import * as path from 'path'
import * as fs from 'fs'
import { BusinessIsolationError, AppError } from '../utils/errors'
import { logger } from '../utils/logger'

export class DatabaseManager {
  private static instance: DatabaseManager | null = null
  private activeDb: Database.Database | null = null
  private activeBusinessId: string | null = null
  private databasesDir: string

  private constructor(appDataDir?: string) {
    const baseDir = appDataDir || path.join(process.cwd(), 'data')
    this.databasesDir = path.join(baseDir, 'databases')
    if (!fs.existsSync(this.databasesDir)) {
      fs.mkdirSync(this.databasesDir, { recursive: true })
    }
  }

  public static getInstance(appDataDir?: string): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager(appDataDir)
    }
    return DatabaseManager.instance
  }

  public static resetInstanceForTesting(): void {
    if (DatabaseManager.instance) {
      DatabaseManager.instance.closeActiveDatabase()
      DatabaseManager.instance = null
    }
  }

  public getDatabasesDir(): string {
    return this.databasesDir
  }

  /**
   * Opens or returns the active SQLite database for the selected business.
   * Enforces WAL mode and foreign key constraints.
   */
  public openBusinessDatabase(businessId: string, filename: string): Database.Database {
    // If already open for this business, return it
    if (this.activeDb && this.activeBusinessId === businessId) {
      return this.activeDb
    }

    // Close any previously opened business DB before opening another (Isolation Guarantee)
    this.closeActiveDatabase()

    if (!fs.existsSync(this.databasesDir)) {
      fs.mkdirSync(this.databasesDir, { recursive: true })
    }

    const dbPath = path.join(this.databasesDir, filename)
    logger.info(`Opening business database at: ${dbPath}`)

    try {
      const db = new Database(dbPath)
      db.pragma('journal_mode = WAL')
      db.pragma('foreign_keys = ON')

      this.activeDb = db
      this.activeBusinessId = businessId
      return db
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      logger.error(`Failed to open business database [${filename}]: ${msg}`)
      throw new AppError(`Could not open business database: ${msg}`)
    }
  }

  /**
   * Returns the active database connection.
   * Throws if no business has been selected.
   */
  public getActiveDb(): Database.Database {
    if (!this.activeDb) {
      throw new BusinessIsolationError('No business database is currently open. Please select a business.')
    }
    return this.activeDb
  }

  public getActiveBusinessId(): string | null {
    return this.activeBusinessId
  }

  /**
   * Closes the active business database connection.
   */
  public closeActiveDatabase(): void {
    if (this.activeDb) {
      logger.info(`Closing active database for business: ${this.activeBusinessId}`)
      try {
        this.activeDb.close()
      } catch (err) {
        logger.warn('Error while closing database connection:', err)
      } finally {
        this.activeDb = null
        this.activeBusinessId = null
      }
    }
  }

  /**
   * Runs a function inside a SQLite transaction. Automatically rolls back on error.
   */
  public transaction<T>(fn: () => T): T {
    const db = this.getActiveDb()
    const runTx = db.transaction(fn)
    return runTx()
  }
}
