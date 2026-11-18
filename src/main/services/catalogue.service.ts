import { CatalogueRepository } from '../repositories/catalogue.repo'
import { PermissionService } from './permissions.service'
import { AuditService } from './audit.service'
import { sessionManager } from './session'
import {
  ServiceCategory,
  ServiceItem,
  CreateServiceInput,
  UpdateServiceInput,
  CreateServiceCategoryInput,
  UpdateServiceCategoryInput
} from '@shared/types/catalogue.types'
import {
  createServiceSchema,
  updateServiceSchema,
  createServiceCategorySchema,
  updateServiceCategorySchema
} from '@shared/validation/catalogue.schema'
import { ValidationError, NotFoundError } from '../utils/errors'

export class CatalogueService {
  private repo: CatalogueRepository
  private permService: PermissionService
  private audit: AuditService

  constructor(
    repo = new CatalogueRepository(),
    permService = new PermissionService(),
    audit = new AuditService()
  ) {
    this.repo = repo
    this.permService = permService
    this.audit = audit
  }

  // --- Service Categories ---

  public listCategories(includeInactive = false): ServiceCategory[] {
    this.permService.requirePermission('catalogue:view')
    return this.repo.listCategories(includeInactive)
  }

  public createCategory(input: unknown): ServiceCategory {
    this.permService.requirePermission('catalogue:create')
    const parse = createServiceCategorySchema.safeParse(input)
    if (!parse.success) {
      throw new ValidationError(parse.error.issues[0]?.message || 'Invalid category data', parse.error.issues)
    }

    const session = sessionManager.requireSession()
    const category = this.repo.createCategory(parse.data)

    this.audit.record({
      userId: session.userId,
      action: 'SERVICE_CATEGORY_CREATED',
      entityType: 'service_category',
      entityId: category.id,
      newValue: category
    })
    return category
  }

  public updateCategory(id: string, input: unknown): ServiceCategory {
    this.permService.requirePermission('catalogue:edit')
    const parse = updateServiceCategorySchema.safeParse(input)
    if (!parse.success) {
      throw new ValidationError(parse.error.issues[0]?.message || 'Invalid category data', parse.error.issues)
    }

    const session = sessionManager.requireSession()
    const existing = this.repo.getCategoryById(id)
    if (!existing) {
      throw new NotFoundError('Service Category', id)
    }

    const updated = this.repo.updateCategory(id, parse.data)
    this.audit.record({
      userId: session.userId,
      action: 'SERVICE_CATEGORY_UPDATED',
      entityType: 'service_category',
      entityId: id,
      oldValue: existing,
      newValue: updated
    })
    return updated
  }

  // --- Services ---

  public listServices(filter?: {
    categoryId?: string
    search?: string
    includeInactive?: boolean
  }): ServiceItem[] {
    this.permService.requirePermission('catalogue:view')
    return this.repo.listServices(filter)
  }

  public getServiceById(id: string): ServiceItem {
    this.permService.requirePermission('catalogue:view')
    const service = this.repo.getServiceById(id)
    if (!service) {
      throw new NotFoundError('Service', id)
    }
    return service
  }

  public createService(input: unknown): ServiceItem {
    this.permService.requirePermission('catalogue:create')
    const parse = createServiceSchema.safeParse(input)
    if (!parse.success) {
      throw new ValidationError(parse.error.issues[0]?.message || 'Invalid service data', parse.error.issues)
    }

    const session = sessionManager.requireSession()
    const service = this.repo.createService(parse.data as any)

    this.audit.record({
      userId: session.userId,
      action: 'SERVICE_CREATED',
      entityType: 'service',
      entityId: service.id,
      newValue: service
    })
    return service
  }

  public updateService(id: string, input: unknown): ServiceItem {
    this.permService.requirePermission('catalogue:edit')
    const parse = updateServiceSchema.safeParse(input)
    if (!parse.success) {
      throw new ValidationError(parse.error.issues[0]?.message || 'Invalid service data', parse.error.issues)
    }

    const session = sessionManager.requireSession()
    const existing = this.repo.getServiceById(id)
    if (!existing) {
      throw new NotFoundError('Service', id)
    }

    const updated = this.repo.updateService(id, parse.data as any)
    this.audit.record({
      userId: session.userId,
      action: 'SERVICE_UPDATED',
      entityType: 'service',
      entityId: id,
      oldValue: existing,
      newValue: updated
    })
    return updated
  }

  public deactivateService(id: string): void {
    this.permService.requirePermission('catalogue:delete')
    const session = sessionManager.requireSession()
    const existing = this.repo.getServiceById(id)
    if (!existing) {
      throw new NotFoundError('Service', id)
    }

    this.repo.deactivateService(id)
    this.audit.record({
      userId: session.userId,
      action: 'SERVICE_DEACTIVATED',
      entityType: 'service',
      entityId: id,
      oldValue: existing
    })
  }
}
