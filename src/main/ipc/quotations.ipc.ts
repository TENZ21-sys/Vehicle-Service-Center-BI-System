import { registerIpcHandler } from './ipc-wrapper'
import { QuotationsService } from '../services/quotations.service'

export function registerQuotationIpcHandlers(service = new QuotationsService()): void {
  registerIpcHandler('quotations:get', async (_event, id: string) => {
    return service.getById(id)
  })

  registerIpcHandler('quotations:list', async (_event, filter?: any) => {
    return service.listQuotations(filter)
  })

  registerIpcHandler('quotations:create', async (_event, data: any) => {
    return service.createQuotation(data)
  })

  registerIpcHandler('quotations:update', async (_event, id: string, data: any) => {
    return service.updateQuotation(id, data)
  })

  registerIpcHandler('quotations:updateStatus', async (_event, id: string, status: any, notes?: string) => {
    return service.updateStatus(id, status, notes)
  })

  registerIpcHandler('quotations:convertToJobCard', async (_event, data: any) => {
    return service.convertToJobCard(data)
  })
}
