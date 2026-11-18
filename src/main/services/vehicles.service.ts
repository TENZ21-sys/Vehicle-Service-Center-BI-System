import { VehicleRepository } from '../repositories/vehicles.repo'
import { PermissionService } from './permissions.service'
import { AuditService } from './audit.service'
import { sessionManager } from './session'
import { VehicleWithCustomer, ServiceReminder } from '@shared/types/vehicle.types'
import { createVehicleSchema, updateVehicleSchema, createReminderSchema } from '@shared/validation/vehicle.schema'
import { ValidationError } from '../utils/errors'

export class VehicleService {
  private repo: VehicleRepository
  private permService: PermissionService
  private audit: AuditService

  constructor(
    repo = new VehicleRepository(),
    permService = new PermissionService(),
    audit = new AuditService()
  ) {
    this.repo = repo
    this.permService = permService
    this.audit = audit
  }

  public listVehicles(includeInactive = false, limit = 100, offset = 0): VehicleWithCustomer[] {
    this.permService.requirePermission('vehicles:view')
    return this.repo.findAll(includeInactive, limit, offset)
  }

  public getVehicle(id: string): VehicleWithCustomer {
    this.permService.requirePermission('vehicles:view')
    return this.repo.findById(id)
  }

  public getVehicleByRegistration(registrationNo: string): VehicleWithCustomer | null {
    this.permService.requirePermission('vehicles:view')
    return this.repo.findByRegistration(registrationNo)
  }

  public createVehicle(input: unknown): VehicleWithCustomer {
    this.permService.requirePermission('vehicles:create')
    const parse = createVehicleSchema.safeParse(input)
    if (!parse.success) {
      throw new ValidationError(parse.error.issues[0]?.message || 'Invalid vehicle details', parse.error.issues)
    }

    const vehicle = this.repo.create(parse.data)
    const session = sessionManager.getSession()

    this.audit.record({
      userId: session?.userId,
      action: 'VEHICLE_CREATED',
      entityType: 'vehicle',
      entityId: vehicle.id,
      newValue: vehicle
    })

    return vehicle
  }

  public updateVehicle(id: string, input: unknown): VehicleWithCustomer {
    this.permService.requirePermission('vehicles:edit')
    const parse = updateVehicleSchema.safeParse(input)
    if (!parse.success) {
      throw new ValidationError(parse.error.issues[0]?.message || 'Invalid vehicle update parameters', parse.error.issues)
    }

    const oldVehicle = this.repo.findById(id)
    const updated = this.repo.update(id, parse.data)
    const session = sessionManager.getSession()

    this.audit.record({
      userId: session?.userId,
      action: 'VEHICLE_UPDATED',
      entityType: 'vehicle',
      entityId: id,
      oldValue: oldVehicle,
      newValue: updated
    })

    return updated
  }

  public deactivateVehicle(id: string): void {
    this.permService.requirePermission('vehicles:delete')
    const oldVehicle = this.repo.findById(id)
    this.repo.deactivate(id)
    const session = sessionManager.getSession()

    this.audit.record({
      userId: session?.userId,
      action: 'VEHICLE_DEACTIVATED',
      entityType: 'vehicle',
      entityId: id,
      oldValue: oldVehicle,
      newValue: { ...oldVehicle, isActive: false }
    })
  }

  // --- Reminders ---

  public createReminder(input: unknown): ServiceReminder {
    this.permService.requirePermission('vehicles:edit')
    const parse = createReminderSchema.safeParse(input)
    if (!parse.success) {
      throw new ValidationError(parse.error.issues[0]?.message || 'Invalid reminder data', parse.error.issues)
    }

    return this.repo.createReminder(parse.data)
  }

  public listRemindersForVehicle(vehicleId: string): ServiceReminder[] {
    this.permService.requirePermission('vehicles:view')
    return this.repo.listRemindersForVehicle(vehicleId)
  }

  public listDueReminders(maxDate?: string, currentMileage?: number): ServiceReminder[] {
    this.permService.requirePermission('vehicles:view')
    return this.repo.listDueReminders(maxDate, currentMileage)
  }

  public completeReminder(id: string, jobCardId?: string): ServiceReminder {
    this.permService.requirePermission('vehicles:edit')
    return this.repo.completeReminder(id, jobCardId)
  }
}
