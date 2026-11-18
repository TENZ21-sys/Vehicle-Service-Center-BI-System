import { registerIpcHandler } from './ipc-wrapper'
import { InventoryService } from '../services/inventory.service'

export function registerInventoryIpcHandlers(service = new InventoryService()): void {
  registerIpcHandler('inventory:listCategories', async (_event, includeInactive = false) => {
    return service.listCategories(includeInactive)
  })

  registerIpcHandler('inventory:createCategory', async (_event, data: unknown) => {
    return service.createCategory(data)
  })

  registerIpcHandler('inventory:updateCategory', async (_event, id: string, data: unknown) => {
    return service.updateCategory(id, data)
  })

  registerIpcHandler('inventory:listUnits', async (_event, includeInactive = false) => {
    return service.listUnits(includeInactive)
  })

  registerIpcHandler('inventory:createUnit', async (_event, name: string, abbreviation: string) => {
    return service.createUnit(name, abbreviation)
  })

  registerIpcHandler('inventory:listItems', async (_event, filter?: any) => {
    return service.listItems(filter)
  })

  registerIpcHandler('inventory:getItem', async (_event, id: string) => {
    return service.getItemById(id)
  })

  registerIpcHandler('inventory:createItem', async (_event, data: unknown) => {
    return service.createItem(data)
  })

  registerIpcHandler('inventory:updateItem', async (_event, id: string, data: unknown) => {
    return service.updateItem(id, data)
  })

  registerIpcHandler('inventory:deactivateItem', async (_event, id: string) => {
    service.deactivateItem(id)
    return true
  })

  registerIpcHandler('inventory:adjustStock', async (_event, data: unknown) => {
    return service.adjustStock(data)
  })

  registerIpcHandler('inventory:getItemMovements', async (_event, itemId: string, limit = 50) => {
    return service.getItemMovements(itemId, limit)
  })
}
