import Database from 'better-sqlite3'
import { DatabaseManager } from '../database/connection'

export class SequenceRepository {
  private explicitDb?: Database.Database

  constructor(db?: Database.Database) {
    this.explicitDb = db
  }

  private get db(): Database.Database {
    return this.explicitDb || DatabaseManager.getInstance().getActiveDb()
  }

  /**
   * Atomically increments and formats the next sequential document number.
   * Template examples: '{prefix}-{year}-{number:4}' -> 'PO-2026-0001'
   */
  public getNextNumber(entityType: string): string {
    const now = new Date()
    const currentYear = now.getFullYear()
    const nowIso = now.toISOString()

    const seq = this.db
      .prepare('SELECT * FROM sequences WHERE entity_type = ?')
      .get(entityType) as any

    if (!seq) {
      // Fallback if sequence not found
      return `${entityType.toUpperCase().slice(0, 3)}-${currentYear}-${Date.now().toString().slice(-4)}`
    }

    let nextNumber = seq.current_number + 1
    if (seq.reset_yearly === 1 && seq.current_year !== currentYear) {
      nextNumber = 1
    }

    this.db
      .prepare(
        `UPDATE sequences
         SET current_number = ?, current_year = ?, updated_at = ?
         WHERE entity_type = ?`
      )
      .run(nextNumber, currentYear, nowIso, entityType)

    // Format according to template: {prefix}-{year}-{number:4}
    let formatted = seq.format_template
    formatted = formatted.replace('{prefix}', seq.prefix)
    formatted = formatted.replace('{year}', currentYear.toString())

    const match = formatted.match(/\{number:(\d+)\}/)
    if (match) {
      const padding = parseInt(match[1], 10)
      const paddedNum = nextNumber.toString().padStart(padding, '0')
      formatted = formatted.replace(match[0], paddedNum)
    } else {
      formatted = formatted.replace('{number}', nextNumber.toString())
    }

    return formatted
  }
}
