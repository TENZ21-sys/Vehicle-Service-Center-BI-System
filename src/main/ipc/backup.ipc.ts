import { registerIpcHandler } from './ipc-wrapper'
import { BackupService } from '../services/backup.service'

export function registerBackupIpcHandlers(service = new BackupService()): void {
  registerIpcHandler('backup:create', async (_event, notes?: string) => {
    return service.createBackup(notes)
  })

  registerIpcHandler('backup:list', async () => {
    return service.listBackups()
  })

  registerIpcHandler('backup:restore', async (_event, backupFilename: string) => {
    return service.restoreBackup(backupFilename)
  })

  registerIpcHandler('backup:delete', async (_event, backupFilename: string) => {
    return service.deleteBackup(backupFilename)
  })

  registerIpcHandler('backup:cleanup', async (_event, retentionDays?: number) => {
    return service.cleanupOldBackups(retentionDays)
  })
}
