import { CustomerRepository } from '../repositories/customers.repo'
import { PermissionService } from './permissions.service'
import { AuditService } from './audit.service'
import { sessionManager } from './session'
import { Customer, CustomerWithVehicles, CustomerSearchResult } from '@shared/types/customer.types'
import { createCustomerSchema, updateCustomerSchema } from '@shared/validation/customer.schema'
import { ValidationError, ConflictError } from '../utils/errors'

export class CustomerService {
  private repo: CustomerRepository
  private permService: PermissionService
  private audit: AuditService

  constructor(
    repo = new CustomerRepository(),
    permService = new PermissionService(),
    audit = new AuditService()
  ) {
    this.repo = repo
    this.permService = permService
    this.audit = audit
  }

  public listCustomers(includeInactive = false, limit = 100, offset = 0): CustomerWithVehicles[] {
    this.permService.requirePermission('customers:view')
    return this.repo.findAll(includeInactive, limit, offset)
  }

  public getCustomer(id: string): CustomerWithVehicles {
    this.permService.requirePermission('customers:view')
    return this.repo.findById(id)
  }

  public checkDuplicates(phone: string, nic?: string): { isDuplicate: boolean; duplicateCustomer?: Customer } {
    this.permService.requirePermission('customers:view')
    const byPhone = this.repo.findByPhone(phone)
    if (byPhone) {
      return { isDuplicate: true, duplicateCustomer: byPhone }
    }
    if (nic && nic.trim()) {
      const byNic = this.repo.findByNic(nic)
      if (byNic) {
        return { isDuplicate: true, duplicateCustomer: byNic }
      }
    }
    return { isDuplicate: false }
  }

  public searchCustomers(query: string, limit = 20): CustomerSearchResult[] {
    this.permService.requirePermission('customers:view')
    if (!query || query.trim().length === 0) return []
    return this.repo.search(query, limit)
  }

  public createCustomer(input: unknown, allowDuplicate = false): CustomerWithVehicles {
    this.permService.requirePermission('customers:create')
    const parse = createCustomerSchema.safeParse(input)
    if (!parse.success) {
      throw new ValidationError(parse.error.issues[0]?.message || 'Invalid customer data', parse.error.issues)
    }

    const { phonePrimary, nic } = parse.data
    if (!allowDuplicate) {
      const dup = this.checkDuplicates(phonePrimary, nic)
      if (dup.isDuplicate && dup.duplicateCustomer) {
        throw new ConflictError(
          `Customer already exists with matching phone/NIC: "${dup.duplicateCustomer.name}" (${dup.duplicateCustomer.phonePrimary})`,
          { duplicateCustomer: dup.duplicateCustomer }
        )
      }
    }

    const customer = this.repo.create(parse.data)
    const session = sessionManager.getSession()

    this.audit.record({
      userId: session?.userId,
      action: 'CUSTOMER_CREATED',
      entityType: 'customer',
      entityId: customer.id,
      newValue: customer
    })

    return customer
  }

  public updateCustomer(id: string, input: unknown): CustomerWithVehicles {
    this.permService.requirePermission('customers:edit')
    const parse = updateCustomerSchema.safeParse(input)
    if (!parse.success) {
      throw new ValidationError(parse.error.issues[0]?.message || 'Invalid customer data', parse.error.issues)
    }

    const oldCustomer = this.repo.findById(id)
    const updated = this.repo.update(id, parse.data)
    const session = sessionManager.getSession()

    this.audit.record({
      userId: session?.userId,
      action: 'CUSTOMER_UPDATED',
      entityType: 'customer',
      entityId: id,
      oldValue: oldCustomer,
      newValue: updated
    })

    return updated
  }

  public deactivateCustomer(id: string): void {
    this.permService.requirePermission('customers:delete')
    const oldCustomer = this.repo.findById(id)
    this.repo.deactivate(id)
    const session = sessionManager.getSession()

    this.audit.record({
      userId: session?.userId,
      action: 'CUSTOMER_DEACTIVATED',
      entityType: 'customer',
      entityId: id,
      oldValue: oldCustomer,
      newValue: { ...oldCustomer, isActive: false }
    })
  }
}
