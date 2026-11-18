import React, { useState, useEffect } from 'react'
import { api } from '../../api'
import { CustomerWithVehicles } from '@shared/types/customer.types'

interface Props {
  isOpen: boolean
  customerToEdit?: CustomerWithVehicles | null
  onClose: () => void
  onSaved: (customer: CustomerWithVehicles) => void
}

export const CustomerFormModal: React.FC<Props> = ({
  isOpen,
  customerToEdit,
  onClose,
  onSaved
}) => {
  const [name, setName] = useState('')
  const [phonePrimary, setPhonePrimary] = useState('')
  const [phoneSecondary, setPhoneSecondary] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [nic, setNic] = useState('')
  const [notes, setNotes] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)

  useEffect(() => {
    if (customerToEdit) {
      setName(customerToEdit.name || '')
      setPhonePrimary(customerToEdit.phonePrimary || '')
      setPhoneSecondary(customerToEdit.phoneSecondary || '')
      setEmail(customerToEdit.email || '')
      setAddress(customerToEdit.address || '')
      setNic(customerToEdit.nic || '')
      setNotes(customerToEdit.notes || '')
    } else {
      setName('')
      setPhonePrimary('')
      setPhoneSecondary('')
      setEmail('')
      setAddress('')
      setNic('')
      setNotes('')
    }
    setError(null)
    setDuplicateWarning(null)
  }, [customerToEdit, isOpen])

  if (!isOpen) return null

  const handlePhoneBlur = async (): Promise<void> => {
    if (!customerToEdit && phonePrimary.trim().length >= 7) {
      try {
        const res = await api.customers.checkDuplicates(phonePrimary.trim(), nic.trim())
        if (res.success && res.data?.isDuplicate && res.data.duplicateCustomer) {
          setDuplicateWarning(
            `Notice: A customer with this phone or NIC already exists ("${res.data.duplicateCustomer.name}"). You can still proceed if this is an intentional secondary profile.`
          )
        } else {
          setDuplicateWarning(null)
        }
      } catch {
        // ignore duplicate check error
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent, allowDuplicate = false): Promise<void> => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const payload = {
      name,
      phonePrimary,
      phoneSecondary: phoneSecondary || undefined,
      email: email || undefined,
      address: address || undefined,
      nic: nic || undefined,
      notes: notes || undefined
    }

    try {
      if (customerToEdit) {
        const res = await api.customers.update(customerToEdit.id, payload)
        if (res.success && res.data) {
          onSaved(res.data)
        } else {
          setError(res.error?.message || 'Failed to update customer')
        }
      } else {
        const res = await api.customers.create(payload, allowDuplicate)
        if (res.success && res.data) {
          onSaved(res.data)
        } else {
          if (res.error?.code === 'CONFLICT') {
            setDuplicateWarning(res.error.message)
          } else {
            setError(res.error?.message || 'Failed to create customer')
          }
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
            {customerToEdit ? 'Edit Customer Profile' : 'Register New Customer'}
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280' }}
          >
            ×
          </button>
        </div>

        {error && <div style={errorBannerStyle}>{error}</div>}

        {duplicateWarning && (
          <div style={warningBannerStyle}>
            <div>{duplicateWarning}</div>
            {!customerToEdit && (
              <button
                type="button"
                onClick={(e) => handleSubmit(e, true)}
                style={{
                  marginTop: 8,
                  padding: '4px 10px',
                  backgroundColor: '#b45309',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Proceed Anyway & Save
              </button>
            )}
          </div>
        )}

        <form onSubmit={(e) => handleSubmit(e, false)}>
          <div style={formGroupStyle}>
            <label style={labelStyle}>Customer Full Name *</label>
            <input
              style={inputStyle}
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sunil Wickramasinghe"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Primary Phone *</label>
              <input
                style={inputStyle}
                required
                value={phonePrimary}
                onBlur={handlePhoneBlur}
                onChange={(e) => setPhonePrimary(e.target.value)}
                placeholder="e.g. 077 123 4567"
              />
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>Secondary Phone</label>
              <input
                style={inputStyle}
                value={phoneSecondary}
                onChange={(e) => setPhoneSecondary(e.target.value)}
                placeholder="e.g. 011 234 5678"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Email Address</label>
              <input
                style={inputStyle}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@domain.com"
              />
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>National ID / NIC</label>
              <input
                style={inputStyle}
                value={nic}
                onChange={(e) => setNic(e.target.value)}
                placeholder="e.g. 851234567V"
              />
            </div>
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>Address</label>
            <input
              style={inputStyle}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 45 Galle Road, Colombo 03"
            />
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>Notes & Remarks</label>
            <textarea
              style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="VIP, company vehicle manager, special preferences..."
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
              {loading ? 'Saving...' : customerToEdit ? 'Update Customer' : 'Save Customer'}
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
  width: 500,
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

const warningBannerStyle: React.CSSProperties = {
  backgroundColor: '#fef3c7',
  color: '#92400e',
  padding: '10px 12px',
  borderRadius: 6,
  fontSize: 13,
  marginBottom: 12,
  border: '1px solid #fde68a'
}
