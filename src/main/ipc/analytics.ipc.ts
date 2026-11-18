import { registerIpcHandler } from './ipc-wrapper'
import { AnalyticsService } from '../services/analytics.service'

export function registerAnalyticsIpcHandlers(service = new AnalyticsService()): void {
  registerIpcHandler('analytics:getFinancialSummary', async (_event, startDate: string, endDate: string) => {
    return service.getFinancialSummary(startDate, endDate)
  })

  registerIpcHandler('analytics:getWorkshopTurnaround', async (_event, startDate?: string, endDate?: string) => {
    return service.getWorkshopTurnaroundMetrics(startDate, endDate)
  })

  registerIpcHandler('analytics:getTechnicianMetrics', async (_event, startDate?: string, endDate?: string) => {
    return service.getTechnicianMetrics(startDate, endDate)
  })

  registerIpcHandler('analytics:getInventoryTurnover', async (_event) => {
    return service.getInventoryTurnoverMetrics()
  })

  registerIpcHandler('analytics:getCustomerLtv', async (_event) => {
    return service.getCustomerLtvMetrics()
  })
}
