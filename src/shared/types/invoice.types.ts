import { MoneyAmount } from './money.types'
import { Customer } from './customer.types'
import { Vehicle } from './vehicle.types'

export type InvoiceType = 'job_card' | 'pos'

export type InvoiceStatus = 'Unpaid' | 'Partial' | 'Paid' | 'Void'

export type InvoiceItemType = 'service' | 'part'

export interface InvoiceItem {
  id: string
  invoiceId: string
  itemType: InvoiceItemType
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

export interface Payment {
  id: string
  invoiceId: string
  paymentMethod: string
  amount: MoneyAmount
  reference?: string | null
  notes?: string | null
  receivedBy?: string | null
  receivedByName?: string | null
  createdAt: string
}

export interface Invoice {
  id: string
  invoiceNumber: string
  customerId: string
  vehicleId?: string | null
  jobCardId?: string | null
  quotationId?: string | null
  invoiceType: InvoiceType
  status: InvoiceStatus
  subtotalAmount: MoneyAmount
  taxAmount: MoneyAmount
  discountAmount: MoneyAmount
  roundingAmount: MoneyAmount
  totalAmount: MoneyAmount
  paidAmount: MoneyAmount
  dueAmount: MoneyAmount
  notes?: string | null
  voidReason?: string | null
  voidedAt?: string | null
  voidedBy?: string | null
  voidedByName?: string | null
  creditNoteOf?: string | null
  createdBy?: string | null
  createdByName?: string | null
  createdAt: string
  updatedAt: string
}

export interface InvoiceWithDetails extends Invoice {
  customer: Customer
  vehicle?: Vehicle | null
  items: InvoiceItem[]
  payments: Payment[]
}

export interface CreateJobCardInvoiceInput {
  jobCardId: string
  taxRate?: number // basis points, e.g. 0 or 1500; defaults to settings
  discountAmount?: MoneyAmount
  notes?: string | null
  immediatePayment?: {
    paymentMethod: string
    amount: MoneyAmount
    reference?: string | null
    notes?: string | null
  }
}

export interface PosItemLineInput {
  itemType: InvoiceItemType
  referenceId?: string | null
  description: string
  quantity: number
  unitPriceAmount: MoneyAmount
  costPriceAmount?: MoneyAmount
  discountAmount?: MoneyAmount
  taxRate?: number
}

export interface CreatePosInvoiceInput {
  customerId: string
  vehicleId?: string | null
  items: PosItemLineInput[]
  discountAmount?: MoneyAmount
  taxRate?: number
  notes?: string | null
  immediatePayment?: {
    paymentMethod: string
    amount: MoneyAmount
    reference?: string | null
    notes?: string | null
  }
}

export interface RecordPaymentInput {
  invoiceId: string
  paymentMethod: string
  amount: MoneyAmount
  reference?: string | null
  notes?: string | null
}

export interface VoidInvoiceInput {
  invoiceId: string
  voidReason: string
}
