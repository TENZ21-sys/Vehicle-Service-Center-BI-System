import React, { useState, useEffect } from 'react'
import { api } from '../../api'
import { AppointmentWithDetails, AppointmentStatus } from '@shared/types/appointment.types'
import { AppointmentCreateModal } from './AppointmentCreateModal'

interface Props {
  onNavigateToJobCard?: (jobCardId: string) => void
}

export const AppointmentListPage: React.FC<Props> = ({ onNavigateToJobCard }) => {
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')

  // Modals & action states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [convertingId, setConvertingId] = useState<string | null>(null)
  const [selectedAptDetails, setSelectedAptDetails] = useState<AppointmentWithDetails | null>(null)

  const loadAppointments = async (): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.appointments.list({
        date: selectedDate || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: searchQuery.trim() || undefined
      })

      if (res.success && res.data) {
        setAppointments(res.data)
      } else {
        setError(res.error?.message || 'Failed to load appointments')
      }
    } catch (err: any) {
      setError(err?.message || 'Error loading appointments')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAppointments()
  }, [statusFilter, selectedDate])

  const handleSearchSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    loadAppointments()
  }

  const handleStatusUpdate = async (id: string, status: AppointmentStatus): Promise<void> => {
    try {
      const res = await api.appointments.updateStatus(id, { status })
      if (res.success) {
        loadAppointments()
      } else {
        alert(res.error || 'Failed to update status')
      }
    } catch (err: any) {
      alert(err.message || 'Error updating appointment status')
    }
  }

  const handleConvertToJobCard = async (apt: AppointmentWithDetails): Promise<void> => {
    if (!confirm(`Convert Appointment #${apt.appointmentNumber} for ${apt.vehicle.registrationNo} into an active Workshop Job Card?`)) {
      return
    }

    setConvertingId(apt.id)
    try {
      const res = await api.appointments.convertToJobCard({
        appointmentId: apt.id,
        technicianId: apt.technicianId || undefined,
        priority: 'Normal'
      })

      if (res.success && res.data) {
        loadAppointments()
        if (onNavigateToJobCard) {
          onNavigateToJobCard(res.data.jobCardId)
        } else {
          alert(`Successfully created Job Card! You can view it in the Job Cards tab.`)
        }
      } else {
        alert(res.error || 'Failed to convert appointment')
      }
    } catch (err: any) {
      alert(err?.message || 'Error converting appointment')
    } finally {
      setConvertingId(null)
    }
  }

  // Summary counts
  const todayIso = new Date().toISOString().split('T')[0]
  const todayCount = appointments.filter((a) => a.scheduledDate === todayIso).length
  const pendingCount = appointments.filter((a) => a.status === 'Scheduled' || a.status === 'Confirmed').length
  const inServiceCount = appointments.filter((a) => a.status === 'In Service').length

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>
            Appointments & Service Schedule
          </h1>
          <p style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>
            Customer bookings, slot reservations, and automated conversion to workshop job cards
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => loadAppointments()} style={refreshBtnStyle}>
            🔄 Refresh
          </button>
          <button onClick={() => setShowCreateModal(true)} style={newBtnStyle}>
            📅 + Book Appointment
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <SummaryCard
          title="TODAY'S BOOKINGS"
          value={todayCount.toString()}
          subtitle={`For date ${todayIso}`}
          color="#2563eb"
        />
        <SummaryCard
          title="PENDING ARRIVAL"
          value={pendingCount.toString()}
          subtitle="Scheduled or Confirmed"
          color="#d97706"
        />
        <SummaryCard
          title="IN SERVICE"
          value={inServiceCount.toString()}
          subtitle="Converted to Job Cards"
          color="#059669"
        />
        <SummaryCard
          title="TOTAL APPOINTMENTS"
          value={appointments.length.toString()}
          subtitle="Matching current filters"
          color="#7c3aed"
        />
      </div>

      {/* Filter and Date Bar */}
      <div style={filterBarStyle}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['all', 'Scheduled', 'Confirmed', 'In Service', 'Completed', 'Cancelled'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              style={statusFilter === st ? activeTabStyle : tabStyle}
            >
              {st === 'all' ? 'All Statuses' : st}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={dateInputStyle}
            title="Filter by specific date"
          />
          {selectedDate && (
            <button
              type="button"
              onClick={() => setSelectedDate('')}
              style={clearDateBtnStyle}
              title="Clear date filter"
            >
              ✕
            </button>
          )}

          <input
            type="text"
            placeholder="Search APT#, Customer, Plate..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={searchInputStyle}
          />
          <button type="submit" style={searchBtnStyle}>
            Search
          </button>
        </form>
      </div>

      {error && <div style={errorBannerStyle}>{error}</div>}

      {/* Appointments Data Table */}
      <div style={tableContainerStyle}>
        <table style={tableStyle}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              <th style={thStyle}>Date & Time</th>
              <th style={thStyle}>Appointment #</th>
              <th style={thStyle}>Customer</th>
              <th style={thStyle}>Vehicle</th>
              <th style={thStyle}>Requested Services</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Status</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 32, color: '#6b7280' }}>
                  Loading appointments...
                </td>
              </tr>
            ) : appointments.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 32, color: '#9ca3af', fontStyle: 'italic' }}>
                  No appointments found matching the selected filters.
                </td>
              </tr>
            ) : (
              appointments.map((apt) => {
                const canConvert = !apt.jobCardId && apt.status !== 'Cancelled' && apt.status !== 'Completed'
                return (
                  <tr key={apt.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 700, color: '#1e293b' }}>{apt.scheduledTime}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{apt.scheduledDate}</div>
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 600, color: '#2563eb' }}>
                      {apt.appointmentNumber}
                    </td>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>{apt.customer.name}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>📞 {apt.customer.phonePrimary}</div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 700, color: '#1e293b' }}>{apt.vehicle.registrationNo}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>
                        {apt.vehicle.make} {apt.vehicle.model}
                      </div>
                    </td>
                    <td style={tdStyle}>
                      {apt.requestedServices && apt.requestedServices.length > 0 ? (
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {apt.requestedServices.map((svc, i) => (
                            <span key={i} style={serviceBadgeStyle}>
                              {svc}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: 12 }}>General Inspection</span>
                      )}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <span style={getStatusBadge(apt.status)}>{apt.status}</span>
                      {apt.jobCardId && (
                        <div style={{ fontSize: 11, color: '#059669', marginTop: 4, fontWeight: 600 }}>
                          ✓ Job Card Linked
                        </div>
                      )}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        {canConvert && (
                          <button
                            onClick={() => handleConvertToJobCard(apt)}
                            disabled={convertingId === apt.id}
                            style={convertBtnStyle}
                            title="Check-in vehicle and create workshop Job Card"
                          >
                            {convertingId === apt.id ? 'Converting...' : '🔧 Convert to Job Card'}
                          </button>
                        )}

                        {apt.status === 'Scheduled' && (
                          <button
                            onClick={() => handleStatusUpdate(apt.id, 'Confirmed')}
                            style={confirmBtnStyle}
                            title="Confirm appointment"
                          >
                            ✓ Confirm
                          </button>
                        )}

                        {apt.status !== 'Cancelled' && apt.status !== 'Completed' && !apt.jobCardId && (
                          <button
                            onClick={() => handleStatusUpdate(apt.id, 'Cancelled')}
                            style={cancelActionBtnStyle}
                            title="Cancel appointment"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Booking Modal */}
      {showCreateModal && (
        <AppointmentCreateModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            loadAppointments()
          }}
        />
      )}
    </div>
  )
}

const SummaryCard: React.FC<{
  title: string
  value: string
  subtitle: string
  color: string
}> = ({ title, value, subtitle, color }) => (
  <div
    style={{
      backgroundColor: '#ffffff',
      borderRadius: 10,
      padding: '16px 20px',
      border: '1px solid #e2e8f0',
      borderLeft: `4px solid ${color}`,
      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
    }}
  >
    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: 0.5 }}>{title}</div>
    <div style={{ fontSize: 20, fontWeight: 800, color: '#111827', marginTop: 4 }}>{value}</div>
    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{subtitle}</div>
  </div>
)

const filterBarStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 16,
  flexWrap: 'wrap',
  gap: 12
}

const tabStyle: React.CSSProperties = {
  padding: '6px 12px',
  fontSize: 12,
  fontWeight: 500,
  backgroundColor: '#ffffff',
  color: '#64748b',
  border: '1px solid #cbd5e1',
  borderRadius: 6,
  cursor: 'pointer'
}

const activeTabStyle: React.CSSProperties = {
  padding: '6px 12px',
  fontSize: 12,
  fontWeight: 600,
  backgroundColor: '#2563eb',
  color: '#ffffff',
  border: '1px solid #2563eb',
  borderRadius: 6,
  cursor: 'pointer'
}

const dateInputStyle: React.CSSProperties = {
  padding: '6px 10px',
  fontSize: 13,
  border: '1px solid #cbd5e1',
  borderRadius: 6,
  backgroundColor: '#ffffff'
}

const clearDateBtnStyle: React.CSSProperties = {
  background: '#f1f5f9',
  border: '1px solid #cbd5e1',
  borderRadius: 4,
  color: '#64748b',
  cursor: 'pointer',
  padding: '4px 8px',
  fontSize: 11
}

const searchInputStyle: React.CSSProperties = {
  padding: '6px 12px',
  fontSize: 13,
  border: '1px solid #cbd5e1',
  borderRadius: 6,
  width: 220
}

const searchBtnStyle: React.CSSProperties = {
  padding: '6px 14px',
  fontSize: 13,
  fontWeight: 600,
  backgroundColor: '#f1f5f9',
  color: '#334155',
  border: '1px solid #cbd5e1',
  borderRadius: 6,
  cursor: 'pointer'
}

const refreshBtnStyle: React.CSSProperties = {
  padding: '8px 14px',
  fontSize: 13,
  fontWeight: 500,
  backgroundColor: '#ffffff',
  color: '#334155',
  border: '1px solid #cbd5e1',
  borderRadius: 6,
  cursor: 'pointer'
}

const newBtnStyle: React.CSSProperties = {
  padding: '8px 16px',
  fontSize: 13,
  fontWeight: 600,
  backgroundColor: '#2563eb',
  color: '#ffffff',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer'
}

const tableContainerStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: 10,
  border: '1px solid #e2e8f0',
  overflow: 'hidden',
  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)'
}

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  textAlign: 'left'
}

const thStyle: React.CSSProperties = {
  padding: '12px 14px',
  fontSize: 12,
  fontWeight: 600,
  color: '#475569'
}

const tdStyle: React.CSSProperties = {
  padding: '12px 14px',
  fontSize: 13,
  color: '#334155'
}

const serviceBadgeStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  padding: '2px 6px',
  borderRadius: 4,
  backgroundColor: '#eff6ff',
  color: '#2563eb'
}

const convertBtnStyle: React.CSSProperties = {
  padding: '4px 10px',
  fontSize: 12,
  fontWeight: 600,
  backgroundColor: '#16a34a',
  color: '#ffffff',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer'
}

const confirmBtnStyle: React.CSSProperties = {
  padding: '4px 8px',
  fontSize: 12,
  fontWeight: 500,
  backgroundColor: '#eff6ff',
  color: '#2563eb',
  border: '1px solid #bfdbfe',
  borderRadius: 4,
  cursor: 'pointer'
}

const cancelActionBtnStyle: React.CSSProperties = {
  padding: '4px 8px',
  fontSize: 12,
  backgroundColor: '#fee2e2',
  color: '#dc2626',
  border: '1px solid #fecaca',
  borderRadius: 4,
  cursor: 'pointer'
}

const errorBannerStyle: React.CSSProperties = {
  padding: '10px 14px',
  backgroundColor: '#fee2e2',
  color: '#991b1b',
  borderRadius: 6,
  fontSize: 13,
  marginBottom: 16
}

const getStatusBadge = (status: string): React.CSSProperties => {
  const base: React.CSSProperties = {
    padding: '3px 8px',
    borderRadius: 9999,
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase'
  }
  switch (status) {
    case 'Confirmed':
      return { ...base, backgroundColor: '#dbeafe', color: '#1e40af' }
    case 'In Service':
      return { ...base, backgroundColor: '#dcfce7', color: '#166534' }
    case 'Completed':
      return { ...base, backgroundColor: '#f1f5f9', color: '#475569' }
    case 'Cancelled':
      return { ...base, backgroundColor: '#fee2e2', color: '#991b1b' }
    case 'No Show':
      return { ...base, backgroundColor: '#fef3c7', color: '#92400e' }
    default:
      return { ...base, backgroundColor: '#fef9c3', color: '#854d0e' }
  }
}
