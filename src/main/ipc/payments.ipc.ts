import { registerIpcHandler } from './ipc-wrapper'
import { PaymentsService } from '../services/payments.service'

export function registerPaymentIpcHandlers(service = new PaymentsService()): void {
  registerIpcHandler('payments:get', async (_event, id: string) => {
    return service.getById(id)
  })

  registerIpcHandler('payments:listByInvoice', async (_event, invoiceId: string) => {
    return service.listByInvoice(invoiceId)
  })

  registerIpcHandler('payments:record', async (_event, data: any) => {
    return service.recordPayment(data)
  })
}
