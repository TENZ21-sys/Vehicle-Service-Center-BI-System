import { MoneyAmount } from './money.types'
import { Customer } from './customer.types'
import { Vehicle } from './vehicle.types'

export type QuotationStatus = 'Draft' | 'Sent' | 'Approved' | 'Rejected' | 'Expired'

export type QuotationItemType = 'service' | 'part'

export interface QuotationItem {
  id: string
  quotationId: string
  itemType: QuotationItemType
  referenceId?: string | null
  description: string
  quantity: number
  unitPriceAmount: MoneyAmount
  costPriceAmount: MoneyAmount
  discountAmount: MoneyAmount
  taxRate: number // basis points, e.g. 1500 = 15.00%
  taxAmount: MoneyAmount
  totalAmount: MoneyAmount
  sortOrder: number
  createdAt: string
}

export interface Quotation {
  id: string
  quotationNumber: string
  customerId: string
  vehicleId?: string | null
  status: QuotationStatus
  subtotalAmount: MoneyAmount
  taxAmount: MoneyAmount
  discountAmount: MoneyAmount
  totalAmount: MoneyAmount
  validityDays: number
  expiresAt: string
  notes?: string | null
  jobCardId?: string | null
  createdBy?: string | null
  createdByName?: string | null
  approvedBy?: string | null
  approvedByName?: string | null
  approvedAt?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface QuotationWithDetails extends Quotation {
  customer: Customer
  vehicle?: Vehicle | null
  items: QuotationItem[]
}

export interface QuotationItemLineInput {
  itemType: QuotationItemType
  referenceId?: string | null
  description: string
  quantity: number
  unitPriceAmount: MoneyAmount
  costPriceAmount?: MoneyAmount
  discountAmount?: MoneyAmount
  taxRate?: number
}

export interface CreateQuotationInput {
  customerId: string
  vehicleId?: string | null
  items: QuotationItemLineInput[]
  validityDays?: number
  discountAmount?: MoneyAmount
  taxRate?: number
  notes?: string | null
}

export interface UpdateQuotationInput {
  customerId?: string
  vehicleId?: string | null
  items?: QuotationItemLineInput[]
  validityDays?: number
  discountAmount?: MoneyAmount
  taxRate?: number
  notes?: string | null
}

export interface ConvertQuotationToJobCardInput {
  quotationId: string
  technicianId?: string | null
  mileageIn?: number | null
  priority?: string
  internalNotes?: string | null
}
