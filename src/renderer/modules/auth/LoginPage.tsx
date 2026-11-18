import React, { useState, useEffect } from 'react'
import { api } from '../../api'
import { AuthSession, StaffLookupResult } from '@shared/types/user.types'
import { AccountRecoveryModal } from './AccountRecoveryModal'
import { UsernameLookupModal } from './UsernameLookupModal'

interface Props {
  businessName: string
  onBackToBusinesses: () => void
  onLoginSuccess: (session: AuthSession) => void
}

export const LoginPage: React.FC<Props> = ({
  businessName,
  onBackToBusinesses,
  onLoginSuccess
}) => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showRecoveryModal, setShowRecoveryModal] = useState(false)
  const [showLookupModal, setShowLookupModal] = useState(false)
  const [allowPasswordless, setAllowPasswordless] = useState(false)
  const [staffList, setStaffList] = useState<StaffLookupResult[]>([])

  useEffect(() => {
    checkPasswordless()
  }, [])

  const checkPasswordless = async (): Promise<void> => {
    try {
      const res = await api.settings.getByCategory('system')
      if (res.success && res.data && res.data.allow_passwordless_login) {
        setAllowPasswordless(true)
        const staffRes = await api.auth.listStaffDirectory()
        if (staffRes.success && staffRes.data) {
          setStaffList(staffRes.data)
        }
      }
    } catch {
      // ignore
    }
  }

  const handlePasswordlessLogin = async (staffUsername: string): Promise<void> => {
    setError(null)
    setLoading(true)
    try {
      const res = await api.auth.login(staffUsername, '')
      if (res.success && res.data) {
        onLoginSuccess(res.data)
      } else {
        setError(res.error?.message || 'Login failed.')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await api.auth.login(username.trim(), password)
      if (res.success && res.data) {
        onLoginSuccess(res.data)
      } else {
        setError(res.error?.message || 'Login failed. Please verify credentials.')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={{ marginBottom: 20 }}>
          <button
            onClick={onBackToBusinesses}
            style={{
              background: 'none',
              border: 'none',
              color: '#2563eb',
              cursor: 'pointer',
              fontSize: 13,
              marginBottom: 10,
              padding: 0
            }}
          >
            ← Switch Business
          </button>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>Staff Login</h1>
          <div style={{ fontSize: 13, color: '#4b5563', marginTop: 2 }}>
            Connected to: <strong>{businessName}</strong>
          </div>
        </div>

        {error && (
          <div style={errorBannerStyle}>
            <div>{error}</div>
            <div style={{ marginTop: 6, fontSize: 12 }}>
              Need help?{' '}
              <button
                type="button"
                onClick={() => setShowRecoveryModal(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#991b1b',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  padding: 0,
                  fontWeight: 600
                }}
              >
                Recover your account here
              </button>
            </div>
          </div>
        )}

        {/* Open Workshop Mode Quick Staff Grid */}
        {allowPasswordless && staffList.length > 0 && (
          <div
            style={{
              backgroundColor: '#f0fdf4',
              border: '1.5px solid #86efac',
              borderRadius: 10,
              padding: 14,
              marginBottom: 20
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <span style={{ fontSize: 16 }}>🔓</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Open Mode Active — Select Your Name to Sign In
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 8 }}>
              {staffList.map((s) => (
                <button
                  key={s.username}
                  type="button"
                  onClick={() => handlePasswordlessLogin(s.username)}
                  disabled={loading}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '10px 8px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #bbf7d0',
                    borderRadius: 8,
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#22c55e'
                    e.currentTarget.style.backgroundColor = '#f7fee7'
                    e.currentTarget.style.transform = 'translateY(-1px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#bbf7d0'
                    e.currentTarget.style.backgroundColor = '#ffffff'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: '#dcfce7',
                      color: '#15803d',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      fontWeight: 700,
                      marginBottom: 6
                    }}
                  >
                    {s.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#14532d', textAlign: 'center', lineHeight: 1.2 }}>
                    {s.displayName}
                  </div>
                  <div style={{ fontSize: 10, color: '#65a30d', marginTop: 2 }}>
                    @{s.username}
                  </div>
                </button>
              ))}
            </div>
            <div style={{ fontSize: 11, color: '#15803d', textAlign: 'center', marginTop: 10 }}>
              Or use standard credentials below:
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <label style={labelStyle}>Username / Staff ID</label>
              <button
                type="button"
                onClick={() => setShowLookupModal(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2563eb',
                  fontSize: 12,
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                Forgot ID?
              </button>
            </div>
            <input
              style={inputStyle}
              required
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. admin or staff username"
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <label style={labelStyle}>
                Password {allowPasswordless && <span style={{ color: '#16a34a', fontWeight: 500 }}>(Optional - Open Mode)</span>}
              </label>
              {!allowPasswordless && (
                <button
                  type="button"
                  onClick={() => setShowRecoveryModal(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2563eb',
                    fontSize: 12,
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  Forgot Password?
                </button>
              )}
            </div>
            <input
              style={inputStyle}
              type="password"
              required={!allowPasswordless}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={allowPasswordless ? 'Leave blank or enter password' : '••••••••'}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={submitBtnStyle}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #f3f4f6', textAlign: 'center' }}>
          <button
            type="button"
            onClick={() => setShowRecoveryModal(true)}
            style={{
              background: 'none',
              border: 'none',
              color: '#4b5563',
              fontSize: 12,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <span>🔐</span> Emergency Master Key Recovery
          </button>
        </div>
      </div>

      {showRecoveryModal && (
        <AccountRecoveryModal
          initialUsername={username}
          onClose={() => setShowRecoveryModal(false)}
          onSuccess={(recoveredUsername) => {
            setUsername(recoveredUsername)
            setPassword('')
            setShowRecoveryModal(false)
            setError(null)
          }}
        />
      )}

      {showLookupModal && (
        <UsernameLookupModal
          onClose={() => setShowLookupModal(false)}
          onSelectUsername={(selected) => {
            setUsername(selected)
            setShowLookupModal(false)
          }}
        />
      )}
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
  width: 420,
  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)'
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  margin: 0,
  color: '#374151'
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 6,
  border: '1px solid #d1d5db',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box'
}

const submitBtnStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 16px',
  backgroundColor: '#2563eb',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
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
