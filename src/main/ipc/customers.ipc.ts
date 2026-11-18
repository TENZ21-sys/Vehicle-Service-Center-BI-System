import { registerIpcHandler } from './ipc-wrapper'
import { CustomerService } from '../services/customers.service'

export function registerCustomerIpcHandlers(service = new CustomerService()): void {
  registerIpcHandler('customers:list', async (_event, includeInactive = false, limit = 100, offset = 0) => {
    return service.listCustomers(includeInactive, limit, offset)
  })

  registerIpcHandler('customers:get', async (_event, id: string) => {
    return service.getCustomer(id)
  })

  registerIpcHandler('customers:checkDuplicates', async (_event, phone: string, nic?: string) => {
    return service.checkDuplicates(phone, nic)
  })

  registerIpcHandler('customers:search', async (_event, query: string, limit = 20) => {
    return service.searchCustomers(query, limit)
  })

  registerIpcHandler('customers:create', async (_event, data: unknown, allowDuplicate = false) => {
    return service.createCustomer(data, allowDuplicate)
  })

  registerIpcHandler('customers:update', async (_event, id: string, data: unknown) => {
    return service.updateCustomer(id, data)
  })

  registerIpcHandler('customers:deactivate', async (_event, id: string) => {
    service.deactivateCustomer(id)
    return true
  })
}
