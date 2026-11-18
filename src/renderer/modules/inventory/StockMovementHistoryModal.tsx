import React, { useState, useEffect } from 'react'
import { api } from '../../api'
import { InventoryItem, StockMovement } from '@shared/types/inventory.types'
import { formatMoney } from '@shared/types/money.types'

interface Props {
  item: InventoryItem
  onClose: () => void
}

export const StockMovementHistoryModal: React.FC<Props> = ({ item, onClose }) => {
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMovements()
  }, [])

  const loadMovements = async (): Promise<void> => {
    try {
      const res = await api.inventory.getItemMovements(item.id, 100)
      if (res.success && res.data) {
        setMovements(res.data)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  const formatMovementType = (type: string): string => {
    switch (type) {
      case 'purchase_in': return 'Purchase Intake'
      case 'job_card_out': return 'Used in Job Card'
      case 'adjustment_in': return 'Stock Adjustment (+)'
      case 'adjustment_out': return 'Stock Adjustment (-)'
      case 'return_in': return 'Customer Return'
      case 'void_reversal': return 'Void Reversal'
      default: return type
    }
  }

  return (
    <div style={backdropStyle}>
      <div style={modalStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Stock Movement Ledger</h2>
            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
              {item.name} ({item.sku || 'No SKU'}) | Total Stock: <strong>{item.currentStock} {item.unitAbbr || 'units'}</strong>
            </div>
          </div>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 6 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0 }}>
              <tr>
                <th style={{ padding: '10px 12px' }}>Timestamp</th>
                <th style={{ padding: '10px 12px' }}>Type</th>
                <th style={{ padding: '10px 12px' }}>Quantity</th>
                <th style={{ padding: '10px 12px' }}>Reason / Reference</th>
                <th style={{ padding: '10px 12px' }}>Recorded By</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: 20, textAlign: 'center', color: '#6b7280' }}>
                    Loading stock ledger...
                  </td>
                </tr>
              ) : movements.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 20, textAlign: 'center', color: '#6b7280' }}>
                    No stock movements recorded for this item yet.
                  </td>
                </tr>
              ) : (
                movements.map((m) => {
                  const isPositive = m.quantity > 0
                  return (
                    <tr key={m.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', color: '#4b5563' }}>
                        {new Date(m.createdAt).toLocaleString()}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span
                          style={{
                            fontSize: 11,
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontWeight: 500,
                            background: isPositive ? '#dcfce7' : '#fee2e2',
                            color: isPositive ? '#15803d' : '#b91c1c'
                          }}
                        >
                          {formatMovementType(m.movementType)}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: '10px 12px',
                          fontWeight: 600,
                          color: isPositive ? '#16a34a' : '#dc2626'
                        }}
                      >
                        {isPositive ? `+${m.quantity}` : m.quantity} {item.unitAbbr || ''}
                      </td>
                      <td style={{ padding: '10px 12px', color: '#374151' }}>
                        {m.reason || (m.referenceType ? `${m.referenceType}: ${m.referenceId}` : '—')}
                        {m.costPriceAmount !== null && m.costPriceAmount !== undefined && (
                          <div style={{ fontSize: 11, color: '#6b7280' }}>
                            Cost: {formatMoney(m.costPriceAmount)}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px', color: '#6b7280' }}>
                        {m.createdByName || 'System'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <button onClick={onClose} style={closeBtnStyleBottom}>Close</button>
        </div>
      </div>
    </div>
  )
}

const backdropStyle: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
}
const modalStyle: React.CSSProperties = {
  backgroundColor: '#fff', padding: 24, borderRadius: 8, width: 750, maxWidth: '92%', height: '70vh', display: 'flex', flexDirection: 'column'
}
const closeBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#6b7280'
}
const closeBtnStyleBottom: React.CSSProperties = {
  padding: '8px 18px', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', fontWeight: 500
}
