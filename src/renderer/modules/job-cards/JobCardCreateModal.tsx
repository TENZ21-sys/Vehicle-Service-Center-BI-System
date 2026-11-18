import React, { useState, useEffect } from 'react'
import { api } from '../../api'
import { CustomerWithVehicles } from '@shared/types/customer.types'
import { ServiceItem } from '@shared/types/catalogue.types'

interface Props {
  onClose: () => void
  onSaved: (jobCardId: string) => void
}

export const JobCardCreateModal: React.FC<Props> = ({ onClose, onSaved }) => {
  const [customers, setCustomers] = useState<CustomerWithVehicles[]>([])
  const [services, setServices] = useState<ServiceItem[]>([])
  const [trackMileage, setTrackMileage] = useState(true)

  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [selectedVehicleId, setSelectedVehicleId] = useState('')
  const [priority, setPriority] = useState('Normal')
  const [mileageIn, setMileageIn] = useState('')
  const [findings, setFindings] = useState('')
  const [internalNotes, setInternalNotes] = useState('')
  const [customerNotes, setCustomerNotes] = useState('')
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([])

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadOptions()
  }, [])

  const loadOptions = async (): Promise<void> => {
    try {
      const [custRes, svcRes, workflowRes] = await Promise.all([
        api.customers.list(false, 100, 0),
        api.catalogue.listServices({ includeInactive: false }),
        api.settings.getByCategory('workflow')
      ])
      if (custRes.success && custRes.data) setCustomers(custRes.data)
      if (svcRes.success && svcRes.data) setServices(svcRes.data)
      if (workflowRes.success && workflowRes.data?.track_mileage !== undefined) {
        setTrackMileage(Boolean(workflowRes.data.track_mileage))
      }
    } catch {
      // ignore
    }
  }

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId)
  const availableVehicles = selectedCustomer?.vehicles || []

  // Auto-select single vehicle if customer only has 1
  useEffect(() => {
    if (availableVehicles.length === 1) {
      setSelectedVehicleId(availableVehicles[0].id)
    } else if (availableVehicles.length === 0) {
      setSelectedVehicleId('')
    }
  }, [selectedCustomerId])

  const toggleService = (sId: string): void => {
    setSelectedServiceIds((prev) =>
      prev.includes(sId) ? prev.filter((id) => id !== sId) : [...prev, sId]
    )
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setError(null)

    if (!selectedCustomerId) {
      setError('Please select a customer')
      return
    }
    if (!selectedVehicleId) {
      setError('Please select a vehicle for this job card')
      return
    }

    const payload = {
      customerId: selectedCustomerId,
      vehicleId: selectedVehicleId,
      priority,
      mileageIn: trackMileage && mileageIn ? parseInt(mileageIn, 10) : null,
      findings: findings.trim() || null,
      internalNotes: internalNotes.trim() || null,
      customerNotes: customerNotes.trim() || null,
      initialServiceIds: selectedServiceIds
    }

    setLoading(true)
    try {
      const res = await api.jobcards.create(payload)
      if (!res.success) {
        setError(res.error?.message || 'Failed to create job card')
        return
      }
      onSaved(res.data.id)
    } catch (err: any) {
      setError(err.message || 'Error creating job card')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={backdropStyle}>
      <div style={modalStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Create New Workshop Job Card</h2>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        {error && <div style={errorStyle}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Customer *</label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                style={inputStyle}
                required
              >
                <option value="">-- Select Customer --</option>
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
                value={selectedVehicleId}
                onChange={(e) => setSelectedVehicleId(e.target.value)}
                style={inputStyle}
                disabled={!selectedCustomerId || availableVehicles.length === 0}
                required
              >
                <option value="">-- Select Vehicle --</option>
                {availableVehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registrationNo} — {v.make} {v.model} ({v.year || 'N/A'})
                  </option>
                ))}
              </select>
              {selectedCustomerId && availableVehicles.length === 0 && (
                <div style={{ fontSize: 11, color: '#dc2626', marginTop: 3 }}>
                  This customer has no vehicles registered. Please add a vehicle first.
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: trackMileage ? '1fr 1fr' : '1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                style={inputStyle}
              >
                <option value="Low">Low</option>
                <option value="Normal">Normal</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>

            {trackMileage && (
              <div>
                <label style={labelStyle}>Odometer / Mileage In (km)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 85400"
                  value={mileageIn}
                  onChange={(e) => setMileageIn(e.target.value)}
                  style={inputStyle}
                />
              </div>
            )}
          </div>

          <div>
            <label style={labelStyle}>Initial Customer Complaints / Work Requested</label>
            <textarea
              placeholder="e.g. Engine knocking sound on cold start, brake vibration at high speed"
              value={findings}
              onChange={(e) => setFindings(e.target.value)}
              rows={2}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          <div>
            <label style={labelStyle}>Initial Services to Perform</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4, maxHeight: 120, overflowY: 'auto', padding: 4, border: '1px solid #e5e7eb', borderRadius: 6 }}>
              {services.map((s) => {
                const checked = selectedServiceIds.includes(s.id)
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleService(s.id)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 16,
                      fontSize: 12,
                      border: checked ? '1px solid #2563eb' : '1px solid #d1d5db',
                      background: checked ? '#eff6ff' : '#f9fafb',
                      color: checked ? '#1d4ed8' : '#4b5563',
                      cursor: 'pointer'
                    }}
                  >
                    {checked ? '✓ ' : ''}{s.name}
                  </button>
                )
              })}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Internal Workshop Notes (Staff Only)</label>
              <textarea
                placeholder="e.g. Check spare tire pressure as courtesy"
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                rows={2}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>
            <div>
              <label style={labelStyle}>Customer Document Notes (Visible on Invoice)</label>
              <textarea
                placeholder="e.g. Customer approved replacement of rear brake pads"
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
                rows={2}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button type="button" onClick={onClose} style={cancelBtnStyle}>Cancel</button>
            <button type="submit" disabled={loading} style={saveBtnStyle}>
              {loading ? 'Opening Card...' : 'Open Job Card'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const backdropStyle: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
}
const modalStyle: React.CSSProperties = {
  backgroundColor: '#fff', padding: 24, borderRadius: 8, width: 680, maxWidth: '92%', maxHeight: '90vh', overflowY: 'auto'
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 4
}
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, boxSizing: 'border-box'
}
const saveBtnStyle: React.CSSProperties = {
  padding: '8px 18px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 500
}
const cancelBtnStyle: React.CSSProperties = {
  padding: '8px 16px', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', fontWeight: 500
}
const closeBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#6b7280'
}
const errorStyle: React.CSSProperties = {
  padding: '8px 12px', background: '#fee2e2', color: '#b91c1c', borderRadius: 6, fontSize: 13
}
