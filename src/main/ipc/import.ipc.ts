import { registerIpcHandler } from './ipc-wrapper'
import { ImportService, ImportSector } from '../services/import.service'

export function registerImportIpcHandlers(service = new ImportService()): void {
  registerIpcHandler('import:validate', async (_event, sector: ImportSector, csvContent: string) => {
    return service.validateImport(sector, csvContent)
  })

  registerIpcHandler(
    'import:execute',
    async (_event, sector: ImportSector, csvContent: string, onDuplicate: 'skip' | 'update' = 'skip') => {
      return service.executeImport(sector, csvContent, onDuplicate)
    }
  )
}
