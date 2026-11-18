import React, { useState, useEffect } from 'react'
import { api } from '../../api'
import { InvoiceWithDetails } from '@shared/types/invoice.types'

interface Props {
  invoiceId: string
  onClose: () => void
  onInvoiceUpdated?: () => void
  onOpenPaymentModal?: (invoice: InvoiceWithDetails) => void
  onOpenVoidModal?: (invoice: InvoiceWithDetails) => void
}

export const InvoiceDocumentModal: React.FC<Props> = ({
  invoiceId,
  onClose,
  onInvoiceUpdated: _onInvoiceUpdated,
  onOpenPaymentModal,
  onOpenVoidModal
}) => {
  const [invoice, setInvoice] = useState<InvoiceWithDetails | null>(null)
  const [paperFormat, setPaperFormat] = useState<'a4' | 'thermal'>('a4')
  const [businessProfile, setBusinessProfile] = useState<{
    business_name?: string
    phone?: string
    email?: string
    address?: string
    currency_symbol?: string
  }>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = async (): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      const [invRes, profRes] = await Promise.all([
        api.invoices.get(invoiceId),
        api.settings.getByCategory('business_profile')
      ])

      if (invRes.success && invRes.data) {
        setInvoice(invRes.data)
      } else {
        setError(invRes.error?.message || 'Failed to load invoice')
      }

      if (profRes.success && profRes.data) {
        setBusinessProfile(profRes.data as any)
      }
    } catch (err: any) {
      setError(err?.message || 'Error loading invoice')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [invoiceId])

  const formatMoney = (cents: number): string => {
    const symbol = businessProfile.currency_symbol || 'Rs.'
    const isNegative = cents < 0
    const abs = Math.abs(cents)
    const formatted = (abs / 100).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
    return `${isNegative ? '-' : ''}${symbol} ${formatted}`
  }

  const handlePrint = (): void => {
    window.print()
  }

  if (loading) {
    return (
      <div style={backdropStyle}>
        <div style={{ ...modalStyle, padding: 40, textAlign: 'center' }}>
          <p style={{ color: '#6b7280' }}>Loading invoice document...</p>
        </div>
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div style={backdropStyle}>
        <div style={{ ...modalStyle, padding: 30 }}>
          <h3 style={{ color: '#dc2626', margin: 0 }}>Error</h3>
          <p style={{ color: '#4b5563', margin: '12px 0 20px' }}>{error || 'Invoice not found'}</p>
          <button onClick={onClose} style={closeBtnStyle}>
            Close
          </button>
        </div>
      </div>
    )
  }

  const isVoid = invoice.status === 'Void'
  const isCreditNote = Boolean(invoice.creditNoteOf)

  return (
    <div style={backdropStyle}>
      <div style={modalStyle}>
        {/* Document Header Controls (Hidden during print) */}
        <div className="no-print" style={headerControlStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>
              {isCreditNote ? 'Credit Note Document' : 'Invoice Document'}
            </span>
            <span style={getStatusBadge(invoice.status)}>{invoice.status}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Paper Format Switcher */}
            <div style={{ display: 'flex', backgroundColor: '#f1f5f9', padding: 2, borderRadius: 6, marginRight: 4 }}>
              <button
                onClick={() => setPaperFormat('a4')}
                style={{
                  padding: '4px 10px',
                  borderRadius: 4,
                  border: 'none',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: paperFormat === 'a4' ? '#ffffff' : 'transparent',
                  color: paperFormat === 'a4' ? '#2563eb' : '#64748b',
                  boxShadow: paperFormat === 'a4' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none'
                }}
              >
                📄 Standard A4
              </button>
              <button
                onClick={() => setPaperFormat('thermal')}
                style={{
                  padding: '4px 10px',
                  borderRadius: 4,
                  border: 'none',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: paperFormat === 'thermal' ? '#ffffff' : 'transparent',
                  color: paperFormat === 'thermal' ? '#2563eb' : '#64748b',
                  boxShadow: paperFormat === 'thermal' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none'
                }}
              >
                🧾 80mm Thermal POS
              </button>
            </div>

            <button onClick={handlePrint} style={printBtnStyle}>
              🖨️ Print {paperFormat === 'thermal' ? 'Receipt' : 'Invoice'}
            </button>
            {!isVoid && invoice.dueAmount > 0 && onOpenPaymentModal && (
              <button
                onClick={() => onOpenPaymentModal(invoice)}
                style={payBtnStyle}
              >
                💵 Record Payment
              </button>
            )}
            {!isVoid && onOpenVoidModal && (
              <button
                onClick={() => onOpenVoidModal(invoice)}
                style={voidBtnStyle}
              >
                🚫 Void Invoice
              </button>
            )}
            <button onClick={onClose} style={closeBtnStyle}>
              ✕ Close
            </button>
          </div>
        </div>

        {/* Paper Layout Body: Thermal 80mm vs Standard A4 */}
        {paperFormat === 'thermal' ? (
          <div style={thermalReceiptStyle} id="printable-thermal-receipt">
            {/* Store Header */}
            <div style={{ textAlign: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#000000', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {businessProfile.business_name || 'Vehicle Service Center'}
              </div>
              {businessProfile.address && (
                <div style={{ fontSize: 10.5, color: '#333333', marginTop: 2 }}>
                  {businessProfile.address}
                </div>
              )}
              {businessProfile.phone && (
                <div style={{ fontSize: 10.5, color: '#333333' }}>
                  Tel: {businessProfile.phone}
                </div>
              )}
            </div>

            <div style={{ borderTop: '1px dashed #000000', margin: '6px 0' }} />

            {/* Receipt Meta */}
            <div style={{ fontSize: 10.5, color: '#000000', lineHeight: 1.4 }}>
              <div><strong>{isCreditNote ? 'CREDIT NOTE' : 'TAX RECEIPT'} #:</strong> {invoice.invoiceNumber}</div>
              <div><strong>DATE:</strong> {new Date(invoice.createdAt).toLocaleString()}</div>
              <div><strong>CLIENT:</strong> {invoice.customer.displayName}</div>
              {invoice.vehicle && (
                <div><strong>VEHICLE:</strong> {invoice.vehicle.registrationNo} ({invoice.vehicle.make} {invoice.vehicle.model})</div>
              )}
              {invoice.jobCardId && (
                <div><strong>JOB CARD:</strong> #{invoice.jobCardId.slice(0, 8)}</div>
              )}
            </div>

            <div style={{ borderTop: '1px dashed #000000', margin: '6px 0' }} />

            {/* Items */}
            <table style={{ width: '100%', fontSize: 10.5, borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px dashed #000000' }}>
                  <th style={{ padding: '3px 0' }}>Item Description</th>
                  <th style={{ padding: '3px 0', textAlign: 'center' }}>Qty</th>
                  <th style={{ padding: '3px 0', textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item) => (
                  <tr key={item.id}>
                    <td style={{ padding: '3px 0', verticalAlign: 'top' }}>
                      <div>{item.description}</div>
                      <div style={{ fontSize: 9.5, color: '#555555' }}>@{formatMoney(item.unitPriceAmount)}</div>
                    </td>
                    <td style={{ padding: '3px 0', textAlign: 'center', verticalAlign: 'top' }}>
                      {item.quantity}
                    </td>
                    <td style={{ padding: '3px 0', textAlign: 'right', verticalAlign: 'top', fontWeight: 600 }}>
                      {formatMoney(item.totalAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ borderTop: '1px dashed #000000', margin: '6px 0' }} />

            {/* Financial Summary */}
            <div style={{ fontSize: 11, lineHeight: 1.5 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subtotal:</span>
                <span>{formatMoney(invoice.subtotalAmount)}</span>
              </div>
              {invoice.taxAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Tax:</span>
                  <span>{formatMoney(invoice.taxAmount)}</span>
                </div>
              )}
              {invoice.discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Discount:</span>
                  <span>-{formatMoney(invoice.discountAmount)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, fontWeight: 800, borderTop: '1px solid #000000', borderBottom: '1px solid #000000', padding: '4px 0', margin: '4px 0' }}>
                <span>TOTAL:</span>
                <span>{formatMoney(invoice.totalAmount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Paid Amount:</span>
                <span>{formatMoney(invoice.paidAmount)}</span>
              </div>
              {invoice.dueAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b91c1c', fontWeight: 700 }}>
                  <span>Balance Due:</span>
                  <span>{formatMoney(invoice.dueAmount)}</span>
                </div>
              )}
            </div>

            <div style={{ borderTop: '1px dashed #000000', margin: '10px 0 6px 0' }} />

            {/* Footer */}
            <div style={{ textAlign: 'center', fontSize: 10, color: '#333333' }}>
              <div>*** THANK YOU FOR YOUR BUSINESS ***</div>
              <div style={{ marginTop: 2 }}>Drive Safe! Fast & Professional Service.</div>
            </div>
          </div>
        ) : (
        /* Printable Invoice Page */
        <div style={printableAreaStyle} id="printable-invoice">
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
              <div style={{ fontSize: 20, fontWeight: 800, color: isCreditNote ? '#dc2626' : '#2563eb' }}>
                {isCreditNote ? 'CREDIT NOTE' : 'TAX INVOICE'}
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginTop: 4 }}>
                #{invoice.invoiceNumber}
              </div>
              <div style={metaTextStyle}>
                Date: {new Date(invoice.createdAt).toLocaleDateString()}
              </div>
              {invoice.jobCardId && (
                <div style={{ ...metaTextStyle, fontWeight: 600, color: '#475569' }}>
                  Job Card: #{invoice.jobCardId.slice(0, 8)}
                </div>
              )}
            </div>
          </div>

          {/* Void Banner if applicable */}
          {isVoid && (
            <div style={voidBannerStyle}>
              <strong>INVOICE VOIDED:</strong> {invoice.voidReason || 'No reason provided'}
              <div style={{ fontSize: 11, marginTop: 4 }}>
                Voided on {invoice.voidedAt ? new Date(invoice.voidedAt).toLocaleString() : ''}
                {invoice.voidedByName ? ` by ${invoice.voidedByName}` : ''}
              </div>
            </div>
          )}

          {/* Customer & Vehicle Info Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, margin: '20px 0' }}>
            <div style={infoBoxStyle}>
              <div style={infoTitleStyle}>BILL TO</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{invoice.customer.name}</div>
              <div style={metaTextStyle}>Phone: {invoice.customer.phonePrimary}</div>
              {invoice.customer.email && <div style={metaTextStyle}>Email: {invoice.customer.email}</div>}
              {invoice.customer.address && <div style={metaTextStyle}>Address: {invoice.customer.address}</div>}
              {invoice.customer.nic && <div style={metaTextStyle}>NIC: {invoice.customer.nic}</div>}
            </div>

            <div style={infoBoxStyle}>
              <div style={infoTitleStyle}>VEHICLE & SERVICE DETAILS</div>
              {invoice.vehicle ? (
                <>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>
                    {invoice.vehicle.registrationNo}
                  </div>
                  <div style={metaTextStyle}>
                    {invoice.vehicle.make} {invoice.vehicle.model} ({invoice.vehicle.year || 'N/A'})
                  </div>
                  {invoice.vehicle.vin && <div style={metaTextStyle}>VIN: {invoice.vehicle.vin}</div>}
                </>
              ) : (
                <div style={{ color: '#64748b', fontStyle: 'italic', fontSize: 13 }}>
                  Over-the-counter POS Sale (No vehicle linked)
                </div>
              )}
              <div style={{ marginTop: 8, fontSize: 12, color: '#475569' }}>
                Invoice Type: <strong style={{ textTransform: 'uppercase' }}>{invoice.invoiceType.replace('_', ' ')}</strong>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <table style={tableStyle}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                <th style={{ ...thStyle, width: '5%' }}>#</th>
                <th style={{ ...thStyle, width: '12%' }}>Type</th>
                <th style={thStyle}>Description</th>
                <th style={{ ...thStyle, textAlign: 'right', width: '10%' }}>Qty</th>
                <th style={{ ...thStyle, textAlign: 'right', width: '15%' }}>Unit Price</th>
                <th style={{ ...thStyle, textAlign: 'right', width: '12%' }}>Tax</th>
                <th style={{ ...thStyle, textAlign: 'right', width: '16%' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, idx) => (
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
                <span style={{ color: '#64748b' }}>Subtotal:</span>
                <span style={{ fontWeight: 600 }}>{formatMoney(invoice.subtotalAmount)}</span>
              </div>
              {invoice.taxAmount > 0 && (
                <div style={summaryRowStyle}>
                  <span style={{ color: '#64748b' }}>Tax:</span>
                  <span style={{ fontWeight: 600 }}>{formatMoney(invoice.taxAmount)}</span>
                </div>
              )}
              {invoice.discountAmount > 0 && (
                <div style={summaryRowStyle}>
                  <span style={{ color: '#16a34a' }}>Discount:</span>
                  <span style={{ fontWeight: 600, color: '#16a34a' }}>-{formatMoney(invoice.discountAmount)}</span>
                </div>
              )}
              <div style={{ ...summaryRowStyle, borderTop: '2px solid #cbd5e1', paddingTop: 8, fontSize: 16 }}>
                <span style={{ fontWeight: 800, color: '#0f172a' }}>Grand Total:</span>
                <span style={{ fontWeight: 800, color: '#0f172a' }}>{formatMoney(invoice.totalAmount)}</span>
              </div>
              <div style={summaryRowStyle}>
                <span style={{ color: '#64748b' }}>Total Paid:</span>
                <span style={{ fontWeight: 600, color: '#059669' }}>{formatMoney(invoice.paidAmount)}</span>
              </div>
              <div style={{ ...summaryRowStyle, borderTop: '1px solid #e2e8f0', paddingTop: 6, fontSize: 15 }}>
                <span style={{ fontWeight: 700, color: invoice.dueAmount > 0 ? '#dc2626' : '#1e293b' }}>
                  Balance Due:
                </span>
                <span style={{ fontWeight: 800, color: invoice.dueAmount > 0 ? '#dc2626' : '#059669' }}>
                  {formatMoney(invoice.dueAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Payments History Ledger */}
          <div style={{ marginTop: 28 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Payment Ledger History
            </div>
            {invoice.payments.length === 0 ? (
              <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic', padding: '8px 0' }}>
                No payments recorded yet.
              </div>
            ) : (
              <table style={tableStyle}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                    <th style={{ ...thStyle, fontSize: 11 }}>Date & Time</th>
                    <th style={{ ...thStyle, fontSize: 11 }}>Method</th>
                    <th style={{ ...thStyle, fontSize: 11 }}>Reference</th>
                    <th style={{ ...thStyle, fontSize: 11 }}>Received By</th>
                    <th style={{ ...thStyle, fontSize: 11, textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.payments.map((p) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ ...tdStyle, fontSize: 12 }}>
                        {new Date(p.createdAt).toLocaleString()}
                      </td>
                      <td style={{ ...tdStyle, fontSize: 12, fontWeight: 500 }}>{p.paymentMethod}</td>
                      <td style={{ ...tdStyle, fontSize: 12, color: '#64748b' }}>{p.reference || '-'}</td>
                      <td style={{ ...tdStyle, fontSize: 12, color: '#64748b' }}>{p.receivedByName || '-'}</td>
                      <td style={{ ...tdStyle, fontSize: 12, textAlign: 'right', fontWeight: 600, color: '#059669' }}>
                        {formatMoney(p.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Notes & Footer */}
          {invoice.notes && (
            <div style={{ marginTop: 24, padding: 12, backgroundColor: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Notes:</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{invoice.notes}</div>
            </div>
          )}

          <div style={{ marginTop: 36, textAlign: 'center', borderTop: '1px dashed #cbd5e1', paddingTop: 16, color: '#94a3b8', fontSize: 11 }}>
            Thank you for your business! Please keep this invoice for warranty and service records.
          </div>
        </div>
        )}
      </div>
    </div>
  )
}

const thermalReceiptStyle: React.CSSProperties = {
  width: '80mm',
  maxWidth: 320,
  margin: '0 auto',
  padding: '16px 14px',
  backgroundColor: '#ffffff',
  fontFamily: 'Courier New, Courier, monospace',
  color: '#000000',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  borderRadius: 4
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
  zIndex: 1000,
  padding: 20
}

const modalStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: 12,
  width: '100%',
  maxWidth: 820,
  maxHeight: '94vh',
  overflowY: 'auto',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  display: 'flex',
  flexDirection: 'column'
}

const headerControlStyle: React.CSSProperties = {
  padding: '16px 24px',
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

const payBtnStyle: React.CSSProperties = {
  padding: '6px 14px',
  fontSize: 13,
  fontWeight: 600,
  backgroundColor: '#16a34a',
  color: '#ffffff',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer'
}

const voidBtnStyle: React.CSSProperties = {
  padding: '6px 12px',
  fontSize: 13,
  fontWeight: 600,
  backgroundColor: '#fee2e2',
  color: '#dc2626',
  border: '1px solid #fecaca',
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
  display: 'inline-block',
  fontSize: 10,
  fontWeight: 600,
  padding: '2px 6px',
  borderRadius: 4,
  backgroundColor: '#eff6ff',
  color: '#2563eb'
}

const partBadgeStyle: React.CSSProperties = {
  display: 'inline-block',
  fontSize: 10,
  fontWeight: 600,
  padding: '2px 6px',
  borderRadius: 4,
  backgroundColor: '#fef3c7',
  color: '#d97706'
}

const voidBannerStyle: React.CSSProperties = {
  margin: '16px 0',
  padding: '12px 16px',
  backgroundColor: '#fee2e2',
  border: '1px solid #f87171',
  borderRadius: 8,
  color: '#991b1b',
  fontSize: 13
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
    case 'Paid':
      return { ...base, backgroundColor: '#dcfce7', color: '#166534' }
    case 'Partial':
      return { ...base, backgroundColor: '#fef9c3', color: '#854d0e' }
    case 'Void':
      return { ...base, backgroundColor: '#fee2e2', color: '#991b1b' }
    default:
      return { ...base, backgroundColor: '#f1f5f9', color: '#475569' }
  }
}
