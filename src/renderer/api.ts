import { ApiResponse } from '@shared/types/common.types'
import {
  AuthSession,
  User,
  StaffLookupResult,
  ChangePasswordInput,
  ResetWithSecurityAnswerInput,
  ResetWithMasterKeyInput,
  DeleteAccountInput
} from '@shared/types/user.types'
import { CustomerWithVehicles, CustomerSearchResult } from '@shared/types/customer.types'
import { VehicleWithCustomer, VehicleCategory, ServiceReminder } from '@shared/types/vehicle.types'
import { ServiceCategory, ServiceItem } from '@shared/types/catalogue.types'
import {
  InventoryCategory,
  UnitOfMeasure,
  InventoryItem,
  StockMovement,
  Supplier,
  Purchase
} from '@shared/types/inventory.types'
import {
  JobCardWithDetails,
  JobCardServiceItem,
  JobCardPartItem
} from '@shared/types/job-card.types'
import {
  Invoice,
  InvoiceWithDetails,
  Payment,
  CreateJobCardInvoiceInput,
  CreatePosInvoiceInput,
  VoidInvoiceInput,
  RecordPaymentInput
} from '@shared/types/invoice.types'
import {
  AppointmentWithDetails,
  CreateAppointmentInput,
  UpdateAppointmentInput,
  UpdateAppointmentStatusInput,
  ConvertAppointmentToJobCardInput
} from '@shared/types/appointment.types'
import {
  QuotationWithDetails,
  CreateQuotationInput,
  UpdateQuotationInput,
  QuotationStatus,
  ConvertQuotationToJobCardInput
} from '@shared/types/quotation.types'

declare global {
  interface Window {
    api: {
      business: {
        list: () => Promise<ApiResponse<Array<{ id: string; name: string; db_filename: string; created_at: string }>>>
        create: (data: unknown) => Promise<ApiResponse<{ id: string; name: string; emergencyRecoveryKey?: string }>>
        select: (id: string) => Promise<ApiResponse<{ id: string; name: string }>>
        delete: (id: string, password?: string) => Promise<ApiResponse<void>>
      }
      auth: {
        login: (username: string, password: string) => Promise<ApiResponse<AuthSession>>
        logout: () => Promise<ApiResponse<boolean>>
        getSession: () => Promise<ApiResponse<AuthSession | null>>
        changePassword: (userId: string, data: ChangePasswordInput) => Promise<ApiResponse<boolean>>
        createUser: (data: unknown) => Promise<ApiResponse<User>>
        updateUser: (userId: string, data: unknown) => Promise<ApiResponse<User>>
        deleteUser: (data: DeleteAccountInput) => Promise<ApiResponse<boolean>>
        listUsers: (includeInactive?: boolean) => Promise<ApiResponse<User[]>>
        getSecurityQuestion: (username: string) => Promise<ApiResponse<{ username: string; securityQuestion: string | null }>>
        resetWithSecurityAnswer: (data: ResetWithSecurityAnswerInput) => Promise<ApiResponse<boolean>>
        resetWithMasterKey: (data: ResetWithMasterKeyInput) => Promise<ApiResponse<boolean>>
        lookupUsername: (query: string) => Promise<ApiResponse<StaffLookupResult[]>>
        listStaffDirectory: () => Promise<ApiResponse<StaffLookupResult[]>>
        regenerateEmergencyKey: (ownerPassword: string) => Promise<ApiResponse<string>>
        listRoles: () => Promise<ApiResponse<import('@shared/types/role.types').Role[]>>
      }
      settings: {
        get: (category: string, key: string) => Promise<ApiResponse<unknown>>
        set: (category: string, key: string, value: unknown, valueType: string) => Promise<ApiResponse<unknown>>
        getByCategory: (category: string) => Promise<ApiResponse<Record<string, unknown>>>
        getFeatureToggles: () => Promise<ApiResponse<Record<string, boolean>>>
        updateProfile: (data: unknown) => Promise<ApiResponse<unknown>>
        updateToggles: (data: unknown) => Promise<ApiResponse<Record<string, boolean>>>
      }
      customers: {
        list: (includeInactive?: boolean, limit?: number, offset?: number) => Promise<ApiResponse<CustomerWithVehicles[]>>
        get: (id: string) => Promise<ApiResponse<CustomerWithVehicles>>
        checkDuplicates: (phone: string, nic?: string) => Promise<ApiResponse<{ isDuplicate: boolean; duplicateCustomer?: CustomerWithVehicles }>>
        search: (query: string, limit?: number) => Promise<ApiResponse<CustomerSearchResult[]>>
        create: (data: unknown, allowDuplicate?: boolean) => Promise<ApiResponse<CustomerWithVehicles>>
        update: (id: string, data: unknown) => Promise<ApiResponse<CustomerWithVehicles>>
        deactivate: (id: string) => Promise<ApiResponse<boolean>>
      }
      vehicles: {
        list: (includeInactive?: boolean, limit?: number, offset?: number) => Promise<ApiResponse<VehicleWithCustomer[]>>
        get: (id: string) => Promise<ApiResponse<VehicleWithCustomer>>
        getByReg: (registrationNo: string) => Promise<ApiResponse<VehicleWithCustomer | null>>
        create: (data: unknown) => Promise<ApiResponse<VehicleWithCustomer>>
        update: (id: string, data: unknown) => Promise<ApiResponse<VehicleWithCustomer>>
        deactivate: (id: string) => Promise<ApiResponse<boolean>>
        categories: {
          list: (includeInactive?: boolean) => Promise<ApiResponse<VehicleCategory[]>>
          create: (data: unknown) => Promise<ApiResponse<VehicleCategory>>
          update: (id: string, data: unknown) => Promise<ApiResponse<VehicleCategory>>
          deactivate: (id: string) => Promise<ApiResponse<boolean>>
        }
        reminders: {
          create: (data: unknown) => Promise<ApiResponse<ServiceReminder>>
          listForVehicle: (vehicleId: string) => Promise<ApiResponse<ServiceReminder[]>>
          listDue: (maxDate?: string, currentMileage?: number) => Promise<ApiResponse<ServiceReminder[]>>
          complete: (id: string, jobCardId?: string) => Promise<ApiResponse<ServiceReminder>>
        }
      }
      catalogue: {
        listCategories: (includeInactive?: boolean) => Promise<ApiResponse<ServiceCategory[]>>
        createCategory: (data: unknown) => Promise<ApiResponse<ServiceCategory>>
        updateCategory: (id: string, data: unknown) => Promise<ApiResponse<ServiceCategory>>
        listServices: (filter?: unknown) => Promise<ApiResponse<ServiceItem[]>>
        getService: (id: string) => Promise<ApiResponse<ServiceItem>>
        createService: (data: unknown) => Promise<ApiResponse<ServiceItem>>
        updateService: (id: string, data: unknown) => Promise<ApiResponse<ServiceItem>>
        deactivateService: (id: string) => Promise<ApiResponse<boolean>>
      }
      inventory: {
        listCategories: (includeInactive?: boolean) => Promise<ApiResponse<InventoryCategory[]>>
        createCategory: (data: unknown) => Promise<ApiResponse<InventoryCategory>>
        updateCategory: (id: string, data: unknown) => Promise<ApiResponse<InventoryCategory>>
        listUnits: (includeInactive?: boolean) => Promise<ApiResponse<UnitOfMeasure[]>>
        createUnit: (name: string, abbreviation: string) => Promise<ApiResponse<UnitOfMeasure>>
        listItems: (filter?: unknown) => Promise<ApiResponse<InventoryItem[]>>
        getItem: (id: string) => Promise<ApiResponse<InventoryItem>>
        createItem: (data: unknown) => Promise<ApiResponse<InventoryItem>>
        updateItem: (id: string, data: unknown) => Promise<ApiResponse<InventoryItem>>
        deactivateItem: (id: string) => Promise<ApiResponse<boolean>>
        adjustStock: (data: unknown) => Promise<ApiResponse<StockMovement>>
        getItemMovements: (itemId: string, limit?: number) => Promise<ApiResponse<StockMovement[]>>
      }
      suppliers: {
        list: (includeInactive?: boolean) => Promise<ApiResponse<Supplier[]>>
        get: (id: string) => Promise<ApiResponse<Supplier>>
        create: (data: unknown) => Promise<ApiResponse<Supplier>>
        update: (id: string, data: unknown) => Promise<ApiResponse<Supplier>>
        deactivate: (id: string) => Promise<ApiResponse<boolean>>
      }
      purchases: {
        list: (filter?: unknown) => Promise<ApiResponse<Purchase[]>>
        get: (id: string) => Promise<ApiResponse<Purchase>>
        create: (data: unknown) => Promise<ApiResponse<Purchase>>
      }
      jobcards: {
        list: (filter?: unknown) => Promise<ApiResponse<JobCardWithDetails[]>>
        get: (id: string) => Promise<ApiResponse<JobCardWithDetails>>
        create: (data: unknown) => Promise<ApiResponse<JobCardWithDetails>>
        update: (id: string, data: unknown) => Promise<ApiResponse<JobCardWithDetails>>
        updateStatus: (id: string, data: unknown) => Promise<ApiResponse<JobCardWithDetails>>
        assignTechnician: (id: string, data: unknown) => Promise<ApiResponse<JobCardWithDetails>>
        addService: (jobCardId: string, data: unknown) => Promise<ApiResponse<JobCardServiceItem>>
        updateService: (serviceLineId: string, data: unknown) => Promise<ApiResponse<JobCardServiceItem>>
        removeService: (serviceLineId: string) => Promise<ApiResponse<boolean>>
        addPart: (jobCardId: string, data: unknown) => Promise<ApiResponse<JobCardPartItem>>
        removePart: (partLineId: string) => Promise<ApiResponse<boolean>>
      }
      invoices: {
        list: (filter?: unknown) => Promise<ApiResponse<(Invoice & { customerName: string; vehicleRegistration?: string })[]>>
        get: (id: string) => Promise<ApiResponse<InvoiceWithDetails>>
        createFromJobCard: (data: CreateJobCardInvoiceInput) => Promise<ApiResponse<InvoiceWithDetails>>
        createPos: (data: CreatePosInvoiceInput) => Promise<ApiResponse<InvoiceWithDetails>>
        void: (data: VoidInvoiceInput) => Promise<ApiResponse<InvoiceWithDetails>>
      }
      payments: {
        get: (id: string) => Promise<ApiResponse<Payment>>
        listByInvoice: (invoiceId: string) => Promise<ApiResponse<Payment[]>>
        record: (data: RecordPaymentInput) => Promise<ApiResponse<Payment>>
      }
      appointments: {
        get: (id: string) => Promise<ApiResponse<AppointmentWithDetails>>
        list: (filter?: unknown) => Promise<ApiResponse<AppointmentWithDetails[]>>
        create: (data: CreateAppointmentInput) => Promise<ApiResponse<AppointmentWithDetails>>
        update: (id: string, data: UpdateAppointmentInput) => Promise<ApiResponse<AppointmentWithDetails>>
        updateStatus: (id: string, data: UpdateAppointmentStatusInput) => Promise<ApiResponse<AppointmentWithDetails>>
        convertToJobCard: (data: ConvertAppointmentToJobCardInput) => Promise<ApiResponse<{ appointment: AppointmentWithDetails; jobCardId: string }>>
      }
      quotations: {
        get: (id: string) => Promise<ApiResponse<QuotationWithDetails>>
        list: (filter?: unknown) => Promise<ApiResponse<QuotationWithDetails[]>>
        create: (data: CreateQuotationInput) => Promise<ApiResponse<QuotationWithDetails>>
        update: (id: string, data: UpdateQuotationInput) => Promise<ApiResponse<QuotationWithDetails>>
        updateStatus: (id: string, status: QuotationStatus, notes?: string) => Promise<ApiResponse<QuotationWithDetails>>
        convertToJobCard: (data: ConvertQuotationToJobCardInput) => Promise<ApiResponse<{ quotation: QuotationWithDetails; jobCardId: string }>>
      }
      finance: {
        listCategories: (includeInactive?: boolean) => Promise<ApiResponse<import('@shared/types/finance.types').ExpenseCategory[]>>
        createCategory: (data: import('@shared/types/finance.types').CreateExpenseCategoryInput) => Promise<ApiResponse<import('@shared/types/finance.types').ExpenseCategory>>
        updateCategory: (id: string, data: import('@shared/types/finance.types').UpdateExpenseCategoryInput) => Promise<ApiResponse<import('@shared/types/finance.types').ExpenseCategory>>
        listExpenses: (filter?: import('@shared/types/finance.types').ExpenseFilter) => Promise<ApiResponse<import('@shared/types/finance.types').ExpenseWithCategory[]>>
        getExpense: (id: string) => Promise<ApiResponse<import('@shared/types/finance.types').ExpenseWithCategory>>
        createExpense: (data: import('@shared/types/finance.types').CreateExpenseInput) => Promise<ApiResponse<import('@shared/types/finance.types').ExpenseWithCategory>>
        updateExpense: (id: string, data: import('@shared/types/finance.types').UpdateExpenseInput) => Promise<ApiResponse<import('@shared/types/finance.types').ExpenseWithCategory>>
        deleteExpense: (id: string) => Promise<ApiResponse<boolean>>
        getCashFlow: (startDate: string, endDate: string) => Promise<ApiResponse<import('@shared/types/finance.types').CashFlowSummary>>
      }
      analytics: {
        getFinancialSummary: (startDate: string, endDate: string) => Promise<ApiResponse<import('@shared/types/finance.types').FinancialSummary>>
        getWorkshopTurnaround: (startDate?: string, endDate?: string) => Promise<ApiResponse<import('@shared/types/finance.types').WorkshopTurnaroundMetrics>>
        getTechnicianMetrics: (startDate?: string, endDate?: string) => Promise<ApiResponse<import('@shared/types/finance.types').TechnicianMetrics[]>>
        getInventoryTurnover: () => Promise<ApiResponse<import('@shared/types/finance.types').InventoryTurnoverMetrics>>
        getCustomerLtv: () => Promise<ApiResponse<import('@shared/types/finance.types').CustomerLtvMetrics>>
      }
      backup: {
        create: (notes?: string) => Promise<ApiResponse<import('@shared/types/backup.types').BackupMetadata>>
        list: () => Promise<ApiResponse<import('@shared/types/backup.types').BackupMetadata[]>>
        restore: (filename: string) => Promise<ApiResponse<boolean>>
        delete: (filename: string) => Promise<ApiResponse<boolean>>
        cleanup: (retentionDays?: number) => Promise<ApiResponse<number>>
      }
      export: {
        data: (type: import('@shared/types/backup.types').ExportType) => Promise<ApiResponse<import('@shared/types/backup.types').ExportResult>>
      }
      import: {
        validate: (sector: string, csvContent: string) => Promise<ApiResponse<import('../main/services/import.service').ImportDryRunResult>>
        execute: (sector: string, csvContent: string, onDuplicate?: 'skip' | 'update') => Promise<ApiResponse<import('../main/services/import.service').ImportExecutionResult>>
      }
      system: {
        getHealthInfo: () => Promise<ApiResponse<import('@shared/types/backup.types').SystemHealthInfo>>
        vacuum: () => Promise<ApiResponse<{ success: boolean; freedBytes: number }>>
        getAuditTrail: (filters?: unknown) => Promise<ApiResponse<import('@shared/types/audit.types').AuditLogEntry[]>>
      }
    }
  }
}

export const api = window.api
