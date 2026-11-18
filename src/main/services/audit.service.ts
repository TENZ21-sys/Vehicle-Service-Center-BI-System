import { AuditRepository, AuditLogFilter } from '../repositories/audit.repo'
import { AuditLogEntry, AuditAction } from '@shared/types/audit.types'
import { logger } from '../utils/logger'

export class AuditService {
  private repo: AuditRepository

  constructor(repo = new AuditRepository()) {
    this.repo = repo
  }

  public record(entry: {
    userId?: string
    action: AuditAction | string
    entityType?: string
    entityId?: string
    oldValue?: unknown
    newValue?: unknown
    metadata?: unknown
  }): AuditLogEntry {
    logger.info(`Audit: [${entry.action}] ${entry.entityType || ''} ${entry.entityId || ''}`)
    return this.repo.log(entry)
  }

  public getAuditTrail(filters: AuditLogFilter = {}): AuditLogEntry[] {
    return this.repo.query(filters)
  }
}
