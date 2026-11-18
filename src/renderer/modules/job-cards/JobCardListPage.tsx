import React, { useState, useEffect } from 'react'
import { api } from '../../api'
import { JobCardWithDetails } from '@shared/types/job-card.types'
import { JobCardCreateModal } from './JobCardCreateModal'
import { JobCardDetailPage } from './JobCardDetailPage'
import { formatMoney } from '@shared/types/money.types'
import { EmptyJobCardsIllustration } from '../../components/Common/Illustrations'

export const JobCardListPage: React.FC = () => {
  const [jobCards, setJobCards] = useState<JobCardWithDetails[]>([])
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  const [selectedJobCardId, setSelectedJobCardId] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const statusTabs = [
    { label: 'All Jobs', value: '' },
    { label: 'Open', value: 'Open' },
    { label: 'In Progress', value: 'In Progress' },
    { label: 'Waiting for Parts', value: 'Waiting for Parts' },
    { label: 'Quality Check', value: 'Quality Check' },
    { label: 'Ready', value: 'Ready' },
    { label: 'Delivered', value: 'Delivered' }
  ]

  useEffect(() => {
    loadJobCards()
  }, [selectedStatus, searchQuery])

  const loadJobCards = async (): Promise<void> => {
    setLoading(true)
    try {
      const res = await api.jobcards.list({
        status: selectedStatus || undefined,
        search: searchQuery || undefined
      })
      if (res.success && res.data) {
        setJobCards(res.data)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  // If a job card is selected, render the full Workshop Workspace Detail Page
  if (selectedJobCardId) {
    return (
      <JobCardDetailPage
        jobCardId={selectedJobCardId}
        onBack={() => {
          setSelectedJobCardId(null)
          loadJobCards()
        }}
      />
    )
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Open': return { bg: '#eff6ff', color: '#1d4ed8' }
      case 'In Progress': return { bg: '#fef3c7', color: '#b45309' }
      case 'Waiting for Parts': return { bg: '#fee2e2', color: '#b91c1c' }
      case 'Quality Check': return { bg: '#f3e8ff', color: '#7e22ce' }
      case 'Ready': return { bg: '#dcfce7', color: '#15803d' }
      case 'Delivered': return { bg: '#e5e7eb', color: '#374151' }
      default: return { bg: '#f3f4f6', color: '#374151' }
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px 0', color: '#111827' }}>
            Workshop Job Cards
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: '#6b7280' }}>
            Manage workflow, technician assignments, service items, and parts usage
          </p>
        </div>
        <button onClick={() => setShowCreateModal(true)} style={primaryBtnStyle}>
          + New Job Card
        </button>
      </div>

      {/* Status filter tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', marginBottom: 16, overflowX: 'auto' }}>
        {statusTabs.map((tab) => {
          const active = selectedStatus === tab.value
          return (
            <button
              key={tab.label}
              onClick={() => setSelectedStatus(tab.value)}
              style={{
                ...tabBtnStyle,
                borderBottom: active ? '2px solid #2563eb' : '2px solid transparent',
                color: active ? '#2563eb' : '#6b7280',
                fontWeight: active ? 600 : 400
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Search Bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Search by Job Card #, registration plate, customer name or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ ...inputStyle, width: 440 }}
        />
      </div>

      {/* Job Cards Table */}
      <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
          <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
              <th style={thStyle}>Job Card #</th>
              <th style={thStyle}>Vehicle</th>
              <th style={thStyle}>Customer</th>
              <th style={thStyle}>Priority</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Technician</th>
              <th style={thStyle}>Estimated Total</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>
                  Loading job cards...
                </td>
              </tr>
            ) : jobCards.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '48px 24px', textAlign: 'center', color: '#6b7280' }}>
                  <EmptyJobCardsIllustration width={130} height={100} />
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#1f2937', marginTop: 12 }}>
                    No Job Cards Found
                  </div>
                  <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
                    {searchQuery || selectedStatus
                      ? 'No work orders match your search filters.'
                      : 'No active workshop orders yet. Click "+ New Job Card" above to open a job card.'}
                  </div>
                </td>
              </tr>
            ) : (
              jobCards.map((jc) => {
                const badge = getStatusBadge(jc.status)
                return (
                  <tr
                    key={jc.id}
                    onClick={() => setSelectedJobCardId(jc.id)}
                    style={{ borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}
                  >
                    <td style={tdStyle}>
                      <span style={{ fontWeight: 700, color: '#1d4ed8' }}>{jc.jobCardNumber}</span>
                      <div style={{ fontSize: 11, color: '#6b7280' }}>
                        {new Date(jc.receivedAt || jc.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 600, color: '#111827' }}>{jc.vehicle.registrationNo}</div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>
                        {jc.vehicle.make} {jc.vehicle.model}
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 500 }}>{jc.customer.name}</div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>{jc.customer.phonePrimary}</div>
                    </td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          fontSize: 11,
                          padding: '2px 7px',
                          borderRadius: 4,
                          background: jc.priority === 'Urgent' ? '#fee2e2' : jc.priority === 'High' ? '#ffedd5' : '#f3f4f6',
                          color: jc.priority === 'Urgent' ? '#b91c1c' : jc.priority === 'High' ? '#c2410c' : '#4b5563',
                          fontWeight: 500
                        }}
                      >
                        {jc.priority}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          fontSize: 12,
                          padding: '3px 8px',
                          borderRadius: 12,
                          background: badge.bg,
                          color: badge.color,
                          fontWeight: 600
                        }}
                      >
                        {jc.status}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      {jc.technicianName || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Unassigned</span>}
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 600, color: '#047857' }}>
                      {formatMoney(jc.totals.grandTotal)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedJobCardId(jc.id)
                        }}
                        style={actionBtnStyle}
                      >
                        Open Workshop ➔
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {showCreateModal && (
        <JobCardCreateModal
          onClose={() => setShowCreateModal(false)}
          onSaved={(newId) => {
            setShowCreateModal(false)
            setSelectedJobCardId(newId)
          }}
        />
      )}
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
const tabBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', padding: '10px 16px', cursor: 'pointer', fontSize: 13, outline: 'none', whiteSpace: 'nowrap'
}
const primaryBtnStyle: React.CSSProperties = {
  padding: '8px 18px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 500, fontSize: 14
}
const actionBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: 13, fontWeight: 500
}
