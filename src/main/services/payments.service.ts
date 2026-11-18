import { PaymentsRepository } from '../repositories/payments.repo'
import { InvoicesRepository } from '../repositories/invoices.repo'
import { PermissionService } from './permissions.service'
import { AuditService } from './audit.service'
import { sessionManager } from './session'
import { Payment, RecordPaymentInput } from '@shared/types/invoice.types'
import { recordPaymentSchema } from '@shared/validation/invoice.schema'
import { ValidationError, NotFoundError } from '../utils/errors'

export class PaymentsService {
  private repo: PaymentsRepository
  private invoicesRepo: InvoicesRepository
  private permService: PermissionService
  private audit: AuditService

  constructor(
    repo = new PaymentsRepository(),
    invoicesRepo = new InvoicesRepository(),
    permService = new PermissionService(),
    audit = new AuditService()
  ) {
    this.repo = repo
    this.invoicesRepo = invoicesRepo
    this.permService = permService
    this.audit = audit
  }

  public getById(id: string): Payment {
    this.permService.requirePermission('payments:view')
    const payment = this.repo.getById(id)
    if (!payment) {
      throw new NotFoundError(`Payment with ID ${id} not found`)
    }
    return payment
  }

  public listByInvoice(invoiceId: string): Payment[] {
    this.permService.requirePermission('payments:view')
    return this.repo.listByInvoice(invoiceId)
  }

  public recordPayment(input: RecordPaymentInput): Payment {
    this.permService.requirePermission('payments:create')
    const parsed = recordPaymentSchema.safeParse(input)
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message)
    }

    const session = sessionManager.requireSession()
    const payment = this.repo.recordPayment(parsed.data, session.userId)

    this.audit.record({
      userId: session.userId,
      action: 'PAYMENT_RECORDED',
      entityType: 'payment',
      entityId: payment.id,
      metadata: {
        invoiceId: payment.invoiceId,
        paymentMethod: payment.paymentMethod,
        amount: payment.amount,
        reference: payment.reference
      }
    })

    return payment
  }
}
