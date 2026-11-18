import React, { useState, useEffect } from 'react'
import { api } from '../../api'
import { AuditLogEntry } from '@shared/types/audit.types'

export const AuditTrailTab: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [actionFilter, setActionFilter] = useState('')
  const [entityFilter, setEntityFilter] = useState('')
  const [limit, setLimit] = useState(100)
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    loadAuditTrail()
  }, [actionFilter, entityFilter, limit])

  const loadAuditTrail = async (): Promise<void> => {
    setLoading(true)
    setMsg(null)
    try {
      const filters: Record<string, unknown> = { limit }
      if (actionFilter) filters.action = actionFilter
      if (entityFilter) filters.entityType = entityFilter

      const res = await api.system.getAuditTrail(filters)
      if (res.success && res.data) {
        setLogs(res.data)
      } else {
        setMsg(res.error?.message || 'Failed to load audit trail')
      }
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  const getActionBadgeColor = (action: string): { bg: string; text: string; border: string } => {
    if (action.includes('CREATED') || action.includes('SUCCESS') || action.includes('LOGIN')) {
      return { bg: '#ecfdf5', text: '#065f46', border: '#a7f3d0' }
    }
    if (action.includes('VOID') || action.includes('DELETE') || action.includes('FAIL') || action.includes('DEACTIVATED')) {
      return { bg: '#fef2f2', text: '#991b1b', border: '#fecaca' }
    }
    if (action.includes('BACKUP') || action.includes('RESTORE') || action.includes('VACUUM')) {
      return { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' }
    }
    return { bg: '#f3f4f6', text: '#374151', border: '#e5e7eb' }
  }

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 4 }}>
          Tamper-Evident Audit Trail
        </h3>
        <p style={{ fontSize: 13, color: '#6b7280' }}>
          Chronological, append-only record of all security, authentication, system configuration,
          and transactional modifications across the service center.
        </p>
      </div>

      {msg && (
        <div
          style={{
            padding: 12,
            marginBottom: 16,
            borderRadius: 6,
            backgroundColor: '#fef2f2',
            color: '#991b1b',
            border: '1px solid #fecaca',
            fontSize: 13
          }}
        >
          {msg}
        </div>
      )}

      {/* Filter Toolbar */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          marginBottom: 16,
          alignItems: 'center',
          flexWrap: 'wrap',
          backgroundColor: '#f9fafb',
          padding: '12px 16px',
          borderRadius: 8,
          border: '1px solid #e5e7eb'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 500, color: '#4b5563' }}>Action:</label>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid #d1d5db',
              fontSize: 13,
              backgroundColor: '#fff'
            }}
          >
            <option value="">All Actions</option>
            <option value="LOGIN_SUCCESS">LOGIN_SUCCESS</option>
            <option value="LOGIN_FAILED">LOGIN_FAILED</option>
            <option value="LOGOUT">LOGOUT</option>
            <option value="SETTING_CHANGED">SETTING_CHANGED</option>
            <option value="BACKUP_CREATED">BACKUP_CREATED</option>
            <option value="BACKUP_RESTORED">BACKUP_RESTORED</option>
            <option value="DATABASE_VACUUM">DATABASE_VACUUM</option>
            <option value="DATA_EXPORT">DATA_EXPORT</option>
            <option value="INVOICE_CREATED">INVOICE_CREATED</option>
            <option value="PAYMENT_RECORDED">PAYMENT_RECORDED</option>
            <option value="EXPENSE_CREATED">EXPENSE_CREATED</option>
            <option value="STOCK_ADJUSTED">STOCK_ADJUSTED</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 500, color: '#4b5563' }}>Entity Type:</label>
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid #d1d5db',
              fontSize: 13,
              backgroundColor: '#fff'
            }}
          >
            <option value="">All Entities</option>
            <option value="customer">Customer</option>
            <option value="vehicle">Vehicle</option>
            <option value="invoice">Invoice</option>
            <option value="expense">Expense</option>
            <option value="job_card">Job Card</option>
            <option value="appointment">Appointment</option>
            <option value="quotation">Quotation</option>
            <option value="inventory_item">Inventory Item</option>
            <option value="setting">Setting</option>
            <option value="database">Database</option>
            <option value="auth">Auth</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 500, color: '#4b5563' }}>Max Rows:</label>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid #d1d5db',
              fontSize: 13,
              backgroundColor: '#fff'
            }}
          >
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={250}>250</option>
            <option value={500}>500</option>
          </select>
        </div>

        <button
          onClick={loadAuditTrail}
          style={{
            marginLeft: 'auto',
            padding: '6px 14px',
            backgroundColor: '#fff',
            border: '1px solid #d1d5db',
            borderRadius: 6,
            fontSize: 13,
            cursor: 'pointer',
            fontWeight: 500
          }}
        >
          🔄 Refresh Log
        </button>
      </div>

      {/* Audit Log Table */}
      <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>
            Querying audit log entries...
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
            No audit records found matching the specified filters.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#4b5563' }}>
                <th style={{ padding: '10px 16px', fontWeight: 600, width: 170 }}>Timestamp</th>
                <th style={{ padding: '10px 16px', fontWeight: 600 }}>Action</th>
                <th style={{ padding: '10px 16px', fontWeight: 600 }}>Target Entity</th>
                <th style={{ padding: '10px 16px', fontWeight: 600 }}>User ID</th>
                <th style={{ padding: '10px 16px', fontWeight: 600, textAlign: 'right' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const badge = getActionBadgeColor(log.action)
                return (
                  <tr
                    key={log.id}
                    style={{ borderBottom: '1px solid #f3f4f6' }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = '#f9fafb')}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '10px 16px', color: '#4b5563', whiteSpace: 'nowrap', fontSize: 12 }}>
                      {log.createdAt ? new Date(log.createdAt).toLocaleString() : '—'}
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: 9999,
                          fontSize: 11,
                          fontWeight: 600,
                          backgroundColor: badge.bg,
                          color: badge.text,
                          border: `1px solid ${badge.border}`
                        }}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px', color: '#1f2937' }}>
                      {log.entityType ? (
                        <span>
                          <strong style={{ textTransform: 'capitalize' }}>{log.entityType}</strong>
                          {log.entityId && (
                            <span style={{ color: '#6b7280', fontSize: 12, marginLeft: 4 }}>
                              ({log.entityId.length > 12 ? `${log.entityId.substring(0, 12)}...` : log.entityId})
                            </span>
                          )}
                        </span>
                      ) : (
                        <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>System Level</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 16px', color: '#6b7280', fontSize: 12, fontFamily: 'monospace' }}>
                      {log.userId ? log.userId.substring(0, 8) : 'System'}
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                      <button
                        onClick={() => setSelectedEntry(log)}
                        style={{
                          padding: '3px 8px',
                          backgroundColor: '#fff',
                          border: '1px solid #d1d5db',
                          borderRadius: 4,
                          fontSize: 12,
                          color: '#2563eb',
                          cursor: 'pointer'
                        }}
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* JSON Inspector Modal */}
      {selectedEntry && (
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
              maxWidth: 680,
              width: '90%',
              maxHeight: '80vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>
                Audit Record Details
              </h3>
              <button
                onClick={() => setSelectedEntry(null)}
                style={{
                  border: 'none',
                  background: 'none',
                  fontSize: 18,
                  cursor: 'pointer',
                  color: '#6b7280'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16, fontSize: 13 }}>
              <div>
                <span style={{ color: '#6b7280' }}>Action:</span> <strong>{selectedEntry.action}</strong>
              </div>
              <div>
                <span style={{ color: '#6b7280' }}>Timestamp:</span>{' '}
                <strong>{selectedEntry.createdAt ? new Date(selectedEntry.createdAt).toLocaleString() : '—'}</strong>
              </div>
              <div>
                <span style={{ color: '#6b7280' }}>Entity Type:</span>{' '}
                <strong>{selectedEntry.entityType || 'N/A'}</strong>
              </div>
              <div>
                <span style={{ color: '#6b7280' }}>Entity ID:</span>{' '}
                <span style={{ fontFamily: 'monospace' }}>{selectedEntry.entityId || 'N/A'}</span>
              </div>
            </div>

            {selectedEntry.metadata && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#4b5563', marginBottom: 4 }}>
                  Context Metadata:
                </div>
                <pre
                  style={{
                    backgroundColor: '#f3f4f6',
                    padding: 10,
                    borderRadius: 6,
                    fontSize: 12,
                    fontFamily: 'monospace',
                    overflowX: 'auto',
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {typeof selectedEntry.metadata === 'string'
                    ? selectedEntry.metadata
                    : JSON.stringify(selectedEntry.metadata, null, 2)}
                </pre>
              </div>
            )}

            {selectedEntry.oldValue !== null && selectedEntry.oldValue !== undefined && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#991b1b', marginBottom: 4 }}>
                  Old Value (Before):
                </div>
                <pre
                  style={{
                    backgroundColor: '#fef2f2',
                    padding: 10,
                    borderRadius: 6,
                    fontSize: 12,
                    fontFamily: 'monospace',
                    overflowX: 'auto',
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {typeof selectedEntry.oldValue === 'string'
                    ? selectedEntry.oldValue
                    : JSON.stringify(selectedEntry.oldValue, null, 2)}
                </pre>
              </div>
            )}

            {selectedEntry.newValue !== null && selectedEntry.newValue !== undefined && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#065f46', marginBottom: 4 }}>
                  New Value (After):
                </div>
                <pre
                  style={{
                    backgroundColor: '#ecfdf5',
                    padding: 10,
                    borderRadius: 6,
                    fontSize: 12,
                    fontFamily: 'monospace',
                    overflowX: 'auto',
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {typeof selectedEntry.newValue === 'string'
                    ? selectedEntry.newValue
                    : JSON.stringify(selectedEntry.newValue, null, 2)}
                </pre>
              </div>
            )}

            <div style={{ textAlign: 'right', marginTop: 16 }}>
              <button
                onClick={() => setSelectedEntry(null)}
                style={{
                  padding: '6px 16px',
                  backgroundColor: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
