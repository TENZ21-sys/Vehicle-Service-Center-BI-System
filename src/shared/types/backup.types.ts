export interface BackupMetadata {
  id: string
  filename: string
  businessId: string
  sizeBytes: number
  createdAt: string
  notes?: string | null
  schemaVersion: number
}

export interface SystemHealthInfo {
  databaseSizeBytes: number
  integrityCheckResult: string
  walSizeBytes: number
  activeBusinessId: string
  businessName: string
  sqliteVersion: string
  totalMigrationsApplied: number
}

export type ExportType = 'customers' | 'invoices' | 'expenses' | 'inventory' | 'stock_movements'

export interface ExportResult {
  filename: string
  rowCount: number
  csvContent?: string
  filePath?: string
}
