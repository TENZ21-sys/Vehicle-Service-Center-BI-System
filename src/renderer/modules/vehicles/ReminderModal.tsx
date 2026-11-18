import React, { useState } from 'react'
import { api } from '../../api'
import { ReminderType, ServiceReminder } from '@shared/types/vehicle.types'

interface Props {
  isOpen: boolean
  vehicleId: string
  vehicleRegNo: string
  onClose: () => void
  onSaved: (reminder: ServiceReminder) => void
}

export const ReminderModal: React.FC<Props> = ({
  isOpen,
  vehicleId,
  vehicleRegNo,
  onClose,
  onSaved
}) => {
  const [reminderType, setReminderType] = useState<ReminderType>('date')
  const [dueDate, setDueDate] = useState('')
  const [dueMileage, setDueMileage] = useState<number | ''>('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const payload = {
      vehicleId,
      reminderType,
      dueDate: reminderType === 'date' ? dueDate : null,
      dueMileage: reminderType === 'mileage' && dueMileage !== '' ? Number(dueMileage) : null,
      description
    }

    try {
      const res = await api.vehicles.reminders.create(payload)
      if (res.success && res.data) {
        onSaved(res.data)
      } else {
        setError(res.error?.message || 'Failed to schedule reminder')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={modalOverlayStyle}>
      <div style={modalContentStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>
            Set Service Reminder for {vehicleRegNo}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280' }}>
            ×
          </button>
        </div>

        {error && <div style={errorBannerStyle}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={formGroupStyle}>
            <label style={labelStyle}>Reminder Schedule Type</label>
            <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="reminderType"
                  value="date"
                  checked={reminderType === 'date'}
                  onChange={() => setReminderType('date')}
                />
                Target Date
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="reminderType"
                  value="mileage"
                  checked={reminderType === 'mileage'}
                  onChange={() => setReminderType('mileage')}
                />
                Target Mileage (km)
              </label>
            </div>
          </div>

          {reminderType === 'date' ? (
            <div style={formGroupStyle}>
              <label style={labelStyle}>Due Date *</label>
              <input
                style={inputStyle}
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          ) : (
            <div style={formGroupStyle}>
              <label style={labelStyle}>Due Mileage Threshold (km) *</label>
              <input
                style={inputStyle}
                type="number"
                required
                min={1}
                value={dueMileage}
                onChange={(e) => setDueMileage(e.target.value ? parseInt(e.target.value, 10) : '')}
                placeholder="e.g. 45000"
              />
            </div>
          )}

          <div style={formGroupStyle}>
            <label style={labelStyle}>Service Description *</label>
            <input
              style={inputStyle}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Full Lubrication Service & Filter Change"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{ ...btnStyle, backgroundColor: '#e5e7eb', color: '#374151' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{ ...btnStyle, backgroundColor: '#2563eb', color: '#fff' }}
            >
              {loading ? 'Saving...' : 'Set Reminder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000
}

const modalContentStyle: React.CSSProperties = {
  backgroundColor: '#fff',
  padding: 24,
  borderRadius: 10,
  width: 440,
  boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
}

const formGroupStyle: React.CSSProperties = {
  marginBottom: 12
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  marginBottom: 4,
  color: '#374151'
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 6,
  border: '1px solid #d1d5db',
  fontSize: 13,
  outline: 'none'
}

const btnStyle: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: 6,
  border: 'none',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer'
}

const errorBannerStyle: React.CSSProperties = {
  backgroundColor: '#fee2e2',
  color: '#991b1b',
  padding: '8px 12px',
  borderRadius: 6,
  fontSize: 13,
  marginBottom: 12
}
