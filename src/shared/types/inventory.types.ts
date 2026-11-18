import { MoneyAmount } from './money.types'

export interface InventoryCategory {
  id: string
  name: string
  description?: string | null
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface UnitOfMeasure {
  id: string
  name: string
  abbreviation: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface InventoryItem {
  id: string
  sku?: string | null
  name: string
  description?: string | null
  categoryId?: string | null
  categoryName?: string | null
  unitId?: string | null
  unitAbbr?: string | null
  costPriceAmount: MoneyAmount
  sellingPriceAmount: MoneyAmount
  reorderLevel: number
  location?: string | null
  isActive: boolean
  currentStock: number // Computed from SUM(quantity) of stock_movements
  isLowStock: boolean  // Computed as (currentStock <= reorderLevel)
  createdAt: string
  updatedAt: string
}

export type StockMovementType =
  | 'purchase_in'
  | 'job_card_out'
  | 'pos_sale_out'
  | 'adjustment_in'
  | 'adjustment_out'
  | 'return_in'
  | 'void_reversal'

export type StockReferenceType = 'purchase' | 'job_card' | 'invoice' | 'adjustment' | 'invoice_void'

export interface StockMovement {
  id: string
  itemId: string
  itemName?: string
  movementType: StockMovementType
  quantity: number // positive for additions, negative for reductions
  referenceType?: StockReferenceType | null
  referenceId?: string | null
  reason?: string | null
  costPriceAmount?: MoneyAmount | null
  createdBy?: string | null
  createdByName?: string | null
  createdAt: string
}

export interface Supplier {
  id: string
  name: string
  contactPerson?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  notes?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface PurchaseItem {
  id: string
  purchaseId: string
  itemId: string
  itemName?: string
  itemSku?: string | null
  unitAbbr?: string | null
  quantity: number
  unitCostAmount: MoneyAmount
  totalAmount: MoneyAmount
  stockMovementId?: string | null
  createdAt: string
}

export interface Purchase {
  id: string
  supplierId?: string | null
  supplierName?: string | null
  purchaseNumber: string
  purchaseDate: string
  totalAmount: MoneyAmount
  notes?: string | null
  createdBy?: string | null
  createdByName?: string | null
  isActive: boolean
  items?: PurchaseItem[]
  createdAt: string
  updatedAt: string
}

export interface CreateInventoryItemInput {
  sku?: string | null
  name: string
  description?: string | null
  categoryId?: string | null
  unitId?: string | null
  costPriceAmount: MoneyAmount
  sellingPriceAmount: MoneyAmount
  reorderLevel?: number
  location?: string | null
  initialStock?: number // Optional initial quantity; if > 0, creates an initial adjustment_in movement
}

export interface UpdateInventoryItemInput {
  sku?: string | null
  name?: string
  description?: string | null
  categoryId?: string | null
  unitId?: string | null
  costPriceAmount?: MoneyAmount
  sellingPriceAmount?: MoneyAmount
  reorderLevel?: number
  location?: string | null
}

export interface CreateStockAdjustmentInput {
  itemId: string
  quantity: number // positive to add stock, negative to reduce
  reason: string   // REQUIRED
}

export interface CreateSupplierInput {
  name: string
  contactPerson?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  notes?: string | null
}

export interface UpdateSupplierInput {
  name?: string
  contactPerson?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  notes?: string | null
}

export interface CreatePurchaseLineInput {
  itemId: string
  quantity: number
  unitCostAmount: MoneyAmount
}

export interface CreatePurchaseInput {
  supplierId?: string | null
  purchaseDate: string
  notes?: string | null
  items: CreatePurchaseLineInput[]
}
