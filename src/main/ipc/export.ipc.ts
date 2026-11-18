import { registerIpcHandler } from './ipc-wrapper'
import { ExportService } from '../services/export.service'
import { ExportType } from '../../shared/types/backup.types'

export function registerExportIpcHandlers(service = new ExportService()): void {
  registerIpcHandler('export:data', async (_event, type: ExportType) => {
    return service.exportData(type)
  })
}
