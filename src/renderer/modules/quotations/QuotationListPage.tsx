import React, { useState, useEffect } from 'react'
import { api } from '../../api'
import { QuotationWithDetails, QuotationStatus } from '@shared/types/quotation.types'
import { QuotationCreateModal } from './QuotationCreateModal'
import { QuotationDocumentModal } from './QuotationDocumentModal'

interface Props {
  onNavigateToJobCard?: (jobCardId: string) => void
}

export const QuotationListPage: React.FC<Props> = ({ onNavigateToJobCard }) => {
  const [quotations, setQuotations] = useState<QuotationWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Settings
  const [currencySymbol, setCurrencySymbol] = useState('Rs.')

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Modals & Action states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedQuotationId, setSelectedQuotationId] = useState<string | null>(null)
  const [convertingId, setConvertingId] = useState<string | null>(null)

  const loadQuotations = async (): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.quotations.list({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: searchQuery.trim() || undefined
      })

      if (res.success && res.data) {
        setQuotations(res.data)
      } else {
        setError(res.error?.message || 'Failed to load quotations')
      }
    } catch (err: any) {
      setError(err?.message || 'Error loading quotations')
    } finally {
      setLoading(false)
    }
  }

  const loadSettings = async (): Promise<void> => {
    try {
      const res = await api.settings.getByCategory('business_profile')
      if (res.success && res.data && res.data.currency_symbol) {
        setCurrencySymbol(res.data.currency_symbol)
      }
    } catch (err) {
      console.warn('Failed to load currency setting, defaulting to Rs.')
    }
  }

  useEffect(() => {
    loadSettings()
  }, [])

  useEffect(() => {
    loadQuotations()
  }, [statusFilter])

  const handleSearchSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    loadQuotations()
  }

  const handleStatusUpdate = async (id: string, status: QuotationStatus): Promise<void> => {
    try {
      const res = await api.quotations.updateStatus(id, { status })
      if (res.success) {
        loadQuotations()
      } else {
        alert(res.error || 'Failed to update quotation status')
      }
    } catch (err: any) {
      alert(err.message || 'Error updating quotation status')
    }
  }

  const handleConvertToJobCard = async (quotation: QuotationWithDetails): Promise<void> => {
    if (quotation.status !== 'approved') {
      const proceed = confirm(
        `Quotation ${quotation.quotationNumber} is currently in "${quotation.status}" state.\n\nConverting to a Job Card requires client approval. Do you want to mark it as Approved and proceed with conversion?`
      )
      if (!proceed) return
    } else {
      if (!confirm(`Convert Quotation ${quotation.quotationNumber} into an active Workshop Job Card?\n\nThis will transfer all quoted services and allocate required parts from inventory.`)) {
        return
      }
    }

    setConvertingId(quotation.id)
    try {
      const res = await api.quotations.convertToJobCard({
        quotationId: quotation.id,
        priority: 'Normal'
      })

      if (res.success && res.data) {
        await loadQuotations()
        if (onNavigateToJobCard) {
          onNavigateToJobCard(res.data.jobCardId)
        } else {
          alert(`Successfully created Job Card! You can view it in the Job Cards tab.`)
        }
      } else {
        alert(res.error || 'Failed to convert quotation to Job Card')
      }
    } catch (err: any) {
      alert(err?.message || 'Error converting quotation')
    } finally {
      setConvertingId(null)
    }
  }

  // Summary computations
  const totalCount = quotations.length
  const approvedQuotes = quotations.filter((q) => q.status === 'approved')
  const approvedTotalAmount = approvedQuotes.reduce((sum, q) => sum + (q.totalAmount || 0), 0)
  const pendingCount = quotations.filter((q) => q.status === 'draft' || q.status === 'sent').length
  const convertedCount = quotations.filter((q) => Boolean(q.convertedToJobCardId)).length

  return (
    <div style={{ padding: 28, maxWidth: 1400, margin: '0 auto' }}>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 16
        }}
      >
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>
            Quotations & Price Estimates
          </h1>
          <p style={{ color: '#6b7280', fontSize: 13, marginTop: 4, margin: 0 }}>
            Create formal price quotes, capture customer approvals, and seamlessly convert accepted quotes into workshop Job Cards with automated inventory allocation.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => loadQuotations()}
            style={{
              padding: '9px 15px',
              backgroundColor: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              color: '#374151',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            🔄 Refresh
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              padding: '9px 18px',
              backgroundColor: '#2563eb',
              border: 'none',
              borderRadius: 6,
              color: '#ffffff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <span>+</span> New Quotation
          </button>
        </div>
      </div>

      {/* KPI Metric Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: 16,
          marginBottom: 24
        }}
      >
        <div style={kpiCardStyle}>
          <div style={kpiLabelStyle}>Total Quotations</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#111827', marginTop: 4 }}>
            {totalCount}
          </div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
            All historical quotes
          </div>
        </div>

        <div style={kpiCardStyle}>
          <div style={kpiLabelStyle}>Pending Approval</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#d97706', marginTop: 4 }}>
            {pendingCount}
          </div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
            Draft or Sent to customer
          </div>
        </div>

        <div style={kpiCardStyle}>
          <div style={kpiLabelStyle}>Approved Quotes</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#16a34a', marginTop: 4 }}>
            {currencySymbol} {(approvedTotalAmount / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
            {approvedQuotes.length} approved by customer
          </div>
        </div>

        <div style={kpiCardStyle}>
          <div style={kpiLabelStyle}>Converted to Job Cards</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#7c3aed', marginTop: 4 }}>
            {convertedCount}
          </div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
            Transitioned into active work
          </div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 8,
          border: '1px solid #e5e7eb',
          padding: '16px 20px',
          marginBottom: 20,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 16,
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        {/* Status Tabs */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'All' },
            { id: 'draft', label: 'Draft' },
            { id: 'sent', label: 'Sent' },
            { id: 'approved', label: 'Approved' },
            { id: 'rejected', label: 'Rejected' },
            { id: 'expired', label: 'Expired' }
          ].map((tab) => {
            const active = statusFilter === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: active ? 600 : 500,
                  backgroundColor: active ? '#2563eb' : '#f3f4f6',
                  color: active ? '#ffffff' : '#4b55f6',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Search input */}
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            placeholder="Search by quote #, customer, plate..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: '7px 12px',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              fontSize: 13,
              width: 260
            }}
          />
          <button
            type="submit"
            style={{
              padding: '7px 14px',
              backgroundColor: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              fontSize: 13,
              cursor: 'pointer'
            }}
          >
            Search
          </button>
        </form>
      </div>

      {/* Main Quotation List Table */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 8,
          border: '1px solid #e5e7eb',
          overflow: 'hidden'
        }}
      >
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6b7280', fontSize: 14 }}>
            Loading quotations...
          </div>
        ) : error ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#dc2626', fontSize: 14 }}>
            {error}
          </div>
        ) : quotations.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>📝</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#374151' }}>No quotations found</div>
            <p style={{ color: '#6b7280', fontSize: 13, marginTop: 4, maxWidth: 400, margin: '4px auto 16px' }}>
              Create a formal price quotation to estimate services and spare parts for your customers.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              + Create First Quotation
            </button>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#4b5563', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '12px 16px' }}>Quote #</th>
                <th style={{ padding: '12px 16px' }}>Customer & Vehicle</th>
                <th style={{ padding: '12px 16px' }}>Items Summary</th>
                <th style={{ padding: '12px 16px' }}>Total Amount</th>
                <th style={{ padding: '12px 16px' }}>Date / Validity</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {quotations.map((q) => {
                const isConverted = Boolean(q.convertedToJobCardId)
                const isConverting = convertingId === q.id
                const isExpired = q.status === 'expired' || (q.validUntil && q.validUntil < new Date().toISOString().split('T')[0] && q.status !== 'approved' && !isConverted)

                return (
                  <tr
                    key={q.id}
                    style={{
                      borderBottom: '1px solid #f3f4f6',
                      transition: 'background-color 0.1s ease'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fcfdfe')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                  >
                    <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                      <div style={{ fontWeight: 600, color: '#2563eb', cursor: 'pointer' }} onClick={() => setSelectedQuotationId(q.id)}>
                        {q.quotationNumber}
                      </div>
                      {isConverted && (
                        <div style={{ marginTop: 4, display: 'inline-block', fontSize: 11, backgroundColor: '#f5f3ff', color: '#7c3aed', padding: '2px 6px', borderRadius: 4, fontWeight: 500 }}>
                          Converted to Job Card
                        </div>
                      )}
                    </td>

                    <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                      <div style={{ fontWeight: 600, color: '#111827' }}>
                        {q.customer.firstName} {q.customer.lastName}
                      </div>
                      <div style={{ color: '#4b5563', fontSize: 12, marginTop: 2 }}>
                        🚗 {q.vehicle.registrationNo} • {q.vehicle.make} {q.vehicle.model}
                      </div>
                      {q.customer.phone && (
                        <div style={{ color: '#9ca3af', fontSize: 11, marginTop: 2 }}>
                          📞 {q.customer.phone}
                        </div>
                      )}
                    </td>

                    <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                      <div style={{ color: '#374151', fontWeight: 500 }}>
                        {q.items.length} item{q.items.length === 1 ? '' : 's'}
                      </div>
                      <div style={{ color: '#6b7280', fontSize: 12, marginTop: 2 }}>
                        {q.items.filter(i => i.itemType === 'service').length} services, {q.items.filter(i => i.itemType === 'part').length} parts
                      </div>
                    </td>

                    <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                      <div style={{ fontWeight: 700, color: '#111827', fontSize: 14 }}>
                        {currencySymbol} {(q.totalAmount / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                        Subtotal: {currencySymbol} {(q.subtotalAmount / 100).toFixed(2)}
                      </div>
                    </td>

                    <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                      <div style={{ color: '#374151' }}>
                        Issued: {q.createdAt.split('T')[0]}
                      </div>
                      <div style={{ fontSize: 11, color: isExpired ? '#dc2626' : '#6b7280', marginTop: 2, fontWeight: isExpired ? 600 : 400 }}>
                        {isExpired ? '⚠️ Expired: ' : 'Valid until: '} {q.validUntil}
                      </div>
                    </td>

                    <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                      <StatusBadge status={q.status} />
                    </td>

                    <td style={{ padding: '14px 16px', verticalAlign: 'top', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => setSelectedQuotationId(q.id)}
                          style={{
                            padding: '5px 10px',
                            backgroundColor: '#f3f4f6',
                            border: '1px solid #d1d5db',
                            borderRadius: 4,
                            fontSize: 12,
                            fontWeight: 500,
                            color: '#374151',
                            cursor: 'pointer'
                          }}
                        >
                          👁️ View / Print
                        </button>

                        {!isConverted && (
                          <button
                            onClick={() => handleConvertToJobCard(q)}
                            disabled={isConverting}
                            style={{
                              padding: '5px 10px',
                              backgroundColor: q.status === 'approved' ? '#16a34a' : '#2563eb',
                              border: 'none',
                              borderRadius: 4,
                              fontSize: 12,
                              fontWeight: 600,
                              color: '#ffffff',
                              cursor: isConverting ? 'not-allowed' : 'pointer'
                            }}
                          >
                            {isConverting ? 'Converting...' : '⚡ Convert to Job Card'}
                          </button>
                        )}
                      </div>

                      {/* Quick status transitions for workflow speed */}
                      {!isConverted && (
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', marginTop: 6 }}>
                          {q.status === 'draft' && (
                            <button
                              onClick={() => handleStatusUpdate(q.id, 'sent')}
                              style={quickStatusButtonStyle}
                            >
                              Mark Sent
                            </button>
                          )}
                          {(q.status === 'draft' || q.status === 'sent') && (
                            <button
                              onClick={() => handleStatusUpdate(q.id, 'approved')}
                              style={{ ...quickStatusButtonStyle, color: '#16a34a' }}
                            >
                              Approve
                            </button>
                          )}
                          {q.status !== 'rejected' && q.status !== 'approved' && (
                            <button
                              onClick={() => handleStatusUpdate(q.id, 'rejected')}
                              style={{ ...quickStatusButtonStyle, color: '#dc2626' }}
                            >
                              Reject
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal: Create Quotation */}
      {showCreateModal && (
        <QuotationCreateModal
          currencySymbol={currencySymbol}
          onClose={() => setShowCreateModal(false)}
          onSuccess={(newQuotation) => {
            setShowCreateModal(false)
            loadQuotations()
            setSelectedQuotationId(newQuotation.id)
          }}
        />
      )}

      {/* Modal: View / Print Document */}
      {selectedQuotationId && (
        <QuotationDocumentModal
          quotationId={selectedQuotationId}
          onClose={() => setSelectedQuotationId(null)}
          onUpdated={() => {
            loadQuotations()
          }}
          onConvertToJobCard={(q) => {
            setSelectedQuotationId(null)
            handleConvertToJobCard(q)
          }}
        />
      )}
    </div>
  )
}

const StatusBadge: React.FC<{ status: QuotationStatus }> = ({ status }) => {
  let bg = '#f3f4f6'
  let color = '#374151'
  let label: string = status

  switch (status) {
    case 'draft':
      bg = '#f3f4f6'
      color = '#4b5563'
      label = 'Draft'
      break
    case 'sent':
      bg = '#e0f2fe'
      color = '#0369a1'
      label = 'Sent'
      break
    case 'approved':
      bg = '#dcfce7'
      color = '#15803d'
      label = 'Approved'
      break
    case 'rejected':
      bg = '#fee2e2'
      color = '#b91c1c'
      label = 'Rejected'
      break
    case 'expired':
      bg = '#fef3c7'
      color = '#b45309'
      label = 'Expired'
      break
  }

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 8px',
        borderRadius: 12,
        fontSize: 11,
        fontWeight: 600,
        backgroundColor: bg,
        color: color,
        textTransform: 'capitalize'
      }}
    >
      {label}
    </span>
  )
}

const kpiCardStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: 8,
  padding: '16px 20px',
  border: '1px solid #e5e7eb',
  boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
}

const kpiLabelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.04em'
}

const quickStatusButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  fontSize: 11,
  color: '#6b7280',
  textDecoration: 'underline',
  cursor: 'pointer',
  padding: '2px 4px'
}
