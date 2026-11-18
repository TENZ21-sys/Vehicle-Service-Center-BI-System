import React, { useEffect, useState } from 'react'
import { api } from '../../api'
import { CreateBusinessDialog } from './CreateBusinessDialog'
import { AccountManagementModal } from './AccountManagementModal'

interface BusinessItem {
  id: string
  name: string
  db_filename: string
  created_at: string
}

interface Props {
  onSelectBusiness: (business: BusinessItem) => void
}

export const BusinessSelectPage: React.FC<Props> = ({ onSelectBusiness }) => {
  const [businesses, setBusinesses] = useState<BusinessItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showManageModal, setShowManageModal] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadBusinesses = async (): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.business.list()
      if (res.success && res.data) {
        setBusinesses(res.data)
      } else {
        setError(res.error?.message || 'Could not load business accounts')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBusinesses()
  }, [])

  const handleSelect = async (biz: BusinessItem): Promise<void> => {
    try {
      const res = await api.business.select(biz.id)
      if (res.success) {
        onSelectBusiness(biz)
      } else {
        setError(res.error?.message || 'Failed to open business database')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827' }}>Vehicle Service Center</h1>
          <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>
            Select a service center account to begin
          </p>
        </div>

        {error && <div style={errorBannerStyle}>{error}</div>}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 24, color: '#6b7280' }}>
            Loading accounts...
          </div>
        ) : (
          <div style={{ maxHeight: 320, overflowY: 'auto', marginBottom: 20 }}>
            {businesses.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 20px', color: '#6b7280' }}>
                No registered service center accounts found. Create your first business below to begin.
              </div>
            ) : (
              businesses.map((biz) => (
                <div
                  key={biz.id}
                  onClick={() => handleSelect(biz)}
                  style={businessItemStyle}
                >
                  <div>
                    <div style={{ fontWeight: 600, color: '#1f2937' }}>{biz.name}</div>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>ID: {biz.id.slice(0, 8)}…</div>
                  </div>
                  <span style={{ color: '#2563eb', fontSize: 18 }}>→</span>
                </div>
              ))
            )}
          </div>
        )}

        <button
          onClick={() => setShowCreateDialog(true)}
          style={createBtnStyle}
        >
          + Add New Business Account
        </button>

        {businesses.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 14 }}>
            <button
              type="button"
              onClick={() => setShowManageModal(true)}
              style={{
                background: 'none',
                border: 'none',
                color: '#4b5563',
                fontSize: 13,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 8px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#111827'
                e.currentTarget.style.textDecoration = 'underline'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#4b5563'
                e.currentTarget.style.textDecoration = 'none'
              }}
            >
              <span>⚙️</span> Manage Accounts
            </button>
          </div>
        )}
      </div>

      <CreateBusinessDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onCreated={() => {
          setShowCreateDialog(false)
          loadBusinesses()
        }}
      />

      <AccountManagementModal
        isOpen={showManageModal}
        businesses={businesses}
        onClose={() => setShowManageModal(false)}
        onRefresh={() => {
          loadBusinesses()
        }}
      />
    </div>
  )
}

const containerStyle: React.CSSProperties = {
  display: 'flex',
  height: '100vh',
  width: '100vw',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#f3f4f6'
}

const cardStyle: React.CSSProperties = {
  backgroundColor: '#fff',
  borderRadius: 12,
  padding: 36,
  width: 480,
  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)'
}

const businessItemStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '14px 16px',
  borderRadius: 8,
  border: '1px solid #e5e7eb',
  marginBottom: 10,
  cursor: 'pointer',
  transition: 'background-color 0.15s'
}

const createBtnStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 16px',
  backgroundColor: '#f3f4f6',
  color: '#2563eb',
  border: '1px dashed #93c5fd',
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
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
