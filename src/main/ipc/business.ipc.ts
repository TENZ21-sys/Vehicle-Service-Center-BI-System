import { registerIpcHandler } from './ipc-wrapper'
import { BusinessService } from '../services/business.service'

export function registerBusinessIpcHandlers(service = new BusinessService()): void {
  registerIpcHandler('business:list', async () => {
    return service.listBusinesses()
  })

  registerIpcHandler('business:create', async (_event, input: unknown) => {
    return service.createBusiness(input)
  })

  registerIpcHandler('business:select', async (_event, id: string) => {
    return service.selectBusiness(id)
  })

  registerIpcHandler('business:delete', async (_event, id: string, password?: string) => {
    return service.deleteBusiness(id, password)
  })
}
