import { JobCardRepository } from '../repositories/job-cards.repo'
import { InventoryRepository } from '../repositories/inventory.repo'
import { SettingsRepository } from '../repositories/settings.repo'
import { PermissionService } from './permissions.service'
import { AuditService } from './audit.service'
import { sessionManager } from './session'
import {
  JobCardWithDetails,
  JobCardServiceItem,
  JobCardPartItem,
  CreateJobCardInput,
  UpdateJobCardInput,
  UpdateJobCardStatusInput,
  AssignTechnicianInput,
  AddJobCardServiceInput,
  UpdateJobCardServiceInput,
  AddJobCardPartInput
} from '@shared/types/job-card.types'
import {
  createJobCardSchema,
  updateJobCardSchema,
  updateJobCardStatusSchema,
  assignTechnicianSchema,
  addJobCardServiceSchema,
  updateJobCardServiceSchema,
  addJobCardPartSchema
} from '@shared/validation/job-card.schema'
import { ValidationError, NotFoundError } from '../utils/errors'

export class JobCardService {
  private repo: JobCardRepository
  private inventoryRepo: InventoryRepository
  private settingsRepo: SettingsRepository
  private permService: PermissionService
  private audit: AuditService

  constructor(
    repo = new JobCardRepository(),
    inventoryRepo = new InventoryRepository(),
    settingsRepo = new SettingsRepository(),
    permService = new PermissionService(),
    audit = new AuditService()
  ) {
    this.repo = repo
    this.inventoryRepo = inventoryRepo
    this.settingsRepo = settingsRepo
    this.permService = permService
    this.audit = audit
  }

  public listJobCards(filter?: {
    status?: string
    technicianId?: string
    customerId?: string
    vehicleId?: string
    search?: string
    includeInactive?: boolean
    limit?: number
    offset?: number
  }): JobCardWithDetails[] {
    this.permService.requirePermission('jobcards:view')
    return this.repo.listJobCards(filter)
  }

  public getJobCardById(id: string): JobCardWithDetails {
    this.permService.requirePermission('jobcards:view')
    const jc = this.repo.getJobCardById(id)
    if (!jc) {
      throw new NotFoundError('Job Card', id)
    }
    return jc
  }

  public createJobCard(input: unknown): JobCardWithDetails {
    this.permService.requirePermission('jobcards:create')
    const parse = createJobCardSchema.safeParse(input)
    if (!parse.success) {
      throw new ValidationError(parse.error.issues[0]?.message || 'Invalid job card data', parse.error.issues)
    }

    const session = sessionManager.requireSession()
    const jc = this.repo.createJobCard(parse.data as CreateJobCardInput, session.userId)

    this.audit.record({
      userId: session.userId,
      action: 'JOB_CARD_CREATED',
      entityType: 'job_card',
      entityId: jc.id,
      metadata: {
        jobCardNumber: jc.jobCardNumber,
        customerId: jc.customerId,
        vehicleId: jc.vehicleId,
        priority: jc.priority
      }
    })

    return jc
  }

  public updateJobCard(id: string, input: unknown): JobCardWithDetails {
    this.permService.requirePermission('jobcards:edit')
    const parse = updateJobCardSchema.safeParse(input)
    if (!parse.success) {
      throw new ValidationError(parse.error.issues[0]?.message || 'Invalid job card update data', parse.error.issues)
    }

    const existing = this.getJobCardById(id)
    const session = sessionManager.requireSession()
    const updated = this.repo.updateJobCard(id, parse.data as UpdateJobCardInput)

    this.audit.record({
      userId: session.userId,
      action: 'JOB_CARD_UPDATED',
      entityType: 'job_card',
      entityId: id,
      oldValue: existing,
      newValue: updated
    })

    return updated
  }

  public updateStatus(id: string, input: unknown): JobCardWithDetails {
    this.permService.requirePermission('jobcards:update_progress')
    const parse = updateJobCardStatusSchema.safeParse(input)
    if (!parse.success) {
      throw new ValidationError(parse.error.issues[0]?.message || 'Invalid status data', parse.error.issues)
    }

    const jc = this.getJobCardById(id)
    const nextStatus = parse.data.status
    const nowIso = new Date().toISOString()

    // 1. Check configurable technician requirement
    const requireTechSetting = this.settingsRepo.get('workflow', 'require_technician_assignment')
    const requireTech = requireTechSetting ? Boolean(requireTechSetting.value) : false
    if (requireTech && nextStatus !== 'Open' && !jc.technicianId) {
      throw new ValidationError(
        'A technician must be assigned to this job card before work can commence (enforced by business workflow settings).'
      )
    }

    // 2. Check configurable delivery mileage requirement
    const requireDeliveryMileageSetting = this.settingsRepo.get('workflow', 'require_delivery_mileage')
    const requireDeliveryMileage = requireDeliveryMileageSetting ? Boolean(requireDeliveryMileageSetting.value) : false
    if (requireDeliveryMileage && nextStatus === 'Delivered') {
      if (parse.data.mileageOut === undefined || parse.data.mileageOut === null) {
        throw new ValidationError('Delivery mileage is required to mark the job card Delivered.')
      }
      if (jc.mileageIn !== null && jc.mileageIn !== undefined && parse.data.mileageOut < jc.mileageIn) {
        throw new ValidationError(
          `Delivery mileage (${parse.data.mileageOut}) cannot be less than reception mileage (${jc.mileageIn}).`
        )
      }
    }

    // 3. Milestone timestamps if auto_record_milestone_timestamps is enabled
    const autoTimestampsSetting = this.settingsRepo.get('workflow', 'auto_record_milestone_timestamps')
    const autoTimestamps = autoTimestampsSetting !== null ? Boolean(autoTimestampsSetting.value) : true

    const timestamps: { startedAt?: string; completedAt?: string; deliveredAt?: string } = {}
    if (autoTimestamps) {
      if (nextStatus === 'In Progress' && !jc.startedAt) {
        timestamps.startedAt = nowIso
      }
      if (nextStatus === 'Ready' && !jc.completedAt) {
        timestamps.completedAt = nowIso
      }
      if (nextStatus === 'Delivered' && !jc.deliveredAt) {
        timestamps.deliveredAt = nowIso
      }
    }

    const session = sessionManager.requireSession()
    const updated = this.repo.updateJobCardStatus(id, nextStatus, timestamps, parse.data.mileageOut)

    this.audit.record({
      userId: session.userId,
      action: 'JOB_CARD_STATUS_CHANGED',
      entityType: 'job_card',
      entityId: id,
      metadata: {
        previousStatus: jc.status,
        newStatus: nextStatus,
        notes: parse.data.notes || null
      }
    })

    return updated
  }

  public assignTechnician(id: string, input: unknown): JobCardWithDetails {
    this.permService.requirePermission('jobcards:assign')
    const parse = assignTechnicianSchema.safeParse(input)
    if (!parse.success) {
      throw new ValidationError(parse.error.issues[0]?.message || 'Invalid technician assignment', parse.error.issues)
    }

    const jc = this.getJobCardById(id)
    const session = sessionManager.requireSession()
    const updated = this.repo.assignTechnician(id, parse.data.technicianId || null, session.userId)

    this.audit.record({
      userId: session.userId,
      action: 'JOB_CARD_TECHNICIAN_ASSIGNED',
      entityType: 'job_card',
      entityId: id,
      metadata: {
        previousTechnicianId: jc.technicianId,
        newTechnicianId: parse.data.technicianId
      }
    })

    return updated
  }

  // --- Services ---

  public addService(jobCardId: string, input: unknown): JobCardServiceItem {
    this.permService.requirePermission('jobcards:update_progress')
    const parse = addJobCardServiceSchema.safeParse(input)
    if (!parse.success) {
      throw new ValidationError(parse.error.issues[0]?.message || 'Invalid service line item', parse.error.issues)
    }

    const jc = this.getJobCardById(jobCardId)
    const session = sessionManager.requireSession()
    const serviceLine = this.repo.addService(jobCardId, parse.data as AddJobCardServiceInput)

    this.audit.record({
      userId: session.userId,
      action: 'JOB_CARD_SERVICE_ADDED',
      entityType: 'job_card_service',
      entityId: serviceLine.id,
      metadata: {
        jobCardNumber: jc.jobCardNumber,
        serviceName: serviceLine.serviceName,
        priceAmount: serviceLine.priceAmount,
        laborAmount: serviceLine.laborAmount
      }
    })

    return serviceLine
  }

  public updateService(serviceLineId: string, input: unknown): JobCardServiceItem {
    this.permService.requirePermission('jobcards:update_progress')
    const parse = updateJobCardServiceSchema.safeParse(input)
    if (!parse.success) {
      throw new ValidationError(parse.error.issues[0]?.message || 'Invalid service update data', parse.error.issues)
    }

    const session = sessionManager.requireSession()
    const updated = this.repo.updateService(serviceLineId, parse.data as UpdateJobCardServiceInput)

    this.audit.record({
      userId: session.userId,
      action: 'JOB_CARD_SERVICE_UPDATED',
      entityType: 'job_card_service',
      entityId: serviceLineId,
      newValue: updated
    })

    return updated
  }

  public removeService(serviceLineId: string): void {
    this.permService.requirePermission('jobcards:update_progress')
    const session = sessionManager.requireSession()
    this.repo.removeService(serviceLineId)

    this.audit.record({
      userId: session.userId,
      action: 'JOB_CARD_SERVICE_REMOVED',
      entityType: 'job_card_service',
      entityId: serviceLineId
    })
  }

  // --- Parts with Stock Movements Ledger ---

  public addPart(jobCardId: string, input: unknown): JobCardPartItem {
    this.permService.requirePermission('jobcards:update_progress')
    const parse = addJobCardPartSchema.safeParse(input)
    if (!parse.success) {
      throw new ValidationError(parse.error.issues[0]?.message || 'Invalid part allocation', parse.error.issues)
    }

    const item = this.inventoryRepo.getItemById(parse.data.inventoryItemId)
    if (!item) {
      throw new NotFoundError('Inventory Item', parse.data.inventoryItemId)
    }

    // Check negative stock allowance
    const allowNegativeSetting = this.settingsRepo.get('inventory', 'allow_negative_stock')
    const allowNegative = allowNegativeSetting ? Boolean(allowNegativeSetting.value) : false
    const currentStock = this.inventoryRepo.calculateStock(item.id)
    if (!allowNegative && currentStock - parse.data.quantity < 0) {
      throw new ValidationError(
        `Insufficient stock for "${item.name}". Current available: ${currentStock}, requested: ${parse.data.quantity}.`
      )
    }

    const session = sessionManager.requireSession()
    const partLine = this.repo.addPart(
      jobCardId,
      {
        id: item.id,
        name: item.name,
        costPriceAmount: item.costPriceAmount,
        sellingPriceAmount: item.sellingPriceAmount
      },
      parse.data.quantity,
      parse.data.unitPriceAmount,
      session.userId
    )

    this.audit.record({
      userId: session.userId,
      action: 'JOB_CARD_PART_ALLOCATED',
      entityType: 'job_card_part',
      entityId: partLine.id,
      metadata: {
        jobCardId,
        itemId: item.id,
        itemName: item.name,
        quantity: parse.data.quantity,
        unitPrice: partLine.unitPriceAmount,
        total: partLine.totalAmount
      }
    })

    return partLine
  }

  public removePart(partLineId: string): void {
    this.permService.requirePermission('jobcards:update_progress')
    const session = sessionManager.requireSession()
    this.repo.removePart(partLineId, session.userId)

    this.audit.record({
      userId: session.userId,
      action: 'JOB_CARD_PART_REMOVED',
      entityType: 'job_card_part',
      entityId: partLineId
    })
  }
}
