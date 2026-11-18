import React, { useState } from 'react'
import { api } from '../../api'

interface Props {
  invoiceId: string
  invoiceNumber: string
  invoiceType: string
  onClose: () => void
  onSuccess: () => void
}

export const VoidInvoiceModal: React.FC<Props> = ({
  invoiceId,
  invoiceNumber,
  invoiceType,
  onClose,
  onSuccess
}) => {
  const [voidReason, setVoidReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleVoid = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setError(null)

    if (voidReason.trim().length < 3) {
      setError('Please provide a clear reason (at least 3 characters) to void this invoice.')
      return
    }

    setSubmitting(true)
    try {
      const res = await api.invoices.void({
        invoiceId,
        voidReason: voidReason.trim()
      })

      if (res.success) {
        onSuccess()
      } else {
        setError(res.error?.message || 'Failed to void invoice')
      }
    } catch (err: any) {
      setError(err?.message || 'Error voiding invoice')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={backdropStyle}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>⚠️</span>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#991b1b' }}>
              Void Invoice #{invoiceNumber}
            </h3>
          </div>
          <button onClick={onClose} style={closeIconStyle}>
            ✕
          </button>
        </div>

        <form onSubmit={handleVoid} style={{ padding: 20 }}>
          {error && <div style={errorStyle}>{error}</div>}

          <div style={warningNoticeStyle}>
            <p style={{ margin: 0, fontWeight: 600, color: '#991b1b', fontSize: 13 }}>
              Important Audit & Accounting Notice:
            </p>
            <p style={{ margin: '6px 0 0', color: '#b91c1c', fontSize: 12, lineHeight: 1.4 }}>
              Invoices are strictly immutable and cannot be deleted. Voiding will set status to{' '}
              <strong>Void</strong>, generate an offsetting <strong>Credit Note</strong>, and{' '}
              {invoiceType === 'pos'
                ? 'automatically restore POS inventory items back to the stock ledger.'
                : 'detach the workshop job card so it can be re-invoiced if required.'}
            </p>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Reason for Voiding *</label>
            <textarea
              rows={3}
              placeholder="e.g. Customer returned items / Invoiced with incorrect tax / Duplicate entry"
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              style={textareaStyle}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" onClick={onClose} style={cancelBtnStyle}>
              Cancel
            </button>
            <button type="submit" disabled={submitting} style={confirmVoidBtnStyle}>
              {submitting ? 'Voiding...' : 'Confirm Void & Issue Credit Note'}
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
  backgroundColor: 'rgba(15, 23, 42, 0.65)',
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
  maxWidth: 480,
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)'
}

const headerStyle: React.CSSProperties = {
  padding: '16px 20px',
  borderBottom: '1px solid #fee2e2',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  backgroundColor: '#fff1f2',
  borderTopLeftRadius: 10,
  borderTopRightRadius: 10
}

const closeIconStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  fontSize: 16,
  color: '#94a3b8',
  cursor: 'pointer'
}

const warningNoticeStyle: React.CSSProperties = {
  backgroundColor: '#fef2f2',
  border: '1px solid #fecaca',
  borderRadius: 8,
  padding: 12,
  marginBottom: 16
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: '#334155',
  marginBottom: 6
}

const textareaStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  fontSize: 13,
  border: '1px solid #cbd5e1',
  borderRadius: 6,
  boxSizing: 'border-box',
  fontFamily: 'inherit'
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

const confirmVoidBtnStyle: React.CSSProperties = {
  padding: '8px 18px',
  fontSize: 13,
  fontWeight: 600,
  backgroundColor: '#dc2626',
  color: '#ffffff',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer'
}
