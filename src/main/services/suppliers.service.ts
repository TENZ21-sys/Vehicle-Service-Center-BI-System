import { SuppliersRepository } from '../repositories/suppliers.repo'
import { PermissionService } from './permissions.service'
import { AuditService } from './audit.service'
import { sessionManager } from './session'
import { Supplier } from '@shared/types/inventory.types'
import {
  createSupplierSchema,
  updateSupplierSchema
} from '@shared/validation/inventory.schema'
import { ValidationError, NotFoundError } from '../utils/errors'

export class SuppliersService {
  private repo: SuppliersRepository
  private permService: PermissionService
  private audit: AuditService

  constructor(
    repo = new SuppliersRepository(),
    permService = new PermissionService(),
    audit = new AuditService()
  ) {
    this.repo = repo
    this.permService = permService
    this.audit = audit
  }

  public listSuppliers(includeInactive = false): Supplier[] {
    this.permService.requirePermission('purchases:view')
    return this.repo.listSuppliers(includeInactive)
  }

  public getSupplierById(id: string): Supplier {
    this.permService.requirePermission('purchases:view')
    const supplier = this.repo.getSupplierById(id)
    if (!supplier) {
      throw new NotFoundError('Supplier', id)
    }
    return supplier
  }

  public createSupplier(input: unknown): Supplier {
    this.permService.requirePermission('purchases:create')
    const parse = createSupplierSchema.safeParse(input)
    if (!parse.success) {
      throw new ValidationError(parse.error.issues[0]?.message || 'Invalid supplier data', parse.error.issues)
    }

    const session = sessionManager.requireSession()
    const supplier = this.repo.createSupplier(parse.data)

    this.audit.record({
      userId: session.userId,
      action: 'SUPPLIER_CREATED',
      entityType: 'supplier',
      entityId: supplier.id,
      newValue: supplier
    })
    return supplier
  }

  public updateSupplier(id: string, input: unknown): Supplier {
    this.permService.requirePermission('purchases:create')
    const parse = updateSupplierSchema.safeParse(input)
    if (!parse.success) {
      throw new ValidationError(parse.error.issues[0]?.message || 'Invalid supplier data', parse.error.issues)
    }

    const session = sessionManager.requireSession()
    const existing = this.repo.getSupplierById(id)
    if (!existing) {
      throw new NotFoundError('Supplier', id)
    }

    const updated = this.repo.updateSupplier(id, parse.data)
    this.audit.record({
      userId: session.userId,
      action: 'SUPPLIER_UPDATED',
      entityType: 'supplier',
      entityId: id,
      oldValue: existing,
      newValue: updated
    })
    return updated
  }

  public deactivateSupplier(id: string): void {
    this.permService.requirePermission('purchases:create')
    const session = sessionManager.requireSession()
    const existing = this.repo.getSupplierById(id)
    if (!existing) {
      throw new NotFoundError('Supplier', id)
    }

    this.repo.deactivateSupplier(id)
    this.audit.record({
      userId: session.userId,
      action: 'SUPPLIER_DEACTIVATED',
      entityType: 'supplier',
      entityId: id,
      oldValue: existing
    })
  }
}
