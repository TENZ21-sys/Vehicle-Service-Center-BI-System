import { registerIpcHandler } from './ipc-wrapper'
import { JobCardService } from '../services/job-cards.service'

export function registerJobCardIpcHandlers(service = new JobCardService()): void {
  registerIpcHandler('jobcards:list', async (_event, filter?: any) => {
    return service.listJobCards(filter)
  })

  registerIpcHandler('jobcards:get', async (_event, id: string) => {
    return service.getJobCardById(id)
  })

  registerIpcHandler('jobcards:create', async (_event, data: unknown) => {
    return service.createJobCard(data)
  })

  registerIpcHandler('jobcards:update', async (_event, id: string, data: unknown) => {
    return service.updateJobCard(id, data)
  })

  registerIpcHandler('jobcards:updateStatus', async (_event, id: string, data: unknown) => {
    return service.updateStatus(id, data)
  })

  registerIpcHandler('jobcards:assignTechnician', async (_event, id: string, data: unknown) => {
    return service.assignTechnician(id, data)
  })

  registerIpcHandler('jobcards:addService', async (_event, jobCardId: string, data: unknown) => {
    return service.addService(jobCardId, data)
  })

  registerIpcHandler('jobcards:updateService', async (_event, serviceLineId: string, data: unknown) => {
    return service.updateService(serviceLineId, data)
  })

  registerIpcHandler('jobcards:removeService', async (_event, serviceLineId: string) => {
    service.removeService(serviceLineId)
    return true
  })

  registerIpcHandler('jobcards:addPart', async (_event, jobCardId: string, data: unknown) => {
    return service.addPart(jobCardId, data)
  })

  registerIpcHandler('jobcards:removePart', async (_event, partLineId: string) => {
    service.removePart(partLineId)
    return true
  })
}
