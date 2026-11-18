import { registerIpcHandler } from './ipc-wrapper'
import { AppointmentsService } from '../services/appointments.service'

export function registerAppointmentIpcHandlers(service = new AppointmentsService()): void {
  registerIpcHandler('appointments:get', async (_event, id: string) => {
    return service.getById(id)
  })

  registerIpcHandler('appointments:list', async (_event, filter?: any) => {
    return service.listAppointments(filter)
  })

  registerIpcHandler('appointments:create', async (_event, data: any) => {
    return service.createAppointment(data)
  })

  registerIpcHandler('appointments:update', async (_event, id: string, data: any) => {
    return service.updateAppointment(id, data)
  })

  registerIpcHandler('appointments:updateStatus', async (_event, id: string, data: any) => {
    return service.updateStatus(id, data)
  })

  registerIpcHandler('appointments:convertToJobCard', async (_event, data: any) => {
    return service.convertToJobCard(data)
  })
}
