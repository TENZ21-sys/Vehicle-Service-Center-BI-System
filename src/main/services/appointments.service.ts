import { AppointmentsRepository } from '../repositories/appointments.repo'
import { SettingsRepository } from '../repositories/settings.repo'
import { PermissionService } from './permissions.service'
import { AuditService } from './audit.service'
import { sessionManager } from './session'
import {
  AppointmentWithDetails,
  AppointmentStatus,
  CreateAppointmentInput,
  UpdateAppointmentInput,
  UpdateAppointmentStatusInput,
  ConvertAppointmentToJobCardInput
} from '@shared/types/appointment.types'
import {
  createAppointmentSchema,
  updateAppointmentSchema,
  updateAppointmentStatusSchema,
  convertAppointmentToJobCardSchema
} from '@shared/validation/appointment.schema'
import { ValidationError, NotFoundError } from '../utils/errors'

export class AppointmentsService {
  private repo: AppointmentsRepository
  private settingsRepo: SettingsRepository
  private permService: PermissionService
  private audit: AuditService

  constructor(
    repo = new AppointmentsRepository(),
    settingsRepo = new SettingsRepository(),
    permService = new PermissionService(),
    audit = new AuditService()
  ) {
    this.repo = repo
    this.settingsRepo = settingsRepo
    this.permService = permService
    this.audit = audit
  }

  private checkModuleEnabled(): void {
    const toggle = this.settingsRepo.get('feature_toggles', 'module_appointments')
    if (toggle && toggle.value === false) {
      throw new ValidationError('Appointments module is currently disabled in system settings.')
    }
  }

  public getById(id: string): AppointmentWithDetails {
    this.checkModuleEnabled()
    this.permService.requirePermission('appointments:view')
    const apt = this.repo.getById(id)
    if (!apt) {
      throw new NotFoundError(`Appointment with ID ${id} not found`)
    }
    return apt
  }

  public listAppointments(filter?: {
    date?: string
    startDate?: string
    endDate?: string
    status?: string
    customerId?: string
    vehicleId?: string
    technicianId?: string
    search?: string
  }): AppointmentWithDetails[] {
    this.checkModuleEnabled()
    this.permService.requirePermission('appointments:view')
    return this.repo.listAppointments(filter)
  }

  public createAppointment(input: CreateAppointmentInput): AppointmentWithDetails {
    this.checkModuleEnabled()
    this.permService.requirePermission('appointments:create')
    const parsed = createAppointmentSchema.safeParse(input)
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message)
    }

    const session = sessionManager.requireSession()
    const apt = this.repo.createAppointment(parsed.data as CreateAppointmentInput, session.userId)

    this.audit.record({
      userId: session.userId,
      action: 'APPOINTMENT_CREATED',
      entityType: 'appointment',
      entityId: apt.id,
      metadata: {
        appointmentNumber: apt.appointmentNumber,
        scheduledDate: apt.scheduledDate,
        scheduledTime: apt.scheduledTime,
        customerId: apt.customerId,
        vehicleId: apt.vehicleId
      }
    })

    return apt
  }

  public updateAppointment(id: string, input: UpdateAppointmentInput): AppointmentWithDetails {
    this.checkModuleEnabled()
    this.permService.requirePermission('appointments:edit')
    const parsed = updateAppointmentSchema.safeParse(input)
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message)
    }

    const session = sessionManager.requireSession()
    const apt = this.repo.updateAppointment(id, parsed.data)

    this.audit.record({
      userId: session.userId,
      action: 'APPOINTMENT_UPDATED',
      entityType: 'appointment',
      entityId: apt.id,
      metadata: {
        appointmentNumber: apt.appointmentNumber
      }
    })

    return apt
  }

  public updateStatus(id: string, input: UpdateAppointmentStatusInput): AppointmentWithDetails {
    this.checkModuleEnabled()
    this.permService.requirePermission('appointments:edit')
    const parsed = updateAppointmentStatusSchema.safeParse(input)
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message)
    }

    const session = sessionManager.requireSession()
    const apt = this.repo.updateStatus(id, parsed.data.status, parsed.data.notes)

    this.audit.record({
      userId: session.userId,
      action: 'APPOINTMENT_STATUS_CHANGED',
      entityType: 'appointment',
      entityId: apt.id,
      metadata: {
        appointmentNumber: apt.appointmentNumber,
        newStatus: parsed.data.status
      }
    })

    return apt
  }

  public convertToJobCard(
    input: ConvertAppointmentToJobCardInput
  ): { appointment: AppointmentWithDetails; jobCardId: string } {
    this.checkModuleEnabled()
    this.permService.requirePermission('appointments:edit')
    this.permService.requirePermission('jobcards:create')

    const parsed = convertAppointmentToJobCardSchema.safeParse(input)
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message)
    }

    const session = sessionManager.requireSession()
    const result = this.repo.convertToJobCard(parsed.data, session.userId)

    this.audit.record({
      userId: session.userId,
      action: 'APPOINTMENT_CONVERTED_TO_JOBCARD',
      entityType: 'appointment',
      entityId: input.appointmentId,
      metadata: {
        jobCardId: result.jobCardId,
        appointmentNumber: result.appointment.appointmentNumber
      }
    })

    return result
  }
}
