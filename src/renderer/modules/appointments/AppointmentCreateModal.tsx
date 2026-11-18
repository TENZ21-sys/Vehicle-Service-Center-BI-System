import React, { useState, useEffect } from 'react'
import { api } from '../../api'
import { CustomerWithVehicles } from '@shared/types/customer.types'
import { ServiceItem } from '@shared/types/catalogue.types'
import { AppointmentWithDetails } from '@shared/types/appointment.types'

interface Props {
  onClose: () => void
  onSuccess: (appointment: AppointmentWithDetails) => void
}

export const AppointmentCreateModal: React.FC<Props> = ({ onClose, onSuccess }) => {
  const [customers, setCustomers] = useState<CustomerWithVehicles[]>([])
  const [services, setServices] = useState<ServiceItem[]>([])
  const [staff, setStaff] = useState<Array<{ id: string; username: string; displayName: string }>>([])

  const [customerId, setCustomerId] = useState('')
  const [vehicleId, setVehicleId] = useState('')
  const [scheduledDate, setScheduledDate] = useState(() => {
    const d = new Date()
    return d.toISOString().split('T')[0]
  })
  const [scheduledTime, setScheduledTime] = useState('09:00')
  const [estimatedDuration, setEstimatedDuration] = useState('60')
  const [technicianId, setTechnicianId] = useState('')
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [notes, setNotes] = useState('')

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const init = async (): Promise<void> => {
      setLoading(true)
      try {
        const [custRes, svcRes, aptSettings] = await Promise.all([
          api.customers.list(false),
          api.catalogue.listServices(),
          api.settings.getByCategory('appointments')
        ])

        if (custRes.success && custRes.data) {
          setCustomers(custRes.data)
          if (custRes.data.length > 0) {
            setCustomerId(custRes.data[0].id)
            if (custRes.data[0].vehicles && custRes.data[0].vehicles.length > 0) {
              setVehicleId(custRes.data[0].vehicles[0].id)
            }
          }
        }

        if (svcRes.success && svcRes.data) {
          setServices(svcRes.data.filter((s) => s.isActive))
        }

        if (aptSettings.success && aptSettings.data && aptSettings.data.default_slot_duration) {
          setEstimatedDuration(String(aptSettings.data.default_slot_duration))
        }
      } catch (err: any) {
        setError(err.message || 'Failed to initialize form')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  const selectedCustomer = customers.find((c) => c.id === customerId)

  const handleCustomerChange = (cid: string): void => {
    setCustomerId(cid)
    const cust = customers.find((c) => c.id === cid)
    if (cust && cust.vehicles && cust.vehicles.length > 0) {
      setVehicleId(cust.vehicles[0].id)
    } else {
      setVehicleId('')
    }
  }

  const handleToggleService = (name: string): void => {
    if (selectedServices.includes(name)) {
      setSelectedServices(selectedServices.filter((s) => s !== name))
    } else {
      setSelectedServices([...selectedServices, name])
    }
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setError(null)

    if (!customerId) {
      setError('Please select a customer')
      return
    }

    if (!vehicleId) {
      setError('Selected customer has no vehicles. Please register a vehicle for the customer first.')
      return
    }

    setSubmitting(true)
    try {
      const res = await api.appointments.create({
        customerId,
        vehicleId,
        scheduledDate,
        scheduledTime,
        estimatedDurationMinutes: parseInt(estimatedDuration, 10) || 60,
        technicianId: technicianId || undefined,
        requestedServices: selectedServices.length > 0 ? selectedServices : undefined,
        notes: notes.trim() || undefined
      })

      if (res.success && res.data) {
        onSuccess(res.data)
      } else {
        setError(res.error?.message || 'Failed to book appointment')
      }
    } catch (err: any) {
      setError(err?.message || 'Error scheduling appointment')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div style={backdropStyle}>
        <div style={{ ...modalStyle, padding: 36, textAlign: 'center' }}>
          <p style={{ color: '#64748b' }}>Loading appointment booking form...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={backdropStyle}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>📅</span>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>
              Schedule Service Appointment
            </h3>
          </div>
          <button onClick={onClose} style={closeIconStyle}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 20 }}>
          {error && <div style={errorBannerStyle}>{error}</div>}

          {/* Customer & Vehicle */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Customer *</label>
              <select
                value={customerId}
                onChange={(e) => handleCustomerChange(e.target.value)}
                style={inputStyle}
                required
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phonePrimary})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Vehicle *</label>
              <select
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                style={inputStyle}
                required
              >
                {selectedCustomer?.vehicles && selectedCustomer.vehicles.length > 0 ? (
                  selectedCustomer.vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.registrationNo} - {v.make} {v.model}
                    </option>
                  ))
                ) : (
                  <option value="">No vehicles found for customer</option>
                )}
              </select>
            </div>
          </div>

          {/* Date, Time & Duration */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 14, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Date *</label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                style={inputStyle}
                required
              />
            </div>

            <div>
              <label style={labelStyle}>Time Slot *</label>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                style={inputStyle}
                required
              />
            </div>

            <div>
              <label style={labelStyle}>Duration (Mins)</label>
              <input
                type="number"
                min="10"
                max="720"
                step="5"
                value={estimatedDuration}
                onChange={(e) => setEstimatedDuration(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Requested Services */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Requested Services / Packages</label>
            <div style={servicesBoxStyle}>
              {services.length === 0 ? (
                <div style={{ fontSize: 12, color: '#94a3b8' }}>No catalogue services registered.</div>
              ) : (
                services.map((svc) => {
                  const checked = selectedServices.includes(svc.name)
                  return (
                    <button
                      type="button"
                      key={svc.id}
                      onClick={() => handleToggleService(svc.name)}
                      style={checked ? activeChipStyle : chipStyle}
                    >
                      {checked ? '✓ ' : '+ '}
                      {svc.name}
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* Customer notes / concerns */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Customer Concerns & Instructions</label>
            <textarea
              rows={2}
              placeholder="e.g. Unusual engine vibration above 80 km/h, check air conditioning filter"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={textareaStyle}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" onClick={onClose} style={cancelBtnStyle}>
              Cancel
            </button>
            <button type="submit" disabled={submitting} style={submitBtnStyle}>
              {submitting ? 'Booking...' : 'Book Appointment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const backdropStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(15, 23, 42, 0.65)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1050,
  padding: 16
}

const modalStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: 12,
  width: '100%',
  maxWidth: 620,
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)'
}

const headerStyle: React.CSSProperties = {
  padding: '16px 20px',
  borderBottom: '1px solid #e2e8f0',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  backgroundColor: '#f8fafc',
  borderTopLeftRadius: 12,
  borderTopRightRadius: 12
}

const closeIconStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  fontSize: 16,
  color: '#94a3b8',
  cursor: 'pointer'
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: '#334155',
  marginBottom: 5
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  fontSize: 13,
  border: '1px solid #cbd5e1',
  borderRadius: 6,
  boxSizing: 'border-box'
}

const textareaStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  fontSize: 13,
  border: '1px solid #cbd5e1',
  borderRadius: 6,
  boxSizing: 'border-box',
  fontFamily: 'inherit'
}

const servicesBoxStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 6,
  padding: 10,
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: 6,
  maxHeight: 120,
  overflowY: 'auto'
}

const chipStyle: React.CSSProperties = {
  padding: '4px 8px',
  fontSize: 11,
  fontWeight: 500,
  backgroundColor: '#ffffff',
  color: '#475569',
  border: '1px solid #cbd5e1',
  borderRadius: 4,
  cursor: 'pointer'
}

const activeChipStyle: React.CSSProperties = {
  padding: '4px 8px',
  fontSize: 11,
  fontWeight: 600,
  backgroundColor: '#eff6ff',
  color: '#2563eb',
  border: '1px solid #bfdbfe',
  borderRadius: 4,
  cursor: 'pointer'
}

const errorBannerStyle: React.CSSProperties = {
  padding: '8px 12px',
  backgroundColor: '#fee2e2',
  color: '#991b1b',
  borderRadius: 6,
  fontSize: 12,
  marginBottom: 14
}

const cancelBtnStyle: React.CSSProperties = {
  padding: '8px 14px',
  fontSize: 13,
  fontWeight: 500,
  backgroundColor: '#ffffff',
  color: '#64748b',
  border: '1px solid #cbd5e1',
  borderRadius: 6,
  cursor: 'pointer'
}

const submitBtnStyle: React.CSSProperties = {
  padding: '8px 20px',
  fontSize: 13,
  fontWeight: 600,
  backgroundColor: '#2563eb',
  color: '#ffffff',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer'
}
