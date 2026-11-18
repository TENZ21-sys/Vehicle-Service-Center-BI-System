import React, { useState, useEffect } from 'react'
import { api } from '../../api'
import { BackupMetadata } from '@shared/types/backup.types'

export const BackupRestoreTab: React.FC = () => {
  const [backups, setBackups] = useState<BackupMetadata[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [notes, setNotes] = useState('')
  const [restoring, setRestoring] = useState(false)
  const [restoreTarget, setRestoreTarget] = useState<BackupMetadata | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [cleanupDays, setCleanupDays] = useState(30)
  const [autoBackupOnClose, setAutoBackupOnClose] = useState(true)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async (): Promise<void> => {
    setLoading(true)
    try {
      const [listRes, sysRes] = await Promise.all([
        api.backup.list(),
        api.settings.getByCategory('system')
      ])

      if (listRes.success && listRes.data) {
        setBackups(listRes.data)
      }
      if (sysRes.success && sysRes.data) {
        if (typeof sysRes.data.backup_auto_on_close === 'boolean') {
          setAutoBackupOnClose(sysRes.data.backup_auto_on_close)
        }
        if (typeof sysRes.data.backup_retention_days === 'number') {
          setCleanupDays(sysRes.data.backup_retention_days)
        }
      }
    } catch (err: unknown) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : String(err) })
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (): Promise<void> => {
    setCreating(true)
    setMsg(null)
    try {
      const res = await api.backup.create(notes.trim() || undefined)
      if (res.success && res.data) {
        setMsg({ type: 'success', text: `Backup successfully created: ${res.data.filename}` })
        setNotes('')
        await loadData()
      } else {
        setMsg({ type: 'error', text: res.error?.message || 'Failed to create backup' })
      }
    } catch (err: unknown) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : String(err) })
    } finally {
      setCreating(false)
    }
  }

  const handleConfirmRestore = async (): Promise<void> => {
    if (!restoreTarget) return
    setRestoring(true)
    setMsg(null)
    try {
      const res = await api.backup.restore(restoreTarget.filename)
      if (res.success) {
        setMsg({
          type: 'success',
          text: `Database successfully restored from ${restoreTarget.filename}. A safety snapshot of prior data was preserved.`
        })
        setRestoreTarget(null)
        await loadData()
      } else {
        setMsg({ type: 'error', text: res.error?.message || 'Failed to restore database' })
      }
    } catch (err: unknown) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : String(err) })
    } finally {
      setRestoring(false)
    }
  }

  const handleConfirmDelete = async (): Promise<void> => {
    if (!deleteTarget) return
    setMsg(null)
    try {
      const res = await api.backup.delete(deleteTarget)
      if (res.success) {
        setMsg({ type: 'success', text: `Backup ${deleteTarget} deleted successfully.` })
        setDeleteTarget(null)
        await loadData()
      } else {
        setMsg({ type: 'error', text: res.error?.message || 'Failed to delete backup' })
      }
    } catch (err: unknown) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : String(err) })
    }
  }

  const handleRunCleanup = async (): Promise<void> => {
    if (!confirm(`Are you sure you want to delete backups older than ${cleanupDays} days?`)) {
      return
    }
    setMsg(null)
    try {
      const res = await api.backup.cleanup(cleanupDays)
      if (res.success) {
        setMsg({ type: 'success', text: `Cleaned up ${res.data} old backup archive(s).` })
        await loadData()
      } else {
        setMsg({ type: 'error', text: res.error?.message || 'Cleanup failed' })
      }
    } catch (err: unknown) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : String(err) })
    }
  }

  const handleToggleAutoBackup = async (checked: boolean): Promise<void> => {
    setAutoBackupOnClose(checked)
    try {
      await api.settings.set('system', 'backup_auto_on_close', checked, 'boolean')
    } catch (err: unknown) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : String(err) })
    }
  }

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  return (
    <div style={{ maxWidth: 960 }}>
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

      {/* Manual Backup Trigger Card */}
      <div
        style={{
          backgroundColor: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          padding: 20,
          marginBottom: 24,
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 4 }}>
          Online Hot Backup
        </h3>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
          Generate a full, point-in-time snapshot of the active business database using the SQLite Online
          Backup API. Backups run safely in the background without locking tables or interrupting active users.
        </p>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Optional backup note (e.g. Before monthly audit reconciliation)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={creating}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              fontSize: 13
            }}
          />
          <button
            onClick={handleCreate}
            disabled={creating}
            style={{
              padding: '8px 18px',
              backgroundColor: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 500,
              cursor: creating ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            {creating ? 'Creating Snapshot...' : '💾 Backup Database Now'}
          </button>
        </div>
      </div>

      {/* Backup Settings & Maintenance Card */}
      <div
        style={{
          backgroundColor: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          padding: 16,
          marginBottom: 24,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16
        }}
      >
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={autoBackupOnClose}
            onChange={(e) => handleToggleAutoBackup(e.target.checked)}
            style={{ width: 16, height: 16, accentColor: '#2563eb' }}
          />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
              Automatic Backup on Application Close
            </div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>
              Automatically takes a safety snapshot when exiting the application.
            </div>
          </div>
        </label>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, color: '#4b5563' }}>Retention:</span>
          <input
            type="number"
            min={1}
            max={365}
            value={cleanupDays}
            onChange={(e) => setCleanupDays(parseInt(e.target.value, 10) || 30)}
            style={{
              width: 60,
              padding: '4px 8px',
              border: '1px solid #d1d5db',
              borderRadius: 4,
              fontSize: 13
            }}
          />
          <span style={{ fontSize: 13, color: '#4b5563' }}>days</span>
          <button
            onClick={handleRunCleanup}
            style={{
              padding: '6px 12px',
              backgroundColor: '#fff',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              fontSize: 12,
              color: '#374151',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            Prune Old Backups
          </button>
        </div>
      </div>

      {/* Backups List */}
      <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div>
            <h4 style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>
              Available Backups ({backups.length})
            </h4>
            <span style={{ fontSize: 12, color: '#6b7280' }}>
              Stored securely in local application storage for this business.
            </span>
          </div>
          <button
            onClick={loadData}
            style={{
              padding: '4px 10px',
              backgroundColor: '#fff',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              fontSize: 12,
              cursor: 'pointer'
            }}
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 30, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>
            Loading backups...
          </div>
        ) : backups.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
            No backup snapshots created yet. Click "Backup Database Now" above to generate your first snapshot.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#4b5563' }}>
                <th style={{ padding: '10px 16px', fontWeight: 600 }}>Filename</th>
                <th style={{ padding: '10px 16px', fontWeight: 600 }}>Created Date</th>
                <th style={{ padding: '10px 16px', fontWeight: 600 }}>Size</th>
                <th style={{ padding: '10px 16px', fontWeight: 600 }}>Notes / Type</th>
                <th style={{ padding: '10px 16px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {backups.map((b) => (
                <tr
                  key={b.filename}
                  style={{ borderBottom: '1px solid #f3f4f6' }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = '#f9fafb')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = 'transparent')}
                >
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 12, color: '#1f2937' }}>
                    {b.filename}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#4b5563' }}>
                    {new Date(b.createdAt).toLocaleString()}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#4b5563', whiteSpace: 'nowrap' }}>
                    {formatSize(b.sizeBytes)}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#6b7280' }}>
                    {b.notes || <span style={{ fontStyle: 'italic', color: '#9ca3af' }}>Manual snapshot</span>}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button
                      onClick={() => setRestoreTarget(b)}
                      style={{
                        padding: '4px 10px',
                        backgroundColor: '#fff',
                        border: '1px solid #f59e0b',
                        color: '#b45309',
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 500,
                        marginRight: 8,
                        cursor: 'pointer'
                      }}
                    >
                      Restore
                    </button>
                    <button
                      onClick={() => setDeleteTarget(b.filename)}
                      style={{
                        padding: '4px 10px',
                        backgroundColor: '#fff',
                        border: '1px solid #fca5a5',
                        color: '#b91c1c',
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 500,
                        cursor: 'pointer'
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Confirmation Modal for Restore */}
      {restoreTarget && (
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
              borderRadius: 8,
              padding: 24,
              maxWidth: 480,
              width: '90%',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
            }}
          >
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#b91c1c', marginBottom: 12 }}>
              ⚠️ Confirm Database Restore
            </h3>
            <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.5, marginBottom: 12 }}>
              You are about to restore the database to the snapshot from:
              <br />
              <strong>{restoreTarget.filename}</strong> (
              {new Date(restoreTarget.createdAt).toLocaleString()})
            </p>
            <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 20 }}>
              • All current database tables will be replaced by the contents of this backup.
              <br />
              • A safety fallback snapshot of your current state will automatically be saved.
              <br />
              • SQLite quick integrity checks will verify backup validity before restoring.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => setRestoreTarget(null)}
                disabled={restoring}
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
                onClick={handleConfirmRestore}
                disabled={restoring}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#dc2626',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: restoring ? 'not-allowed' : 'pointer'
                }}
              >
                {restoring ? 'Restoring Database...' : 'Yes, Restore Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Delete */}
      {deleteTarget && (
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
              borderRadius: 8,
              padding: 24,
              maxWidth: 420,
              width: '90%',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
            }}
          >
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 10 }}>
              Delete Backup File
            </h3>
            <p style={{ fontSize: 13, color: '#4b5563', marginBottom: 20 }}>
              Are you sure you want to permanently delete <strong>{deleteTarget}</strong>? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => setDeleteTarget(null)}
                style={{
                  padding: '6px 12px',
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
                onClick={handleConfirmDelete}
                style={{
                  padding: '6px 14px',
                  backgroundColor: '#dc2626',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Delete File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
