import React, { useState, useEffect } from 'react'
import { api } from '../../api'
import {
  Supplier,
  InventoryItem,
  CreatePurchaseLineInput
} from '@shared/types/inventory.types'
import { toMoneyAmount, formatMoney } from '@shared/types/money.types'

interface Props {
  onClose: () => void
  onSaved: () => void
}

interface ItemLineState {
  itemId: string
  quantity: string
  unitCostDisplay: string
}

export const PurchaseOrderModal: React.FC<Props> = ({ onClose, onSaved }) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])

  const [supplierId, setSupplierId] = useState('')
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<ItemLineState[]>([
    { itemId: '', quantity: '1', unitCostDisplay: '0.00' }
  ])

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadOptions()
  }, [])

  const loadOptions = async (): Promise<void> => {
    try {
      const [supRes, itemRes] = await Promise.all([
        api.suppliers.list(false),
        api.inventory.listItems({ includeInactive: false })
      ])
      if (supRes.success && supRes.data) setSuppliers(supRes.data)
      if (itemRes.success && itemRes.data) setInventoryItems(itemRes.data)
    } catch {
      // ignore
    }
  }

  const handleItemSelect = (index: number, itemId: string): void => {
    const selectedItem = inventoryItems.find((i) => i.id === itemId)
    const newLines = [...lines]
    newLines[index].itemId = itemId
    if (selectedItem) {
      newLines[index].unitCostDisplay = (selectedItem.costPriceAmount / 100).toFixed(2)
    }
    setLines(newLines)
  }

  const handleLineChange = (index: number, field: 'quantity' | 'unitCostDisplay', val: string): void => {
    const newLines = [...lines]
    newLines[index][field] = val
    setLines(newLines)
  }

  const addLine = (): void => {
    setLines([...lines, { itemId: '', quantity: '1', unitCostDisplay: '0.00' }])
  }

  const removeLine = (index: number): void => {
    if (lines.length <= 1) return
    setLines(lines.filter((_, i) => i !== index))
  }

  // Calculate order total
  let totalOrderAmount = 0
  for (const l of lines) {
    const qty = parseFloat(l.quantity) || 0
    let cost = 0
    try {
      cost = toMoneyAmount(l.unitCostDisplay)
    } catch {
      // ignore
    }
    totalOrderAmount += Math.round(qty * cost)
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setError(null)

    if (lines.length === 0) {
      setError('Please add at least one line item')
      return
    }

    const parsedItems: CreatePurchaseLineInput[] = []
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i]
      if (!l.itemId) {
        setError(`Please select an item on line ${i + 1}`)
        return
      }
      const qty = parseFloat(l.quantity)
      if (isNaN(qty) || qty <= 0) {
        setError(`Quantity on line ${i + 1} must be greater than zero`)
        return
      }
      let unitCostAmount = 0
      try {
        unitCostAmount = toMoneyAmount(l.unitCostDisplay)
      } catch {
        setError(`Invalid unit cost on line ${i + 1}`)
        return
      }
      parsedItems.push({
        itemId: l.itemId,
        quantity: qty,
        unitCostAmount
      })
    }

    const payload = {
      supplierId: supplierId || null,
      purchaseDate,
      notes: notes.trim() || null,
      items: parsedItems
    }

    setLoading(true)
    try {
      const res = await api.purchases.create(payload)
      if (!res.success) {
        setError(res.error?.message || 'Failed to record purchase')
        return
      }
      onSaved()
    } catch (err: any) {
      setError(err.message || 'Error recording purchase')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={backdropStyle}>
      <div style={modalStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Record Purchase Order & Stock Intake</h2>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        {error && <div style={errorStyle}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Supplier</label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                style={inputStyle}
              >
                <option value="">-- Direct / Walk-in Purchase (No Supplier) --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Purchase Date *</label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                style={inputStyle}
                required
              />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={labelStyle}>Items Received into Stock *</label>
              <button type="button" onClick={addLine} style={secondaryBtnStyle}>
                + Add Item
              </button>
            </div>

            <div style={{ border: '1px solid #e5e7eb', borderRadius: 6, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <tr>
                    <th style={{ padding: '8px 10px', textAlign: 'left', width: '45%' }}>Inventory Item</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', width: '20%' }}>Quantity</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', width: '20%' }}>Unit Cost</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', width: '15%' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: 6 }}>
                        <select
                          value={line.itemId}
                          onChange={(e) => handleItemSelect(idx, e.target.value)}
                          style={{ ...inputStyle, width: '100%' }}
                          required
                        >
                          <option value="">-- Select Item --</option>
                          {inventoryItems.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name} {item.sku ? `(${item.sku})` : ''} - Stock: {item.currentStock}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: 6 }}>
                        <input
                          type="number"
                          step="any"
                          min="0.001"
                          value={line.quantity}
                          onChange={(e) => handleLineChange(idx, 'quantity', e.target.value)}
                          style={{ ...inputStyle, width: '100%' }}
                          required
                        />
                      </td>
                      <td style={{ padding: 6 }}>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={line.unitCostDisplay}
                          onChange={(e) => handleLineChange(idx, 'unitCostDisplay', e.target.value)}
                          style={{ ...inputStyle, width: '100%' }}
                          required
                        />
                      </td>
                      <td style={{ padding: 6, textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => removeLine(idx)}
                          disabled={lines.length <= 1}
                          style={{ background: 'none', border: 'none', color: lines.length <= 1 ? '#9ca3af' : '#dc2626', cursor: lines.length <= 1 ? 'default' : 'pointer' }}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Notes / Supplier Invoice #</label>
            <textarea
              placeholder="e.g. Supplier Bill #10294, Payment terms 30 days"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9fafb', padding: 12, borderRadius: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 500, color: '#374151' }}>Order Total Cost:</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#047857' }}>
              {formatMoney(totalOrderAmount)}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" onClick={onClose} style={cancelBtnStyle}>Cancel</button>
            <button type="submit" disabled={loading} style={saveBtnStyle}>
              {loading ? 'Processing...' : 'Record Purchase & Receive Stock'}
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
  backgroundColor: '#fff', padding: 24, borderRadius: 8, width: 700, maxWidth: '92%', maxHeight: '90vh', overflowY: 'auto'
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 4
}
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, boxSizing: 'border-box'
}
const primaryBtnStyle: React.CSSProperties = {
  padding: '8px 18px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 500
}
const secondaryBtnStyle: React.CSSProperties = {
  padding: '4px 10px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 500
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
