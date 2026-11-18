import { DatabaseManager } from '../database/connection'
import { v4 as uuidv4 } from 'uuid'
import { AuditLogEntry, AuditAction } from '@shared/types/audit.types'

export interface AuditLogFilter {
  userId?: string
  action?: string
  entityType?: string
  entityId?: string
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}

export class AuditRepository {
  private dbManager: DatabaseManager

  constructor(dbManager = DatabaseManager.getInstance()) {
    this.dbManager = dbManager
  }

  /**
   * Append-only insert. Audit entries are never updated or deleted.
   */
  public log(entry: {
    userId?: string
    action: AuditAction | string
    entityType?: string
    entityId?: string
    oldValue?: unknown
    newValue?: unknown
    metadata?: unknown
  }): AuditLogEntry {
    const db = this.dbManager.getActiveDb()
    const id = uuidv4()
    const now = new Date().toISOString()

    const oldStr = entry.oldValue !== undefined ? JSON.stringify(entry.oldValue) : null
    const newStr = entry.newValue !== undefined ? JSON.stringify(entry.newValue) : null
    const metaStr = entry.metadata !== undefined ? JSON.stringify(entry.metadata) : null

    const stmt = db.prepare(`
      INSERT INTO audit_log (id, user_id, action, entity_type, entity_id, old_value, new_value, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      id,
      entry.userId || null,
      entry.action,
      entry.entityType || null,
      entry.entityId || null,
      oldStr,
      newStr,
      metaStr,
      now
    )

    return {
      id,
      userId: entry.userId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      oldValue: oldStr,
      newValue: newStr,
      metadata: metaStr,
      createdAt: now
    }
  }

  public query(filters: AuditLogFilter = {}): AuditLogEntry[] {
    const db = this.dbManager.getActiveDb()
    const conditions: string[] = []
    const params: (string | number)[] = []

    if (filters.userId) {
      conditions.push('user_id = ?')
      params.push(filters.userId)
    }
    if (filters.action) {
      conditions.push('action = ?')
      params.push(filters.action)
    }
    if (filters.entityType) {
      conditions.push('entity_type = ?')
      params.push(filters.entityType)
    }
    if (filters.entityId) {
      conditions.push('entity_id = ?')
      params.push(filters.entityId)
    }
    if (filters.startDate) {
      conditions.push('created_at >= ?')
      params.push(filters.startDate)
    }
    if (filters.endDate) {
      conditions.push('created_at <= ?')
      params.push(filters.endDate)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const limit = filters.limit || 100
    const offset = filters.offset || 0

    const query = `
      SELECT id, user_id as userId, action, entity_type as entityType, entity_id as entityId,
             old_value as oldValue, new_value as newValue, metadata, created_at as createdAt
      FROM audit_log
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `

    params.push(limit, offset)
    const stmt = db.prepare(query)
    return stmt.all(...params) as AuditLogEntry[]
  }
}
