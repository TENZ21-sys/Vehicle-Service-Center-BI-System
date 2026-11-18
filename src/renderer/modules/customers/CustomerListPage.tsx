import React, { useState, useEffect } from 'react'
import { api } from '../../api'
import { CustomerWithVehicles } from '@shared/types/customer.types'
import { CustomerFormModal } from './CustomerFormModal'
import { downloadCsv } from '../../utils/csvDownload'
import { DataImportModal } from '../../components/Common/DataImportModal'

interface Props {
  onSelectCustomer: (customerId: string) => void
}

export const CustomerListPage: React.FC<Props> = ({ onSelectCustomer }) => {
  const [customers, setCustomers] = useState<CustomerWithVehicles[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)

  useEffect(() => {
    loadCustomers()
  }, [])

  const loadCustomers = async (): Promise<void> => {
    setLoading(true)
    try {
      const res = await api.customers.list(false, 100, 0)
      if (res.success && res.data) {
        setCustomers(res.data)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async (query: string): Promise<void> => {
    setSearchQuery(query)
    if (!query.trim()) {
      loadCustomers()
      return
    }

    try {
      const res = await api.customers.search(query, 50)
      if (res.success && res.data) {
        // Fetch full records for search results or map them
        setCustomers(
          res.data.map((r) => ({
            id: r.id,
            name: r.name,
            phonePrimary: r.phonePrimary,
            nic: r.nic,
            totalVehicles: r.vehicleCount,
            vehicles: [],
            isActive: true,
            createdAt: '',
            updatedAt: ''
          }))
        )
      }
    } catch {
      // ignore
    }
  }

  const handleExportCsv = async (): Promise<void> => {
    setExporting(true)
    try {
      const res = await api.export.data('customers')
      if (res.success && res.data) {
        downloadCsv(res.data.filename, res.data.csvContent)
      }
    } catch (err) {
      console.error('Export failed:', err)
    } finally {
      setExporting(false)
    }
  }

  const handleDeleteCustomer = async (e: React.MouseEvent, c: CustomerWithVehicles): Promise<void> => {
    e.stopPropagation()
    if (!window.confirm(`Are you sure you want to delete customer "${c.name}"?`)) return
    try {
      const res = await api.customers.deactivate(c.id)
      if (res.success) {
        loadCustomers()
      } else {
        alert(res.error?.message || 'Failed to remove customer')
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div style={{ padding: 28, height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827' }}>Customer Registry</h1>
          <p style={{ color: '#6b7280', fontSize: 13, marginTop: 2 }}>
            Manage customer accounts, contact details, and their registered vehicles.
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
            onClick={handleExportCsv}
            disabled={exporting}
            style={{
              padding: '8px 14px',
              backgroundColor: '#fff',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              fontSize: 13,
              color: '#374151',
              fontWeight: 500,
              cursor: exporting ? 'not-allowed' : 'pointer'
            }}
          >
            {exporting ? 'Exporting...' : '📥 Export CSV'}
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            style={createBtnStyle}
          >
            + Add New Customer
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ marginBottom: 16 }}>
        <input
          style={searchInputStyle}
          placeholder="🔍 Search by customer name, phone number, or NIC..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div style={tableContainerStyle}>
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#6b7280' }}>
            Loading customers...
          </div>
        ) : customers.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>
            {searchQuery
              ? `No customer profiles matching "${searchQuery}".`
              : 'No customers registered yet. Click "+ Add New Customer" to register your first profile.'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#4b5563', textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.05em' }}>
                <th style={{ padding: '12px 16px' }}>Customer Name</th>
                <th style={{ padding: '12px 16px' }}>Primary Phone</th>
                <th style={{ padding: '12px 16px' }}>National ID / NIC</th>
                <th style={{ padding: '12px 16px' }}>Vehicles</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => onSelectCustomer(c.id)}
                  style={rowStyle}
                >
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#111827' }}>
                    {c.name}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#4b5563' }}>
                    {c.phonePrimary}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#6b7280' }}>
                    {c.nic || '—'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={badgeStyle}>
                      {c.totalVehicles || 0} vehicle{c.totalVehicles === 1 ? '' : 's'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelectCustomer(c.id)
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#2563eb',
                        fontWeight: 600,
                        cursor: 'pointer',
                        marginRight: 12
                      }}
                    >
                      View Profile →
                    </button>
                    <button
                      onClick={(e) => handleDeleteCustomer(e, c)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#dc2626',
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

      <CustomerFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSaved={(newCustomer) => {
          setShowCreateModal(false)
          loadCustomers()
          onSelectCustomer(newCustomer.id)
        }}
      />

      <DataImportModal
        sector="customers"
        title="Customers"
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={() => {
          setShowImportModal(false)
          loadCustomers()
        }}
      />
    </div>
  )
}

const createBtnStyle: React.CSSProperties = {
  padding: '9px 18px',
  backgroundColor: '#2563eb',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer'
}

const searchInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 8,
  border: '1px solid #d1d5db',
  fontSize: 14,
  outline: 'none',
  backgroundColor: '#fff'
}

const tableContainerStyle: React.CSSProperties = {
  backgroundColor: '#fff',
  borderRadius: 8,
  border: '1px solid #e5e7eb',
  overflow: 'hidden',
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
}

const rowStyle: React.CSSProperties = {
  borderBottom: '1px solid #f3f4f6',
  cursor: 'pointer',
  transition: 'background-color 0.1s'
}

const badgeStyle: React.CSSProperties = {
  padding: '3px 8px',
  borderRadius: 4,
  backgroundColor: '#f3f4f6',
  color: '#374151',
  fontSize: 12,
  fontWeight: 500
}
