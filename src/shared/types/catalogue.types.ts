import { MoneyAmount } from './money.types'

export interface ServiceCategory {
  id: string
  name: string
  description?: string | null
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface ServiceItem {
  id: string
  categoryId?: string | null
  categoryName?: string | null
  name: string
  description?: string | null
  basePriceAmount: MoneyAmount
  laborChargeAmount: MoneyAmount
  estimatedMinutes?: number | null
  isActive: boolean
  applicableVehicleCategoryIds?: string[]
  createdAt: string
  updatedAt: string
}

export interface ServiceVehicleCategoryLink {
  serviceId: string
  vehicleCategoryId: string
}

export interface CreateServiceInput {
  categoryId?: string | null
  name: string
  description?: string | null
  basePriceAmount: MoneyAmount
  laborChargeAmount: MoneyAmount
  estimatedMinutes?: number | null
  vehicleCategoryIds?: string[]
}

export interface UpdateServiceInput {
  categoryId?: string | null
  name?: string
  description?: string | null
  basePriceAmount?: MoneyAmount
  laborChargeAmount?: MoneyAmount
  estimatedMinutes?: number | null
  vehicleCategoryIds?: string[]
}

export interface CreateServiceCategoryInput {
  name: string
  description?: string | null
  sortOrder?: number
}

export interface UpdateServiceCategoryInput {
  name?: string
  description?: string | null
  sortOrder?: number
}
