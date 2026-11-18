import React, { useState, useEffect } from 'react'
import { api } from '../../api'
import { CashFlowSummary } from '@shared/types/finance.types'

interface Props {
  currencySymbol?: string
  onRecordExpense?: () => void
}

export const CashRegisterPage: React.FC<Props> = ({
  currencySymbol = 'Rs.',
  onRecordExpense
}) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [summary, setSummary] = useState<CashFlowSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = async (): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.finance.getCashFlow(selectedDate, selectedDate)
      if (res.success && res.data) {
        setSummary(res.data)
      } else {
        setError(res.error?.message || 'Failed to load cash flow data')
      }
    } catch (err: any) {
      setError(err?.message || 'Error loading cash flow')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [selectedDate])

  const formatMoney = (cents: number): string => {
    return `${currencySymbol} ${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
  }

  return (
    <div>
      {/* Date filter & Actions bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#ffffff',
          padding: '14px 20px',
          borderRadius: 8,
          border: '1px solid #e5e7eb',
          marginBottom: 20,
          flexWrap: 'wrap',
          gap: 12
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
            Daily Register Date:
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{
              padding: '6px 12px',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              fontSize: 13
            }}
          />
          <button
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            style={{
              padding: '6px 12px',
              backgroundColor: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              fontSize: 12,
              cursor: 'pointer'
            }}
          >
            Today
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => loadData()}
            style={{
              padding: '6px 12px',
              backgroundColor: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              fontSize: 12,
              cursor: 'pointer'
            }}
          >
            🔄 Refresh
          </button>
          {onRecordExpense && (
            <button
              onClick={onRecordExpense}
              style={{
                padding: '6px 14px',
                backgroundColor: '#dc2626',
                color: '#ffffff',
                border: 'none',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              - Record Cash Outflow
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>
          Loading daily register...
        </div>
      ) : error ? (
        <div style={{ padding: 24, textAlign: 'center', color: '#dc2626' }}>
          {error}
        </div>
      ) : summary ? (
        <div>
          {/* Key Metric Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 16,
              marginBottom: 24
            }}
          >
            <div style={{ ...kpiCardStyle, borderTop: '4px solid #16a34a' }}>
              <div style={kpiLabelStyle}>Total Collections (Inflows)</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#16a34a', marginTop: 4 }}>
                {formatMoney(summary.totalInflows)}
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                All payment methods collected
              </div>
            </div>

            <div style={{ ...kpiCardStyle, borderTop: '4px solid #dc2626' }}>
              <div style={kpiLabelStyle}>Total Paid Out (Outflows)</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#dc2626', marginTop: 4 }}>
                {formatMoney(summary.totalOutflows)}
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                Expenses recorded on this date
              </div>
            </div>

            <div style={{ ...kpiCardStyle, borderTop: '4px solid #2563eb' }}>
              <div style={kpiLabelStyle}>Net Day Cash Till Balance</div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: summary.cashRegisterClosingBalance >= 0 ? '#2563eb' : '#dc2626',
                  marginTop: 4
                }}
              >
                {formatMoney(summary.cashRegisterClosingBalance)}
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                Physical cash in drawer position
              </div>
            </div>

            <div style={{ ...kpiCardStyle, borderTop: '4px solid #7c3aed' }}>
              <div style={kpiLabelStyle}>Net Overall Cash Flow</div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: summary.netCashFlow >= 0 ? '#111827' : '#dc2626',
                  marginTop: 4
                }}
              >
                {formatMoney(summary.netCashFlow)}
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                Combined cash, card, and bank
              </div>
            </div>
          </div>

          {/* Detailed Payment Method Tables */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Inflows breakdown */}
            <div style={panelContainerStyle}>
              <div style={panelHeaderStyle}>
                <span style={{ fontWeight: 600, color: '#111827' }}>Inflows by Payment Channel</span>
                <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>
                  {formatMoney(summary.totalInflows)}
                </span>
              </div>
              <div style={{ padding: 16 }}>
                {Object.keys(summary.inflowsByMethod).length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#9ca3af', padding: 20, fontSize: 13 }}>
                    No collections recorded for {selectedDate}
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <tbody>
                      {Object.entries(summary.inflowsByMethod).map(([method, amount]) => (
                        <tr key={method} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '10px 0', fontWeight: 500, color: '#374151' }}>
                            {method}
                          </td>
                          <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: 600, color: '#111827' }}>
                            {formatMoney(amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Outflows breakdown */}
            <div style={panelContainerStyle}>
              <div style={panelHeaderStyle}>
                <span style={{ fontWeight: 600, color: '#111827' }}>Outflows by Payment Channel</span>
                <span style={{ fontSize: 12, color: '#dc2626', fontWeight: 600 }}>
                  {formatMoney(summary.totalOutflows)}
                </span>
              </div>
              <div style={{ padding: 16 }}>
                {Object.keys(summary.outflowsByMethod).length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#9ca3af', padding: 20, fontSize: 13 }}>
                    No expenses recorded for {selectedDate}
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <tbody>
                      {Object.entries(summary.outflowsByMethod).map(([method, amount]) => (
                        <tr key={method} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '10px 0', fontWeight: 500, color: '#374151' }}>
                            {method}
                          </td>
                          <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: 600, color: '#111827' }}>
                            {formatMoney(amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
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

const panelContainerStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: 8,
  border: '1px solid #e5e7eb',
  overflow: 'hidden'
}

const panelHeaderStyle: React.CSSProperties = {
  padding: '14px 20px',
  backgroundColor: '#f9fafb',
  borderBottom: '1px solid #e5e7eb',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontSize: 13
}
