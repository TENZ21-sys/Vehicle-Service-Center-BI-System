import { InvoicesRepository } from '../repositories/invoices.repo'
import { PermissionService } from './permissions.service'
import { AuditService } from './audit.service'
import { sessionManager } from './session'
import {
  Invoice,
  InvoiceWithDetails,
  CreateJobCardInvoiceInput,
  CreatePosInvoiceInput,
  VoidInvoiceInput
} from '@shared/types/invoice.types'
import {
  createJobCardInvoiceSchema,
  createPosInvoiceSchema,
  voidInvoiceSchema
} from '@shared/validation/invoice.schema'
import { ValidationError, NotFoundError } from '../utils/errors'

export class InvoicesService {
  private repo: InvoicesRepository
  private permService: PermissionService
  private audit: AuditService

  constructor(
    repo = new InvoicesRepository(),
    permService = new PermissionService(),
    audit = new AuditService()
  ) {
    this.repo = repo
    this.permService = permService
    this.audit = audit
  }

  public getById(id: string): InvoiceWithDetails {
    this.permService.requirePermission('invoices:view')
    const invoice = this.repo.getById(id)
    if (!invoice) {
      throw new NotFoundError(`Invoice with ID ${id} not found`)
    }
    return invoice
  }

  public listInvoices(filter?: {
    status?: string
    customerId?: string
    vehicleId?: string
    invoiceType?: string
    search?: string
  }): (Invoice & { customerName: string; vehicleRegistration?: string })[] {
    this.permService.requirePermission('invoices:view')
    return this.repo.listInvoices(filter)
  }

  public createFromJobCard(input: CreateJobCardInvoiceInput): InvoiceWithDetails {
    this.permService.requirePermission('invoices:create')
    const parsed = createJobCardInvoiceSchema.safeParse(input)
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message)
    }

    const session = sessionManager.requireSession()
    const invoice = this.repo.createFromJobCard(parsed.data as CreateJobCardInvoiceInput, session.userId)

    this.audit.record({
      userId: session.userId,
      action: 'INVOICE_CREATED',
      entityType: 'invoice',
      entityId: invoice.id,
      metadata: {
        invoiceNumber: invoice.invoiceNumber,
        invoiceType: 'job_card',
        jobCardId: invoice.jobCardId,
        totalAmount: invoice.totalAmount,
        status: invoice.status
      }
    })

    return invoice
  }

  public createPosInvoice(input: CreatePosInvoiceInput): InvoiceWithDetails {
    this.permService.requirePermission('invoices:create')
    const parsed = createPosInvoiceSchema.safeParse(input)
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message)
    }

    const session = sessionManager.requireSession()
    const invoice = this.repo.createPosInvoice(parsed.data as CreatePosInvoiceInput, session.userId)

    this.audit.record({
      userId: session.userId,
      action: 'POS_SALE_COMPLETED',
      entityType: 'invoice',
      entityId: invoice.id,
      metadata: {
        invoiceNumber: invoice.invoiceNumber,
        invoiceType: 'pos',
        customerId: invoice.customerId,
        totalAmount: invoice.totalAmount,
        itemCount: invoice.items.length,
        status: invoice.status
      }
    })

    return invoice
  }

  public voidInvoice(input: VoidInvoiceInput): InvoiceWithDetails {
    this.permService.requirePermission('invoices:void')
    const parsed = voidInvoiceSchema.safeParse(input)
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message)
    }

    const session = sessionManager.requireSession()
    const invoice = this.repo.voidInvoice(parsed.data, session.userId)

    this.audit.record({
      userId: session.userId,
      action: 'INVOICE_VOIDED',
      entityType: 'invoice',
      entityId: invoice.id,
      metadata: {
        invoiceNumber: invoice.invoiceNumber,
        reason: input.voidReason
      }
    })

    return invoice
  }
}
