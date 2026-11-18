import React, { useState, useEffect } from 'react'
import { api } from '../../api'
import { Invoice, InvoiceWithDetails } from '@shared/types/invoice.types'
import { InvoiceDocumentModal } from './InvoiceDocumentModal'
import { RecordPaymentModal } from './RecordPaymentModal'
import { VoidInvoiceModal } from './VoidInvoiceModal'
import { PosSaleModal } from './PosSaleModal'
import { downloadCsv } from '../../utils/csvDownload'
import { EmptyInvoicesIllustration } from '../../components/Common/Illustrations'

export const InvoiceListPage: React.FC = () => {
  const [invoices, setInvoices] = useState<(Invoice & { customerName: string; vehicleRegistration?: string })[]>([])
  const [currencySymbol, setCurrencySymbol] = useState('Rs.')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Modals state
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null)
  const [showPosModal, setShowPosModal] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [payingInvoice, setPayingInvoice] = useState<{ id: string; invoiceNumber: string; totalAmount: number; dueAmount: number } | null>(null)
  const [voidingInvoice, setVoidingInvoice] = useState<{ id: string; invoiceNumber: string; invoiceType: string } | null>(null)

  const handleExportCsv = async (): Promise<void> => {
    setExporting(true)
    try {
      const res = await api.export.data('invoices')
      if (res.success && res.data) {
        downloadCsv(res.data.filename, res.data.csvContent)
      }
    } catch (err) {
      console.error('Invoice export failed:', err)
    } finally {
      setExporting(false)
    }
  }

  const loadInvoices = async (): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      const [invRes, profRes] = await Promise.all([
        api.invoices.list({
          status: statusFilter !== 'all' ? statusFilter : undefined,
          invoiceType: typeFilter !== 'all' ? typeFilter : undefined,
          search: searchQuery.trim() || undefined
        }),
        api.settings.getByCategory('business_profile')
      ])

      if (invRes.success && invRes.data) {
        setInvoices(invRes.data)
      } else {
        setError(invRes.error?.message || 'Failed to load invoices')
      }

      if (profRes.success && profRes.data && (profRes.data as any).currency_symbol) {
        setCurrencySymbol((profRes.data as any).currency_symbol)
      }
    } catch (err: any) {
      setError(err?.message || 'Error loading invoices')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInvoices()
  }, [statusFilter, typeFilter])

  const handleSearchSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    loadInvoices()
  }

  const formatMoney = (cents: number): string => {
    const isNegative = cents < 0
    const abs = Math.abs(cents)
    const formatted = (abs / 100).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
    return `${isNegative ? '-' : ''}${currencySymbol} ${formatted}`
  }

  // Calculate high-level metrics
  const activeInvoices = invoices.filter((inv) => inv.status !== 'Void' && !inv.creditNoteOf)
  const totalBilled = activeInvoices.reduce((acc, inv) => acc + inv.totalAmount, 0)
  const totalCollected = activeInvoices.reduce((acc, inv) => acc + inv.paidAmount, 0)
  const totalOutstanding = activeInvoices.reduce((acc, inv) => acc + inv.dueAmount, 0)

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>
            Billing & Invoices
          </h1>
          <p style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>
            Immutable billing engine, counter sales (POS), and payment ledger reconciliation
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
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
          <button onClick={() => loadInvoices()} style={refreshBtnStyle}>
            🔄 Refresh
          </button>
          <button onClick={() => setShowPosModal(true)} style={newPosBtnStyle}>
            🛒 + New POS Sale
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <MetricCard
          title="TOTAL BILLED"
          value={formatMoney(totalBilled)}
          subtitle="Net non-void invoices"
          color="#3b82f6"
        />
        <MetricCard
          title="TOTAL COLLECTED"
          value={formatMoney(totalCollected)}
          subtitle="Cleared payments"
          color="#10b981"
        />
        <MetricCard
          title="OUTSTANDING DUE"
          value={formatMoney(totalOutstanding)}
          subtitle="Pending receivables"
          color="#ef4444"
        />
        <MetricCard
          title="TOTAL INVOICES"
          value={invoices.length.toString()}
          subtitle={`${invoices.filter((i) => i.status === 'Paid').length} Fully Paid`}
          color="#8b5cf6"
        />
      </div>

      {/* Filter and Search Bar */}
      <div style={filterBarStyle}>
        <div style={{ display: 'flex', gap: 8 }}>
          {['all', 'Unpaid', 'Partial', 'Paid', 'Void'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              style={statusFilter === st ? activeTabStyle : tabStyle}
            >
              {st === 'all' ? 'All Invoices' : st}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 8 }}>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={selectStyle}
          >
            <option value="all">All Types</option>
            <option value="job_card">Workshop Job Cards</option>
            <option value="pos">Counter POS</option>
          </select>

          <input
            type="text"
            placeholder="Search INV#, Customer, Plate..."
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

      {/* Invoices Data Table */}
      <div style={tableContainerStyle}>
        <table style={tableStyle}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              <th style={thStyle}>Invoice #</th>
              <th style={thStyle}>Type</th>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Customer</th>
              <th style={thStyle}>Vehicle</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Total</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Paid</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Balance Due</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Status</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: 32, color: '#6b7280' }}>
                  Loading invoices...
                </td>
              </tr>
            ) : invoices.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '48px 24px', color: '#6b7280' }}>
                  <EmptyInvoicesIllustration width={130} height={100} />
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#1f2937', marginTop: 12 }}>
                    No Invoices Found
                  </div>
                  <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
                    {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                      ? 'No bills or receipts match the active filters.'
                      : 'Create a Quick POS Sale or complete a Job Card to generate customer invoices.'}
                  </div>
                </td>
              </tr>
            ) : (
              invoices.map((inv) => {
                const isVoid = inv.status === 'Void'
                const isCreditNote = Boolean(inv.creditNoteOf)
                return (
                  <tr key={inv.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ ...tdStyle, fontWeight: 700, color: '#1e293b' }}>
                      <span
                        onClick={() => setSelectedInvoiceId(inv.id)}
                        style={{ cursor: 'pointer', color: '#2563eb', textDecoration: 'underline' }}
                      >
                        {inv.invoiceNumber}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      {isCreditNote ? (
                        <span style={creditNoteBadgeStyle}>Credit Note</span>
                      ) : (
                        <span style={inv.invoiceType === 'job_card' ? jobCardTypeBadgeStyle : posTypeBadgeStyle}>
                          {inv.invoiceType === 'job_card' ? 'Job Card' : 'POS'}
                        </span>
                      )}
                    </td>
                    <td style={{ ...tdStyle, fontSize: 12, color: '#64748b' }}>
                      {new Date(inv.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 500 }}>{inv.customerName}</td>
                    <td style={{ ...tdStyle, color: '#475569' }}>
                      {inv.vehicleRegistration || <span style={{ color: '#94a3b8' }}>-</span>}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>
                      {formatMoney(inv.totalAmount)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', color: '#059669', fontWeight: 500 }}>
                      {formatMoney(inv.paidAmount)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: inv.dueAmount > 0 ? '#dc2626' : '#64748b' }}>
                      {formatMoney(inv.dueAmount)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <span style={getStatusBadge(inv.status)}>{inv.status}</span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button
                          onClick={() => setSelectedInvoiceId(inv.id)}
                          style={actionBtnStyle}
                          title="View Printable Document"
                        >
                          👁️ View
                        </button>
                        {!isVoid && inv.dueAmount > 0 && (
                          <button
                            onClick={() =>
                              setPayingInvoice({
                                id: inv.id,
                                invoiceNumber: inv.invoiceNumber,
                                totalAmount: inv.totalAmount,
                                dueAmount: inv.dueAmount
                              })
                            }
                            style={payActionBtnStyle}
                            title="Record Payment"
                          >
                            💵 Pay
                          </button>
                        )}
                        {!isVoid && !isCreditNote && (
                          <button
                            onClick={() =>
                              setVoidingInvoice({
                                id: inv.id,
                                invoiceNumber: inv.invoiceNumber,
                                invoiceType: inv.invoiceType
                              })
                            }
                            style={voidActionBtnStyle}
                            title="Void Invoice"
                          >
                            🚫
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

      {/* Modal: View Printable Document */}
      {selectedInvoiceId && (
        <InvoiceDocumentModal
          invoiceId={selectedInvoiceId}
          onClose={() => setSelectedInvoiceId(null)}
          onInvoiceUpdated={loadInvoices}
          onOpenPaymentModal={(inv) => {
            setSelectedInvoiceId(null)
            setPayingInvoice({
              id: inv.id,
              invoiceNumber: inv.invoiceNumber,
              totalAmount: inv.totalAmount,
              dueAmount: inv.dueAmount
            })
          }}
          onOpenVoidModal={(inv) => {
            setSelectedInvoiceId(null)
            setVoidingInvoice({
              id: inv.id,
              invoiceNumber: inv.invoiceNumber,
              invoiceType: inv.invoiceType
            })
          }}
        />
      )}

      {/* Modal: New POS Sale */}
      {showPosModal && (
        <PosSaleModal
          currencySymbol={currencySymbol}
          onClose={() => setShowPosModal(false)}
          onSuccess={(newInv) => {
            setShowPosModal(false)
            loadInvoices()
            setSelectedInvoiceId(newInv.id)
          }}
        />
      )}

      {/* Modal: Record Payment */}
      {payingInvoice && (
        <RecordPaymentModal
          invoiceId={payingInvoice.id}
          invoiceNumber={payingInvoice.invoiceNumber}
          totalAmount={payingInvoice.totalAmount}
          dueAmount={payingInvoice.dueAmount}
          currencySymbol={currencySymbol}
          onClose={() => setPayingInvoice(null)}
          onSuccess={() => {
            setPayingInvoice(null)
            loadInvoices()
          }}
        />
      )}

      {/* Modal: Void Invoice */}
      {voidingInvoice && (
        <VoidInvoiceModal
          invoiceId={voidingInvoice.id}
          invoiceNumber={voidingInvoice.invoiceNumber}
          invoiceType={voidingInvoice.invoiceType}
          onClose={() => setVoidingInvoice(null)}
          onSuccess={() => {
            setVoidingInvoice(null)
            loadInvoices()
          }}
        />
      )}
    </div>
  )
}

const MetricCard: React.FC<{
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
  padding: '6px 14px',
  fontSize: 13,
  fontWeight: 500,
  backgroundColor: '#ffffff',
  color: '#64748b',
  border: '1px solid #cbd5e1',
  borderRadius: 6,
  cursor: 'pointer'
}

const activeTabStyle: React.CSSProperties = {
  padding: '6px 14px',
  fontSize: 13,
  fontWeight: 600,
  backgroundColor: '#2563eb',
  color: '#ffffff',
  border: '1px solid #2563eb',
  borderRadius: 6,
  cursor: 'pointer'
}

const selectStyle: React.CSSProperties = {
  padding: '6px 10px',
  fontSize: 13,
  border: '1px solid #cbd5e1',
  borderRadius: 6,
  backgroundColor: '#ffffff'
}

const searchInputStyle: React.CSSProperties = {
  padding: '6px 12px',
  fontSize: 13,
  border: '1px solid #cbd5e1',
  borderRadius: 6,
  width: 240
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

const newPosBtnStyle: React.CSSProperties = {
  padding: '8px 16px',
  fontSize: 13,
  fontWeight: 600,
  backgroundColor: '#16a34a',
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

const jobCardTypeBadgeStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  padding: '2px 8px',
  borderRadius: 9999,
  backgroundColor: '#eff6ff',
  color: '#1d4ed8'
}

const posTypeBadgeStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  padding: '2px 8px',
  borderRadius: 9999,
  backgroundColor: '#f0fdf4',
  color: '#15803d'
}

const creditNoteBadgeStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  padding: '2px 8px',
  borderRadius: 9999,
  backgroundColor: '#fee2e2',
  color: '#b91c1c'
}

const actionBtnStyle: React.CSSProperties = {
  padding: '4px 8px',
  fontSize: 12,
  fontWeight: 500,
  backgroundColor: '#f8fafc',
  color: '#334155',
  border: '1px solid #cbd5e1',
  borderRadius: 4,
  cursor: 'pointer'
}

const payActionBtnStyle: React.CSSProperties = {
  padding: '4px 10px',
  fontSize: 12,
  fontWeight: 600,
  backgroundColor: '#16a34a',
  color: '#ffffff',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer'
}

const voidActionBtnStyle: React.CSSProperties = {
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
