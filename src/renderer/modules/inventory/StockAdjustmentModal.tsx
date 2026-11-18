import React, { useState } from 'react'
import { api } from '../../api'
import { InventoryItem } from '@shared/types/inventory.types'

interface Props {
  item: InventoryItem
  onClose: () => void
  onSaved: () => void
}

export const StockAdjustmentModal: React.FC<Props> = ({ item, onClose, onSaved }) => {
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'reduce'>('add')
  const [quantityInput, setQuantityInput] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const parsedQty = parseFloat(quantityInput) || 0
  const adjustedDelta = adjustmentType === 'add' ? parsedQty : -parsedQty
  const newStock = item.currentStock + adjustedDelta

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setError(null)

    if (parsedQty <= 0) {
      setError('Adjustment quantity must be greater than zero')
      return
    }

    if (!reason.trim() || reason.trim().length < 3) {
      setError('A clear reason (at least 3 characters) is required for all stock adjustments')
      return
    }

    setLoading(true)
    try {
      const res = await api.inventory.adjustStock({
        itemId: item.id,
        quantity: adjustedDelta,
        reason: reason.trim()
      })

      if (!res.success) {
        setError(res.error?.message || 'Failed to adjust stock')
        return
      }

      onSaved()
    } catch (err: any) {
      setError(err.message || 'Error processing adjustment')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={backdropStyle}>
      <div style={modalStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Adjust Stock Level</h2>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        {error && <div style={errorStyle}>{error}</div>}

        <div style={{ background: '#f9fafb', padding: 12, borderRadius: 6, marginBottom: 16 }}>
          <div style={{ fontWeight: 600, color: '#111827' }}>{item.name}</div>
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
            SKU: {item.sku || 'N/A'} | Current Stock: <strong>{item.currentStock} {item.unitAbbr || 'units'}</strong>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Adjustment Action *</label>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={() => setAdjustmentType('add')}
                style={{
                  ...actionSelectBtnStyle,
                  background: adjustmentType === 'add' ? '#dcfce7' : '#f3f4f6',
                  borderColor: adjustmentType === 'add' ? '#16a34a' : '#d1d5db',
                  color: adjustmentType === 'add' ? '#15803d' : '#374151'
                }}
              >
                + Add Stock (Intake / Count Correction)
              </button>
              <button
                type="button"
                onClick={() => setAdjustmentType('reduce')}
                style={{
                  ...actionSelectBtnStyle,
                  background: adjustmentType === 'reduce' ? '#fee2e2' : '#f3f4f6',
                  borderColor: adjustmentType === 'reduce' ? '#dc2626' : '#d1d5db',
                  color: adjustmentType === 'reduce' ? '#b91c1c' : '#374151'
                }}
              >
                - Reduce Stock (Damage / Loss / Count Correction)
              </button>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Quantity ({item.unitAbbr || 'units'}) *</label>
            <input
              type="number"
              step="any"
              min="0.0001"
              placeholder="e.g. 5"
              value={quantityInput}
              onChange={(e) => setQuantityInput(e.target.value)}
              style={inputStyle}
              required
            />
          </div>

          <div>
            <label style={labelStyle}>Reason for Adjustment * (Required by Audit)</label>
            <textarea
              placeholder="e.g. Physical inventory count correction; Damaged during handling; Supplier sample"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
              required
            />
          </div>

          <div style={{ padding: '10px 12px', background: '#eff6ff', borderRadius: 6, fontSize: 13, color: '#1e40af' }}>
            New Stock will be: <strong>{newStock} {item.unitAbbr || 'units'}</strong>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button type="button" onClick={onClose} style={cancelBtnStyle}>Cancel</button>
            <button type="submit" disabled={loading} style={saveBtnStyle}>
              {loading ? 'Recording...' : 'Confirm Stock Adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const backdropStyle: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
}
const modalStyle: React.CSSProperties = {
  backgroundColor: '#fff', padding: 24, borderRadius: 8, width: 500, maxWidth: '90%'
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 4
}
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, boxSizing: 'border-box'
}
const actionSelectBtnStyle: React.CSSProperties = {
  flex: 1, padding: '10px 12px', border: '1px solid', borderRadius: 6, cursor: 'pointer', fontWeight: 500, fontSize: 13, textAlign: 'center'
}
const saveBtnStyle: React.CSSProperties = {
  padding: '8px 18px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 500
}
const cancelBtnStyle: React.CSSProperties = {
  padding: '8px 16px', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', fontWeight: 500
}
const closeBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#6b7280'
}
const errorStyle: React.CSSProperties = {
  padding: '8px 12px', background: '#fee2e2', color: '#b91c1c', borderRadius: 6, fontSize: 13
}
