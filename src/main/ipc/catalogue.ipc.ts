import { registerIpcHandler } from './ipc-wrapper'
import { CatalogueService } from '../services/catalogue.service'

export function registerCatalogueIpcHandlers(service = new CatalogueService()): void {
  registerIpcHandler('catalogue:listCategories', async (_event, includeInactive = false) => {
    return service.listCategories(includeInactive)
  })

  registerIpcHandler('catalogue:createCategory', async (_event, data: unknown) => {
    return service.createCategory(data)
  })

  registerIpcHandler('catalogue:updateCategory', async (_event, id: string, data: unknown) => {
    return service.updateCategory(id, data)
  })

  registerIpcHandler('catalogue:listServices', async (_event, filter?: any) => {
    return service.listServices(filter)
  })

  registerIpcHandler('catalogue:getService', async (_event, id: string) => {
    return service.getServiceById(id)
  })

  registerIpcHandler('catalogue:createService', async (_event, data: unknown) => {
    return service.createService(data)
  })

  registerIpcHandler('catalogue:updateService', async (_event, id: string, data: unknown) => {
    return service.updateService(id, data)
  })

  registerIpcHandler('catalogue:deactivateService', async (_event, id: string) => {
    service.deactivateService(id)
    return true
  })
}
