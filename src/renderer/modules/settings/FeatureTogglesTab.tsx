import React, { useState, useEffect } from 'react'
import { api } from '../../api'

interface Props {
  onTogglesChanged: (toggles: Record<string, boolean>) => void
}

export const FeatureTogglesTab: React.FC<Props> = ({ onTogglesChanged }) => {
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    module_appointments: true,
    module_quotations: true,
    module_inventory: true,
    module_finance: true,
    module_bi: true
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    loadToggles()
  }, [])

  const loadToggles = async (): Promise<void> => {
    try {
      const res = await api.settings.getFeatureToggles()
      if (res.success && res.data) {
        setToggles(res.data)
      }
    } catch (err: unknown) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : String(err) })
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = (key: string): void => {
    setToggles((prev) => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const handleSave = async (): Promise<void> => {
    setSaving(true)
    setMsg(null)
    try {
      const res = await api.settings.updateToggles(toggles)
      if (res.success && res.data) {
        setMsg({ type: 'success', text: 'Feature toggles successfully saved & audit logged.' })
        onTogglesChanged(res.data)
      } else {
        setMsg({ type: 'error', text: res.error?.message || 'Failed to save feature toggles' })
      }
    } catch (err: unknown) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : String(err) })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div>Loading feature toggles...</div>

  const modules = [
    {
      key: 'module_appointments',
      title: 'Appointments & Reception',
      desc: 'Bookings, appointment schedules, and walk-in check-in reception workflow'
    },
    {
      key: 'module_quotations',
      title: 'Estimates & Quotations',
      desc: 'Draft vehicle repair quotations and convert directly to job cards or invoices'
    },
    {
      key: 'module_inventory',
      title: 'Inventory & Parts Tracking',
      desc: 'Inventory items, stock movement ledger, purchase orders, and low-stock alerts'
    },
    {
      key: 'module_finance',
      title: 'Financial Records & Expenses',
      desc: 'Track operational expenses, daily collection totals, and net profit'
    },
    {
      key: 'module_bi',
      title: 'Business Intelligence Dashboards',
      desc: 'Interactive BI charts and sales performance analysis based on real transactions'
    }
  ]

  return (
    <div style={{ maxWidth: 640 }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: '#111827' }}>
        Per-Business Module Feature Toggles
      </h3>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>
        Turn modules on or off for this business. Toggling off a module hides navigation and blocks
        actions, but never modifies or deletes any historical data.
      </p>

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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {modules.map((m) => {
          const isEnabled = toggles[m.key] !== false
          return (
            <div
              key={m.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                backgroundColor: isEnabled ? '#ffffff' : '#f9fafb'
              }}
            >
              <div style={{ flex: 1, paddingRight: 20 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: isEnabled ? '#111827' : '#6b7280' }}>
                  {m.title}
                </div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{m.desc}</div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={() => handleToggle(m.key)}
                  style={{ width: 18, height: 18, cursor: 'pointer' }}
                />
                <span style={{ fontSize: 13, fontWeight: 500, color: isEnabled ? '#16a34a' : '#9ca3af' }}>
                  {isEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </label>
            </div>
          )
        })}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          padding: '10px 20px',
          backgroundColor: '#2563eb',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          marginTop: 20
        }}
      >
        {saving ? 'Saving...' : 'Save Module Configuration'}
      </button>
    </div>
  )
}
