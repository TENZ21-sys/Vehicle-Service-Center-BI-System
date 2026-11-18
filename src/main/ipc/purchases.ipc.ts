import { registerIpcHandler } from './ipc-wrapper'
import { PurchasesService } from '../services/purchases.service'

export function registerPurchasesIpcHandlers(service = new PurchasesService()): void {
  registerIpcHandler('purchases:list', async (_event, filter?: any) => {
    return service.listPurchases(filter)
  })

  registerIpcHandler('purchases:get', async (_event, id: string) => {
    return service.getPurchaseById(id)
  })

  registerIpcHandler('purchases:create', async (_event, data: unknown) => {
    return service.createPurchase(data)
  })
}
