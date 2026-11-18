import { registerIpcHandler } from './ipc-wrapper'
import { VehicleService } from '../services/vehicles.service'
import { VehicleCategoriesService } from '../services/vehicle-categories.service'

export function registerVehicleIpcHandlers(
  vehicleService = new VehicleService(),
  categoryService = new VehicleCategoriesService()
): void {
  // Vehicle CRUD
  registerIpcHandler('vehicles:list', async (_event, includeInactive = false, limit = 100, offset = 0) => {
    return vehicleService.listVehicles(includeInactive, limit, offset)
  })

  registerIpcHandler('vehicles:get', async (_event, id: string) => {
    return vehicleService.getVehicle(id)
  })

  registerIpcHandler('vehicles:getByReg', async (_event, registrationNo: string) => {
    return vehicleService.getVehicleByRegistration(registrationNo)
  })

  registerIpcHandler('vehicles:create', async (_event, data: unknown) => {
    return vehicleService.createVehicle(data)
  })

  registerIpcHandler('vehicles:update', async (_event, id: string, data: unknown) => {
    return vehicleService.updateVehicle(id, data)
  })

  registerIpcHandler('vehicles:deactivate', async (_event, id: string) => {
    vehicleService.deactivateVehicle(id)
    return true
  })

  // Dynamic Vehicle Categories
  registerIpcHandler('vehicles:categories:list', async (_event, includeInactive = false) => {
    return categoryService.listCategories(includeInactive)
  })

  registerIpcHandler('vehicles:categories:create', async (_event, data: unknown) => {
    return categoryService.createCategory(data)
  })

  registerIpcHandler('vehicles:categories:update', async (_event, id: string, data: unknown) => {
    return categoryService.updateCategory(id, data)
  })

  registerIpcHandler('vehicles:categories:deactivate', async (_event, id: string) => {
    categoryService.deactivateCategory(id)
    return true
  })

  // Reminders
  registerIpcHandler('vehicles:reminders:create', async (_event, data: unknown) => {
    return vehicleService.createReminder(data)
  })

  registerIpcHandler('vehicles:reminders:listForVehicle', async (_event, vehicleId: string) => {
    return vehicleService.listRemindersForVehicle(vehicleId)
  })

  registerIpcHandler('vehicles:reminders:listDue', async (_event, maxDate?: string, currentMileage?: number) => {
    return vehicleService.listDueReminders(maxDate, currentMileage)
  })

  registerIpcHandler('vehicles:reminders:complete', async (_event, id: string, jobCardId?: string) => {
    return vehicleService.completeReminder(id, jobCardId)
  })
}
