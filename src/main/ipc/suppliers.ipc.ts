import { registerIpcHandler } from './ipc-wrapper'
import { SuppliersService } from '../services/suppliers.service'

export function registerSuppliersIpcHandlers(service = new SuppliersService()): void {
  registerIpcHandler('suppliers:list', async (_event, includeInactive = false) => {
    return service.listSuppliers(includeInactive)
  })

  registerIpcHandler('suppliers:get', async (_event, id: string) => {
    return service.getSupplierById(id)
  })

  registerIpcHandler('suppliers:create', async (_event, data: unknown) => {
    return service.createSupplier(data)
  })

  registerIpcHandler('suppliers:update', async (_event, id: string, data: unknown) => {
    return service.updateSupplier(id, data)
  })

  registerIpcHandler('suppliers:deactivate', async (_event, id: string) => {
    service.deactivateSupplier(id)
    return true
  })
}
