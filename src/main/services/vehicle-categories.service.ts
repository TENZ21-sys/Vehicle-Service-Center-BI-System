import { VehicleCategoriesRepository } from '../repositories/vehicle-categories.repo'
import { PermissionService } from './permissions.service'
import { AuditService } from './audit.service'
import { sessionManager } from './session'
import { VehicleCategory } from '@shared/types/vehicle.types'
import { vehicleCategorySchema } from '@shared/validation/vehicle.schema'
import { ValidationError } from '../utils/errors'

export class VehicleCategoriesService {
  private repo: VehicleCategoriesRepository
  private permService: PermissionService
  private audit: AuditService

  constructor(
    repo = new VehicleCategoriesRepository(),
    permService = new PermissionService(),
    audit = new AuditService()
  ) {
    this.repo = repo
    this.permService = permService
    this.audit = audit
  }

  public listCategories(includeInactive = false): VehicleCategory[] {
    return this.repo.findAll(includeInactive)
  }

  public getCategory(id: string): VehicleCategory {
    return this.repo.findById(id)
  }

  public createCategory(input: unknown): VehicleCategory {
    this.permService.requirePermission('vehicles:create')
    const parse = vehicleCategorySchema.safeParse(input)
    if (!parse.success) {
      throw new ValidationError(parse.error.issues[0]?.message || 'Invalid category parameters')
    }

    const category = this.repo.create(parse.data)
    const session = sessionManager.getSession()

    this.audit.record({
      userId: session?.userId,
      action: 'SETTING_CHANGED',
      entityType: 'vehicle_category',
      entityId: category.id,
      newValue: category
    })

    return category
  }

  public updateCategory(id: string, input: unknown): VehicleCategory {
    this.permService.requirePermission('vehicles:edit')
    const parse = vehicleCategorySchema.partial().safeParse(input)
    if (!parse.success) {
      throw new ValidationError(parse.error.issues[0]?.message || 'Invalid category parameters')
    }

    const oldCategory = this.repo.findById(id)
    const updated = this.repo.update(id, parse.data)
    const session = sessionManager.getSession()

    this.audit.record({
      userId: session?.userId,
      action: 'SETTING_CHANGED',
      entityType: 'vehicle_category',
      entityId: id,
      oldValue: oldCategory,
      newValue: updated
    })

    return updated
  }

  public deactivateCategory(id: string): void {
    this.permService.requirePermission('vehicles:delete')
    const oldCategory = this.repo.findById(id)
    this.repo.deactivate(id)
    const session = sessionManager.getSession()

    this.audit.record({
      userId: session?.userId,
      action: 'SETTING_CHANGED',
      entityType: 'vehicle_category',
      entityId: id,
      oldValue: oldCategory,
      newValue: { ...oldCategory, isActive: false }
    })
  }
}
