import React, { useState } from 'react'
import { api } from '../../api'

interface BusinessItem {
  id: string
  name: string
  db_filename: string
  created_at: string
}

interface Props {
  isOpen: boolean
  businesses: BusinessItem[]
  onClose: () => void
  onRefresh: () => void
}

export const AccountManagementModal: React.FC<Props> = ({
  isOpen,
  businesses,
  onClose,
  onRefresh
}) => {
  const [selectedBiz, setSelectedBiz] = useState<BusinessItem | null>(null)
  const [ownerPassword, setOwnerPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  if (!isOpen) return null

  const handleStartDelete = (biz: BusinessItem): void => {
    setSelectedBiz(biz)
    setOwnerPassword('')
    setErrorMsg(null)
    setSuccessMsg(null)
  }

  const handleCancelDelete = (): void => {
    setSelectedBiz(null)
    setOwnerPassword('')
    setErrorMsg(null)
  }

  const handleConfirmDelete = async (): Promise<void> => {
    if (!selectedBiz) return
    if (!ownerPassword.trim()) {
      setErrorMsg('Please enter the owner password to confirm account deletion.')
      return
    }

    setLoading(true)
    setErrorMsg(null)
    try {
      const res = await api.business.delete(selectedBiz.id, ownerPassword.trim())
      if (res.success) {
        setSuccessMsg(`Account "${selectedBiz.name}" has been permanently removed.`)
        setSelectedBiz(null)
        setOwnerPassword('')
        onRefresh()
      } else {
        setErrorMsg(res.error?.message || 'Failed to remove account. Please verify the owner password.')
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>
              ⚙️ Account Management
            </h2>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0 0' }}>
              Manage registered businesses. Account removal requires Owner password verification for safety.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 20,
              cursor: 'pointer',
              color: '#9ca3af',
              padding: '0 4px'
            }}
          >
            ×
          </button>
        </div>

        {/* Notifications */}
        {errorMsg && (
          <div style={{ ...alertStyle, backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b' }}>
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div style={{ ...alertStyle, backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534' }}>
            {successMsg}
          </div>
        )}

        {/* Accounts List */}
        <div style={{ maxHeight: 380, overflowY: 'auto', marginBottom: 20 }}>
          {businesses.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>
              No business accounts currently registered.
            </div>
          ) : (
            businesses.map((biz) => {
              const isDeletingThis = selectedBiz?.id === biz.id

              return (
                <div
                  key={biz.id}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    padding: 14,
                    marginBottom: 10,
                    backgroundColor: isDeletingThis ? '#fff7ed' : '#ffffff',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#111827', fontSize: 15 }}>{biz.name}</div>
                      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                        Database ID: <code style={{ backgroundColor: '#f3f4f6', padding: '1px 4px', borderRadius: 4 }}>{biz.id.slice(0, 8)}</code> • Created: {new Date(biz.created_at).toLocaleDateString()}
                      </div>
                    </div>

                    {!isDeletingThis && (
                      <button
                        type="button"
                        onClick={() => handleStartDelete(biz)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#fee2e2',
                          border: '1px solid #fca5a5',
                          borderRadius: 6,
                          color: '#dc2626',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        🗑️ Delete Account
                      </button>
                    )}
                  </div>

                  {/* Password-protected Deletion Panel */}
                  {isDeletingThis && (
                    <div
                      style={{
                        marginTop: 14,
                        paddingTop: 12,
                        borderTop: '1px solid #fed7aa'
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#9a3412', marginBottom: 6 }}>
                        🔒 Security Check: Enter Owner Password to Delete
                      </div>
                      <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 10px 0' }}>
                        This permanently erases <strong>"{biz.name}"</strong> and all its databases. Enter the Owner password or Emergency Master Key to authorize deletion.
                      </p>

                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <input
                          type="password"
                          autoFocus
                          value={ownerPassword}
                          onChange={(e) => setOwnerPassword(e.target.value)}
                          placeholder="Owner password or recovery key"
                          style={{
                            flex: 1,
                            minWidth: 200,
                            padding: '8px 12px',
                            borderRadius: 6,
                            border: '1px solid #d1d5db',
                            fontSize: 13,
                            outline: 'none'
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleConfirmDelete()
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleConfirmDelete}
                          disabled={loading || !ownerPassword.trim()}
                          style={{
                            padding: '8px 14px',
                            backgroundColor: '#dc2626',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: 6,
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: loading || !ownerPassword.trim() ? 'not-allowed' : 'pointer',
                            opacity: loading || !ownerPassword.trim() ? 0.6 : 1
                          }}
                        >
                          {loading ? 'Verifying...' : 'Authorize & Delete'}
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelDelete}
                          disabled={loading}
                          style={{
                            padding: '8px 12px',
                            backgroundColor: '#f3f4f6',
                            color: '#374151',
                            border: '1px solid #d1d5db',
                            borderRadius: 6,
                            fontSize: 13,
                            cursor: 'pointer'
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #e5e7eb', paddingTop: 14 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              color: '#374151',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000
}

const modalStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: 12,
  width: '100%',
  maxWidth: 560,
  padding: 24,
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
}

const alertStyle: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 8,
  fontSize: 13,
  marginBottom: 14
}
