import { BaseEntity, UUID } from './common.types'
import { Vehicle } from './vehicle.types'

export interface Customer extends BaseEntity {
  name: string
  phonePrimary: string
  phoneSecondary?: string
  email?: string
  address?: string
  nic?: string
  notes?: string
  isActive: boolean
}

export interface CustomerWithVehicles extends Customer {
  vehicles: Vehicle[]
  totalVehicles?: number
  outstandingBalanceAmount?: number
}

export interface CustomerSearchResult {
  id: UUID
  name: string
  phonePrimary: string
  nic?: string
  vehicleCount: number
}
