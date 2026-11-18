import React, { useState, useEffect } from 'react'
import { api } from '../../api'
import { SystemHealthInfo } from '@shared/types/backup.types'

export const SystemHealthTab: React.FC = () => {
  const [health, setHealth] = useState<SystemHealthInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [vacuuming, setVacuuming] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Configurable System Settings
  const [enableCsvExport, setEnableCsvExport] = useState(true)
  const [enableDiagnostics, setEnableDiagnostics] = useState(true)
  const [auditRetentionDays, setAuditRetentionDays] = useState(90)
  const [savingSettings, setSavingSettings] = useState(false)

  useEffect(() => {
    loadHealth()
    loadSystemSettings()
  }, [])

  const loadSystemSettings = async (): Promise<void> => {
    try {
      const res = await api.settings.getByCategory('system')
      if (res.success && res.data) {
        if (typeof res.data.export_enable_csv === 'boolean') {
          setEnableCsvExport(res.data.export_enable_csv)
        }
        if (typeof res.data.enable_system_diagnostics === 'boolean') {
          setEnableDiagnostics(res.data.enable_system_diagnostics)
        }
        if (typeof res.data.audit_retention_days === 'number') {
          setAuditRetentionDays(res.data.audit_retention_days)
        }
      }
    } catch {
      // ignore
    }
  }

  const handleSaveSystemSettings = async (): Promise<void> => {
    setSavingSettings(true)
    setMsg(null)
    try {
      await Promise.all([
        api.settings.set('system', 'export_enable_csv', enableCsvExport, 'boolean'),
        api.settings.set('system', 'enable_system_diagnostics', enableDiagnostics, 'boolean'),
        api.settings.set('system', 'audit_retention_days', auditRetentionDays, 'number')
      ])
      setMsg({ type: 'success', text: 'System configuration settings saved successfully.' })
    } catch (err: unknown) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : String(err) })
    } finally {
      setSavingSettings(false)
    }
  }

  const loadHealth = async (): Promise<void> => {
    setLoading(true)
    setMsg(null)
    try {
      const res = await api.system.getHealthInfo()
      if (res.success && res.data) {
        setHealth(res.data)
      } else {
        setMsg({ type: 'error', text: res.error?.message || 'Failed to check system health' })
      }
    } catch (err: unknown) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : String(err) })
    } finally {
      setLoading(false)
    }
  }

  const handleVacuum = async (): Promise<void> => {
    if (!confirm('Run database VACUUM optimization? This defragments database pages and reclaims unallocated disk space.')) {
      return
    }
    setVacuuming(true)
    setMsg(null)
    try {
      const res = await api.system.vacuum()
      if (res.success && res.data) {
        const freedKb = (res.data.freedBytes / 1024).toFixed(1)
        setMsg({
          type: 'success',
          text: `Database VACUUM optimization completed. Reclaimed ${freedKb} KB of disk storage.`
        })
        await loadHealth()
      } else {
        setMsg({ type: 'error', text: res.error?.message || 'VACUUM optimization failed' })
      }
    } catch (err: unknown) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : String(err) })
    } finally {
      setVacuuming(false)
    }
  }

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  return (
    <div style={{ maxWidth: 960 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 4 }}>
            System Health & Storage Diagnostics
          </h3>
          <p style={{ fontSize: 13, color: '#6b7280' }}>
            Real-time diagnostics, SQLite database integrity, write-ahead log (WAL) telemetry, and storage maintenance.
          </p>
        </div>
        <button
          onClick={loadHealth}
          disabled={loading}
          style={{
            padding: '6px 12px',
            backgroundColor: '#fff',
            border: '1px solid #d1d5db',
            borderRadius: 6,
            fontSize: 13,
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          🔄 Refresh Status
        </button>
      </div>

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

      {loading && !health ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>
          Running database diagnostics and checking integrity...
        </div>
      ) : health ? (
        <div>
          {/* Key Metric Diagnostic Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 16,
              marginBottom: 24
            }}
          >
            {/* Integrity Status */}
            <div
              style={{
                backgroundColor: health.integrityCheckResult === 'ok' ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${health.integrityCheckResult === 'ok' ? '#bbf7d0' : '#fecaca'}`,
                borderRadius: 8,
                padding: 16
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, color: health.integrityCheckResult === 'ok' ? '#166534' : '#991b1b' }}>
                DATABASE INTEGRITY
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: health.integrityCheckResult === 'ok' ? '#15803d' : '#b91c1c', marginTop: 4 }}>
                {health.integrityCheckResult === 'ok' ? 'Healthy (OK)' : 'Issues Detected'}
              </div>
              <div style={{ fontSize: 12, color: health.integrityCheckResult === 'ok' ? '#166534' : '#991b1b', marginTop: 4 }}>
                PRAGMA integrity_check verified
              </div>
            </div>

            {/* DB Size */}
            <div
              style={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                padding: 16
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>DATABASE SIZE</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginTop: 4 }}>
                {formatSize(health.databaseSizeBytes)}
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                Active SQLite database file
              </div>
            </div>

            {/* WAL Size */}
            <div
              style={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                padding: 16
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>WRITE-AHEAD LOG (WAL)</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginTop: 4 }}>
                {formatSize(health.walSizeBytes)}
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                WAL journal sidecar
              </div>
            </div>

            {/* Applied Migrations */}
            <div
              style={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                padding: 16
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>SCHEMA VERSION</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginTop: 4 }}>
                {health.totalMigrationsApplied} Migrations
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                SQLite v{health.sqliteVersion}
              </div>
            </div>
          </div>

          {/* Details & Maintenance Card */}
          <div
            style={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              padding: 20,
              marginBottom: 24
            }}
          >
            <h4 style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 12 }}>
              Active Database Details
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13, color: '#374151' }}>
              <div>
                <span style={{ color: '#6b7280' }}>Business ID:</span>{' '}
                <span style={{ fontFamily: 'monospace' }}>{health.activeBusinessId}</span>
              </div>
              <div>
                <span style={{ color: '#6b7280' }}>Business Name:</span>{' '}
                <strong>{health.businessName}</strong>
              </div>
              <div>
                <span style={{ color: '#6b7280' }}>SQLite Version:</span>{' '}
                <strong>v{health.sqliteVersion}</strong>
              </div>
              <div>
                <span style={{ color: '#6b7280' }}>Integrity Details:</span>{' '}
                <span style={{ color: health.integrityCheckResult === 'ok' ? '#166534' : '#991b1b' }}>
                  {health.integrityCheckResult}
                </span>
              </div>
            </div>
          </div>

          {/* System Feature Toggles & Preferences Card */}
          <div
            style={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              padding: 20,
              marginBottom: 24
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h4 style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: 0 }}>
                  System & Administration Preferences
                </h4>
                <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0 0' }}>
                  Enable or disable system-level capabilities and export functions.
                </p>
              </div>
              <button
                onClick={handleSaveSystemSettings}
                disabled={savingSettings}
                style={{
                  padding: '6px 14px',
                  backgroundColor: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: savingSettings ? 'not-allowed' : 'pointer'
                }}
              >
                {savingSettings ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={enableCsvExport}
                  onChange={(e) => setEnableCsvExport(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: '#2563eb' }}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Enable CSV Data Exports</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>Allow staff to export records to CSV files.</div>
                </div>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={enableDiagnostics}
                  onChange={(e) => setEnableDiagnostics(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: '#2563eb' }}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Enable Diagnostic Telemetry</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>Run live integrity checks and storage metrics.</div>
                </div>
              </label>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Audit Log Retention:</div>
                <input
                  type="number"
                  min={30}
                  max={3650}
                  value={auditRetentionDays}
                  onChange={(e) => setAuditRetentionDays(parseInt(e.target.value, 10) || 90)}
                  style={{
                    width: 70,
                    padding: '4px 8px',
                    border: '1px solid #d1d5db',
                    borderRadius: 4,
                    fontSize: 13
                  }}
                />
                <span style={{ fontSize: 12, color: '#6b7280' }}>days before automated log rotation</span>
              </div>
            </div>
          </div>

          {/* Database Optimization Action */}
          <div
            style={{
              backgroundColor: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              padding: 20,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 16
            }}
          >
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>
                Storage Defragmentation & Optimization (VACUUM)
              </h4>
              <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0 0' }}>
                Rebuilds the database file, repacks fragmented B-trees, and returns unused disk space back to the operating system.
              </p>
            </div>
            <button
              onClick={handleVacuum}
              disabled={vacuuming}
              style={{
                padding: '8px 18px',
                backgroundColor: '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                cursor: vacuuming ? 'not-allowed' : 'pointer'
              }}
            >
              {vacuuming ? 'Running VACUUM...' : '⚡ Optimize Database Now'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
