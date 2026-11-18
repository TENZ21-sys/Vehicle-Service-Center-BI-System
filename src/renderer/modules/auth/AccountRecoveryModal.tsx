import React, { useState } from 'react'
import { api } from '../../api'

interface Props {
  initialUsername?: string
  onClose: () => void
  onSuccess: (recoveredUsername: string) => void
}

export const AccountRecoveryModal: React.FC<Props> = ({
  initialUsername = '',
  onClose,
  onSuccess
}) => {
  const [activeTab, setActiveTab] = useState<'security_question' | 'master_key'>('security_question')

  // Security Question state
  const [username, setUsername] = useState(initialUsername)
  const [fetchedQuestion, setFetchedQuestion] = useState<string | null>(null)
  const [checkingQuestion, setCheckingQuestion] = useState(false)
  const [securityAnswer, setSecurityAnswer] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Master Key state
  const [masterKey, setMasterKey] = useState('')
  const [targetUsername, setTargetUsername] = useState(initialUsername)
  const [masterNewPassword, setMasterNewPassword] = useState('')
  const [masterConfirmPassword, setMasterConfirmPassword] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const handleFetchQuestion = async (): Promise<void> => {
    if (!username.trim()) {
      setError('Please enter your username first')
      return
    }
    setError(null)
    setCheckingQuestion(true)
    try {
      const res = await api.auth.getSecurityQuestion(username.trim())
      if (res.success && res.data) {
        if (res.data.securityQuestion) {
          setFetchedQuestion(res.data.securityQuestion)
        } else {
          setError(
            'No security question has been configured for this username. Please use the "Emergency Master Key" tab or contact your workshop owner.'
          )
        }
      } else {
        setError(res.error?.message || 'Could not verify username')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setCheckingQuestion(false)
    }
  }

  const handleSecurityReset = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setError(null)

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      const res = await api.auth.resetWithSecurityAnswer({
        username: username.trim(),
        securityAnswer: securityAnswer.trim(),
        newPassword
      })

      if (res.success) {
        setSuccessMsg(`Password successfully updated for ${username}! You can now sign in.`)
        setTimeout(() => onSuccess(username.trim()), 1500)
      } else {
        setError(res.error?.message || 'Reset failed. Please verify your answer.')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleMasterKeyReset = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setError(null)

    if (masterNewPassword.length < 8) {
      setError('New password must be at least 8 characters long')
      return
    }
    if (masterNewPassword !== masterConfirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      const res = await api.auth.resetWithMasterKey({
        masterRecoveryKey: masterKey.trim(),
        targetUsername: targetUsername.trim(),
        newPassword: masterNewPassword
      })

      if (res.success) {
        setSuccessMsg(`Password successfully reset for "${targetUsername}" using Emergency Master Key!`)
        setTimeout(() => onSuccess(targetUsername.trim()), 1500)
      } else {
        setError(res.error?.message || 'Recovery failed. Please verify the Emergency Master Key.')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: 10,
          padding: 24,
          maxWidth: 480,
          width: '90%',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>
            🔑 Account Password Recovery
          </h2>
          <button
            onClick={onClose}
            style={{ border: 'none', background: 'none', fontSize: 18, cursor: 'pointer', color: '#6b7280' }}
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', marginBottom: 20 }}>
          <button
            type="button"
            onClick={() => {
              setActiveTab('security_question')
              setError(null)
            }}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: 'none',
              borderBottom: activeTab === 'security_question' ? '2px solid #2563eb' : '2px solid transparent',
              backgroundColor: 'transparent',
              color: activeTab === 'security_question' ? '#2563eb' : '#6b7280',
              fontWeight: activeTab === 'security_question' ? 600 : 500,
              fontSize: 13,
              cursor: 'pointer'
            }}
          >
            Security Question
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('master_key')
              setError(null)
            }}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: 'none',
              borderBottom: activeTab === 'master_key' ? '2px solid #2563eb' : '2px solid transparent',
              backgroundColor: 'transparent',
              color: activeTab === 'master_key' ? '#2563eb' : '#6b7280',
              fontWeight: activeTab === 'master_key' ? 600 : 500,
              fontSize: 13,
              cursor: 'pointer'
            }}
          >
            Emergency Master Key
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: '#fef2f2',
              color: '#991b1b',
              border: '1px solid #fecaca',
              borderRadius: 6,
              fontSize: 13,
              marginBottom: 16
            }}
          >
            {error}
          </div>
        )}

        {successMsg && (
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: '#ecfdf5',
              color: '#065f46',
              border: '1px solid #a7f3d0',
              borderRadius: 6,
              fontSize: 13,
              marginBottom: 16
            }}
          >
            {successMsg}
          </div>
        )}

        {/* Security Question Tab */}
        {activeTab === 'security_question' && (
          <div>
            {!fetchedQuestion ? (
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 4 }}>
                  Enter your Username
                </label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. admin or staff ID"
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: 6,
                      fontSize: 13
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleFetchQuestion}
                    disabled={checkingQuestion}
                    style={{
                      padding: '8px 14px',
                      backgroundColor: '#2563eb',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      fontSize: 13,
                      cursor: checkingQuestion ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {checkingQuestion ? 'Checking...' : 'Find Question'}
                  </button>
                </div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>
                  Forgot your username? Close this and click "Forgot Username / ID?" on the login page.
                </div>
              </div>
            ) : (
              <form onSubmit={handleSecurityReset}>
                <div style={{ marginBottom: 12 }}>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>Username: </span>
                  <strong style={{ fontSize: 13, color: '#111827' }}>{username}</strong>{' '}
                  <button
                    type="button"
                    onClick={() => setFetchedQuestion(null)}
                    style={{
                      border: 'none',
                      background: 'none',
                      color: '#2563eb',
                      fontSize: 12,
                      cursor: 'pointer',
                      marginLeft: 6
                    }}
                  >
                    (Change)
                  </button>
                </div>

                <div
                  style={{
                    backgroundColor: '#f3f4f6',
                    padding: 12,
                    borderRadius: 6,
                    marginBottom: 14,
                    border: '1px solid #e5e7eb'
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                    Security Question
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1f2937', marginTop: 2 }}>
                    {fetchedQuestion}
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 4 }}>
                    Your Security Answer
                  </label>
                  <input
                    type="text"
                    required
                    value={securityAnswer}
                    onChange={(e) => setSecurityAnswer(e.target.value)}
                    placeholder="Enter the answer you registered"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: 6,
                      fontSize: 13,
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 4 }}>
                    New Password (min 8 characters)
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: 6,
                      fontSize: 13,
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 4 }}>
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: 6,
                      fontSize: 13,
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button
                    type="button"
                    onClick={onClose}
                    style={{
                      padding: '8px 14px',
                      backgroundColor: '#fff',
                      border: '1px solid #d1d5db',
                      borderRadius: 6,
                      fontSize: 13,
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#2563eb',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: loading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {loading ? 'Updating Password...' : 'Reset Password & Sign In'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Emergency Master Key Tab */}
        {activeTab === 'master_key' && (
          <form onSubmit={handleMasterKeyReset}>
            <div style={{ fontSize: 12, color: '#4b5563', lineHeight: 1.4, marginBottom: 14 }}>
              The <strong>Emergency Master Recovery Key</strong> was issued when this business was initialized.
              It allows resetting any staff or Owner account if you are locked out.
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 4 }}>
                Emergency Master Key
              </label>
              <input
                type="text"
                required
                value={masterKey}
                onChange={(e) => setMasterKey(e.target.value)}
                placeholder="e.g. APEX-A1B2-C3D4-E5F6-7890"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                  fontSize: 13,
                  fontFamily: 'monospace',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 4 }}>
                Target Username to Reset
              </label>
              <input
                type="text"
                required
                value={targetUsername}
                onChange={(e) => setTargetUsername(e.target.value)}
                placeholder="e.g. admin or tenz"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                  fontSize: 13,
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 4 }}>
                New Password (min 8 characters)
              </label>
              <input
                type="password"
                required
                value={masterNewPassword}
                onChange={(e) => setMasterNewPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                  fontSize: 13,
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 4 }}>
                Confirm New Password
              </label>
              <input
                type="password"
                required
                value={masterConfirmPassword}
                onChange={(e) => setMasterConfirmPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                  fontSize: 13,
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '8px 14px',
                  backgroundColor: '#fff',
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#dc2626',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Verifying Key...' : 'Recover Account'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
