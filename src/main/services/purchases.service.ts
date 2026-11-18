import { PurchasesRepository } from '../repositories/purchases.repo'
import { PermissionService } from './permissions.service'
import { AuditService } from './audit.service'
import { sessionManager } from './session'
import { Purchase } from '@shared/types/inventory.types'
import { createPurchaseSchema } from '@shared/validation/inventory.schema'
import { ValidationError, NotFoundError } from '../utils/errors'

export class PurchasesService {
  private repo: PurchasesRepository
  private permService: PermissionService
  private audit: AuditService

  constructor(
    repo = new PurchasesRepository(),
    permService = new PermissionService(),
    audit = new AuditService()
  ) {
    this.repo = repo
    this.permService = permService
    this.audit = audit
  }

  public listPurchases(filter?: { supplierId?: string; limit?: number }): Purchase[] {
    this.permService.requirePermission('purchases:view')
    return this.repo.listPurchases(filter)
  }

  public getPurchaseById(id: string): Purchase {
    this.permService.requirePermission('purchases:view')
    const purchase = this.repo.getPurchaseById(id)
    if (!purchase) {
      throw new NotFoundError('Purchase Order', id)
    }
    return purchase
  }

  public createPurchase(input: unknown): Purchase {
    this.permService.requirePermission('purchases:create')
    const parse = createPurchaseSchema.safeParse(input)
    if (!parse.success) {
      throw new ValidationError(parse.error.issues[0]?.message || 'Invalid purchase data', parse.error.issues)
    }

    const session = sessionManager.requireSession()
    const purchase = this.repo.createPurchase(parse.data as any, session.userId)

    this.audit.record({
      userId: session.userId,
      action: 'PURCHASE_ORDER_CREATED',
      entityType: 'purchase',
      entityId: purchase.id,
      metadata: {
        purchaseNumber: purchase.purchaseNumber,
        supplierId: purchase.supplierId,
        supplierName: purchase.supplierName,
        totalAmount: purchase.totalAmount,
        itemCount: purchase.items?.length || 0
      }
    })

    return purchase
  }
}
