import React, { useState } from 'react'
import { JobCardWithDetails } from '@shared/types/job-card.types'
import { AppointmentWithDetails } from '@shared/types/appointment.types'

interface WorksStatusBoardProps {
  ongoingJobs: JobCardWithDetails[]
  pendingJobs: JobCardWithDetails[]
  todayAppointments: AppointmentWithDetails[]
  readyJobs: JobCardWithDetails[]
  onNavigate: (tab: string, extra?: any) => void
}

export const WorksStatusBoard: React.FC<WorksStatusBoardProps> = ({
  ongoingJobs,
  pendingJobs,
  todayAppointments,
  readyJobs,
  onNavigate
}) => {
  const [activeBoardTab, setActiveBoardTab] = useState<'ongoing' | 'pending' | 'ready'>('ongoing')

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: 12,
        border: '1px solid #e2e8f0',
        padding: '20px 24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        marginBottom: 24
      }}
    >
      {/* Board Header & Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #f1f5f9',
          paddingBottom: 16,
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 12
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>🛠️</span>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Workshop Floor Operations Board
            </h2>
          </div>
          <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0 0' }}>
            Real-time tracking of active bays, queue intake, and pending customer vehicles
          </p>
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: 'flex',
            backgroundColor: '#f1f5f9',
            padding: 3,
            borderRadius: 8,
            gap: 4
          }}
        >
          <button
            onClick={() => setActiveBoardTab('ongoing')}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: 'none',
              backgroundColor: activeBoardTab === 'ongoing' ? '#ffffff' : 'transparent',
              color: activeBoardTab === 'ongoing' ? '#0284c7' : '#64748b',
              fontWeight: 700,
              fontSize: 12.5,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: activeBoardTab === 'ongoing' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <span>⚡ Ongoing Works</span>
            <span
              style={{
                backgroundColor: activeBoardTab === 'ongoing' ? '#0284c7' : '#cbd5e1',
                color: '#ffffff',
                borderRadius: 10,
                padding: '1px 6px',
                fontSize: 11
              }}
            >
              {ongoingJobs.length}
            </span>
          </button>

          <button
            onClick={() => setActiveBoardTab('pending')}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: 'none',
              backgroundColor: activeBoardTab === 'pending' ? '#ffffff' : 'transparent',
              color: activeBoardTab === 'pending' ? '#d97706' : '#64748b',
              fontWeight: 700,
              fontSize: 12.5,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: activeBoardTab === 'pending' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <span>⏳ Works Yet to Be Done</span>
            <span
              style={{
                backgroundColor: activeBoardTab === 'pending' ? '#d97706' : '#cbd5e1',
                color: '#ffffff',
                borderRadius: 10,
                padding: '1px 6px',
                fontSize: 11
              }}
            >
              {pendingJobs.length + todayAppointments.length}
            </span>
          </button>

          <button
            onClick={() => setActiveBoardTab('ready')}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: 'none',
              backgroundColor: activeBoardTab === 'ready' ? '#ffffff' : 'transparent',
              color: activeBoardTab === 'ready' ? '#16a34a' : '#64748b',
              fontWeight: 700,
              fontSize: 12.5,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: activeBoardTab === 'ready' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <span>✨ Ready for Delivery</span>
            <span
              style={{
                backgroundColor: activeBoardTab === 'ready' ? '#16a34a' : '#cbd5e1',
                color: '#ffffff',
                borderRadius: 10,
                padding: '1px 6px',
                fontSize: 11
              }}
            >
              {readyJobs.length}
            </span>
          </button>
        </div>
      </div>

      {/* Tab 1 Content: Ongoing Works */}
      {activeBoardTab === 'ongoing' && (
        <div>
          {ongoingJobs.length === 0 ? (
            <div
              style={{
                padding: '36px 20px',
                textAlign: 'center',
                backgroundColor: '#f8fafc',
                borderRadius: 8,
                border: '1px dashed #cbd5e1'
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 8 }}>🚙💨</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#334155' }}>
                No active jobs currently in service
              </div>
              <p style={{ fontSize: 12, color: '#64748b', maxWidth: 420, margin: '4px auto 16px auto' }}>
                All service bays are currently available. Check-in incoming vehicles or start work from the pending queue.
              </p>
              <button
                onClick={() => onNavigate('jobcards')}
                style={{
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 6,
                  padding: '8px 16px',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                + Check In New Vehicle
              </button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: 12 }}>
                    <th style={{ padding: '8px 12px' }}>Job Card #</th>
                    <th style={{ padding: '8px 12px' }}>Vehicle Plate</th>
                    <th style={{ padding: '8px 12px' }}>Model & Make</th>
                    <th style={{ padding: '8px 12px' }}>Customer</th>
                    <th style={{ padding: '8px 12px' }}>Status</th>
                    <th style={{ padding: '8px 12px' }}>Assigned Tech</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {ongoingJobs.map((job) => (
                    <tr
                      key={job.id}
                      style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s ease' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f8fafc'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }}
                    >
                      <td style={{ padding: '12px', fontWeight: 700, color: '#0284c7' }}>
                        {job.jobCardNumber}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span
                          style={{
                            fontWeight: 800,
                            fontFamily: 'monospace',
                            backgroundColor: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            padding: '3px 8px',
                            borderRadius: 4,
                            color: '#0f172a'
                          }}
                        >
                          {job.vehicle?.registrationNo || 'N/A'}
                        </span>
                      </td>
                      <td style={{ padding: '12px', color: '#334155', fontWeight: 500 }}>
                        {job.vehicle?.make} {job.vehicle?.model}
                        {job.vehicle?.year ? ` (${job.vehicle.year})` : ''}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>
                          {job.customer?.displayName || 'Customer'}
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>
                          {job.customer?.phonePrimary || ''}
                        </div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '3px 8px',
                            borderRadius: 12,
                            fontSize: 11,
                            fontWeight: 700,
                            backgroundColor: job.status === 'In Progress' ? '#e0f2fe' : '#fef3c7',
                            color: job.status === 'In Progress' ? '#0369a1' : '#b45309'
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              backgroundColor: job.status === 'In Progress' ? '#0284c7' : '#d97706'
                            }}
                          />
                          {job.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px', color: '#475569' }}>
                        {job.technicianName || 'Unassigned'}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <button
                          onClick={() => onNavigate('jobcards')}
                          style={{
                            padding: '5px 12px',
                            backgroundColor: '#f0f9ff',
                            border: '1px solid #bae6fd',
                            borderRadius: 6,
                            color: '#0284c7',
                            fontWeight: 600,
                            fontSize: 12,
                            cursor: 'pointer'
                          }}
                        >
                          Open Job →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2 Content: Works Yet to Be Done */}
      {activeBoardTab === 'pending' && (
        <div>
          {pendingJobs.length === 0 && todayAppointments.length === 0 ? (
            <div
              style={{
                padding: '36px 20px',
                textAlign: 'center',
                backgroundColor: '#f8fafc',
                borderRadius: 8,
                border: '1px dashed #cbd5e1'
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#334155' }}>
                All pending queues are clear!
              </div>
              <p style={{ fontSize: 12, color: '#64748b', maxWidth: 420, margin: '4px auto 16px auto' }}>
                There are no open intake cards or pending bookings waiting to be processed right now.
              </p>
              <button
                onClick={() => onNavigate('appointments')}
                style={{
                  backgroundColor: '#d97706',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 6,
                  padding: '8px 16px',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                + Schedule Appointment
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Queued Job Cards */}
              {pendingJobs.length > 0 && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 8 }}>
                    📋 Intake Queue & Awaiting Parts ({pendingJobs.length})
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: 12 }}>
                        <th style={{ padding: '8px 12px' }}>Job Card #</th>
                        <th style={{ padding: '8px 12px' }}>Vehicle Plate</th>
                        <th style={{ padding: '8px 12px' }}>Customer</th>
                        <th style={{ padding: '8px 12px' }}>Status</th>
                        <th style={{ padding: '8px 12px' }}>Priority</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingJobs.map((job) => (
                        <tr key={job.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 12px', fontWeight: 700, color: '#d97706' }}>
                            {job.jobCardNumber}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <span
                              style={{
                                fontWeight: 800,
                                fontFamily: 'monospace',
                                backgroundColor: '#f1f5f9',
                                border: '1px solid #cbd5e1',
                                padding: '2px 6px',
                                borderRadius: 4
                              }}
                            >
                              {job.vehicle?.registrationNo || 'N/A'}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', color: '#334155' }}>
                            {job.customer?.displayName || 'Customer'}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: 10,
                                fontSize: 11,
                                fontWeight: 700,
                                backgroundColor: job.status === 'Waiting for Parts' ? '#fee2e2' : '#fef3c7',
                                color: job.status === 'Waiting for Parts' ? '#dc2626' : '#b45309'
                              }}
                            >
                              {job.status}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 600,
                                color: job.priority === 'Urgent' ? '#dc2626' : '#475569'
                              }}
                            >
                              {job.priority || 'Normal'}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                            <button
                              onClick={() => onNavigate('jobcards')}
                              style={{
                                padding: '4px 10px',
                                backgroundColor: '#fffbeb',
                                border: '1px solid #fde68a',
                                borderRadius: 6,
                                color: '#b45309',
                                fontWeight: 600,
                                fontSize: 12,
                                cursor: 'pointer'
                              }}
                            >
                              Assign / Start →
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Today's Appointments */}
              {todayAppointments.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 8 }}>
                    📅 Scheduled Arrivals for Today ({todayAppointments.length})
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: 12 }}>
                        <th style={{ padding: '8px 12px' }}>Time Slot</th>
                        <th style={{ padding: '8px 12px' }}>Customer Name</th>
                        <th style={{ padding: '8px 12px' }}>Vehicle</th>
                        <th style={{ padding: '8px 12px' }}>Service Requested</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {todayAppointments.map((appt) => (
                        <tr key={appt.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 12px', fontWeight: 700, color: '#475569' }}>
                            {appt.startTime ? appt.startTime.substring(0, 5) : 'Anytime'}
                          </td>
                          <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0f172a' }}>
                            {appt.customerName}
                          </td>
                          <td style={{ padding: '10px 12px', color: '#334155' }}>
                            {appt.vehicleRegistration || 'Vehicle'}
                          </td>
                          <td style={{ padding: '10px 12px', color: '#64748b' }}>
                            {appt.notes || 'General Service'}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                            <button
                              onClick={() => onNavigate('appointments')}
                              style={{
                                padding: '4px 10px',
                                backgroundColor: '#f0fdf4',
                                border: '1px solid #bbf7d0',
                                borderRadius: 6,
                                color: '#16a34a',
                                fontWeight: 600,
                                fontSize: 12,
                                cursor: 'pointer'
                              }}
                            >
                              Check In Arrival →
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 3 Content: Ready for Delivery */}
      {activeBoardTab === 'ready' && (
        <div>
          {readyJobs.length === 0 ? (
            <div
              style={{
                padding: '36px 20px',
                textAlign: 'center',
                backgroundColor: '#f8fafc',
                borderRadius: 8,
                border: '1px dashed #cbd5e1'
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 8 }}>🚗🔑</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#334155' }}>
                No completed vehicles waiting for pickup
              </div>
              <p style={{ fontSize: 12, color: '#64748b', maxWidth: 420, margin: '4px auto 0 auto' }}>
                Vehicles marked as 'Ready' upon quality inspection pass will appear here for customer invoicing and checkout.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: 12 }}>
                    <th style={{ padding: '8px 12px' }}>Job Card #</th>
                    <th style={{ padding: '8px 12px' }}>Vehicle Plate</th>
                    <th style={{ padding: '8px 12px' }}>Customer</th>
                    <th style={{ padding: '8px 12px' }}>Phone</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {readyJobs.map((job) => (
                    <tr key={job.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px', fontWeight: 700, color: '#16a34a' }}>
                        {job.jobCardNumber}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span
                          style={{
                            fontWeight: 800,
                            fontFamily: 'monospace',
                            backgroundColor: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            padding: '3px 8px',
                            borderRadius: 4
                          }}
                        >
                          {job.vehicle?.registrationNo || 'N/A'}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontWeight: 600, color: '#0f172a' }}>
                        {job.customer?.displayName || 'Customer'}
                      </td>
                      <td style={{ padding: '12px', color: '#64748b' }}>
                        {job.customer?.phonePrimary || 'N/A'}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <button
                          onClick={() => onNavigate('billing')}
                          style={{
                            padding: '5px 12px',
                            backgroundColor: '#f0fdf4',
                            border: '1px solid #86efac',
                            borderRadius: 6,
                            color: '#16a34a',
                            fontWeight: 700,
                            fontSize: 12,
                            cursor: 'pointer'
                          }}
                        >
                          Generate Invoice & Deliver →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
