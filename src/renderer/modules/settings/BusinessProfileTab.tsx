import React, { useState, useEffect } from 'react'
import { api } from '../../api'

export const BusinessProfileTab: React.FC = () => {
  const [formData, setFormData] = useState({
    business_name: '',
    address: '',
    phone: '',
    email: '',
    currency_code: 'LKR',
    currency_symbol: 'Rs.',
    currency_decimals: 2
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async (): Promise<void> => {
    try {
      const res = await api.settings.getByCategory('business_profile')
      if (res.success && res.data) {
        setFormData({
          business_name: String(res.data.business_name || ''),
          address: String(res.data.address || ''),
          phone: String(res.data.phone || ''),
          email: String(res.data.email || ''),
          currency_code: String(res.data.currency_code || 'LKR'),
          currency_symbol: String(res.data.currency_symbol || 'Rs.'),
          currency_decimals: Number(res.data.currency_decimals || 2)
        })
      }
    } catch (err: unknown) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : String(err) })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setSaving(true)
    setMsg(null)

    try {
      const res = await api.settings.updateProfile(formData)
      if (res.success) {
        setMsg({ type: 'success', text: 'Business profile successfully updated & audit logged.' })
      } else {
        setMsg({ type: 'error', text: res.error?.message || 'Failed to update profile' })
      }
    } catch (err: unknown) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : String(err) })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div>Loading business profile...</div>

  return (
    <div style={{ maxWidth: 600 }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#111827' }}>
        Business Center Profile & Currency
      </h3>

      {msg && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 6,
            marginBottom: 16,
            backgroundColor: msg.type === 'success' ? '#dcfce7' : '#fee2e2',
            color: msg.type === 'success' ? '#166534' : '#991b1b',
            fontSize: 13
          }}
        >
          {msg.text}
        </div>
      )}

      <form onSubmit={handleSave}>
        <div style={formGroupStyle}>
          <label style={labelStyle}>Business Display Name *</label>
          <input
            style={inputStyle}
            required
            value={formData.business_name}
            onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
          />
        </div>

        <div style={formGroupStyle}>
          <label style={labelStyle}>Workshop Address</label>
          <textarea
            style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={formGroupStyle}>
            <label style={labelStyle}>Contact Phone</label>
            <input
              style={inputStyle}
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>Contact Email</label>
            <input
              style={inputStyle}
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
          <div style={formGroupStyle}>
            <label style={labelStyle}>Currency Code</label>
            <input
              style={inputStyle}
              value={formData.currency_code}
              onChange={(e) => setFormData({ ...formData, currency_code: e.target.value })}
            />
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>Currency Symbol</label>
            <input
              style={inputStyle}
              value={formData.currency_symbol}
              onChange={(e) => setFormData({ ...formData, currency_symbol: e.target.value })}
            />
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>Decimals</label>
            <input
              style={inputStyle}
              type="number"
              min={0}
              max={4}
              value={formData.currency_decimals}
              onChange={(e) => setFormData({ ...formData, currency_decimals: parseInt(e.target.value, 10) || 0 })}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          style={saveBtnStyle}
        >
          {saving ? 'Saving...' : 'Save Profile Changes'}
        </button>
      </form>
    </div>
  )
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

const saveBtnStyle: React.CSSProperties = {
  padding: '10px 20px',
  backgroundColor: '#2563eb',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  marginTop: 10
}
