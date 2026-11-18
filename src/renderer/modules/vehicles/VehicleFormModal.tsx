import React, { useState, useEffect } from 'react'
import { api } from '../../api'
import { VehicleWithCustomer, VehicleCategory } from '@shared/types/vehicle.types'

interface Props {
  isOpen: boolean
  customerId: string
  vehicleToEdit?: VehicleWithCustomer | null
  onClose: () => void
  onSaved: (vehicle: VehicleWithCustomer) => void
}

export const VehicleFormModal: React.FC<Props> = ({
  isOpen,
  customerId,
  vehicleToEdit,
  onClose,
  onSaved
}) => {
  const [categories, setCategories] = useState<VehicleCategory[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')
  const [registrationNo, setRegistrationNo] = useState('')
  const [make, setMake] = useState('')
  const [model, setModel] = useState('')
  const [year, setYear] = useState<number | ''>('')
  const [color, setColor] = useState('')
  const [vin, setVin] = useState('')
  const [engineNumber, setEngineNumber] = useState('')
  const [fuelType, setFuelType] = useState('Petrol')
  const [transmission, setTransmission] = useState('Automatic')
  const [imageUrl, setImageUrl] = useState<string>('')
  const [extraFieldsValues, setExtraFieldsValues] = useState<Record<string, any>>({})

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadCategories()
    }
  }, [isOpen])

  const loadCategories = async (): Promise<void> => {
    try {
      const res = await api.vehicles.categories.list(false)
      if (res.success && res.data) {
        setCategories(res.data)
        if (!selectedCategoryId && res.data.length > 0) {
          setSelectedCategoryId(res.data[0].id)
        }
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (vehicleToEdit) {
      setRegistrationNo(vehicleToEdit.registrationNo || '')
      setSelectedCategoryId(vehicleToEdit.categoryId || '')
      setMake(vehicleToEdit.make || '')
      setModel(vehicleToEdit.model || '')
      setYear(vehicleToEdit.year ?? '')
      setColor(vehicleToEdit.color || '')
      setVin(vehicleToEdit.vin || '')
      setEngineNumber(vehicleToEdit.engineNumber || '')
      setFuelType(vehicleToEdit.fuelType || 'Petrol')
      setTransmission(vehicleToEdit.transmission || 'Automatic')
      const extra = vehicleToEdit.extraFields || {}
      setImageUrl(vehicleToEdit.imageUrl || (extra.imageUrl as string) || '')
      setExtraFieldsValues(extra)
    } else {
      setRegistrationNo('')
      setMake('')
      setModel('')
      setYear('')
      setColor('')
      setVin('')
      setEngineNumber('')
      setFuelType('Petrol')
      setTransmission('Automatic')
      setImageUrl('')
      setExtraFieldsValues({})
    }
    setError(null)
  }, [vehicleToEdit, isOpen])

  const handleImageFile = (file: File): void => {
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, JPEG, WEBP).')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height
        const maxDim = 800
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width)
            width = maxDim
          } else {
            width = Math.round((width * maxDim) / height)
            height = maxDim
          }
        }
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx?.drawImage(img, 0, 0, width, height)
        const compressed = canvas.toDataURL('image/jpeg', 0.8)
        setImageUrl(compressed)
      }
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  if (!isOpen) return null

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId)

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const payload = {
      customerId,
      categoryId: selectedCategoryId || undefined,
      registrationNo,
      make: make || undefined,
      model: model || undefined,
      year: year !== '' ? Number(year) : undefined,
      color: color || undefined,
      vin: vin || undefined,
      engineNumber: engineNumber || undefined,
      fuelType: fuelType || undefined,
      transmission: transmission || undefined,
      extraFields: {
        ...extraFieldsValues,
        imageUrl: imageUrl || undefined
      }
    }

    try {
      if (vehicleToEdit) {
        const res = await api.vehicles.update(vehicleToEdit.id, payload)
        if (res.success && res.data) {
          onSaved(res.data)
        } else {
          setError(res.error?.message || 'Failed to update vehicle')
        }
      } else {
        const res = await api.vehicles.create(payload)
        if (res.success && res.data) {
          onSaved(res.data)
        } else {
          setError(res.error?.message || 'Failed to register vehicle')
        }
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
            {vehicleToEdit ? 'Edit Vehicle Details' : 'Register Vehicle to Customer'}
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280' }}
          >
            ×
          </button>
        </div>

        {error && <div style={errorBannerStyle}>{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* Vehicle Image Upload Section */}
          <div style={{ marginBottom: 16, padding: 12, border: '1px dashed #d1d5db', borderRadius: 8, backgroundColor: '#f9fafb' }}>
            <label style={{ ...labelStyle, marginBottom: 8, display: 'block' }}>Vehicle Photo (Optional)</label>
            {imageUrl ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <img
                  src={imageUrl}
                  alt="Vehicle Preview"
                  style={{
                    width: 120,
                    height: 80,
                    objectFit: 'cover',
                    borderRadius: 6,
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label
                    style={{
                      padding: '5px 12px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #d1d5db',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#374151',
                      cursor: 'pointer',
                      textAlign: 'center',
                      display: 'inline-block'
                    }}
                  >
                    Change Photo
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleImageFile(file)
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    style={{
                      padding: '5px 12px',
                      backgroundColor: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#dc2626',
                      cursor: 'pointer'
                    }}
                  >
                    Remove Photo
                  </button>
                </div>
              </div>
            ) : (
              <label
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '16px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 6,
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                <span style={{ fontSize: 24, marginBottom: 4 }}>🚗📸</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#2563eb' }}>
                  Click to Upload Vehicle Photo
                </span>
                <span style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                  Supports PNG, JPG, JPEG, WEBP (Auto-optimized)
                </span>
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleImageFile(file)
                  }}
                />
              </label>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12 }}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>License Plate / Reg No. *</label>
              <input
                style={inputStyle}
                required
                value={registrationNo}
                onChange={(e) => setRegistrationNo(e.target.value.toUpperCase())}
                placeholder="e.g. WP CAA-1234"
              />
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>Vehicle Category</label>
              <select
                style={inputStyle}
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Make / Manufacturer</label>
              <input
                style={inputStyle}
                value={make}
                onChange={(e) => setMake(e.target.value)}
                placeholder="e.g. Toyota, Honda, Bajaj"
              />
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>Model</label>
              <input
                style={inputStyle}
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. Corolla, Civic, RE"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Manufacture Year</label>
              <input
                style={inputStyle}
                type="number"
                min={1920}
                max={2030}
                value={year}
                onChange={(e) => setYear(e.target.value ? parseInt(e.target.value, 10) : '')}
                placeholder="e.g. 2021"
              />
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>Color</label>
              <input
                style={inputStyle}
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="e.g. Pearl White, Silver"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Fuel Type</label>
              <select
                style={inputStyle}
                value={fuelType}
                onChange={(e) => setFuelType(e.target.value)}
              >
                <option value="Petrol">Petrol</option>
                <option value="Diesel">Diesel</option>
                <option value="Hybrid">Hybrid</option>
                <option value="Electric">Electric</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>Transmission</label>
              <select
                style={inputStyle}
                value={transmission}
                onChange={(e) => setTransmission(e.target.value)}
              >
                <option value="Automatic">Automatic</option>
                <option value="Manual">Manual</option>
                <option value="CVT">CVT</option>
                <option value="Direct Drive">Direct Drive</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>VIN / Chassis Number</label>
              <input
                style={inputStyle}
                value={vin}
                onChange={(e) => setVin(e.target.value)}
                placeholder="Chassis / VIN"
              />
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>Engine Number</label>
              <input
                style={inputStyle}
                value={engineNumber}
                onChange={(e) => setEngineNumber(e.target.value)}
                placeholder="Engine No."
              />
            </div>
          </div>

          {/* Dynamic Category Custom Fields */}
          {selectedCategory && selectedCategory.extraFields && selectedCategory.extraFields.length > 0 && (
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 12, marginTop: 4 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 10 }}>
                {selectedCategory.name} Specific Attributes
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {selectedCategory.extraFields.map((field) => (
                  <div key={field.key} style={formGroupStyle}>
                    <label style={labelStyle}>
                      {field.label} {field.required ? '*' : ''}
                    </label>
                    {field.type === 'select' ? (
                      <select
                        style={inputStyle}
                        required={field.required}
                        value={extraFieldsValues[field.key] || ''}
                        onChange={(e) =>
                          setExtraFieldsValues({
                            ...extraFieldsValues,
                            [field.key]: e.target.value
                          })
                        }
                      >
                        <option value="">Select option</option>
                        {field.options?.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        style={inputStyle}
                        type={field.type === 'number' ? 'number' : 'text'}
                        required={field.required}
                        value={extraFieldsValues[field.key] ?? ''}
                        onChange={(e) =>
                          setExtraFieldsValues({
                            ...extraFieldsValues,
                            [field.key]: field.type === 'number' ? parseFloat(e.target.value) : e.target.value
                          })
                        }
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

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
              {loading ? 'Saving...' : vehicleToEdit ? 'Update Vehicle' : 'Save Vehicle'}
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
  width: 520,
  maxHeight: '90vh',
  overflowY: 'auto',
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
