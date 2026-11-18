import { BaseEntity, UUID } from './common.types'

export type SettingValueType = 'string' | 'number' | 'boolean' | 'json'

export interface Setting extends BaseEntity {
  category: string
  key: string
  value: unknown
  valueType: SettingValueType
  updatedBy?: UUID
}

export interface BusinessProfileSettings {
  businessName: string
  address: string
  phone: string
  email: string
  logoPath?: string
  currencyCode: string
  currencySymbol: string
  currencyDecimals: number
}

export interface FeatureTogglesSettings {
  module_appointments: boolean
  module_quotations: boolean
  module_inventory: boolean
  module_finance: boolean
  module_bi: boolean
}
