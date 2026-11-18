import { MoneyAmount } from './money.types'
import { Customer } from './customer.types'
import { Vehicle } from './vehicle.types'

export type JobCardStatus =
  | 'Open'
  | 'In Progress'
  | 'Waiting for Parts'
  | 'Quality Check'
  | 'Ready'
  | 'Delivered'
  | string

export type JobCardPriority = 'Low' | 'Normal' | 'High' | 'Urgent' | string

export type JobCardServiceStatus = 'Pending' | 'In Progress' | 'Completed'

export interface JobCardServiceItem {
  id: string
  jobCardId: string
  serviceId?: string | null
  serviceName: string
  priceAmount: MoneyAmount
  laborAmount: MoneyAmount
  status: JobCardServiceStatus
  notes?: string | null
  createdAt: string
  updatedAt: string
}

export interface JobCardPartItem {
  id: string
  jobCardId: string
  inventoryItemId: string
  itemName: string
  itemSku?: string | null
  unitAbbr?: string | null
  quantity: number
  unitPriceAmount: MoneyAmount
  totalAmount: MoneyAmount
  stockMovementId?: string | null
  createdAt: string
  updatedAt: string
}

export interface JobCardTotals {
  subtotalServices: MoneyAmount
  subtotalLabor: MoneyAmount
  subtotalParts: MoneyAmount
  grandTotal: MoneyAmount
}

export interface JobCard {
  id: string
  jobCardNumber: string
  customerId: string
  vehicleId: string
  appointmentId?: string | null
  quotationId?: string | null
  technicianId?: string | null
  assignedBy?: string | null
  status: JobCardStatus
  priority: JobCardPriority
  mileageIn?: number | null
  mileageOut?: number | null
  findings?: string | null
  internalNotes?: string | null
  customerNotes?: string | null
  receivedAt?: string | null
  startedAt?: string | null
  completedAt?: string | null
  deliveredAt?: string | null
  invoiceId?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface JobCardWithDetails extends JobCard {
  customer: Customer
  vehicle: Vehicle
  technicianName?: string | null
  assignedByName?: string | null
  services: JobCardServiceItem[]
  parts: JobCardPartItem[]
  totals: JobCardTotals
}

export interface CreateJobCardInput {
  customerId: string
  vehicleId: string
  appointmentId?: string | null
  quotationId?: string | null
  technicianId?: string | null
  priority?: JobCardPriority
  mileageIn?: number | null
  findings?: string | null
  internalNotes?: string | null
  customerNotes?: string | null
  initialServiceIds?: string[]
}

export interface UpdateJobCardInput {
  technicianId?: string | null
  priority?: JobCardPriority
  mileageIn?: number | null
  mileageOut?: number | null
  findings?: string | null
  internalNotes?: string | null
  customerNotes?: string | null
}

export interface UpdateJobCardStatusInput {
  status: JobCardStatus
  mileageOut?: number | null
  notes?: string | null
}

export interface AssignTechnicianInput {
  technicianId: string | null
}

export interface AddJobCardServiceInput {
  serviceId?: string | null
  serviceName: string
  priceAmount: MoneyAmount
  laborAmount: MoneyAmount
  notes?: string | null
}

export interface UpdateJobCardServiceInput {
  status?: JobCardServiceStatus
  priceAmount?: MoneyAmount
  laborAmount?: MoneyAmount
  notes?: string | null
}

export interface AddJobCardPartInput {
  inventoryItemId: string
  quantity: number
  unitPriceAmount?: MoneyAmount // if not supplied, uses item selling price
}
