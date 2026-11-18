import { QuotationsRepository } from '../repositories/quotations.repo'
import { SettingsRepository } from '../repositories/settings.repo'
import { PermissionService } from './permissions.service'
import { AuditService } from './audit.service'
import { sessionManager } from './session'
import {
  QuotationWithDetails,
  QuotationStatus,
  CreateQuotationInput,
  UpdateQuotationInput,
  ConvertQuotationToJobCardInput
} from '@shared/types/quotation.types'
import {
  createQuotationSchema,
  updateQuotationSchema,
  updateQuotationStatusSchema,
  convertQuotationToJobCardSchema
} from '@shared/validation/quotation.schema'
import { ValidationError, NotFoundError } from '../utils/errors'

export class QuotationsService {
  private repo: QuotationsRepository
  private settingsRepo: SettingsRepository
  private permService: PermissionService
  private audit: AuditService

  constructor(
    repo = new QuotationsRepository(),
    settingsRepo = new SettingsRepository(),
    permService = new PermissionService(),
    audit = new AuditService()
  ) {
    this.repo = repo
    this.settingsRepo = settingsRepo
    this.permService = permService
    this.audit = audit
  }

  private checkModuleEnabled(): void {
    const toggle = this.settingsRepo.get('feature_toggles', 'module_quotations')
    if (toggle && toggle.value === false) {
      throw new ValidationError('Quotations module is currently disabled in system settings.')
    }
  }

  public getById(id: string): QuotationWithDetails {
    this.checkModuleEnabled()
    this.permService.requirePermission('quotations:view')
    const quotation = this.repo.getById(id)
    if (!quotation) {
      throw new NotFoundError(`Quotation with ID ${id} not found`)
    }
    return quotation
  }

  public listQuotations(filter?: {
    status?: string
    customerId?: string
    vehicleId?: string
    search?: string
  }): QuotationWithDetails[] {
    this.checkModuleEnabled()
    this.permService.requirePermission('quotations:view')
    return this.repo.listQuotations(filter)
  }

  public createQuotation(input: CreateQuotationInput): QuotationWithDetails {
    this.checkModuleEnabled()
    this.permService.requirePermission('quotations:create')
    const parsed = createQuotationSchema.safeParse(input)
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message)
    }

    const session = sessionManager.requireSession()
    const quotation = this.repo.createQuotation(parsed.data as CreateQuotationInput, session.userId)

    this.audit.record({
      userId: session.userId,
      action: 'QUOTATION_CREATED',
      entityType: 'quotation',
      entityId: quotation.id,
      metadata: {
        quotationNumber: quotation.quotationNumber,
        customerId: quotation.customerId,
        totalAmount: quotation.totalAmount,
        itemCount: quotation.items.length
      }
    })

    return quotation
  }

  public updateQuotation(id: string, input: UpdateQuotationInput): QuotationWithDetails {
    this.checkModuleEnabled()
    this.permService.requirePermission('quotations:create')
    const parsed = updateQuotationSchema.safeParse(input)
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message)
    }

    const session = sessionManager.requireSession()
    const quotation = this.repo.updateQuotation(id, parsed.data)

    this.audit.record({
      userId: session.userId,
      action: 'QUOTATION_UPDATED',
      entityType: 'quotation',
      entityId: quotation.id,
      metadata: {
        quotationNumber: quotation.quotationNumber,
        totalAmount: quotation.totalAmount
      }
    })

    return quotation
  }

  public updateStatus(
    id: string,
    status: QuotationStatus,
    notes?: string | null
  ): QuotationWithDetails {
    this.checkModuleEnabled()
    if (status === 'Approved') {
      this.permService.requirePermission('quotations:approve')
    } else {
      this.permService.requirePermission('quotations:create')
    }

    const parsed = updateQuotationStatusSchema.safeParse({ status, notes })
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message)
    }

    const session = sessionManager.requireSession()
    const quotation = this.repo.updateStatus(id, parsed.data.status, parsed.data.notes, session.userId)

    this.audit.record({
      userId: session.userId,
      action: 'QUOTATION_STATUS_CHANGED',
      entityType: 'quotation',
      entityId: quotation.id,
      metadata: {
        quotationNumber: quotation.quotationNumber,
        newStatus: parsed.data.status
      }
    })

    return quotation
  }

  public convertToJobCard(
    input: ConvertQuotationToJobCardInput
  ): { quotation: QuotationWithDetails; jobCardId: string } {
    this.checkModuleEnabled()
    this.permService.requirePermission('quotations:approve')
    this.permService.requirePermission('jobcards:create')

    const parsed = convertQuotationToJobCardSchema.safeParse(input)
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message)
    }

    const session = sessionManager.requireSession()
    const result = this.repo.convertToJobCard(parsed.data, session.userId)

    this.audit.record({
      userId: session.userId,
      action: 'QUOTATION_CONVERTED_TO_JOBCARD',
      entityType: 'quotation',
      entityId: input.quotationId,
      metadata: {
        jobCardId: result.jobCardId,
        quotationNumber: result.quotation.quotationNumber
      }
    })

    return result
  }
}
