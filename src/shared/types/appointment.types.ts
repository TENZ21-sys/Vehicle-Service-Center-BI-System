import { Customer } from './customer.types'
import { Vehicle } from './vehicle.types'

export type AppointmentStatus =
  | 'Scheduled'
  | 'Confirmed'
  | 'In Service'
  | 'Completed'
  | 'Cancelled'
  | 'No Show'

export interface Appointment {
  id: string
  appointmentNumber: string
  customerId: string
  vehicleId: string
  scheduledDate: string // YYYY-MM-DD
  scheduledTime: string // HH:mm
  estimatedDurationMinutes: number
  technicianId?: string | null
  technicianName?: string | null
  status: AppointmentStatus
  requestedServices?: string[] | null
  notes?: string | null
  jobCardId?: string | null
  createdBy?: string | null
  createdByName?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface AppointmentWithDetails extends Appointment {
  customer: Customer
  vehicle: Vehicle
}

export interface CreateAppointmentInput {
  customerId: string
  vehicleId: string
  scheduledDate: string // YYYY-MM-DD
  scheduledTime: string // HH:mm
  estimatedDurationMinutes?: number
  technicianId?: string | null
  requestedServices?: string[] | null
  notes?: string | null
}

export interface UpdateAppointmentInput {
  scheduledDate?: string
  scheduledTime?: string
  estimatedDurationMinutes?: number
  technicianId?: string | null
  requestedServices?: string[] | null
  notes?: string | null
}

export interface UpdateAppointmentStatusInput {
  status: AppointmentStatus
  notes?: string | null
}

export interface ConvertAppointmentToJobCardInput {
  appointmentId: string
  technicianId?: string | null
  mileageIn?: number | null
  priority?: string
  internalNotes?: string | null
}
