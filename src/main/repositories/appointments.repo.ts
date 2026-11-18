import Database from 'better-sqlite3'
import { v4 as uuidv4 } from 'uuid'
import { DatabaseManager } from '../database/connection'
import {
  Appointment,
  AppointmentWithDetails,
  AppointmentStatus,
  CreateAppointmentInput,
  UpdateAppointmentInput,
  ConvertAppointmentToJobCardInput
} from '@shared/types/appointment.types'
import { SequenceRepository } from './sequence.repo'
import { JobCardRepository } from './job-cards.repo'
import { SettingsRepository } from './settings.repo'

export class AppointmentsRepository {
  private sequenceRepo: SequenceRepository
  private jobCardRepo: JobCardRepository
  private settingsRepo: SettingsRepository
  private explicitDb?: Database.Database

  constructor(db?: Database.Database) {
    this.explicitDb = db
    this.sequenceRepo = new SequenceRepository(db)
    this.jobCardRepo = new JobCardRepository(db)
    this.settingsRepo = new SettingsRepository()
  }

  private get db(): Database.Database {
    return this.explicitDb || DatabaseManager.getInstance().getActiveDb()
  }

  private getAutoAdvanceToInService(): boolean {
    const setting = this.settingsRepo.get('appointments', 'auto_advance_to_in_service')
    return setting ? Boolean(setting.value) : true
  }

  private getAllowOverlappingSlots(): boolean {
    const setting = this.settingsRepo.get('appointments', 'allow_overlapping_slots')
    return setting ? Boolean(setting.value) : true
  }

  public getById(id: string): AppointmentWithDetails | null {
    const row = this.db
      .prepare(
        `SELECT apt.*,
                c.id as customer_id, c.name as customer_name, c.phone_primary as customer_phone,
                c.nic as customer_nic, c.email as customer_email, c.address as customer_address,
                c.notes as customer_notes, c.is_active as customer_is_active,
                c.created_at as customer_created_at, c.updated_at as customer_updated_at,
                v.id as vehicle_id, v.registration_no, v.make, v.model, v.year, v.color,
                v.vin, v.engine_number, v.fuel_type, v.transmission, v.extra_fields as vehicle_extra_fields,
                v.category_id as vehicle_category_id, v.is_active as vehicle_is_active,
                v.created_at as vehicle_created_at, v.updated_at as vehicle_updated_at,
                u_tech.username as technician_name,
                u_create.username as created_by_name
         FROM appointments apt
         INNER JOIN customers c ON apt.customer_id = c.id
         INNER JOIN vehicles v ON apt.vehicle_id = v.id
         LEFT JOIN users u_tech ON apt.technician_id = u_tech.id
         LEFT JOIN users u_create ON apt.created_by = u_create.id
         WHERE apt.id = ?`
      )
      .get(id) as any

    if (!row) return null

    let parsedServices: string[] | null = null
    if (row.requested_services) {
      try {
        parsedServices = JSON.parse(row.requested_services)
      } catch {
        parsedServices = [row.requested_services]
      }
    }

    const customer = {
      id: row.customer_id,
      name: row.customer_name,
      phonePrimary: row.customer_phone,
      nic: row.customer_nic,
      email: row.customer_email,
      address: row.customer_address,
      notes: row.customer_notes,
      isActive: Boolean(row.customer_is_active),
      createdAt: row.customer_created_at,
      updatedAt: row.customer_updated_at
    }

    const vehicle = {
      id: row.vehicle_id,
      customerId: row.customer_id,
      registrationNo: row.registration_no,
      make: row.make,
      model: row.model,
      year: row.year,
      color: row.color,
      vin: row.vin,
      engineNumber: row.engine_number,
      fuelType: row.fuel_type,
      transmission: row.transmission,
      extraFields: row.vehicle_extra_fields ? JSON.parse(row.vehicle_extra_fields) : undefined,
      categoryId: row.vehicle_category_id,
      isActive: Boolean(row.vehicle_is_active),
      createdAt: row.vehicle_created_at,
      updatedAt: row.vehicle_updated_at
    }

    return {
      id: row.id,
      appointmentNumber: row.appointment_number,
      customerId: row.customer_id,
      vehicleId: row.vehicle_id,
      scheduledDate: row.scheduled_date,
      scheduledTime: row.scheduled_time,
      estimatedDurationMinutes: row.estimated_duration_minutes,
      technicianId: row.technician_id,
      technicianName: row.technician_name,
      status: row.status,
      requestedServices: parsedServices,
      notes: row.notes,
      jobCardId: row.job_card_id,
      createdBy: row.created_by,
      createdByName: row.created_by_name,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      customer,
      vehicle
    }
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
    let sql = `
      SELECT apt.id
      FROM appointments apt
      INNER JOIN customers c ON apt.customer_id = c.id
      INNER JOIN vehicles v ON apt.vehicle_id = v.id
      WHERE apt.is_active = 1
    `
    const params: any[] = []

    if (filter?.date) {
      sql += ' AND apt.scheduled_date = ?'
      params.push(filter.date)
    }

    if (filter?.startDate) {
      sql += ' AND apt.scheduled_date >= ?'
      params.push(filter.startDate)
    }

    if (filter?.endDate) {
      sql += ' AND apt.scheduled_date <= ?'
      params.push(filter.endDate)
    }

    if (filter?.status && filter.status !== 'all') {
      sql += ' AND apt.status = ?'
      params.push(filter.status)
    }

    if (filter?.customerId) {
      sql += ' AND apt.customer_id = ?'
      params.push(filter.customerId)
    }

    if (filter?.vehicleId) {
      sql += ' AND apt.vehicle_id = ?'
      params.push(filter.vehicleId)
    }

    if (filter?.technicianId) {
      sql += ' AND apt.technician_id = ?'
      params.push(filter.technicianId)
    }

    if (filter?.search) {
      const q = `%${filter.search.trim()}%`
      sql += ' AND (apt.appointment_number LIKE ? OR c.name LIKE ? OR v.registration_no LIKE ?)'
      params.push(q, q, q)
    }

    sql += ' ORDER BY apt.scheduled_date ASC, apt.scheduled_time ASC'

    const rows = this.db.prepare(sql).all(...params) as { id: string }[]
    return rows.map((r) => this.getById(r.id)!).filter(Boolean)
  }

  public createAppointment(input: CreateAppointmentInput, createdBy?: string | null): AppointmentWithDetails {
    // Check overlapping slot setting if needed
    if (!this.getAllowOverlappingSlots()) {
      const conflict = this.db
        .prepare(
          `SELECT id FROM appointments
           WHERE scheduled_date = ? AND scheduled_time = ? AND status NOT IN ('Cancelled', 'No Show')`
        )
        .get(input.scheduledDate, input.scheduledTime)
      if (conflict) {
        throw new Error(
          `An active appointment already exists at ${input.scheduledDate} ${input.scheduledTime}`
        )
      }
    }

    const id = uuidv4()
    const appointmentNumber = this.sequenceRepo.getNextNumber('appointment')
    const now = new Date().toISOString()
    const servicesJson = input.requestedServices ? JSON.stringify(input.requestedServices) : null

    this.db
      .prepare(
        `INSERT INTO appointments (
          id, appointment_number, customer_id, vehicle_id, scheduled_date,
          scheduled_time, estimated_duration_minutes, technician_id,
          status, requested_services, notes, job_card_id, created_by,
          is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Scheduled', ?, ?, NULL, ?, 1, ?, ?)`
      )
      .run(
        id,
        appointmentNumber,
        input.customerId,
        input.vehicleId,
        input.scheduledDate,
        input.scheduledTime,
        input.estimatedDurationMinutes || 60,
        input.technicianId || null,
        servicesJson,
        input.notes || null,
        createdBy || null,
        now,
        now
      )

    return this.getById(id)!
  }

  public updateAppointment(id: string, input: UpdateAppointmentInput): AppointmentWithDetails {
    const existing = this.getById(id)
    if (!existing) {
      throw new Error(`Appointment not found: ${id}`)
    }

    const now = new Date().toISOString()
    const scheduledDate = input.scheduledDate !== undefined ? input.scheduledDate : existing.scheduledDate
    const scheduledTime = input.scheduledTime !== undefined ? input.scheduledTime : existing.scheduledTime
    const estimatedDuration =
      input.estimatedDurationMinutes !== undefined ? input.estimatedDurationMinutes : existing.estimatedDurationMinutes
    const technicianId = input.technicianId !== undefined ? input.technicianId : existing.technicianId
    const notes = input.notes !== undefined ? input.notes : existing.notes
    const requestedServices =
      input.requestedServices !== undefined
        ? (input.requestedServices ? JSON.stringify(input.requestedServices) : null)
        : (existing.requestedServices ? JSON.stringify(existing.requestedServices) : null)

    this.db
      .prepare(
        `UPDATE appointments
         SET scheduled_date = ?, scheduled_time = ?, estimated_duration_minutes = ?,
             technician_id = ?, requested_services = ?, notes = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(scheduledDate, scheduledTime, estimatedDuration, technicianId || null, requestedServices, notes || null, now, id)

    return this.getById(id)!
  }

  public updateStatus(id: string, status: AppointmentStatus, notes?: string | null): AppointmentWithDetails {
    const existing = this.getById(id)
    if (!existing) {
      throw new Error(`Appointment not found: ${id}`)
    }

    const now = new Date().toISOString()
    let updatedNotes = existing.notes
    if (notes) {
      updatedNotes = updatedNotes ? `${updatedNotes}\n[${status}]: ${notes}` : notes
    }

    this.db
      .prepare('UPDATE appointments SET status = ?, notes = ?, updated_at = ? WHERE id = ?')
      .run(status, updatedNotes || null, now, id)

    return this.getById(id)!
  }

  public convertToJobCard(
    input: ConvertAppointmentToJobCardInput,
    assignedByUserId?: string | null
  ): { appointment: AppointmentWithDetails; jobCardId: string } {
    const appointment = this.getById(input.appointmentId)
    if (!appointment) {
      throw new Error(`Appointment not found: ${input.appointmentId}`)
    }

    if (appointment.jobCardId) {
      throw new Error(
        `Appointment #${appointment.appointmentNumber} has already been converted to a Job Card`
      )
    }

    const transaction = this.db.transaction(() => {
      // 1. Create Job Card
      const jobCard = this.jobCardRepo.createJobCard(
        {
          customerId: appointment.customerId,
          vehicleId: appointment.vehicleId,
          appointmentId: appointment.id,
          technicianId: input.technicianId || appointment.technicianId || undefined,
          priority: input.priority || 'Normal',
          mileageIn: input.mileageIn !== undefined ? input.mileageIn : undefined,
          findings: appointment.notes || undefined,
          internalNotes: input.internalNotes || undefined,
          customerNotes: appointment.requestedServices ? appointment.requestedServices.join(', ') : undefined
        },
        assignedByUserId
      )

      // 2. Advance appointment status
      const autoAdvance = this.getAutoAdvanceToInService()
      const newStatus = autoAdvance ? 'In Service' : appointment.status
      const now = new Date().toISOString()

      this.db
        .prepare('UPDATE appointments SET job_card_id = ?, status = ?, updated_at = ? WHERE id = ?')
        .run(jobCard.id, newStatus, now, appointment.id)

      return jobCard.id
    })

    const jobCardId = transaction()
    return {
      appointment: this.getById(input.appointmentId)!,
      jobCardId
    }
  }
}
