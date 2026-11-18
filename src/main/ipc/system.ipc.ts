import { registerIpcHandler } from './ipc-wrapper'
import { SystemService } from '../services/system.service'
import { AuditService } from '../services/audit.service'

export function registerSystemIpcHandlers(
  systemService = new SystemService(),
  auditService = new AuditService()
): void {
  registerIpcHandler('system:getHealthInfo', async () => {
    return systemService.getHealthInfo()
  })

  registerIpcHandler('system:vacuum', async () => {
    return systemService.vacuumDatabase()
  })

  registerIpcHandler('audit:getTrail', async (_event, filters?: any) => {
    return auditService.getAuditTrail(filters)
  })
}
