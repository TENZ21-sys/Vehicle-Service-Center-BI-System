import React, { useState, useEffect } from 'react'
import { api } from '../../api'
import { VehicleCategory } from '@shared/types/vehicle.types'

export const VehicleCategoriesTab: React.FC = () => {
  const [categories, setCategories] = useState<VehicleCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [sortOrder, setSortOrder] = useState<number>(10)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async (): Promise<void> => {
    setLoading(true)
    try {
      const res = await api.vehicles.categories.list(true)
      if (res.success && res.data) {
        setCategories(res.data)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setError(null)
    setSaving(true)

    try {
      const res = await api.vehicles.categories.create({
        name,
        description,
        sortOrder,
        extraFields: []
      })

      if (res.success) {
        setName('')
        setDescription('')
        setShowAddModal(false)
        loadCategories()
      } else {
        setError(res.error?.message || 'Failed to add category')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  const handleDeactivate = async (id: string): Promise<void> => {
    if (!confirm('Are you sure you want to deactivate this vehicle category? Existing vehicles will not be affected.')) {
      return
    }
    try {
      await api.vehicles.categories.deactivate(id)
      loadCategories()
    } catch {
      // ignore
    }
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>
            Vehicle Main Categories
          </h3>
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
            Configure and register any vehicle type category serviced by your workshop.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          style={addBtnStyle}
        >
          + Add Vehicle Category
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 20, color: '#6b7280' }}>Loading vehicle categories...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {categories.map((c) => (
            <div
              key={c.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                backgroundColor: c.isActive ? '#ffffff' : '#f9fafb'
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: c.isActive ? '#111827' : '#9ca3af' }}>
                  {c.name} {!c.isActive && <span style={{ fontSize: 11, color: '#dc2626' }}>(Inactive)</span>}
                </div>
                {c.description && (
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{c.description}</div>
                )}
              </div>

              <div>
                {c.isActive && (
                  <button
                    onClick={() => handleDeactivate(c.id)}
                    style={{
                      background: 'none',
                      border: '1px solid #e5e7eb',
                      borderRadius: 4,
                      padding: '4px 8px',
                      color: '#6b7280',
                      fontSize: 12,
                      cursor: 'pointer'
                    }}
                  >
                    Deactivate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Category Dialog */}
      {showAddModal && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: '#111827' }}>
                Add New Vehicle Category
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280' }}
              >
                ×
              </button>
            </div>

            {error && <div style={errorBannerStyle}>{error}</div>}

            <form onSubmit={handleCreate}>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Category Name *</label>
                <input
                  style={inputStyle}
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Electric Forklift, Tractor, Heavy Bus"
                />
              </div>

              <div style={formGroupStyle}>
                <label style={labelStyle}>Description</label>
                <textarea
                  style={{ ...inputStyle, minHeight: 60 }}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of this vehicle type..."
                />
              </div>

              <div style={formGroupStyle}>
                <label style={labelStyle}>Sort Order</label>
                <input
                  style={inputStyle}
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  disabled={saving}
                  style={{ ...btnStyle, backgroundColor: '#e5e7eb', color: '#374151' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ ...btnStyle, backgroundColor: '#2563eb', color: '#fff' }}
                >
                  {saving ? 'Adding...' : 'Add Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

const addBtnStyle: React.CSSProperties = {
  padding: '8px 14px',
  backgroundColor: '#2563eb',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer'
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
