export type UUID = string

export type ISODateTimeString = string

export type ISODateString = string

export interface BaseEntity {
  id: UUID
  createdAt: ISODateTimeString
  updatedAt: ISODateTimeString
  isActive?: boolean
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: unknown
  }
}
