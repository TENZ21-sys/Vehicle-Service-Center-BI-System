import { registerIpcHandler } from './ipc-wrapper'
import { FinanceService } from '../services/finance.service'

export function registerFinanceIpcHandlers(service = new FinanceService()): void {
  // Categories
  registerIpcHandler('finance:listCategories', async (_event, includeInactive?: boolean) => {
    return service.listCategories(includeInactive)
  })

  registerIpcHandler('finance:createCategory', async (_event, data: any) => {
    return service.createCategory(data)
  })

  registerIpcHandler('finance:updateCategory', async (_event, id: string, data: any) => {
    return service.updateCategory(id, data)
  })

  // Expenses
  registerIpcHandler('finance:listExpenses', async (_event, filter?: any) => {
    return service.listExpenses(filter)
  })

  registerIpcHandler('finance:getExpense', async (_event, id: string) => {
    return service.getExpenseById(id)
  })

  registerIpcHandler('finance:createExpense', async (_event, data: any) => {
    return service.createExpense(data)
  })

  registerIpcHandler('finance:updateExpense', async (_event, id: string, data: any) => {
    return service.updateExpense(id, data)
  })

  registerIpcHandler('finance:deleteExpense', async (_event, id: string) => {
    return service.deleteExpense(id)
  })

  // Cash Flow
  registerIpcHandler('finance:getCashFlow', async (_event, startDate: string, endDate: string) => {
    return service.getCashFlowSummary(startDate, endDate)
  })
}
