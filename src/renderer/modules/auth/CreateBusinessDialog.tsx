import React, { useState } from 'react'
import { api } from '../../api'

interface Props {
  isOpen: boolean
  onClose: () => void
  onCreated: (businessId: string) => void
}

export const CreateBusinessDialog: React.FC<Props> = ({ isOpen, onClose, onCreated }) => {
  const [name, setName] = useState('')
  const [ownerUsername, setOwnerUsername] = useState('')
  const [ownerPassword, setOwnerPassword] = useState('')
  const [ownerDisplayName, setOwnerDisplayName] = useState('')
  const [currencyCode, setCurrencyCode] = useState('LKR')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await api.business.create({
        name,
        ownerUsername,
        ownerPassword,
        ownerDisplayName,
        currencyCode
      })

      if (!res.success) {
        setError(res.error?.message || 'Failed to create business')
        setLoading(false)
        return
      }

      onCreated(res.data!.id)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={modalOverlayStyle}>
      <div style={modalContentStyle}>
        <h2 style={{ marginBottom: 16 }}>Register New Business</h2>
        {error && <div style={errorBannerStyle}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={formGroupStyle}>
            <label style={labelStyle}>Business / Workshop Name *</label>
            <input
              style={inputStyle}
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Apex Auto Services"
            />
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>Owner Full Name *</label>
            <input
              style={inputStyle}
              required
              value={ownerDisplayName}
              onChange={(e) => setOwnerDisplayName(e.target.value)}
              placeholder="e.g. Akalanka Perera"
            />
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>Owner Username *</label>
            <input
              style={inputStyle}
              required
              value={ownerUsername}
              onChange={(e) => setOwnerUsername(e.target.value)}
              placeholder="e.g. admin"
            />
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>Owner Password * (min 8 chars)</label>
            <input
              style={inputStyle}
              type="password"
              required
              minLength={8}
              value={ownerPassword}
              onChange={(e) => setOwnerPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>Currency Code</label>
            <input
              style={inputStyle}
              value={currencyCode}
              onChange={(e) => setCurrencyCode(e.target.value)}
              placeholder="LKR"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{ ...buttonStyle, backgroundColor: '#e5e7eb', color: '#374151' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{ ...buttonStyle, backgroundColor: '#2563eb', color: '#fff' }}
            >
              {loading ? 'Creating...' : 'Create & Provision'}
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
  padding: 28,
  borderRadius: 8,
  width: 440,
  boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
}

const formGroupStyle: React.CSSProperties = {
  marginBottom: 14
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 4,
  color: '#374151'
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: 6,
  border: '1px solid #d1d5db',
  fontSize: 14,
  outline: 'none'
}

const buttonStyle: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: 6,
  border: 'none',
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer'
}

const errorBannerStyle: React.CSSProperties = {
  backgroundColor: '#fee2e2',
  color: '#991b1b',
  padding: '10px 14px',
  borderRadius: 6,
  fontSize: 13,
  marginBottom: 16
}
