import React, { useState, useEffect } from 'react'
import { api } from '../../api'
import { ServiceCategory } from '@shared/types/catalogue.types'

interface Props {
  onClose: () => void
  onSaved: () => void
}

export const ServiceCategoryModal: React.FC<Props> = ({ onClose, onSaved }) => {
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async (): Promise<void> => {
    try {
      const res = await api.catalogue.listCategories(true)
      if (res.success && res.data) {
        setCategories(res.data)
      }
    } catch {
      // ignore
    }
  }

  const handleCreate = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    setError(null)
    try {
      const res = await api.catalogue.createCategory({
        name: name.trim(),
        description: description.trim() || null
      })
      if (!res.success) {
        setError(res.error?.message || 'Failed to create category')
        return
      }
      setName('')
      setDescription('')
      loadCategories()
      onSaved()
    } catch (err: any) {
      setError(err.message || 'Error creating category')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={backdropStyle}>
      <div style={modalStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Manage Service Categories</h2>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        {error && <div style={errorStyle}>{error}</div>}

        <form onSubmit={handleCreate} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input
            type="text"
            placeholder="New Category Name (e.g. Detailing)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ ...inputStyle, flex: 2 }}
            required
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ ...inputStyle, flex: 3 }}
          />
          <button type="submit" disabled={loading} style={saveBtnStyle}>
            {loading ? 'Adding...' : 'Add'}
          </button>
        </form>

        <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 6 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
            <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <tr>
                <th style={{ padding: '8px 12px' }}>Name</th>
                <th style={{ padding: '8px 12px' }}>Description</th>
                <th style={{ padding: '8px 12px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 500 }}>{c.name}</td>
                  <td style={{ padding: '8px 12px', color: '#6b7280' }}>{c.description || '—'}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{ fontSize: 12, padding: '2px 6px', borderRadius: 4, background: c.isActive ? '#dcfce7' : '#fee2e2', color: c.isActive ? '#15803d' : '#b91c1c' }}>
                      {c.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <button onClick={onClose} style={cancelBtnStyle}>Close</button>
        </div>
      </div>
    </div>
  )
}

const backdropStyle: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
}
const modalStyle: React.CSSProperties = {
  backgroundColor: '#fff', padding: 24, borderRadius: 8, width: 600, maxWidth: '90%', maxHeight: '85vh', display: 'flex', flexDirection: 'column'
}
const inputStyle: React.CSSProperties = {
  padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14
}
const saveBtnStyle: React.CSSProperties = {
  padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 500
}
const cancelBtnStyle: React.CSSProperties = {
  padding: '8px 16px', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', fontWeight: 500
}
const closeBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#6b7280'
}
const errorStyle: React.CSSProperties = {
  padding: '8px 12px', background: '#fee2e2', color: '#b91c1c', borderRadius: 6, fontSize: 13, marginBottom: 12
}
