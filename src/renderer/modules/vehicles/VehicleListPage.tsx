import React, { useState, useEffect } from 'react'
import { api } from '../../api'
import { VehicleWithCustomer, VehicleCategory } from '@shared/types/vehicle.types'
import { VehicleFormModal } from './VehicleFormModal'
import { ReminderModal } from './ReminderModal'
import { EmptyVehiclesIllustration } from '../../components/Common/Illustrations'
import { downloadCsv } from '../../utils/csvDownload'
import { DataImportModal } from '../../components/Common/DataImportModal'

interface Props {
  onSelectCustomer: (customerId: string) => void
  onSelectJobCard?: (vehicleId: string) => void
}

export const VehicleListPage: React.FC<Props> = ({ onSelectCustomer }) => {
  const [vehicles, setVehicles] = useState<VehicleWithCustomer[]>([])
  const [categories, setCategories] = useState<VehicleCategory[]>([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid')
  const [exporting, setExporting] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)

  // Modals
  const [editingVehicle, setEditingVehicle] = useState<VehicleWithCustomer | null>(null)
  const [showVehicleModal, setShowVehicleModal] = useState(false)
  const [activeVehicleForReminder, setActiveVehicleForReminder] = useState<{ id: string; regNo: string } | null>(null)

  useEffect(() => {
    loadCategories()
    loadVehicles()
  }, [])

  const loadCategories = async (): Promise<void> => {
    try {
      const res = await api.vehicles.categories.list(false)
      if (res.success && res.data) {
        setCategories(res.data)
      }
    } catch {
      // ignore
    }
  }

  const loadVehicles = async (): Promise<void> => {
    setLoading(true)
    try {
      const res = await api.vehicles.list(false, 200, 0)
      if (res.success && res.data) {
        setVehicles(res.data)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteVehicle = async (v: VehicleWithCustomer): Promise<void> => {
    if (!window.confirm(`Are you sure you want to remove vehicle "${v.registrationNo}"?`)) return
    try {
      const res = await api.vehicles.deactivate(v.id)
      if (res.success) {
        loadVehicles()
      } else {
        alert(res.error?.message || 'Failed to remove vehicle')
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err))
    }
  }

  const handleExportCsv = async (): Promise<void> => {
    setExporting(true)
    try {
      const res = await api.export.data('vehicles')
      if (res.success && res.data) {
        downloadCsv(res.data.filename, res.data.csvContent)
      }
    } catch (err) {
      console.error('Export failed:', err)
    } finally {
      setExporting(false)
    }
  }

  const filteredVehicles = vehicles.filter((v) => {
    const q = searchQuery.toLowerCase().trim()
    const matchesSearch =
      !q ||
      v.registrationNo.toLowerCase().includes(q) ||
      (v.make && v.make.toLowerCase().includes(q)) ||
      (v.model && v.model.toLowerCase().includes(q)) ||
      (v.customerName && v.customerName.toLowerCase().includes(q)) ||
      (v.customerPhone && v.customerPhone.includes(q)) ||
      (v.vin && v.vin.toLowerCase().includes(q))

    const matchesCategory = !selectedCategory || v.categoryId === selectedCategory

    return matchesSearch && matchesCategory
  })

  return (
    <div style={{ padding: 28, height: '100%', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>
            Vehicle Registry & Management
          </h1>
          <p style={{ color: '#6b7280', fontSize: 13, marginTop: 4, margin: 0 }}>
            View, edit, and manage all registered vehicles, photos, category attributes, and service reminders.
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
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          style={{
            flex: 1,
            minWidth: 260,
            padding: '10px 14px',
            borderRadius: 8,
            border: '1px solid #d1d5db',
            fontSize: 14,
            outline: 'none',
            backgroundColor: '#fff'
          }}
          placeholder="🔍 Search by license plate, make, model, owner name, or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            border: '1px solid #d1d5db',
            fontSize: 14,
            backgroundColor: '#fff',
            minWidth: 180
          }}
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* View Mode Toggle */}
        <div
          style={{
            display: 'flex',
            border: '1px solid var(--border-default)',
            borderRadius: 8,
            backgroundColor: '#ffffff',
            overflow: 'hidden'
          }}
        >
          <button
            onClick={() => setViewMode('grid')}
            title="Grid Gallery View"
            style={{
              padding: '8px 14px',
              border: 'none',
              backgroundColor: viewMode === 'grid' ? 'var(--primary-50)' : 'transparent',
              color: viewMode === 'grid' ? 'var(--primary-600)' : 'var(--text-muted)',
              fontWeight: viewMode === 'grid' ? 600 : 500,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <span>⊞</span> Gallery
          </button>
          <button
            onClick={() => setViewMode('table')}
            title="Table List View"
            style={{
              padding: '8px 14px',
              border: 'none',
              borderLeft: '1px solid var(--border-default)',
              backgroundColor: viewMode === 'table' ? 'var(--primary-50)' : 'transparent',
              color: viewMode === 'table' ? 'var(--primary-600)' : 'var(--text-muted)',
              fontWeight: viewMode === 'table' ? 600 : 500,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <span>☰</span> Table
          </button>
        </div>
      </div>

      {/* Vehicles Display (Grid vs Table) */}
      {loading ? (
        <div
          style={{
            backgroundColor: '#fff',
            borderRadius: 8,
            border: '1px solid #e5e7eb',
            padding: 32,
            textAlign: 'center',
            color: '#6b7280'
          }}
        >
          Loading vehicles...
        </div>
      ) : filteredVehicles.length === 0 ? (
        <div
          style={{
            backgroundColor: '#fff',
            borderRadius: 12,
            border: '1px solid #e5e7eb',
            padding: 48,
            textAlign: 'center',
            color: '#6b7280'
          }}
        >
          <EmptyVehiclesIllustration width={200} height={130} />
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1f2937', marginTop: 16 }}>
            {searchQuery ? 'No Matching Vehicles Found' : 'No Vehicles in the Fleet Yet'}
          </div>
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 6, maxWidth: 440, margin: '6px auto 0' }}>
            {searchQuery
              ? `We couldn't find any vehicle matching "${searchQuery}". Try searching by registration number, make, or model.`
              : 'Register customer vehicles or create job cards to start tracking service histories and scheduled maintenance.'}
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16
          }}
        >
          {filteredVehicles.map((v) => (
            <div
              key={v.id}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: 12,
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.09)'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              {/* Card Photo / Placeholder */}
              <div
                style={{
                  width: '100%',
                  height: 160,
                  backgroundColor: '#f1f5f9',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {v.imageUrl ? (
                  <img
                    src={v.imageUrl}
                    alt={v.registrationNo}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                    <div style={{ fontSize: 44, lineHeight: 1 }}>🚗</div>
                    <div style={{ fontSize: 11, marginTop: 4, fontWeight: 500 }}>No vehicle photo</div>
                  </div>
                )}
                <span
                  style={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    padding: '3px 8px',
                    borderRadius: 6,
                    backgroundColor: 'rgba(255, 255, 255, 0.92)',
                    backdropFilter: 'blur(4px)',
                    color: '#1e40af',
                    fontSize: 11,
                    fontWeight: 700,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }}
                >
                  {v.categoryName || 'Vehicle'}
                </span>
              </div>

              {/* Card Body */}
              <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span
                    style={{
                      fontFamily: 'monospace, ui-monospace',
                      fontWeight: 800,
                      fontSize: 14,
                      letterSpacing: '0.04em',
                      backgroundColor: '#f8fafc',
                      border: '1.5px solid #cbd5e1',
                      padding: '3px 8px',
                      borderRadius: 6,
                      color: '#0f172a'
                    }}
                  >
                    {v.registrationNo}
                  </span>
                  {v.year && (
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>
                      {v.year}
                    </span>
                  )}
                </div>

                <div style={{ fontWeight: 700, fontSize: 15, color: '#1e293b', marginBottom: 4 }}>
                  {v.make || 'Unknown'} {v.model || ''}
                </div>

                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
                  {v.fuelType || 'Petrol'} • {v.transmission || 'Automatic'} {v.color ? `• ${v.color}` : ''}
                </div>

                <div
                  onClick={() => onSelectCustomer(v.customerId)}
                  style={{
                    marginTop: 'auto',
                    padding: '8px 10px',
                    borderRadius: 6,
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 12,
                    color: '#2563eb',
                    fontWeight: 600
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    👤 {v.customerName || 'Customer'}
                  </span>
                  <span style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>
                    {v.customerPhone || '—'}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 6, marginTop: 12, borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>
                  <button
                    onClick={() => setActiveVehicleForReminder({ id: v.id, regNo: v.registrationNo })}
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      border: '1px solid #e2e8f0',
                      borderRadius: 6,
                      backgroundColor: '#ffffff',
                      color: '#334155',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    + Reminder
                  </button>
                  <button
                    onClick={() => {
                      setEditingVehicle(v)
                      setShowVehicleModal(true)
                    }}
                    style={{
                      padding: '6px 12px',
                      border: '1px solid #bfdbfe',
                      borderRadius: 6,
                      backgroundColor: '#eff6ff',
                      color: '#2563eb',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteVehicle(v)}
                    style={{
                      padding: '6px 10px',
                      border: '1px solid #fecaca',
                      borderRadius: 6,
                      backgroundColor: '#fef2f2',
                      color: '#dc2626',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            backgroundColor: '#fff',
            borderRadius: 8,
            border: '1px solid #e5e7eb',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr
                style={{
                  backgroundColor: '#f9fafb',
                  borderBottom: '1px solid #e5e7eb',
                  color: '#4b5563',
                  textTransform: 'uppercase',
                  fontSize: 11,
                  letterSpacing: '0.05em'
                }}
              >
                <th style={{ padding: '12px 16px' }}>Photo</th>
                <th style={{ padding: '12px 16px' }}>License Plate</th>
                <th style={{ padding: '12px 16px' }}>Make / Model / Year</th>
                <th style={{ padding: '12px 16px' }}>Category</th>
                <th style={{ padding: '12px 16px' }}>Owner</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVehicles.map((v) => (
                <tr key={v.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  {/* Photo Thumbnail */}
                  <td style={{ padding: '10px 16px', width: 70 }}>
                    {v.imageUrl ? (
                      <img
                        src={v.imageUrl}
                        alt={v.registrationNo}
                        style={{
                          width: 56,
                          height: 42,
                          objectFit: 'cover',
                          borderRadius: 6,
                          border: '1px solid #e5e7eb'
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 48,
                          height: 38,
                          borderRadius: 6,
                          backgroundColor: '#f3f4f6',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 18
                        }}
                      >
                        🚗
                      </div>
                    )}
                  </td>

                  {/* License Plate */}
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 700, color: '#111827', fontSize: 14 }}>
                      {v.registrationNo}
                    </div>
                    {v.color && (
                      <div style={{ fontSize: 11, color: '#6b7280' }}>
                        Color: {v.color}
                      </div>
                    )}
                  </td>

                  {/* Make / Model / Year */}
                  <td style={{ padding: '12px 16px', color: '#374151' }}>
                    <div style={{ fontWeight: 600 }}>
                      {v.make || '—'} {v.model || ''}
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>
                      {v.year ? `Year: ${v.year} • ` : ''}
                      {v.fuelType || 'Petrol'} • {v.transmission || 'Automatic'}
                    </div>
                  </td>

                  {/* Category */}
                  <td style={{ padding: '12px 16px' }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: 4,
                        backgroundColor: '#eff6ff',
                        color: '#2563eb',
                        fontSize: 12,
                        fontWeight: 600
                      }}
                    >
                      {v.categoryName || 'Vehicle'}
                    </span>
                  </td>

                  {/* Owner */}
                  <td style={{ padding: '12px 16px' }}>
                    <div
                      onClick={() => onSelectCustomer(v.customerId)}
                      style={{ fontWeight: 600, color: '#2563eb', cursor: 'pointer' }}
                    >
                      👤 {v.customerName || 'Unknown Customer'}
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>
                      {v.customerPhone || '—'}
                    </div>
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                      <button
                        onClick={() => setActiveVehicleForReminder({ id: v.id, regNo: v.registrationNo })}
                        style={{
                          padding: '5px 10px',
                          border: '1px solid #d1d5db',
                          borderRadius: 6,
                          backgroundColor: '#fff',
                          color: '#374151',
                          fontSize: 12,
                          fontWeight: 500,
                          cursor: 'pointer'
                        }}
                      >
                        + Reminder
                      </button>
                      <button
                        onClick={() => {
                          setEditingVehicle(v)
                          setShowVehicleModal(true)
                        }}
                        style={{
                          padding: '5px 10px',
                          border: '1px solid #93c5fd',
                          borderRadius: 6,
                          backgroundColor: '#eff6ff',
                          color: '#2563eb',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteVehicle(v)}
                        style={{
                          padding: '5px 10px',
                          border: '1px solid #fecaca',
                          borderRadius: 6,
                          backgroundColor: '#fef2f2',
                          color: '#dc2626',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Vehicle Modal */}
      {showVehicleModal && editingVehicle && (
        <VehicleFormModal
          isOpen={showVehicleModal}
          customerId={editingVehicle.customerId}
          vehicleToEdit={editingVehicle}
          onClose={() => {
            setShowVehicleModal(false)
            setEditingVehicle(null)
          }}
          onSaved={() => {
            setShowVehicleModal(false)
            setEditingVehicle(null)
            loadVehicles()
          }}
        />
      )}

      {/* Service Reminder Modal */}
      {activeVehicleForReminder && (
        <ReminderModal
          isOpen={true}
          vehicleId={activeVehicleForReminder.id}
          vehicleRegNo={activeVehicleForReminder.regNo}
          onClose={() => setActiveVehicleForReminder(null)}
          onSaved={() => {
            setActiveVehicleForReminder(null)
          }}
        />
      )}

      {/* CSV Import Modal */}
      <DataImportModal
        sector="vehicles"
        title="Vehicles"
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={() => {
          setShowImportModal(false)
          loadVehicles()
        }}
      />
    </div>
  )
}
