import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import * as fs from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { MasterDatabaseManager } from './database/master'
import { DatabaseManager } from './database/connection'
import { logger } from './utils/logger'
import { registerBusinessIpcHandlers } from './ipc/business.ipc'
import { registerAuthIpcHandlers } from './ipc/auth.ipc'
import { registerSettingsIpcHandlers } from './ipc/settings.ipc'
import { registerCustomerIpcHandlers } from './ipc/customers.ipc'
import { registerVehicleIpcHandlers } from './ipc/vehicles.ipc'
import { registerCatalogueIpcHandlers } from './ipc/catalogue.ipc'
import { registerInventoryIpcHandlers } from './ipc/inventory.ipc'
import { registerSuppliersIpcHandlers } from './ipc/suppliers.ipc'
import { registerPurchasesIpcHandlers } from './ipc/purchases.ipc'
import { registerJobCardIpcHandlers } from './ipc/job-cards.ipc'
import { registerInvoiceIpcHandlers } from './ipc/invoices.ipc'
import { registerPaymentIpcHandlers } from './ipc/payments.ipc'
import { registerAppointmentIpcHandlers } from './ipc/appointments.ipc'
import { registerQuotationIpcHandlers } from './ipc/quotations.ipc'
import { registerFinanceIpcHandlers } from './ipc/finance.ipc'
import { registerAnalyticsIpcHandlers } from './ipc/analytics.ipc'
import { registerBackupIpcHandlers } from './ipc/backup.ipc'
import { registerExportIpcHandlers } from './ipc/export.ipc'
import { registerImportIpcHandlers } from './ipc/import.ipc'
import { registerSystemIpcHandlers } from './ipc/system.ipc'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 680,
    show: false,
    title: 'Vehicle Service Center',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  // Set app user model id for Windows
  electronApp.setAppUserModelId('com.vsc.app')

  // Initialize Logger
  const userDataPath = app.getPath('userData')
  logger.init(userDataPath, is.dev ? 'DEBUG' : 'INFO')
  logger.info('Application starting up...')

  // Initialize Master Registry DB & Migrations
  try {
    let migrationsDir = join(process.cwd(), 'src/main/database/migrations')
    if (app.isPackaged) {
      const resourcesMigrations = join(process.resourcesPath, 'migrations')
      if (fs.existsSync(resourcesMigrations)) {
        migrationsDir = resourcesMigrations
      } else {
        migrationsDir = join(__dirname, 'database/migrations')
      }
    } else if (!fs.existsSync(migrationsDir)) {
      migrationsDir = join(__dirname, 'database/migrations')
    }

    MasterDatabaseManager.getInstance(userDataPath, migrationsDir)
    DatabaseManager.getInstance(userDataPath)
    logger.info('Master database and database manager initialized.')
  } catch (err) {
    logger.error('Failed to initialize master database:', err)
  }

  // Register all IPC handlers
  registerBusinessIpcHandlers()
  registerAuthIpcHandlers()
  registerSettingsIpcHandlers()
  registerCustomerIpcHandlers()
  registerVehicleIpcHandlers()
  registerCatalogueIpcHandlers()
  registerInventoryIpcHandlers()
  registerSuppliersIpcHandlers()
  registerPurchasesIpcHandlers()
  registerJobCardIpcHandlers()
  registerInvoiceIpcHandlers()
  registerPaymentIpcHandlers()
  registerAppointmentIpcHandlers()
  registerQuotationIpcHandlers()
  registerFinanceIpcHandlers()
  registerAnalyticsIpcHandlers()
  registerBackupIpcHandlers()
  registerExportIpcHandlers()
  registerImportIpcHandlers()
  registerSystemIpcHandlers()

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
