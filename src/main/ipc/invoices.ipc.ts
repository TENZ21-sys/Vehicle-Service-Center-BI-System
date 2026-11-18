import { registerIpcHandler } from './ipc-wrapper'
import { InvoicesService } from '../services/invoices.service'

export function registerInvoiceIpcHandlers(service = new InvoicesService()): void {
  registerIpcHandler('invoices:get', async (_event, id: string) => {
    return service.getById(id)
  })

  registerIpcHandler('invoices:list', async (_event, filter?: any) => {
    return service.listInvoices(filter)
  })

  registerIpcHandler('invoices:createFromJobCard', async (_event, data: any) => {
    return service.createFromJobCard(data)
  })

  registerIpcHandler('invoices:createPos', async (_event, data: any) => {
    return service.createPosInvoice(data)
  })

  registerIpcHandler('invoices:void', async (_event, data: any) => {
    return service.voidInvoice(data)
  })
}
