import { BaseEntity, UUID } from './common.types'

export type CustomFieldType = 'text' | 'number' | 'boolean' | 'select'

export interface CategoryCustomField {
  key: string
  label: string
  type: CustomFieldType
  options?: string[]
  required?: boolean
}

export interface VehicleCategory extends BaseEntity {
  name: string
  description?: string
  extraFields: CategoryCustomField[]
  sortOrder: number
  isActive: boolean
}

export interface Vehicle extends BaseEntity {
  customerId: UUID
  categoryId?: UUID
  categoryName?: string
  registrationNo: string
  make?: string
  model?: string
  year?: number
  color?: string
  vin?: string
  engineNumber?: string
  fuelType?: string
  transmission?: string
  imageUrl?: string
  extraFields?: Record<string, unknown>
  isActive: boolean
}

export interface VehicleWithCustomer extends Vehicle {
  customerName: string
  customerPhone: string
}

export type ReminderType = 'date' | 'mileage'

export interface ServiceReminder extends BaseEntity {
  vehicleId: UUID
  serviceId?: UUID
  reminderType: ReminderType
  dueDate?: string
  dueMileage?: number
  description: string
  isCompleted: boolean
  completedAt?: string
  completedJobCardId?: UUID
  isActive: boolean
  registrationNo?: string
  customerName?: string
}
