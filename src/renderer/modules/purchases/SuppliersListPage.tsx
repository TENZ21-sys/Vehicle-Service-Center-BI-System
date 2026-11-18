import React, { useState, useEffect } from 'react'
import { api } from '../../api'
import { Supplier } from '@shared/types/inventory.types'
import { SupplierFormModal } from './SupplierFormModal'
import { DataImportModal } from '../../components/Common/DataImportModal'

export const SuppliersListPage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [showImportModal, setShowImportModal] = useState(false)

  useEffect(() => {
    loadSuppliers()
  }, [])

  const loadSuppliers = async (): Promise<void> => {
    setLoading(true)
    try {
      const res = await api.suppliers.list(false)
      if (res.success && res.data) {
        setSuppliers(res.data)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  const handleDeactivate = async (s: Supplier): Promise<void> => {
    if (!window.confirm(`Deactivate supplier "${s.name}"?`)) return
    try {
      const res = await api.suppliers.deactivate(s.id)
      if (res.success) loadSuppliers()
    } catch {
      // ignore
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#111827' }}>Suppliers Directory</h2>
          <p style={{ margin: '2px 0 0 0', fontSize: 13, color: '#6b7280' }}>
            Manage parts vendors, distributors, and contact details
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => setShowImportModal(true)}
            style={{
              padding: '8px 14px',
              backgroundColor: '#fff',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              fontSize: 13,
              color: '#374151',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            📥 Import CSV
          </button>
          <button
            onClick={() => {
              setEditingSupplier(null)
              setShowModal(true)
            }}
            style={primaryBtnStyle}
          >
            + Add Supplier
          </button>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
          <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
              <th style={thStyle}>Company / Supplier</th>
              <th style={thStyle}>Contact Person</th>
              <th style={thStyle}>Phone</th>
              <th style={thStyle}>Email</th>
              <th style={thStyle}>Address</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ padding: 20, textAlign: 'center', color: '#6b7280' }}>
                  Loading suppliers...
                </td>
              </tr>
            ) : suppliers.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 20, textAlign: 'center', color: '#6b7280' }}>
                  No suppliers found. Click "+ Add Supplier" to register one.
                </td>
              </tr>
            ) : (
              suppliers.map((s) => (
                <tr key={s.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 600, color: '#111827' }}>{s.name}</div>
                    {s.notes && <div style={{ fontSize: 12, color: '#6b7280' }}>{s.notes}</div>}
                  </td>
                  <td style={tdStyle}>{s.contactPerson || '—'}</td>
                  <td style={tdStyle}>{s.phone || '—'}</td>
                  <td style={tdStyle}>{s.email || '—'}</td>
                  <td style={tdStyle}>{s.address || '—'}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    <button
                      onClick={() => {
                        setEditingSupplier(s)
                        setShowModal(true)
                      }}
                      style={actionBtnStyle}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeactivate(s)}
                      style={{ ...actionBtnStyle, color: '#dc2626' }}
                    >
                      Archive
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <SupplierFormModal
          supplier={editingSupplier}
          onClose={() => {
            setShowModal(false)
            setEditingSupplier(null)
          }}
          onSaved={() => {
            setShowModal(false)
            setEditingSupplier(null)
            loadSuppliers()
          }}
        />
      )}

      {/* CSV Import Modal */}
      <DataImportModal
        sector="suppliers"
        title="Suppliers & Vendors"
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={() => {
          setShowImportModal(false)
          loadSuppliers()
        }}
      />
    </div>
  )
}

const thStyle: React.CSSProperties = {
  padding: '12px 16px', fontWeight: 600, color: '#374151', fontSize: 13
}
const tdStyle: React.CSSProperties = {
  padding: '12px 16px', verticalAlign: 'middle'
}
const primaryBtnStyle: React.CSSProperties = {
  padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 500, fontSize: 13
}
const actionBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: 13, fontWeight: 500, marginLeft: 8
}
