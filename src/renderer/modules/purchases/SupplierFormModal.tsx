import React, { useState } from 'react'
import { api } from '../../api'
import { Supplier } from '@shared/types/inventory.types'

interface Props {
  supplier?: Supplier | null
  onClose: () => void
  onSaved: () => void
}

export const SupplierFormModal: React.FC<Props> = ({ supplier, onClose, onSaved }) => {
  const [name, setName] = useState(supplier?.name || '')
  const [contactPerson, setContactPerson] = useState(supplier?.contactPerson || '')
  const [phone, setPhone] = useState(supplier?.phone || '')
  const [email, setEmail] = useState(supplier?.email || '')
  const [address, setAddress] = useState(supplier?.address || '')
  const [notes, setNotes] = useState(supplier?.notes || '')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Supplier name is required')
      return
    }

    const payload = {
      name: name.trim(),
      contactPerson: contactPerson.trim() || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      address: address.trim() || null,
      notes: notes.trim() || null
    }

    setLoading(true)
    setError(null)
    try {
      if (supplier) {
        const res = await api.suppliers.update(supplier.id, payload)
        if (!res.success) {
          setError(res.error?.message || 'Failed to update supplier')
          return
        }
      } else {
        const res = await api.suppliers.create(payload)
        if (!res.success) {
          setError(res.error?.message || 'Failed to create supplier')
          return
        }
      }
      onSaved()
    } catch (err: any) {
      setError(err.message || 'Error saving supplier')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={backdropStyle}>
      <div style={modalStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
            {supplier ? 'Edit Supplier' : 'Add New Supplier'}
          </h2>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        {error && <div style={errorStyle}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={labelStyle}>Company / Supplier Name *</label>
            <input
              type="text"
              placeholder="e.g. Lanka Auto Parts Distributors"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inputStyle}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Contact Person</label>
              <input
                type="text"
                placeholder="e.g. Kasun Perera"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Phone Number</label>
              <input
                type="text"
                placeholder="e.g. 0771234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Email Address</label>
            <input
              type="email"
              placeholder="e.g. sales@lankaautoparts.lk"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Office / Warehouse Address</label>
            <textarea
              placeholder="e.g. No. 45, Panchikawatte Road, Colombo 10"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          <div>
            <label style={labelStyle}>Notes / Payment Terms</label>
            <textarea
              placeholder="e.g. 30 days credit; Account: Commercial Bank 123456"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button type="button" onClick={onClose} style={cancelBtnStyle}>Cancel</button>
            <button type="submit" disabled={loading} style={saveBtnStyle}>
              {loading ? 'Saving...' : supplier ? 'Update Supplier' : 'Save Supplier'}
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
  backgroundColor: '#fff', padding: 24, borderRadius: 8, width: 520, maxWidth: '90%'
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
