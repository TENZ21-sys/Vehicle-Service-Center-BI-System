import React, { useState, useEffect } from 'react'
import { api } from '../../api'
import { ServiceItem, ServiceCategory } from '@shared/types/catalogue.types'
import { VehicleCategory } from '@shared/types/vehicle.types'
import { toMoneyAmount } from '@shared/types/money.types'

interface Props {
  service?: ServiceItem | null
  onClose: () => void
  onSaved: () => void
}

export const ServiceFormModal: React.FC<Props> = ({ service, onClose, onSaved }) => {
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [vehicleCategories, setVehicleCategories] = useState<VehicleCategory[]>([])

  const [categoryId, setCategoryId] = useState(service?.categoryId || '')
  const [name, setName] = useState(service?.name || '')
  const [description, setDescription] = useState(service?.description || '')
  const [basePriceDisplay, setBasePriceDisplay] = useState(
    service ? (service.basePriceAmount / 100).toFixed(2) : '0.00'
  )
  const [laborChargeDisplay, setLaborChargeDisplay] = useState(
    service ? (service.laborChargeAmount / 100).toFixed(2) : '0.00'
  )
  const [estimatedMinutes, setEstimatedMinutes] = useState(
    service?.estimatedMinutes ? service.estimatedMinutes.toString() : ''
  )
  const [selectedVehicleCatIds, setSelectedVehicleCatIds] = useState<string[]>(
    service?.applicableVehicleCategoryIds || []
  )

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadOptions()
  }, [])

  const loadOptions = async (): Promise<void> => {
    try {
      const [catRes, vCatRes] = await Promise.all([
        api.catalogue.listCategories(false),
        api.vehicles.categories.list(false)
      ])
      if (catRes.success && catRes.data) setCategories(catRes.data)
      if (vCatRes.success && vCatRes.data) setVehicleCategories(vCatRes.data)
    } catch {
      // ignore
    }
  }

  const toggleVehicleCategory = (id: string): void => {
    setSelectedVehicleCatIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Service name is required')
      return
    }

    let basePriceAmount = 0
    let laborChargeAmount = 0
    try {
      basePriceAmount = toMoneyAmount(basePriceDisplay)
      laborChargeAmount = toMoneyAmount(laborChargeDisplay)
    } catch {
      setError('Please enter valid numeric prices')
      return
    }

    const payload = {
      categoryId: categoryId || null,
      name: name.trim(),
      description: description.trim() || null,
      basePriceAmount,
      laborChargeAmount,
      estimatedMinutes: estimatedMinutes ? parseInt(estimatedMinutes, 10) : null,
      vehicleCategoryIds: selectedVehicleCatIds
    }

    setLoading(true)
    try {
      if (service) {
        const res = await api.catalogue.updateService(service.id, payload)
        if (!res.success) {
          setError(res.error?.message || 'Failed to update service')
          return
        }
      } else {
        const res = await api.catalogue.createService(payload)
        if (!res.success) {
          setError(res.error?.message || 'Failed to create service')
          return
        }
      }
      onSaved()
    } catch (err: any) {
      setError(err.message || 'Error saving service')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={backdropStyle}>
      <div style={modalStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
            {service ? 'Edit Service' : 'Add New Service'}
          </h2>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        {error && <div style={errorStyle}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              style={inputStyle}
            >
              <option value="">-- General / Uncategorized --</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Service Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Engine Oil & Filter Change"
              style={inputStyle}
              required
            />
          </div>

          <div>
            <label style={labelStyle}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description of what is included in this service"
              rows={2}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Base Price (Parts/Materials)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={basePriceDisplay}
                onChange={(e) => setBasePriceDisplay(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Labor Charge</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={laborChargeDisplay}
                onChange={(e) => setLaborChargeDisplay(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Estimated Minutes</label>
              <input
                type="number"
                min="1"
                placeholder="e.g. 45"
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Applicable Vehicle Categories</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
              {vehicleCategories.map((vc) => {
                const checked = selectedVehicleCatIds.includes(vc.id)
                return (
                  <button
                    key={vc.id}
                    type="button"
                    onClick={() => toggleVehicleCategory(vc.id)}
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
                    {checked ? '✓ ' : ''}{vc.name}
                  </button>
                )
              })}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
            <button type="button" onClick={onClose} style={cancelBtnStyle}>Cancel</button>
            <button type="submit" disabled={loading} style={saveBtnStyle}>
              {loading ? 'Saving...' : service ? 'Update Service' : 'Save Service'}
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
  backgroundColor: '#fff', padding: 24, borderRadius: 8, width: 620, maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto'
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 4
}
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, boxSizing: 'border-box'
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
