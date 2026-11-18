import { MoneyAmount } from './money.types'

export interface ExpenseCategory {
  id: string
  name: string
  description?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type ExpensePaymentMethod = 'Cash' | 'Credit Card' | 'Debit Card' | 'Bank Transfer' | 'Cheque'

export interface Expense {
  id: string
  expenseNumber: string
  categoryId: string
  amount: MoneyAmount
  paymentMethod: ExpensePaymentMethod
  paidTo?: string | null
  referenceNo?: string | null
  notes?: string | null
  expenseDate: string // YYYY-MM-DD
  createdBy?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface ExpenseWithCategory extends Expense {
  category: ExpenseCategory
  createdByUsername?: string | null
}

export interface CreateExpenseInput {
  categoryId: string
  amount: MoneyAmount
  paymentMethod?: ExpensePaymentMethod
  paidTo?: string
  referenceNo?: string
  notes?: string
  expenseDate?: string // YYYY-MM-DD, defaults to today
}

export interface UpdateExpenseInput {
  categoryId?: string
  amount?: MoneyAmount
  paymentMethod?: ExpensePaymentMethod
  paidTo?: string
  referenceNo?: string
  notes?: string
  expenseDate?: string
}

export interface CreateExpenseCategoryInput {
  name: string
  description?: string
}

export interface UpdateExpenseCategoryInput {
  name?: string
  description?: string
  isActive?: boolean
}

export interface ExpenseFilter {
  categoryId?: string
  startDate?: string
  endDate?: string
  paymentMethod?: string
  search?: string
}

export interface DateRangeFilter {
  startDate: string // YYYY-MM-DD
  endDate: string   // YYYY-MM-DD
}

export interface CategoryExpenseBreakdown {
  categoryId: string
  categoryName: string
  totalAmount: MoneyAmount
  count: number
  percentage: number
}

export interface FinancialSummary {
  dateRange: {
    startDate: string
    endDate: string
  }
  totalRevenue: MoneyAmount
  serviceRevenue: MoneyAmount
  partsRevenue: MoneyAmount
  partsCogs: MoneyAmount
  grossProfit: MoneyAmount
  grossMarginPercent: number
  totalExpenses: MoneyAmount
  netProfit: MoneyAmount
  netMarginPercent: number
  expensesByCategory: CategoryExpenseBreakdown[]
}

export interface CashFlowSummary {
  dateRange: {
    startDate: string
    endDate: string
  }
  totalInflows: MoneyAmount
  totalOutflows: MoneyAmount
  netCashFlow: MoneyAmount
  inflowsByMethod: Record<string, MoneyAmount>
  outflowsByMethod: Record<string, MoneyAmount>
  cashRegisterClosingBalance: MoneyAmount
}

export interface TechnicianMetrics {
  technicianId: string
  technicianName: string
  completedJobCardsCount: number
  totalLabourRevenue: MoneyAmount
  estimatedLabourHours: number
  commissionAmount: MoneyAmount
}

export interface ServicePopularityItem {
  serviceName: string
  count: number
  revenue: MoneyAmount
}

export interface WorkshopTurnaroundMetrics {
  totalCompletedJobs: number
  averageDurationHours: number
  shortestDurationHours: number
  longestDurationHours: number
  onTimeRatePercent: number
  servicePopularity: ServicePopularityItem[]
}

export interface DeadStockItem {
  id: string
  sku: string
  name: string
  quantity: number
  costPriceAmount: MoneyAmount
  lastMovementDate: string | null
}

export interface TopSellingPart {
  id: string
  sku: string
  name: string
  unitsSold: number
  totalRevenueAmount: MoneyAmount
}

export interface InventoryTurnoverMetrics {
  totalStockAssetValue: MoneyAmount
  totalRetailValue: MoneyAmount
  potentialProfit: MoneyAmount
  deadStockCount: number
  deadStockItems: DeadStockItem[]
  topSellingParts: TopSellingPart[]
}

export interface TopCustomer {
  id: string
  name: string
  phone?: string | null
  visitsCount: number
  totalSpentAmount: MoneyAmount
  lastVisitDate: string
}

export interface CustomerLtvMetrics {
  totalActiveCustomers: number
  repeatCustomerRatePercent: number
  averageCustomerSpendAmount: MoneyAmount
  topCustomers: TopCustomer[]
}
