import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

/**
 * Exposes a typed API to the renderer process via contextBridge.
 * Every IPC channel is explicitly listed here — no wildcard access.
 */
const api = {
  business: {
    list: (): Promise<unknown> => ipcRenderer.invoke('business:list'),
    create: (data: unknown): Promise<unknown> => ipcRenderer.invoke('business:create', data),
    select: (id: string): Promise<unknown> => ipcRenderer.invoke('business:select', id),
    delete: (id: string, password?: string): Promise<unknown> => ipcRenderer.invoke('business:delete', id, password)
  },
  auth: {
    login: (username: string, password: string): Promise<unknown> =>
      ipcRenderer.invoke('auth:login', username, password),
    logout: (): Promise<unknown> => ipcRenderer.invoke('auth:logout'),
    getSession: (): Promise<unknown> => ipcRenderer.invoke('auth:getSession'),
    changePassword: (userId: string, data: unknown): Promise<unknown> =>
      ipcRenderer.invoke('auth:changePassword', userId, data),
    createUser: (data: unknown): Promise<unknown> =>
      ipcRenderer.invoke('auth:createUser', data),
    updateUser: (userId: string, data: unknown): Promise<unknown> =>
      ipcRenderer.invoke('auth:updateUser', userId, data),
    deleteUser: (data: unknown): Promise<unknown> =>
      ipcRenderer.invoke('auth:deleteUser', data),
    listUsers: (includeInactive = false): Promise<unknown> =>
      ipcRenderer.invoke('auth:listUsers', includeInactive),
    getSecurityQuestion: (username: string): Promise<unknown> =>
      ipcRenderer.invoke('auth:getSecurityQuestion', username),
    resetWithSecurityAnswer: (data: unknown): Promise<unknown> =>
      ipcRenderer.invoke('auth:resetWithSecurityAnswer', data),
    resetWithMasterKey: (data: unknown): Promise<unknown> =>
      ipcRenderer.invoke('auth:resetWithMasterKey', data),
    lookupUsername: (query: string): Promise<unknown> =>
      ipcRenderer.invoke('auth:lookupUsername', query),
    listStaffDirectory: (): Promise<unknown> =>
      ipcRenderer.invoke('auth:listStaffDirectory'),
    regenerateEmergencyKey: (ownerPassword: string): Promise<unknown> =>
      ipcRenderer.invoke('auth:regenerateEmergencyKey', ownerPassword),
    listRoles: (): Promise<unknown> =>
      ipcRenderer.invoke('auth:listRoles')
  },
  settings: {
    get: (category: string, key: string): Promise<unknown> =>
      ipcRenderer.invoke('settings:get', category, key),
    set: (category: string, key: string, value: unknown, valueType: string): Promise<unknown> =>
      ipcRenderer.invoke('settings:set', category, key, value, valueType),
    getByCategory: (category: string): Promise<unknown> =>
      ipcRenderer.invoke('settings:getByCategory', category),
    getFeatureToggles: (): Promise<unknown> =>
      ipcRenderer.invoke('settings:getFeatureToggles'),
    updateProfile: (data: unknown): Promise<unknown> =>
      ipcRenderer.invoke('settings:updateProfile', data),
    updateToggles: (data: unknown): Promise<unknown> =>
      ipcRenderer.invoke('settings:updateToggles', data)
  },
  // Customers
  customers: {
    list: (includeInactive = false, limit = 100, offset = 0): Promise<unknown> =>
      ipcRenderer.invoke('customers:list', includeInactive, limit, offset),
    get: (id: string): Promise<unknown> => ipcRenderer.invoke('customers:get', id),
    checkDuplicates: (phone: string, nic?: string): Promise<unknown> =>
      ipcRenderer.invoke('customers:checkDuplicates', phone, nic),
    search: (query: string, limit = 20): Promise<unknown> =>
      ipcRenderer.invoke('customers:search', query, limit),
    create: (data: unknown, allowDuplicate = false): Promise<unknown> =>
      ipcRenderer.invoke('customers:create', data, allowDuplicate),
    update: (id: string, data: unknown): Promise<unknown> =>
      ipcRenderer.invoke('customers:update', id, data),
    deactivate: (id: string): Promise<unknown> =>
      ipcRenderer.invoke('customers:deactivate', id)
  },
  // Vehicles
  vehicles: {
    list: (includeInactive = false, limit = 100, offset = 0): Promise<unknown> =>
      ipcRenderer.invoke('vehicles:list', includeInactive, limit, offset),
    get: (id: string): Promise<unknown> => ipcRenderer.invoke('vehicles:get', id),
    getByReg: (registrationNo: string): Promise<unknown> =>
      ipcRenderer.invoke('vehicles:getByReg', registrationNo),
    create: (data: unknown): Promise<unknown> =>
      ipcRenderer.invoke('vehicles:create', data),
    update: (id: string, data: unknown): Promise<unknown> =>
      ipcRenderer.invoke('vehicles:update', id, data),
    deactivate: (id: string): Promise<unknown> =>
      ipcRenderer.invoke('vehicles:deactivate', id),
    categories: {
      list: (includeInactive = false): Promise<unknown> =>
        ipcRenderer.invoke('vehicles:categories:list', includeInactive),
      create: (data: unknown): Promise<unknown> =>
        ipcRenderer.invoke('vehicles:categories:create', data),
      update: (id: string, data: unknown): Promise<unknown> =>
        ipcRenderer.invoke('vehicles:categories:update', id, data),
      deactivate: (id: string): Promise<unknown> =>
        ipcRenderer.invoke('vehicles:categories:deactivate', id)
    },
    reminders: {
      create: (data: unknown): Promise<unknown> =>
        ipcRenderer.invoke('vehicles:reminders:create', data),
      listForVehicle: (vehicleId: string): Promise<unknown> =>
        ipcRenderer.invoke('vehicles:reminders:listForVehicle', vehicleId),
      listDue: (maxDate?: string, currentMileage?: number): Promise<unknown> =>
        ipcRenderer.invoke('vehicles:reminders:listDue', maxDate, currentMileage),
      complete: (id: string, jobCardId?: string): Promise<unknown> =>
        ipcRenderer.invoke('vehicles:reminders:complete', id, jobCardId)
    }
  },
  // Catalogue
  catalogue: {
    listCategories: (includeInactive = false): Promise<unknown> =>
      ipcRenderer.invoke('catalogue:listCategories', includeInactive),
    createCategory: (data: unknown): Promise<unknown> =>
      ipcRenderer.invoke('catalogue:createCategory', data),
    updateCategory: (id: string, data: unknown): Promise<unknown> =>
      ipcRenderer.invoke('catalogue:updateCategory', id, data),
    listServices: (filter?: unknown): Promise<unknown> =>
      ipcRenderer.invoke('catalogue:listServices', filter),
    getService: (id: string): Promise<unknown> =>
      ipcRenderer.invoke('catalogue:getService', id),
    createService: (data: unknown): Promise<unknown> =>
      ipcRenderer.invoke('catalogue:createService', data),
    updateService: (id: string, data: unknown): Promise<unknown> =>
      ipcRenderer.invoke('catalogue:updateService', id, data),
    deactivateService: (id: string): Promise<unknown> =>
      ipcRenderer.invoke('catalogue:deactivateService', id)
  },
  // Inventory
  inventory: {
    listCategories: (includeInactive = false): Promise<unknown> =>
      ipcRenderer.invoke('inventory:listCategories', includeInactive),
    createCategory: (data: unknown): Promise<unknown> =>
      ipcRenderer.invoke('inventory:createCategory', data),
    updateCategory: (id: string, data: unknown): Promise<unknown> =>
      ipcRenderer.invoke('inventory:updateCategory', id, data),
    listUnits: (includeInactive = false): Promise<unknown> =>
      ipcRenderer.invoke('inventory:listUnits', includeInactive),
    createUnit: (name: string, abbreviation: string): Promise<unknown> =>
      ipcRenderer.invoke('inventory:createUnit', name, abbreviation),
    listItems: (filter?: unknown): Promise<unknown> =>
      ipcRenderer.invoke('inventory:listItems', filter),
    getItem: (id: string): Promise<unknown> =>
      ipcRenderer.invoke('inventory:getItem', id),
    createItem: (data: unknown): Promise<unknown> =>
      ipcRenderer.invoke('inventory:createItem', data),
    updateItem: (id: string, data: unknown): Promise<unknown> =>
      ipcRenderer.invoke('inventory:updateItem', id, data),
    deactivateItem: (id: string): Promise<unknown> =>
      ipcRenderer.invoke('inventory:deactivateItem', id),
    adjustStock: (data: unknown): Promise<unknown> =>
      ipcRenderer.invoke('inventory:adjustStock', data),
    getItemMovements: (itemId: string, limit = 50): Promise<unknown> =>
      ipcRenderer.invoke('inventory:getItemMovements', itemId, limit)
  },
  // Suppliers
  suppliers: {
    list: (includeInactive = false): Promise<unknown> =>
      ipcRenderer.invoke('suppliers:list', includeInactive),
    get: (id: string): Promise<unknown> =>
      ipcRenderer.invoke('suppliers:get', id),
    create: (data: unknown): Promise<unknown> =>
      ipcRenderer.invoke('suppliers:create', data),
    update: (id: string, data: unknown): Promise<unknown> =>
      ipcRenderer.invoke('suppliers:update', id, data),
    deactivate: (id: string): Promise<unknown> =>
      ipcRenderer.invoke('suppliers:deactivate', id)
  },
  // Purchases
  purchases: {
    list: (filter?: unknown): Promise<unknown> =>
      ipcRenderer.invoke('purchases:list', filter),
    get: (id: string): Promise<unknown> =>
      ipcRenderer.invoke('purchases:get', id),
    create: (data: unknown): Promise<unknown> =>
      ipcRenderer.invoke('purchases:create', data)
  },
  // Job Cards
  jobcards: {
    list: (filter?: unknown): Promise<unknown> =>
      ipcRenderer.invoke('jobcards:list', filter),
    get: (id: string): Promise<unknown> =>
      ipcRenderer.invoke('jobcards:get', id),
    create: (data: unknown): Promise<unknown> =>
      ipcRenderer.invoke('jobcards:create', data),
    update: (id: string, data: unknown): Promise<unknown> =>
      ipcRenderer.invoke('jobcards:update', id, data),
    updateStatus: (id: string, data: unknown): Promise<unknown> =>
      ipcRenderer.invoke('jobcards:updateStatus', id, data),
    assignTechnician: (id: string, data: unknown): Promise<unknown> =>
      ipcRenderer.invoke('jobcards:assignTechnician', id, data),
    addService: (jobCardId: string, data: unknown): Promise<unknown> =>
      ipcRenderer.invoke('jobcards:addService', jobCardId, data),
    updateService: (serviceLineId: string, data: unknown): Promise<unknown> =>
      ipcRenderer.invoke('jobcards:updateService', serviceLineId, data),
    removeService: (serviceLineId: string): Promise<unknown> =>
      ipcRenderer.invoke('jobcards:removeService', serviceLineId),
    addPart: (jobCardId: string, data: unknown): Promise<unknown> =>
      ipcRenderer.invoke('jobcards:addPart', jobCardId, data),
    removePart: (partLineId: string): Promise<unknown> =>
      ipcRenderer.invoke('jobcards:removePart', partLineId)
  },
  // Invoices & Billing
  invoices: {
    list: (filter?: unknown): Promise<unknown> =>
      ipcRenderer.invoke('invoices:list', filter),
    get: (id: string): Promise<unknown> =>
      ipcRenderer.invoke('invoices:get', id),
    createFromJobCard: (data: unknown): Promise<unknown> =>
      ipcRenderer.invoke('invoices:createFromJobCard', data),
    createPos: (data: unknown): Promise<unknown> =>
      ipcRenderer.invoke('invoices:createPos', data),
    void: (data: unknown): Promise<unknown> =>
      ipcRenderer.invoke('invoices:void', data)
  },
  // Payments
  payments: {
    get: (id: string): Promise<unknown> =>
      ipcRenderer.invoke('payments:get', id),
    listByInvoice: (invoiceId: string): Promise<unknown> =>
      ipcRenderer.invoke('payments:listByInvoice', invoiceId),
    record: (data: unknown): Promise<unknown> =>
      ipcRenderer.invoke('payments:record', data)
  },
  // Appointments
  appointments: {
    get: (id: string): Promise<unknown> =>
      ipcRenderer.invoke('appointments:get', id),
    list: (filter?: unknown): Promise<unknown> =>
      ipcRenderer.invoke('appointments:list', filter),
    create: (data: unknown): Promise<unknown> =>
      ipcRenderer.invoke('appointments:create', data),
    update: (id: string, data: unknown): Promise<unknown> =>
      ipcRenderer.invoke('appointments:update', id, data),
    updateStatus: (id: string, data: unknown): Promise<unknown> =>
      ipcRenderer.invoke('appointments:updateStatus', id, data),
    convertToJobCard: (data: unknown): Promise<unknown> =>
      ipcRenderer.invoke('appointments:convertToJobCard', data)
  },
  // Quotations
  quotations: {
    get: (id: string): Promise<unknown> =>
      ipcRenderer.invoke('quotations:get', id),
    list: (filter?: unknown): Promise<unknown> =>
      ipcRenderer.invoke('quotations:list', filter),
    create: (data: unknown): Promise<unknown> =>
      ipcRenderer.invoke('quotations:create', data),
    update: (id: string, data: unknown): Promise<unknown> =>
      ipcRenderer.invoke('quotations:update', id, data),
    updateStatus: (id: string, status: unknown, notes?: unknown): Promise<unknown> =>
      ipcRenderer.invoke('quotations:updateStatus', id, status, notes),
    convertToJobCard: (data: unknown): Promise<unknown> =>
      ipcRenderer.invoke('quotations:convertToJobCard', data)
  },
  // Finance
  finance: {
    listCategories: (includeInactive = false): Promise<unknown> =>
      ipcRenderer.invoke('finance:listCategories', includeInactive),
    createCategory: (data: unknown): Promise<unknown> =>
      ipcRenderer.invoke('finance:createCategory', data),
    updateCategory: (id: string, data: unknown): Promise<unknown> =>
      ipcRenderer.invoke('finance:updateCategory', id, data),
    listExpenses: (filter?: unknown): Promise<unknown> =>
      ipcRenderer.invoke('finance:listExpenses', filter),
    getExpense: (id: string): Promise<unknown> =>
      ipcRenderer.invoke('finance:getExpense', id),
    createExpense: (data: unknown): Promise<unknown> =>
      ipcRenderer.invoke('finance:createExpense', data),
    updateExpense: (id: string, data: unknown): Promise<unknown> =>
      ipcRenderer.invoke('finance:updateExpense', id, data),
    deleteExpense: (id: string): Promise<unknown> =>
      ipcRenderer.invoke('finance:deleteExpense', id),
    getCashFlow: (startDate: string, endDate: string): Promise<unknown> =>
      ipcRenderer.invoke('finance:getCashFlow', startDate, endDate)
  },
  // Analytics & BI
  analytics: {
    getFinancialSummary: (startDate: string, endDate: string): Promise<unknown> =>
      ipcRenderer.invoke('analytics:getFinancialSummary', startDate, endDate),
    getWorkshopTurnaround: (startDate?: string, endDate?: string): Promise<unknown> =>
      ipcRenderer.invoke('analytics:getWorkshopTurnaround', startDate, endDate),
    getTechnicianMetrics: (startDate?: string, endDate?: string): Promise<unknown> =>
      ipcRenderer.invoke('analytics:getTechnicianMetrics', startDate, endDate),
    getInventoryTurnover: (): Promise<unknown> =>
      ipcRenderer.invoke('analytics:getInventoryTurnover'),
    getCustomerLtv: (): Promise<unknown> =>
      ipcRenderer.invoke('analytics:getCustomerLtv')
  },
  // Backup & Recovery
  backup: {
    create: (notes?: string): Promise<unknown> =>
      ipcRenderer.invoke('backup:create', notes),
    list: (): Promise<unknown> =>
      ipcRenderer.invoke('backup:list'),
    restore: (filename: string): Promise<unknown> =>
      ipcRenderer.invoke('backup:restore', filename),
    delete: (filename: string): Promise<unknown> =>
      ipcRenderer.invoke('backup:delete', filename),
    cleanup: (retentionDays?: number): Promise<unknown> =>
      ipcRenderer.invoke('backup:cleanup', retentionDays)
  },
  // Exporting
  export: {
    data: (type: string): Promise<unknown> =>
      ipcRenderer.invoke('export:data', type)
  },
  // Data Import
  import: {
    validate: (sector: string, csvContent: string): Promise<unknown> =>
      ipcRenderer.invoke('import:validate', sector, csvContent),
    execute: (sector: string, csvContent: string, onDuplicate = 'skip'): Promise<unknown> =>
      ipcRenderer.invoke('import:execute', sector, csvContent, onDuplicate)
  },
  // System Health & Audit
  system: {
    getHealthInfo: (): Promise<unknown> =>
      ipcRenderer.invoke('system:getHealthInfo'),
    vacuum: (): Promise<unknown> =>
      ipcRenderer.invoke('system:vacuum'),
    getAuditTrail: (filters?: unknown): Promise<unknown> =>
      ipcRenderer.invoke('audit:getTrail', filters)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error('Failed to expose API via contextBridge:', error)
  }
} else {
  // @ts-expect-error window augmentation
  window.electron = electronAPI
  // @ts-expect-error window augmentation
  window.api = api
}
