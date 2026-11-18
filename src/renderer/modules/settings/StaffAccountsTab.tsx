import React, { useState, useEffect } from 'react'
import { api } from '../../api'
import { User } from '@shared/types/user.types'
import { Role } from '@shared/types/role.types'

export const StaffAccountsTab: React.FC = () => {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [allowPasswordless, setAllowPasswordless] = useState(false)
  const [savingPasswordless, setSavingPasswordless] = useState(false)

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [resettingUser, setResettingUser] = useState<User | null>(null)
  const [deletingUser, setDeletingUser] = useState<User | null>(null)
  const [showEmergencyKeyModal, setShowEmergencyKeyModal] = useState(false)

  // Form states
  const [roles, setRoles] = useState<Role[]>([])

  useEffect(() => {
    loadUsers()
    loadPasswordlessSetting()
  }, [])

  const loadPasswordlessSetting = async (): Promise<void> => {
    try {
      const res = await api.settings.getByCategory('system')
      if (res.success && res.data) {
        setAllowPasswordless(Boolean(res.data.allow_passwordless_login))
      }
    } catch {
      // ignore
    }
  }

  const handleTogglePasswordless = async (enabled: boolean): Promise<void> => {
    setSavingPasswordless(true)
    setMsg(null)
    try {
      const res = await api.settings.set('system', 'allow_passwordless_login', enabled, 'boolean')
      if (res.success) {
        setAllowPasswordless(enabled)
        setMsg({
          type: 'success',
          text: enabled
            ? 'Open Workshop Mode enabled. Staff members can now log in without passwords.'
            : 'Password protection enforced. All staff accounts now require passwords to log in.'
        })
      } else {
        setMsg({ type: 'error', text: res.error?.message || 'Failed to update login security setting' })
      }
    } catch (err: unknown) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : String(err) })
    } finally {
      setSavingPasswordless(false)
    }
  }

  const loadUsers = async (): Promise<void> => {
    setLoading(true)
    try {
      const res = await api.auth.listUsers(true)
      if (res.success && res.data) {
        setUsers(res.data)
      } else {
        setMsg({ type: 'error', text: res.error?.message || 'Failed to load staff accounts' })
      }
    } catch (err: unknown) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : String(err) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 1000 }}>
      {msg && (
        <div
          style={{
            padding: 12,
            marginBottom: 20,
            borderRadius: 6,
            backgroundColor: msg.type === 'success' ? '#ecfdf5' : '#fef2f2',
            color: msg.type === 'success' ? '#065f46' : '#991b1b',
            border: `1px solid ${msg.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
            fontSize: 13
          }}
        >
          {msg.text}
        </div>
      )}

      {/* Header & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: 0 }}>
            Staff Accounts & Access Management
          </h3>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0 0' }}>
            Manage staff members, role assignments, security recovery questions, and emergency master access.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => setShowEmergencyKeyModal(true)}
            style={{
              padding: '8px 14px',
              backgroundColor: '#fff',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 500,
              color: '#374151',
              cursor: 'pointer'
            }}
          >
            🔐 Emergency Master Key
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            + Add Staff Member
          </button>
        </div>
      </div>

      {/* Passwordless / Open Workshop Mode Banner Card */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: allowPasswordless ? '#eff6ff' : '#f8fafc',
          border: `1.5px solid ${allowPasswordless ? '#93c5fd' : '#e2e8f0'}`,
          borderRadius: 10,
          padding: '16px 20px',
          marginBottom: 20,
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              backgroundColor: allowPasswordless ? '#dbeafe' : '#e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22
            }}
          >
            {allowPasswordless ? '🔓' : '🔒'}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
              Open Workshop Mode (Passwordless Staff Login)
            </div>
            <div style={{ fontSize: 12, color: '#475569', marginTop: 2, maxWidth: 640 }}>
              {allowPasswordless
                ? 'Open access is ACTIVE. Staff and technicians can log in with a single click from the login screen without entering passwords.'
                : 'Password protection is ENFORCED. All staff accounts must provide their password to sign in.'}
            </div>
          </div>
        </div>

        <button
          onClick={() => handleTogglePasswordless(!allowPasswordless)}
          disabled={savingPasswordless}
          style={{
            padding: '8px 18px',
            backgroundColor: allowPasswordless ? '#ef4444' : '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            cursor: savingPasswordless ? 'not-allowed' : 'pointer',
            opacity: savingPasswordless ? 0.7 : 1,
            boxShadow: '0 1px 2px rgba(0,0,0,0.08)'
          }}
        >
          {savingPasswordless
            ? 'Saving...'
            : allowPasswordless
            ? 'Enforce Passwords'
            : 'Enable Open Mode'}
        </button>
      </div>

      {/* Staff Accounts Table */}
      <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>
            Loading staff accounts...
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#4b5563' }}>
                <th style={{ padding: '10px 16px', fontWeight: 600 }}>Staff Name</th>
                <th style={{ padding: '10px 16px', fontWeight: 600 }}>Username / ID</th>
                <th style={{ padding: '10px 16px', fontWeight: 600 }}>Roles</th>
                <th style={{ padding: '10px 16px', fontWeight: 600 }}>Security Question</th>
                <th style={{ padding: '10px 16px', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '10px 16px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isOwner = (u.roles || []).some((r) => r.isOwner)
                return (
                  <tr
                    key={u.id}
                    style={{ borderBottom: '1px solid #f3f4f6' }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = '#f9fafb')}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#111827' }}>
                      {u.displayName}
                      {u.email && <div style={{ fontSize: 11, fontWeight: 400, color: '#6b7280' }}>{u.email}</div>}
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#2563eb' }}>
                      {u.username}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {(u.roles || []).map((r) => (
                        <span
                          key={r.id}
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: 9999,
                            fontSize: 11,
                            fontWeight: 600,
                            backgroundColor: r.isOwner ? '#fef3c7' : '#eff6ff',
                            color: r.isOwner ? '#92400e' : '#1e40af',
                            marginRight: 4
                          }}
                        >
                          {r.name}
                        </span>
                      ))}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#4b5563' }}>
                      {u.securityQuestion ? (
                        <span style={{ color: '#059669', fontSize: 12 }}>✓ Configured</span>
                      ) : (
                        <span style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: 12 }}>Not set</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: 9999,
                          fontSize: 11,
                          fontWeight: 600,
                          backgroundColor: u.isActive ? '#ecfdf5' : '#fef2f2',
                          color: u.isActive ? '#065f46' : '#991b1b'
                        }}
                      >
                        {u.isActive ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button
                        onClick={() => setResettingUser(u)}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: '#fff',
                          border: '1px solid #d1d5db',
                          borderRadius: 4,
                          fontSize: 12,
                          color: '#374151',
                          marginRight: 6,
                          cursor: 'pointer'
                        }}
                      >
                        Reset Password
                      </button>
                      <button
                        onClick={() => setEditingUser(u)}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: '#fff',
                          border: '1px solid #d1d5db',
                          borderRadius: 4,
                          fontSize: 12,
                          color: '#2563eb',
                          marginRight: 6,
                          cursor: 'pointer'
                        }}
                      >
                        Edit
                      </button>
                      {u.isActive && (
                        <button
                          onClick={() => setDeletingUser(u)}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: '#fff',
                            border: '1px solid #fecaca',
                            borderRadius: 4,
                            fontSize: 12,
                            color: '#dc2626',
                            cursor: 'pointer'
                          }}
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Delete / Deactivate User Modal with Password Verification */}
      {deletingUser && (
        <DeleteAccountModal
          targetUser={deletingUser}
          onClose={() => setDeletingUser(null)}
          onSuccess={() => {
            setDeletingUser(null)
            setMsg({ type: 'success', text: `Account for ${deletingUser.displayName} was successfully deactivated.` })
            loadUsers()
          }}
        />
      )}

      {/* Reset Password Modal */}
      {resettingUser && (
        <AdminResetPasswordModal
          targetUser={resettingUser}
          onClose={() => setResettingUser(null)}
          onSuccess={() => {
            setResettingUser(null)
            setMsg({ type: 'success', text: `Password successfully updated for ${resettingUser.username}.` })
          }}
        />
      )}

      {/* Edit Staff Member Modal */}
      {editingUser && (
        <EditStaffModal
          targetUser={editingUser}
          onClose={() => setEditingUser(null)}
          onSuccess={() => {
            setEditingUser(null)
            setMsg({ type: 'success', text: `Account for ${editingUser.displayName} was successfully updated.` })
            loadUsers()
          }}
        />
      )}

      {/* Create Staff Member Modal */}
      {showCreateModal && (
        <CreateStaffModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            setMsg({ type: 'success', text: 'New staff member successfully created.' })
            loadUsers()
          }}
        />
      )}

      {/* Emergency Master Key Modal */}
      {showEmergencyKeyModal && (
        <EmergencyMasterKeyModal onClose={() => setShowEmergencyKeyModal(false)} />
      )}
    </div>
  )
}

// Sub-components:

const DeleteAccountModal: React.FC<{
  targetUser: User
  onClose: () => void
  onSuccess: () => void
}> = ({ targetUser, onClose, onSuccess }) => {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isOwner = (targetUser.roles || []).some((r) => r.isOwner)

  const handleDelete = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await api.auth.deleteUser({
        userId: targetUser.id,
        verificationPassword: password
      })

      if (res.success) {
        onSuccess()
      } else {
        setError(res.error?.message || 'Deletion failed. Please verify password.')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={modalOverlayStyle}>
      <div style={modalCardStyle}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#b91c1c', marginBottom: 8 }}>
          ⚠️ Confirm Account Deactivation
        </h3>
        <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.4, marginBottom: 12 }}>
          You are about to deactivate the account for <strong>{targetUser.displayName}</strong> (
          <code>{targetUser.username}</code>).
        </p>

        {isOwner && (
          <div
            style={{
              padding: 10,
              backgroundColor: '#fef3c7',
              border: '1px solid #fde68a',
              borderRadius: 6,
              color: '#92400e',
              fontSize: 12,
              marginBottom: 14
            }}
          >
            <strong>Note:</strong> This user holds the <strong>Owner</strong> role. The system strictly forbids deleting
            the last remaining Owner account.
          </div>
        )}

        {error && <div style={{ color: '#b91c1c', fontSize: 13, marginBottom: 12 }}>{error}</div>}

        <form onSubmit={handleDelete}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
              Enter your current password to confirm:
            </label>
            <input
              type="password"
              required
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
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
              {loading ? 'Verifying...' : 'Deactivate Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const AdminResetPasswordModal: React.FC<{
  targetUser: User
  onClose: () => void
  onSuccess: () => void
}> = ({ targetUser, onClose, onSuccess }) => {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSelf, setIsSelf] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.auth.getSession().then((res) => {
      if (res.success && res.data && res.data.userId === targetUser.id) {
        setIsSelf(true)
      }
    })
  }, [targetUser.id])

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (isSelf && !currentPassword) {
      setError('Current password is required to change your own password')
      return
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      const res = await api.auth.changePassword(targetUser.id, {
        currentPassword: isSelf ? currentPassword : '',
        newPassword
      })

      if (res.success) {
        onSuccess()
      } else {
        setError(res.error?.message || 'Failed to update password')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={modalOverlayStyle}>
      <div style={modalCardStyle}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 12 }}>
          Reset Password for {targetUser.displayName} ({targetUser.username})
        </h3>

        {error && <div style={{ color: '#b91c1c', fontSize: 13, marginBottom: 12 }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          {isSelf && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                Current Password *
              </label>
              <input
                type="password"
                required
                autoFocus
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter your current password"
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
          )}

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
              New Password (min 8 characters) *
            </label>
            <input
              type="password"
              required
              autoFocus={!isSelf}
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

          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
              Confirm Password *
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
              {loading ? 'Updating...' : 'Set Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const CreateStaffModal: React.FC<{
  onClose: () => void
  onSuccess: () => void
}> = ({ onClose, onSuccess }) => {
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [securityQuestion, setSecurityQuestion] = useState('')
  const [securityAnswer, setSecurityAnswer] = useState('')
  const [roleId, setRoleId] = useState<string>('')
  const [roles, setRoles] = useState<Role[]>([])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadRoles()
  }, [])

  const loadRoles = async (): Promise<void> => {
    try {
      const res = await api.auth.listRoles()
      if (res.success && res.data) {
        setRoles(res.data)
        if (res.data.length > 0) {
          const defaultRole = res.data.find((r) => !r.isOwner) || res.data[0]
          setRoleId(defaultRole.id)
        }
      }
    } catch (e) {
      console.error('Failed to load roles', e)
    }
  }

  const handleCreate = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setError(null)

    if (!roleId) {
      setError('Please select a role for this staff member.')
      return
    }

    setLoading(true)

    try {
      const res = await api.auth.createUser({
        username: username.trim(),
        displayName: displayName.trim(),
        password,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        roleIds: [roleId],
        securityQuestion: securityQuestion.trim() || undefined,
        securityAnswer: securityAnswer.trim() || undefined
      })

      if (res.success) {
        onSuccess()
      } else {
        setError(res.error?.message || 'Failed to create staff member')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={modalOverlayStyle}>
      <div style={{ ...modalCardStyle, maxWidth: 520 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 14 }}>
          Add New Staff Member
        </h3>

        {error && <div style={{ color: '#b91c1c', fontSize: 13, marginBottom: 12 }}>{error}</div>}

        <form onSubmit={handleCreate}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={fieldLabelStyle}>Username / ID *</label>
              <input
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. samantha"
                style={fieldInputStyle}
              />
            </div>
            <div>
              <label style={fieldLabelStyle}>Display Name *</label>
              <input
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Samantha Perera"
                style={fieldInputStyle}
              />
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={fieldLabelStyle}>Role Assignment *</label>
            <select
              required
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              style={fieldInputStyle}
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} {r.isOwner ? '(Full Ownership & Deletion Rights)' : `(${r.description})`}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={fieldLabelStyle}>Password (min 8 chars) *</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={fieldInputStyle}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={fieldLabelStyle}>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="samantha@workshop.com"
                style={fieldInputStyle}
              />
            </div>
            <div>
              <label style={fieldLabelStyle}>Phone Number</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0771234567"
                style={fieldInputStyle}
              />
            </div>
          </div>

          <div style={{ padding: 12, backgroundColor: '#f9fafb', borderRadius: 6, marginBottom: 16, border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Personal Security Question (For Self-Recovery)
            </div>
            <div style={{ marginBottom: 8 }}>
              <input
                value={securityQuestion}
                onChange={(e) => setSecurityQuestion(e.target.value)}
                placeholder="e.g. What was the name of your first primary school?"
                style={fieldInputStyle}
              />
            </div>
            <div>
              <input
                value={securityAnswer}
                onChange={(e) => setSecurityAnswer(e.target.value)}
                placeholder="Security answer (case-insensitive)"
                style={fieldInputStyle}
              />
            </div>
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
              {loading ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const EditStaffModal: React.FC<{
  targetUser: User
  onClose: () => void
  onSuccess: () => void
}> = ({ targetUser, onClose, onSuccess }) => {
  const [displayName, setDisplayName] = useState(targetUser.displayName)
  const [email, setEmail] = useState(targetUser.email || '')
  const [phone, setPhone] = useState(targetUser.phone || '')
  const [roleId, setRoleId] = useState<string>(targetUser.roles?.[0]?.id || '')
  const [roles, setRoles] = useState<Role[]>([])
  const [isActive, setIsActive] = useState<boolean>(targetUser.isActive)
  const [securityQuestion, setSecurityQuestion] = useState(targetUser.securityQuestion || '')
  const [securityAnswer, setSecurityAnswer] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isOwner = (targetUser.roles || []).some((r) => r.isOwner)

  useEffect(() => {
    loadRoles()
  }, [])

  const loadRoles = async (): Promise<void> => {
    try {
      const res = await api.auth.listRoles()
      if (res.success && res.data) {
        setRoles(res.data)
        if (!roleId && res.data.length > 0) {
          setRoleId(res.data[0].id)
        }
      }
    } catch (e) {
      console.error('Failed to load roles', e)
    }
  }

  const handleUpdate = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const payload: any = {
        displayName: displayName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        isActive,
        roleIds: roleId ? [roleId] : undefined
      }

      if (securityQuestion.trim()) {
        payload.securityQuestion = securityQuestion.trim()
      }
      if (securityAnswer.trim()) {
        payload.securityAnswer = securityAnswer.trim()
      }

      const res = await api.auth.updateUser(targetUser.id, payload)
      if (res.success) {
        onSuccess()
      } else {
        setError(res.error?.message || 'Failed to update staff member')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={modalOverlayStyle}>
      <div style={{ ...modalCardStyle, maxWidth: 520 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>
              Edit Staff Member
            </h3>
            <span style={{ fontSize: 12, color: '#6b7280' }}>
              Account: <strong style={{ fontFamily: 'monospace', color: '#2563eb' }}>{targetUser.username}</strong>
            </span>
          </div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 12,
              backgroundColor: isOwner ? '#fef3c7' : '#eff6ff',
              color: isOwner ? '#92400e' : '#1e40af'
            }}
          >
            {targetUser.roles?.[0]?.name || 'Staff'}
          </span>
        </div>

        {error && <div style={{ color: '#b91c1c', fontSize: 13, marginBottom: 12 }}>{error}</div>}

        <form onSubmit={handleUpdate}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={fieldLabelStyle}>Username (Fixed)</label>
              <input
                disabled
                value={targetUser.username}
                style={{ ...fieldInputStyle, backgroundColor: '#f3f4f6', color: '#6b7280' }}
              />
            </div>
            <div>
              <label style={fieldLabelStyle}>Display Name *</label>
              <input
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Staff Member Name"
                style={fieldInputStyle}
              />
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={fieldLabelStyle}>Role Assignment *</label>
            <select
              required
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              style={fieldInputStyle}
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} {r.isOwner ? '(Full Ownership & Master Control)' : `(${r.description})`}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={fieldLabelStyle}>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@workshop.com"
                style={fieldInputStyle}
              />
            </div>
            <div>
              <label style={fieldLabelStyle}>Phone Number</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0771234567"
                style={fieldInputStyle}
              />
            </div>
          </div>

          <div style={{ padding: 12, backgroundColor: '#f9fafb', borderRadius: 6, marginBottom: 16, border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Update Security Recovery Question (Optional)
            </div>
            <div style={{ marginBottom: 8 }}>
              <input
                value={securityQuestion}
                onChange={(e) => setSecurityQuestion(e.target.value)}
                placeholder="e.g. What was the name of your first primary school?"
                style={fieldInputStyle}
              />
            </div>
            <div>
              <input
                value={securityAnswer}
                onChange={(e) => setSecurityAnswer(e.target.value)}
                placeholder="Leave blank to keep existing answer, or enter new answer"
                style={fieldInputStyle}
              />
            </div>
          </div>

          <div style={{ marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              id="isActiveStaff"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            <label htmlFor="isActiveStaff" style={{ fontSize: 13, fontWeight: 500, color: '#374151', cursor: 'pointer' }}>
              Account Active (Uncheck to suspend login access)
            </label>
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
              {loading ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const EmergencyMasterKeyModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [password, setPassword] = useState('')
  const [regeneratedKey, setRegeneratedKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleRegenerate = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await api.auth.regenerateEmergencyKey(password)
      if (res.success && res.data) {
        setRegeneratedKey(res.data)
      } else {
        setError(res.error?.message || 'Failed to verify Owner password.')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = (): void => {
    if (regeneratedKey) {
      navigator.clipboard.writeText(regeneratedKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div style={modalOverlayStyle}>
      <div style={{ ...modalCardStyle, maxWidth: 520 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
          🔐 Emergency Business Recovery Key
        </h3>
        <p style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.4, marginBottom: 14 }}>
          The Emergency Master Recovery Key is the ultimate safety net for this business. It can be used on the
          login screen to reset the Owner account if all staff credentials are forgotten.
        </p>

        {error && <div style={{ color: '#b91c1c', fontSize: 13, marginBottom: 12 }}>{error}</div>}

        {!regeneratedKey ? (
          <form onSubmit={handleRegenerate}>
            <div style={{ marginBottom: 16 }}>
              <label style={fieldLabelStyle}>Enter your Owner password to view/regenerate key:</label>
              <input
                type="password"
                required
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Owner password"
                style={fieldInputStyle}
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
                Close
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
                {loading ? 'Verifying...' : 'Generate / Reveal Key'}
              </button>
            </div>
          </form>
        ) : (
          <div>
            <div
              style={{
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: 8,
                padding: 16,
                textAlign: 'center',
                marginBottom: 16
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 600, color: '#1e40af', textTransform: 'uppercase' }}>
                Your Emergency Master Key
              </div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  fontFamily: 'monospace',
                  color: '#1e3a8a',
                  letterSpacing: '0.05em',
                  margin: '8px 0'
                }}
              >
                {regeneratedKey}
              </div>
              <button
                type="button"
                onClick={handleCopy}
                style={{
                  padding: '4px 12px',
                  backgroundColor: '#fff',
                  border: '1px solid #bfdbfe',
                  borderRadius: 4,
                  fontSize: 12,
                  color: '#1e40af',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {copied ? '✓ Copied to Clipboard!' : '📋 Copy Key'}
              </button>
            </div>

            <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 20 }}>
              ⚠️ Store this key in a secure location (e.g. printed in the workshop safe or written down).
              This key can unlock the business from the login screen at any time.
            </p>

            <div style={{ textAlign: 'right' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0,0,0,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000
}

const modalCardStyle: React.CSSProperties = {
  backgroundColor: '#fff',
  borderRadius: 8,
  padding: 24,
  maxWidth: 440,
  width: '90%',
  boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
}

const fieldLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: '#374151',
  marginBottom: 4
}

const fieldInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  fontSize: 13,
  boxSizing: 'border-box'
}
