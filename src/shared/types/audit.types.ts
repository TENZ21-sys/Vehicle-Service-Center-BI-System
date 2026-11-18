import { UUID } from './common.types'

export type AuditAction =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_DEACTIVATED'
  | 'ROLE_CREATED'
  | 'ROLE_UPDATED'
  | 'PERMISSIONS_MODIFIED'
  | 'SETTING_CHANGED'
  | 'BUSINESS_CREATED'
  | 'BACKUP_CREATED'
  | 'BACKUP_RESTORED'
  | 'CUSTOMER_CREATED'
  | 'CUSTOMER_UPDATED'
  | 'CUSTOMER_DEACTIVATED'
  | 'VEHICLE_CREATED'
  | 'VEHICLE_UPDATED'
  | 'VEHICLE_DEACTIVATED'
  | 'JOB_CARD_CREATED'
  | 'JOB_CARD_UPDATED'
  | 'JOB_CARD_STATUS_CHANGED'
  | 'INVOICE_CREATED'
  | 'INVOICE_VOIDED'
  | 'PAYMENT_RECORDED'
  | 'STOCK_ADJUSTMENT'
  | 'PURCHASE_CREATED'
  | 'PERMISSION_DENIED'

export interface AuditLogEntry {
  id: UUID
  userId?: UUID
  action: AuditAction | string
  entityType?: string
  entityId?: string
  oldValue?: string | null
  newValue?: string | null
  metadata?: string | null
  createdAt: string
}
