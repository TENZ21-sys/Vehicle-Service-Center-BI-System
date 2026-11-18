import React, { useState, useEffect } from 'react'
import { api } from '../../api'
import { ServiceItem, ServiceCategory } from '@shared/types/catalogue.types'
import { ServiceFormModal } from './ServiceFormModal'
import { ServiceCategoryModal } from './ServiceCategoryModal'
import { formatMoney } from '@shared/types/money.types'
import { DataImportModal } from '../../components/Common/DataImportModal'

export const ServiceListPage: React.FC = () => {
  const [services, setServices] = useState<ServiceItem[]>([])
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  const [showFormModal, setShowFormModal] = useState(false)
  const [editingService, setEditingService] = useState<ServiceItem | null>(null)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)

  useEffect(() => {
    loadCategories()
    loadServices()
  }, [])

  const loadCategories = async (): Promise<void> => {
    try {
      const res = await api.catalogue.listCategories(false)
      if (res.success && res.data) setCategories(res.data)
    } catch {
      // ignore
    }
  }

  const loadServices = async (): Promise<void> => {
    setLoading(true)
    try {
      const res = await api.catalogue.listServices({
        categoryId: selectedCategory || undefined,
        search: searchQuery || undefined
      })
      if (res.success && res.data) {
        setServices(res.data)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadServices()
  }, [selectedCategory, searchQuery])

  const handleDeactivate = async (service: ServiceItem): Promise<void> => {
    if (!window.confirm(`Are you sure you want to remove service "${service.name}"? It will be deactivated from active service lists.`)) return
    try {
      const res = await api.catalogue.deactivateService(service.id)
      if (res.success) {
        loadServices()
      } else {
        alert(res.error?.message || 'Failed to remove service')
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px 0', color: '#111827' }}>
            Service Catalogue
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: '#6b7280' }}>
            Configure services, standard pricing, labor rates, and vehicle applicability
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => setShowImportModal(true)}
            style={secondaryBtnStyle}
          >
            📥 Import CSV
          </button>
          <button onClick={() => setShowCategoryModal(true)} style={secondaryBtnStyle}>
            ⚙️ Categories
          </button>
          <button
            onClick={() => {
              setEditingService(null)
              setShowFormModal(true)
            }}
            style={primaryBtnStyle}
          >
            + Add Service
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Search services by name or description..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ ...inputStyle, width: 340 }}
        />
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          style={{ ...inputStyle, width: 220 }}
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
          <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
              <th style={thStyle}>Service Name</th>
              <th style={thStyle}>Category</th>
              <th style={thStyle}>Base Price</th>
              <th style={thStyle}>Labor Charge</th>
              <th style={thStyle}>Standard Total</th>
              <th style={thStyle}>Est. Time</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>
                  Loading services...
                </td>
              </tr>
            ) : services.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>
                  No services found. Click "+ Add Service" to create one.
                </td>
              </tr>
            ) : (
              services.map((s) => {
                const totalAmount = s.basePriceAmount + s.laborChargeAmount
                return (
                  <tr key={s.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 600, color: '#111827' }}>{s.name}</div>
                      {s.description && (
                        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{s.description}</div>
                      )}
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: 12, background: '#f3f4f6', padding: '3px 8px', borderRadius: 4 }}>
                        {s.categoryName || 'General'}
                      </span>
                    </td>
                    <td style={tdStyle}>{formatMoney(s.basePriceAmount)}</td>
                    <td style={tdStyle}>{formatMoney(s.laborChargeAmount)}</td>
                    <td style={{ ...tdStyle, fontWeight: 600, color: '#047857' }}>
                      {formatMoney(totalAmount)}
                    </td>
                    <td style={tdStyle}>
                      {s.estimatedMinutes ? `${s.estimatedMinutes} mins` : '—'}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <button
                        onClick={() => {
                          setEditingService(s)
                          setShowFormModal(true)
                        }}
                        style={actionBtnStyle}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeactivate(s)}
                        style={{ ...actionBtnStyle, color: '#dc2626' }}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {showFormModal && (
        <ServiceFormModal
          service={editingService}
          onClose={() => {
            setShowFormModal(false)
            setEditingService(null)
          }}
          onSaved={() => {
            setShowFormModal(false)
            setEditingService(null)
            loadServices()
          }}
        />
      )}

      {showCategoryModal && (
        <ServiceCategoryModal
          onClose={() => setShowCategoryModal(false)}
          onSaved={() => {
            loadCategories()
            loadServices()
          }}
        />
      )}

      {/* CSV Import Modal */}
      <DataImportModal
        sector="services"
        title="Services & Labour Operations"
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={() => {
          setShowImportModal(false)
          loadServices()
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
const inputStyle: React.CSSProperties = {
  padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14
}
const primaryBtnStyle: React.CSSProperties = {
  padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 500, fontSize: 14
}
const secondaryBtnStyle: React.CSSProperties = {
  padding: '8px 16px', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', fontWeight: 500, fontSize: 14
}
const actionBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: 13, fontWeight: 500, marginLeft: 8
}
