import React, { useState } from 'react'
import { api } from '../../api'

interface Props {
  invoiceId: string
  invoiceNumber: string
  totalAmount: number
  dueAmount: number
  currencySymbol?: string
  onClose: () => void
  onSuccess: () => void
}

export const RecordPaymentModal: React.FC<Props> = ({
  invoiceId,
  invoiceNumber,
  totalAmount,
  dueAmount,
  currencySymbol = 'Rs.',
  onClose,
  onSuccess
}) => {
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [amountStr, setAmountStr] = useState((dueAmount / 100).toFixed(2))
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const formatDisplay = (cents: number): string => {
    return `${currencySymbol} ${(cents / 100).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setError(null)

    const num = parseFloat(amountStr)
    if (isNaN(num) || num <= 0) {
      setError('Please enter a valid positive payment amount')
      return
    }

    const amountInCents = Math.round(num * 100)
    if (amountInCents > dueAmount) {
      setError(`Payment amount cannot exceed outstanding balance of ${formatDisplay(dueAmount)}`)
      return
    }

    setSubmitting(true)
    try {
      const res = await api.payments.record({
        invoiceId,
        paymentMethod,
        amount: amountInCents,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined
      })

      if (res.success) {
        onSuccess()
      } else {
        setError(res.error?.message || 'Failed to record payment')
      }
    } catch (err: any) {
      setError(err?.message || 'Error recording payment')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={backdropStyle}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>
            Record Payment for Invoice #{invoiceNumber}
          </h3>
          <button onClick={onClose} style={closeIconStyle}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 20 }}>
          {error && <div style={errorStyle}>{error}</div>}

          {/* Balance info card */}
          <div style={infoCardStyle}>
            <div>
              <span style={{ fontSize: 11, color: '#64748b' }}>TOTAL AMOUNT</span>
              <div style={{ fontWeight: 600, color: '#1e293b' }}>{formatDisplay(totalAmount)}</div>
            </div>
            <div>
              <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 600 }}>OUTSTANDING BALANCE</span>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#dc2626' }}>{formatDisplay(dueAmount)}</div>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Payment Method *</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              style={inputStyle}
            >
              <option value="Cash">Cash</option>
              <option value="Credit Card">Credit Card</option>
              <option value="Debit Card">Debit Card</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cheque">Cheque</option>
            </select>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Payment Amount ({currencySymbol}) *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={(dueAmount / 100).toFixed(2)}
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              style={inputStyle}
              required
            />
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <button
                type="button"
                onClick={() => setAmountStr((dueAmount / 100).toFixed(2))}
                style={chipStyle}
              >
                Pay Full Balance ({formatDisplay(dueAmount)})
              </button>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Reference / Slip # (Optional)</label>
            <input
              type="text"
              placeholder="e.g. TXN-12345 or Cheque #987"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Notes (Optional)</label>
            <input
              type="text"
              placeholder="Any additional payment notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" onClick={onClose} style={cancelBtnStyle}>
              Cancel
            </button>
            <button type="submit" disabled={submitting} style={submitBtnStyle}>
              {submitting ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
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
  backgroundColor: 'rgba(15, 23, 42, 0.6)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1100,
  padding: 16
}

const modalStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: 10,
  width: '100%',
  maxWidth: 460,
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
}

const headerStyle: React.CSSProperties = {
  padding: '16px 20px',
  borderBottom: '1px solid #e2e8f0',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
}

const closeIconStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  fontSize: 16,
  color: '#94a3b8',
  cursor: 'pointer'
}

const infoCardStyle: React.CSSProperties = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  padding: 12,
  marginBottom: 16,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: '#334155',
  marginBottom: 6
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  fontSize: 13,
  border: '1px solid #cbd5e1',
  borderRadius: 6,
  boxSizing: 'border-box'
}

const chipStyle: React.CSSProperties = {
  padding: '3px 8px',
  fontSize: 11,
  fontWeight: 600,
  color: '#2563eb',
  backgroundColor: '#eff6ff',
  border: '1px solid #bfdbfe',
  borderRadius: 4,
  cursor: 'pointer'
}

const errorStyle: React.CSSProperties = {
  padding: '8px 12px',
  backgroundColor: '#fee2e2',
  color: '#991b1b',
  borderRadius: 6,
  fontSize: 12,
  marginBottom: 14
}

const cancelBtnStyle: React.CSSProperties = {
  padding: '8px 14px',
  fontSize: 13,
  fontWeight: 500,
  backgroundColor: '#ffffff',
  color: '#64748b',
  border: '1px solid #cbd5e1',
  borderRadius: 6,
  cursor: 'pointer'
}

const submitBtnStyle: React.CSSProperties = {
  padding: '8px 18px',
  fontSize: 13,
  fontWeight: 600,
  backgroundColor: '#16a34a',
  color: '#ffffff',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer'
}
