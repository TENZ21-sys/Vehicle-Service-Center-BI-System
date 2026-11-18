import React, { useState, useEffect } from 'react'
import { api } from '../../api'
import { QuotationWithDetails, QuotationStatus } from '@shared/types/quotation.types'

interface Props {
  quotationId: string
  onClose: () => void
  onUpdated: () => void
  onConvertToJobCard?: (quotation: QuotationWithDetails) => void
}

export const QuotationDocumentModal: React.FC<Props> = ({
  quotationId,
  onClose,
  onUpdated,
  onConvertToJobCard
}) => {
  const [quotation, setQuotation] = useState<QuotationWithDetails | null>(null)
  const [businessProfile, setBusinessProfile] = useState<{
    business_name?: string
    phone?: string
    email?: string
    address?: string
    currency_symbol?: string
  }>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)

  const loadData = async (): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      const [qtRes, profRes] = await Promise.all([
        api.quotations.get(quotationId),
        api.settings.getByCategory('business_profile')
      ])

      if (qtRes.success && qtRes.data) {
        setQuotation(qtRes.data)
      } else {
        setError(qtRes.error?.message || 'Failed to load quotation')
      }

      if (profRes.success && profRes.data) {
        setBusinessProfile(profRes.data as any)
      }
    } catch (err: any) {
      setError(err?.message || 'Error loading quotation')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [quotationId])

  const formatMoney = (cents: number): string => {
    const symbol = businessProfile.currency_symbol || 'Rs.'
    const abs = Math.abs(cents)
    const formatted = (abs / 100).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
    return `${cents < 0 ? '-' : ''}${symbol} ${formatted}`
  }

  const handleStatusTransition = async (status: QuotationStatus): Promise<void> => {
    setUpdating(true)
    try {
      const res = await api.quotations.updateStatus(quotationId, status)
      if (res.success) {
        await loadData()
        onUpdated()
      } else {
        alert(res.error || 'Failed to update quotation status')
      }
    } catch (err: any) {
      alert(err.message || 'Error updating status')
    } finally {
      setUpdating(false)
    }
  }

  const handlePrint = (): void => {
    window.print()
  }

  if (loading) {
    return (
      <div style={backdropStyle}>
        <div style={{ ...modalStyle, padding: 40, textAlign: 'center' }}>
          <p style={{ color: '#6b7280' }}>Loading estimate proposal...</p>
        </div>
      </div>
    )
  }

  if (error || !quotation) {
    return (
      <div style={backdropStyle}>
        <div style={{ ...modalStyle, padding: 30 }}>
          <h3 style={{ color: '#dc2626', margin: 0 }}>Error</h3>
          <p style={{ color: '#4b5563', margin: '12px 0 20px' }}>{error || 'Quotation not found'}</p>
          <button onClick={onClose} style={closeBtnStyle}>
            Close
          </button>
        </div>
      </div>
    )
  }

  const isApproved = quotation.status === 'Approved'
  const isLinked = Boolean(quotation.jobCardId)

  return (
    <div style={backdropStyle}>
      <div style={modalStyle}>
        {/* Controls Bar (hidden during print) */}
        <div className="no-print" style={headerControlStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>Formal Quotation</span>
            <span style={getStatusBadge(quotation.status)}>{quotation.status}</span>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handlePrint} style={printBtnStyle}>
              🖨️ Print
            </button>

            {quotation.status === 'Draft' && (
              <button
                onClick={() => handleStatusTransition('Sent')}
                disabled={updating}
                style={actionStatusBtnStyle}
              >
                📤 Mark Sent
              </button>
            )}

            {(quotation.status === 'Draft' || quotation.status === 'Sent') && (
              <button
                onClick={() => handleStatusTransition('Approved')}
                disabled={updating}
                style={approveBtnStyle}
              >
                ✓ Approve Quote
              </button>
            )}

            {quotation.status !== 'Approved' && quotation.status !== 'Rejected' && (
              <button
                onClick={() => handleStatusTransition('Rejected')}
                disabled={updating}
                style={rejectBtnStyle}
              >
                ✕ Reject
              </button>
            )}

            {!isLinked && onConvertToJobCard && (
              <button
                onClick={() => onConvertToJobCard(quotation)}
                style={convertJobCardBtnStyle}
                title="Convert estimate to active workshop Job Card"
              >
                🔧 Convert to Job Card
              </button>
            )}

            <button onClick={onClose} style={closeBtnStyle}>
              Close
            </button>
          </div>
        </div>

        {/* Printable Document Area */}
        <div style={printableAreaStyle} id="printable-quotation">
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #1e293b', paddingBottom: 16 }}>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {businessProfile.business_name || 'Vehicle Service Center'}
              </h1>
              {businessProfile.address && <p style={metaTextStyle}>{businessProfile.address}</p>}
              <p style={metaTextStyle}>
                {businessProfile.phone && `Tel: ${businessProfile.phone} `}
                {businessProfile.email && `| Email: ${businessProfile.email}`}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#2563eb' }}>
                SERVICE ESTIMATE
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginTop: 4 }}>
                #{quotation.quotationNumber}
              </div>
              <div style={metaTextStyle}>
                Date: {new Date(quotation.createdAt).toLocaleDateString()}
              </div>
              <div style={{ ...metaTextStyle, color: '#dc2626', fontWeight: 600 }}>
                Valid Until: {new Date(quotation.expiresAt).toLocaleDateString()} ({quotation.validityDays} days)
              </div>
            </div>
          </div>

          {/* Customer & Vehicle Info Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, margin: '20px 0' }}>
            <div style={infoBoxStyle}>
              <div style={infoTitleStyle}>PROPOSAL PREPARED FOR</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{quotation.customer.name}</div>
              <div style={metaTextStyle}>Phone: {quotation.customer.phonePrimary}</div>
              {quotation.customer.email && <div style={metaTextStyle}>Email: {quotation.customer.email}</div>}
              {quotation.customer.address && <div style={metaTextStyle}>Address: {quotation.customer.address}</div>}
            </div>

            <div style={infoBoxStyle}>
              <div style={infoTitleStyle}>VEHICLE SPECIFICATION</div>
              {quotation.vehicle ? (
                <>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>
                    {quotation.vehicle.registrationNo}
                  </div>
                  <div style={metaTextStyle}>
                    {quotation.vehicle.make} {quotation.vehicle.model} ({quotation.vehicle.year || 'N/A'})
                  </div>
                  {quotation.vehicle.vin && <div style={metaTextStyle}>VIN: {quotation.vehicle.vin}</div>}
                </>
              ) : (
                <div style={{ color: '#64748b', fontStyle: 'italic', fontSize: 13 }}>
                  General service estimate (No vehicle assigned)
                </div>
              )}
            </div>
          </div>

          {/* Line Items Table */}
          <table style={tableStyle}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                <th style={{ ...thStyle, width: '5%' }}>#</th>
                <th style={{ ...thStyle, width: '12%' }}>Type</th>
                <th style={thStyle}>Description</th>
                <th style={{ ...thStyle, textAlign: 'right', width: '10%' }}>Qty</th>
                <th style={{ ...thStyle, textAlign: 'right', width: '16%' }}>Unit Price</th>
                <th style={{ ...thStyle, textAlign: 'right', width: '12%' }}>Tax</th>
                <th style={{ ...thStyle, textAlign: 'right', width: '18%' }}>Line Total</th>
              </tr>
            </thead>
            <tbody>
              {quotation.items.map((item, idx) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={tdStyle}>{idx + 1}</td>
                  <td style={tdStyle}>
                    <span style={item.itemType === 'service' ? serviceBadgeStyle : partBadgeStyle}>
                      {item.itemType === 'service' ? 'Service' : 'Part'}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 500, color: '#1e293b' }}>
                    {item.description}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{item.quantity}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{formatMoney(item.unitPriceAmount)}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    {item.taxAmount > 0 ? formatMoney(item.taxAmount) : '-'}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>
                    {formatMoney(item.totalAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Financial Totals */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <div style={{ width: 280 }}>
              <div style={summaryRowStyle}>
                <span style={{ color: '#64748b' }}>Estimated Subtotal:</span>
                <span style={{ fontWeight: 600 }}>{formatMoney(quotation.subtotalAmount)}</span>
              </div>
              {quotation.taxAmount > 0 && (
                <div style={summaryRowStyle}>
                  <span style={{ color: '#64748b' }}>Estimated Tax:</span>
                  <span style={{ fontWeight: 600 }}>{formatMoney(quotation.taxAmount)}</span>
                </div>
              )}
              {quotation.discountAmount > 0 && (
                <div style={summaryRowStyle}>
                  <span style={{ color: '#16a34a' }}>Discounts:</span>
                  <span style={{ fontWeight: 600, color: '#16a34a' }}>-{formatMoney(quotation.discountAmount)}</span>
                </div>
              )}
              <div style={{ ...summaryRowStyle, borderTop: '2px solid #cbd5e1', paddingTop: 8, fontSize: 16 }}>
                <span style={{ fontWeight: 800, color: '#0f172a' }}>Estimated Grand Total:</span>
                <span style={{ fontWeight: 800, color: '#0f172a' }}>{formatMoney(quotation.totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Notes and Terms */}
          {quotation.notes && (
            <div style={{ marginTop: 24, padding: 12, backgroundColor: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Terms & Scope:</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{quotation.notes}</div>
            </div>
          )}

          {/* Acceptance Signature Signoff */}
          <div style={{ marginTop: 40, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, borderTop: '1px dashed #cbd5e1', paddingTop: 24 }}>
            <div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 30 }}>Service Advisor Signature:</div>
              <div style={{ borderBottom: '1px solid #94a3b8', width: '80%' }}></div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Authorized Signature</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 30 }}>Customer Acceptance Signature:</div>
              <div style={{ borderBottom: '1px solid #94a3b8', width: '80%' }}></div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Date: ________________________</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const backdropStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(15, 23, 42, 0.65)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1050,
  padding: 16
}

const modalStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: 12,
  width: '100%',
  maxWidth: 820,
  maxHeight: '94vh',
  overflowY: 'auto',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
  display: 'flex',
  flexDirection: 'column'
}

const headerControlStyle: React.CSSProperties = {
  padding: '16px 20px',
  borderBottom: '1px solid #e2e8f0',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  backgroundColor: '#f8fafc',
  borderTopLeftRadius: 12,
  borderTopRightRadius: 12
}

const printableAreaStyle: React.CSSProperties = {
  padding: 32,
  color: '#0f172a',
  fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
}

const metaTextStyle: React.CSSProperties = {
  margin: '2px 0',
  fontSize: 12,
  color: '#64748b'
}

const infoBoxStyle: React.CSSProperties = {
  backgroundColor: '#f8fafc',
  borderRadius: 8,
  padding: 14,
  border: '1px solid #e2e8f0'
}

const infoTitleStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  marginBottom: 6
}

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  textAlign: 'left'
}

const thStyle: React.CSSProperties = {
  padding: '10px 8px',
  fontSize: 12,
  fontWeight: 600,
  color: '#475569'
}

const tdStyle: React.CSSProperties = {
  padding: '10px 8px',
  fontSize: 13,
  color: '#334155'
}

const summaryRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '4px 0',
  fontSize: 13
}

const printBtnStyle: React.CSSProperties = {
  padding: '6px 12px',
  fontSize: 13,
  fontWeight: 600,
  backgroundColor: '#f1f5f9',
  color: '#334155',
  border: '1px solid #cbd5e1',
  borderRadius: 6,
  cursor: 'pointer'
}

const actionStatusBtnStyle: React.CSSProperties = {
  padding: '6px 12px',
  fontSize: 13,
  fontWeight: 600,
  backgroundColor: '#eff6ff',
  color: '#2563eb',
  border: '1px solid #bfdbfe',
  borderRadius: 6,
  cursor: 'pointer'
}

const approveBtnStyle: React.CSSProperties = {
  padding: '6px 12px',
  fontSize: 13,
  fontWeight: 600,
  backgroundColor: '#16a34a',
  color: '#ffffff',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer'
}

const rejectBtnStyle: React.CSSProperties = {
  padding: '6px 10px',
  fontSize: 13,
  backgroundColor: '#fee2e2',
  color: '#dc2626',
  border: '1px solid #fecaca',
  borderRadius: 6,
  cursor: 'pointer'
}

const convertJobCardBtnStyle: React.CSSProperties = {
  padding: '6px 14px',
  fontSize: 13,
  fontWeight: 600,
  backgroundColor: '#059669',
  color: '#ffffff',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer'
}

const closeBtnStyle: React.CSSProperties = {
  padding: '6px 12px',
  fontSize: 13,
  fontWeight: 500,
  backgroundColor: '#ffffff',
  color: '#64748b',
  border: '1px solid #cbd5e1',
  borderRadius: 6,
  cursor: 'pointer'
}

const serviceBadgeStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  padding: '2px 6px',
  borderRadius: 4,
  backgroundColor: '#eff6ff',
  color: '#2563eb'
}

const partBadgeStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  padding: '2px 6px',
  borderRadius: 4,
  backgroundColor: '#fef3c7',
  color: '#d97706'
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
    case 'Approved':
      return { ...base, backgroundColor: '#dcfce7', color: '#166534' }
    case 'Sent':
      return { ...base, backgroundColor: '#dbeafe', color: '#1e40af' }
    case 'Rejected':
      return { ...base, backgroundColor: '#fee2e2', color: '#991b1b' }
    case 'Expired':
      return { ...base, backgroundColor: '#f1f5f9', color: '#64748b' }
    default:
      return { ...base, backgroundColor: '#fef9c3', color: '#854d0e' }
  }
}
